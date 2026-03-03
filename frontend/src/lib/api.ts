import { StrategyGraph, BacktestParams, BacktestResults } from "@/types/strategy";

/** API base URL. Uses same host as the page so localhost/127.0.0.1 match; override with VITE_API_URL. */
function getApiBase(): string {
  const env = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:8000`;
  return "http://127.0.0.1:8000";
}
export const API_BASE = getApiBase();

type BackendBacktestResponse = {
  equity_curve?: { date: string; value: number }[];
  drawdown?: { date: string; dd: number }[];
  trades?: { date: string; action: string; price: number }[];
  guardrails?: string[];
  metrics?: {
    total_return: number;
    sharpe: number;
    max_drawdown: number;
    num_trades: number;
  };
  monte_carlo_paths?: { date: string; value: number }[][];
};

function mapBacktestResponse(payload: BackendBacktestResponse): BacktestResults {
  const equity_curve = payload.equity_curve ?? [];
  const drawdown = (payload.drawdown ?? []).map((p) => ({
    date: p.date,
    value: p.dd,
  }));
  const trades = payload.trades ?? [];
  const guardrails = payload.guardrails ?? [];

  // Convert backend paths [[{date,value}...], ...] to chart rows [{date,path_1,path_2...}, ...]
  const paths = payload.monte_carlo_paths ?? [];
  const monte_carlo =
    paths.length === 0
      ? []
      : paths[0].map((pt, i) => {
          const row: { [key: string]: string | number; date: string } = { date: pt.date };
          for (let p = 0; p < paths.length; p += 1) {
            row[`path_${p + 1}`] = paths[p][i]?.value ?? 0;
          }
          return row;
        });

  return {
    equity_curve,
    drawdown,
    monte_carlo,
    trades,
    guardrails,
    metrics: payload.metrics,
  };
}

export async function parseStrategy(
  text: string
): Promise<{ graph: StrategyGraph; symbol: string | null }> {
  const res = await fetch(`${API_BASE}/parse_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // use_llm: true — always route through Martian AI when a key is configured
    body: JSON.stringify({ text, use_llm: true }),
  });
  if (!res.ok) throw new Error("Failed to parse strategy");
  const payload = await res.json();
  return {
    graph:  payload.graph  as StrategyGraph,
    symbol: payload.symbol as string | null ?? null,
  };
}

export async function runBacktest(
  graph: StrategyGraph,
  params: BacktestParams
): Promise<BacktestResults> {
  const res = await fetch(`${API_BASE}/backtest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph, params }),
  });
  if (!res.ok) throw new Error("Backtest failed");
  const payload = (await res.json()) as BackendBacktestResponse;
  return mapBacktestResponse(payload);
}
