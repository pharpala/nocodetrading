"""Pydantic models for the no-code trading strategy sandbox API."""

from pydantic import BaseModel, Field
from typing import Any


class Node(BaseModel):
    """A node in the strategy graph (indicator, signal, or action)."""
    id: str
    type: str
    label: str = ""
    params: dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    """Directed edge between two nodes."""
    source: str
    target: str


class Graph(BaseModel):
    """Strategy graph with nodes and edges."""
    nodes: list[Node]
    edges: list[Edge]


# ── LLM output schema ─────────────────────────────────────────────────────────

class LLMNode(BaseModel):
    """Node as returned by the LLM. type is open-ended; label is optional."""
    id: str
    type: str
    label: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)


class LLMEdge(BaseModel):
    """Edge as returned by LLM (uses from/to field names)."""
    from_: str = Field(alias="from")
    to: str
    port: str | None = None

    model_config = {"populate_by_name": True}


class LLMGraphResponse(BaseModel):
    """Graph JSON as returned by the LLM."""
    nodes: list[LLMNode]
    edges: list[LLMEdge]
    symbol: str | None = None

    model_config = {"populate_by_name": True}


# ── API request / response models ─────────────────────────────────────────────

class ParseStrategyInput(BaseModel):
    """Input for POST /parse_strategy."""
    text: str
    use_llm: bool = True  # LLM is the default path when a key is configured


class ParseStrategyOutput(BaseModel):
    """Output for POST /parse_strategy."""
    graph: Graph
    symbol: str | None = None


class BacktestParams(BaseModel):
    """Backtest parameters."""
    symbol: str
    start: str       # YYYY-MM-DD
    end: str         # YYYY-MM-DD
    fee_bps: int = 10
    slippage_bps: int = 5
    initial_capital: float = 10_000.0


class BacktestInput(BaseModel):
    """Input for POST /backtest."""
    graph: Graph
    params: BacktestParams


class EquityPoint(BaseModel):
    date: str
    value: float


class DrawdownPoint(BaseModel):
    date: str
    dd: float


class Trade(BaseModel):
    date: str
    action: str   # "buy" | "sell"
    price: float


class Metrics(BaseModel):
    total_return: float
    sharpe: float
    max_drawdown: float
    num_trades: int


class BacktestOutput(BaseModel):
    """Output for POST /backtest."""
    equity_curve: list[EquityPoint]
    drawdown: list[DrawdownPoint]
    trades: list[Trade]
    metrics: Metrics
    monte_carlo_paths: list[list[EquityPoint]]
    guardrails: list[str]
