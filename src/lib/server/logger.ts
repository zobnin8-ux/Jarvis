function formatLine(scope: string, message: string): string {
  return `[jarvis][${scope}] ${new Date().toISOString()} ${message}`;
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/sk_ant_[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/private_key["']?\s*[:=]\s*["'][^"']+["']/gi, "private_key=[redacted]")
    .replace(/token=[^&\s]+/gi, "token=[redacted]")
    .replace(/appid=[^&\s]+/gi, "appid=[redacted]");
}

export function logError(scope: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(formatLine(scope, sanitizeMessage(err.message)));
    if (err.stack) {
      console.error(formatLine(scope, sanitizeMessage(err.stack)));
    }
    return;
  }
  console.error(formatLine(scope, sanitizeMessage(String(err))));
}

export function logWarn(scope: string, msg: string): void {
  console.warn(formatLine(scope, sanitizeMessage(msg)));
}
