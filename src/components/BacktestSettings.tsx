import { BacktestParams } from "@/types/strategy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Play, Loader2, Shield } from "lucide-react";

interface BacktestSettingsProps {
  params: BacktestParams;
  onChange: (params: BacktestParams) => void;
  onRun: () => void;
  isLoading: boolean;
  hasGraph: boolean;
}

export function BacktestSettings({ params, onChange, onRun, isLoading, hasGraph }: BacktestSettingsProps) {
  const update = (key: keyof BacktestParams, value: string | number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Backtest</h2>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Symbol">
          <Input
            value={params.symbol}
            onChange={(e) => update("symbol", e.target.value.toUpperCase())}
            className="rounded-lg bg-card border-border"
          />
        </Field>
        <Field label="Start Date">
          <Input
            type="date"
            value={params.start}
            onChange={(e) => update("start", e.target.value)}
            className="rounded-lg bg-card border-border"
          />
        </Field>
        <Field label="End Date">
          <Input
            type="date"
            value={params.end}
            onChange={(e) => update("end", e.target.value)}
            className="rounded-lg bg-card border-border"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fee (bps)">
            <Input
              type="number"
              value={params.fee_bps}
              onChange={(e) => update("fee_bps", Number(e.target.value))}
              className="rounded-lg bg-card border-border"
            />
          </Field>
          <Field label="Slippage (bps)">
            <Input
              type="number"
              value={params.slippage_bps}
              onChange={(e) => update("slippage_bps", Number(e.target.value))}
              className="rounded-lg bg-card border-border"
            />
          </Field>
        </div>
        <Field label="Initial Capital">
          <Input
            type="number"
            value={params.initial_capital}
            onChange={(e) => update("initial_capital", Number(e.target.value))}
            className="rounded-lg bg-card border-border"
          />
        </Field>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-xs">
        <Shield className="h-3.5 w-3.5" />
        Paper trading only
      </div>

      <Button
        onClick={onRun}
        disabled={!hasGraph || isLoading}
        className="w-full rounded-lg font-semibold"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        Run Backtest
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
