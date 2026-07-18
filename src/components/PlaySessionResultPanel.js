import {
    MATCH_RESULT_OPTIONS,
    getMatchResultLabel
} from "@/lib/matchResultClient";

export default function PlaySessionResultPanel({
    playSessionId,
    matchResultState,
    isResultChooserOpen,
    setIsResultChooserOpen,
    resultNote,
    setResultNote,
    isHandlingResultAction,
    isCurrentUserResultProposer,
    sessionLifecycleStatus,
    sessionEndReason,
    onProposeResult,
    onCancelResultProposal,
    onRespondToResult,
    onResolveContinueRequest,
    onResignMatch
}) {
    if (!playSessionId) {
        return null;
    }

    return (
        <div className="play-session-result-panel">
            {matchResultState.matchPhase === "active" && (
                <>
                    <div className="play-session-result-row">
                        <button
                            type="button"
                            onClick={() =>
                                setIsResultChooserOpen((isOpen) => !isOpen)
                            }
                            disabled={isHandlingResultAction}
                        >
                            Finish Match
                        </button>

                        <button
                            type="button"
                            className="danger-button"
                            onClick={onResignMatch}
                            disabled={isHandlingResultAction}
                        >
                            Resign
                        </button>
                    </div>

                    {isResultChooserOpen && (
                        <div className="play-result-choice-panel">
                            <span>Declare result</span>

                            <div className="play-result-choice-grid">
                                {MATCH_RESULT_OPTIONS.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => onProposeResult(option.key)}
                                        disabled={isHandlingResultAction}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={resultNote}
                                onChange={(event) =>
                                    setResultNote(event.target.value)
                                }
                                placeholder="Optional note"
                                rows={2}
                            />
                        </div>
                    )}
                </>
            )}

            {matchResultState.matchPhase === "result_pending" && (
                <div className="play-result-choice-panel">
                    <span>
                        Result proposed:{" "}
                        {getMatchResultLabel(matchResultState.proposedResult)}
                    </span>

                    {isCurrentUserResultProposer ? (
                        <button
                            type="button"
                            onClick={onCancelResultProposal}
                            disabled={isHandlingResultAction}
                        >
                            Cancel Proposal
                        </button>
                    ) : (
                        <div className="play-result-choice-grid">
                            <button
                                type="button"
                                onClick={() => onRespondToResult("agree")}
                                disabled={isHandlingResultAction}
                            >
                                Agree
                            </button>

                            <button
                                type="button"
                                onClick={() => onRespondToResult("request_continue")}
                                disabled={isHandlingResultAction}
                            >
                                Request Continue
                            </button>

                            <button
                                type="button"
                                className="danger-button"
                                onClick={() => onRespondToResult("dispute")}
                                disabled={isHandlingResultAction}
                            >
                                Dispute
                            </button>
                        </div>
                    )}
                </div>
            )}

            {matchResultState.matchPhase === "continue_requested" && (
                <div className="play-result-choice-panel">
                    <span>Opponent requested to continue.</span>

                    {isCurrentUserResultProposer ? (
                        <div className="play-result-choice-grid">
                            <button
                                type="button"
                                onClick={() => onResolveContinueRequest("continue")}
                                disabled={isHandlingResultAction}
                            >
                                Continue Match
                            </button>

                            <button
                                type="button"
                                className="danger-button"
                                onClick={() => onResolveContinueRequest("dispute")}
                                disabled={isHandlingResultAction}
                            >
                                Mark Disputed
                            </button>
                        </div>
                    ) : (
                        <span>Waiting for proposer to respond.</span>
                    )}
                </div>
            )}

            {matchResultState.matchPhase === "completed" && (
                <span className="play-result-final-status">
                    Match completed
                    {matchResultState.confirmedResult
                        ? ` · ${getMatchResultLabel(matchResultState.confirmedResult)}`
                        : ""}
                </span>
            )}

            {matchResultState.matchPhase === "disputed" && (
                <span className="play-result-final-status">
                    Match disputed · no rank or honour will be awarded yet
                </span>
            )}

            {sessionLifecycleStatus !== "open" &&
                matchResultState.matchPhase !== "completed" &&
                matchResultState.matchPhase !== "disputed" && (
                    <span className="play-result-final-status">
                        Match ended
                        {sessionEndReason ? ` · ${sessionEndReason}` : ""}
                    </span>
                )}
        </div>
    );
}