import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { checkRateLimit, hashToken } from "@/lib/security/tokens";

const resolveSchema = z.object({
  rawToken: z.string().min(8, "Invalid QR token").max(256),
});

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = checkRateLimit(`qr_resolve:${clientIp}`, 40, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { valid: false, error: "Too many QR scan attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return NextResponse.json(
      { valid: false, error: "Supabase backend is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: "Malformed QR token." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.rawToken);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("resolve_table_qr", {
      p_token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.json(
        { valid: false, error: error.message },
        { status: 400 }
      );
    }

    const result = data as { valid?: boolean; error?: string } | null;
    if (!result || !result.valid) {
      return NextResponse.json(
        { valid: false, error: result?.error ?? "Invalid or revoked QR code." },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Unable to resolve table QR token." },
      { status: 500 }
    );
  }
}
