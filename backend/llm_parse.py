"""LLM-based strategy parser using the Martian router (OpenAI-compatible API)."""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from models import Graph, Node, Edge, LLMGraphResponse

# Load .env from repo root (one level above the backend/ directory)
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

# ── Martian gateway config ─────────────────────────────────────────────────────
MARTIAN_BASE_URL = "https://api.withmartian.com/v1"
# gpt-4o-mini is cheap + capable; Martian routes it to the most cost-effective provider
MARTIAN_MODEL = "openai/gpt-4o-mini"

# ── Ticker synonyms for symbol inference ──────────────────────────────────────
TICKER_SYNONYMS: dict[str, str] = {
    "gold": "GLD",
    "spy": "SPY",
    "s&p": "SPY",
    "s&p 500": "SPY",
    "sp500": "SPY",
    "nasdaq": "QQQ",
    "qqq": "QQQ",
    "apple": "AAPL",
    "tesla": "TSLA",
    "microsoft": "MSFT",
    "amazon": "AMZN",
    "google": "GOOGL",
    "nvidia": "NVDA",
    "bitcoin": "BTC-USD",
    "btc": "BTC-USD",
    "ethereum": "ETH-USD",
    "eth": "ETH-USD",
}

# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are a trading strategy parser. Convert the user's natural-language description
into a structured strategy graph and output ONLY valid JSON — no markdown fences,
no comments, no extra text.

Schema:
{
  "nodes": [
    {
      "id": "<snake_case_id>",
      "type": "<EXACT type from the list below>",
      "label": "<short human-readable description>",
      "params": {}
    }
  ],
  "edges": [
    { "from": "<source_id>", "to": "<target_id>" }
  ],
  "symbol": "<TICKER if mentioned, otherwise null>"
}

Allowed node types and their params:
  "Moving Average"  — { "period": int, "name": string }
  "RSI"             — { "period": int (default 14), "oversold": int (default 30), "overbought": int (default 70) }
  "Crossover"       — { "direction": "above" | "below" | "both" }
  "Signal"          — { "condition": string }
  "Filter"          — { "condition": string }
  "Buy"             — { "on_signal": "crossover" | "oversold" | "breakout" | "signal" }
  "Sell"            — { "on_signal": "crossover" | "overbought" | "signal", "reverse": bool }
  "Stop Loss"       — { "pct": float  (e.g. 0.02 = 2%) }
  "Take Profit"     — { "pct": float  (e.g. 0.05 = 5%) }

Type MUST be one of those exact strings.

Construction rules:
1. MA crossover: two "Moving Average" nodes (fast + slow) → "Crossover" → "Buy" and/or "Sell"
2. RSI: one "RSI" node → "Buy" (oversold entry) and/or "Sell" (overbought exit)
3. Always include at least one "Buy" or "Sell" node.
4. "Stop Loss" / "Take Profit" nodes connect FROM the "Buy" node (apply to open long).
5. Edges must reference real node ids. Keep the graph simple: 3–7 nodes.
6. Infer symbol: gold→GLD, spy→SPY, s&p→SPY, nasdaq→QQQ, apple→AAPL, tesla→TSLA, bitcoin→BTC-USD

Example 1 — MA crossover:
User: "20-day MA crosses above 50-day MA on GLD, sell on reverse"
{
  "nodes":[
    {"id":"fast_ma","type":"Moving Average","label":"20-day MA","params":{"period":20,"name":"fast (20)"}},
    {"id":"slow_ma","type":"Moving Average","label":"50-day MA","params":{"period":50,"name":"slow (50)"}},
    {"id":"crossover","type":"Crossover","label":"Golden cross / death cross","params":{"direction":"both"}},
    {"id":"buy","type":"Buy","label":"Buy on golden cross","params":{"on_signal":"crossover"}},
    {"id":"sell","type":"Sell","label":"Sell on death cross","params":{"on_signal":"crossover","reverse":true}}
  ],
  "edges":[
    {"from":"fast_ma","to":"crossover"},{"from":"slow_ma","to":"crossover"},
    {"from":"crossover","to":"buy"},{"from":"crossover","to":"sell"}
  ],
  "symbol":"GLD"
}

