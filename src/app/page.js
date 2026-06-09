import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Home page for the Chess Multiverse platform.
export default function Home() {
  return (
    <main className="home-page">
      <SiteHeader />

      <section className="home-hero">
        <p className="home-kicker">Chess Multiverse</p>

        <h1>Create worlds. Choose fighters. Play Chess Multiverse.</h1>

        <p className="home-description">
          Browse custom chess-inspired worlds, join live challenges, or build
          your own universe with characters, terrain, counters, conditions,
          board skins, and rules.
        </p>

        <div className="home-action-row">
          <Link className="home-primary-link" href="/worlds">
            Play Now
          </Link>

          <Link className="home-secondary-link" href="/lobby">
            Open Lobby
          </Link>

          <Link className="home-secondary-link" href="/creator">
            Create World
          </Link>
        </div>
      </section>
      
      <SiteFooter />
    </main>
  );
}