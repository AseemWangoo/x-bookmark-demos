import type { InboxMessage } from "../src/lib/types.ts";

export function renderMessage(message: InboxMessage): string {
  return [
    `id: ${message.id}`,
    `channel: ${message.channel}`,
    `from: ${message.from}`,
    `received: ${message.receivedAt}`,
    `subject: ${message.subject}`,
    "body:",
    message.body,
  ].join("\n");
}

export function renderPackedInput(messages: InboxMessage[]): string {
  return messages.map((message) => renderMessage(message)).join("\n---\n");
}
