import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ArrowUp } from "lucide-react";

interface StrategyInputProps {
  text: string;
  onTextChange: (text: string) => void;
  onGenerate: (text: string) => void;
  isLoading: boolean;
  /**
   * chat    – full-width pill input with inline send button (hero screen)
   * compact – sidebar textarea + button below
   */
  mode?: "chat" | "compact";
}

export function StrategyInput({
  text,
  onTextChange,
  onGenerate,
  isLoading,
  mode = "compact",
}: StrategyInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow in chat mode
  useEffect(() => {
    if (mode === "chat" && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 180) + "px";
    }
  }, [text, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mode === "chat") {
      // Enter submits; Shift+Enter inserts a newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (text.trim() && !isLoading) onGenerate(text);
      }
    } else {
      // Compact: ⌘/Ctrl+Enter submits
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim() && !isLoading) {
        onGenerate(text);
      }
    }
  };

  const canSend = text.trim().length > 0 && !isLoading;

  /* ── Chat mode ─────────────────────────────────────────────────────────── */
  if (mode === "chat") {
    return (
      <div
        className="relative rounded-2xl transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_rgba(0,229,255,0.32),0_0_32px_rgba(0,229,255,0.10)]"
        style={{
          background: "rgba(8, 4, 26, 0.82)",
          border: "1px solid rgba(0, 229, 255, 0.20)",
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Describe your trading strategy in plain English…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
          style={{
            padding: "16px 56px 16px 18px",
            minHeight: "56px",
            maxHeight: "180px",
          }}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Send button */}
        <button
          onClick={() => canSend && onGenerate(text)}
          disabled={!canSend}
          className="absolute right-3 bottom-3 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: canSend
              ? "linear-gradient(135deg, #00e5ff 0%, #2979ff 55%, #7c3aed 100%)"
              : "rgba(255,255,255,0.06)",
            boxShadow: canSend ? "0 0 18px rgba(0,229,255,0.40)" : "none",
            border: canSend ? "none" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(255,255,255,0.7)" }} />
          ) : (
            <ArrowUp className="h-4 w-4 text-white" />
          )}
        </button>
      </div>
    );
  }

  /* ── Compact / sidebar mode ────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3">
      <textarea
        rows={3}
        placeholder="e.g. Buy GLD when the 20-day moving average crosses above the 50-day moving average…"
        className="w-full resize-none rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:shadow-[0_0_0_1px_rgba(0,229,255,0.35),0_0_20px_rgba(0,229,255,0.10)]"
        style={{
          background: "rgba(0, 229, 255, 0.03)",
          border: "1px solid rgba(0, 229, 255, 0.16)",
          padding: "10px 12px",
          minHeight: "90px",
        }}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        onClick={() => onGenerate(text)}
        disabled={!canSend}
        className="w-full rounded-lg font-semibold"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {isLoading ? "Generating…" : "Regenerate"}
      </Button>
    </div>
  );
}
