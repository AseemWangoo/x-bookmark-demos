import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, TERMS } from "../../portal/seed.ts";
import type { VendorInput } from "@/lib/types";

export function ConfirmWrite({
  initial,
  pending,
  onRun,
}: {
  initial: VendorInput;
  pending: boolean;
  onRun: (input: VendorInput) => void;
}) {
  const [input, setInput] = useState(initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm add_vendor</CardTitle>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onRun(input);
        }}
      >
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="vendor-name">Name</label>
            <Input
              id="vendor-name"
              name="name"
              value={input.name}
              onChange={(event) => setInput({ ...input, name: event.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="vendor-email">Email</label>
            <Input
              id="vendor-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={input.email}
              onChange={(event) => setInput({ ...input, email: event.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="vendor-category">Category</label>
            <Select
              value={input.category}
              onValueChange={(category) => setInput({ ...input, category })}
            >
              <SelectTrigger id="vendor-category" className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-1">
            <legend>Payment terms</legend>
            <div className="flex flex-wrap gap-3">
              {TERMS.map((terms) => (
                <label key={terms} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="terms"
                    value={terms}
                    checked={input.terms === terms}
                    onChange={() => setInput({ ...input, terms })}
                    required
                  />
                  {terms}
                </label>
              ))}
            </div>
          </fieldset>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Running…" : "Run add_vendor"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
