"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Home,
  BarChart3,
  MessageSquare,
  Send,
  Zap,
  Package,
  TrendingUp,
  Users,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira, getStatusColor } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  phase?: string;
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
  time_to_resolve_mins: number;
  additional_cost_ngn: number;
  created_at: string;
}

// ─── Agent phase badge ────────────────────────────────────────────────────────
function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null;
  const map: Record<string, { label: string; cls: string }> = {
    sense: { label: "SENSE", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    diagnose: { label: "DIAGNOSE", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    match: { label: "MATCH", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    plan: { label: "PLAN", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    execute: { label: "EXECUTE", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
    verify: { label: "VERIFY", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };
  const config = map[phase] || { label: phase.toUpperCase(), cls: "bg-white/10 text-white/50 border-white/10" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${config.cls}`}>
      {config.label}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  pulse,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-start gap-4 hover:glow-border transition-all duration-300 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
        {pulse && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-white/40 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ order }: { order: Order }) {
  const totalValue = order.quantity * order.unit_price;
  const statusClasses: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    at_risk: "bg-red-500/10 text-red-400 border-red-500/20",
    rerouted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    fulfilled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/2 rounded-lg px-2 -mx-2 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{order.product_name}</div>
        <div className="text-xs text-white/30">{order.sku} · {order.supplier_name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium text-white">{formatNaira(totalValue)}</div>
        <div className="text-xs text-white/30">Qty: {order.quantity.toLocaleString()}</div>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${statusClasses[order.status] || "bg-white/5 text-white/40 border-white/10"}`}>
        {order.status}
      </span>
    </div>
  );
}

// ─── Log row ──────────────────────────────────────────────────────────────────
function LogRow({ log }: { log: DecisionLog }) {
  const typeColor: Record<string, string> = {
    stockout: "text-red-400",
    late: "text-yellow-400",
    price_spike: "text-orange-400",
    unavailable: "text-purple-400",
  };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase ${typeColor[log.disruption_type] || "text-white/50"}`}>{log.disruption_type}</span>
          <ChevronRight className="w-3 h-3 text-white/20" />
          <span className="text-xs text-white/60 truncate">{log.chosen_supplier_name}</span>
        </div>
        <div className="text-xs text-white/30 mt-0.5">
          from: {log.original_supplier_name} · {log.time_to_resolve_mins}min
          {log.additional_cost_ngn > 0 && ` · +${formatNaira(log.additional_cost_ngn)}`}
        </div>
      </div>
      <div className="flex-shrink-0 text-xs text-white/20">
        {new Date(log.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  active,
  setActive,
}: {
  active: string;
  setActive: (v: string) => void;
}) {
  const navItems = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "chat", icon: MessageSquare, label: "AI Agent" },
    { id: "orders", icon: Package, label: "Orders" },
    { id: "logs", icon: Database, label: "Audit Logs" },
  ];
  return (
    <div className="w-16 lg:w-56 flex-shrink-0 glass border-r border-white/5 flex flex-col h-full">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="hidden lg:block font-bold text-sm tracking-tight">SupplyPulse</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              active === item.id
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-2 border-t border-white/5">
        <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-200">
          <Home className="w-4 h-4 flex-shrink-0" />
          <span className="hidden lg:block">Home</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────
function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm SupplyPulse. I can help you resolve supply chain disruptions in under 3 minutes.\n\nTry saying: *\"Supplier Chukwuemeka Electronics has gone silent. We have 3 open orders for TV remotes — 800 units needed by Friday.\"*\n\nOr ask me to diagnose your current at-risk orders.",
      phase: "sense",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ role: string; parts: Array<{ text: string }> }>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const newUserMsg: ChatMessage = { role: "user", content: userMsg, timestamp: new Date() };
    setMessages((prev) => [...prev, newUserMsg]);
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
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}`, timestamp: new Date() }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message, phase: data.phase, timestamp: new Date() }]);
        setHistory([...newHistory, { role: "model", parts: [{ text: data.message }] }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Make sure your API keys are configured.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const quickPrompts = [
    "Supplier Chukwuemeka Electronics has gone silent. 3 open orders, 800 TV remotes needed by Friday.",
    "Show me all current at-risk orders and total value at stake.",
    "Find me alternative electronics suppliers in Lagos.",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">SupplyPulse Agent</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-emerald-400">online</span></div>
          </div>
        </div>
        <div className="text-xs text-white/20">Gemini 2.0 Flash · MongoDB MCP</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === "user" ? "bg-white/10" : "bg-emerald-500/20 border border-emerald-500/30"}`}>
              {msg.role === "user" ? <Users className="w-3.5 h-3.5 text-white/60" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
              {msg.role === "assistant" && msg.phase && <PhaseBadge phase={msg.phase} />}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-emerald-500/20 text-white border border-emerald-500/20 rounded-tr-sm"
                  : "glass-card text-white/80 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              <span className="text-xs text-white/20 px-1">
                {msg.timestamp.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-sm text-white/40">Agent reasoning...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 space-y-2">
          <p className="text-xs text-white/30 font-medium">Quick starts:</p>
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="w-full text-left text-xs text-white/50 bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl px-3 py-2 transition-colors truncate"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe a supply chain disruption..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:bg-white/7 transition-all"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" variant="glow" className="flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard overview ───────────────────────────────────────────────────────
function DashboardOverview({
  stats,
  orders,
  logs,
  loading,
  onRefresh,
}: {
  stats: DashboardStats;
  orders: Order[];
  logs: DecisionLog[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const atRisk = orders.filter((o) => o.status === "at_risk" || o.status === "pending");
  const totalAtRisk = atRisk.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);
  const totalValue = orders.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={AlertTriangle} label="Active disruptions" value={stats.activeDisruptions} sub="Needs attention" color="bg-red-500/10 text-red-400" />
        <KPICard icon={CheckCircle2} label="Resolved total" value={stats.resolvedCount} sub="Decision audit logged" color="bg-emerald-500/10 text-emerald-400" />
        <KPICard icon={Clock} label="Avg resolve time" value={`${stats.avgResolveTimeMins}min`} sub="vs. 6hr manual" color="bg-blue-500/10 text-blue-400" />
        <KPICard icon={TrendingUp} label="At-risk value" value={formatNaira(totalAtRisk)} sub="Open + at-risk orders" color="bg-yellow-500/10 text-yellow-400" />
      </div>

      {/* Main grid */}
      <div className="grid xl:grid-cols-2 gap-6">
        {/* Orders */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-white/40" />
              <span className="text-sm font-semibold text-white">Active Orders</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs">{orders.length}</span>
            </div>
            <button onClick={onRefresh} className="text-white/30 hover:text-white/60 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="space-y-0">
            {orders.slice(0, 7).map((o) => <OrderRow key={o._id} order={o} />)}
            {orders.length === 0 && (
              <div className="text-center py-8 text-white/20 text-sm">
                No orders yet. <button onClick={onRefresh} className="text-emerald-400 underline">Seed demo data</button> first.
              </div>
            )}
          </div>
          {totalValue > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-white/30">Total portfolio value</span>
              <span className="text-sm font-bold text-white">{formatNaira(totalValue)}</span>
            </div>
          )}
        </div>

        {/* Audit logs */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-white/40" />
              <span className="text-sm font-semibold text-white">Decision Audit Trail</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs">{logs.length}</span>
            </div>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/50" />
          </div>
          <div className="space-y-0">
            {logs.slice(0, 8).map((log) => <LogRow key={log._id} log={log} />)}
            {logs.length === 0 && (
              <div className="text-center py-8 text-white/20 text-sm">No decisions logged yet. Start a disruption resolution in the Agent chat.</div>
            )}
          </div>
        </div>
      </div>

      {/* Disruption type breakdown */}
      {logs.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-white/40" />
            <span className="text-sm font-semibold text-white">Resolution Performance</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Avg. Resolve Time", value: `${stats.avgResolveTimeMins}min`, color: "text-blue-400" },
              { label: "Disruptions Resolved", value: stats.resolvedCount, color: "text-emerald-400" },
              { label: "Orders Total", value: orders.length, color: "text-white" },
              { label: "AI Decisions Made", value: logs.length, color: "text-purple-400" },
            ].map((m) => (
              <div key={m.label} className="text-center p-4 rounded-xl bg-white/3">
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-white/30 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Seed button ──────────────────────────────────────────────────────────────
function SeedButton({ onSeeded }: { onSeeded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const seed = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) { setDone(true); onSeeded(); }
      else setError(data.error || "Failed");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
      <CheckCircle2 className="w-4 h-4" />Database seeded with 15 suppliers + 7 orders
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={seed} disabled={loading} className="gap-1.5 text-xs">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
        {loading ? "Seeding..." : "Seed Demo Data"}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, oRes] = await Promise.all([
        fetch("/api/disruptions"),
        fetch("/api/orders"),
      ]);
      const dData = await dRes.json();
      const oData = await oRes.json();

      if (dData.stats) setStats(dData.stats);
      if (dData.recentLogs) setLogs(dData.recentLogs);
      if (oData.orders) setOrders(oData.orders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, seeded]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return <DashboardOverview stats={stats} orders={orders} logs={logs} loading={loading} onRefresh={fetchData} />;
      case "chat":
        return <div className="h-full"><ChatPanel /></div>;
      case "orders":
        return (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-white/40" /><span className="text-sm font-semibold text-white">All Orders</span></div>
            {orders.map((o) => <OrderRow key={o._id} order={o} />)}
            {orders.length === 0 && <div className="text-center py-12 text-white/20">No orders. Seed demo data first.</div>}
          </div>
        );
      case "logs":
        return (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><Database className="w-4 h-4 text-white/40" /><span className="text-sm font-semibold text-white">Full Decision Audit Trail</span></div>
            {logs.map((log) => <LogRow key={log._id} log={log} />)}
            {logs.length === 0 && <div className="text-center py-12 text-white/20">No logs yet. Complete a disruption resolution.</div>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#020817] overflow-hidden">
      <Sidebar active={active} setActive={setActive} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white capitalize">{active}</h1>
              <p className="text-xs text-white/30">SupplyPulse · MongoDB Atlas · Gemini 2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SeedButton onSeeded={() => { setSeeded(true); fetchData(); }} />
            <Button size="sm" variant="ghost" onClick={fetchData} className="gap-1.5 text-xs text-white/40">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" variant="glow" onClick={() => setActive("chat")} className="gap-1.5 text-xs">
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
