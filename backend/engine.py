"""Pandas-based backtest engine — supports MA crossover and RSI strategies."""

import numpy as np
import pandas as pd
import yfinance as yf
from models import (
    Graph,
    BacktestParams,
    BacktestOutput,
    EquityPoint,
    DrawdownPoint,
    Trade,
    Metrics,
)

NUM_MONTE_CARLO_PATHS = 200
ANNUALIZATION_FACTOR  = np.sqrt(252)

# Node type aliases: accepts both legacy internal names and new LLM-friendly names
_MA_TYPES  = {"moving_average", "Moving Average"}
_RSI_TYPES = {"rsi", "RSI"}
_SL_TYPES  = {"stop_loss", "Stop Loss"}
_TP_TYPES  = {"take_profit", "Take Profit"}


# ── Graph interrogation helpers ───────────────────────────────────────────────

def _get_ma_periods(graph: Graph) -> tuple[int, int]:
    """Extract (fast, slow) MA periods. Returns (10, 30) as default."""
    periods = [
        int(n.params["period"])
        for n in graph.nodes
        if n.type in _MA_TYPES and "period" in n.params
    ]
    if len(periods) < 2:
        return (10, 30)
    periods.sort()
    return (periods[0], periods[1])


def _get_rsi_params(graph: Graph) -> dict | None:
    """Return RSI params dict or None if no RSI node is present."""
    for n in graph.nodes:
        if n.type in _RSI_TYPES:
            return {
                "period":    int(n.params.get("period",    14)),
                "oversold":  float(n.params.get("oversold",  30)),
                "overbought": float(n.params.get("overbought", 70)),
            }
    return None


def _get_stop_loss_pct(graph: Graph) -> float | None:
    for n in graph.nodes:
        if n.type in _SL_TYPES and "pct" in n.params:
            return float(n.params["pct"])
    return None


def _get_take_profit_pct(graph: Graph) -> float | None:
    for n in graph.nodes:
        if n.type in _TP_TYPES and "pct" in n.params:
            return float(n.params["pct"])
    return None


def _detect_strategy(graph: Graph) -> str:
    """Return strategy type based on indicator nodes present in the graph."""
    node_types = {n.type for n in graph.nodes}
    if node_types & _RSI_TYPES:
        return "rsi"
    if node_types & _MA_TYPES:
        return "ma_crossover"
    # No technical indicator nodes (MA or RSI) — treat as buy and hold
    return "buy_and_hold"


# ── Data fetching ─────────────────────────────────────────────────────────────

def _fetch_ohlcv(symbol: str, start: str, end: str) -> pd.DataFrame:
    ticker = yf.Ticker(symbol)
    df = ticker.history(start=start, end=end, auto_adjust=True)
    if df.empty or len(df) < 2:
        return pd.DataFrame()
    df.index = pd.to_datetime(df.index).tz_localize(None)
    return df[["Open", "High", "Low", "Close", "Volume"]].copy()


# ── P&L calculator (shared) ───────────────────────────────────────────────────

def _calc_pnl(
    df: pd.DataFrame,
    fee_bps: int,
    slippage_bps: int,
    initial_capital: float,
) -> tuple[pd.Series, pd.Series, list[dict], pd.Series]:
    """
    Given df with a 'position' column (0 or 1), compute equity, drawdown,
    trades and daily returns. Uses next-day-open execution (shift-1 signal).
    """
    df = df.copy()
    df["position_prev"]   = df["position"].shift(1).fillna(0)
    df["position_changed"] = df["position"] != df["position_prev"]

    df["daily_ret"]     = df["Close"].pct_change()
    df["daily_pnl_pct"] = df["position"] * df["daily_ret"]

    cost_bps = fee_bps + slippage_bps
    cost_pct = (cost_bps / 10_000) * (df["position"] - df["position_prev"]).abs()
    df["daily_pnl_pct"] = (df["daily_pnl_pct"] - cost_pct).fillna(0.0)

    df["cumret"]    = (1 + df["daily_pnl_pct"]).cumprod()
    equity_curve    = initial_capital * df["cumret"]
    rolling_max     = equity_curve.cummax()
    drawdown        = (equity_curve - rolling_max) / rolling_max

    trades_list: list[dict] = []
    for i in range(1, len(df)):
        if not df["position_changed"].iloc[i]:
            continue
        date_str = df.index[i].strftime("%Y-%m-%d")
        price    = float(df["Open"].iloc[i])
        pos      = int(df["position"].iloc[i])
        trades_list.append({"date": date_str, "action": "buy" if pos > 0 else "sell", "price": price})

    daily_returns = df["daily_pnl_pct"].dropna()
    return equity_curve, drawdown, trades_list, daily_returns


