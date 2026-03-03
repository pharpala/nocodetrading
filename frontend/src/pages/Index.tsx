import { useState } from "react";
import { StrategyInput } from "@/components/StrategyInput";
import { StrategyBlocks } from "@/components/StrategyBlocks";
import { BlockEditDrawer } from "@/components/BlockEditDrawer";
import { BacktestSettings } from "@/components/BacktestSettings";
import { BacktestResultsPanel } from "@/components/BacktestResults";
import { parseStrategy, runBacktest, API_BASE } from "@/lib/api";
import { StrategyGraph, StrategyNode, BacktestParams, BacktestResults } from "@/types/strategy";
import { toast } from "sonner";
import {
  Orbit,
  Sparkles,
  ArrowLeft,
  TrendingUp,
  Activity,
  BarChart2,
  Wallet,
  LucideIcon,
} from "lucide-react";

const today = new Date();
const lastYear = new Date(today);
lastYear.setFullYear(today.getFullYear() - 1);
const fmtDate = (d: Date) => d.toISOString().split("T")[0];

type Phase = "hero" | "dashboard";

const LOGO_GRAD = {
  background: "linear-gradient(135deg, #00e5ff 0%, #2979ff 60%, #7c3aed 100%)",
  boxShadow: "0 0 16px rgba(0,229,255,0.55), 0 0 40px rgba(0,229,255,0.20)",
} as const;

const TITLE_GRAD = {
  background: "linear-gradient(90deg, #00e5ff 0%, #a78bfa 55%, #e879f9 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
} as const;

