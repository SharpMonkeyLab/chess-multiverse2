import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LobbyClient from "@/components/LobbyClient";

export default function LobbyPage() {
  return (
    <main className="platform-page">
      <SiteHeader />
      <LobbyClient />
      <SiteFooter />
    </main>
  );
}
