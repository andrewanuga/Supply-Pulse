"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Zap, ArrowRight, Activity, Brain, Database, Mail, Shield,
  Clock, CheckCircle2, AlertTriangle, ChevronRight, Star,
  TrendingUp, Users, Package, BarChart3, Cpu, Globe, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/* ── Hook: scroll reveal ────────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal,.reveal-left,.reveal-right,.reveal-scale");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add("visible");
        }),
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

/* ── Animated number counter ─────────────────────────────────────────── */
function Counter({
  end,
  suffix = "",
  prefix = "",
  duration = 1800,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - t0) / duration, 1);
            setN(Math.round((1 - Math.pow(1 - p, 3)) * end));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [end, duration]);
  return (
    <span ref={ref}>
      {prefix}{n.toLocaleString()}{suffix}
    </span>
  );
}

/* ── 3D tilt card ────────────────────────────────────────────────────── */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(8px)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "rotateY(0) rotateX(0) translateZ(0)";
  }, []);
  return (
    <div className="perspective-1000">
      <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
        className={`tilt-card glass-card rounded-2xl ${className}`}>
        {children}
      </div>
    </div>
  );
}

/* ── Hero terminal ───────────────────────────────────────────────────── */
const termLines = [
  { t: "[SENSE] Supplier unavailability detected", c: "#818CF8", d: 0 },
  { t: "[DIAGNOSE] Querying MongoDB… 3 orders, ₦1,800,000 at risk", c: "#FBBF24", d: 700 },
  { t: "[MATCH-DB] $vectorSearch on 30 supplier embeddings…", c: "#60A5FA", d: 1400 },
  { t: "  ↳ Techmart Supplies [YOUR DB] — 94% match", c: "#34D399", d: 2000 },
  { t: "[MATCH-MAPS] < 3 DB results — Google Maps fallback…", c: "#FBBF24", d: 2500 },
  { t: "  ↳ Lagos Electronics Hub [MAPS LIVE — Open Now ★4.3]", c: "#34D399", d: 3000 },
  { t: "[PLAN] Recovery plan generated with 3 ranked options", c: "#FB923C", d: 3500 },
  { t: "[EXECUTE] Operator approved. Updating 3 records in MongoDB…", c: "#F87171", d: 4200 },
  { t: "[VERIFY] ✅ Resolved in 2m 47s | Delta: +₦54,000", c: "#34D399", d: 5000 },
];

