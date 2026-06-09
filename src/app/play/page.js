import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

// Play is currently an internal placeholder.
// The real play flow starts from Worlds or Lobby.
export default function PlayPage() {
  return (
    <main className="simple-page">
      <SiteHeader />

      <section className="simple-page-card">
        <p className="home-kicker">Play Setup</p>

        <h1>Start from a World or Challenge</h1>

        <p>
          To play Chess Multiverse, first choose a world from the World Library
          or join a challenge from the Lobby.
        </p>

        <div className="home-action-row">
          <Link className="home-primary-link" href="/worlds">
            Browse Worlds
          </Link>

          <Link className="home-secondary-link" href="/lobby">
            Open Lobby
          </Link>
        </div>
      </section>
    </main>
  );
}