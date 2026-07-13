import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Download, Printer, MapPin } from "lucide-react";

const CATS = [
  { value: "none", label: "No category (ask on the form)" },
  { value: "hostel", label: "Hostel" },
  { value: "academics", label: "Academics" },
  { value: "transport", label: "Transport" },
  { value: "infrastructure", label: "Infrastructure" },
];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
));

const AdminQR = () => {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("none");
  const wrapRef = useRef<HTMLDivElement>(null);

  const url = useMemo(() => {
    const base = `${window.location.origin}/complaints/new`;
    const p = new URLSearchParams();
    if (location.trim()) p.set("loc", location.trim());
    if (category !== "none") p.set("cat", category);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  }, [location, category]);

  const getCanvas = () => wrapRef.current?.querySelector("canvas") as HTMLCanvasElement | null;

  const download = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `unibridge-qr-${(location.trim() || "location").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  const print = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const loc = location.trim();
    const w = window.open("", "_blank", "width=460,height=620");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><title>Uni Bridge QR</title></head>` +
      `<body style="font-family:system-ui,sans-serif;text-align:center;padding:36px;color:#0f1e3d;">` +
      `<h2 style="margin:0 0 4px;font-size:22px;">Report an issue here</h2>` +
      `<p style="color:#555;margin:0 0 20px;">Scan with your phone camera to raise a complaint${loc ? ` for <b>${esc(loc)}</b>` : ""}.</p>` +
      `<img src="${dataUrl}" style="width:300px;height:300px;" alt="QR code" />` +
      `<p style="color:#888;font-size:13px;margin-top:14px;">Uni Bridge${loc ? " · " + esc(loc) : ""}</p>` +
      `<script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script>` +
      `</body></html>`
    );
    w.document.close();
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl flex items-center gap-2"><QrCode className="h-7 w-7 text-primary" /> QR codes</h1>
        <p className="text-muted-foreground mt-1">Generate a printable QR sticker for a location. Students scan it to raise a complaint with the location pre-filled.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="loc">Location / spot</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Block A - 2nd Floor, Library Wing, Bus Stop 3" maxLength={100} className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">This exact text pre-fills the complaint's Room / Location field.</p>
          </div>

          <div className="space-y-2">
            <Label>Pre-select category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="text-[11px] text-muted-foreground mb-1">This QR opens:</p>
            <p className="text-xs font-mono break-all text-foreground/80">{url}</p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card flex flex-col items-center">
          <div ref={wrapRef} className="bg-white rounded-xl p-5 border border-border">
            <QRCodeCanvas value={url} size={240} level="M" marginSize={2} fgColor="#0f1e3d" bgColor="#ffffff" />
          </div>
          <p className="text-sm font-medium mt-4 text-center">{location.trim() || "General complaint"}</p>
          {category !== "none" && <p className="text-xs text-muted-foreground capitalize">{category}</p>}
          <div className="flex gap-3 mt-5 w-full sm:w-auto">
            <Button onClick={download} className="flex-1 sm:flex-none"><Download className="h-4 w-4 mr-2" /> Download PNG</Button>
            <Button onClick={print} variant="outline" className="flex-1 sm:flex-none"><Printer className="h-4 w-4 mr-2" /> Print</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
            Print it and stick it at the spot. Anyone who scans lands straight on the complaint form.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminQR;
