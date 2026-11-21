import { cn } from "@/lib/utils";

/**
 * The selected Sniply mark (two rounded ribbons with play-button negative space),
 * extracted from the supplied concept sheet and used as an alpha mask so the brand
 * gradient fills the exact supplied shape. Do not redraw.
 */
export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-7 shrink-0", mono ? "bg-white" : "bg-brand", className)}
      style={{
        WebkitMaskImage: "url(/brand/sniply-mark.png)",
        maskImage: "url(/brand/sniply-mark.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-[-0.03em]">Sniply</span>
    </span>
  );
}
