"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Database,
  Home, BarChart3, MessageSquare, Send, Zap, Package,
  TrendingUp, Users, RefreshCw, ChevronRight, Loader2,
  ShieldCheck, Key, Settings2, BookOpen, ExternalLink, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { formatNaira } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  phase?: string;
  mapsUsed?: boolean;
  timestamp: Date;
}

interface DashboardStats {
  resolvedCount: number;
  avgResolveTimeMins: number;
  activeDisruptions: number;
}

interface Order {
  _id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  supplier_name: string;
  status: string;
  deadline: string;
}

interface DecisionLog {
  _id: string;
  disruption_type: string;
  original_supplier_name: string;
  chosen_supplier_name: string;
  chosen_source?: string;
  maps_results_used?: boolean;
  time_to_resolve_mins: number;
  time_to_resolve_s?: number;
  additional_cost_ngn: number;
  cost_delta_ngn?: number;
  match_score?: number;
  created_at: string;
}

// ─── Phase config ─────────────────────────────────────────────────────────────
const PHASES = [
  { key: "sense", label: "SENSE", color: "#818CF8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.25)" },
  { key: "diagnose", label: "DIAGNOSE", color: "#FBBF24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
  { key: "match", label: "MATCH", color: "#60A5FA", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.25)" },
  { key: "plan", label: "PLAN", color: "#FB923C", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.25)" },
  { key: "execute", label: "EXECUTE", color: "#F87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" },
  { key: "verify", label: "VERIFY", color: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
];

function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null;
  const p = PHASES.find((x) => x.key === phase);
  if (!p) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border"
      style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.color }}>
      {p.label}
    </span>
  );
}

