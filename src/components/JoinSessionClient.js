"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import SiteHeader from "./SiteHeader";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function JoinSessionClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const sessionId = searchParams.get("session");

    const [status, setStatus] = useState("Preparing invite...");
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        async function joinSession() {
            if (!sessionId) {
                setStatus("No session invite was found.");
                return;
            }

            if (!hasSupabaseConfig() || !supabase) {
                setStatus("Online sessions are not available.");
                return;
            }

            setIsJoining(true);
            setStatus("Checking account...");

            try {
                const {
                    data: { user },
                    error: userError
                } = await supabase.auth.getUser();

                if (userError || !user) {
                    setStatus("Sign in first, then open this invite link again.");
                    setIsJoining(false);
                    return;
                }

                setStatus("Joining session...");

                const { error: participantError } = await supabase
                    .from("play_session_participants")
                    .insert({
                        session_id: sessionId,
                        user_id: user.id,
                        role: "player",
                        team: "black",
                        conduct_score: 0
                    });

                // PostgreSQL unique violation.
                // This means the user is already in the session, which is fine.
                if (participantError && participantError.code !== "23505") {
                    setStatus(participantError.message || "Could not join this session.");
                    setIsJoining(false);
                    return;
                }

                setStatus("Session joined. Opening board...");
                router.push(`/play?session=${sessionId}`);
            } catch (error) {
                console.error("Join session failed:", error);
                setStatus("Could not join this session.");
                setIsJoining(false);
            }
        }

        joinSession();
    }, [router, sessionId]);

    return (
        <main className="simple-page">
            <SiteHeader />

            <section className="simple-page-card join-session-card">
                <p className="home-kicker">Session Invite</p>

                <h1>Join Play Session</h1>

                <p>{status}</p>

                {!isJoining && (
                    <div className="home-action-row">
                        <Link className="home-primary-link" href="/worlds">
                            Browse Worlds
                        </Link>

                        <Link className="home-secondary-link" href="/account">
                            Account
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}