// ── Cosmos decorative overlay ──────────────────────────────────────────────────
function CosmosDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none fixed inset-0" style={{ zIndex: 0 }}>
      {/* Edge vignette — deepens corners for the "looking into space" feel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(0,0,8,0.55) 100%)",
        }}
      />
    </div>
  );
}

// ── Suggestion cards (shown on hero screen above the input) ────────────────────
interface Suggestion {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  prompt: string;
  color: string; // hsl accent color
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: TrendingUp,
    title: "MA crossover",
    subtitle: "Buy when a fast moving average crosses above a slow one",
    prompt: "Buy GLD when 20-day MA crosses above 50-day MA, sell on reverse",
    color: "rgba(0, 229, 255, 1)",
  },
  {
    icon: Activity,
    title: "RSI strategy",
    subtitle: "Enter on oversold conditions, exit when momentum fades",
    prompt: "Buy SPY when RSI drops below 30, sell when RSI exceeds 70",
    color: "rgba(124, 58, 237, 1)",
  },
  {
    icon: BarChart2,
    title: "Mean reversion",
    subtitle: "Buy dips below the moving average, sell when price recovers",
    prompt: "Buy when price drops 3% below 20-day MA on SPY, sell on return to MA",
    color: "rgba(233, 121, 249, 1)",
  },
  {
    icon: Wallet,
    title: "Buy and hold (Baseline)",
    subtitle: "Buy once and hold the position indefinitely",
    prompt: "Buy SPY and hold",
    color: "rgba(52, 211, 153, 1)",
  },
];

function SuggestionCard({
  icon: Icon,
  title,
  subtitle,
  color,
  onClick,
}: Omit<Suggestion, "prompt"> & { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all duration-200 group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = `rgba(${color.slice(5, -1)}, 0.06)`;
        el.style.borderColor = `rgba(${color.slice(5, -1)}, 0.30)`;
        el.style.boxShadow = `0 0 20px rgba(${color.slice(5, -1)}, 0.10)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "rgba(255,255,255,0.03)";
        el.style.borderColor = "rgba(255,255,255,0.07)";
        el.style.boxShadow = "none";
      }}
    >
      <Icon
        className="h-5 w-5 mb-2.5"
        style={{ color, filter: `drop-shadow(0 0 6px ${color.replace("1)", "0.45)")})` }}
      />
      <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(200,215,255,0.45)" }}>
        {subtitle}
      </p>
    </button>
  );
}

export default function Index() {
  const [phase, setPhase] = useState<Phase>("hero");
  const [strategyText, setStrategyText] = useState("");
  const [graph, setGraph] = useState<StrategyGraph | null>(null);
  const [editNode, setEditNode] = useState<StrategyNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [params, setParams] = useState<BacktestParams>({
    symbol: "GLD",
    start: fmtDate(lastYear),
    end: fmtDate(today),
    fee_bps: 10,
    slippage_bps: 5,
    initial_capital: 10000,
  });

  const handleGenerate = async (text: string) => {
    if (!text.trim()) return;
    setParseLoading(true);
    setResults(null);
    setPhase("dashboard");
    try {
      const { graph: g, symbol } = await parseStrategy(text);
      setGraph(g);
      if (symbol) setParams((p) => ({ ...p, symbol }));
      toast.success(`Generated ${g.nodes.length} blocks${symbol ? ` · ${symbol}` : ""}`);
    } catch {
      toast.error(
        `Could not reach the strategy parser. Start the backend: cd backend && .venv/bin/uvicorn app:app --reload --host 127.0.0.1 --port 8000 (expected at ${API_BASE})`
      );
    } finally {
      setParseLoading(false);
    }
  };

  const handleRunBacktest = async () => {
    if (!graph) return;
    setBacktestLoading(true);
    try {
      const data = await runBacktest(graph, params);
      setResults(data);
      toast.success("Backtest complete");
    } catch {
      toast.error(`Backtest failed. Is the backend running at ${API_BASE}?`);
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleSaveNode = (updated: StrategyNode) => {
    if (!graph) return;
    setGraph({ ...graph, nodes: graph.nodes.map((n) => (n.id === updated.id ? updated : n)) });
  };

  const handleReset = () => {
    setPhase("hero");
    setGraph(null);
    setResults(null);
  };

  const isDashboard = phase === "dashboard";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent">
      <CosmosDecor />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 z-50 border-b backdrop-blur-2xl"
        style={{
          background: "rgba(4, 1, 18, 0.82)",
          borderColor: "rgba(0, 229, 255, 0.18)",
          boxShadow: "0 1px 0 rgba(0,229,255,0.12), 0 4px 40px rgba(0,0,0,0.85)",
        }}
      >
        <div className="px-5 py-3 flex items-center justify-between">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center animate-glow-pulse"
              style={LOGO_GRAD}
            >
              <Orbit className="h-4 w-4 text-[#06021a]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight" style={TITLE_GRAD}>
                Trading Sandbox
              </span>
              <span className="text-[10px] tracking-widest uppercase font-medium mt-0.5"
                style={{ color: "rgba(0,229,255,0.35)" }}>
                AI-Powered Backtesting
              </span>
            </div>
          </div>

          {/* Status pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
            style={{
              background: "rgba(0,229,255,0.06)",
              border: "1px solid rgba(0,229,255,0.14)",
              color: "rgba(0,229,255,0.75)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: "#00e5ff", boxShadow: "0 0 6px #00e5ff" }} />
            Paper trading
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL — animates from full-width hero → narrow sidebar ───── */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{
            width: isDashboard ? "360px" : "100%",
            transition: "width 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >

          {/* ════════════════════════════════════════════════════════════════
              HERO SCREEN  (ChatGPT-style: greeting top, suggestions + input bottom)
          ════════════════════════════════════════════════════════════════ */}
          <div
            className="absolute inset-0 flex flex-col"
            style={{
              opacity: isDashboard ? 0 : 1,
              transform: isDashboard ? "scale(0.97) translateY(-10px)" : "scale(1) translateY(0)",
              transition: "opacity 0.32s ease, transform 0.32s ease",
              pointerEvents: isDashboard ? "none" : "auto",
            }}
          >
            {/* Greeting + suggestions + input — grouped together, vertically centred */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 pt-24 pb-0">
            <div className="w-full max-w-[700px] flex flex-col gap-5">
              <div className="text-center pb-8">
                <h2
                  className="text-3xl font-semibold tracking-tight"
                  style={{ color: "rgba(225,240,255,0.92)" }}
                >
                  What would you like to backtest?
                </h2>
                <p className="mt-2 text-sm" style={{ color: "rgba(180,200,255,0.42)" }}>
                  Describe a trading strategy in plain English — no code required.
                </p>
              </div>

            {/* Suggestions + input */}
            <div className="w-full flex flex-col gap-3">
              {/* 2 × 2 suggestion grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {SUGGESTIONS.map((s) => (
                  <SuggestionCard
                    key={s.title}
                    icon={s.icon}
                    title={s.title}
                    subtitle={s.subtitle}
                    color={s.color}
                    onClick={() => setStrategyText(s.prompt)}
                  />
                ))}
              </div>

              {/* Chat input */}
              <StrategyInput
                text={strategyText}
                onTextChange={setStrategyText}
                onGenerate={handleGenerate}
                isLoading={parseLoading}
                mode="chat"
              />

              {/* Hint */}
              <p className="text-center text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>
                Enter to send · Shift+Enter for a new line
              </p>
            </div>
            </div>
            </div>

            {/* Earth peeking from the bottom */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{ zIndex: 0, bottom: "-15%" }}
            >
              <img
                src="/67eea034867a491e1bbe57ca_Earth hero-min.avif"
                alt=""
                className="w-full"
                style={{
                  display: "block",
                  maxHeight: "38vh",
                  objectFit: "cover",
                  objectPosition: "top center",
                  maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.9) 60%, black 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.9) 60%, black 100%)",
                }}
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SIDEBAR  (shown once strategy has been generated)
          ════════════════════════════════════════════════════════════════ */}
          <div
            className="absolute inset-0 flex flex-col overflow-y-auto"
            style={{
              opacity: isDashboard ? 1 : 0,
              transform: isDashboard ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.4s 0.32s ease, transform 0.4s 0.32s ease",
              pointerEvents: isDashboard ? "auto" : "none",
              borderRight: "1px solid rgba(0,229,255,0.10)",
            }}
          >
            {/* Back button */}
            <div className="px-4 pt-4 pb-2 shrink-0">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200"
                style={{
                  background: "rgba(0,229,255,0.05)",
                  border: "1px solid rgba(0,229,255,0.13)",
                  color: "rgba(0,229,255,0.50)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(0,229,255,0.10)";
                  el.style.borderColor = "rgba(0,229,255,0.28)";
                  el.style.color = "rgba(0,229,255,0.90)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(0,229,255,0.05)";
                  el.style.borderColor = "rgba(0,229,255,0.13)";
                  el.style.color = "rgba(0,229,255,0.50)";
                }}
              >
                <ArrowLeft className="h-3 w-3" />
                New strategy
              </button>
            </div>

            {/* Compact strategy input */}
            <div className="px-4 pb-3 shrink-0">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(4,1,18,0.60)",
                  border: "1px solid rgba(0,229,255,0.13)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles
                    className="h-4 w-4 shrink-0"
                    style={{ color: "#00e5ff", filter: "drop-shadow(0 0 5px rgba(0,229,255,0.5))" }}
                  />
                  <span className="text-sm font-semibold" style={TITLE_GRAD}>
                    Strategy
                  </span>
                </div>
                <StrategyInput
                  text={strategyText}
                  onTextChange={setStrategyText}
                  onGenerate={handleGenerate}
                  isLoading={parseLoading}
                  mode="compact"
                />
              </div>
            </div>

            {/* Backtest settings */}
            <div className="px-4 pb-6 flex-1">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(4,1,18,0.60)",
                  border: "1px solid rgba(0,229,255,0.13)",
                }}
              >
                <BacktestSettings
                  params={params}
                  onChange={setParams}
                  onRun={handleRunBacktest}
                  isLoading={backtestLoading}
                  hasGraph={!!graph}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — main dashboard, slides in after transition ──────── */}
        <div
          className="flex-1 overflow-y-auto min-w-0"
          style={{
            opacity: isDashboard ? 1 : 0,
            transform: isDashboard ? "translateX(0)" : "translateX(28px)",
            transition: "opacity 0.5s 0.44s ease, transform 0.5s 0.44s ease",
            pointerEvents: isDashboard ? "auto" : "none",
          }}
        >
          <div className="p-6">
            <div
              className="rounded-2xl p-5 min-h-[400px]"
              style={{
                background: "rgba(4,1,18,0.60)",
                border: "1px solid rgba(0,229,255,0.13)",
                boxShadow: "0 4px 40px rgba(0,0,0,0.45)",
              }}
            >
              <StrategyBlocks
                nodes={graph?.nodes || []}
                edges={graph?.edges || []}
                onEditNode={(node) => { setEditNode(node); setDrawerOpen(true); }}
                loading={parseLoading}
              />
              {results && <BacktestResultsPanel results={results} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit drawer ──────────────────────────────────────────────────────── */}
      <BlockEditDrawer
        node={editNode}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveNode}
      />
    </div>
  );
}
