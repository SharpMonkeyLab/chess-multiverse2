"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_FALLBACK_STAGE_WIDTH = 1460;
const DEFAULT_FALLBACK_STAGE_HEIGHT = 840;

function readCssPixelValue(variableName, fallbackValue) {
    const rootStyles = getComputedStyle(document.documentElement);
    const rawValue = rootStyles.getPropertyValue(variableName).trim();
    const parsedValue = Number.parseFloat(rawValue);

    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

export function useResponsiveStageLayout({
    fallbackWidth = DEFAULT_FALLBACK_STAGE_WIDTH,
    fallbackHeight = DEFAULT_FALLBACK_STAGE_HEIGHT
} = {}) {
    const baseDevicePixelRatioRef = useRef(null);

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

        function updateStageScale() {
            const designWidth = readCssPixelValue(
                "--stage-design-width",
                fallbackWidth
            );

            const designHeight = readCssPixelValue(
                "--stage-design-height",
                fallbackHeight
            );

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

            const nextScale = Math.min(
                availableWidth / designWidth,
                availableHeight / designHeight
            );

            setStageLayout({
                scale: nextScale,
                width: designWidth * nextScale,
                height: designHeight * nextScale
            });
        }

        updateStageScale();

        window.addEventListener("resize", updateStageScale);

        return () => {
            window.removeEventListener("resize", updateStageScale);
        };
    }, [fallbackWidth, fallbackHeight]);

    return stageLayout;
}