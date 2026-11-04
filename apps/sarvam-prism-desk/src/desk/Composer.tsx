import { Textarea } from "@/components/ui/textarea";

export function Composer({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Textarea
      data-testid="composer"
      value={value}
      aria-label="Customer message"
      placeholder="Type a customer message. Routing starts after a short pause."
      rows={2}
      className="min-h-12 max-h-14 resize-none field-sizing-fixed py-1.5 text-sm"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
