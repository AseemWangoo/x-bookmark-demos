import { diffLines } from "diff";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function CodePanel({
  code,
  baseCode,
  reasoning,
  tab,
  onTab,
  streaming,
}: {
  code: string;
  baseCode: string;
  reasoning: string;
  tab: string;
  onTab: (value: string) => void;
  streaming: boolean;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Tabs value={tab} onValueChange={onTab} className="min-h-0 flex-1 gap-0">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <TabsList>
          <TabsTrigger value="code" data-testid="tab-code">
            Code
          </TabsTrigger>
          <TabsTrigger value="diff" data-testid="tab-diff">
            Diff
          </TabsTrigger>
          <TabsTrigger value="reasoning" data-testid="tab-reasoning">
            Reasoning
          </TabsTrigger>
        </TabsList>
        <Button type="button" size="sm" variant="outline" data-testid="copy-code" disabled={!code} onClick={() => void copy()}>
          Copy
        </Button>
      </div>
      <TabsContent value="code" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <CodeView code={code} placeholder={streaming ? "Waiting for code…" : "No scene yet."} />
        </ScrollArea>
      </TabsContent>
      <TabsContent value="diff" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <DiffView before={baseCode} after={code} />
        </ScrollArea>
      </TabsContent>
      <TabsContent value="reasoning" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <pre className="px-3 py-2 font-mono text-[12px] leading-5 whitespace-pre-wrap text-muted-foreground">
            {reasoning || "Reasoning shows up here. It stays collapsed until you open this tab."}
          </pre>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

function CodeView({ code, placeholder }: { code: string; placeholder: string }) {
  if (!code) return <p className="px-3 py-2 text-sm text-muted-foreground">{placeholder}</p>;
  const lines = code.split("\n");
  return (
    <pre className="px-3 py-2 font-mono text-[12px] leading-5" data-testid="code-view">
      {lines.map((line, index) => (
        <div key={index} className="flex">
          <span className="w-8 shrink-0 pr-3 text-right text-muted-foreground select-none">{index + 1}</span>
          <span className="whitespace-pre">{line || " "}</span>
        </div>
      ))}
    </pre>
  );
}

function DiffView({ before, after }: { before: string; after: string }) {
  if (!after) return <p className="px-3 py-2 text-sm text-muted-foreground">No diff yet.</p>;
  const parts = diffLines(before, after);
  let row = 0;
  return (
    <pre className="px-3 py-2 font-mono text-[12px] leading-5" data-testid="diff-view">
      {parts.map((part) => {
        const lines = part.value.replace(/\n$/, "").split("\n");
        const prefix = part.added ? "+" : part.removed ? "−" : " ";
        const color = part.added
          ? "bg-emerald-100 text-emerald-950"
          : part.removed
            ? "bg-rose-100 text-rose-950"
            : "";
        return lines.map((line) => {
          row += 1;
          return (
            <div key={row} className={color}>
              {prefix} {line}
            </div>
          );
        });
      })}
    </pre>
  );
}
