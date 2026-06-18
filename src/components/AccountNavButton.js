"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

function getFallbackDisplayName(user) {
    if (!user?.email) return "Account";

    return user.email.split("@")[0];
}

export default function AccountNavButton() {
    const [currentUser, setCurrentUser] = useState(null);
    const [displayName, setDisplayName] = useState("");
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    useEffect(() => {
        if (!hasSupabaseConfig() || !supabase) {
            setHasCheckedAuth(true);
            return;
        }

        let isMounted = true;

        async function loadProfileName(user) {
            try {
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("id", user.id)
                    .maybeSingle();

                if (!isMounted) return;

                if (error) {
                    console.warn("Could not load profile name:", error.message);
                    setDisplayName(getFallbackDisplayName(user));
                    return;
                }

                setDisplayName(profile?.display_name || getFallbackDisplayName(user));
            } catch (error) {
                if (!isMounted) return;

                console.warn("Could not reach Supabase for profile name:", error);
                setDisplayName(getFallbackDisplayName(user));
            }
        }

        async function loadAccountState() {
            try {
                const {
                    data: { user },
                    error
                } = await supabase.auth.getUser();

                if (!isMounted) return;

                if (error) {
                    console.warn("Could not load header account state:", error.message);
                    setCurrentUser(null);
                    setDisplayName("");
                    setHasCheckedAuth(true);
                    return;
                }

                setCurrentUser(user || null);

                if (user) {
                    await loadProfileName(user);
                } else {
                    setDisplayName("");
                }

                if (isMounted) {
                    setHasCheckedAuth(true);
                }
            } catch (error) {
                if (!isMounted) return;

                console.warn("Supabase header auth check failed:", error);

                setCurrentUser(null);
                setDisplayName("");
                setHasCheckedAuth(true);
            }
        }

        loadAccountState();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user || null;

            setCurrentUser(user);

            if (user) {
                loadProfileName(user);
            } else {
                setDisplayName("");
            }

            setHasCheckedAuth(true);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <Link
            className={
                currentUser
                    ? "site-account-link signed-in"
                    : "site-account-link"
            }
            href="/account"
        >
            {currentUser
                ? displayName || "Account"
                : hasCheckedAuth
                    ? "Sign In"
                    : "Account"}
        </Link>
    );
}