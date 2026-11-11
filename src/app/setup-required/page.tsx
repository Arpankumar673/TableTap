import Link from "next/link";
import { Database, KeyRound, QrCode, ArrowLeft, Terminal, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SetupRequiredPage() {
  return (
    <div className="min-h-screen bg-cream-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-forest-800 hover:text-forest-950">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to TableTap Home</span>
          </Link>
          <Badge variant="spice">Database &amp; Environment Setup Required</Badge>
        </div>

        <Card className="border-cream-200 shadow-lg">
          <CardHeader className="border-b border-cream-200 bg-cream-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-800 text-cream-50">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="font-serif text-2xl">Connect Your Supabase Backend</CardTitle>
                <CardDescription>
                  Complete these two configuration steps to activate live authentication, Admin CMS, Kitchen Display, and QR Ordering.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-forest-950">
                <Database className="h-4 w-4 text-forest-700" />
                <span>Step 1: Execute the SQL Initialization Script in Supabase</span>
              </div>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-forest-800">
                <li>Log into your Supabase Dashboard and open your project.</li>
                <li>In the left sidebar, click <strong>SQL Editor</strong> and create a <strong>New query</strong>.</li>
                <li>
                  Open the file <code className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-xs">supabase/SQL_SETUP_COMPLETE.sql</code> from your workspace.
                </li>
                <li>Copy the entire SQL script, paste it into the Supabase SQL Editor, and click <strong>Run</strong>.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-forest-950">
                <KeyRound className="h-4 w-4 text-forest-700" />
                <span>Step 2: Configure Environment Keys (.env.local)</span>
              </div>
              <p className="mt-2 text-sm text-forest-800">
                Copy <code className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-xs">.env.example</code> to{" "}
                <code className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-xs">.env.local</code> and populate your Supabase URL and keys:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-forest-950 p-4 font-mono text-xs text-cream-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
              </pre>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-forest-700">
                <Terminal className="h-3.5 w-3.5" />
                <span>Restart the Next.js server after saving <code>.env.local</code>.</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cream-200 pt-4">
              <p className="text-xs text-forest-700">
                Want to explore the customer ordering experience UI before connecting Supabase?
              </p>
              <Button asChild variant="spice">
                <Link href="/demo">
                  <span>Open Interactive Menu Preview</span>
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