function PhaseProgressBar({ currentPhase }: { currentPhase?: string }) {
  const idx = PHASES.findIndex((p) => p.key === currentPhase);
  if (idx < 0) return null;
  return (
    <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => (
          <div key={p.key} className="flex items-center gap-1 flex-1">
            <div className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{ background: i <= idx ? p.color : "var(--border)" }} />
            {i === PHASES.length - 1 && (
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: i <= idx ? p.bg : "transparent", border: `1px solid ${i <= idx ? p.border : "var(--border)"}` }}>
                <span className="text-[8px] font-bold" style={{ color: i <= idx ? p.color : "var(--text-muted)" }}>{i + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {PHASES.map((p, i) => (
          <span key={p.key} className="text-[9px] font-bold uppercase"
            style={{ color: i <= idx ? p.color : "var(--text-muted)", opacity: i <= idx ? 1 : 0.4 }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon, label, value, sub, accentColor, pulse,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; accentColor: string; pulse?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-start gap-4 hover:glow-border transition-all duration-300 relative overflow-hidden group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
        <Icon className="w-5 h-5" style={{ color: accentColor }} />
        {pulse && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
        {sub && <div className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>{sub}</div>}
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-tl-full opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ background: accentColor }} />
    </div>
  );
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ order }: { order: Order }) {
  const totalValue = order.quantity * order.unit_price;
  const statusConfig: Record<string, { bg: string; color: string; border: string }> = {
    pending: { bg: "rgba(251,191,36,0.1)", color: "#FBBF24", border: "rgba(251,191,36,0.2)" },
    at_risk: { bg: "rgba(248,113,113,0.1)", color: "#F87171", border: "rgba(248,113,113,0.2)" },
    rerouted: { bg: "rgba(59,130,246,0.1)", color: "#60A5FA", border: "rgba(59,130,246,0.2)" },
    fulfilled: { bg: "rgba(52,211,153,0.1)", color: "#34D399", border: "rgba(52,211,153,0.2)" },
  };
  const sc = statusConfig[order.status] || { bg: "rgba(148,163,184,0.1)", color: "var(--text-muted)", border: "var(--border)" };
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-[var(--bg-2)] rounded-lg px-2 -mx-2 transition-colors"
      style={{ borderColor: "var(--border-2)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--bg-2)" }}>
        <Package className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{order.product_name}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{order.sku} · {order.supplier_name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{formatNaira(totalValue)}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Qty: {order.quantity.toLocaleString()}</div>
      </div>
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0"
        style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
        {order.status}
      </span>
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  if (source === "google_maps") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
        style={{ background: "rgba(251,191,36,0.12)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.25)" }}>
        🗺 MAPS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "rgba(37,99,235,0.1)", color: "var(--accent)", border: "1px solid rgba(37,99,235,0.2)" }}>
      🗄 DB
    </span>
  );
}

// ─── Log row ──────────────────────────────────────────────────────────────────
function LogRow({ log }: { log: DecisionLog }) {
  const typeColor: Record<string, string> = {
    stockout: "#F87171", late: "#FBBF24", price_spike: "#FB923C", unavailable: "#818CF8",
  };
  const costDelta = log.cost_delta_ngn ?? log.additional_cost_ngn ?? 0;
  const resolveTime = log.time_to_resolve_s
    ? `${Math.floor(log.time_to_resolve_s / 60)}m ${log.time_to_resolve_s % 60}s`
    : log.time_to_resolve_mins
    ? `${log.time_to_resolve_mins}min`
    : null;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--border-2)" }}>
      <div className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: "#34D399" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase" style={{ color: typeColor[log.disruption_type] || "var(--text-muted)" }}>
            {log.disruption_type}
          </span>
          <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{log.chosen_supplier_name}</span>
          <SourceBadge source={log.chosen_source} />
          {log.maps_results_used && log.chosen_source !== "google_maps" && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>maps checked</span>
          )}
        </div>
        <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--text-muted)" }}>
          <span>from: {log.original_supplier_name}</span>
          {resolveTime && <span>· {resolveTime}</span>}
          {log.match_score && <span>· {Math.round(log.match_score * 100)}% match</span>}
          {costDelta > 0 && <span className="text-yellow-400">· +{formatNaira(costDelta)}</span>}
          {costDelta < 0 && <span className="text-green-400">· {formatNaira(costDelta)}</span>}
        </div>
      </div>
      <div className="flex-shrink-0 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
        {new Date(log.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

// ─── Setup guide ──────────────────────────────────────────────────────────────
function SetupGuide({ onSeed, seeded }: { onSeed: () => void; seeded: boolean }) {
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedDone, setSeedDone] = useState(seeded);
  const [seedError, setSeedError] = useState("");

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedError("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) { setSeedDone(true); onSeed(); }
      else setSeedError(data.error || "Failed");
    } catch (e) { setSeedError(String(e)); }
    finally { setSeedLoading(false); }
  };

  const steps = [
    {
      n: 1, icon: Key, title: "Configure API Keys",
      desc: "Add MONGODB_URI, GOOGLE_API_KEY, GOOGLE_MAPS_API_KEY, and RESEND_API_KEY to .env.local. Get Maps key at console.cloud.google.com → enable Places API.",
      action: null,
      done: true,
      link: { label: "Google Maps Console", href: "https://console.cloud.google.com/apis/library/places-backend.googleapis.com" },
    },
    {
      n: 2, icon: Database, title: "Seed Demo Data",
      desc: "Load 15 suppliers + 7 orders into MongoDB Atlas. For real vector search use scripts/seed.py (generates real 768-dim embeddings).",
      done: seedDone,
      action: () => handleSeed(),
      actionLabel: seedLoading ? "Seeding…" : "Seed Now",
      loading: seedLoading,
    },
    {
      n: 3, icon: Settings2, title: "Create Atlas Vector Index",
      desc: 'Atlas UI → your cluster → Search → Create Index. Collection: suppliers, field: profile_embedding, 768 dims, cosine. Name: supplier_vector_index.',
      done: false,
      link: { label: "Atlas Search Docs", href: "https://www.mongodb.com/docs/atlas/atlas-search/" },
    },
    {
      n: 4, icon: MapPin, title: "Test Google Maps Fallback",
      desc: "In the AI Agent: type a disruption. After DB results, the agent calls Maps Places API for live businesses near you. Watch the [MAPS LIVE] badges appear.",
      done: false,
      link: null,
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 mb-6" style={{ borderColor: "rgba(37,99,235,0.2)", background: "rgba(37,99,235,0.03)" }}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Setup Guide</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.1)", color: "var(--accent)", border: "1px solid rgba(37,99,235,0.2)" }}>
          4 steps to go live
        </span>
      </div>
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.n} className="flex items-start gap-3 p-3 rounded-xl transition-colors"
            style={{ background: s.done ? "rgba(52,211,153,0.05)" : "var(--bg-2)", border: `1px solid ${s.done ? "rgba(52,211,153,0.15)" : "var(--border)"}` }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: s.done ? "rgba(52,211,153,0.15)" : "rgba(37,99,235,0.1)", border: `1px solid ${s.done ? "rgba(52,211,153,0.3)" : "rgba(37,99,235,0.2)"}` }}>
              {s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{s.n}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{s.title}</span>
                {s.done && <span className="text-xs text-green-400">✓ Done</span>}
              </div>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              {seedError && s.n === 2 && <p className="text-xs text-red-400 mt-1">{seedError}</p>}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {s.action && !s.done && (
                <Button size="sm" onClick={s.action} disabled={s.loading} className="text-xs gap-1">
                  {s.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                  {s.actionLabel}
                </Button>
              )}
              {s.link && (
                <a href={s.link.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--accent)" }}>
                  {s.link.label} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  const navItems = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "chat", icon: MessageSquare, label: "AI Agent" },
    { id: "orders", icon: Package, label: "Orders" },
    { id: "logs", icon: Database, label: "Audit Logs" },
  ];
  return (
    <div className="w-16 lg:w-56 flex-shrink-0 glass border-r flex flex-col h-full" style={{ borderColor: "var(--border)" }}>
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg btn-glow flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="hidden lg:block font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>SupplyPulse</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
            style={active === item.id
              ? { background: "rgba(37,99,235,0.1)", color: "var(--accent)", border: "1px solid rgba(37,99,235,0.2)" }
              : { color: "var(--text-muted)", border: "1px solid transparent" }}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-[var(--bg-2)]"
          style={{ color: "var(--text-muted)" }}>
          <Home className="w-4 h-4 flex-shrink-0" />
          <span className="hidden lg:block">Home</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────
function ChatPanel() {
  const WELCOME: ChatMessage = {
    role: "assistant",
    content: "Hello! I'm SupplyPulse — your AI supply chain crisis agent.\n\nI can:\n• Detect and diagnose disruptions in real time\n• Run MongoDB $vectorSearch to find the best alternative suppliers\n• Generate ranked recovery plans (Option A/B/C)\n• Execute with your approval — updating records + sending vendor emails\n• Store every decision in your audit trail\n\nTry the quick starts below, or describe a disruption in your own words.",
    phase: "sense",
    timestamp: new Date(),
  };
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | undefined>("sense");
  const [history, setHistory] = useState<Array<{ role: string; parts: Array<{ text: string }> }>>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from MongoDB on mount
  useEffect(() => {
    if (historyLoaded) return;
    fetch("/api/chat-history")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          // Restore timestamps as Date objects
          const restored: ChatMessage[] = data.messages.map((m: ChatMessage & { timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages([WELCOME, ...restored]);
          // Rebuild agent history from restored messages (skip welcome)
          const agentHistory = restored.map((m: ChatMessage) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
          setHistory(agentHistory);
          if (restored.length > 0) {
            const lastPhase = restored.filter((m) => m.phase).pop()?.phase;
            if (lastPhase) setCurrentPhase(lastPhase);
          }
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const userEntry: ChatMessage = { role: "user", content: userMsg, timestamp: new Date() };
    setMessages((prev) => [...prev, userEntry]);
    setLoading(true);
    const newHistory = [...history, { role: "user", parts: [{ text: userMsg }] }];
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json();
      if (data.error) {
        const errEntry: ChatMessage = { role: "assistant", content: `⚠️ ${data.error}\n\nMake sure your API keys are set in .env.local`, timestamp: new Date() };
        setMessages((prev) => [...prev, errEntry]);
        // Persist even error messages so user sees them on reload
        setMessages((cur) => {
          const nonWelcome = cur.slice(1);
          fetch("/api/chat-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: nonWelcome }),
          }).catch(() => {});
          return cur;
        });
      } else {
        const assistantEntry: ChatMessage = {
          role: "assistant", content: data.message, phase: data.phase,
          mapsUsed: data.mapsUsed ?? false, timestamp: new Date(),
        };
        setMessages((prev) => {
          const updated = [...prev, assistantEntry];
          // Save to MongoDB (skip the welcome message at index 0)
          const toSave = updated.slice(1);
          fetch("/api/chat-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: toSave }),
          }).catch(() => {});
          return updated;
        });
        setCurrentPhase(data.phase);
        setHistory([...newHistory, { role: "model", parts: [{ text: data.message }] }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Make sure your .env.local is configured and the dev server is running.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickPrompts = [
    "Supplier Chukwuemeka Electronics has gone silent. 3 open orders, 800 TV remotes needed by Friday.",
    "Show me all current at-risk orders and total value at stake.",
    "Find me alternative electronics suppliers in Lagos.",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
            <Zap className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>SupplyPulse Agent</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs" style={{ color: "var(--accent)" }}>online · Google Gemini 2.0 Flash</span>
            </div>
          </div>
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>MongoDB $vectorSearch · Gmail</div>
      </div>

      {/* Phase progress bar */}
      <PhaseProgressBar currentPhase={currentPhase} />

      {/* Guidance banner */}
      <div className="mx-4 mt-3 p-3 rounded-xl flex items-start gap-2 text-xs"
        style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}>
        <span style={{ color: "var(--accent)" }}>💡</span>
        <span style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--accent)" }}>Tip:</strong> Describe a disruption naturally — supplier name, product, urgency. The agent will SENSE → DIAGNOSE → MATCH → PLAN → EXECUTE → VERIFY automatically.
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={msg.role === "user"
                ? { background: "var(--bg-2)", border: "1px solid var(--border)" }
                : { background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}>
              {msg.role === "user"
                ? <Users className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                : <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />}
            </div>
            <div className={`flex flex-col gap-1 max-w-[82%] ${msg.role === "user" ? "items-end" : ""}`}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {msg.role === "assistant" && msg.phase && <PhaseBadge phase={msg.phase} />}
                {msg.role === "assistant" && msg.mapsUsed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                    style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#FBBF24" }}>
                    <MapPin className="w-2.5 h-2.5" /> Maps used
                  </span>
                )}
              </div>
              <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={msg.role === "user"
                  ? { background: "rgba(37,99,235,0.15)", color: "var(--text)", border: "1px solid rgba(37,99,235,0.2)", borderTopRightRadius: 4 }
                  : { background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)", borderTopLeftRadius: 4 }}>
                {msg.content}
              </div>
              <span className="text-xs px-1" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                {msg.timestamp.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 glass-card">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Agent reasoning…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 space-y-2">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Quick starts — click to use:</p>
          {quickPrompts.map((p) => (
            <button key={p} onClick={() => setInput(p)}
              className="w-full text-left text-xs px-3 py-2.5 rounded-xl transition-all duration-200 hover:border-[var(--accent)]"
              style={{ background: "var(--bg-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--accent)" }}>› </span>{p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Describe a supply chain disruption…"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all"
            style={{
              background: "var(--bg-2)", border: "1px solid var(--border)",
              color: "var(--text)", outline: "none",
            }}
            disabled={loading} />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" className="flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard overview ───────────────────────────────────────────────────────
function DashboardOverview({
  stats, orders, logs, loading, onRefresh, showSetup, onSeed, seeded,
}: {
  stats: DashboardStats; orders: Order[]; logs: DecisionLog[];
  loading: boolean; onRefresh: () => void; showSetup: boolean;
  onSeed: () => void; seeded: boolean;
}) {
  const atRisk = orders.filter((o) => o.status === "at_risk" || o.status === "pending");
  const totalAtRisk = atRisk.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);
  const totalValue = orders.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);

  return (
    <div className="space-y-6">
      {showSetup && <SetupGuide onSeed={onSeed} seeded={seeded} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={AlertTriangle} label="Active disruptions" value={stats.activeDisruptions}
          sub="Needs attention" accentColor="#F87171" pulse={stats.activeDisruptions > 0} />
        <KPICard icon={CheckCircle2} label="Resolved total" value={stats.resolvedCount}
          sub="Decision audit logged" accentColor="#34D399" />
        <KPICard icon={Clock} label="Avg resolve time" value={`${stats.avgResolveTimeMins}min`}
          sub="vs. 6hr manual" accentColor="#60A5FA" />
        <KPICard icon={TrendingUp} label="At-risk value" value={formatNaira(totalAtRisk)}
          sub="Open + at-risk orders" accentColor="#FBBF24" />
      </div>

      {/* Main grid */}
      <div className="grid xl:grid-cols-2 gap-6">
        {/* Orders */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Active Orders</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}>{orders.length}</span>
            </div>
            <button onClick={onRefresh} className="transition-colors" style={{ color: "var(--text-muted)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="space-y-0">
            {orders.slice(0, 7).map((o) => <OrderRow key={o._id} order={o} />)}
            {orders.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Package className="w-8 h-8 mx-auto" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No orders yet.</p>
                <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Use the Setup Guide above to seed demo data (15 suppliers + 7 orders).
                </p>
              </div>
            )}
          </div>
          {totalValue > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Total portfolio value</span>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{formatNaira(totalValue)}</span>
            </div>
          )}
        </div>

        {/* Audit logs */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Decision Audit Trail</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}>{logs.length}</span>
            </div>
            <ShieldCheck className="w-3.5 h-3.5 text-green-400 opacity-50" />
          </div>
          {logs.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No decisions logged yet.</p>
              <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                Complete a disruption resolution in the AI Agent tab — every decision is recorded here.
              </p>
            </div>
          )}
          {logs.slice(0, 8).map((log) => <LogRow key={log._id} log={log} />)}
        </div>
      </div>

      {/* Performance stats */}
      {logs.length > 0 && (() => {
        const mapsCount = logs.filter((l) => l.chosen_source === "google_maps" || l.maps_results_used).length;
        const dbCount = logs.length - mapsCount;
        const mapsPct = Math.round((mapsCount / logs.length) * 100);
        const dbPct = 100 - mapsPct;
        return (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Resolution Performance</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Avg. Resolve Time", value: `${stats.avgResolveTimeMins}min`, color: "#60A5FA" },
                { label: "Disruptions Resolved", value: stats.resolvedCount, color: "#34D399" },
                { label: "Orders Total", value: orders.length, color: "var(--text)" },
                { label: "AI Decisions Made", value: logs.length, color: "#818CF8" },
              ].map((m) => (
                <div key={m.label} className="text-center p-4 rounded-xl" style={{ background: "var(--bg-2)" }}>
                  <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{m.label}</div>
                </div>
              ))}
            </div>
            {/* F-12: Maps vs DB source breakdown */}
            <div className="rounded-xl p-4" style={{ background: "var(--bg-2)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Supplier Source Breakdown (F-12)</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1" style={{ color: "#60A5FA" }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#60A5FA" }} />
                    🗄 Your DB — {dbCount} ({dbPct}%)
                  </span>
                  <span className="flex items-center gap-1" style={{ color: "#FBBF24" }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#FBBF24" }} />
                    🗺 Maps Live — {mapsCount} ({mapsPct}%)
                  </span>
                </div>
              </div>
              <div className="flex rounded-full overflow-hidden h-2.5" style={{ background: "var(--border)" }}>
                <div className="h-full transition-all duration-500" style={{ width: `${dbPct}%`, background: "linear-gradient(90deg,#2563EB,#60A5FA)" }} />
                <div className="h-full transition-all duration-500" style={{ width: `${mapsPct}%`, background: "linear-gradient(90deg,#F59E0B,#FBBF24)" }} />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                {mapsPct > 0
                  ? `${mapsPct}% of resolutions used Google Maps fallback — helping you discover new suppliers.`
                  : "All resolutions used your own supplier DB — great network coverage!"}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Seed button (topbar) ─────────────────────────────────────────────────────
function TopbarSeedButton({ onSeeded }: { onSeeded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const seed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) { setDone(true); onSeeded(); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  if (done) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-green-400"
      style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
      <CheckCircle2 className="w-3.5 h-3.5" /> Seeded
    </div>
  );
  return (
    <Button size="sm" variant="outline" onClick={seed} disabled={loading} className="gap-1.5 text-xs">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
      {loading ? "Seeding…" : "Seed Data"}
    </Button>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────
// Auth is temporarily disabled — this is a static placeholder account chip.
// When auth is re-added, restore the session-driven menu with a Sign out action.
function UserMenu() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "rgba(37,99,235,0.2)", color: "var(--accent)" }}
      >
        SP
      </div>
      <span className="hidden sm:block text-xs font-medium" style={{ color: "var(--text)" }}>
        Demo
      </span>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [active, setActive] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats>({ resolvedCount: 0, avgResolveTimeMins: 0, activeDisruptions: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, oRes] = await Promise.all([fetch("/api/disruptions"), fetch("/api/orders")]);
      const dData = await dRes.json();
      const oData = await oRes.json();
      if (dData.stats) setStats(dData.stats);
      if (dData.recentLogs) setLogs(dData.recentLogs);
      if (oData.orders) {
        setOrders(oData.orders);
        if (oData.orders.length > 0) setShowSetup(false);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, seeded]);
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabLabel: Record<string, string> = {
    dashboard: "Dashboard",
    chat: "AI Agent",
    orders: "Orders",
    logs: "Audit Logs",
  };

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return (
          <DashboardOverview
            stats={stats} orders={orders} logs={logs} loading={loading}
            onRefresh={fetchData} showSetup={showSetup}
            onSeed={() => { setSeeded(true); fetchData(); setShowSetup(false); }}
            seeded={seeded}
          />
        );
      case "chat":
        return <div className="h-full"><ChatPanel /></div>;
      case "orders":
        return (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>All Orders</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}>{orders.length}</span>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <Package className="w-12 h-12 mx-auto" style={{ color: "var(--text-muted)", opacity: 0.2 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No orders yet.</p>
                <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Go to Dashboard → Setup Guide → Seed Demo Data.</p>
              </div>
            )}
            {orders.map((o) => <OrderRow key={o._id} order={o} />)}
          </div>
        );
      case "logs":
        return (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Full Decision Audit Trail</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}>{logs.length}</span>
            </div>
            {logs.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <ShieldCheck className="w-12 h-12 mx-auto" style={{ color: "var(--text-muted)", opacity: 0.2 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No audit logs yet.</p>
                <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Resolve a disruption in the AI Agent tab — every decision is recorded here automatically.
                </p>
                <Button size="sm" onClick={() => setActive("chat")} className="gap-1.5 mt-2">
                  <Zap className="w-3.5 h-3.5" /> Open AI Agent
                </Button>
              </div>
            )}
            {logs.map((log) => <LogRow key={log._id} log={log} />)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar active={active} setActive={setActive} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0 glass"
          style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <div>
              <h1 className="text-sm font-semibold capitalize" style={{ color: "var(--text)" }}>
                {tabLabel[active] || active}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>MongoDB Atlas · Gemini · Google Maps</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
            <TopbarSeedButton onSeeded={() => { setSeeded(true); fetchData(); }} />
            <Button size="sm" variant="ghost" onClick={fetchData} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setActive("chat")} className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Agent</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${active === "chat" ? "flex flex-col" : "p-6"}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
