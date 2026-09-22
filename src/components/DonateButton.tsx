import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Heart, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";

/* ───────────────────── optional extra: your UPI QR ───────────────────────
 * Drop your payment QR image in as `public/donate-qr.png` and it shows up
 * in the popup automatically as a second way to pay.
 */
const DONATE_QR_SRC = "/donate-qr.png";

const PRESET_AMOUNTS = [49, 99, 199, 499];

/** Minimal shape of the global injected by Razorpay's checkout.js. */
type RazorpayCheckout = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

/** Loads checkout.js once; resolves when window.Razorpay is available. */
function loadRazorpayScript(): Promise<RazorpayCheckout> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay]");
    if (existing) {
      existing.addEventListener("load", () =>
        window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load.")),
      );
      existing.addEventListener("error", () => reject(new Error("Razorpay failed to load.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () =>
      window.Razorpay
        ? resolve(window.Razorpay)
        : reject(new Error("Razorpay loaded but unavailable."));
    script.onerror = () => reject(new Error("Could not reach Razorpay. Check your connection."));
    document.head.appendChild(script);
  });
}

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

const INR = (rupees: number) => `₹${rupees.toLocaleString("en-IN")}`;

/** One shared donation trigger + popup: Razorpay checkout + optional QR. */
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
  const [amount, setAmount] = useState<number>(199);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [paying, setPaying] = useState(false);
  const qrState = useQrAvailable();

  const createOrder = useAction(api.donations.createDonationOrder);
  const verify = useMutation(api.donations.verifyDonation);
  const cancel = useMutation(api.donations.cancelDonation);

  const effectiveAmount = customAmount.trim() ? Number(customAmount) : amount;

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

  const pay = async () => {
    const rupees = Math.round(effectiveAmount);
    if (!Number.isFinite(rupees) || rupees < 1) {
      toast.error("Enter an amount of at least ₹1.");
      return;
    }

    setPaying(true);
    try {
      const RazorpayCtor = await loadRazorpayScript();
      const order = await createOrder({ amountInRupees: rupees });

      const checkout = new RazorpayCtor({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Hinataw.exe",
        description: "Support the studio — keep the streams flowing",
        order_id: order.orderId,
        prefill: donorName.trim() ? { name: donorName.trim() } : undefined,
        theme: { color: "#f472b6" },
        handler: (response) => {
          void verify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            donorName: donorName.trim() || undefined,
          })
            .then(() => {
              toast.success(
                `Thank you for your ${INR(rupees)} donation! You keep Hinataw.exe streaming.`,
              );
              setOpen(false);
              setCustomAmount("");
            })
            .catch((error: unknown) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Payment captured but verification failed — it will still reach us.",
              );
            });
        },
        modal: {
          ondismiss: () => {
            void cancel({ razorpayOrderId: order.orderId }).catch(() => undefined);
            toast("Checkout closed — no charge was made.");
          },
        },
      });
      checkout.open();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start the donation.",
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={(next) => !paying && setOpen(next)}>
        <DialogContent className="clay max-h-[90vh] overflow-y-auto rounded-[2rem] border-none p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-xl font-extrabold">
              <Heart className="size-5 fill-current text-clay-blush" />
              Support the studio
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              Hinataw.exe is free for everyone. Donations pay for streaming
              servers and keep the library growing.
            </DialogDescription>
          </DialogHeader>

          <DonationPanel
            amount={amount}
            setAmount={setAmount}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            donorName={donorName}
            setDonorName={setDonorName}
            paying={paying}
            onPay={() => void pay()}
            qrState={qrState}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------- the donation panel --------------------------- */

function DonationPanel({
  amount,
  setAmount,
  customAmount,
  setCustomAmount,
  donorName,
  setDonorName,
  paying,
  onPay,
  qrState,
}: {
  amount: number;
  setAmount: (value: number) => void;
  customAmount: string;
  setCustomAmount: (value: string) => void;
  donorName: string;
  setDonorName: (value: string) => void;
  paying: boolean;
  onPay: () => void;
  qrState: "loading" | "ok" | "missing";
}) {
  const picked = customAmount.trim() ? Number(customAmount) : amount;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={paying}
            onClick={() => {
              setAmount(preset);
              setCustomAmount("");
            }}
            className={cn(
              "clay-press rounded-2xl py-2.5 text-sm font-extrabold transition",
              amount === preset && !customAmount
                ? "bg-primary text-primary-foreground"
                : "clay-sm text-muted-foreground hover:text-foreground",
            )}
          >
            {INR(preset)}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="donate-custom" className="text-[11px] font-bold">
          Or pick your own (₹)
        </Label>
        <Input
          id="donate-custom"
          inputMode="numeric"
          value={customAmount}
          onChange={(event) => setCustomAmount(event.target.value.replace(/[^\d]/g, ""))}
          placeholder="e.g. 750"
          className="clay-well h-10 rounded-2xl border-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="donate-name" className="text-[11px] font-bold">
          Name on the supporters list (optional)
        </Label>
        <Input
          id="donate-name"
          value={donorName}
          onChange={(event) => setDonorName(event.target.value)}
          placeholder="Anonymous"
          className="clay-well h-10 rounded-2xl border-none"
        />
      </div>

      <Button
        type="button"
        disabled={paying}
        onClick={onPay}
        className="clay-press h-12 w-full rounded-full text-base font-bold"
      >
        {paying ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Opening Razorpay…
          </>
        ) : (
          <>
            <Heart className="mr-2 size-4 fill-current" />
            Donate {Number.isFinite(picked) ? INR(picked) : ""}
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <ShieldCheck className="size-3.5 text-clay-mint" />
        Secure checkout via Razorpay · UPI, cards & netbanking
      </p>

      {qrState === "ok" && (
        <details className="clay-sm overflow-hidden rounded-2xl">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-muted-foreground">
            <QrCode className="size-3.5" />
            Prefer scanning? Show the studio QR
          </summary>
          <div className="px-4 pb-4">
            <div className="clay-well overflow-hidden rounded-xl bg-white p-2">
              <img
                src={DONATE_QR_SRC}
                alt="Payment QR code"
                className="mx-auto aspect-square w-full max-w-[220px] object-contain"
                draggable={false}
              />
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
