import Image from "next/image";
import Link from "next/link";
import AccountNavButton from "./AccountNavButton";

// Shared platform navigation.
// This appears on normal website pages, but NOT inside the full-screen World Creator.
export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-logo" href="/" aria-label="Chess Multiverse home">
        <Image
          className="site-logo-mark"
          src="/favicon.png"
          alt=""
          width={40}
          height={40}
          priority
        />
        <Image
          className="site-logo-wordmark"
          src="/brand/wordmark-horizontal.png"
          alt="Chess Multiverse"
          width={1254}
          height={1254}
          priority
        />
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
