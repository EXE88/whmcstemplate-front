"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AttachmentPicker } from "@/components/panel/attachment-picker";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/misc";
import { ErrorBanner, ErrorState, SkeletonCard } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { supportApi } from "@/lib/api/endpoints";
import type { TicketAttachment } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useCloseTicket, useReplyToTicket, useTicket } from "@/lib/query/hooks";
import { cn } from "@/lib/utils/cn";

const PRIORITY_TONE = { High: "danger", Medium: "warning", Low: "neutral" } as const;

/**
 * Ticket conversation.
 *
 * Laid out as a chat rather than a table: staff replies and the customer's own
 * messages sit on opposite sides, which makes a long thread scannable at a
 * glance. Attachments have no public URL — each one downloads through the
 * authenticated endpoint as a blob, because that path is where the ownership
 * check lives.
 */
export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, ts, locale } = useI18n();
  const toast = useToast();

  const ticket = useTicket(id);
  const reply = useReplyToTicket(id);
  const close = useCloseTicket(id);

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [closing, setClosing] = useState(false);

  if (ticket.isPending) return <SkeletonCard rows={8} />;
  if (ticket.isError) {
    return (
      <Card>
        <ErrorState error={ticket.error} onRetry={() => ticket.refetch()} />
      </Card>
    );
  }

  const data = ticket.data;
  const isClosed = data.status === "Closed";

  const sendReply = (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 2) return;

    const form = new FormData();
    form.set("message", message.trim());
    for (const file of files) form.append("attachments", file);

    reply.mutate(form, {
      onSuccess: () => {
        setMessage("");
        setFiles([]);
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-chat-left-text"
        title={data.subject}
        description={`#${data.ticket_number} · ${data.department}`}
        action={
          <>
            <ButtonLink href="/panel/tickets" variant="ghost" size="sm" icon="bi-arrow-right">
              {t("common.back")}
            </ButtonLink>
            {!isClosed ? (
              <Button
                variant="ghost"
                size="sm"
                icon="bi-check2-circle"
                onClick={() => setClosing(true)}
              >
                {t("tickets.close")}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={data.status} />
        <Badge tone={PRIORITY_TONE[data.priority as keyof typeof PRIORITY_TONE] ?? "neutral"}>
          {ts("priority", data.priority)}
        </Badge>
        <span className="text-faint text-xs">{formatDate(data.created_at, locale, { withTime: true })}</span>
      </div>

      <Card>
        <CardHeader icon="bi-chat-dots" title={t("tickets.conversation")} />
        <CardBody className="space-y-4 pt-4">
          {data.attachments?.length ? (
            <AttachmentList ticketId={id} attachments={data.attachments} />
          ) : null}

          {data.replies?.length ? (
            data.replies.map((item, index) => (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.03 }}
                className={cn(
                  "flex gap-3",
                  item.author_type === "staff" ? "" : "flex-row-reverse",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-xs font-bold",
                    item.author_type === "staff"
                      ? "bg-accent-500/15 text-accent-600 dark:text-accent-300"
                      : "bg-brand-500/15 text-brand-600 dark:text-brand-300",
                  )}
                  aria-hidden
                >
                  <i className={`bi ${item.author_type === "staff" ? "bi-headset" : "bi-person"}`} />
                </span>

                <div
                  className={cn(
                    "min-w-0 max-w-[85%] rounded-2xl p-4",
                    item.author_type === "staff"
                      ? "bg-[var(--field-bg)]"
                      : "bg-brand-500/10 border-brand-500/20 border",
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold">
                      {item.author_type === "staff" ? t("tickets.staff") : t("tickets.you")}
                    </span>
                    <span className="text-faint text-xs">
                      {formatDate(item.created_at, locale, { withTime: true })}
                    </span>
                  </div>
                  <p className="text-sm leading-7 whitespace-pre-wrap break-words">{item.message}</p>
                  {item.attachments?.length ? (
                    <div className="mt-3">
                      <AttachmentList ticketId={id} attachments={item.attachments} compact />
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-faint py-6 text-center text-sm">{t("empty.title")}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon="bi-reply" title={t("tickets.reply")} />
        <CardBody className="pt-4">
          <form onSubmit={sendReply} className="space-y-4">
            {reply.isError ? <ErrorBanner error={reply.error} /> : null}

            <Textarea
              label={t("tickets.message")}
              placeholder={t("tickets.replyPlaceholder")}
              rows={6}
              maxLength={20000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <AttachmentPicker files={files} onChange={setFiles} disabled={reply.isPending} />

            <Button
              type="submit"
              icon="bi-send"
              loading={reply.isPending}
              disabled={message.trim().length < 2}
            >
              {t("tickets.sendReply")}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        icon="bi-check2-circle"
        size="sm"
        title={t("tickets.close")}
        description={t("tickets.closeConfirm")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosing(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              loading={close.isPending}
              onClick={() =>
                close.mutate(undefined, {
                  onSuccess: () => {
                    setClosing(false);
                    toast.success(t("tickets.closed"));
                  },
                })
              }
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        {close.isError ? <ErrorBanner error={close.error} /> : null}
      </Modal>
    </div>
  );
}

function AttachmentList({
  ticketId,
  attachments,
  compact = false,
}: {
  ticketId: number;
  attachments: TicketAttachment[];
  compact?: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "" : "border-b border-[var(--field-border)] pb-4")}>
      {attachments.map((attachment) => {
        const key = `${attachment.type}-${attachment.related_id}-${attachment.index}`;
        return (
          <button
            key={key}
            type="button"
            disabled={busy === key}
            onClick={async () => {
              setBusy(key);
              try {
                await supportApi.downloadAttachment(ticketId, attachment);
              } catch {
                toast.error(t("error.generic"));
              } finally {
                setBusy(null);
              }
            }}
            className="glass hover:border-brand-400/50 flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors disabled:opacity-60"
          >
            <i
              className={cn("bi shrink-0", busy === key ? "bi-arrow-repeat animate-spin" : "bi-download")}
              aria-hidden
            />
            <span className="truncate">{attachment.filename}</span>
          </button>
        );
      })}
    </div>
  );
}
