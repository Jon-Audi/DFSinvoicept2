import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Customer } from "@/types";

// shadcn-style className merge helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean) as string[];
  return parts.join(" ");
}

export function customerDisplayName(c: Partial<Customer>) {
  return (c.companyName?.trim() || fullName(c.firstName, c.lastName) || "").trim();
}
