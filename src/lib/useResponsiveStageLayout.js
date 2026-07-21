"use client";

import { useEffect, useRef, useState } from "react";

import {
    STAGE_DESIGN_HEIGHT,
    STAGE_DESIGN_WIDTH
} from "@/lib/stageLayoutConfig";

const DEFAULT_FALLBACK_STAGE_WIDTH = STAGE_DESIGN_WIDTH;
const DEFAULT_FALLBACK_STAGE_HEIGHT = STAGE_DESIGN_HEIGHT;

function readCssPixelValue(variableName, fallbackValue) {
    const rootStyles = getComputedStyle(document.documentElement);
    const rawValue = rootStyles.getPropertyValue(variableName).trim();
    const parsedValue = Number.parseFloat(rawValue);

    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

export function useResponsiveStageLayout({
    fallbackWidth = DEFAULT_FALLBACK_STAGE_WIDTH,
    fallbackHeight = DEFAULT_FALLBACK_STAGE_HEIGHT,
    contentRef = null,
    measureContentHeight = false
} = {}) {
    const baseDevicePixelRatioRef = useRef(null);
    const scaleRef = useRef(1);
    const designWidthRef = useRef(fallbackWidth);
    const designHeightRef = useRef(fallbackHeight);

    const [stageLayout, setStageLayout] = useState({
        scale: 1,
        width: fallbackWidth,
        height: fallbackHeight
    });

    useEffect(() => {
        function getZoomCompensatedViewportSize() {
            if (baseDevicePixelRatioRef.current === null) {
                baseDevicePixelRatioRef.current = window.devicePixelRatio || 1;
            }

            const baseDevicePixelRatio = baseDevicePixelRatioRef.current || 1;
            const currentDevicePixelRatio =
                window.devicePixelRatio || baseDevicePixelRatio;

            const browserZoomRatio = currentDevicePixelRatio / baseDevicePixelRatio;

            return {
                width: window.innerWidth * browserZoomRatio,
                height: window.innerHeight * browserZoomRatio
            };
        }

        function readMeasuredContentHeight() {
            const contentElement = contentRef?.current;

            if (!measureContentHeight || !contentElement) {
                return designHeightRef.current;
            }

            const measuredHeight = contentElement.offsetHeight;

            return measuredHeight > 0 ? measuredHeight : designHeightRef.current;
        }

        function updateStageScale() {
            const designWidth = readCssPixelValue(
                "--stage-design-width",
                fallbackWidth
            );

            const designHeight = readCssPixelValue(
                "--stage-design-height",
                fallbackHeight
            );

            designWidthRef.current = designWidth;
            designHeightRef.current = designHeight;

            const viewportPadding = readCssPixelValue("--viewport-padding", 0);
            const viewportSize = getZoomCompensatedViewportSize();

            const availableWidth = Math.max(
                viewportSize.width - viewportPadding * 2,
                1
            );

            const availableHeight = Math.max(
                viewportSize.height - viewportPadding * 2,
                1
            );

            // Scale from the base board-band design size only — never shrink for dock height.
            const nextScale = Math.min(
                availableWidth / designWidth,
                availableHeight / designHeight
            );

            scaleRef.current = nextScale;

            const contentHeight = readMeasuredContentHeight();

            setStageLayout({
                scale: nextScale,
                width: designWidth * nextScale,
                height: contentHeight * nextScale
            });
        }

        updateStageScale();

        window.addEventListener("resize", updateStageScale);

        let resizeObserver = null;
        const contentElement = contentRef?.current;

        if (measureContentHeight && contentElement && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                const contentHeight = readMeasuredContentHeight();

                setStageLayout((current) => {
                    const nextHeight = contentHeight * scaleRef.current;

                    // Ignore sub-pixel / tiny dock reflows that only jitter the frame.
                    if (
                        current.scale === scaleRef.current &&
                        current.width ===
                            designWidthRef.current * scaleRef.current &&
                        Math.abs(current.height - nextHeight) < 1.5
                    ) {
                        return current;
                    }

                    return {
                        scale: scaleRef.current,
                        width: designWidthRef.current * scaleRef.current,
                        height: nextHeight
                    };
                });
            });

            resizeObserver.observe(contentElement);
        }

        return () => {
            window.removeEventListener("resize", updateStageScale);
            resizeObserver?.disconnect();
        };
    }, [fallbackWidth, fallbackHeight, contentRef, measureContentHeight]);

    return stageLayout;
}