function HeroTerminal() {
  const [lines, setLines] = useState(0);
  const [loop, setLoop] = useState(0);
  useEffect(() => {
    setLines(0);
    const timers = termLines.map((l, i) => setTimeout(() => setLines(i + 1), l.d));
    const reset = setTimeout(() => setLoop((n) => n + 1), 8500);
    return () => { timers.forEach(clearTimeout); clearTimeout(reset); };
  }, [loop]);
  return (
    <div className="terminal w-full max-w-xl mx-auto">
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
      <div className="p-4 space-y-1.5 min-h-[200px]">
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

/* ── Floating 3D shapes ───────────────────────────────────────────────── */
function FloatingShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="orb w-80 h-80 top-10 -left-20" style={{ background: "rgba(37,99,235,0.12)", animationDelay: "0s" }} />
      <div className="orb w-60 h-60 top-1/3 right-0" style={{ background: "rgba(129,140,248,0.10)", animationDelay: "3s" }} />
      <div className="orb w-96 h-96 bottom-0 left-1/3" style={{ background: "rgba(59,130,246,0.08)", animationDelay: "6s" }} />
      <div className="absolute top-24 right-12 w-16 h-16 rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-sm rotate-12 animate-float hidden xl:block"
        style={{ boxShadow: "0 8px 32px rgba(37,99,235,0.15)", animationDelay: "1s" }} />
      <div className="absolute top-1/2 right-24 w-10 h-10 rounded-xl border border-indigo-500/30 bg-indigo-500/5 -rotate-6 animate-float hidden xl:block"
        style={{ boxShadow: "0 4px 16px rgba(99,102,241,0.15)", animationDelay: "2s" }} />
      <div className="absolute bottom-32 left-16 w-12 h-12 rounded-full border border-blue-400/20 bg-blue-400/5 animate-float-slow hidden xl:block"
        style={{ animationDelay: "0.5s" }} />
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  useReveal();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const heroRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleScroll = () => {
      if (!terminalRef.current || !heroRef.current) return;
      const scrollY = window.scrollY;
      const heroH = heroRef.current.offsetHeight;
      if (scrollY < heroH) {
        terminalRef.current.style.transform = `translateY(${scrollY * 0.12}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)" }}>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl btn-glow flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text)" }}>SupplyPulse</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--text-muted)" }}>
            {["Features", "How It Works", "Stack"].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/\s/g, "-")}`}
                className="hover:text-[var(--accent)] transition-colors">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden dot-grid mesh-bg">
        <FloatingShapes />
        <div className="relative z-10 max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left */}
          <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
            <div className="badge mb-6 w-fit">
              <Star className="w-3 h-3" />
              MongoDB Track · June 2026 Hackathon
            </div>
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold leading-tight tracking-tight mb-6" style={{ color: "var(--text)" }}>
              Supply chain<br />
              <span className="shimmer-text">crises, resolved</span><br />
              in 3 minutes.
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed max-w-lg" style={{ color: "var(--text-muted)" }}>
              SupplyPulse is an AI agent that detects disruptions, matches alternative suppliers
              via MongoDB vector search, and executes the full recovery — autonomously.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  <Zap className="w-4 h-4" /> Launch Dashboard
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="gap-2">
                  See How It Works <ChevronRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
            <div className="flex gap-8">
              {[
                { v: <Counter end={3} suffix="min" />, l: "Resolution time" },
                { v: <Counter end={94} suffix="%" />, l: "Match accuracy" },
                { v: <Counter end={30} suffix="+" />, l: "Suppliers indexed" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{s.v}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Right — terminal */}
          <div ref={terminalRef} className={`will-change-transform transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
            <HeroTerminal />
            <div className="mt-4 glass-card rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Disruption Resolved</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Techmart Supplies · 94% match</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-green-400">2m 47s</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>vs. 6+ hours</div>
              </div>
            </div>
          </div>
        </div>
        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float-slow"
          style={{ color: "var(--text-muted)" }}>
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-[var(--accent)]" />
          <span className="text-xs uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────────────── */}
      <section className="section" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-16">
            <div className="badge mb-4 mx-auto w-fit" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }}>
              <AlertTriangle className="w-3 h-3" /> The Problem
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--text)" }}>
              Nigerian SMEs lose{" "}
              <span style={{ color: "#EF4444" }}>₦billions annually</span><br />
              to supply chain chaos.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
              15–30% of revenue disappears every year. The response to every crisis: 6 hours of panic, WhatsApp messages, and spreadsheet hunts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {[
              { icon: AlertTriangle, title: "Stockouts discovered too late", desc: "Operators find out when a customer complains — not before.", side: "reveal-left", delay: 0 },
              { icon: Users, title: "Knowledge in one person's head", desc: "No structured supplier fallback. If that person is unavailable, the whole chain breaks.", side: "reveal-right", delay: 100 },
              { icon: Mail, title: "Vendor emails written from scratch", desc: "Every single crisis. Same message. Re-typed. Wasting precious hours.", side: "reveal-left", delay: 200 },
              { icon: Shield, title: "Zero audit trail", desc: "Owners can't review what happened, why a supplier was chosen, or who approved what.", side: "reveal-right", delay: 300 },
            ].map((p) => (
              <div key={p.title} className={`${p.side} glass-card rounded-2xl p-6 flex gap-4`} style={{ transitionDelay: `${p.delay}ms` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p.icon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "var(--text)" }}>{p.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal glass-card rounded-3xl p-8 text-center"
            style={{ borderColor: "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.03)" }}>
            <div className="text-6xl md:text-8xl font-black mb-2" style={{ color: "var(--text)" }}>
              <Counter prefix="₦" end={24} suffix="M" />
            </div>
            <div className="text-lg" style={{ color: "var(--text-muted)" }}>
              Average annual supply chain loss for a mid-size Nigerian SME
            </div>
            <div className="mt-4 text-sm font-semibold text-red-400">
              That&apos;s revenue gone. Not cost. Revenue.
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" className="section">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-20">
            <div className="badge mb-4 mx-auto w-fit"><Zap className="w-3 h-3" />Agent Loop</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--text)" }}>
              6 steps. <span className="shimmer-text">Under 3 minutes.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
              A true multi-step reasoning agent — not a chatbot wrapper. Every step is a real tool call with real MongoDB writes.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-4">
              {[
                { n: "01", label: "SENSE", desc: "Plain-English disruption intake. Agent classifies type: stockout, late delivery, price spike, or supplier unavailability.", color: "#818CF8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.25)" },
                { n: "02", label: "DIAGNOSE", desc: "Agent calls MongoDB find() — surfaces all affected orders, SKUs, quantities, and ₦ value at risk in real time.", color: "#FBBF24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)" },
                { n: "03", label: "MATCH-DB", desc: "MongoDB Atlas $vectorSearch on 768-dim supplier embeddings. Returns semantically similar alternatives with match scores labelled [YOUR DB].", color: "#60A5FA", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)" },
                { n: "04", label: "MATCH-MAPS", desc: "If DB has fewer than 3 results, Google Maps Places API fires automatically — returning real open businesses nearby, labelled [MAPS LIVE]. Solves the cold-start problem on day one.", color: "#FBBF24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)" },
                { n: "05", label: "PLAN", desc: "Gemini 2.0 Flash reasons over DB + Maps results. Generates ranked recovery plan (A/B/C) with lead time, price delta, reliability, and source provenance.", color: "#FB923C", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.25)" },
                { n: "06", label: "EXECUTE", desc: "Human-in-the-loop approval gate. On confirm: updateMany() on MongoDB, vendor email via Resend, decision log inserted with source tracking.", color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
                { n: "07", label: "VERIFY", desc: "Resolution card surfaces: time-to-resolve, cost delta, supplier chosen, source (YOUR DB vs MAPS LIVE), and full audit trail in MongoDB.", color: "#34D399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)" },
              ].map((s, i) => (
                <div key={s.n} className="reveal flex gap-4" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="relative flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                      {s.n}
                    </div>
                    {i < 6 && (
                      <div className="w-px flex-1 mt-2"
                        style={{ background: `linear-gradient(180deg, ${s.color}30, transparent)`, minHeight: "24px" }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="font-bold text-sm mb-1" style={{ color: s.color }}>{s.label}</div>
                    <div className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:sticky lg:top-28 space-y-4 reveal-right">
              <HeroTerminal />
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Resolution Summary</span>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                {[
                  { l: "Time to resolve", v: "2m 47s", c: "text-green-400" },
                  { l: "Supplier chosen", v: "Techmart Supplies", c: "" },
                  { l: "Match score", v: "94%", c: "text-green-400" },
                  { l: "Orders updated", v: "3 records in MongoDB", c: "" },
                  { l: "Email sent", v: "✓ via Resend", c: "text-green-400" },
                  { l: "Additional cost", v: "+₦54,000", c: "text-yellow-400" },
                  { l: "Audit log", v: "Stored ✓", c: "text-green-400" },
                ].map((r) => (
                  <div key={r.l} className="flex justify-between py-2 border-b text-sm" style={{ borderColor: "var(--border-2)" }}>
                    <span style={{ color: "var(--text-muted)" }}>{r.l}</span>
                    <span className={`font-medium ${r.c}`} style={!r.c ? { color: "var(--text)" } : {}}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="section" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-16">
            <div className="badge mb-4 mx-auto w-fit"><Brain className="w-3 h-3" />Features</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--text)" }}>
              Every feature you need.<br /><span className="gradient-text">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
              Built lean for a 5-day hackathon. All 8 MUST-have features shipped clean.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, id: "F-01", title: "Natural Language Intake", desc: "Describe any disruption in plain English. The agent classifies, reasons, and acts — no forms, no dropdowns." },
              { icon: Database, id: "F-03 ★", title: "Vector Search Matching", desc: "MongoDB Atlas $vectorSearch on 768-dim supplier embeddings. Semantic matching finds the right supplier even with imperfect data." },
              { icon: TrendingUp, id: "F-04", title: "Ranked Recovery Plans", desc: "Gemini 2.0 Flash reasons over candidates and presents Option A/B/C with trade-off rationale in plain English." },
              { icon: Shield, id: "F-05", title: "Human-in-the-Loop", desc: "Zero write operations happen without your explicit approval. You stay in control, always." },
              { icon: Mail, id: "F-07", title: "Auto Vendor Emails", desc: "Professional vendor communication drafted and sent via Resend API the moment you approve. Logged in the audit trail." },
              { icon: Clock, id: "F-08", title: "Full Audit Trail", desc: "Every agent decision written to MongoDB with timestamp, rationale, chosen supplier, cost delta, and operator ID." },
            ].map((f) => (
              <TiltCard key={f.title} className="p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                  <f.icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold" style={{ color: "var(--text)" }}>{f.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(37,99,235,0.1)", color: "var(--accent)", border: "1px solid rgba(37,99,235,0.2)" }}>{f.id}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────────── */}
      <section id="stack" className="section">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-16">
            <div className="badge mb-4 mx-auto w-fit"><Cpu className="w-3 h-3" />Tech Stack</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "var(--text)" }}>
              The <span className="gradient-text">actual</span> stack.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
              No Google Cloud Agent Builder — we use Gemini SDK directly for function calling. Simpler, faster, fully controllable.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "MongoDB Atlas", role: "Vector Search + Document DB", detail: "$vectorSearch on supplier embeddings is the core intelligence. Also handles orders, audit logs, decision records.", icon: Database, color: "#00ED64", accent: "rgba(0,237,100,0.12)", border: "rgba(0,237,100,0.2)" },
              { name: "Gemini 2.0 Flash", role: "LLM + Function Calling", detail: "7 real tool calls per disruption: query orders, vector search, Maps fallback, save supplier, 2x writes, email send. Full multi-step chain.", icon: Brain, color: "#4285F4", accent: "rgba(66,133,244,0.12)", border: "rgba(66,133,244,0.2)" },
              { name: "Next.js 16 / TypeScript", role: "Frontend + API Routes", detail: "App router. Server-side API routes call MongoDB and Gemini directly. Type-safe end to end.", icon: Globe, color: "#E2E8F0", accent: "rgba(226,232,240,0.08)", border: "rgba(226,232,240,0.15)" },
              { name: "Google Maps Places", role: "Live Supplier Discovery", detail: "Text Search API fires when DB has < 3 results. Returns real open businesses with ratings. Solves cold-start. Every result labelled [MAPS LIVE].", icon: MapPin, color: "#34A853", accent: "rgba(52,168,83,0.12)", border: "rgba(52,168,83,0.2)" },
              { name: "Resend API", role: "Automated Vendor Emails", detail: "Professional email on approval. Logged to MongoDB audit trail. Free tier: 3,000/month.", icon: Mail, color: "#FF6B6B", accent: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.2)" },
              { name: "Vercel", role: "Deployment", detail: "Zero-config Next.js deployment. Environment variables via Vercel dashboard. Git push = live.", icon: Zap, color: "#E2E8F0", accent: "rgba(226,232,240,0.08)", border: "rgba(226,232,240,0.12)" },
              { name: "Tailwind CSS v4", role: "Styling System", detail: "CSS-first, zero runtime. Dark/light mode via CSS variables. 3D effects via CSS transforms.", icon: BarChart3, color: "#38BDF8", accent: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.2)" },
            ].map((t, i) => (
              <div key={t.name} className="reveal glass-card rounded-2xl p-5 flex gap-4" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.accent, border: `1px solid ${t.border}` }}>
                  <t.icon className="w-5 h-5" style={{ color: t.color }} />
                </div>
                <div>
                  <div className="font-semibold text-sm mb-0.5" style={{ color: "var(--text)" }}>{t.name}</div>
                  <div className="text-xs mb-2" style={{ color: t.color }}>{t.role}</div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="reveal mt-8 glass-card rounded-2xl p-5 flex flex-wrap gap-4 items-center">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Removed from PRD (not used):</span>
            {["Google Cloud Agent Builder", "Clerk / Supabase Auth"].map((t) => (
              <span key={t} className="text-xs px-3 py-1 rounded-full line-through"
                style={{ background: "rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.6)", border: "1px solid rgba(239,68,68,0.15)" }}>{t}</span>
            ))}
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>— Gemini SDK + no auth needed for demo.</span>
          </div>
        </div>
      </section>

      {/* ── DEMO SCRIPT ─────────────────────────────────────────────── */}
      <section className="section" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-12">
            <div className="badge mb-4 mx-auto w-fit"><Package className="w-3 h-3" />3-Minute Demo Script</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "var(--text)" }}>What judges will see.</h2>
            <p className="text-base" style={{ color: "var(--text-muted)" }}>
              Practice this exactly. It&apos;s designed to maximize WOW per second.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { time: "0:00", label: "Hook", text: '"A supplier just ghosted a ₦2.4M order of electronics stock. Watch SupplyPulse resolve it in under 3 minutes."', color: "#818CF8" },
              { time: "0:20", label: "Intake", text: 'Type: "Supplier Chukwuemeka Electronics has gone silent. 3 open orders, 800 TV remotes needed by Friday."', color: "#FBBF24" },
              { time: "0:50", label: "Diagnose + Match", text: "Agent shows: 3 orders, ₦1.8M at risk. Vector search returns Techmart (94%), Lagos Hub (87%), Gadget Wholesale (71%).", color: "#60A5FA" },
              { time: "1:20", label: "Plan", text: "Option A: Techmart — 94%, 2-day, +3% price. Option B: Lagos Hub — 87%, 3-day, same price. Full rationale shown.", color: "#FB923C" },
              { time: "1:50", label: "Execute", text: "Click Approve. 3 MongoDB records updated. Vendor email sent. Decision log written. All in real time.", color: "#F87171" },
              { time: "2:20", label: "Verify + Close", text: "Resolution: 2m 47s, ₦54k cost delta, audit trail stored. \"Because your suppliers' problems shouldn't become your customers' problems.\"", color: "#34D399" },
            ].map((s, i) => (
              <div key={s.time} className="reveal flex gap-4" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-right w-12 flex-shrink-0 pt-1">
                  <span className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.time}</span>
                </div>
                <div className="glass-card rounded-xl p-4 flex-1 flex gap-3">
                  <div className="w-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div>
                    <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: s.color }}>{s.label}</div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{s.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="max-w-3xl mx-auto text-center">
          <div className="reveal glass-card rounded-3xl p-12 relative overflow-hidden">
            <div className="orb w-64 h-64 -top-16 -left-16" style={{ background: "rgba(37,99,235,0.15)" }} />
            <div className="orb w-48 h-48 -bottom-8 -right-8" style={{ background: "rgba(129,140,248,0.12)", animationDelay: "3s" }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl btn-glow flex items-center justify-center mx-auto mb-6 animate-pulse-ring">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: "var(--text)" }}>
                Ready to <span className="shimmer-text">win?</span>
              </h2>
              <p className="text-lg mb-8" style={{ color: "var(--text-muted)" }}>
                &ldquo;Because your suppliers&apos; problems shouldn&apos;t become your customers&apos; problems.&rdquo;
              </p>
              <Link href="/dashboard">
                <Button size="xl" className="gap-2 text-base">
                  <Zap className="w-5 h-5" />
                  Open SupplyPulse Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg btn-glow flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text)" }}>SupplyPulse</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>· AI Supply Chain Crisis Management</span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            MongoDB Track · Building Agents for Real-World Challenges · June 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
