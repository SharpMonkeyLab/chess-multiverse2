import Link from "next/link";
import AccountNavButton from "./AccountNavButton";

// Shared platform navigation.
// This appears on normal website pages, but NOT inside the full-screen World Creator.
export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-logo" href="/">
        Chess Multiverse
      </Link>

      <div className="site-header-right">
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/worlds">Universes</Link>
          <Link href="/lobby">Multiverse</Link>
          <Link href="/creator">Create</Link>
        </nav>

        <AccountNavButton />
      </div>
    </header>
  );
}