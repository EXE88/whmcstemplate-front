"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AttachmentPicker } from "@/components/panel/attachment-picker";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/misc";
import { ErrorBanner, LoadingBlock } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import type { TicketPriority } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useCreateTicket, useDepartments, useServices } from "@/lib/query/hooks";

/**
 * New ticket.
 *
 * Multipart from the start — the same request carries the message and its
 * files, matching the bridge's endpoint exactly. Attachments are validated
 * locally before submit (see `lib/support/attachments`), so an unacceptable
 * file never costs the customer an upload.
 */
export default function NewTicketPage() {
  const { t, ts } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const departments = useDepartments();
  const services = useServices(1, "Active");
  const create = useCreateTicket();

  const [departmentId, setDepartmentId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [serviceId, setServiceId] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const ready = departmentId && subject.trim().length > 2 && message.trim().length > 2;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;

    const form = new FormData();
    form.set("department_id", departmentId);
    form.set("subject", subject.trim());
    form.set("message", message.trim());
    form.set("priority", priority);
    if (serviceId) form.set("service_id", serviceId);
    for (const file of files) form.append("attachments", file);

    create.mutate(form, {
      onSuccess: (result) => {
        toast.success(t("tickets.created"), `#${result.ticket_number}`);
        router.replace(`/panel/tickets/${result.id}`);
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-chat-left-text"
        title={t("tickets.new")}
        action={
          <ButtonLink href="/panel/tickets" variant="ghost" size="sm" icon="bi-arrow-right">
            {t("common.back")}
          </ButtonLink>
        }
      />

      <Card as="section">
        <CardHeader icon="bi-pencil-square" title={t("tickets.new")} />
        <CardBody className="pt-4">
          {departments.isPending ? (
            <LoadingBlock />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {create.isError ? <ErrorBanner error={create.error} /> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label={t("tickets.department")}
                  required
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                >
                  <option value="" disabled>
                    {t("common.select")}
                  </option>
                  {departments.data?.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label={t("tickets.priority")}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TicketPriority)}
                >
                  {(["Low", "Medium", "High"] as const).map((value) => (
                    <option key={value} value={value}>
                      {ts("priority", value)}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label={t("tickets.subject")}
                required
                maxLength={200}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />

              <Select
                label={t("tickets.relatedService")}
                hint={t("common.optional")}
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
              >
                <option value="">{t("tickets.noService")}</option>
                {services.data?.results.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                    {service.domain ? ` — ${service.domain}` : ""}
                  </option>
                ))}
              </Select>

              <Textarea
                label={t("tickets.message")}
                required
                maxLength={20000}
                rows={8}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />

              <AttachmentPicker files={files} onChange={setFiles} disabled={create.isPending} />

              <Button
                type="submit"
                size="lg"
                icon="bi-send"
                loading={create.isPending}
                disabled={!ready}
              >
                {t("tickets.send")}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
