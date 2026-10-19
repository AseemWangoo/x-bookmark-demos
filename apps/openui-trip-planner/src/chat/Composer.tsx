import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function Composer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <form
      className="mx-auto flex w-full max-w-5xl gap-2 px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text || busy) return;
        setDraft("");
        onSend(text);
      }}
    >
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Where should we go?"
        aria-label="Trip request"
        disabled={busy}
        autoFocus
      />
      <Button type="submit" disabled={busy || draft.trim().length === 0}>
        Plan
      </Button>
    </form>
  );
}
