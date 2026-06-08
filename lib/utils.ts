import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    at_risk: "text-red-400 bg-red-400/10 border-red-400/20",
    rerouted: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    fulfilled: "text-green-400 bg-green-400/10 border-green-400/20",
  };
  return map[status] || "text-gray-400 bg-gray-400/10 border-gray-400/20";
}

export function getPhaseColor(phase: string): string {
  const map: Record<string, string> = {
    sense: "text-purple-400",
    diagnose: "text-yellow-400",
    match: "text-blue-400",
    plan: "text-orange-400",
    execute: "text-red-400",
    verify: "text-green-400",
  };
  return map[phase] || "text-gray-400";
}
