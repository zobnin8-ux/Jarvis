"use client";

import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import type { GmailData, GmailMessage } from "@/types/modules";

interface MailTabProps {
  data: GmailData | null;
  loading: boolean;
  unavailableService: string | null;
}

export function MailTab({ data, loading, unavailableService }: MailTabProps) {
  if (unavailableService) {
    return <ServiceUnavailablePanel service={unavailableService} />;
  }

  if (loading && !data) {
    return <div className="text-sm text-white/30">Syncing inbox...</div>;
  }

  if (!data) return null;

  const unreadLabel =
    data.unreadCount > 99 ? "99+ unread" : `${data.unreadCount} unread`;

  return (
    <>
      <div className="mail-tab-header">
        <div className="mail-tab-inbox-label">INBOX</div>
        {data.unreadCount > 0 && (
          <div className="mail-tab-unread-count">{unreadLabel}</div>
        )}
      </div>

      {data.demo && (
        <div className="mail-tab-demo-hint">
          Demo inbox — add Gmail OAuth to .env.local
        </div>
      )}

      {data.messages.length === 0 ? (
        <div className="mail-tab-empty">Inbox clear</div>
      ) : (
        <ul className="mail-list">
          {data.messages.map((message) => (
            <MailRow key={message.id} message={message} />
          ))}
        </ul>
      )}

      <a
        className="mail-open-gmail"
        href="https://mail.google.com/mail/u/0/#inbox"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Gmail →
      </a>
    </>
  );
}

function MailRow({ message }: { message: GmailMessage }) {
  return (
    <li className={`mail-row${message.unread ? " is-unread" : ""}`}>
      <a
        className="mail-row-link"
        href={message.webUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={message.subject}
      >
        <span className="mail-row-rail" aria-hidden>
          <span className={`mail-row-dot${message.unread ? " is-unread" : ""}`} />
        </span>
        <span className="mail-row-body">
          <span className="mail-row-top">
            <span className="mail-row-time">{message.time}</span>
            <span className="mail-row-from">{message.from}</span>
          </span>
          <span className="mail-row-subject">{message.subject}</span>
        </span>
      </a>
    </li>
  );
}
