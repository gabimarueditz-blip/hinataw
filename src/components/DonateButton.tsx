import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Download, ExternalLink, Heart, QrCode } from "lucide-react";
import { useState } from "react";

/* ────────────────────── donation setup (edit these) ──────────────────────
 * 1. Save your payment QR code as `public/donate-qr.png`
 *    (any png/jpg/webp — update DONATE_QR_SRC below if you rename it).
 *    It then appears automatically in this popup — no other code changes.
 * 2. Optionally paste a payment link (UPI page, PayPal, Ko-fi, Stripe…):
 */
const DONATE_QR_SRC = "/donate-qr.png";
const DONATE_LINK = "";
const DONATE_NOTE =
  "Hinataw.exe is free for everyone. Donations keep the servers streaming and the library growing.";

/** One shared trigger + popup used by the header, profile and landing page. */
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
  /** Track whether the owner has dropped a QR image into /public yet. */
  const [qrState, setQrState] = useState<"loading" | "ok" | "missing">("loading");
  const hasQr = qrState === "ok";
  const hasAnyWay = hasQr || DONATE_LINK.length > 0;

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Support with a donation"
        aria-label="Donate"
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
          "inline-flex items-center gap-1.5 text-xs font-bold text-clay-blush hover:text-destructive",
          className,
        )}
      >
        <Heart className="size-3.5 fill-current" />
        {label}
      </button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="clay rounded-[2rem] border-none p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-xl font-extrabold">
              <Heart className="size-5 fill-current text-clay-blush" />
              Support the studio
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">{DONATE_NOTE}</DialogDescription>
          </DialogHeader>

          <div className="clay-well relative aspect-square overflow-hidden rounded-[1.6rem]">
            {hasQr ? (
              <img
                src={DONATE_QR_SRC}
                alt="Payment QR code"
                className="size-full bg-white object-contain p-3"
                draggable={false}
              />
            ) : (
              <div
                className={cn(
                  "flex size-full flex-col items-center justify-center gap-2 p-6 text-center",
                  qrState === "loading" && "animate-pulse",
                )}
              >
                <QrCode className="size-10 text-muted-foreground/50" />
                <p className="text-xs font-bold text-muted-foreground">
                  {qrState === "loading" ? "Loading QR…" : "Payment QR coming soon"}
                </p>
                <p className="text-[11px] leading-4 text-muted-foreground/70">
                  {qrState === "loading"
                    ? ""
                    : "Scan options will appear here — thank you for wanting to help!"}
                </p>
              </div>
            )}
          </div>

          {hasAnyWay && (
            <div className="flex gap-2">
              {hasQr && (
                <Button
                  asChild
                  variant="secondary"
                  className="clay-sm h-10 flex-1 rounded-full font-bold"
                >
                  <a href={DONATE_QR_SRC} download="hinataw-donate-qr">
                    <Download className="mr-2 size-4" />
                    Save QR
                  </a>
                </Button>
              )}
              {DONATE_LINK && (
                <Button asChild className="clay-press h-10 flex-1 rounded-full font-bold">
                  <a href={DONATE_LINK} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 size-4" />
                    Open payment page
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
