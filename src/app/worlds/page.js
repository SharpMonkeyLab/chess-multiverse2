import SiteHeader from "@/components/SiteHeader";
import WorldLibraryClient from "@/components/WorldLibraryClient";

// World Library.
// This is the platform hub for browsing, importing, and opening worlds.
export default function WorldsPage() {
  return (
    <main className="platform-page">
      <SiteHeader />

      <WorldLibraryClient />
    </main>
  );
}