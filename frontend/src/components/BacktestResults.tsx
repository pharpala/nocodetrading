import { BacktestResults as Results } from "@/types/strategy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3, Table2, ShieldAlert } from "lucide-react";

interface BacktestResultsProps {
  results: Results;
}

// ── Number formatters ──────────────────────────────────────────────────────────
const fmtDollar = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAxisDollar = (v: number) =>
  "$" + Math.round(v).toLocaleString("en-US");

// Drawdown values are fractions (0.15 = 15 %)
const fmtPct     = (v: number) => (v * 100).toFixed(1) + "%";
const fmtAxisPct = (v: number) => (v * 100).toFixed(0) + "%";

const fmtPrice = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CHART_GRID    = "rgba(0, 229, 255, 0.07)";
const CHART_AXIS    = "rgba(0, 229, 255, 0.30)";
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid rgba(0, 229, 255, 0.20)",
  background: "rgba(6, 2, 22, 0.92)",
  backdropFilter: "blur(16px)",
  boxShadow: "0 4px 30px rgba(0,0,0,0.65)",
  color: "#e0f8ff",
  fontSize: 12,
};

export function BacktestResultsPanel({ results }: BacktestResultsProps) {
  const equityCurve = results.equity_curve ?? [];
  const drawdown    = results.drawdown ?? [];
  const monteCarlo  = results.monte_carlo ?? [];
  const trades      = results.trades ?? [];
  const guardrails  = results.guardrails ?? [];

  const mcKeys = monteCarlo.length > 0
    ? Object.keys(monteCarlo[0]).filter((k) => k !== "date")
    : [];

  return (
    <div className="mt-6 animate-fade-in-up">
      <Tabs defaultValue="equity" className="w-full">
        <TabsList
          className="w-full rounded-lg h-10 p-1"
          style={{
            background: "rgba(0, 229, 255, 0.06)",
            border: "1px solid rgba(0, 229, 255, 0.14)",
          }}
        >
          <TabsTrigger value="equity"
            className="text-xs gap-1 rounded-md data-[state=active]:bg-[rgba(0,229,255,0.14)] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <TrendingUp className="h-3.5 w-3.5" /> Equity
          </TabsTrigger>
          <TabsTrigger value="drawdown"
            className="text-xs gap-1 rounded-md data-[state=active]:bg-[rgba(0,229,255,0.14)] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <TrendingDown className="h-3.5 w-3.5" /> Drawdown
          </TabsTrigger>
          <TabsTrigger value="montecarlo"
            className="text-xs gap-1 rounded-md data-[state=active]:bg-[rgba(0,229,255,0.14)] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <BarChart3 className="h-3.5 w-3.5" /> Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="trades"
            className="text-xs gap-1 rounded-md data-[state=active]:bg-[rgba(0,229,255,0.14)] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <Table2 className="h-3.5 w-3.5" /> Trades
          </TabsTrigger>
          <TabsTrigger value="guardrails"
            className="text-xs gap-1 rounded-md data-[state=active]:bg-[rgba(0,229,255,0.14)] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <ShieldAlert className="h-3.5 w-3.5" /> Guardrails
          </TabsTrigger>
        </TabsList>

        {/* Equity curve */}
        <TabsContent value="equity" className="mt-4">
          <div className="h-[300px] glass-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00e5ff" stopOpacity={0.38} />
                    <stop offset="60%"  stopColor="#2979ff" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} stroke={CHART_GRID} />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} stroke={CHART_GRID} width={80}
                  tickFormatter={fmtAxisDollar} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [fmtDollar(v), "Equity"]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#00e5ff"
                  strokeWidth={2}
                  fill="url(#eqGrad)"
                  style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.5))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Drawdown */}
        <TabsContent value="drawdown" className="mt-4">
          <div className="h-[300px] glass-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdown}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#e91e8c" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="#e91e8c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} stroke={CHART_GRID} />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} stroke={CHART_GRID} width={56}
                  tickFormatter={fmtAxisPct} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [fmtPct(v), "Drawdown"]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#e91e8c"
                  strokeWidth={2}
                  fill="url(#ddGrad)"
                  style={{ filter: "drop-shadow(0 0 4px rgba(233,30,140,0.5))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Monte Carlo */}
        <TabsContent value="montecarlo" className="mt-4">
          <div className="h-[300px] glass-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monteCarlo}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} stroke={CHART_GRID} />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} stroke={CHART_GRID} width={80}
                  tickFormatter={fmtAxisDollar} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [fmtDollar(v), ""]} />
                {mcKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={`hsl(${185 + i * 28} 90% 58%)`}
                    strokeWidth={1.2}
                    dot={false}
                    opacity={0.55}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Trades table */}
        <TabsContent value="trades" className="mt-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.04)" }}
                  >
                    <th className="text-left p-3 font-medium text-xs" style={{ color: "rgba(0,229,255,0.6)" }}>Date</th>
                    <th className="text-left p-3 font-medium text-xs" style={{ color: "rgba(0,229,255,0.6)" }}>Action</th>
                    <th className="text-right p-3 font-medium text-xs" style={{ color: "rgba(0,229,255,0.6)" }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr
                      key={i}
                      className="border-b transition-colors hover:bg-[rgba(0,229,255,0.04)]"
                      style={{ borderColor: "rgba(0,229,255,0.07)" }}
                    >
                      <td className="p-3 text-foreground">{t.date}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.action.toLowerCase() === "buy"
                              ? "bg-block-green/15 text-block-green"
                              : "bg-block-red/15 text-block-red"
                          }`}
                        >
                          {t.action}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-foreground">{fmtPrice(t.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Guardrails */}
        <TabsContent value="guardrails" className="mt-4">
          <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
            {guardrails.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(0,229,255,0.55)" }}>
                No warnings — all guardrails passed.
              </p>
            ) : (
              guardrails.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-block-orange shrink-0 mt-0.5" />
                  <span className="text-foreground">{g}</span>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
