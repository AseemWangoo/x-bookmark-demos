import type { InboxMessage } from "../src/lib/types.ts";

/** Fictional inbox. expected labels are hand-written ground truth, not model output. */
export const INBOX: InboxMessage[] = [
  {
    id: "m1",
    channel: "ticket",
    from: "oncall@kiteandco.example",
    subject: "Checkout returns 500 for all EU customers",
    body: "Since 09:12 UTC every EU checkout on Harbor returns HTTP 500. Payments are not captured and the status page is still green. We have a launch today. Please treat this as a production outage.",
    receivedAt: "2026-10-23T09:18:00Z",
    expected: { urgent: true, route: "bug", priority: 5 },
  },
  {
    id: "m2",
    channel: "email",
    from: "billing@brassmill.example",
    subject: "Charged twice for the annual plan",
    body: "Our card ending 4242 was charged $2,400 twice this morning for the Harbor annual plan, invoices H-1044 and H-1045. Please refund the duplicate. Nobody is locked out of the workspace.",
    receivedAt: "2026-10-23T10:02:00Z",
    expected: { urgent: false, route: "billing", priority: 3 },
  },
  {
    id: "m3",
    channel: "email",
    from: "priya.shah@sablefreight.example",
    subject: "40-seat quote and SSO",
    body: "Sable Freight is evaluating Harbor for 40 seats. Procurement needs a quote this week and confirmation that SSO via our identity provider is included before we can raise the purchase order.",
    receivedAt: "2026-10-23T11:24:00Z",
    expected: { urgent: false, route: "sales", priority: 4 },
  },
  {
    id: "m4",
    channel: "email",
    from: "prizes@gift-draw.example",
    subject: "Congratulations, you've won a gift card",
    body: "Congratulations, you've won a $500 gift card. Click here within 30 minutes to claim: http://gift-draw.example/claim. This is not a Harbor customer writing about the product.",
    receivedAt: "2026-10-23T11:41:00Z",
    expected: { urgent: false, route: "spam", priority: 1 },
  },
  {
    id: "m5",
    channel: "ticket",
    from: "sam.ibarra@oddment.example",
    subject: "Dark mode toggle is misaligned in Safari",
    body: "The dark-mode switch in Settings sits about 8px too high in Safari 18 on macOS. Chrome is fine. This is cosmetic. Light theme is an obvious workaround.",
    receivedAt: "2026-10-23T12:05:00Z",
    expected: { urgent: false, route: "bug", priority: 2 },
  },
  {
    id: "m6",
    channel: "email",
    from: "casey.nguyen@paperkite.example",
    subject: "Card declined and service suspends in 2 hours",
    body: "Our renewal card was declined and the banner says Harbor suspends the workspace in 2 hours. We cannot run payroll exports until billing is restored. The card on file was replaced yesterday.",
    receivedAt: "2026-10-23T13:16:00Z",
    expected: { urgent: true, route: "billing", priority: 4 },
  },
  {
    id: "m7",
    channel: "email",
    from: "riley.cho@smallbatch.example",
    subject: "Can we add 3 seats mid-cycle?",
    body: "We are a team of 8 and need 3 more seats before Friday. Do we add them in billing, or does someone on sales have to amend the order? Happy to be invoiced for the difference.",
    receivedAt: "2026-10-23T14:02:00Z",
    expected: { urgent: false, route: "sales", priority: 3 },
  },
  {
    id: "m8",
    channel: "ticket",
    from: "morgan.ellis@fieldglass.example",
    subject: "CSV export is missing rows for one report",
    body: "The weekly revenue CSV is missing about 200 rows for the EU report. The on-screen report is complete, so we are copying from the UI for now. Checkout is unaffected.",
    receivedAt: "2026-10-23T14:48:00Z",
    expected: { urgent: false, route: "bug", priority: 3 },
  },
  {
    id: "m9",
    channel: "email",
    from: "luna.ortiz@rankpilot.example",
    subject: "Quick idea for your SEO",
    body: "Hi, I help B2B teams rank for high-intent keywords. I can send a free audit of the Harbor marketing site. If you are not the right person, point me at whoever buys SEO. There is no product issue.",
    receivedAt: "2026-10-23T15:11:00Z",
    expected: { urgent: false, route: "spam", priority: 1 },
  },
  {
    id: "m10",
    channel: "email",
    from: "devon.park@northwind-guest.example",
    subject: "I can see another tenant's invoices",
    body: "I am logged into our Harbor workspace and /billing/123 shows invoices, tax ids, and the card last-four for a company that is not ours. I did not change anything. This looks like a tenant isolation bug. The word billing is only the URL.",
    receivedAt: "2026-10-23T15:33:00Z",
    expected: { urgent: true, route: "bug", priority: 5 },
  },
];

export function messageById(id: string): InboxMessage | undefined {
  return INBOX.find((message) => message.id === id);
}
