/**
 * TableTap Role-Based Authorization Types (Single-Restaurant Architecture)
 * Minimal operational roles:
 * - admin: Full restaurant configuration, menu, tables, QR codes, orders, analytics, kitchen login provisioning
 * - kitchen: Kitchen Display System operator (real-time queue, preparation workflow)
 */

export type UserRole = "admin" | "kitchen";

export interface UserProfile {
  id: string; // references auth.users.id
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}
