export interface StrategyNode {
  id: string;
  type: string;
  label: string;
  params: Record<string, string | number | boolean>;
}

export interface StrategyEdge {
  source: string;
  target: string;
}

export interface StrategyGraph {
  nodes: StrategyNode[];
  edges: StrategyEdge[];
}

export interface BacktestParams {
  symbol: string;
  start: string;
  end: string;
  fee_bps: number;
  slippage_bps: number;
  initial_capital: number;
}

export interface Trade {
  date: string;
  action: string;
  price: number;
}

export interface BacktestResults {
  equity_curve: { date: string; value: number }[];
  drawdown: { date: string; value: number }[];
  monte_carlo: { date: string; [key: string]: number | string }[];
  trades: Trade[];
  guardrails: string[];
  metrics?: {
    total_return: number;
    sharpe: number;
    max_drawdown: number;
    num_trades: number;
  };
}

export const BLOCK_COLORS: Record<string, string> = {
  "Moving Average": "bg-block-blue",
  "Crossover": "bg-block-orange",
  "Buy": "bg-block-green",
  "Sell": "bg-block-red",
  "Filter": "bg-block-purple",
  "Stop Loss": "bg-block-pink",
  "Take Profit": "bg-block-teal",
  "RSI": "bg-block-indigo",
  "Signal": "bg-block-yellow",
};

export const BLOCK_ICONS: Record<string, string> = {
  "Moving Average": "📊",
  "Crossover": "✕",
  "Buy": "📈",
  "Sell": "📉",
  "Filter": "🔍",
  "Stop Loss": "🛑",
  "Take Profit": "🎯",
  "RSI": "📐",
  "Signal": "⚡",
};

export function getBlockColor(type: string): string {
  return BLOCK_COLORS[type] || "bg-block-blue";
}

export function getBlockIcon(type: string): string {
  return BLOCK_ICONS[type] || "⚙️";
}
