"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
    normalizeWorldFeatures,
    rollDiceDefinitions
} from "@/lib/worldSystems";

const ROLL_TUMBLE_MS = 1100;
const ROLL_SETTLE_MS = 300;
const ROLL_FADE_MS = 200;
const GOALS_LEAVE_MS = 120;

function prefersReducedMotion() {
    if (typeof window === "undefined" || !window.matchMedia) {
        return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function PlayLeftSystemsRail({
    worldFeatures,
    systemsRuntime,
    onSystemsRuntimeChange,
    onLogAction = () => {}
}) {
    const features = normalizeWorldFeatures(worldFeatures);
    const [isRolling, setIsRolling] = useState(false);
    const [overlayPhase, setOverlayPhase] = useState(""); // tumble | settle | fade
    const [overlayResults, setOverlayResults] = useState([]);
    const [goalsOpen, setGoalsOpen] = useState(false);
    const goalsLeaveTimerRef = useRef(null);
    const rollTimersRef = useRef([]);

    const showDice = features.diceSystem && systemsRuntime?.dice;
    const showGoals = features.objectives && systemsRuntime?.objectives;

    const selectedGoals = useMemo(() => {
        return systemsRuntime?.objectives?.selected || [];
    }, [systemsRuntime]);

    const completedCount = useMemo(() => {
        const completed = new Set(systemsRuntime?.objectives?.completedKeys || []);
        return selectedGoals.filter((item) => completed.has(item.key)).length;
    }, [selectedGoals, systemsRuntime]);

    useEffect(() => {
        return () => {
            rollTimersRef.current.forEach((id) => window.clearTimeout(id));
            if (goalsLeaveTimerRef.current) {
                window.clearTimeout(goalsLeaveTimerRef.current);
            }
        };
    }, []);

    if (!showDice && !showGoals) {
        return null;
    }

    function updateRuntime(patchOrUpdater) {
        if (typeof patchOrUpdater === "function") {
            onSystemsRuntimeChange?.(patchOrUpdater);
            return;
        }

        onSystemsRuntimeChange?.((current) => ({
            ...(current || {}),
            ...patchOrUpdater
        }));
    }

    function clearRollTimers() {
        rollTimersRef.current.forEach((id) => window.clearTimeout(id));
        rollTimersRef.current = [];
    }

    function handleRollDice({ isReroll = false } = {}) {
        if (!systemsRuntime?.dice || isRolling) return;

        if (isReroll && !systemsRuntime.dice.allowReroll) {
            return;
        }

        clearRollTimers();

        const results = rollDiceDefinitions(systemsRuntime.dice.definitions);

        updateRuntime({
            dice: {
                ...systemsRuntime.dice,
                lastRoll: {
                    at: new Date().toISOString(),
                    results,
                    isReroll
                }
            }
        });

        onLogAction(
            `${isReroll ? "Reroll" : "Roll"}: ${results
                .map((result) => `${result.label} ${result.value}`)
                .join(", ")}.`,
            "dice"
        );

        setIsRolling(true);
        setOverlayResults(results.slice(0, 3));

        const reduced = prefersReducedMotion();

        if (reduced) {
            setOverlayPhase("settle");
            const fadeId = window.setTimeout(() => {
                setOverlayPhase("fade");
                const doneId = window.setTimeout(() => {
                    setIsRolling(false);
                    setOverlayPhase("");
                    setOverlayResults([]);
                }, ROLL_FADE_MS);
                rollTimersRef.current.push(doneId);
            }, 300);
            rollTimersRef.current.push(fadeId);
            return;
        }

        clearRollTimers();
        setOverlayPhase("tumble");

        const settleId = window.setTimeout(() => {
            setOverlayPhase("settle");
            const fadeId = window.setTimeout(() => {
                setOverlayPhase("fade");
                const doneId = window.setTimeout(() => {
                    setIsRolling(false);
                    setOverlayPhase("");
                    setOverlayResults([]);
                }, ROLL_FADE_MS);
                rollTimersRef.current.push(doneId);
            }, ROLL_SETTLE_MS);
            rollTimersRef.current.push(fadeId);
        }, ROLL_TUMBLE_MS);

        rollTimersRef.current.push(settleId);
    }

    function handleToggleGoalComplete(goalKey) {
        if (!systemsRuntime?.objectives) return;

        const completedKeys = new Set(
            systemsRuntime.objectives.completedKeys || []
        );

        if (completedKeys.has(goalKey)) {
            completedKeys.delete(goalKey);
        } else {
            completedKeys.add(goalKey);
        }

        updateRuntime({
            objectives: {
                ...systemsRuntime.objectives,
                completedKeys: Array.from(completedKeys)
            }
        });
    }

    function openGoals() {
        if (goalsLeaveTimerRef.current) {
            window.clearTimeout(goalsLeaveTimerRef.current);
            goalsLeaveTimerRef.current = null;
        }
        setGoalsOpen(true);
    }

    function scheduleCloseGoals() {
        if (goalsLeaveTimerRef.current) {
            window.clearTimeout(goalsLeaveTimerRef.current);
        }

        goalsLeaveTimerRef.current = window.setTimeout(() => {
            setGoalsOpen(false);
            goalsLeaveTimerRef.current = null;
        }, GOALS_LEAVE_MS);
    }

    const lastRoll = systemsRuntime?.dice?.lastRoll;
    const primaryResult = lastRoll?.results?.[0] || null;
    const primarySides = Math.max(
        2,
        Number(systemsRuntime?.dice?.definitions?.[0]?.sides) || 6
    );
    const dieTypeLabel = `d${primarySides}`;
    const lastRollText = lastRoll
        ? lastRoll.results
              .map((result) => `${result.label}: ${result.value}`)
              .join(" · ")
        : "";

    const railModeClass =
        showDice && showGoals
            ? "has-both"
            : showDice
              ? "has-dice-only"
              : "has-goals-only";

    const overlay =
        typeof document !== "undefined" && isRolling && overlayPhase
            ? createPortal(
                  <div
                      className={`play-dice-roll-overlay is-${overlayPhase}`}
                      role="presentation"
                      aria-live="polite"
                      aria-label="Dice rolling"
                  >
                      <div className="play-dice-roll-scrim" />
                      <div className="play-dice-roll-stage">
                          {(overlayResults.length > 0
                              ? overlayResults
                              : [{ label: "Die", value: "?" }]
                          ).map((result, index) => (
                              <div
                                  key={`${result.label}-${index}`}
                                  className={`play-dice-roll-cube${
                                      overlayPhase === "tumble"
                                          ? " is-tumbling"
                                          : ""
                                  }${
                                      overlayPhase === "settle"
                                          ? " is-settled"
                                          : ""
                                  }`}
                                  style={{ animationDelay: `${index * 80}ms` }}
                              >
                                  <span className="play-dice-roll-cube-face">
                                      <span className="play-dice-roll-value-final">
                                          {result.value}
                                      </span>
                                      <span
                                          className="play-dice-roll-value-spin"
                                          aria-hidden="true"
                                      >
                                          <span>1</span>
                                          <span>2</span>
                                          <span>3</span>
                                          <span>4</span>
                                          <span>5</span>
                                          <span>6</span>
                                      </span>
                                  </span>
                                  <span className="play-dice-roll-cube-label">
                                      {result.label}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>,
                  document.body
              )
            : null;

    const diceModule = showDice ? (
        <div className="play-rail-dice">
            <p className="play-rail-dice-title">Dice</p>
            <div className="play-rail-die-wrap">
                <button
                    type="button"
                    className={`play-rail-die-face${
                        isRolling ? " is-rolling" : ""
                    }`}
                    onClick={() => handleRollDice()}
                    disabled={isRolling}
                    title={
                        lastRollText
                            ? `Last roll: ${lastRollText}. Click to roll.`
                            : `Roll ${dieTypeLabel}`
                    }
                    aria-label={`Roll ${dieTypeLabel}`}
                >
                    {primaryResult ? (
                        <span className="play-rail-die-value">
                            {primaryResult.value}
                        </span>
                    ) : (
                        <span className="play-rail-die-value play-rail-die-type">
                            {dieTypeLabel}
                        </span>
                    )}
                </button>
                {systemsRuntime.dice.allowReroll ? (
                    <button
                        type="button"
                        className="play-rail-die-reroll"
                        disabled={isRolling || !lastRoll}
                        onClick={() => handleRollDice({ isReroll: true })}
                        title="Reroll"
                    >
                        Re
                    </button>
                ) : null}
            </div>
        </div>
    ) : null;

    const goalsModule = showGoals ? (
        <div className="play-rail-objectives">
            <div
                className={`play-rail-objectives-peek${
                    goalsOpen ? " is-open" : ""
                }`}
                tabIndex={0}
                aria-label="Goals"
                aria-expanded={goalsOpen}
                onMouseEnter={openGoals}
                onMouseLeave={scheduleCloseGoals}
                onFocus={openGoals}
                onBlur={scheduleCloseGoals}
            >
                <div className="play-rail-objectives-tab" aria-hidden="true">
                    <span className="play-rail-objectives-seal">◈</span>
                    <span className="play-rail-objectives-label">Goals</span>
                    <span className="play-rail-objectives-badge">
                        {selectedGoals.length === 0
                            ? "0"
                            : `${completedCount}/${selectedGoals.length}`}
                    </span>
                </div>
                <div
                    className="play-rail-objectives-panel"
                    onMouseEnter={openGoals}
                    onMouseLeave={scheduleCloseGoals}
                >
                    <h3>Goals</h3>
                    {selectedGoals.length === 0 ? (
                        <p className="small muted">None selected.</p>
                    ) : (
                        <ul className="play-system-objectives">
                            {selectedGoals.map((item) => {
                                const isComplete = (
                                    systemsRuntime.objectives.completedKeys || []
                                ).includes(item.key);

                                return (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            className={
                                                isComplete
                                                    ? "play-objective-toggle done"
                                                    : "play-objective-toggle"
                                            }
                                            onClick={() =>
                                                handleToggleGoalComplete(item.key)
                                            }
                                        >
                                            <span
                                                className="play-objective-pip"
                                                aria-hidden="true"
                                            />
                                            <span className="play-objective-title">
                                                {item.title || "Goal"}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <div
                className={`play-left-systems-rail ${railModeClass}`}
                aria-label="Board systems"
            >
                {showDice && showGoals ? (
                    <>
                        <div className="play-left-systems-slot play-left-systems-slot-top">
                            {diceModule}
                        </div>
                        <div className="play-left-systems-slot play-left-systems-slot-bottom">
                            {goalsModule}
                        </div>
                    </>
                ) : (
                    <div className="play-left-systems-slot play-left-systems-slot-solo">
                        {diceModule}
                        {goalsModule}
                    </div>
                )}
            </div>
            {overlay}
        </>
    );
}
