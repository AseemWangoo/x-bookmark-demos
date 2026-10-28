import { Button } from "@/components/ui/button";

export const EXAMPLES = [
  "list overdue invoices",
  "show open invoices from Acme",
  "list vendors",
  "add a new vendor Globex Supply, ap@globex.example, Hardware, Net 30",
] as const;

export function ExampleChips({ onPick, disabled }: { onPick: (text: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((example) => (
        <Button key={example} type="button" variant="outline" disabled={disabled} onClick={() => onPick(example)}>
          {example}
        </Button>
      ))}
    </div>
  );
}
