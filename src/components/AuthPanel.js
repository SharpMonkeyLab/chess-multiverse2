"use client";

import { useEffect, useState } from "react";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function AuthPanel({
  initialMode = "sign-in",
  onSignInSuccess,
  onSignUpSuccess,
  showTitle = true
}) {
  const [authMode, setAuthMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authStatus, setAuthStatus] = useState("");

  const isSupabaseReady = hasSupabaseConfig();

  useEffect(() => {
    setAuthMode(initialMode);
    setAuthStatus("");
  }, [initialMode]);

  async function handleSignUp(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Account service is not configured yet.");
      return;
    }

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setAuthStatus("Username is required.");
      return;
    }

    setAuthStatus("Creating account...");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: cleanUsername }
      }
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setPassword("");

    if (data?.session?.user) {
      setAuthStatus("Account created.");
      onSignUpSuccess?.(data.session.user);
      return;
    }

    setAuthStatus(
      "Account created. Check your email if confirmation is required, then sign in."
    );
    setAuthMode("sign-in");
  }

  async function handleSignIn(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Account service is not configured yet.");
      return;
    }

    setAuthStatus("Signing in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus("Signed in successfully.");
    setPassword("");
    onSignInSuccess?.(data?.user || null);
  }

  return (
    <div className="auth-panel">
      {showTitle && (
        <h2>
          {authMode === "sign-up" ? "Create account" : "Sign in"}
        </h2>
      )}

      <form
        className="account-auth-form"
        onSubmit={authMode === "sign-in" ? handleSignIn : handleSignUp}
      >
        <div className="account-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "sign-in"}
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
            role="tab"
            aria-selected={authMode === "sign-up"}
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
          autoComplete="email"
        />

        {authMode === "sign-up" && (
          <>
            <label>Username</label>
            <input
              value={username}
              type="text"
              placeholder="How others will see you"
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="nickname"
            />
          </>
        )}

        <label>Password</label>
        <input
          value={password}
          type="password"
          placeholder="At least 6 characters"
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete={
            authMode === "sign-up" ? "new-password" : "current-password"
          }
        />

        <button
          type="submit"
          className="account-auth-submit"
          disabled={!isSupabaseReady}
        >
          {authMode === "sign-in" ? "Sign In" : "Create Account"}
        </button>
      </form>

      {authStatus && <p className="account-auth-status">{authStatus}</p>}
    </div>
  );
}
