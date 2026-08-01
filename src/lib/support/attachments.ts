/**
 * Client-side mirror of the bridge's attachment rules.
 *
 * The server is still the authority — this exists so a customer who picked a
 * 40 MB video or a `.php` file learns that instantly instead of after a long
 * upload that ends in a 400. The lists are kept deliberately identical to
 * `apps/whmcs/attachments.py`; the forbidden set is the one that must never
 * drift wider.
 */

export const MAX_FILES = 5;
export const MAX_BYTES_EACH = 5 * 1024 * 1024;
export const MAX_BYTES_TOTAL = 15 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".txt", ".log", ".csv",
  ".doc", ".docx", ".xls", ".xlsx",
  ".zip", ".gz", ".rar",
]);

export const FORBIDDEN_EXTENSIONS = new Set([
  ".php", ".php3", ".php4", ".php5", ".phtml", ".phar",
  ".htm", ".html", ".xhtml", ".svg", ".xml",
  ".js", ".mjs", ".htaccess",
  ".exe", ".dll", ".bat", ".cmd", ".com", ".scr", ".msi",
  ".sh", ".bash", ".py", ".pl", ".rb", ".jsp", ".asp", ".aspx",
]);

/** Accept attribute for the file input, so the picker filters first. */
export const ACCEPT_ATTRIBUTE = [...ALLOWED_EXTENSIONS].join(",");

export function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export type AttachmentRejection =
  | { reason: "count" }
  | { reason: "type"; ext: string; name: string }
  | { reason: "size"; name: string }
  | { reason: "total" };

export interface AttachmentCheck {
  accepted: File[];
  rejections: AttachmentRejection[];
}

/** Validate a candidate batch against the already-selected files. */
export function checkAttachments(existing: File[], incoming: File[]): AttachmentCheck {
  const accepted = [...existing];
  const rejections: AttachmentRejection[] = [];

  for (const file of incoming) {
    if (accepted.length >= MAX_FILES) {
      rejections.push({ reason: "count" });
      break;
    }

    const ext = extensionOf(file.name);
    if (!ext || FORBIDDEN_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      rejections.push({ reason: "type", ext: ext || "?", name: file.name });
      continue;
    }
    if (file.size > MAX_BYTES_EACH) {
      rejections.push({ reason: "size", name: file.name });
      continue;
    }

    const total = accepted.reduce((sum, item) => sum + item.size, 0) + file.size;
    if (total > MAX_BYTES_TOTAL) {
      rejections.push({ reason: "total" });
      continue;
    }

    accepted.push(file);
  }

  return { accepted, rejections };
}
