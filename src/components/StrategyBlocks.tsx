import { StrategyNode, getBlockColor, getBlockIcon } from "@/types/strategy";
import { Pencil, Workflow } from "lucide-react";

interface StrategyBlocksProps {
  nodes: StrategyNode[];
  onEditNode: (node: StrategyNode) => void;
}

export function StrategyBlocks({ nodes, onEditNode }: StrategyBlocksProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <Workflow className="h-12 w-12 opacity-30" />
        <p className="text-sm text-center">
          Your strategy blocks will appear here.<br />
          Describe a strategy and click Generate.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 items-center">
      <div className="flex items-center gap-2 mb-4 self-start">
        <Workflow className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Blocks</h2>
        <span className="text-xs text-muted-foreground ml-1">({nodes.length})</span>
      </div>
      {nodes.map((node, i) => (
        <div key={node.id} className="flex flex-col items-center w-full">
          <div
            className={`w-full rounded-xl p-4 ${getBlockColor(node.type)} text-primary-foreground shadow-md animate-fade-in-up`}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{getBlockIcon(node.type)}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{node.type}</p>
                  <p className="text-xs opacity-80 truncate">{node.label}</p>
                </div>
              </div>
              <button
                onClick={() => onEditNode(node)}
                className="shrink-0 p-1.5 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            {Object.keys(node.params).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(node.params).map(([key, val]) => (
                  <span
                    key={key}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-primary-foreground/20 font-medium"
                  >
                    {key}: {String(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
          {i < nodes.length - 1 && <div className="block-connector" />}
        </div>
      ))}
    </div>
  );
}
