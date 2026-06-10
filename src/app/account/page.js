"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { hasSupabaseConfig } from "@/lib/supabaseClient";

const FUTURE_ACCOUNT_FEATURES = [
  {
    title: "Save Worlds Online",
    text: "Store your created worlds in your account instead of only in this browser."
  },
  {
    title: "Publish Worlds",
    text: "Share selected worlds publicly so other players can discover and play them."
  },
  {
    title: "Join Challenges",
    text: "Create or join lobby challenges using public or private worlds."
  },
  {
    title: "Track Play History",
    text: "View matches, favourites, ratings, and world activity later."
  }
];

export default function AccountPage() {
  return (
    <main className="platform-page">
      <SiteHeader />

      <div className="account-page-content">
        <section className="platform-hero account-hero">
          <p className="home-kicker">Account</p>

          <h1>Your worlds will live here.</h1>

          <p>
            Accounts are coming soon. For now, Chess Multiverse saves worlds
            locally in this browser. Later, this page will connect to Supabase
            so creators can save, publish, and manage their worlds online.
          </p>

          <div className="home-action-row">
            <Link className="home-primary-link" href="/worlds">
              Browse Worlds
            </Link>

            <Link className="home-secondary-link" href="/creator">
              Create World
            </Link>
          </div>
        </section>

        <section className="account-grid">
          <article className="account-card account-signin-card">
            <p className="home-kicker">Supabase Soon</p>

            <h2>Sign in placeholder</h2>

            <p>
              This panel will become the login and signup area. Later it will
              support email/password or magic link authentication through
              Supabase.
            </p>

            <div
              className={
                hasSupabaseConfig()
                  ? "account-supabase-status connected"
                  : "account-supabase-status missing"
              }
            >
              <strong>Supabase status:</strong>
              <span>
                {hasSupabaseConfig()
                  ? "Environment variables found."
                  : "Environment variables missing."}
              </span>
            </div>

            <div className="account-fake-form">
              <input disabled placeholder="Email address" />
              <input disabled placeholder="Password" type="password" />

              <button type="button" disabled>
                Sign In Soon
              </button>
            </div>
          </article>

          <article className="account-card">
            <p className="home-kicker">Current Storage</p>

            <h2>Local browser saves</h2>

            <p>
              Worlds currently save to localStorage. That means they belong to
              this browser and device only. Exporting JSON is still the safest
              way to move worlds between devices before online accounts exist.
            </p>

            <div className="account-storage-note">
              <strong>Current mode:</strong>
              <span>Offline/local-first development</span>
            </div>
          </article>
        </section>

        <section className="account-card">
          <p className="home-kicker">Future Features</p>

          <h2>What accounts will unlock</h2>

          <div className="account-feature-grid">
            {FUTURE_ACCOUNT_FEATURES.map((feature) => (
              <article className="account-feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}