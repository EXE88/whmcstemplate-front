"use client";

import { useRef } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { ACCEPT_ATTRIBUTE, checkAttachments } from "@/lib/support/attachments";

/**
 * File picker that enforces the bridge's limits before anything is uploaded.
 * Rejections are reported per file, naming the offending extension or size, so
 * the fix is obvious.
 */
export function AttachmentPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const { accepted, rejections } = checkAttachments(files, Array.from(list));

    for (const rejection of rejections) {
      if (rejection.reason === "count") toast.error(t("tickets.attachRejectedCount"));
      else if (rejection.reason === "total") toast.error(t("tickets.attachRejectedTotal"));
      else if (rejection.reason === "type")
        toast.error(t("tickets.attachRejectedType", { ext: rejection.ext }), rejection.name);
      else toast.error(t("tickets.attachRejectedSize", { name: rejection.name }));
    }

    onChange(accepted);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => add(event.target.files)}
        aria-label={t("tickets.attachments")}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon="bi-paperclip"
          disabled={disabled || files.length >= 5}
          onClick={() => inputRef.current?.click()}
        >
          {t("tickets.attachAdd")}
        </Button>
        <p className="text-faint text-xs">{t("tickets.attachHint")}</p>
      </div>

      {files.length ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-xl bg-[var(--field-bg)] px-3 py-2 text-xs"
            >
              <i className="bi bi-file-earmark text-faint" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-faint tnum shrink-0">{formatFileSize(file.size, locale)}</span>
              <IconButton
                icon="bi-x-lg"
                size="sm"
                label={t("common.remove")}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