Example 2 — RSI with stop loss:
User: "RSI oversold buy on SPY with 2% stop loss"
{
  "nodes":[
    {"id":"rsi","type":"RSI","label":"RSI(14)","params":{"period":14,"oversold":30,"overbought":70}},
    {"id":"buy","type":"Buy","label":"Buy when RSI < 30","params":{"on_signal":"oversold"}},
    {"id":"sell","type":"Sell","label":"Sell when RSI > 70","params":{"on_signal":"overbought","reverse":false}},
    {"id":"sl","type":"Stop Loss","label":"2% stop loss","params":{"pct":0.02}}
  ],
  "edges":[
    {"from":"rsi","to":"buy"},{"from":"rsi","to":"sell"},{"from":"buy","to":"sl"}
  ],
  "symbol":"SPY"
}
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

class LLMParseError(Exception):
    """Raised when LLM output is invalid; carries a fallback graph."""
    def __init__(self, message: str, fallback_graph: Graph):
        super().__init__(message)
        self.message = message
        self.fallback_graph = fallback_graph


def _fallback_graph() -> Graph:
    """Safe default: 20/50 MA crossover strategy."""
    return Graph(
        nodes=[
            Node(id="fast_ma",   type="Moving Average", label="20-day MA",        params={"period": 20, "name": "fast (20)"}),
            Node(id="slow_ma",   type="Moving Average", label="50-day MA",        params={"period": 50, "name": "slow (50)"}),
            Node(id="crossover", type="Crossover",      label="Golden/death cross", params={"direction": "both"}),
            Node(id="buy",       type="Buy",            label="Buy on golden cross", params={"on_signal": "crossover"}),
            Node(id="sell",      type="Sell",           label="Sell on death cross", params={"on_signal": "crossover", "reverse": True}),
        ],
        edges=[
            Edge(source="fast_ma",   target="crossover"),
            Edge(source="slow_ma",   target="crossover"),
            Edge(source="crossover", target="buy"),
            Edge(source="crossover", target="sell"),
        ],
    )


def get_symbol_hint(text: str) -> str | None:
    """Return a ticker symbol inferred from keywords in the strategy text."""
    lower = text.lower()
    for keyword, symbol in TICKER_SYNONYMS.items():
        if keyword in lower:
            return symbol
    return None


def parse_strategy(text: str) -> Graph:
    """Rule-based fallback. Returns the default MA crossover graph."""
    return _fallback_graph()


def _build_client() -> tuple[OpenAI, str]:
    """Return (OpenAI client, model) configured for Martian or OpenAI fallback."""
    martian_key = os.environ.get("MARTIAN_API_KEY")
    openai_key  = os.environ.get("OPENAI_API_KEY")

    if martian_key:
        return OpenAI(api_key=martian_key, base_url=MARTIAN_BASE_URL), MARTIAN_MODEL
    if openai_key:
        return OpenAI(api_key=openai_key), "gpt-4o-mini"
    return None, None  # type: ignore[return-value]


def parse_strategy_with_llm(text: str) -> tuple[Graph, str | None]:
    """
    Parse a natural-language strategy into a Graph using the Martian AI router.
    Falls back to OpenAI if MARTIAN_API_KEY is absent but OPENAI_API_KEY is set.
    Raises LLMParseError (with fallback_graph) on any failure.
    """
    client, model = _build_client()
    if client is None:
        raise LLMParseError(
            "No AI API key found. Add MARTIAN_API_KEY to .env to enable smart parsing.",
            _fallback_graph(),
        )

    user_text = text.strip() or "Buy GLD when the 20-day MA crosses above the 50-day MA, sell on reverse."

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_text},
            ],
            temperature=0,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if the model adds them anyway
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data = json.loads(raw)

    except json.JSONDecodeError as exc:
        raise LLMParseError(f"AI returned malformed JSON: {exc}", _fallback_graph()) from exc
    except Exception as exc:
        raise LLMParseError(f"AI request failed: {exc}", _fallback_graph()) from exc

    try:
        parsed = LLMGraphResponse.model_validate(data)
    except Exception as exc:
        raise LLMParseError(f"Graph schema validation failed: {exc}", _fallback_graph()) from exc

    nodes = [
        Node(
            id=n.id,
            type=n.type,
            label=n.label or n.type,
            params=n.params,
        )
        for n in parsed.nodes
    ]
    edges = [Edge(source=e.from_, target=e.to) for e in parsed.edges]
    symbol = parsed.symbol or get_symbol_hint(text)
    return Graph(nodes=nodes, edges=edges), symbol
