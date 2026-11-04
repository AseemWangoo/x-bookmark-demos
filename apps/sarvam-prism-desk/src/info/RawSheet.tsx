import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function RawSheet({ raw }: { raw: { request: unknown; response: unknown } | null }) {
  return (
    <Sheet>
      <SheetTrigger data-testid="raw-json" render={<Button variant="outline" size="sm" />}>
        Raw JSON
      </SheetTrigger>
      <SheetContent data-testid="raw-sheet" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Last request</SheetTitle>
          <SheetDescription>The body sent and the response replayed or returned. No API key.</SheetDescription>
        </SheetHeader>
        <pre className="overflow-auto px-4 pb-4 text-[11px] leading-snug">
          {raw ? JSON.stringify(raw, null, 2) : "No request yet."}
        </pre>
      </SheetContent>
    </Sheet>
  );
}
