"use client";

import { useState } from "react";

import {
    cancelMatchResultProposal,
    getMatchResultResponseMessage,
    proposeMatchResult,
    resignMatch,
    respondToMatchResult,
    resolveContinueRequest
} from "@/lib/matchResultClient";

export function createMatchResultStateFromSession(session = {}) {
    return {
        matchPhase: session.match_phase || "active",
        resultStatus: session.result_status || "none",

        proposedResult: session.proposed_result || "",
        confirmedResult: session.confirmed_result || "",
        resultNote: session.result_note || "",

        resultProposedBy: session.result_proposed_by || "",
        resultProposedAt: session.result_proposed_at || "",

        resultResponse: session.result_response || "",
        resultResponseBy: session.result_response_by || "",
        resultResponseAt: session.result_response_at || "",

        resultResolvedBy: session.result_resolved_by || "",
        resultResolvedAt: session.result_resolved_at || "",

        winnerTeam: session.winner_team || "",
        loserTeam: session.loser_team || ""
    };
}

export function useMatchResultFlow({
    playSessionId,
    currentUserId,
    setSessionLifecycleStatus,
    showSessionSyncStatus
}) {
    const [matchResultState, setMatchResultState] = useState(() =>
        createMatchResultStateFromSession()
    );

    const [isResultChooserOpen, setIsResultChooserOpen] = useState(false);
    const [resultNote, setResultNote] = useState("");
    const [isHandlingResultAction, setIsHandlingResultAction] = useState(false);

    const isCurrentUserResultProposer =
        Boolean(matchResultState.resultProposedBy) &&
        matchResultState.resultProposedBy === currentUserId;

    const isResultFlowBlockingBoard =
        Boolean(playSessionId) && matchResultState.matchPhase !== "active";

    function syncMatchResultStateFromSession(session = {}) {
        setMatchResultState(createMatchResultStateFromSession(session));
    }

    function resetMatchResultFlow() {
        setMatchResultState(createMatchResultStateFromSession());
        setIsResultChooserOpen(false);
        setResultNote("");
    }

    async function handleProposeResult(resultKey) {
        if (!playSessionId) return;

        setIsHandlingResultAction(true);
        showSessionSyncStatus("Submitting result proposal...");

        try {
            const result = await proposeMatchResult({
                sessionId: playSessionId,
                result: resultKey,
                note: resultNote
            });

            if (result?.status === "error") {
                console.warn("Could not propose result:", result.message);
                showSessionSyncStatus("Result proposal failed.");
                return;
            }

            if (result?.status === "not_allowed") {
                showSessionSyncStatus(
                    getMatchResultResponseMessage(result.reason)
                );
                return;
            }

            setIsResultChooserOpen(false);
            setResultNote("");

            setMatchResultState((currentState) => ({
                ...currentState,
                matchPhase: "result_pending",
                resultStatus: "pending",
                proposedResult: resultKey,
                resultProposedBy: currentUserId
            }));

            showSessionSyncStatus("Result proposed.");
        } catch (error) {
            console.warn("Could not propose result:", error);
            showSessionSyncStatus("Result proposal failed.");
        } finally {
            setIsHandlingResultAction(false);
        }
    }

    async function handleCancelResultProposal() {
        if (!playSessionId) return;

        setIsHandlingResultAction(true);
        showSessionSyncStatus("Cancelling result proposal...");

        try {
            const result = await cancelMatchResultProposal(playSessionId);

            if (result?.status === "error") {
                console.warn("Could not cancel proposal:", result.message);
                showSessionSyncStatus("Cancel failed.");
                return;
            }

            if (result?.status === "not_allowed") {
                showSessionSyncStatus(
                    getMatchResultResponseMessage(result.reason)
                );
                return;
            }

            resetMatchResultFlow();
            showSessionSyncStatus("Result proposal cancelled.");
        } catch (error) {
            console.warn("Could not cancel proposal:", error);
            showSessionSyncStatus("Cancel failed.");
        } finally {
            setIsHandlingResultAction(false);
        }
    }

    async function handleRespondToResult(response) {
        if (!playSessionId) return;

        setIsHandlingResultAction(true);
        showSessionSyncStatus("Sending result response...");

        try {
            const result = await respondToMatchResult({
                sessionId: playSessionId,
                response
            });

            if (result?.status === "error") {
                console.warn("Could not respond to result:", result.message);
                showSessionSyncStatus("Response failed.");
                return;
            }

            if (result?.status === "not_allowed") {
                showSessionSyncStatus(
                    getMatchResultResponseMessage(result.reason)
                );
                return;
            }

            if (result?.status === "completed") {
                setSessionLifecycleStatus("ended");

                setMatchResultState((currentState) => ({
                    ...currentState,
                    matchPhase: "completed",
                    resultStatus: "agreed",
                    confirmedResult:
                        result.confirmed_result || currentState.proposedResult,
                    winnerTeam: result.winner_team || "",
                    loserTeam: result.loser_team || ""
                }));

                showSessionSyncStatus("Result agreed. Match completed.");
                return;
            }

            if (result?.status === "disputed") {
                setSessionLifecycleStatus("ended");

                setMatchResultState((currentState) => ({
                    ...currentState,
                    matchPhase: "disputed",
                    resultStatus: "disputed"
                }));

                showSessionSyncStatus("Result disputed.");
                return;
            }

            if (result?.status === "continue_requested") {
                setMatchResultState((currentState) => ({
                    ...currentState,
                    matchPhase: "continue_requested",
                    resultStatus: "continue_requested",
                    resultResponse: "request_continue",
                    resultResponseBy: currentUserId
                }));

                showSessionSyncStatus("Continue requested.");
            }
        } catch (error) {
            console.warn("Could not respond to result:", error);
            showSessionSyncStatus("Response failed.");
        } finally {
            setIsHandlingResultAction(false);
        }
    }

    async function handleResolveContinueRequest(decision) {
        if (!playSessionId) return;

        setIsHandlingResultAction(true);
        showSessionSyncStatus("Resolving continue request...");

        try {
            const result = await resolveContinueRequest({
                sessionId: playSessionId,
                decision
            });

            if (result?.status === "error") {
                console.warn("Could not resolve continue request:", result.message);
                showSessionSyncStatus("Continue response failed.");
                return;
            }

            if (result?.status === "not_allowed") {
                showSessionSyncStatus(
                    getMatchResultResponseMessage(result.reason)
                );
                return;
            }

            if (result?.status === "continued") {
                resetMatchResultFlow();
                showSessionSyncStatus("Match continued.");
                return;
            }

            if (result?.status === "disputed") {
                setSessionLifecycleStatus("ended");

                setMatchResultState((currentState) => ({
                    ...currentState,
                    matchPhase: "disputed",
                    resultStatus: "disputed"
                }));

                showSessionSyncStatus("Match marked disputed.");
            }
        } catch (error) {
            console.warn("Could not resolve continue request:", error);
            showSessionSyncStatus("Continue response failed.");
        } finally {
            setIsHandlingResultAction(false);
        }
    }

    async function handleResignMatch() {
        if (!playSessionId) return;

        const shouldResign = window.confirm(
            "Resign this match? This gives the win to your opponent."
        );

        if (!shouldResign) return;

        setIsHandlingResultAction(true);
        showSessionSyncStatus("Resigning match...");

        try {
            const result = await resignMatch(playSessionId);

            if (result?.status === "error") {
                console.warn("Could not resign:", result.message);
                showSessionSyncStatus("Resign failed.");
                return;
            }

            if (result?.status === "not_allowed") {
                showSessionSyncStatus(
                    getMatchResultResponseMessage(result.reason)
                );
                return;
            }

            setSessionLifecycleStatus("ended");

            setMatchResultState((currentState) => ({
                ...currentState,
                matchPhase: "completed",
                resultStatus: "resigned",
                confirmedResult: result.confirmed_result || "",
                winnerTeam: result.winner_team || "",
                loserTeam: result.loser_team || ""
            }));

            showSessionSyncStatus("You resigned. Match completed.");
        } catch (error) {
            console.warn("Could not resign:", error);
            showSessionSyncStatus("Resign failed.");
        } finally {
            setIsHandlingResultAction(false);
        }
    }

    return {
        matchResultState,
        setMatchResultState,
        isResultChooserOpen,
        setIsResultChooserOpen,
        resultNote,
        setResultNote,
        isHandlingResultAction,
        isCurrentUserResultProposer,
        isResultFlowBlockingBoard,
        syncMatchResultStateFromSession,
        resetMatchResultFlow,
        handleProposeResult,
        handleCancelResultProposal,
        handleRespondToResult,
        handleResolveContinueRequest,
        handleResignMatch
    };
}