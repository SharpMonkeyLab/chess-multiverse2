"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import SiteHeader from "./SiteHeader";

import { joinPlaySessionByInvite } from "@/lib/joinSessionClient";

export default function JoinSessionClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const sessionId = searchParams.get("session");

    const [status, setStatus] = useState("Opening invite...");
    const [isJoining, setIsJoining] = useState(false);
    const [needsAuth, setNeedsAuth] = useState(false);

    useEffect(() => {
        async function joinSession() {
            if (!sessionId) {
                setStatus("This invite link is missing a session.");
                return;
            }

            setIsJoining(true);
            setNeedsAuth(false);
            setStatus("Joining session...");

            try {
                const result = await joinPlaySessionByInvite(sessionId);

                if (result.status === "auth_required") {
                    setNeedsAuth(true);
                    setStatus(result.message);
                    setIsJoining(false);
                    return;
                }

                if (result.status !== "joined") {
                    setStatus(result.message || "Could not join this session.");
                    setIsJoining(false);
                    return;
                }

                setStatus(result.message || "Joined. Opening board...");
                router.push(`/play?session=${sessionId}`);
            } catch (error) {
                console.error("Join session failed:", error);
                setStatus("Could not join this session. Try the invite again.");
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
                            Browse Universes
                        </Link>

                        <Link
                            className="home-secondary-link"
                            href={
                                needsAuth
                                    ? `/account?next=${encodeURIComponent(`/join?session=${sessionId || ""}`)}`
                                    : "/account"
                            }
                        >
                            Account
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
