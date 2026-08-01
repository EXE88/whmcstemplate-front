import { downloadFile, postAuth, request } from "./client";
import type {
  Contact,
  CreditBalance,
  Department,
  Domain,
  DomainLock,
  DomainLookup,
  EppResult,
  Invoice,
  InvoiceStatus,
  NameserverPayload,
  Order,
  OrderCreatePayload,
  OrderCreateResult,
  OrderStatus,
  Paginated,
  PayMethod,
  PaymentMethod,
  Product,
  Profile,
  ProfileUpdate,
  SessionUser,
  Service,
  ServiceStatus,
  Ticket,
  TicketAttachment,
  TicketStatus,
  TldPricing,
  Transaction,
  UpgradeQuote,
} from "./types";

export interface PageParams {
  page?: number;
  page_size?: number;
}

/* -- auth ----------------------------------------------------------------- */

export const authApi = {
  login: (email: string, password: string) =>
    postAuth<{ user: SessionUser }>("login", { email, password }),

  register: (payload: Record<string, string>) =>
    postAuth<{ user: SessionUser }>("register", payload),

  logout: () => postAuth<null>("logout", {}),

  profile: () => request<Profile>("/auth/me"),

  updateProfile: (changes: ProfileUpdate) =>
    request<Profile>("/auth/me", { method: "PATCH", body: changes }),

  changePassword: (current_password: string, new_password: string) =>
    request<null>("/auth/me/password", {
      method: "POST",
      body: { current_password, new_password },
    }),

  contacts: () => request<Contact[]>("/auth/me/contacts"),
};

/* -- public catalogue ----------------------------------------------------- */

export const catalogueApi = {
  products: (groupId?: number) =>
    request<Product[]>("/hosting/products", { query: { group_id: groupId } }),

  tldPricing: () => request<TldPricing>("/hosting/tld-pricing"),

  lookupDomain: (domain: string, signal?: AbortSignal) =>
    request<DomainLookup>("/hosting/domains/lookup", { query: { domain }, signal }),

  paymentMethods: () => request<PaymentMethod[]>("/orders/payment-methods"),
};

/* -- services ------------------------------------------------------------- */

export const servicesApi = {
  list: (params: PageParams & { status?: ServiceStatus | "" } = {}) =>
    request<Paginated<Service>>("/hosting/services", { query: { ...params } }),

  get: (id: number) => request<Service>(`/hosting/services/${id}`),

  changePassword: (id: number, newPassword: string) =>
    request<null>(`/hosting/services/${id}/password`, {
      method: "POST",
      body: { new_password: newPassword },
    }),

  requestCancellation: (id: number, reason: string, immediate: boolean) =>
    request<{ status: string }>(`/hosting/services/${id}/cancellation`, {
      method: "POST",
      body: { reason, immediate },
    }),

  upgradeOptions: (id: number) => request<Product[]>(`/hosting/services/${id}/upgrade-options`),

  upgradeQuote: (
    id: number,
    payload: { new_product_id: number; billing_cycle: string; promo_code?: string },
  ) =>
    request<UpgradeQuote>(`/hosting/services/${id}/upgrade/quote`, {
      method: "POST",
      body: payload,
    }),

  upgrade: (
    id: number,
    payload: {
      new_product_id: number;
      billing_cycle: string;
      payment_method: string;
      promo_code?: string;
    },
  ) => request<UpgradeQuote>(`/hosting/services/${id}/upgrade`, { method: "POST", body: payload }),
};

/* -- domains -------------------------------------------------------------- */

export const domainsApi = {
  list: (params: PageParams = {}) =>
    request<Paginated<Domain>>("/hosting/domains", { query: { ...params } }),

  get: (id: number) => request<Domain>(`/hosting/domains/${id}`),

  nameservers: (id: number) => request<NameserverPayload>(`/hosting/domains/${id}/nameservers`),

  setNameservers: (id: number, nameservers: string[]) =>
    request<NameserverPayload>(`/hosting/domains/${id}/nameservers`, {
      method: "PUT",
      body: { nameservers },
    }),

  lock: (id: number) => request<DomainLock>(`/hosting/domains/${id}/lock`),

  setLock: (id: number, locked: boolean) =>
    request<DomainLock>(`/hosting/domains/${id}/lock`, { method: "PUT", body: { locked } }),

  epp: (id: number) => request<EppResult>(`/hosting/domains/${id}/epp`, { method: "POST" }),
};

/* -- billing -------------------------------------------------------------- */

export const billingApi = {
  invoices: (params: PageParams & { status?: InvoiceStatus | "" } = {}) =>
    request<Paginated<Invoice>>("/billing/invoices", { query: { ...params } }),

  invoice: (id: number) => request<Invoice>(`/billing/invoices/${id}`),

  transactions: (params: PageParams = {}) =>
    request<Paginated<Transaction>>("/billing/transactions", { query: { ...params } }),

  credit: () => request<CreditBalance>("/billing/credit"),

  payMethods: () => request<PayMethod[]>("/billing/pay-methods"),
};

/* -- orders --------------------------------------------------------------- */

export const ordersApi = {
  list: (params: PageParams & { status?: OrderStatus | "" } = {}) =>
    request<Paginated<Order>>("/orders", { query: { ...params } }),

  get: (id: number) => request<Order>(`/orders/${id}`),

  cancel: (id: number) => request<Order>(`/orders/${id}/cancel`, { method: "POST" }),

  /**
   * The idempotency key is supplied by the caller and must stay stable for as
   * long as the basket does — a double click then replays the first order
   * instead of buying twice.
   */
  create: (payload: OrderCreatePayload, idempotencyKey: string) =>
    request<OrderCreateResult>("/orders", {
      method: "POST",
      body: payload,
      headers: { "Idempotency-Key": idempotencyKey },
    }),
};

/* -- support -------------------------------------------------------------- */

export const supportApi = {
  departments: () => request<Department[]>("/support/departments"),

  tickets: (params: PageParams & { status?: TicketStatus | "" } = {}) =>
    request<Paginated<Ticket>>("/support/tickets", { query: { ...params } }),

  ticket: (id: number) => request<Ticket>(`/support/tickets/${id}`),

  create: (form: FormData) => request<{ id: number; ticket_number: string }>("/support/tickets", {
    method: "POST",
    body: form,
  }),

  reply: (id: number, form: FormData) =>
    request<Ticket>(`/support/tickets/${id}/replies`, { method: "POST", body: form }),

  close: (id: number) => request<Ticket>(`/support/tickets/${id}`, { method: "DELETE" }),

  /**
   * Attachments have no public URL: access control lives on this endpoint, so
   * the bytes are fetched with credentials and handed to the browser as a blob.
   */
  downloadAttachment: (ticketId: number, attachment: TicketAttachment) =>
    downloadFile(
      `/support/tickets/${ticketId}/attachment`,
      {
        type: attachment.type,
        related_id: attachment.related_id,
        index: attachment.index,
      },
      attachment.filename,
    ),
};