# ── Buy and hold ─────────────────────────────────────────────────────────────

def _run_buy_and_hold_backtest(
    df: pd.DataFrame,
    fee_bps: int,
    slippage_bps: int,
    initial_capital: float,
) -> tuple[pd.Series, pd.Series, list[dict], pd.Series]:
    """Buy on the first available day and hold through the entire period."""
    if df.empty:
        return (pd.Series(dtype=float), pd.Series(dtype=float), [], pd.Series(dtype=float))
    df = df.sort_index().copy()
    # position=1 every day; _calc_pnl sees a single 0→1 transition on day 1 (one buy, no sells)
    df["position"] = 1
    return _calc_pnl(df, fee_bps, slippage_bps, initial_capital)


# ── RSI computation ───────────────────────────────────────────────────────────

def _compute_rsi(series: pd.Series, period: int) -> pd.Series:
    delta    = series.diff()
    gain     = delta.clip(lower=0)
    loss     = (-delta).clip(lower=0)
    avg_gain = gain.ewm(com=period - 1, adjust=True).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=True).mean()
    rs       = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


# ── MA crossover backtest ─────────────────────────────────────────────────────

def _run_ma_backtest(
    df: pd.DataFrame,
    fast_period: int,
    slow_period: int,
    fee_bps: int,
    slippage_bps: int,
    initial_capital: float,
) -> tuple[pd.Series, pd.Series, list[dict], pd.Series]:
    if df.empty or len(df) < slow_period + 1:
        return (pd.Series(dtype=float), pd.Series(dtype=float), [], pd.Series(dtype=float))

    df = df.sort_index().copy()
    df["fast_ma"] = df["Close"].rolling(fast_period,  min_periods=fast_period).mean()
    df["slow_ma"] = df["Close"].rolling(slow_period, min_periods=slow_period).mean()
    df["signal"]  = (df["fast_ma"] > df["slow_ma"]).astype(int)
    df["position"] = df["signal"].shift(1).fillna(0).astype(int)

    return _calc_pnl(df, fee_bps, slippage_bps, initial_capital)


# ── RSI backtest ─────────────────────────────────────────────────────────────

def _run_rsi_backtest(
    df: pd.DataFrame,
    rsi_period: int,
    oversold: float,
    overbought: float,
    fee_bps: int,
    slippage_bps: int,
    initial_capital: float,
) -> tuple[pd.Series, pd.Series, list[dict], pd.Series]:
    if df.empty or len(df) < rsi_period + 5:
        return (pd.Series(dtype=float), pd.Series(dtype=float), [], pd.Series(dtype=float))

    df = df.sort_index().copy()
    df["rsi"] = _compute_rsi(df["Close"], rsi_period)

    # State-machine signal: enter when RSI dips below oversold, exit when above overbought
    signal   = np.zeros(len(df), dtype=int)
    position = 0
    for i in range(1, len(df)):
        rsi_val = df["rsi"].iloc[i]
        if pd.isna(rsi_val):
            signal[i] = position
            continue
        if position == 0 and rsi_val < oversold:
            position = 1
        elif position == 1 and rsi_val > overbought:
            position = 0
        signal[i] = position

    df["signal"]   = signal
    # Shift by 1 to execute on next day's open (no lookahead)
    df["position"] = pd.Series(signal, index=df.index).shift(1).fillna(0).astype(int)

    return _calc_pnl(df, fee_bps, slippage_bps, initial_capital)


# ── Metrics, Monte Carlo, guardrails ─────────────────────────────────────────

def _metrics(equity_curve: pd.Series, trades: list, daily_returns: pd.Series) -> Metrics:
    if equity_curve.empty or len(equity_curve) < 2:
        return Metrics(total_return=0.0, sharpe=0.0, max_drawdown=0.0, num_trades=0)
    total_return = float(equity_curve.iloc[-1] / equity_curve.iloc[0] - 1.0)
    rolling_max  = equity_curve.cummax()
    max_drawdown = float((equity_curve - rolling_max).div(rolling_max).min())
    if daily_returns.empty or daily_returns.std() == 0:
        sharpe = 0.0
    else:
        sharpe = float(daily_returns.mean() / daily_returns.std() * ANNUALIZATION_FACTOR)
    return Metrics(
        total_return=total_return,
        sharpe=sharpe,
        max_drawdown=max_drawdown,
        num_trades=len(trades),
    )


