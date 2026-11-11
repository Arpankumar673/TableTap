import { OrderItemStatus, OrderStatus } from "@/types/orders";
import { UserRole } from "@/types/roles";

/**
 * Valid forward and cancellation transitions for orders.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "completed", "cancelled"],
  served: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isValidOrderTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  if (fromStatus === toStatus) return false;
  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

export function canRoleTransitionOrder(
  role: UserRole,
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): { allowed: boolean; reason?: string } {
  if (!isValidOrderTransition(fromStatus, toStatus)) {
    return {
      allowed: false,
      reason: `Cannot move order from "${fromStatus}" directly to "${toStatus}".`,
    };
  }

  // Kitchen staff cannot cancel orders that are already actively cooking or ready
  if (
    role === "kitchen" &&
    toStatus === "cancelled" &&
    !["pending", "accepted"].includes(fromStatus)
  ) {
    return {
      allowed: false,
      reason:
        "Kitchen staff can only cancel orders before active preparation begins. Ask an admin to cancel.",
    };
  }

  return { allowed: true };
}

export function getNextOrderAction(
  status: OrderStatus
): { nextStatus: OrderStatus; label: string } | null {
  switch (status) {
    case "pending":
      return { nextStatus: "accepted", label: "Accept Order" };
    case "accepted":
      return { nextStatus: "preparing", label: "Start Preparing" };
    case "preparing":
      return { nextStatus: "ready", label: "Mark Ready" };
    case "ready":
      return { nextStatus: "served", label: "Mark Served" };
    case "served":
      return { nextStatus: "completed", label: "Complete Order" };
    default:
      return null;
  }
}

export function getElapsedMinutes(createdAtIso: string, nowMs: number = Date.now()): number {
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) return 0;
  return Math.max(0, Math.floor((nowMs - createdMs) / 60_000));
}

export type UrgencyLevel = "normal" | "warning" | "delayed";

export function getOrderUrgency(
  status: OrderStatus,
  createdAtIso: string,
  nowMs: number = Date.now(),
  warningMins: number = 12,
  delayedMins: number = 20
): UrgencyLevel {
  if (["ready", "served", "completed", "cancelled"].includes(status)) {
    return "normal";
  }
  const elapsed = getElapsedMinutes(createdAtIso, nowMs);
  if (elapsed >= delayedMins) return "delayed";
  if (elapsed >= warningMins) return "warning";
  return "normal";
}

export function getNextItemStatus(current: OrderItemStatus): OrderItemStatus | null {
  switch (current) {
    case "pending":
      return "preparing";
    case "preparing":
      return "ready";
    default:
      return null;
  }
}
