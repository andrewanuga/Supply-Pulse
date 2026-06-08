import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-16 h-16 rounded-2xl btn-glow flex items-center justify-center mb-6">
        <Activity className="w-8 h-8 text-white" />
      </div>
      <div
        className="text-8xl font-black mb-4 gradient-text"
        style={{ lineHeight: 1 }}
      >
        404
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Page not found
      </h1>
      <p className="text-base mb-8 max-w-sm" style={{ color: "var(--text-muted)" }}>
        This route doesn&apos;t exist. Head back to the dashboard or landing page.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{
            background: "var(--bg-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <Link
          href="/dashboard"
          className="btn-glow flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        >
          <Activity className="w-4 h-4" /> Dashboard
        </Link>
      </div>
    </div>
  );
}
