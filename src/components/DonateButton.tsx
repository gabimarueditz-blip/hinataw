import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Heart, QrCode, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { useRef, useState } from "react";

/* ═══════════════════ YOUR UPI DONATION DETAILS ═══════════════════
 * The QR below is generated live from this UPI link — scannable by
 * GPay, PhonePe, Paytm and every UPI app. Change it here and the
 * popup's QR updates everywhere.
 */
const UPI_ID = "7078186529@fam";
const PAYEE_NAME = "Rohit Singh";
const DONATE_NOTE_TEXT =
  "Hinataw.exe doesn't run ads or sell your data — it makes no money at all. " +
  "It stays online because viewers like you chip in. Your cooperation keeps the streams alive.";

/** Standard UPI deep link (works with every UPI app's QR scanner). */
const UPI_LINK = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
  PAYEE_NAME,
)}&cu=INR`;

/** Tracks whether an optional custom QR image exists at /donate-qr.png. */
function useQrAvailable() {
  const [state, setState] = useState<"loading" | "ok" | "missing">("missing");
  const probed = useRef(false);
  if (!probed.current) {
    probed.current = true;
    const image = new Image();
    image.onload = () => setState("ok");
    image.onerror = () => setState("missing");
    image.src = "/donate-qr.png";
  }
  return state;
}

/** One shared donation trigger + popup with your live UPI QR. */
export function DonateButton({
  variant = "link",
  label = "Donate",
  className,
}: {
  variant?: "icon" | "link" | "button";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const qrState = useQrAvailable();
  const hasQr = qrState === "ok";

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Support the creator"
        aria-label="Donate to the creator"
        className={cn(
          "clay-sm clay-press flex size-9 shrink-0 items-center justify-center text-clay-blush hover:text-destructive",
          className,
        )}
      >
        <Heart className="size-4" />
      </button>
    ) : variant === "button" ? (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("clay-press rounded-full px-5 font-bold", className)}
      >
        <Heart className="mr-2 size-4 fill-current" />
        {label}
      </Button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "clay-sm clay-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-clay-blush hover:text-destructive",
          className,
        )}
      >
        <Heart className="size-3.5 fill-current" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="clay max-h-[90vh] overflow-y-auto rounded-[2rem] border-none p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-xl font-extrabold">
              <Heart className="size-5 fill-current text-clay-blush" />
              Support the creator
            </DialogTitle>
            <DialogDescription className="text-xs leading-5 text-muted-foreground">
              {DONATE_NOTE_TEXT}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* the live, scannable QR */}
            <div className="clay-well mx-auto w-fit rounded-[1.4rem] bg-white p-4 shadow-inner">
              <QRCode
                value={UPI_LINK}
                size={208}
                bgColor="#ffffff"
                fgColor="#1c1424"
                level="M"
              />
            </div>

            <div className="clay-sm rounded-2xl px-4 py-3 text-center">
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                Pay to
              </p>
              <p className="font-display text-sm font-extrabold">{PAYEE_NAME}</p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-foreground/80">
                {UPI_ID}
              </p>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted-foreground">
              <Smartphone className="size-3.5 text-clay-mint" />
              Scan with GPay, PhonePe, Paytm or any UPI app
            </p>

            {hasQr && (
              <details className="clay-sm overflow-hidden rounded-2xl">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-muted-foreground">
                  <QrCode className="size-3.5" />
                  Prefer your own QR image?
                </summary>
                <div className="px-4 pb-4">
                  <div className="clay-well overflow-hidden rounded-xl bg-white p-2">
                    <img
                      src="/donate-qr.png"
                      alt="Alternate payment QR code"
                      className="mx-auto aspect-square w-full max-w-[220px] object-contain"
                      draggable={false}
                    />
                  </div>
                </div>
              </details>
            )}

            <p className="text-center text-[10px] leading-4 text-muted-foreground/70">
              Every rupee goes straight to the creator — no platform cut, no ads.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
