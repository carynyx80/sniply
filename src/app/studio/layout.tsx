import { StudioSidebar } from "@/components/studio/sidebar";
import { AuthGate } from "@/components/studio/auth-gate";

export const metadata = { title: "Studio" };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      <StudioSidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <AuthGate>{children}</AuthGate>
      </main>
    </div>
  );
}
