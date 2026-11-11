import { describe, expect, it } from "vitest";
import { loginSchema, restaurantRegisterSchema } from "../src/lib/validation/auth";
import { orderSubmissionSchema } from "../src/lib/validation/order";
import { productSchema } from "../src/lib/validation/menu";
import { tableSchema } from "../src/lib/validation/table";
import { restaurantSettingsSchema } from "../src/lib/validation/restaurant";

describe("Zod Validation Schemas", () => {
  it("validates login and owner registration schemas", () => {
    expect(
      loginSchema.safeParse({ email: "owner@pizza.com", password: "password123" })
        .success
    ).toBe(true);

    expect(
      restaurantRegisterSchema.safeParse({
        restaurantName: "Pizza House",
        slug: "Invalid Slug!",
        ownerEmail: "owner@pizza.com",
        password: "password123",
      }).success
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

  it("validates table capacity and restaurant tax configuration", () => {
    expect(
      tableSchema.safeParse({ table_number: "T-04", capacity: 0 }).success
    ).toBe(false);

    expect(
      restaurantSettingsSchema.safeParse({
        name: "Pizza House",
        slug: "pizza-house",
        tax_rate: 5,
        service_charge_rate: 0,
      }).success
    ).toBe(true);
  });
});
