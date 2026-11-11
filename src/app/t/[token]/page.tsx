import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, QrCode } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { hashToken } from "@/lib/security/tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TableQrEntryPage({
  params,
}: {
  params: { token: string };
}) {
  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    redirect("/setup-required");
  }

  const rawToken = params.token;
  if (!rawToken || rawToken.length < 8) {
    return <QrErrorScreen message="This QR code link appears incomplete or malformed." />;
  }

  const tokenHash = hashToken(rawToken);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("resolve_table_qr", {
    p_token_hash: tokenHash,
  });

  if (error || !data) {
    return (
      <QrErrorScreen
        message={
          error?.message ??
          "We could not verify this table QR code right now. Please ask a staff member for assistance."
        }
      />
    );
  }

  const result = data as {
    valid: boolean;
    error?: string;
    restaurant_slug?: string;
    session_token?: string;
  };

  if (!result.valid || !result.restaurant_slug || !result.session_token) {
    return (
      <QrErrorScreen
        message={
          result.error ??
          "This table QR code has been revoked or deactivated. Please scan the updated code on your table."
        }
      />
    );
  }

  redirect(`/r/${result.restaurant_slug}?session=${encodeURIComponent(result.session_token)}`);
}

function QrErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-12">
      <Card className="w-full max-w-md border-cream-200 text-center shadow-xl">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato-50 text-tomato-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <CardTitle className="font-serif text-2xl text-forest-950">
            Table QR Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-relaxed text-forest-800/80">{message}</p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link href="/">
                <QrCode className="mr-2 h-4 w-4" />
                <span>Return to TableTap</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
