import { google, type gmail_v1 } from "googleapis";
import type { GmailData, GmailMessage } from "@/types/modules";
import { loadGoogleOAuthWebCredentials } from "@/lib/server/googleOAuthCredentials";
import { logError } from "@/lib/server/logger";

const INBOX_QUERY = "is:unread in:inbox";
const LIST_MAX = 7;

export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN
  );
}

function createGmailClient(): gmail_v1.Gmail | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}

function formatFromHeader(raw: string): string {
  const named = raw.match(/^"?([^"<]+)"?\s*</);
  if (named?.[1]) return named[1].trim();
  const email = raw.match(/<([^>]+)>/);
  if (email?.[1]) return email[1].split("@")[0] ?? raw;
  return raw.split("@")[0] ?? raw;
}

function formatMailTime(internalDate: number): string {
  const date = new Date(internalDate);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildWebUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
}

function mapMessage(msg: gmail_v1.Schema$Message): GmailMessage | null {
  if (!msg.id || !msg.threadId) return null;

  const headers = msg.payload?.headers ?? [];
  const headerMap = new Map(
    headers.map((h) => [h.name?.toLowerCase() ?? "", h.value ?? ""])
  );
  const fromRaw = headerMap.get("from") ?? "Unknown";
  const subject = headerMap.get("subject")?.trim() || "(no subject)";
  const internalDate = Number(msg.internalDate ?? Date.now());

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: formatFromHeader(fromRaw),
    fromRaw,
    subject,
    snippet: (msg.snippet ?? "").replace(/\s+/g, " ").trim(),
    time: formatMailTime(internalDate),
    internalDate,
    unread: msg.labelIds?.includes("UNREAD") ?? true,
    webUrl: buildWebUrl(msg.threadId),
  };
}

export function buildDemoGmailData(): GmailData {
  const now = Date.now();
  return {
    unreadCount: 2,
    messages: [
      {
        id: "demo-1",
        threadId: "demo-thread-1",
        from: "Stripe",
        fromRaw: "Stripe <billing@stripe.com>",
        subject: "Payment received",
        snippet: "Your payment of $29.00 was successful.",
        time: formatMailTime(now - 45 * 60_000),
        internalDate: now - 45 * 60_000,
        unread: true,
        webUrl: "https://mail.google.com/mail/u/0/#inbox",
      },
      {
        id: "demo-2",
        threadId: "demo-thread-2",
        from: "GitHub",
        fromRaw: "GitHub <notifications@github.com>",
        subject: "[Jarvis] PR review requested",
        snippet: "A review has been requested on your pull request.",
        time: formatMailTime(now - 3 * 60 * 60_000),
        internalDate: now - 3 * 60 * 60_000,
        unread: true,
        webUrl: "https://mail.google.com/mail/u/0/#inbox",
      },
    ],
    generatedAt: new Date().toISOString(),
    demo: true,
  };
}

export type GmailSnapshotResult =
  | { kind: "live"; data: GmailData }
  | { kind: "demo"; data: GmailData }
  | { kind: "unavailable" };

export async function resolveGmailSnapshot(): Promise<GmailSnapshotResult> {
  if (!isGmailConfigured()) {
    return { kind: "demo", data: buildDemoGmailData() };
  }

  const gmail = createGmailClient();
  if (!gmail) {
    return { kind: "unavailable" };
  }

  try {
    const [labelRes, listRes] = await Promise.all([
      gmail.users.labels.get({ userId: "me", id: "INBOX" }),
      gmail.users.messages.list({
        userId: "me",
        q: INBOX_QUERY,
        maxResults: LIST_MAX,
      }),
    ]);

    const unreadCount = labelRes.data.messagesUnread ?? 0;
    const ids = listRes.data.messages?.map((m) => m.id).filter(Boolean) ?? [];

    const details = await Promise.all(
      ids.map((id) =>
        gmail.users.messages.get({
          userId: "me",
          id: id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        })
      )
    );

    const messages = details
      .map((res) => mapMessage(res.data))
      .filter((m): m is GmailMessage => m !== null)
      .sort((a, b) => b.internalDate - a.internalDate);

    return {
      kind: "live",
      data: {
        unreadCount,
        messages,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    logError("gmail.fetch", err);
    return { kind: "unavailable" };
  }
}
