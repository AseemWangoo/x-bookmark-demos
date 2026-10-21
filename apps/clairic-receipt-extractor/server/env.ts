export type Credentials = {
  accountId: string;
  token: string;
};

export function readCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Credentials | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
  const token = (env.CLOUDFLARE_API_TOKEN ?? env.CLOUDFLARE_AUTH_TOKEN)?.trim() ?? "";
  if (!accountId || !token) return null;
  return { accountId, token };
}

export function scrubSecrets(message: string, secrets: string[]): string {
  let scrubbed = message;
  for (const secret of secrets) {
    if (secret.length < 4) continue;
    scrubbed = scrubbed.split(secret).join("[redacted]");
  }
  return scrubbed.slice(0, 400);
}
