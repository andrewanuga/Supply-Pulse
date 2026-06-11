"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Database,
  Home, BarChart3, MessageSquare, Send, Zap, Package,
  TrendingUp, Users, RefreshCw, ChevronRight, Loader2,
  ShieldCheck, Key, Settings2, BookOpen, ExternalLink, MapPin,
  Lightbulb, Sparkles, Search,
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
        style={{ background: "rgba(52,211,153,0.12)", color: "#34D399", border: "1px solid rgba(52,211,153,0.25)" }}>
        <MapPin className="w-2.5 h-2.5" /> MAPS LIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "rgba(37,99,235,0.1)", color: "var(--accent)", border: "1px solid rgba(37,99,235,0.2)" }}>
      <Database className="w-2.5 h-2.5" /> YOUR DB
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
      <div className="p-2 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
        <Link href="/pitch" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-[var(--bg-2)]"
          style={{ color: "var(--text-muted)" }}>
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span className="hidden lg:block">Pitch Deck</span>
        </Link>
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
const LOADING_PHASES = ["SENSE", "DIAGNOSE", "MATCH-DB", "MATCH-MAPS", "PLAN", "EXECUTE", "VERIFY"];

function ChatPanel() {
  const WELCOME: ChatMessage = {
    role: "assistant",
    content: "Hello! I'm SupplyPulse — your AI supply chain crisis agent.\n\nDescribe a disruption in plain English and I'll walk through all 7 steps automatically:\n\nSENSE → DIAGNOSE → MATCH-DB → MATCH-MAPS → PLAN → EXECUTE → VERIFY\n\nExample: \"Supplier Chukwuemeka Electronics has gone silent. I have 3 orders, 800 TV remotes needed by Friday.\"\n\nOr click a quick start below to try it now.",
    phase: "sense",
    timestamp: new Date(),
  };

  // Per-tab session ID — stored in sessionStorage so each browser tab gets its own chat history
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    let id = sessionStorage.getItem("sp_session_id");
    if (!id) {
      id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("sp_session_id", id);
    }
    return id;
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhaseIdx, setLoadingPhaseIdx] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | undefined>("sense");
  const [history, setHistory] = useState<Array<{ role: string; parts: Array<{ text: string }> }>>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Animate through phase labels while the agent is running
  useEffect(() => {
    if (!loading) { setLoadingPhaseIdx(0); return; }
    const interval = setInterval(() => setLoadingPhaseIdx((i) => (i + 1) % LOADING_PHASES.length), 900);
    return () => clearInterval(interval);
  }, [loading]);

  // Load chat history from MongoDB on mount — scoped to this browser tab's session
  useEffect(() => {
    if (historyLoaded) return;
    fetch("/api/chat-history", { headers: { "x-session-id": sessionId } })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          const restored: ChatMessage[] = data.messages.map((m: ChatMessage & { timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages([WELCOME, ...restored]);
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
      const saveHistory = (msgs: ChatMessage[]) => {
        fetch("/api/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-session-id": sessionId },
          body: JSON.stringify({ messages: msgs.slice(1) }), // skip welcome
        }).catch(() => {});
      };

      if (data.error) {
        const errEntry: ChatMessage = { role: "assistant", content: `⚠️ ${data.error}\n\nMake sure your API keys are set in .env.local`, timestamp: new Date() };
        setMessages((prev) => { const next = [...prev, errEntry]; saveHistory(next); return next; });
      } else {
        const assistantEntry: ChatMessage = {
          role: "assistant", content: data.message, phase: data.phase,
          mapsUsed: data.mapsUsed ?? false, timestamp: new Date(),
        };
        setMessages((prev) => { const next = [...prev, assistantEntry]; saveHistory(next); return next; });
        setCurrentPhase(data.phase);
        setHistory([...newHistory, { role: "model", parts: [{ text: data.message }] }]);
      }
    } catch (e) {
      const isJsonError = e instanceof SyntaxError || String(e).includes("JSON");
      const errMsg = isJsonError
        ? "Hmm, something went wrong on my end. 🔧\n\nThe server ran into an unexpected error — this usually means an API key isn't set up yet or the MongoDB connection dropped.\n\nQuick fixes to try:\n• Check that GOOGLE_API_KEY and GROQ_API_KEY are in your .env.local\n• Make sure MongoDB Atlas has your IP allowlisted\n• Restart the dev server and try again\n\nIf the problem persists, check the terminal running 'npm run dev' for the full error."
        : "I couldn't reach the server. 😕\n\nThis is usually a quick fix:\n• Make sure the dev server is still running (npm run dev)\n• Refresh the page and try again\n\nIf it keeps happening, check your .env.local file has all the required keys.";
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg, timestamp: new Date() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickPrompts = [
    { icon: AlertTriangle, label: "Supplier went silent", text: "Supplier Chukwuemeka Electronics has gone silent. 3 open orders, 800 TV remotes needed by Friday.", color: "#F87171" },
    { icon: Package, label: "Check at-risk orders", text: "Show me all current at-risk orders and total value at stake.", color: "#FBBF24" },
    { icon: Search, label: "Find suppliers", text: "Find me alternative electronics suppliers in Lagos.", color: "#60A5FA" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.2)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>SupplyPulse AI Agent</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Ready · Gemini + Llama 3.3 fallback</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg"
          style={{ background: "var(--bg-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          <Database className="w-3 h-3" /> MongoDB · Gmail
        </div>
      </div>

      {/* Phase progress bar */}
      <PhaseProgressBar currentPhase={currentPhase} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
              style={msg.role === "user"
                ? { background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                : { background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)", color: "var(--accent)" }}>
              {msg.role === "user" ? "You" : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            <div className={`flex flex-col gap-1.5 max-w-[84%] ${msg.role === "user" ? "items-end" : ""}`}>
              {/* Badges */}
              {msg.role === "assistant" && (msg.phase || msg.mapsUsed) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {msg.phase && <PhaseBadge phase={msg.phase} />}
                  {msg.mapsUsed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", color: "#34D399" }}>
                      <MapPin className="w-2.5 h-2.5" /> Google Maps used
                    </span>
                  )}
                </div>
              )}

              {/* Bubble */}
              <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={msg.role === "user"
                  ? { background: "rgba(37,99,235,0.15)", color: "var(--text)", border: "1px solid rgba(37,99,235,0.25)", borderTopRightRadius: "6px" }
                  : { background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)", borderTopLeftRadius: "6px" }}>
                {msg.content}
              </div>

              {/* Timestamp */}
              <span className="text-[11px] px-1" style={{ color: "var(--text-muted)", opacity: 0.45 }}>
                {msg.timestamp.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-3 glass-card">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: "var(--accent)" }} />
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(37,99,235,0.1)", color: "var(--accent)" }}>
                  {LOADING_PHASES[loadingPhaseIdx]}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>running agent loop…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — only shown before first message */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"
            style={{ color: "var(--text-muted)" }}>
            <Lightbulb className="w-3 h-3" /> Try one of these to get started:
          </p>
          <div className="grid gap-2">
            {quickPrompts.map((p) => (
              <button key={p.label} onClick={() => { setInput(p.text); inputRef.current?.focus(); }}
                className="flex items-start gap-3 text-left px-3.5 py-3 rounded-xl transition-all duration-200 group hover:scale-[1.01]"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = p.color + "60")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: p.color + "15", border: `1px solid ${p.color}30` }}>
                  <p.icon className="w-3 h-3" style={{ color: p.color }} />
                </div>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--text)" }}>{p.label}</div>
                  <div className="text-xs leading-relaxed line-clamp-1" style={{ color: "var(--text-muted)" }}>{p.text}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="e.g. My supplier hasn't responded in 3 days, I have orders due Friday…"
              className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              disabled={loading} />
          </div>
          <Button onClick={sendMessage} disabled={loading || !input.trim()}
            className="rounded-2xl px-4 h-[46px] flex-shrink-0 gap-1.5">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Send className="w-3.5 h-3.5" /><span className="text-xs hidden sm:inline">Send</span></>}
          </Button>
        </div>
        <p className="text-[11px] mt-2 px-1" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Press Enter to send · The agent will guide you through all 7 steps
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard overview ───────────────────────────────────────────────────────
function DashboardOverview({
  stats, orders, logs, loading, onRefresh,
}: {
  stats: DashboardStats; orders: Order[]; logs: DecisionLog[];
  loading: boolean; onRefresh: () => void;
}) {
  const atRisk = orders.filter((o) => o.status === "at_risk" || o.status === "pending");
  const totalAtRisk = atRisk.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);
  const totalValue = orders.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={AlertTriangle} label="Active disruptions"
          value={orders.length === 0 ? "—" : stats.activeDisruptions}
          sub={orders.length === 0 ? "Seed data to see live stats" : "Needs attention"}
          accentColor="#F87171" pulse={stats.activeDisruptions > 0} />
        <KPICard icon={CheckCircle2} label="Resolved total"
          value={orders.length === 0 ? "—" : stats.resolvedCount}
          sub={orders.length === 0 ? "Run the AI agent to resolve" : "Decision audit logged"}
          accentColor="#34D399" />
        <KPICard icon={Clock} label="Avg resolve time"
          value={orders.length === 0 ? "—" : `${stats.avgResolveTimeMins}min`}
          sub={orders.length === 0 ? "vs. 6hr+ manual process" : "vs. 6hr manual"}
          accentColor="#60A5FA" />
        <KPICard icon={TrendingUp} label="At-risk value"
          value={orders.length === 0 ? "—" : formatNaira(totalAtRisk)}
          sub={orders.length === 0 ? "Open + at-risk orders" : "Open + at-risk orders"}
          accentColor="#FBBF24" />
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
                    <Database className="w-3 h-3" />
                    YOUR DB — {dbCount} ({dbPct}%)
                  </span>
                  <span className="flex items-center gap-1" style={{ color: "#34D399" }}>
                    <MapPin className="w-3 h-3" />
                    MAPS LIVE — {mapsCount} ({mapsPct}%)
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, oRes] = await Promise.all([fetch("/api/disruptions"), fetch("/api/orders")]);
      const dData = await dRes.json();
      const oData = await oRes.json();
      if (dData.stats) setStats(dData.stats);
      if (dData.recentLogs) setLogs(dData.recentLogs);
      if (oData.orders) setOrders(oData.orders);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
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
            onRefresh={fetchData}
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
