import { useState, useEffect } from "react";
import { StrategyNode, getBlockColor, getBlockIcon } from "@/types/strategy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface BlockEditDrawerProps {
  node: StrategyNode | null;
  open: boolean;
  onClose: () => void;
  onSave: (node: StrategyNode) => void;
}

export function BlockEditDrawer({ node, open, onClose, onSave }: BlockEditDrawerProps) {
  const [params, setParams] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    if (node) setParams({ ...node.params });
  }, [node]);

  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-card border-border">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${getBlockColor(node.type)} text-primary-foreground text-sm`}
            >
              {getBlockIcon(node.type)}
            </span>
            {node.type}
          </SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{node.label}</p>
        <div className="flex flex-col gap-4">
          {Object.entries(params).map(([key, val]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium capitalize text-muted-foreground">
                {key.replace(/_/g, " ")}
              </Label>
              <Input
                value={String(val)}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    [key]: isNaN(Number(e.target.value))
                      ? e.target.value
                      : Number(e.target.value),
                  }))
                }
                className="rounded-lg bg-secondary border-border"
              />
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Button
            className="w-full rounded-lg"
            onClick={() => {
              onSave({ ...node, params });
              onClose();
            }}
          >
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
