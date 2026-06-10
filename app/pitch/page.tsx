"use client";

import Link from "next/link";
import { Activity, Zap, Database, MapPin, Mail, ArrowRight, CheckCircle, Globe, Phone, Link2, Shuffle, MessageCircle, Users, BellRing, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/* ── helpers ──────────────────────────────────────────────────────────────── */
function Tag({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    blue:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    red:    "bg-red-500/10 text-red-400 border border-red-500/20",
    green:  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

function SlideNumber({ n }: { n: number }) {
  return (
    <div className="text-[11px] font-mono font-bold tracking-widest opacity-30 mb-4"
      style={{ color: "var(--text-muted)" }}>
      0{n} / 09
    </div>
  );
}

function SlideDivider() {
  return <div className="w-full border-t my-2" style={{ borderColor: "var(--border)" }} />;
}

/* ── Step pill ────────────────────────────────────────────────────────────── */
const STEPS = [
  { n: "01", label: "SENSE",       color: "#818CF8" },
  { n: "02", label: "DIAGNOSE",    color: "#FBBF24" },
  { n: "03", label: "MATCH-DB",    color: "#60A5FA" },
  { n: "04", label: "MATCH-MAPS",  color: "#34D399" },
  { n: "05", label: "PLAN",        color: "#FB923C" },
  { n: "06", label: "EXECUTE",     color: "#F87171" },
  { n: "07", label: "VERIFY",      color: "#34D399" },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function PitchPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass border-b"
        style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg btn-glow flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>SupplyPulse</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button size="sm" className="gap-1.5 text-sm">
              <Zap className="w-3.5 h-3.5" /> Open App
            </Button>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-24 max-w-4xl mx-auto px-6 space-y-4">

        {/* ── SLIDE 1 — COVER ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl px-10 py-16 text-center"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)" }}>
          {/* glow blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)", transform: "translate(-30%, 30%)" }} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Hackathon Pitch Deck
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">SupplyPulse</h1>
            <p className="text-xl text-blue-200 mb-3 font-medium">AI-Powered Supply Chain Crisis Management</p>
            <p className="text-base text-slate-400 italic mb-8 max-w-xl mx-auto">
              From disruption detected to recovery executed — in under 3 minutes.
            </p>
            <p className="text-sm text-blue-400 font-mono">supply-pulse-ecru.vercel.app</p>
          </div>
        </section>

        <SlideDivider />

        {/* ── SLIDE 2 — THE PROBLEM ─────────────────────────────────────── */}
        <section className="rounded-3xl p-10 glass-card">
          <SlideNumber n={2} />
          <Tag color="red">THE PROBLEM</Tag>
          <h2 className="text-3xl font-bold mt-4 mb-3 leading-tight" style={{ color: "var(--text)" }}>
            Nigerian SMEs lose millions every time a supplier goes silent.
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
            A supplier stops picking up calls. 3 open orders. ₦2.6M due Friday. And no system to fix it fast.
          </p>
          <div className="space-y-3">
            {[
              { Icon: Phone, text: "Hours of phone calls and WhatsApp messages to find a replacement — no guarantee of success." },
              { Icon: Link2, text: "No single system connecting open orders, supplier contacts, and alternatives in one place." },
              { Icon: Shuffle, text: "Every disruption resolved by gut instinct — no data, no process, no audit trail." },
            ].map((p) => (
              <div key={p.text} className="flex gap-4 items-start p-4 rounded-2xl"
                style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
                <p.Icon className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SLIDE 3 — THE SOLUTION ────────────────────────────────────── */}
        <section className="rounded-3xl p-10 glass-card">
          <SlideNumber n={3} />
          <Tag color="blue">THE SOLUTION</Tag>
          <h2 className="text-3xl font-bold mt-4 mb-3 leading-tight" style={{ color: "var(--text)" }}>
            SupplyPulse resolves supply disruptions{" "}
            <span className="gradient-text">in under 3 minutes.</span>
          </h2>
          <p className="text-base mb-10 max-w-2xl" style={{ color: "var(--text-muted)" }}>
            An AI agent that watches your supply chain, finds the best replacement supplier when something breaks, and executes the full recovery — with one word from you.
          </p>

          {/* 7-step pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-1">
                <div className="px-3 py-2 rounded-xl text-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                  <div className="text-[10px] font-mono font-bold mb-0.5" style={{ color: s.color }}>{s.n}</div>
                  <div className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{s.label}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                )}
              </div>
            ))}
          </div>

          {/* 3 stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "< 3 min", label: "average resolution" },
              { value: "7 steps", label: "fully automated" },
              { value: "100%", label: "human approved" },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-2xl"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div className="text-2xl font-bold mb-1" style={{ color: "var(--accent)" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SLIDE 4 — HOW IT WORKS ───────────────────────────────────── */}
        <section className="rounded-3xl px-10 py-10 text-white"
          style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}>
          <SlideNumber n={4} />
          <h2 className="text-3xl font-bold mb-2">The 7-Step Agent Loop</h2>
          <p className="text-slate-400 text-sm mb-8">Every disruption runs the same intelligent loop — automatically.</p>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                label: "DIAGNOSE", color: "#FBBF24",
                desc: "Queries MongoDB — surfaces all affected orders, SKUs, and ₦ value at risk in real time.",
              },
              {
                label: "MATCH-DB", color: "#60A5FA",
                desc: "$vectorSearch on 768-dim supplier embeddings finds semantically similar alternatives from your database.",
              },
              {
                label: "MATCH-MAPS", color: "#34D399",
                desc: "Google Maps Places API fires when your DB has fewer than 3 results — real open businesses near you.",
              },
              {
                label: "EXECUTE", color: "#F87171",
                desc: "On operator approval: updates orders in MongoDB, sends vendor email via Gmail, writes full audit log.",
              },
            ].map((c) => (
              <div key={c.label} className="p-5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${c.color}30`, borderLeft: `3px solid ${c.color}` }}>
                <div className="text-xs font-bold mb-2 font-mono" style={{ color: c.color }}>{c.label}</div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SLIDE 5 — DUAL SOURCE ────────────────────────────────────── */}
        <section className="rounded-3xl px-10 py-10 text-white"
          style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 100%)" }}>
          <SlideNumber n={5} />
          <h2 className="text-3xl font-bold mb-1">Your database + Google Maps.</h2>
          <p className="text-3xl font-bold mb-8 text-blue-300">One ranked list.</p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* YOUR DB */}
            <div className="p-6 rounded-2xl" style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold mb-4"
                style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>
                <Database className="w-3 h-3" /> YOUR DB
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {["Suppliers you already work with", "Match score from vector search", "Reliability score, lead time, price tier", "Sourced from your own MongoDB data"].map((t) => (
                  <li key={t} className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />{t}</li>
                ))}
              </ul>
            </div>

            {/* MAPS LIVE */}
            <div className="p-6 rounded-2xl" style={{ background: "rgba(5,150,105,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold mb-4"
                style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7" }}>
                <MapPin className="w-3 h-3" /> MAPS LIVE
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {["Real open businesses from Google Maps", "Star rating, review count, address", "Solves cold-start on day one", "Auto-fires when DB has < 3 results"].map((t) => (
                  <li key={t} className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 text-center text-sm text-slate-400 italic">
            ↓ Merged into one ranked recovery plan — Option A, B, C ↓
          </div>
        </section>

        {/* ── SLIDE 6 — DEMO SNAPSHOT ──────────────────────────────────── */}
        <section className="rounded-3xl p-10 glass-card">
          <SlideNumber n={6} />
          <Tag color="green">DEMO</Tag>
          <h2 className="text-3xl font-bold mt-4 mb-2" style={{ color: "var(--text)" }}>What the operator sees</h2>
          <p className="text-sm mb-7" style={{ color: "var(--text-muted)" }}>After the agent completes the 7-step loop:</p>

          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {[
              ["Time to resolve",  "2m 47s",           "text-emerald-500"],
              ["Supplier chosen",  "Techmart Supplies", ""],
              ["Source",           "YOUR DB",           "text-blue-500 font-mono"],
              ["Match score",      "94%",               "text-emerald-500"],
              ["Orders updated",   "3 records",         ""],
              ["Email sent",       "✓ via Gmail",       "text-emerald-500"],
              ["Cost delta",       "+₦54,000",          "text-yellow-500"],
              ["Audit log",        "Stored ✓",          "text-emerald-500"],
            ].map(([label, value, cls], i) => (
              <div key={label} className={`flex justify-between items-center px-5 py-3 text-sm ${i % 2 === 0 ? "" : ""}`}
                style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-2)", borderBottom: i < 7 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className={`font-semibold ${cls}`} style={{ color: cls ? undefined : "var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4 text-center italic" style={{ color: "var(--text-muted)" }}>
            Every decision is permanently logged — searchable, exportable, auditable.
          </p>
        </section>

        {/* ── SLIDE 7 — TECH STACK ─────────────────────────────────────── */}
        <section className="rounded-3xl p-10 glass-card">
          <SlideNumber n={7} />
          <Tag color="purple">TECH STACK</Tag>
          <h2 className="text-3xl font-bold mt-4 mb-2" style={{ color: "var(--text)" }}>
            Built on reliable, production-grade infrastructure.
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            Each piece chosen for real-world performance — nothing included that doesn&apos;t earn its place.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { name: "MongoDB Atlas",           role: "$vectorSearch + document store",   color: "#00ed64", icon: Database },
              { name: "Gemini + Groq Llama 3.3", role: "LLM with automatic fallback",      color: "#60A5FA", icon: Zap },
              { name: "Google Maps Places API",  role: "Live supplier discovery",          color: "#34a853", icon: MapPin },
              { name: "Gmail via Nodemailer",    role: "Automated vendor emails",          color: "#FB923C", icon: Mail },
              { name: "Next.js 16 + TypeScript", role: "Full-stack, type-safe",            color: "#e2e8f0", icon: Activity },
              { name: "Vercel",                  role: "Zero-config deployment",           color: "#a78bfa", icon: Globe },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "var(--bg-2)", border: `1px solid ${t.color}25`, borderLeft: `3px solid ${t.color}` }}>
                <t.icon className="w-4 h-4 shrink-0" style={{ color: t.color }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: t.color }}>{t.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SLIDE 8 — WHAT'S NEXT ────────────────────────────────────── */}
        <section className="rounded-3xl p-10 glass-card">
          <SlideNumber n={8} />
          <Tag color="yellow">WHAT&apos;S NEXT</Tag>
          <h2 className="text-3xl font-bold mt-4 mb-8" style={{ color: "var(--text)" }}>
            What&apos;s next for SupplyPulse
          </h2>

          <div className="space-y-3">
            {[
              { Icon: MessageCircle, title: "WhatsApp Integration",   color: "#25D366", desc: "Most Nigerian SME procurement happens on WhatsApp. A Twilio-powered interface for the agent is the most-requested feature." },
              { Icon: Users,         title: "Supplier Onboarding",    color: "#60A5FA", desc: "Let suppliers register directly, verify their own data, and appear in YOUR DB results for future disruptions." },
              { Icon: BellRing,      title: "Predictive Alerts",      color: "#FBBF24", desc: "Monitor order lead times and supplier activity — flag risks before they become emergencies." },
              { Icon: Languages,     title: "Multi-Language Support", color: "#34D399", desc: "Yoruba, Igbo, and Hausa intake for operators outside Lagos who don't default to English." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 items-start p-5 rounded-2xl"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                  <item.Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold mb-1" style={{ color: item.color }}>{item.title}</div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SLIDE 9 — CLOSING ────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl px-10 py-16 text-center"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)" }}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)", transform: "translate(35%, -35%)" }} />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)", transform: "translate(-35%, 35%)" }} />

          <div className="relative z-10">
            <p className="text-xs font-mono tracking-widest text-slate-500 mb-6">09 / 09</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Stop losing money to<br />
              <span className="text-blue-300">supply chain chaos.</span>
            </h2>
            <p className="text-slate-400 italic mb-10 max-w-lg mx-auto">
              Because your suppliers&apos; problems shouldn&apos;t become your customers&apos; problems.
            </p>

            <div className="flex flex-wrap gap-3 justify-center mb-10">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  <Zap className="w-4 h-4" /> Open Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline"
                  className="gap-2 border-white/20 text-white hover:bg-white/10">
                  <Activity className="w-4 h-4" /> Create account
                </Button>
              </Link>
            </div>

            <p className="text-blue-400 font-mono text-lg font-bold mb-3">supply-pulse-ecru.vercel.app</p>
            <p className="text-xs text-slate-600">
              MongoDB Atlas · Gemini · Groq · Google Maps · Gmail
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
