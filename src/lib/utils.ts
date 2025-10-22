
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Customer } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a display name for a customer.
 * Prefers company name, otherwise falls back to a full name.
 * @param customer - The customer object.
 * @returns The display name string.
 */
export function customerDisplayName(customer: Partial<Customer>): string {
  if (customer.companyName) {
    return customer.companyName;
  }
  return fullName(customer);
}

/**
 * Generates the full name of a person.
 * @param person - An object with optional firstName and lastName properties.
 * @returns The full name string.
 */
export function fullName(person: { firstName?: string | null; lastName?: string | null }): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}


/**
 * Builds a search index string from customer data.
 * @param c - The customer data.
 * @returns A normalized, lowercased string for searching.
 */
export const buildSearchIndex = (c: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) =>
  [
    c.companyName ?? "",
    c.firstName ?? "",
    c.lastName ?? "",
    c.email ?? "",
    c.phone ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim() || null;