def _monte_carlo_paths(
    daily_returns: pd.Series,
    initial_capital: float,
    date_index: pd.DatetimeIndex,
    n_paths: int = NUM_MONTE_CARLO_PATHS,
) -> list[list[EquityPoint]]:
    if daily_returns.empty or len(date_index) == 0:
        return []
    returns_arr = daily_returns.values
    n_days      = len(date_index)
    rng         = np.random.default_rng()
    paths: list[list[EquityPoint]] = []
    for _ in range(n_paths):
        idx     = rng.integers(0, len(returns_arr), size=n_days)
        cumret  = np.cumprod(1 + returns_arr[idx])
        equity  = initial_capital * cumret
        paths.append([
            EquityPoint(date=date_index[i].strftime("%Y-%m-%d"), value=float(equity[i]))
            for i in range(n_days)
        ])
    return paths


def _guardrails(
    strategy: str,
    num_trades: int,
    num_trading_days: int,
    stop_loss_pct: float | None,
    take_profit_pct: float | None,
) -> list[str]:
    warnings: list[str] = []
    if num_trades < 10 and strategy != "buy_and_hold":
        warnings.append("Fewer than 10 trades — results may not be statistically meaningful.")
    if num_trading_days < 90:
        warnings.append("Backtest period is shorter than 90 trading days — consider a longer range.")
    if stop_loss_pct:
        warnings.append(
            f"Stop loss ({stop_loss_pct * 100:.1f}%) is modelled as a guardrail note; "
            "apply it manually when live trading."
        )
    if take_profit_pct:
        warnings.append(
            f"Take profit ({take_profit_pct * 100:.1f}%) is modelled as a guardrail note; "
            "apply it manually when live trading."
        )
    warnings.append("Backtest uses daily bars with next-day-open execution — live results will differ.")
    return warnings


# ── Main entry point ──────────────────────────────────────────────────────────

def run_backtest(graph: Graph, params: BacktestParams) -> BacktestOutput:
    strategy       = _detect_strategy(graph)
    stop_loss_pct  = _get_stop_loss_pct(graph)
    take_profit_pct = _get_take_profit_pct(graph)

    df = _fetch_ohlcv(params.symbol, params.start, params.end)

    if df.empty:
        return BacktestOutput(
            equity_curve=[], drawdown=[], trades=[],
            metrics=Metrics(total_return=0.0, sharpe=0.0, max_drawdown=0.0, num_trades=0),
            monte_carlo_paths=[],
            guardrails=["Insufficient price data for the given symbol and date range."],
        )

    if strategy == "rsi":
        rsi = _get_rsi_params(graph) or {}
        equity_curve, drawdown_series, trades_list, daily_returns = _run_rsi_backtest(
            df,
            rsi_period      = rsi.get("period",     14),
            oversold        = rsi.get("oversold",    30),
            overbought      = rsi.get("overbought",  70),
            fee_bps         = params.fee_bps,
            slippage_bps    = params.slippage_bps,
            initial_capital = params.initial_capital,
        )
    elif strategy == "buy_and_hold":
        equity_curve, drawdown_series, trades_list, daily_returns = _run_buy_and_hold_backtest(
            df,
            fee_bps         = params.fee_bps,
            slippage_bps    = params.slippage_bps,
            initial_capital = params.initial_capital,
        )
    else:  # ma_crossover (default)
        fast_period, slow_period = _get_ma_periods(graph)
        if len(df) < slow_period + 1:
            return BacktestOutput(
                equity_curve=[], drawdown=[], trades=[],
                metrics=Metrics(total_return=0.0, sharpe=0.0, max_drawdown=0.0, num_trades=0),
                monte_carlo_paths=[],
                guardrails=["Not enough price history for the requested MA periods."],
            )
        equity_curve, drawdown_series, trades_list, daily_returns = _run_ma_backtest(
            df, fast_period, slow_period,
            params.fee_bps, params.slippage_bps, params.initial_capital,
        )

    metrics   = _metrics(equity_curve, trades_list, daily_returns)
    guardrails = _guardrails(strategy, metrics.num_trades, len(df), stop_loss_pct, take_profit_pct)

    date_index        = equity_curve.index
    dr_aligned        = daily_returns.reindex(date_index).fillna(0.0)
    monte_carlo_paths = _monte_carlo_paths(dr_aligned, params.initial_capital, date_index)

    return BacktestOutput(
        equity_curve=[EquityPoint(date=d.strftime("%Y-%m-%d"), value=float(v)) for d, v in equity_curve.items()],
        drawdown    =[DrawdownPoint(date=d.strftime("%Y-%m-%d"), dd=float(v))  for d, v in drawdown_series.items()],
        trades      =[Trade(**t) for t in trades_list],
        metrics     =metrics,
        monte_carlo_paths=monte_carlo_paths,
        guardrails  =guardrails,
    )
