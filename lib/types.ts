import { ObjectId } from "mongodb";

// ─── Supplier ──────────────────────────────────────────────────────────────
export interface Supplier {
  _id?: ObjectId | string;
  name: string;
  category: string[];
  products: string[];
  location: {
    city: string;
    state: string;
    lat?: number;
    lng?: number;
  };
  lead_time_days: number;
  price_tier: "budget" | "mid" | "premium";
  reliability_score: number;  // 0.0–1.0 (stored) or 0–100 (display)
  contact_email: string;
  contact_phone?: string;
  // v3: Source tracking
  source?: "user_added" | "maps_imported";
  maps_place_id?: string | null;
  maps_rating?: number;
  maps_rating_count?: number;
  maps_address?: string;
  maps_open_now?: boolean;
  // Vector search
  profile_embedding?: number[];
  match_score?: number;
}

// ─── Maps supplier (from Google Maps Places API) ───────────────────────────
export interface MapsSupplier {
  name: string;
  address: string;
  phone?: string;
  rating: number;
  user_ratings_total: number;
  open_now: boolean;
  maps_place_id: string;
  source: "google_maps";
  match_score: number;
  distance_text?: string;
  // Normalized for UI rendering
  lead_time_days?: number;
  price_tier?: string;
  location?: { city: string; state: string };
}

// ─── Order ─────────────────────────────────────────────────────────────────
export interface Order {
  _id?: ObjectId | string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_price_ngn?: number;
  supplier_id: ObjectId | string;
  supplier_name?: string;
  status: "pending" | "at_risk" | "rerouted" | "fulfilled";
  deadline: string;
  required_by?: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Decision Log ──────────────────────────────────────────────────────────
export interface DecisionLog {
  _id?: ObjectId | string;
  disruption_type: "stockout" | "late" | "price_spike" | "unavailable";
  affected_skus: string[];
  original_supplier_id?: ObjectId | string;
  original_supplier_name: string;
  chosen_supplier_id?: ObjectId | string;
  chosen_supplier_name: string;
  // v3: source tracking
  chosen_source: "user_db" | "google_maps";
  maps_results_used: boolean;
  agent_rationale: string;
  match_score: number;
  operator_approved: boolean;
  time_to_resolve_s: number;       // seconds (v3 precision)
  time_to_resolve_mins?: number;   // kept for backward compat
  cost_delta_ngn: number;
  additional_cost_ngn?: number;    // kept for backward compat
  created_at: Date;
}

// ─── Chat ──────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  result: unknown;
}

// ─── Agent response ────────────────────────────────────────────────────────
export interface AgentResponse {
  message: string;
  phase: "sense" | "diagnose" | "match" | "plan" | "execute" | "verify";
  mapsUsed?: boolean;
  data?: {
    affectedOrders?: Order[];
    matchedSuppliers?: (Supplier | MapsSupplier)[];
    recoveryPlan?: RecoveryPlan;
    resolution?: Resolution;
  };
  requiresApproval?: boolean;
  approvalPayload?: ApprovalPayload;
}

// ─── Recovery plan ─────────────────────────────────────────────────────────
export interface RecoveryPlan {
  options: RecoveryOption[];
  totalAtRisk: number;
  affectedOrderCount: number;
}

export interface RecoveryOption {
  supplier: Supplier | MapsSupplier;
  source: "user_db" | "google_maps" | "both";
  matchScore: number;
  estimatedDelivery: string;
  pricePremium: number;
  rationale: string;
}

export interface ApprovalPayload {
  chosenSupplierId: string;
  affectedOrderIds: string[];
  supplierName: string;
  vendorEmail: string;
  skus: string[];
  chosenSource: "user_db" | "google_maps";
}

export interface Resolution {
  timeToResolveSeconds: number;
  timeToResolveMinutes?: number;
  additionalCostNgn: number;
  chosenSupplier: string;
  chosenSource: "user_db" | "google_maps";
  disruptionType: string;
  ordersUpdated: number;
  mapsWasUsed: boolean;
}
