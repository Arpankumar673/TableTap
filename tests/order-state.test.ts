import { describe, expect, it } from "vitest";
import {
  canRoleTransitionOrder,
  getElapsedMinutes,
  getNextItemStatus,
  getNextOrderAction,
  getOrderUrgency,
  isValidOrderTransition,
} from "../src/lib/orders/state-machine";

describe("Order Lifecycle State Machine & Kitchen Urgency", () => {
  it("allows valid forward workflow transitions (NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED)", () => {
    expect(isValidOrderTransition("new", "accepted")).toBe(true);
    expect(isValidOrderTransition("accepted", "preparing")).toBe(true);
    expect(isValidOrderTransition("preparing", "ready")).toBe(true);
    expect(isValidOrderTransition("ready", "completed")).toBe(true);
  });

  it("blocks invalid backward or terminal state transitions", () => {
    expect(isValidOrderTransition("completed", "new")).toBe(false);
    expect(isValidOrderTransition("cancelled", "accepted")).toBe(false);
    expect(isValidOrderTransition("new", "completed")).toBe(false);
    expect(isValidOrderTransition("ready", "new")).toBe(false);
  });

  it("enforces kitchen vs admin cancellation rules", () => {
    expect(canRoleTransitionOrder("kitchen", "new", "cancelled").allowed).toBe(true);
    expect(canRoleTransitionOrder("kitchen", "accepted", "cancelled").allowed).toBe(true);
    expect(canRoleTransitionOrder("kitchen", "preparing", "cancelled").allowed).toBe(false);
    expect(canRoleTransitionOrder("admin", "preparing", "cancelled").allowed).toBe(true);
    expect(canRoleTransitionOrder("admin", "ready", "cancelled").allowed).toBe(true);
  });

  it("returns next primary action button for kitchen cards", () => {
    expect(getNextOrderAction("new")?.nextStatus).toBe("accepted");
    expect(getNextOrderAction("accepted")?.nextStatus).toBe("preparing");
    expect(getNextOrderAction("preparing")?.nextStatus).toBe("ready");
    expect(getNextOrderAction("ready")?.nextStatus).toBe("completed");
    expect(getNextOrderAction("completed")).toBeNull();
  });

  it("computes delayed order urgency thresholds accurately", () => {
    const baseMs = new Date("2026-11-11T12:00:00Z").getTime();
    expect(getElapsedMinutes("2026-11-11T11:55:00Z", baseMs)).toBe(5);
    expect(getOrderUrgency("preparing", "2026-11-11T11:55:00Z", baseMs)).toBe("normal");
    expect(getOrderUrgency("preparing", "2026-11-11T11:46:00Z", baseMs)).toBe("warning");
    expect(getOrderUrgency("preparing", "2026-11-11T11:35:00Z", baseMs)).toBe("delayed");
    // Ready orders never alert as delayed
    expect(getOrderUrgency("ready", "2026-11-11T11:20:00Z", baseMs)).toBe("normal");
  });

  it("advances item-level station statuses cleanly", () => {
    expect(getNextItemStatus("pending")).toBe("preparing");
    expect(getNextItemStatus("preparing")).toBe("ready");
    expect(getNextItemStatus("ready")).toBeNull();
  });
});
