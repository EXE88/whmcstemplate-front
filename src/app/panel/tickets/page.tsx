"use client";

import Link from "next/link";
import { useState } from "react";
import { ListShell } from "@/components/panel/list-shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import type { TicketStatus } from "@/lib/api/types";
import { formatRelative } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useTickets } from "@/lib/query/hooks";

const FILTERS: Array<TicketStatus | ""> = ["", "Open", "Answered", "Customer-Reply", "Closed"];

const PRIORITY_TONE = { High: "danger", Medium: "warning", Low: "neutral" } as const;

export default function TicketsPage() {
  const { t, ts, locale } = useI18n();
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(1);
  const query = useTickets(page, status);

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-life-preserver"
        title={t("tickets.title")}
        action={
          <ButtonLink href="/panel/tickets/new" size="sm" icon="bi-plus-lg">
            {t("tickets.new")}
          </ButtonLink>
        }
      />

      <Segmented
        ariaLabel={t("common.filter")}
        size="sm"
        value={status}
        onChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        options={FILTERS.map((value) => ({
          value,
          label: value ? ts("status", value) : t("common.all"),
        }))}
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        empty={{
          icon: "bi-life-preserver",
          title: t("tickets.empty"),
          action: (
            <ButtonLink href="/panel/tickets/new" icon="bi-plus-lg">
              {t("tickets.new")}
            </ButtonLink>
          ),
        }}
      >
        {(tickets) => (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/panel/tickets/${ticket.id}`} className="block">
                  <Card className="hover:border-brand-400/50 flex flex-wrap items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5">
                    <span className="bg-accent-500/12 text-accent-600 dark:text-accent-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                      <i className="bi bi-chat-left-text text-lg" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{ticket.subject}</p>
                      <p className="text-faint truncate text-xs">
                        #{ticket.ticket_number} · {ticket.department}
                      </p>
                    </div>

                    <div className="text-end">
                      <p className="text-faint text-xs">{t("tickets.lastReply")}</p>
                      <p className="text-sm">{formatRelative(ticket.updated_at, locale)}</p>
                    </div>

                    <Badge tone={PRIORITY_TONE[ticket.priority as keyof typeof PRIORITY_TONE] ?? "neutral"}>
                      {ts("priority", ticket.priority)}
                    </Badge>
                    <StatusBadge status={ticket.status} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ListShell>
    </div>
  );
}
