"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Zap,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Database,
  Brain,
  Mail,
  Activity,
  Clock,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function AnimatedCounter({
  end, duration = 2000, prefix = "", suffix = "",
}: { end: number; duration?: number; prefix?: string; suffix?: string; }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number; pulse: number; }> = [];
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.5 + 0.1, pulse: Math.random() * Math.PI * 2 });
    }
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        const opacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${opacity})`; ctx.fill();
      });
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 120) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(16,185,129,${0.05 * (1 - dist / 120)})`; ctx.lineWidth = 1; ctx.stroke(); }
        });
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", handleResize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />;
}

const terminalLines = [
  { text: "[SENSE] Disruption detected: Supplier unavailability", color: "text-purple-400", delay: 0 },
  { text: "[DIAGNOSE] Querying MongoDB → 3 orders, ₦1,800,000 at risk", color: "text-yellow-400", delay: 700 },
  { text: "[MATCH] Running vector search on 30 supplier profiles...", color: "text-blue-400", delay: 1400 },
  { text: "[MATCH] → Techmart Supplies: 94% match score", color: "text-emerald-400", delay: 2000 },
  { text: "[MATCH] → Lagos Electronics Hub: 87% match score", color: "text-emerald-300", delay: 2200 },
  { text: "[PLAN] Recovery options ranked by lead time + cost delta", color: "text-orange-400", delay: 2700 },
  { text: "[EXECUTE] Operator approved → updating 3 order records...", color: "text-red-400", delay: 3400 },
  { text: "[EXECUTE] Vendor email sent via Resend API ✓", color: "text-emerald-400", delay: 3900 },
  { text: "[VERIFY] ✅ Resolved in 2m 47s | Cost delta: +₦54,000", color: "text-emerald-400", delay: 4500 },
];

function LiveTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [loop, setLoop] = useState(0);
  useEffect(() => {
    setVisibleLines(0);
    const timers = terminalLines.map((line, i) => setTimeout(() => setVisibleLines(i + 1), line.delay));
    const resetTimer = setTimeout(() => setLoop(l => l + 1), 6500);
    return () => { timers.forEach(clearTimeout); clearTimeout(resetTimer); };
  }, [loop]);
  return (
    <div className="glass-card rounded-xl overflow-hidden font-mono text-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-yellow-500/70" /><div className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-2 text-white/30 text-xs">supply-pulse agent — live</span>
        <div className="ml-auto flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400 text-xs">running</span></div>
      </div>
      <div className="p-4 space-y-1.5 min-h-[220px]">
        {terminalLines.slice(0, visibleLines).map((line, i) => (
          <div key={`${loop}-${i}`} className={`${line.color} text-xs leading-relaxed animate-slide-up`}><span className="text-white/20 mr-2">›</span>{line.text}</div>
        ))}
        {visibleLines < terminalLines.length && <div className="flex items-center gap-1 text-white/30 text-xs"><span>›</span><span className="inline-block w-2 h-3 bg-emerald-400/50 animate-pulse" /></div>}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, badge, delay = 0 }: { icon: React.ElementType; title: string; description: string; badge?: string; delay?: number; }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setTimeout(() => setVisible(true), delay); observer.disconnect(); } }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={`glass-card rounded-2xl p-6 transition-all duration-700 group hover:glow-border hover:scale-[1.02] cursor-default ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-white">{title}</h3>
        {badge && <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">{badge}</span>}
      </div>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen bg-[#020817] text-white overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-xl bg-[#020817]/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center animate-pulse-glow"><Activity className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-lg tracking-tight">SupplyPulse</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#stack" className="hover:text-white transition-colors">Tech Stack</a>
        </div>
        <Link href="/dashboard"><Button size="sm" variant="glow" className="gap-1.5">Open Dashboard <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-8 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Star className="w-3 h-3" />MongoDB Track · Hackathon: Building Agents for Real-World Challenges
          </div>
          <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none mb-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <span className="text-white">Your suppliers&apos; </span><br /><span className="shimmer-text">problems end here.</span>
          </h1>
          <p className={`text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            SupplyPulse is an AI agent that resolves Nigerian SME supply chain crises in under 3 minutes — powered by MongoDB vector search, Gemini reasoning, and autonomous execution.
          </p>
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Link href="/dashboard"><Button size="xl" variant="glow" className="gap-2 w-full sm:w-auto"><Zap className="w-5 h-5" />Launch Agent Dashboard</Button></Link>
            <a href="#how-it-works"><Button size="xl" variant="outline" className="gap-2 w-full sm:w-auto">See How It Works<ChevronRight className="w-4 h-4" /></Button></a>
          </div>
          <div className={`grid grid-cols-3 gap-6 max-w-lg mx-auto transition-all duration-700 delay-400 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {[{ label: "Avg. resolution", value: <AnimatedCounter end={3} suffix="min" /> }, { label: "Suppliers indexed", value: <AnimatedCounter end={30} suffix="+" /> }, { label: "Vector match acc.", value: <AnimatedCounter end={94} suffix="%" /> }].map(s => (
              <div key={s.label} className="text-center"><div className="text-2xl font-bold text-emerald-400">{s.value}</div><div className="text-xs text-white/30 mt-1">{s.label}</div></div>
            ))}
          </div>
        </div>
        <div className={`relative z-10 mt-16 w-full max-w-2xl mx-auto transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <LiveTerminal />
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-float">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-emerald-500/50" /><span className="text-xs">scroll</span>
        </div>
      </section>

      {/* Problem */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-3xl p-8 md:p-12 border border-red-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-6"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-sm font-medium text-red-400 uppercase tracking-wider">The Problem</span></div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">Nigerian SMEs lose <span className="text-red-400">15–30% of revenue</span> annually to supply chain disruptions.</h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-2xl">A supplier ghosts a ₦2.4M order. The response: 6 hours of panicked WhatsApp messages, spreadsheet hunting, re-typed emails, and guesswork. No audit trail. No speed. No intelligence.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[{ icon: AlertTriangle, label: "Stockouts discovered when customers complain" }, { icon: Database, label: "Supplier knowledge lives in one person's head" }, { icon: Mail, label: "Vendor emails re-drafted from scratch every crisis" }, { icon: Shield, label: "Zero decision audit trail for accountability" }].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10"><item.icon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><span className="text-xs text-white/50 leading-relaxed">{item.label}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-4"><Zap className="w-3 h-3" />6-Step Agent Loop</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">From crisis to resolved in <span className="shimmer-text">3 minutes.</span></h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              {[
                { step: "01", label: "SENSE", desc: "Operator describes the disruption in plain English. Agent classifies: stockout, late delivery, price spike, or unavailability.", color: "border-purple-500/50 text-purple-400 bg-purple-500/5" },
                { step: "02", label: "DIAGNOSE", desc: "Agent queries MongoDB to surface all affected orders, SKUs, quantities, and total ₦ value at risk.", color: "border-yellow-500/50 text-yellow-400 bg-yellow-500/5" },
                { step: "03", label: "MATCH", desc: "MongoDB Atlas Vector Search runs semantic similarity on supplier embeddings — returns top-3 alternatives with match scores.", color: "border-blue-500/50 text-blue-400 bg-blue-500/5" },
                { step: "04", label: "PLAN", desc: "Gemini reasons over matches and generates a ranked recovery plan with trade-offs: lead time, price delta, reliability score.", color: "border-orange-500/50 text-orange-400 bg-orange-500/5" },
                { step: "05", label: "EXECUTE", desc: "On operator approval: updates all order records in MongoDB, sends vendor email via Resend, logs the decision.", color: "border-red-500/50 text-red-400 bg-red-500/5" },
                { step: "06", label: "VERIFY", desc: "Resolution card: time-to-resolve, cost impact, chosen supplier, full audit trail stored in MongoDB.", color: "border-emerald-500/50 text-emerald-400 bg-emerald-500/5" },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${s.color}`}>{s.step}</div>
                  <div><div className="font-semibold text-white text-sm mb-1">{s.label}</div><div className="text-xs text-white/40 leading-relaxed">{s.desc}</div></div>
                </div>
              ))}
            </div>
            <div className="sticky top-24 space-y-4">
              <LiveTerminal />
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-3"><span className="text-xs text-white/40 font-medium uppercase tracking-wider">Resolution Summary</span><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
                <div className="space-y-2">
                  {[{ label: "Time to resolve", value: "2m 47s", color: "text-emerald-400" }, { label: "Supplier chosen", value: "Techmart Supplies", color: "text-blue-400" }, { label: "Match score", value: "94%", color: "text-emerald-400" }, { label: "Orders updated", value: "3 records", color: "text-white" }, { label: "Email sent", value: "✓ Delivered", color: "text-emerald-400" }, { label: "Additional cost", value: "₦54,000", color: "text-yellow-400" }].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0"><span className="text-xs text-white/40">{row.label}</span><span className={`text-xs font-medium ${row.color}`}>{row.value}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Every feature you need. Nothing you don&apos;t.</h2><p className="text-white/40 max-w-xl mx-auto">Built for a 5-day hackathon sprint. All MUST features shipped.</p></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: "Natural Language Intake", description: "Describe a disruption in plain English. The agent classifies and acts — no forms, no clicks.", badge: "F-01", delay: 0 },
              { icon: Database, title: "MongoDB Vector Search", description: "Semantic supplier matching using 768-dim embeddings. Finds the best alternative even with imperfect data.", badge: "F-03 · Core", delay: 100 },
              { icon: TrendingUp, title: "Ranked Recovery Plans", description: "Gemini reasons over matched suppliers and presents ranked options with trade-off rationale.", badge: "F-04", delay: 200 },
              { icon: Shield, title: "Human-in-the-Loop", description: "No write operations happen without operator approval. You stay in control. Always.", badge: "F-05", delay: 300 },
              { icon: Mail, title: "Auto Vendor Emails", description: "Professional vendor communications drafted and sent via Resend API on approval.", badge: "F-07", delay: 400 },
              { icon: Clock, title: "Full Audit Trail", description: "Every agent decision logged to MongoDB with timestamp, rationale, and operator ID.", badge: "F-08", delay: 500 },
            ].map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-3xl font-bold text-white mb-4">Built on the right stack.</h2><p className="text-white/40">Every tool chosen for a reason. No bloat.</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: "MongoDB Atlas + MCP", role: "Vector search + document ops", detail: "$vectorSearch on supplier embeddings is the core intelligence layer — not just a database.", color: "border-green-500/20 bg-green-500/5", dot: "bg-green-400" },
              { name: "Gemini 2.0 Flash", role: "Multi-step reasoning + function calling", detail: "Orchestrates the full 6-step plan loop with structured tool call chains.", color: "border-blue-500/20 bg-blue-500/5", dot: "bg-blue-400" },
              { name: "Next.js 14 / TypeScript", role: "Frontend + API routes", detail: "App router with server-side API routes. Type-safe end to end.", color: "border-white/10 bg-white/5", dot: "bg-white" },
              { name: "Resend API", role: "Automated vendor emails", detail: "Professional email delivery on approval. Fully logged in the audit trail.", color: "border-purple-500/20 bg-purple-500/5", dot: "bg-purple-400" },
            ].map(t => (
              <div key={t.name} className={`glass-card rounded-2xl p-6 border ${t.color} flex gap-4`}><div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${t.dot}`} /><div><div className="font-semibold text-white">{t.name}</div><div className="text-xs text-white/40 mb-2">{t.role}</div><div className="text-sm text-white/60 leading-relaxed">{t.detail}</div></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card rounded-3xl p-12 glow-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none rounded-3xl" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse-glow"><Activity className="w-8 h-8 text-emerald-400" /></div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to resolve your next crisis?</h2>
              <p className="text-white/50 mb-8 text-lg">&ldquo;Because your suppliers&apos; problems shouldn&apos;t become your customers&apos; problems.&rdquo;</p>
              <Link href="/dashboard"><Button size="xl" variant="glow" className="gap-2"><Zap className="w-5 h-5" />Open SupplyPulse Dashboard<ArrowRight className="w-5 h-5" /></Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center"><Activity className="w-3 h-3 text-white" /></div><span className="text-sm font-semibold">SupplyPulse</span><span className="text-white/30 text-sm">· AI Supply Chain Crisis Management</span></div>
          <div className="text-xs text-white/20">MongoDB Track · Building Agents for Real-World Challenges · June 2026</div>
        </div>
      </footer>
    </div>
  );
}

