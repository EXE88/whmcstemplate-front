"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  billingApi,
  catalogueApi,
  domainsApi,
  ordersApi,
  servicesApi,
  supportApi,
} from "@/lib/api/endpoints";
import type {
  InvoiceStatus,
  OrderStatus,
  ProfileUpdate,
  ServiceStatus,
  TicketStatus,
} from "@/lib/api/types";
import { queryKeys } from "./keys";

/* -- catalogue (public, long-lived) --------------------------------------- */

export function useProducts(groupId?: number) {
  return useQuery({
    queryKey: queryKeys.products(groupId),
    queryFn: () => catalogueApi.products(groupId),
    staleTime: 10 * 60_000,
  });
}

export function useTldPricing() {
  return useQuery({
    queryKey: queryKeys.tldPricing(),
    queryFn: () => catalogueApi.tldPricing(),
    staleTime: 10 * 60_000,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods(),
    queryFn: () => catalogueApi.paymentMethods(),
    staleTime: 10 * 60_000,
  });
}

export function useDomainLookup(domain: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.domainLookup(domain),
    queryFn: ({ signal }) => catalogueApi.lookupDomain(domain, signal),
    enabled: enabled && domain.length > 3,
    staleTime: 60_000,
    retry: false,
  });
}

/* -- account --------------------------------------------------------------- */

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => authApi.profile(),
    enabled,
  });
}

export function useContacts() {
  return useQuery({ queryKey: queryKeys.contacts(), queryFn: () => authApi.contacts() });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: ProfileUpdate) => authApi.updateProfile(changes),
    onSuccess: (profile) => client.setQueryData(queryKeys.profile(), profile),
  });
}

export function useChangeAccountPassword() {
  return useMutation({
    mutationFn: (input: { current_password: string; new_password: string }) =>
      authApi.changePassword(input.current_password, input.new_password),
  });
}

/* -- services -------------------------------------------------------------- */

export function useServices(page: number, status: ServiceStatus | "" = "") {
  return useQuery({
    queryKey: queryKeys.services(page, status),
    queryFn: () => servicesApi.list({ page, status: status || undefined }),
  });
}

export function useService(id: number) {
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: () => servicesApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useUpgradeOptions(id: number) {
  return useQuery({
    queryKey: queryKeys.upgradeOptions(id),
    queryFn: () => servicesApi.upgradeOptions(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useServicePasswordChange(id: number) {
  return useMutation({ mutationFn: (password: string) => servicesApi.changePassword(id, password) });
}

export function useServiceCancellation(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; immediate: boolean }) =>
      servicesApi.requestCancellation(id, input.reason, input.immediate),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.service(id) });
      client.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpgradeQuote(id: number) {
  return useMutation({
    mutationFn: (input: { new_product_id: number; billing_cycle: string; promo_code?: string }) =>
      servicesApi.upgradeQuote(id, input),
  });
}

export function useUpgrade(id: number) {
  return useMutation({
    mutationFn: (input: {
      new_product_id: number;
      billing_cycle: string;
      payment_method: string;
      promo_code?: string;
    }) => servicesApi.upgrade(id, input),
  });
}

/* -- domains --------------------------------------------------------------- */

export function useDomains(page: number) {
  return useQuery({
    queryKey: queryKeys.domains(page),
    queryFn: () => domainsApi.list({ page }),
  });
}

export function useDomain(id: number) {
  return useQuery({
    queryKey: queryKeys.domain(id),
    queryFn: () => domainsApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useNameservers(id: number) {
  return useQuery({
    queryKey: queryKeys.nameservers(id),
    queryFn: () => domainsApi.nameservers(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSetNameservers(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (nameservers: string[]) => domainsApi.setNameservers(id, nameservers),
    onSuccess: (data) => client.setQueryData(queryKeys.nameservers(id), data),
  });
}

export function useDomainLock(id: number) {
  return useQuery({
    queryKey: queryKeys.domainLock(id),
    queryFn: () => domainsApi.lock(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSetDomainLock(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) => domainsApi.setLock(id, locked),
    onSuccess: (data) => client.setQueryData(queryKeys.domainLock(id), data),
  });
}

export function useEppCode(id: number) {
  return useMutation({ mutationFn: () => domainsApi.epp(id) });
}

/* -- billing --------------------------------------------------------------- */

export function useInvoices(page: number, status: InvoiceStatus | "" = "") {
  return useQuery({
    queryKey: queryKeys.invoices(page, status),
    queryFn: () => billingApi.invoices({ page, status: status || undefined }),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => billingApi.invoice(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useTransactions(page: number) {
  return useQuery({
    queryKey: queryKeys.transactions(page),
    queryFn: () => billingApi.transactions({ page }),
  });
}

export function useCredit() {
  return useQuery({ queryKey: queryKeys.credit(), queryFn: () => billingApi.credit() });
}

/* -- orders ---------------------------------------------------------------- */

export function useOrders(page: number, status: OrderStatus | "" = "") {
  return useQuery({
    queryKey: queryKeys.orders(page, status),
    queryFn: () => ordersApi.list({ page, status: status || undefined }),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => ordersApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCancelOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: (order) => {
      client.setQueryData(queryKeys.order(order.id), order);
      client.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/* -- support --------------------------------------------------------------- */

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments(),
    queryFn: () => supportApi.departments(),
    staleTime: 10 * 60_000,
  });
}

export function useTickets(page: number, status: TicketStatus | "" = "") {
  return useQuery({
    queryKey: queryKeys.tickets(page, status),
    queryFn: () => supportApi.tickets({ page, status: status || undefined }),
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: () => supportApi.ticket(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => supportApi.create(form),
    onSuccess: () => client.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useReplyToTicket(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => supportApi.reply(id, form),
    onSuccess: (ticket) => {
      client.setQueryData(queryKeys.ticket(id), ticket);
      client.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useCloseTicket(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.close(id),
    onSuccess: (ticket) => {
      client.setQueryData(queryKeys.ticket(id), ticket);
      client.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
