import { StrategyGraph, BacktestParams, BacktestResults } from "@/types/strategy";

const API_BASE = "http://localhost:8000";

export async function parseStrategy(text: string): Promise<StrategyGraph> {
  const res = await fetch(`${API_BASE}/parse_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to parse strategy");
  return res.json();
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
  return res.json();
}
