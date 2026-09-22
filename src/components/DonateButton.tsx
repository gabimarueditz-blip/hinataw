import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Download, Heart, QrCode, Smartphone } from "lucide-react";
import { useRef, useState } from "react";

/* ═══════════════════ YOUR DONATION QR — THE ONLY SETUP STEP ═══════════════
 *
 * 1. Save your payment QR code image as:  public/donate-qr.png
 *    (any png/jpg/webp works — if you use a different name, update
 *    DONATE_QR_SRC below to match, e.g. "/my-upi-qr.jpg")
 *
 * 2. Optionally fill in DONATE_LINK below (a UPI link "upi://pay?..." or any
 *    payment page URL) to add an "Open payment page" button next to the QR.
 */
const DONATE_QR_SRC = "/donate-qr.png";
const DONATE_LINK = "";
const DONATE_NOTE =
  "Hinataw.exe is free for everyone. Donations keep the servers streaming and the library growing.";

/** Tracks whether the owner has dropped a QR image into /public yet. */
function useQrAvailable() {
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const probed = useRef(false);
  if (!probed.current) {
    probed.current = true;
    const image = new Image();
    image.onload = () => setState("ok");
    image.onerror = () => setState("missing");
    image.src = DONATE_QR_SRC;
  }
  return state;
}

/** One shared donation trigger + popup with your payment QR. */
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

          {hasQr ? (
            <div className="space-y-3">
              <div className="clay-well mx-auto w-fit overflow-hidden rounded-[1.4rem] bg-white p-3 shadow-inner">
                <img
                  src={DONATE_QR_SRC}
                  alt="Payment QR code — scan with any UPI app"
                  className="aspect-square w-full max-w-[240px] object-contain"
                  draggable={false}
                />
              </div>

              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                <Smartphone className="size-3.5 text-clay-mint" />
                Scan with GPay, PhonePe, Paytm or any UPI app
              </p>

              <div className="flex gap-2">
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
                {DONATE_LINK && (
                  <Button asChild className="clay-press h-10 flex-1 rounded-full font-bold">
                    <a href={DONATE_LINK} target="_blank" rel="noopener noreferrer">
                      Open payment page
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "clay-well flex flex-col items-center justify-center gap-2 rounded-[1.6rem] px-6 py-10 text-center",
                qrState === "loading" && "animate-pulse",
              )}
            >
              <QrCode className="size-10 text-muted-foreground/50" />
              <p className="text-xs font-bold text-muted-foreground">
                {qrState === "loading" ? "Loading QR…" : "Payment QR coming soon"}
              </p>
              {qrState === "missing" && (
                <p className="text-[11px] leading-4 text-muted-foreground/70">
                  Scan options will appear here — thank you for wanting to help!
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
