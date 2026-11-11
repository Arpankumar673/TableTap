/**
 * TableTap Role-Based Authorization Types
 * Minimal required roles for multi-tenant SaaS operations:
 * - owner: Full restaurant control, billing, branding, menu, tables, staff credentials
 * - admin: Daily restaurant management, menu, orders, tables, reports
 * - kitchen: Kitchen display operator (station filtering, order preparation lifecycle)
 */

export type UserRole = "owner" | "admin" | "kitchen";

export interface RestaurantMembership {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; // references auth.users.id
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}
