"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuthModal } from "@/components/AuthModalProvider";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function HomeHeroActions() {
  const { openAuth } = useAuthModal();
  const [currentUser, setCurrentUser] = useState(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig() || !supabase) {
      setHasCheckedAuth(true);
      return;
    }

    let isMounted = true;

    async function loadUser() {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!isMounted) return;
        setCurrentUser(user || null);
      } catch {
        if (!isMounted) return;
        setCurrentUser(null);
      } finally {
        if (isMounted) setHasCheckedAuth(true);
      }
    }

    loadUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setCurrentUser(session?.user || null);
      setHasCheckedAuth(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!hasCheckedAuth) {
    return <div className="home-action-row home-action-row-pending" />;
  }

  if (currentUser) {
    return (
      <div className="home-action-row">
        <Link className="home-primary-link" href="/worlds">
          Play Now
        </Link>
        <Link className="home-secondary-link" href="/lobby">
          Visit Multiverse
        </Link>
        <Link className="home-secondary-link" href="/creator">
          Create Universe
        </Link>
      </div>
    );
  }

  return (
    <div className="home-action-row">
      <button
        type="button"
        className="home-primary-link"
        onClick={() => openAuth("sign-up")}
      >
        Create Account
      </button>
      <Link className="home-secondary-link" href="/worlds">
        Browse Universes
      </Link>
    </div>
  );
}
