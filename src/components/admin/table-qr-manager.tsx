"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import JSZip from "jszip";
import {
  Plus,
  QrCode,
  RefreshCw,
  Ban,
  Download,
  Printer,
  Archive,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Receipt,
  DoorClosed,
} from "lucide-react";
import {
  closeTableSessionAction,
  createTableWithQrAction,
  regenerateTableQrAction,
  revokeTableQrAction,
  toggleTableActiveAction,
  updateTableDetailsAction,
} from "@/app/actions/admin-tables";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ManagedTable {
  id: string;
  table_number: string;
  label: string | null;
  capacity: number;
  active: boolean;
  activeQr: {
    id: string;
    token_prefix: string | null;
    qr_token_secret: string | null;
    created_at: string;
  } | null;
  openSession: {
    id: string;
    bill_requested: boolean;
    opened_at: string;
  } | null;
}

interface TableQrManagerProps {
  restaurantName: string;
  initialTables: ManagedTable[];
}

export function TableQrManager({
  restaurantName,
  initialTables,
}: TableQrManagerProps) {
  const router = useRouter();
  const [tables, setTables] = useState<ManagedTable[]>(initialTables);
  const [origin, setOrigin] = useState<string>("");
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Table Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ManagedTable | null>(null);
  const [tableNum, setTableNum] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [tableCap, setTableCap] = useState("4");
  const [saving, setSaving] = useState(false);

  // Preview / Print Modal
  const [previewTable, setPreviewTable] = useState<ManagedTable | null>(null);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  useEffect(() => {
    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    setOrigin(appOrigin);
  }, []);

  // Generate QR Data URLs cleanly on client when tables or origin update
  useEffect(() => {
    if (!origin) return;
    let active = true;

    async function buildQrs() {
      const nextMap: Record<string, string> = {};
      for (const tbl of tables) {
        const raw = tbl.activeQr?.qr_token_secret;
        if (!raw) continue;
        const url = `${origin}/t/${raw}`;
        try {
          nextMap[tbl.id] = await QRCode.toDataURL(url, {
            width: 512,
            margin: 2,
            color: { dark: "#143725", light: "#FFFFFF" },
          });
        } catch {
          // Ignore individual QR rendering error
        }
      }
      if (active) setQrPreviews(nextMap);
    }
    buildQrs();

    return () => {
      active = false;
    };
  }, [tables, origin]);

  function openTableForm(tbl?: ManagedTable) {
    setEditingTable(tbl ?? null);
    setTableNum(tbl?.table_number ?? "");
    setTableLabel(tbl?.label ?? "");
    setTableCap(tbl ? String(tbl.capacity) : "4");
    setModalOpen(true);
  }

  async function handleSaveTable(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (editingTable) {
        const res = await updateTableDetailsAction(
          editingTable.id,
          tableNum,
          tableLabel || null,
          Math.max(1, parseInt(tableCap, 10) || 4)
        );
        if (res.error) throw new Error(res.error);
        setMessage(`Updated Table ${tableNum}`);
      } else {
        const res = await createTableWithQrAction({
          table_number: tableNum,
          label: tableLabel || null,
          capacity: Math.max(1, parseInt(tableCap, 10) || 4),
        });
        if (res.error) throw new Error(res.error);
        setMessage(`Created Table ${tableNum} with unique cryptographic QR code`);
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save table.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateQr(table: ManagedTable) {
    setBusyId(table.id);
    setError(null);
    setMessage(null);
    try {
      const res = await regenerateTableQrAction(table.id);
      if (res.error) throw new Error(res.error);
      setMessage(
        `Regenerated QR for Table ${table.table_number}. Previous QR code has been revoked.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate QR.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeQr(table: ManagedTable) {
    setBusyId(table.id);
    setError(null);
    setMessage(null);
    try {
      const res = await revokeTableQrAction(table.id);
      if (res.error) throw new Error(res.error);
      setMessage(`Revoked QR token for Table ${table.table_number}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke QR.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(table: ManagedTable) {
    setBusyId(table.id);
    try {
      await toggleTableActiveAction(table.id, !table.active);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCloseSession(sessionId: string, tableNumber: string) {
    setBusyId(sessionId);
    try {
      await closeTableSessionAction(sessionId);
      setMessage(`Closed active dining session for Table ${tableNumber}.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function downloadSingleQr(table: ManagedTable) {
    const dataUrl = qrPreviews[table.id];
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `tabletap-table-${table.table_number}-qr.png`;
    link.click();
  }

  async function downloadAllQrZip() {
    setZipLoading(true);
    setError(null);
    try {
      const zip = new JSZip();
      let count = 0;

      for (const tbl of tables) {
        const dataUrl = qrPreviews[tbl.id];
        if (!dataUrl) continue;
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          zip.file(`tabletap-table-${tbl.table_number}.png`, base64, {
            base64: true,
          });
          count++;
        }
      }

      if (count === 0) {
        setError("No active QR codes available to export.");
        return;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabletap-all-table-qrs.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-serif text-3xl font-bold text-forest-950">
            Tables &amp; QR Codes
          </h1>
          <p className="mt-1 text-sm text-forest-700/80">
            Each table receives a unique, revocable cryptographic QR token linking guests directly to their table session
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAllQrZip}
            disabled={zipLoading || Object.keys(qrPreviews).length === 0}
          >
            {zipLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-1.5 h-4 w-4" />
            )}
            <span>Download All QR (ZIP)</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={Object.keys(qrPreviews).length === 0}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            <span>Print All Cards</span>
          </Button>
          <Button size="sm" onClick={() => openTableForm()}>
            <Plus className="mr-1.5 h-4 w-4" />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900 print:hidden">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-tomato-200 bg-tomato-50 p-3.5 text-sm font-medium text-tomato-900 print:hidden">
          <AlertCircle className="h-5 w-5 text-tomato-600" />
          <span>{error}</span>
        </div>
      )}

      {tables.length === 0 ? (
        <Card className="py-16 text-center print:hidden">
          <QrCode className="mx-auto h-12 w-12 text-forest-700/40" />
          <h3 className="mt-3 font-serif text-xl font-bold text-forest-950">
            No tables created yet
          </h3>
          <p className="mt-1 text-sm text-forest-700">
            Create your first restaurant table to generate a scannable QR code.
          </p>
          <Button className="mt-5" onClick={() => openTableForm()}>
            <Plus className="mr-2 h-4 w-4" /> Create Table 01
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const qrImg = qrPreviews[table.id];
            const isBusy = busyId === table.id;
            const qrUrl = table.activeQr?.qr_token_secret
              ? `${origin}/t/${table.activeQr.qr_token_secret}`
              : null;

            return (
              <Card
                key={table.id}
                className="overflow-hidden border-cream-200 shadow-sm print:break-inside-avoid print:shadow-none"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Table Top Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-xl font-bold text-forest-950">
                          Table {table.table_number}
                        </h3>
                        {!table.active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-forest-700">
                        {table.label || "Standard Seating"} • {table.capacity} seats
                      </p>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <Switch
                        checked={table.active}
                        disabled={isBusy}
                        onCheckedChange={() => handleToggleActive(table)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTableForm(table)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Active Session Indicator */}
                  {table.openSession && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs print:hidden">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span className="font-semibold text-emerald-950">
                          Session Open
                        </span>
                        {table.openSession.bill_requested && (
                          <Badge variant="spice" className="text-[10px]">
                            <Receipt className="mr-1 h-3 w-3" /> Bill Requested
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-emerald-900 hover:bg-emerald-100"
                        onClick={() =>
                          handleCloseSession(
                            table.openSession!.id,
                            table.table_number
                          )
                        }
                      >
                        <DoorClosed className="mr-1 h-3.5 w-3.5" />
                        Close
                      </Button>
                    </div>
                  )}

                  {/* QR Code Visual Frame */}
                  <div className="flex flex-col items-center rounded-2xl border border-cream-200 bg-cream-50/50 p-4 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-forest-700 mb-2">
                      {restaurantName}
                    </div>
                    {qrImg ? (
                      <Image
                        src={qrImg}
                        alt={`Table ${table.table_number} QR Code`}
                        width={176}
                        height={176}
                        unoptimized
                        className="h-44 w-44 rounded-xl border border-cream-200 bg-white p-2 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-dashed border-cream-300 bg-white text-xs text-forest-700/70">
                        <Ban className="mb-2 h-6 w-6 text-tomato-500" />
                        <span>QR Revoked / Inactive</span>
                      </div>
                    )}
                    <div className="mt-2 font-serif text-sm font-bold text-forest-950">
                      Scan to Order • Table {table.table_number}
                    </div>
                    {table.activeQr?.token_prefix && (
                      <div className="mt-0.5 font-mono text-[10px] text-forest-700/70 print:hidden">
                        Token ID: {table.activeQr.token_prefix}••••••••
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!qrImg}
                      onClick={() => downloadSingleQr(table)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!qrImg}
                      onClick={() => setPreviewTable(table)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview / Test
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleRegenerateQr(table)}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy || !table.activeQr}
                      onClick={() => handleRevokeQr(table)}
                      className="text-tomato-700 hover:bg-tomato-50 hover:text-tomato-800"
                    >
                      <Ban className="mr-1.5 h-3.5 w-3.5" /> Revoke QR
                    </Button>
                  </div>

                  {qrUrl && (
                    <div className="truncate rounded-md bg-cream-100/70 px-2.5 py-1.5 font-mono text-[10px] text-forest-800 print:hidden">
                      {qrUrl}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Table Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? `Edit Table ${editingTable.table_number}` : "Add New Table"}
            </DialogTitle>
            <DialogDescription>
              A unique cryptographic QR token is generated automatically for new tables.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTable} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Table Number / Code</Label>
              <Input
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                placeholder="05"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location Label (Optional)</Label>
              <Input
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="Patio Courtyard"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seating Capacity</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={tableCap}
                onChange={(e) => setTableCap(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : editingTable ? "Update Table" : "Create Table & Generate QR"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview & Test Link Modal */}
      <Dialog
        open={Boolean(previewTable)}
        onOpenChange={(open) => !open && setPreviewTable(null)}
      >
        {previewTable && (
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-center font-serif text-2xl">
                {restaurantName}
              </DialogTitle>
              <DialogDescription className="text-center">
                Printable Table Card — Table {previewTable.table_number}
              </DialogDescription>
            </DialogHeader>
            <div className="my-2 flex flex-col items-center rounded-2xl border-2 border-forest-800 bg-cream-50 p-6">
              {qrPreviews[previewTable.id] && (
                <Image
                  src={qrPreviews[previewTable.id]}
                  alt="Preview QR"
                  width={224}
                  height={224}
                  unoptimized
                  className="h-56 w-56 rounded-xl bg-white p-2 shadow"
                />
              )}
              <div className="mt-4 font-serif text-xl font-bold text-forest-950">
                Table {previewTable.table_number}
              </div>
              <p className="mt-1 text-xs text-forest-700">
                Point your smartphone camera here to view our menu &amp; order directly
              </p>
            </div>
            {previewTable.activeQr?.qr_token_secret && (
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a
                    href={`/t/${previewTable.activeQr.qr_token_secret}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Simulate Customer Scan →
                  </a>
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
