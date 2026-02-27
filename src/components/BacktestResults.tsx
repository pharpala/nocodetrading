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

export function BacktestResultsPanel({ results }: BacktestResultsProps) {
  const mcKeys = results.monte_carlo.length > 0
    ? Object.keys(results.monte_carlo[0]).filter((k) => k !== "date")
    : [];

  return (
    <div className="mt-6 animate-fade-in-up">
      <Tabs defaultValue="equity" className="w-full">
        <TabsList className="w-full bg-secondary rounded-lg h-10 p-1">
          <TabsTrigger value="equity" className="text-xs gap-1 rounded-md data-[state=active]:bg-card">
            <TrendingUp className="h-3.5 w-3.5" /> Equity
          </TabsTrigger>
          <TabsTrigger value="drawdown" className="text-xs gap-1 rounded-md data-[state=active]:bg-card">
            <TrendingDown className="h-3.5 w-3.5" /> Drawdown
          </TabsTrigger>
          <TabsTrigger value="montecarlo" className="text-xs gap-1 rounded-md data-[state=active]:bg-card">
            <BarChart3 className="h-3.5 w-3.5" /> Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="trades" className="text-xs gap-1 rounded-md data-[state=active]:bg-card">
            <Table2 className="h-3.5 w-3.5" /> Trades
          </TabsTrigger>
          <TabsTrigger value="guardrails" className="text-xs gap-1 rounded-md data-[state=active]:bg-card">
            <ShieldAlert className="h-3.5 w-3.5" /> Guardrails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equity" className="mt-4">
          <div className="h-[300px] glass-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results.equity_curve}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(211 100% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(211 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="value" stroke="hsl(211 100% 50%)" fill="url(#eqGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="drawdown" className="mt-4">
          <div className="h-[300px] glass-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results.drawdown}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="value" stroke="hsl(0 72% 51%)" fill="url(#ddGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="montecarlo" className="mt-4">
          <div className="h-[300px] glass-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results.monte_carlo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220 10% 46%)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                {mcKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={`hsl(${211 + i * 30} 70% 55%)`}
                    strokeWidth={1}
                    dot={false}
                    opacity={0.6}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="mt-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Action</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {results.trades.map((t, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-foreground">{t.date}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.action.toLowerCase() === "buy"
                              ? "bg-block-green/15 text-block-green"
                              : "bg-block-red/15 text-block-red"
                          }`}
                        >
                          {t.action}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-foreground">${t.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guardrails" className="mt-4">
          <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
            {results.guardrails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No warnings — all guardrails passed.</p>
            ) : (
              results.guardrails.map((g, i) => (
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
