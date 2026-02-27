import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Buy GLD when 20-day MA crosses above 50-day MA, sell on reverse",
  "RSI oversold buy on SPY with 2% stop loss",
  "Mean reversion: buy when price drops 3% below 20-day MA",
];

interface StrategyInputProps {
  onGenerate: (text: string) => void;
  isLoading: boolean;
}

export function StrategyInput({ onGenerate, isLoading }: StrategyInputProps) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Strategy</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Describe your trading strategy in plain English.
      </p>
      <Textarea
        placeholder="e.g. Buy GLD when the 20-day moving average crosses above the 50-day moving average..."
        className="flex-1 min-h-[180px] resize-none rounded-lg bg-card border-border text-foreground placeholder:text-muted-foreground"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setText(prompt)}
            className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors truncate max-w-full"
          >
            {prompt.length > 50 ? prompt.slice(0, 50) + "…" : prompt}
          </button>
        ))}
      </div>
      <Button
        onClick={() => onGenerate(text)}
        disabled={!text.trim() || isLoading}
        className="w-full rounded-lg font-semibold"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Generate Blocks
      </Button>
    </div>
  );
}
