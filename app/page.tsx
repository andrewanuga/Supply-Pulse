"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Zap, Database, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/* ── Hero terminal ───────────────────────────────────────────────────── */
const termLines = [
  { t: "[SENSE] Supplier unavailability detected", c: "#818CF8", d: 0 },
  { t: "[DIAGNOSE] 3 orders · ₦2,675,000 at risk · CRITICAL", c: "#FBBF24", d: 800 },
  { t: "[MATCH-DB] $vectorSearch → Techmart Supplies [YOUR DB] 94%", c: "#60A5FA", d: 1600 },
  { t: "[MATCH-MAPS] Google Maps fallback → Lagos Electronics Hub [MAPS LIVE ★4.3]", c: "#34D399", d: 2400 },
  { t: "[PLAN] 3 ranked options generated", c: "#FB923C", d: 3100 },
  { t: "[EXECUTE] Operator approved → 3 records updated · email sent", c: "#F87171", d: 3900 },
  { t: "[VERIFY] ✓ Resolved in 2m 47s · Audit log stored", c: "#34D399", d: 4700 },
];

function HeroTerminal() {
  const [lines, setLines] = useState(0);
  const [loop, setLoop] = useState(0);
  useEffect(() => {
    setLines(0);
    const timers = termLines.map((l, i) => setTimeout(() => setLines(i + 1), l.d));
    const reset = setTimeout(() => setLoop((n) => n + 1), 8000);
    return () => { timers.forEach(clearTimeout); clearTimeout(reset); };
  }, [loop]);

  return (
    <div className="terminal w-full">
      <div className="terminal-scan" />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(59,130,246,0.15)]">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-[rgba(148,163,184,0.5)] text-xs font-mono">supply-pulse agent</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs text-blue-400 font-mono">live</span>
        </div>
      </div>
      <div className="p-4 space-y-2 min-h-[200px]">
        {termLines.slice(0, lines).map((l, i) => (
          <div key={`${loop}-${i}`} className="text-xs leading-relaxed font-mono animate-slide-up" style={{ color: l.c }}>
            <span className="text-[rgba(148,163,184,0.3)] mr-2 select-none">›</span>{l.t}
          </div>
        ))}
        {lines < termLines.length && (
          <div className="flex items-center gap-1 text-xs font-mono text-[rgba(148,163,184,0.3)]">
            <span>›</span>
            <span className="inline-block w-2 h-3 bg-blue-400/60 animate-blink" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const features = [
    {
      icon: Database,
      title: "Semantic supplier matching",
      desc: "MongoDB $vectorSearch finds the best alternative suppliers from your database — even when the words don't match exactly.",
      color: "#60A5FA",
    },
    {
      icon: MapPin,
      title: "Google Maps fallback",
      desc: "No suppliers in your database? The agent automatically searches Google Maps for real, open businesses near you.",
      color: "#34D399",
    },
    {
      icon: Mail,
      title: "One-click vendor emails",
      desc: "Approve the recovery plan and a professional procurement email goes out immediately — logged to your audit trail.",
      color: "#FBBF24",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg btn-glow flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>SupplyPulse</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button size="sm" className="gap-1.5 text-sm">
              <Zap className="w-3.5 h-3.5" /> Open App
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Background glow */}
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #2563EB 0%, transparent 70%)" }} />

          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", color: "var(--accent)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                AI Supply Chain Management
              </div>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5" style={{ color: "var(--text)" }}>
                Resolve supply chain disruptions{" "}
                <span style={{
                  background: "linear-gradient(135deg, #3B82F6, #818CF8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  in under 3 minutes.
                </span>
              </h1>

              <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
                SupplyPulse is an AI agent that watches your supply chain, finds the best replacement supplier when something breaks, and executes the full recovery — with one word from you.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    <Zap className="w-4 h-4" />
                    Open Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="gap-2">
                    Create account
                  </Button>
                </Link>
              </div>

              {/* Quick stats */}
              <div className="flex gap-6 mt-10 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                {[
                  { value: "< 3 min", label: "to resolve a disruption" },
                  { value: "7 steps", label: "fully automated" },
                  { value: "100%", label: "human approved" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-lg font-bold" style={{ color: "var(--text)" }}>{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — terminal */}
            <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>
              Everything you need to recover fast.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
              From disruption detected to recovery executed — without the phone calls, WhatsApp messages, and guesswork.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="glass-card rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: "var(--text)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: "var(--text)" }}>
            Stop losing money to supply chain chaos.
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
            Your supplier&apos;s problems shouldn&apos;t become your customers&apos; problems.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <Activity className="w-4 h-4" />
                Get started free
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2">
                View dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-6 px-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md btn-glow flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>SupplyPulse</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>· AI Supply Chain Crisis Management</span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            MongoDB Atlas · Gemini · Groq · Google Maps · Gmail
          </span>
        </div>
      </footer>

    </div>
  );
}
