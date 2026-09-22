import { cn } from "@/lib/utils";

/**
 * Hinataw.exe brand mark.
 *
 * The artwork lives in `public/logo.svg`, so the favicon, PWA icons and the
 * in-app logo always show the same image — replace that one file to rebrand.
 */
export function BrandArt({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt=""
      aria-hidden
      draggable={false}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
