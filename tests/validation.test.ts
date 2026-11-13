import { describe, expect, it } from "vitest";
import { loginSchema } from "../src/lib/validation/auth";
import { orderStatusUpdateSchema, orderSubmissionSchema } from "../src/lib/validation/order";
import { productSchema } from "../src/lib/validation/menu";
import { tableSchema } from "../src/lib/validation/table";
import { restaurantSettingsSchema } from "../src/lib/validation/restaurant";

describe("Zod Validation Schemas (Single-Restaurant)", () => {
  it("validates staff login schema", () => {
    expect(
      loginSchema.safeParse({ email: "admin@pizza.com", password: "password123" })
        .success
    ).toBe(true);

    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "123" }).success
    ).toBe(false);
  });

  it("enforces order submission schema constraints (idempotency UUID & quantity bounds)", () => {
    const valid = orderSubmissionSchema.safeParse({
      sessionToken: "abc1234567890def1234567890",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      items: [
        {
          productId: "22222222-2222-4222-8222-222222222222",
          quantity: 2,
          optionValueIds: ["33333333-3333-4333-8333-333333333333"],
        },
      ],
    });
    expect(valid.success).toBe(true);

    // Reject empty items
    expect(
      orderSubmissionSchema.safeParse({
        sessionToken: "abc1234567890def1234567890",
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        items: [],
      }).success
    ).toBe(false);

    // Reject non-UUID idempotency key
    expect(
      orderSubmissionSchema.safeParse({
        sessionToken: "abc1234567890def1234567890",
        idempotencyKey: "not-a-uuid",
        items: [{ productId: "22222222-2222-4222-8222-222222222222", quantity: 1 }],
      }).success
    ).toBe(false);
  });

  it("enforces single-restaurant order lifecycle statuses in schema", () => {
    expect(
      orderStatusUpdateSchema.safeParse({
        orderId: "22222222-2222-4222-8222-222222222222",
        newStatus: "new",
      }).success
    ).toBe(true);

    expect(
      orderStatusUpdateSchema.safeParse({
        orderId: "22222222-2222-4222-8222-222222222222",
        newStatus: "completed",
      }).success
    ).toBe(true);
  });

  it("rejects negative prices in product creation", () => {
    expect(
      productSchema.safeParse({
        name: "Bad Pizza",
        slug: "bad-pizza",
        category_id: "22222222-2222-4222-8222-222222222222",
        base_price: -50,
      }).success
    ).toBe(false);
  });

  it("validates table capacity and single-restaurant tax settings", () => {
    expect(
      tableSchema.safeParse({ table_number: "T-04", capacity: 0 }).success
    ).toBe(false);

    expect(
      restaurantSettingsSchema.safeParse({
        name: "Pizza House",
        tax_rate: 5,
        service_charge_rate: 0,
      }).success
    ).toBe(true);
  });

  it("validates administrator password change constraints", () => {
    function validatePasswordChange(input: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }) {
      if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
        return { valid: false, error: "All fields are required" };
      }
      if (input.newPassword.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters" };
      }
      if (input.newPassword !== input.confirmPassword) {
        return { valid: false, error: "Passwords do not match" };
      }
      if (input.currentPassword === input.newPassword) {
        return { valid: false, error: "New password must be different from current password" };
      }
      return { valid: true };
    }

    expect(
      validatePasswordChange({
        currentPassword: "oldPassword123",
        newPassword: "newSecurePassword456",
        confirmPassword: "newSecurePassword456",
      }).valid
    ).toBe(true);

    expect(
      validatePasswordChange({
        currentPassword: "oldPassword123",
        newPassword: "short",
        confirmPassword: "short",
      }).valid
    ).toBe(false);

    expect(
      validatePasswordChange({
        currentPassword: "oldPassword123",
        newPassword: "newSecurePassword456",
        confirmPassword: "mismatchPassword789",
      }).valid
    ).toBe(false);

    expect(
      validatePasswordChange({
        currentPassword: "samePassword123",
        newPassword: "samePassword123",
        confirmPassword: "samePassword123",
      }).valid
    ).toBe(false);
  });
});
