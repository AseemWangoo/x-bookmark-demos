import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OpenWeightsCard() {
  return (
    <Card size="sm" data-testid="open-weights">
      <CardHeader>
        <CardTitle>Open weights</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-[11px] leading-snug text-muted-foreground">
        <p>
          <a
            className="font-medium text-foreground underline"
            href="https://huggingface.co/sarvamai/prism"
            target="_blank"
            rel="noreferrer"
          >
            sarvamai/prism
          </a>{" "}
          is Apache-2.0. About 106 GB, one FP8 GPU with ~120 GB (B200 or H200), loaded with prism.py.
        </p>
        <p>
          This desk calls the hosted API. The self-hosted format uses yes_no and a score level; the hosted
          API uses noul, legend, and confidence.
        </p>
        <p>Claimed average 71.8 (Indian-language benchmark 82.5). Shown as Sarvam’s claim, not a measurement from this app.</p>
      </CardContent>
    </Card>
  );
}
