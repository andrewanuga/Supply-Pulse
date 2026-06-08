"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SupplyPulse error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Something went wrong
      </h1>
      <p className="text-base mb-2 max-w-md" style={{ color: "var(--text-muted)" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs mb-6 font-mono" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Error ID: {error.digest}
        </p>
      )}
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--text-muted)" }}>
        Make sure your <code className="text-blue-400">.env.local</code> has valid
        MONGODB_URI, GOOGLE_API_KEY, and RESEND_API_KEY.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{
            background: "var(--bg-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
        <Link
          href="/dashboard"
          className="btn-glow flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
