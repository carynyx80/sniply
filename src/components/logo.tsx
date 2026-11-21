import { cn } from "@/lib/utils";

/**
 * The selected Sniply mark (two rounded ribbons with play-button negative space),
 * extracted from the supplied concept sheet and used as an alpha mask. In the
 * paper & ink system the mark is ink, with one small ink-blue detail: the "play"
 * dot set inside the negative space.
 */
export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span aria-hidden className={cn("relative inline-block size-7 shrink-0", className)}>
      <span
        className={cn("absolute inset-0", mono ? "bg-current" : "bg-ink")}
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
      {!mono && <span className="absolute left-[36%] top-[31%] size-[19%] rounded-full bg-accent" />}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-[26px]" />
      <span className="display text-[26px] leading-none text-text">Sniply</span>
    </span>
  );
}
