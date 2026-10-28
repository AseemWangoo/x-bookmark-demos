export interface ToolCaller {
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface PendingQuestion {
  id: string;
  type: string;
  prompt?: string;
  fields?: string;
}

export interface JobView {
  job_id: string;
  status: "running" | "input_required" | "completed" | "failed" | "cancelled";
  output?: unknown;
  pending_input?: {
    id: string;
    questions?: PendingQuestion[];
  };
  possible_commit?: boolean;
  error?: string;
}

export type Answer =
  | { ok: true; value: unknown; note: string }
  | { ok: false; message: string };

export interface Exchange {
  output: unknown;
  trail: string[];
  possibleCommit: boolean;
  error?: string;
  arguments: Record<string, unknown>;
}

export function isJobView(value: unknown): value is JobView {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.job_id === "string" && typeof record.status === "string";
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{1,200}$/;

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function assertIdempotencyKey(key: string): void {
  if (!IDEMPOTENCY_KEY.test(key)) {
    throw new Error("idempotency_key must match ^[A-Za-z0-9_-]{1,200}$");
  }
}

/**
 * Walks a Pomerado tool result. A value with `job_id` is a job; anything else is the output.
 * Failed jobs are returned once and never submitted again.
 */
export async function followJob(
  caller: ToolCaller,
  tool: string,
  args: Record<string, unknown>,
  answer: (question: PendingQuestion) => Answer | Promise<Answer>,
): Promise<Exchange> {
  const trail: string[] = [];
  let payload = await caller.call(tool, args);
  for (let step = 0; step < 40; step++) {
    if (!isJobView(payload)) {
      trail.push("completed");
      return { output: payload, trail, possibleCommit: false, arguments: args };
    }
    switch (payload.status) {
      case "completed":
        trail.push("completed");
        return { output: payload.output, trail, possibleCommit: false, arguments: args };
      case "failed":
      case "cancelled": {
        trail.push(payload.status);
        const possibleCommit = payload.possible_commit === true;
        const base = payload.error ?? `Job ${payload.status}.`;
        return {
          output: payload.output ?? null,
          trail,
          possibleCommit,
          arguments: args,
          error: possibleCommit
            ? `${base} It may have been created; list vendors to check.`
            : base,
        };
      }
      case "running":
        payload = await caller.call("get_job", { job_id: payload.job_id, wait_seconds: 30 });
        break;
      case "input_required": {
        const pending = payload.pending_input;
        const questions = pending?.questions ?? [];
        if (!pending || questions.length === 0) {
          return {
            output: null,
            trail,
            possibleCommit: false,
            arguments: args,
            error: "Pomerado asked for input without a question.",
          };
        }
        const answers: Record<string, unknown> = {};
        const notes: string[] = [];
        for (const question of questions) {
          const decision = await answer(question);
          if (!decision.ok) {
            trail.push(`input_required: ${question.type}`);
            return {
              output: null,
              trail,
              possibleCommit: false,
              arguments: args,
              error: decision.message,
            };
          }
          answers[question.id] = decision.value;
          notes.push(decision.note);
        }
        for (const question of questions) {
          trail.push(`input_required: ${question.type === "credential" ? "login" : question.type}`);
        }
        trail.push(...notes);
        payload = await caller.call("provide_input", {
          job_id: payload.job_id,
          request_id: pending.id,
          answers,
        });
        break;
      }
      default: {
        const status: never = payload.status;
        return {
          output: null,
          trail,
          possibleCommit: false,
          arguments: args,
          error: `Unknown job status: ${String(status)}`,
        };
      }
    }
  }
  return {
    output: null,
    trail,
    possibleCommit: false,
    arguments: args,
    error: "Job did not finish.",
  };
}

export interface CredentialAnswerInput {
  username: string;
  password: string;
}

export function decideRunAnswer(question: PendingQuestion, creds: CredentialAnswerInput): Answer {
  if (question.type === "credential" && question.fields === "username_password") {
    return {
      ok: true,
      value: { username: creds.username, password: creds.password, saveLogin: false },
      note: "answered with portal demo credentials",
    };
  }
  if (question.type === "credential" && question.fields === "password") {
    return {
      ok: true,
      value: { password: creds.password, saveLogin: false },
      note: "answered with portal demo credentials",
    };
  }
  const prompt = question.prompt ?? question.type;
  return { ok: false, message: `Pomerado asked: ${prompt}` };
}

export function isSwitchToWrite(question: PendingQuestion): boolean {
  if (question.type !== "confirm") return false;
  const prompt = (question.prompt ?? "").toLowerCase();
  return prompt.includes("write") && /switch|effect|change/.test(prompt);
}

/** Mint-time policy: login is automatic, a switch-to-write confirm is refused, anything else waits for a person. */
export function decideMintAnswer(question: PendingQuestion, creds: CredentialAnswerInput): Answer {
  if (question.type === "credential") return decideRunAnswer(question, creds);
  if (isSwitchToWrite(question)) {
    return { ok: true, value: { confirmed: false }, note: "refused switch to write" };
  }
  return { ok: false, message: `needs human: ${question.prompt ?? question.type}` };
}
