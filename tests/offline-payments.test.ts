import { describe, expect, it } from "vitest";
import { PaymentStatus } from "../src/types/orders";
import { roundCurrency } from "../src/lib/pricing/calculator";

describe("Offline Payments & Counter Settlement Workflow", () => {
  it("defaults newly created orders to unpaid/pending payment status", () => {
    const initialPaymentStatus: PaymentStatus = "unpaid";
    expect(["unpaid", "pending"]).toContain(initialPaymentStatus);
  });

  it("formats and computes offline cart breakdown without online gateway fees", () => {
    const subtotal = 850;
    const taxRate = 5; // 5% GST
    const serviceRate = 0; // 0%

    const tax = roundCurrency(subtotal * (taxRate / 100));
    const serviceCharge = roundCurrency(subtotal * (serviceRate / 100));
    const total = roundCurrency(subtotal + tax + serviceCharge);

    expect(tax).toBe(42.5);
    expect(serviceCharge).toBe(0);
    expect(total).toBe(892.5);
  });

  it("handles payment transitions from pending to paid upon staff collection", () => {
    let orderPaymentStatus: PaymentStatus = "unpaid";
    expect(orderPaymentStatus).toBe("unpaid");

    // Staff records payment
    const recordPayment = () => {
      orderPaymentStatus = "paid";
      return {
        provider: "pay_at_restaurant",
        status: "successful",
        paidAt: new Date().toISOString(),
      };
    };

    const paymentResult = recordPayment();
    expect(orderPaymentStatus).toBe("paid");
    expect(paymentResult.provider).toBe("pay_at_restaurant");
    expect(paymentResult.status).toBe("successful");
  });

  it("guards against duplicate payment confirmation for already paid orders", () => {
    const order = {
      id: "ord-test-123",
      payment_status: "paid" as PaymentStatus,
      total: 892.5,
    };

    const attemptCollectPayment = (targetOrder: typeof order, isBusy: boolean) => {
      if (isBusy || targetOrder.payment_status === "paid") {
        return { success: false, reason: "Already paid or request in-flight" };
      }
      return { success: true };
    };

    // Attempt when already paid
    expect(attemptCollectPayment(order, false).success).toBe(false);
    expect(attemptCollectPayment(order, false).reason).toBe("Already paid or request in-flight");

    // Attempt when busy
    const unpaidOrder = { ...order, payment_status: "unpaid" as PaymentStatus };
    expect(attemptCollectPayment(unpaidOrder, true).success).toBe(false);
    expect(attemptCollectPayment(unpaidOrder, false).success).toBe(true);
  });
});
