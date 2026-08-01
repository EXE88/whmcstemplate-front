"use client";

import Link from "next/link";
import { useState } from "react";
import { ListShell } from "@/components/panel/list-shell";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Money, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import type { OrderStatus } from "@/lib/api/types";
import { formatDate, localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useOrders } from "@/lib/query/hooks";

const FILTERS: Array<OrderStatus | ""> = ["", "Pending", "Active", "Cancelled", "Fraud"];

export default function OrdersPage() {
  const { t, ts, locale } = useI18n();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const query = useOrders(page, status);

  return (
    <div className="space-y-5">
      <PageHeader icon="bi-bag-check" title={t("orders.title")} />

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
        empty={{ icon: "bi-bag", title: t("orders.empty") }}
      >
        {(orders) => (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/panel/orders/${order.id}`} className="block">
                  <Card className="hover:border-brand-400/50 flex flex-wrap items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5">
                    <span className="bg-brand-500/12 text-brand-600 dark:text-brand-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                      <i className="bi bi-bag-check text-lg" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="tnum truncate font-semibold">
                        #{localizeDigits(order.order_number || String(order.id), locale)}
                      </p>
                      <p className="text-faint text-xs">{formatDate(order.date, locale)}</p>
                    </div>

                    <Money value={order.amount} />
                    <StatusBadge status={order.status} />
                    <i className="bi bi-chevron-left text-faint ltr:rotate-180" aria-hidden />
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
