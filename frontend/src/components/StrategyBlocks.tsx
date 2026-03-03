import { StrategyNode, StrategyEdge, getBlockIcon } from "@/types/strategy";
import { Pencil, Workflow } from "lucide-react";

interface StrategyBlocksProps {
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  onEditNode: (node: StrategyNode) => void;
  loading?: boolean;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
const BLOCK_VAR: Record<string, string> = {
  "Moving Average": "blue",
  "Crossover":      "orange",
  "Buy":            "green",
  "Sell":           "red",
  "Filter":         "purple",
  "Stop Loss":      "pink",
  "Take Profit":    "teal",
  "RSI":            "indigo",
  "Signal":         "yellow",
};
const bv = (type: string) => BLOCK_VAR[type] ?? "blue";
const hslVar = (cv: string, a?: number) =>
  a !== undefined ? `hsl(var(--block-${cv}) / ${a})` : `hsl(var(--block-${cv}))`;

// ── Category roles ─────────────────────────────────────────────────────────────
const CATEGORY: Record<string, string> = {
  "Moving Average": "Watches the market",
  "RSI":            "Watches the market",
  "Crossover":      "Detects a signal",
  "Signal":         "Detects a signal",
  "Filter":         "Filters conditions",
  "Buy":            "Enters a trade",
  "Sell":           "Exits a trade",
  "Stop Loss":      "Protects capital",
  "Take Profit":    "Locks in gains",
};

// ── Plain-English block description ───────────────────────────────────────────
function describeBlock(node: StrategyNode): string {
  const p = node.params as Record<string, unknown>;
  switch (node.type) {
    case "Moving Average":
      return `Smooths the last ${p.period} days of price data to reveal trend direction.`;
    case "RSI":
      return `Measures momentum. Weak below ${p.oversold}, strong above ${p.overbought}.`;
    case "Crossover":
      if (p.direction === "above") return "Fires when the fast line overtakes the slow line — bullish.";
      if (p.direction === "below") return "Fires when the fast line drops below the slow line — bearish.";
      return "Fires whenever the two lines cross in either direction.";
    case "Buy":
      return "Opens a long position when the entry condition fires.";
    case "Sell":
      return `Closes the position on exit signal.${p.reverse ? " Also reverses on the opposite cross." : ""}`;
    case "Stop Loss":
      return `Exits automatically if price falls ${(Number(p.pct) * 100).toFixed(1)}% below entry — caps the loss.`;
    case "Take Profit":
      return `Books profit once price rises ${(Number(p.pct) * 100).toFixed(1)}% above entry.`;
    case "Signal":
    case "Filter":
      return String(p.condition ?? node.label ?? "Custom condition.");
    default:
      return node.label || `${node.type} step.`;
  }
}

// ── Human-readable param tags ──────────────────────────────────────────────────
const fmtN = (v: unknown) => Number(v).toLocaleString("en-US");

function readableParams(node: StrategyNode): Array<{ label: string; value: string }> {
  const p = node.params as Record<string, unknown>;
  switch (node.type) {
    case "Moving Average":
      return [{ label: "Window", value: `${fmtN(p.period)} days` }];
    case "RSI":
      return [
        { label: "Period",       value: `${fmtN(p.period)}d` },
        { label: "Oversold <",   value: fmtN(p.oversold) },
        { label: "Overbought >", value: fmtN(p.overbought) },
      ];
    case "Crossover":
      return [{ label: "Direction", value: p.direction === "above" ? "Up ↑" : p.direction === "below" ? "Down ↓" : "Either ↕" }];
    case "Stop Loss":
      return [{ label: "Cut at", value: `−${(Number(p.pct) * 100).toFixed(1)}%` }];
    case "Take Profit":
      return [{ label: "Take at", value: `+${(Number(p.pct) * 100).toFixed(1)}%` }];
    default:
      return [];
  }
}

// ── Topological level assignment ───────────────────────────────────────────────
function computeLevels(nodes: StrategyNode[], edges: StrategyEdge[]): StrategyNode[][] {
  if (nodes.length === 0) return [];

  const nodeSet = new Set(nodes.map(n => n.id));
  const validEdges = edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target));

  const parents: Record<string, string[]> = {};
  for (const n of nodes) parents[n.id] = [];
  for (const e of validEdges) parents[e.target] = [...(parents[e.target] ?? []), e.source];

  const levelOf: Record<string, number> = {};
  const computing = new Set<string>();

  function getLevel(id: string): number {
    if (id in levelOf) return levelOf[id];
    if (computing.has(id)) return 0; // cycle guard
    computing.add(id);
    const l = parents[id].length === 0
      ? 0
      : Math.max(...parents[id].map(getLevel)) + 1;
    levelOf[id] = l;
    computing.delete(id);
    return l;
  }

  nodes.forEach(n => getLevel(n.id));

  const maxLevel = Math.max(0, ...Object.values(levelOf));
  return Array.from({ length: maxLevel + 1 }, (_, l) =>
    nodes.filter(n => levelOf[n.id] === l)
  ).filter(lvl => lvl.length > 0);
}

