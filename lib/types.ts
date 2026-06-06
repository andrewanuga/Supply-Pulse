import { ObjectId } from "mongodb";

export interface Supplier {
  _id?: ObjectId | string;
  name: string;
  category: string[];
  products: string[];
  location: { city: string; state: string };
  lead_time_days: number;
  price_tier: "budget" | "mid" | "premium";
  reliability_score: number;
  contact_email: string;
  profile_embedding?: number[];
  match_score?: number;
}

export interface Order {
  _id?: ObjectId | string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  supplier_id: ObjectId | string;
  supplier_name?: string;
  status: "pending" | "at_risk" | "rerouted" | "fulfilled";
  deadline: string;
  created_at: Date;
  updated_at: Date;
}

export interface DecisionLog {
  _id?: ObjectId | string;
  disruption_type: "stockout" | "late" | "price_spike" | "unavailable";
  affected_skus: string[];
  original_supplier_id: ObjectId | string;
  original_supplier_name: string;
  chosen_supplier_id: ObjectId | string;
  chosen_supplier_name: string;
  agent_rationale: string;
  operator_approved: boolean;
  time_to_resolve_mins: number;
  additional_cost_ngn: number;
  created_at: Date;
}

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

export interface AgentResponse {
  message: string;
  phase: "sense" | "diagnose" | "match" | "plan" | "execute" | "verify";
  data?: {
    affectedOrders?: Order[];
    matchedSuppliers?: Supplier[];
    recoveryPlan?: RecoveryPlan;
    resolution?: Resolution;
  };
  requiresApproval?: boolean;
  approvalPayload?: ApprovalPayload;
}

export interface RecoveryPlan {
  options: RecoveryOption[];
  totalAtRisk: number;
  affectedOrderCount: number;
}

export interface RecoveryOption {
  supplier: Supplier;
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
}

export interface Resolution {
  timeToResolveMinutes: number;
  additionalCostNgn: number;
  chosenSupplier: string;
  disruptionType: string;
  ordersUpdated: number;
}
