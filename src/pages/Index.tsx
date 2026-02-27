import { useState } from "react";
import { StrategyInput } from "@/components/StrategyInput";
import { StrategyBlocks } from "@/components/StrategyBlocks";
import { BlockEditDrawer } from "@/components/BlockEditDrawer";
import { BacktestSettings } from "@/components/BacktestSettings";
import { BacktestResultsPanel } from "@/components/BacktestResults";
import { parseStrategy, runBacktest } from "@/lib/api";
import { StrategyGraph, StrategyNode, BacktestParams, BacktestResults } from "@/types/strategy";
import { toast } from "sonner";
import { Boxes } from "lucide-react";

const today = new Date();
const lastYear = new Date(today);
lastYear.setFullYear(today.getFullYear() - 1);
const fmt = (d: Date) => d.toISOString().split("T")[0];

export default function Index() {
  const [graph, setGraph] = useState<StrategyGraph | null>(null);
  const [editNode, setEditNode] = useState<StrategyNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [params, setParams] = useState<BacktestParams>({
    symbol: "GLD",
    start: fmt(lastYear),
    end: fmt(today),
    fee_bps: 10,
    slippage_bps: 5,
    initial_capital: 10000,
  });

  const handleGenerate = async (text: string) => {
    setParseLoading(true);
    setResults(null);
    try {
      const data = await parseStrategy(text);
      setGraph(data);
      toast.success(`Generated ${data.nodes.length} blocks`);
    } catch {
      toast.error("Could not reach the strategy parser. Is the backend running on localhost:8000?");
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
      toast.error("Backtest failed. Is the backend running?");
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleSaveNode = (updated: StrategyNode) => {
    if (!graph) return;
    setGraph({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === updated.id ? updated : n)),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Boxes className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Strategy Sandbox</h1>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_300px] gap-6">
          {/* Left: Strategy Input */}
          <div className="glass-card rounded-2xl p-5">
            <StrategyInput onGenerate={handleGenerate} isLoading={parseLoading} />
          </div>

          {/* Middle: Blocks */}
          <div className="glass-card rounded-2xl p-5 min-h-[400px]">
            <StrategyBlocks
              nodes={graph?.nodes || []}
              onEditNode={(node) => {
                setEditNode(node);
                setDrawerOpen(true);
              }}
            />
            {results && <BacktestResultsPanel results={results} />}
          </div>

          {/* Right: Backtest Settings */}
          <div className="glass-card rounded-2xl p-5">
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

      {/* Edit Drawer */}
      <BlockEditDrawer
        node={editNode}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveNode}
      />
    </div>
  );
}
