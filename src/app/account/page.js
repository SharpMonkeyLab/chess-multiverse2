"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

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
  const [authMode, setAuthMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("");

  const isSupabaseReady = hasSupabaseConfig();

  useEffect(() => {
    if (!supabase) return;

    async function loadCurrentUser() {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser(user);
    }

    loadCurrentUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignUp(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Supabase is not configured yet.");
      return;
    }

    setAuthStatus("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus(
      "Account created. Check your email if Supabase asks for confirmation."
    );
  }

  async function handleSignIn(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Supabase is not configured yet.");
      return;
    }

    setAuthStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus("Signed in successfully.");
    setPassword("");
  }

  async function handleSignOut() {
    if (!supabase) {
      setAuthStatus("Supabase is not configured yet.");
      return;
    }

    setAuthStatus("Signing out...");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus("Signed out.");
    setPassword("");
  }

  return (
    <main className="platform-page">
      <SiteHeader />

      <div className="account-page-content">
        <section className="platform-hero account-hero">
          <p className="home-kicker">Account</p>

          <h1>Your worlds will live here.</h1>

          <p>
            Accounts are now connected to Supabase Auth. World saving is still
            local for now, but this is the first step toward online profiles,
            online worlds, publishing, and multiplayer.
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
            <p className="home-kicker">Supabase Auth</p>

            <h2>{currentUser ? "Signed in" : "Sign in or create account"}</h2>

            <div
              className={
                isSupabaseReady
                  ? "account-supabase-status connected"
                  : "account-supabase-status missing"
              }
            >
              <strong>Supabase status:</strong>
              <span>
                {isSupabaseReady
                  ? "Environment variables found."
                  : "Environment variables missing."}
              </span>
            </div>

            {currentUser ? (
              <div className="account-current-user-card">
                <p className="home-kicker">Current User</p>

                <h3>{currentUser.email}</h3>

                <p>
                  You are signed in. Later, this account will own online worlds,
                  published worlds, favourites, ratings, and play sessions.
                </p>

                <button type="button" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            ) : (
              <form
                className="account-auth-form"
                onSubmit={
                  authMode === "sign-in" ? handleSignIn : handleSignUp
                }
              >
                <div className="account-auth-tabs">
                  <button
                    type="button"
                    className={authMode === "sign-in" ? "active" : ""}
                    onClick={() => {
                      setAuthMode("sign-in");
                      setAuthStatus("");
                    }}
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    className={authMode === "sign-up" ? "active" : ""}
                    onClick={() => {
                      setAuthMode("sign-up");
                      setAuthStatus("");
                    }}
                  >
                    Sign Up
                  </button>
                </div>

                <label>Email</label>
                <input
                  value={email}
                  type="email"
                  placeholder="you@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <label>Password</label>
                <input
                  value={password}
                  type="password"
                  placeholder="At least 6 characters"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="submit"
                  className="account-auth-submit"
                  disabled={!isSupabaseReady}
                >
                  {authMode === "sign-in" ? "Sign In" : "Create Account"}
                </button>
              </form>
            )}

            {authStatus && (
              <p className="account-auth-status">{authStatus}</p>
            )}
          </article>

          <article className="account-card">
            <p className="home-kicker">Current Storage</p>

            <h2>Local browser saves</h2>

            <p>
              Worlds currently save to localStorage. That means they belong to
              this browser and device only. Exporting JSON is still the safest
              way to move worlds between devices before online saving exists.
            </p>

            <div className="account-storage-note">
              <strong>Current mode:</strong>
              <span>Hybrid: local worlds + Supabase accounts</span>
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