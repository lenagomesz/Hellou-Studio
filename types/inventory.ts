// ============================================================================
// Inventory Management Types
// ============================================================================

export type StockMovementReason =
  | 'venda'
  | 'devolucao'
  | 'ajuste_manual'
  | 'reposicao'
  | 'quebra'
  | 'perda'
  | 'transferencia';

export type ReorderTaskStatus =
  | 'pending'
  | 'ordered'
  | 'in_transit'
  | 'received'
  | 'canceled';

export type StockAlertLevel = 'critical' | 'low' | 'ok';

// ============================================================================
// Database Row Types
// ============================================================================

export interface StockMovement {
  id: string;
  product_id: string;
  product_option_id: string | null;
  warehouse_id: string | null;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reason: StockMovementReason;
  notes: string | null;
  user_id: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseStock {
  id: string;
  warehouse_id: string;
  product_option_id: string;
  quantity: number;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  lead_time_days: number;
  reliability_score: number;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  cost_per_unit: number;
  min_order_qty: number;
  sku: string | null;
  is_preferred: boolean;
  notes: string | null;
  created_at: string;
}

export interface ReorderTask {
  id: string;
  product_id: string;
  product_option_id: string | null;
  supplier_id: string | null;
  status: ReorderTaskStatus;
  quantity_ordered: number;
  quantity_received: number;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  cost_total: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Extended Product Option (with inventory fields)
// ============================================================================

export interface ProductOptionWithInventory {
  id: string;
  product_id: string;
  name: string;
  price_modifier: number;
  stock: number;
  reorder_point: number;
  standard_order_qty: number;
  dimensions: string | null;
  color: string | null;
  image_url: string | null;
  created_at: string;
}

// ============================================================================
// View / API Response Types
// ============================================================================

export interface StockAlert {
  product_id: string;
  product_name: string;
  product_option_id: string;
  option_name: string;
  current_stock: number;
  reorder_point: number;
  level: StockAlertLevel;
}

export interface StockOverviewItem {
  product_id: string;
  product_name: string;
  product_option_id: string;
  option_name: string;
  current_stock: number;
  reorder_point: number;
  standard_order_qty: number;
  level: StockAlertLevel;
  last_sold_at: string | null;
  avg_daily_sales: number;
  days_of_stock: number | null; // null if no sales history
}

export interface StockForecastData {
  product_id: string;
  product_name: string;
  product_option_id: string;
  option_name: string;
  current_stock: number;
  monthly_sales: { month: string; quantity: number }[];
  forecast: { month: string; predicted_quantity: number }[];
  recommended_order_qty: number;
  stock_out_date: string | null; // estimated date when stock will run out
}

export interface DeadStockItem {
  product_id: string;
  product_name: string;
  product_option_id: string;
  option_name: string;
  current_stock: number;
  last_sold_at: string | null;
  days_since_last_sale: number;
  holding_cost_estimate: number; // based on product price * days held
  revenue_potential: number; // current_stock * unit_price
  suggestion: 'promote' | 'discount' | 'deactivate' | 'remove';
}

export interface InventoryDashboardSummary {
  total_products: number;
  total_stock_units: number;
  critical_alerts: number;
  low_alerts: number;
  dead_stock_count: number;
  pending_reorders: number;
  total_stock_value: number;
}

export interface StockMovementWithDetails extends StockMovement {
  product_name?: string;
  option_name?: string;
  user_email?: string;
}

// ============================================================================
// Request Types (for API)
// ============================================================================

export interface StockAdjustmentRequest {
  product_option_id: string;
  quantity_change: number;
  reason: StockMovementReason;
  notes?: string;
  warehouse_id?: string;
}

export interface CreateReorderTaskRequest {
  product_id: string;
  product_option_id?: string;
  supplier_id?: string;
  quantity_ordered: number;
  estimated_arrival?: string;
  cost_total?: number;
  notes?: string;
}

export interface TransferStockRequest {
  product_option_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes?: string;
}
