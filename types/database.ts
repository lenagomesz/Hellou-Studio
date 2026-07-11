export type Category = 'chaveiros' | 'escritorio' | 'criaturas' | 'encomenda';

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'approved'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'refunded';

export type ProductType = 'physical' | 'digital';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  type: ProductType;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
  image_url_2: string | null;
  images: string[] | null;
  active: boolean;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price_modifier: number;
  stock: number;
  dimensions: string | null;
  color: string | null;
  image_url: string | null;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  product_option_id: string | null;
  quantity: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  mp_payment_id: string | null;
  mp_payment_method: string | null;
  mp_status: string | null;
  payment_provider: string;
  status: OrderStatus;
  total: number;
  shipping_address: Record<string, unknown> | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_option_id: string | null;
  quantity: number;
  unit_price: number;
  product_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  free_shipping: boolean;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export type PrintRequestStatus =
  | 'pending'
  | 'needs_info'
  | 'quoted'
  | 'approved'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'rejected'
  | 'canceled';

export interface PrintRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  stl_file_url: string;
  stl_file_name: string;
  stl_file_size: number;
  status: PrintRequestStatus;
  admin_notes: string | null;
  quoted_price: number | null;
  rejection_reason: string | null;
  product_id: string | null;
  user_response: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'order_status' | 'print_request_status' | 'announcement';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface BannedEmail {
  id: string;
  email: string;
  reason: string | null;
  banned_at: string;
  banned_by: string | null;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name?: string | null;
          phone?: string | null;
          cpf?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string | null;
          phone?: string | null;
          cpf?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: Category;
          type?: ProductType;
          base_price: number;
          image_url?: string | null;
          image_url_2?: string | null;
          active?: boolean;
          file_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: Category;
          type?: ProductType;
          base_price?: number;
          image_url?: string | null;
          image_url_2?: string | null;
          active?: boolean;
          file_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_options: {
        Row: ProductOption;
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          price_modifier?: number;
          stock?: number;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          price_modifier?: number;
          stock?: number;
          color?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: CartItem;
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          product_option_id?: string | null;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          product_option_id?: string | null;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: {
          id?: string;
          user_id: string;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          mp_payment_id?: string | null;
          mp_payment_method?: string | null;
          mp_status?: string | null;
          payment_provider?: string;
          status?: OrderStatus;
          total: number;
          shipping_address?: Record<string, unknown> | null;
          shipped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          mp_payment_id?: string | null;
          mp_payment_method?: string | null;
          mp_status?: string | null;
          payment_provider?: string;
          status?: OrderStatus;
          total?: number;
          shipping_address?: Record<string, unknown> | null;
          shipped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_option_id?: string | null;
          quantity: number;
          unit_price: number;
          product_snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_option_id?: string | null;
          quantity?: number;
          unit_price?: number;
          product_snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: Coupon;
        Insert: {
          id?: string;
          code: string;
          discount_type: 'percent' | 'fixed';
          discount_value: number;
          min_purchase?: number;
          max_uses?: number | null;
          used_count?: number;
          free_shipping?: boolean;
          active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: 'percent' | 'fixed';
          discount_value?: number;
          min_purchase?: number;
          max_uses?: number | null;
          used_count?: number;
          free_shipping?: boolean;
          active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_category: Category;
      order_status: OrderStatus;
      user_role: 'user' | 'admin';
    };
    CompositeTypes: Record<string, never>;
  };
}
