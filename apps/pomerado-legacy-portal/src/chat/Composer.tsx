import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Composer({
  pending,
  onSend,
}: {
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const next = text.trim();
        if (next === "") return;
        setText("");
        onSend(next);
      }}
    >
      <div className="flex-1 space-y-1">
        <label htmlFor="ask" className="text-sm">
          Ask the portal
        </label>
        <Input
          id="ask"
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="list overdue invoices"
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="sm:self-end">
        {pending ? "Running…" : "Send"}
      </Button>
    </form>
  );
}