// ── Transition verb between two levels ────────────────────────────────────────
function transitionVerb(above: StrategyNode[], below: StrategyNode[]): string {
  const ind  = new Set(["Moving Average", "RSI"]);
  const sig  = new Set(["Crossover", "Signal", "Filter"]);
  const act  = new Set(["Buy", "Sell"]);
  const risk = new Set(["Stop Loss", "Take Profit"]);
  const aboveT = above.map(n => n.type);
  const belowT = below.map(n => n.type);
  if (aboveT.every(t => ind.has(t))  && belowT.some(t => sig.has(t)))  return "feed into";
  if (aboveT.some(t => ind.has(t))   && belowT.some(t => sig.has(t)))  return "feed into";
  if (aboveT.some(t => sig.has(t))   && belowT.some(t => act.has(t)))  return "triggers";
  if (aboveT.some(t => act.has(t))   && belowT.some(t => risk.has(t))) return "protected by";
  return "then";
}

// ── SVG connector between two levels ──────────────────────────────────────────
function LevelConnector({
  above, below, allEdges, verb,
}: {
  above: StrategyNode[];
  below: StrategyNode[];
  allEdges: StrategyEdge[];
  verb: string;
}) {
  const aboveSet = new Set(above.map(n => n.id));
  const belowSet = new Set(below.map(n => n.id));
  const relevantEdges = allEdges.filter(e => aboveSet.has(e.source) && belowSet.has(e.target));
  if (relevantEdges.length === 0) return null;

  // X centre of node i in a level of n nodes (SVG units 0–100)
  const cx = (idx: number, n: number) => (idx + 0.5) / n * 100;

  return (
    <div className="relative w-full flex flex-col items-center" style={{ height: "64px" }}>
      {/* Bezier curves */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      >
        <defs>
          {relevantEdges.map((e, i) => {
            const srcCv = bv(above.find(n => n.id === e.source)!.type);
            const dstCv = bv(below.find(n => n.id === e.target)!.type);
            return (
              <linearGradient key={i} id={`lg-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={hslVar(srcCv)} stopOpacity="0.65" />
                <stop offset="100%" stopColor={hslVar(dstCv)} stopOpacity="0.65" />
              </linearGradient>
            );
          })}
        </defs>
        {relevantEdges.map((e, i) => {
          const srcNode = above.find(n => n.id === e.source)!;
          const dstNode = below.find(n => n.id === e.target)!;
          const x1 = cx(above.indexOf(srcNode), above.length);
          const x2 = cx(below.indexOf(dstNode), below.length);
          return (
            <path
              key={i}
              d={`M ${x1} 0 C ${x1} 50 ${x2} 50 ${x2} 100`}
              stroke={`url(#lg-${i})`}
              strokeWidth="1.8"
              fill="none"
            />
          );
        })}
      </svg>

      {/* Centred verb label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-0.5 rounded-full z-10"
          style={{
            background: "rgba(4, 1, 16, 0.82)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(160,185,255,0.55)",
            backdropFilter: "blur(6px)",
          }}
        >
          {verb}
        </span>
      </div>
    </div>
  );
}

// ── Single block card ─────────────────────────────────────────────────────────
function BlockCard({
  node,
  compact = false,
  onEdit,
}: {
  node: StrategyNode;
  compact?: boolean;
  onEdit: () => void;
}) {
  const cv       = bv(node.type);
  const category = CATEGORY[node.type] ?? node.type;
  const desc     = describeBlock(node);
  const tags     = readableParams(node);
  const icon     = getBlockIcon(node.type);

  return (
    <div
      className="flex-1 min-w-0 rounded-2xl animate-fade-in-up cursor-default"
      style={{
        background: `linear-gradient(145deg, ${hslVar(cv, 0.13)} 0%, rgba(4,1,16,0.90) 55%)`,
        border: `1px solid ${hslVar(cv, 0.26)}`,
        borderTop: `2px solid ${hslVar(cv, 0.52)}`,
        boxShadow: `0 0 24px ${hslVar(cv, 0.14)}, 0 4px 20px rgba(0,0,0,0.52)`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-3px) scale(1.012)";
        el.style.boxShadow = `0 0 44px ${hslVar(cv, 0.34)}, 0 10px 28px rgba(0,0,0,0.60)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0) scale(1)";
        el.style.boxShadow = `0 0 24px ${hslVar(cv, 0.14)}, 0 4px 20px rgba(0,0,0,0.52)`;
      }}
    >
      <div className={`flex flex-col gap-2 ${compact ? "p-3" : "p-4"}`}>
        {/* Row 1: category + icon + edit */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex items-center justify-center shrink-0 rounded-md text-sm"
              style={{
                width: compact ? "24px" : "28px",
                height: compact ? "24px" : "28px",
                background: hslVar(cv, 0.16),
                border: `1px solid ${hslVar(cv, 0.28)}`,
              }}
            >
              {icon}
            </span>
            <span
              className="text-[10px] font-semibold tracking-wide uppercase truncate"
              style={{ color: hslVar(cv, 0.88) }}
            >
              {category}
            </span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="shrink-0 flex items-center justify-center rounded-lg transition-all duration-200"
            style={{
              width: "26px", height: "26px",
              background: "rgba(0,229,255,0.05)",
              border: "1px solid rgba(0,229,255,0.12)",
              color: "rgba(0,229,255,0.45)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(0,229,255,0.12)";
              el.style.borderColor = "rgba(0,229,255,0.35)";
              el.style.color = "rgba(0,229,255,0.9)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(0,229,255,0.05)";
              el.style.borderColor = "rgba(0,229,255,0.12)";
              el.style.color = "rgba(0,229,255,0.45)";
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        {/* Row 2: description */}
        <p
          className={`text-sm leading-relaxed font-medium ${compact ? "line-clamp-3" : ""}`}
          style={{ color: "rgba(220,235,255,0.88)" }}
        >
          {desc}
        </p>

        {/* Row 3: param tags */}
        {tags.length > 0 && (
          <div
            className="flex flex-wrap gap-1 pt-1.5"
            style={{ borderTop: `1px solid ${hslVar(cv, 0.10)}` }}
          >
            {tags.map(({ label, value }) => (
              <span
                key={label}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium leading-none"
                style={{
                  background: hslVar(cv, 0.10),
                  border: `1px solid ${hslVar(cv, 0.20)}`,
                  color: hslVar(cv, 0.78),
                }}
              >
                <span style={{ color: hslVar(cv, 0.48) }}>{label}:</span> {value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function StrategyBlocks({ nodes, edges, onEditNode, loading = false }: StrategyBlocksProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-[500px] mx-auto animate-fade-in-up">
        {[72, 88, 64].map((h, i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{
              height: `${h}px`,
              background: "linear-gradient(145deg, rgba(0,229,255,0.07) 0%, rgba(4,1,16,0.60) 100%)",
              border: "1px solid rgba(0,229,255,0.10)",
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
        <p className="text-center text-xs mt-2" style={{ color: "rgba(0,229,255,0.35)" }}>
          Parsing your strategy…
        </p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4"
        style={{ color: "rgba(0,229,255,0.35)" }}
      >
        <Workflow className="h-14 w-14 animate-float"
          style={{ filter: "drop-shadow(0 0 14px rgba(0,229,255,0.32))" }}
        />
        <p className="text-sm text-center leading-relaxed" style={{ color: "rgba(0,229,255,0.45)" }}>
          Your strategy blocks will appear here.<br />
          Describe a strategy and click Generate.
        </p>
      </div>
    );
  }

  const levels = computeLevels(nodes, edges);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-5 self-start">
        <Workflow className="h-5 w-5"
          style={{ color: "#00e5ff", filter: "drop-shadow(0 0 6px rgba(0,229,255,0.6))" }}
        />
        <h2 className="text-lg font-semibold"
          style={{
            background: "linear-gradient(90deg, #00e5ff 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Strategy flow
        </h2>
        <span className="text-xs ml-1" style={{ color: "rgba(0,229,255,0.45)" }}>
          {nodes.length} step{nodes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* DAG levels */}
      <div className="flex flex-col w-full max-w-[500px]">
        {levels.map((level, li) => (
          <div key={li}>
            {/* Level row — nodes side by side */}
            <div className="flex gap-3">
              {level.map(node => (
                <BlockCard
                  key={node.id}
                  node={node}
                  compact={level.length > 1}
                  onEdit={() => onEditNode(node)}
                />
              ))}
            </div>

            {/* SVG connector to next level */}
            {li < levels.length - 1 && (
              <LevelConnector
                above={level}
                below={levels[li + 1]}
                allEdges={edges}
                verb={transitionVerb(level, levels[li + 1])}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
