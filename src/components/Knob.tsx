import { useCallback, useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { primary as accentColor } from "../theme";

export interface KnobProps {
  value: number;
  onChange?: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  label?: string;
  disabled?: boolean;
  startAngle?: number;
  endAngle?: number;
  sensitivity?: number;
}

const LABEL_FONT_SIZE = "0.68rem";
const LABEL_LINE_HEIGHT = 1.25;
const LABEL_LINES = 2;

export function Knob({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 56,
  label,
  disabled = false,
  startAngle = 225,
  endAngle = 135,
  sensitivity = 200,
}: KnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const snap = (v: number) => {
    const snapped = Math.round((v - min) / step) * step + min;
    return clamp(parseFloat(snapped.toFixed(10)));
  };

  const norm = (v: number) => (v - min) / (max - min);

  const totalSweep = ((endAngle - startAngle + 360) % 360) || 360;
  const valueToAngle = (v: number) => {
    const a = startAngle + norm(v) * totalSweep;
    return ((a % 360) + 360) % 360;
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToXY = (angleDeg: number, r: number, cx: number, cy: number) => {
    const rad = toRad(angleDeg - 90);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const activeColor = disabled ? "rgba(255, 255, 255, 0.3)" : accentColor;
  const trackColor = "rgba(255, 255, 255, 0.2)";
  const bgColor = "#2e2e2e";
  const ringColor = "rgba(255, 255, 255, 0.14)";

  const strokeWidth = Math.max(3, size * 0.08);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2 - 2;

  const buildArc = (fromAngle: number, toAngle: number) => {
    const start = polarToXY(fromAngle, r, cx, cy);
    const end = polarToXY(toAngle, r, cx, cy);
    const angleDiff = ((toAngle - fromAngle) + 360) % 360;
    const largeArc = angleDiff > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const trackPath = buildArc(startAngle, endAngle);
  const activePath = buildArc(startAngle, valueToAngle(value));

  const indicatorAngle = valueToAngle(value);
  const indicatorR = r * 0.55;
  const indicatorPos = polarToXY(indicatorAngle, indicatorR, cx, cy);

  const emit = useCallback(
    (v: number) => {
      const next = snap(v);
      if (next !== value) onChange?.(next);
    },
    [value, onChange, min, max, step]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startValue: value };

      const onMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const dy = dragRef.current.startY - me.clientY;
        const delta = (dy / sensitivity) * (max - min);
        emit(dragRef.current.startValue + delta);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        dragRef.current = null;
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [disabled, value, emit, sensitivity, min, max]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      dragRef.current = { startY: touch.clientY, startValue: value };

      const onMove = (te: TouchEvent) => {
        if (!dragRef.current || !te.touches[0]) return;
        const t = te.touches[0];
        const dy = dragRef.current.startY - t.clientY;
        const delta = (dy / sensitivity) * (max - min);
        emit(dragRef.current.startValue + delta);
      };

      const onEnd = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        dragRef.current = null;
      };

      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
    },
    [disabled, value, emit, sensitivity, min, max]
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      emit(value + dir * step);
    },
    [disabled, value, emit, step]
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled || dragRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left - cx;
      const my = e.clientY - rect.top - cy;
      let clickAngle = (Math.atan2(my, mx) * 180) / Math.PI + 90;
      if (clickAngle < 0) clickAngle += 360;

      let offset = ((clickAngle - startAngle) + 360) % 360;
      if (offset > totalSweep) {
        offset = offset - totalSweep < totalSweep / 2 ? totalSweep : 0;
      }
      const newValue = min + (offset / totalSweep) * (max - min);
      emit(newValue);
    },
    [disabled, cx, cy, startAngle, totalSweep, min, max, emit]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        emit(value + step);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        emit(value - step);
      } else if (e.key === "Home") {
        e.preventDefault();
        emit(min);
      } else if (e.key === "End") {
        e.preventDefault();
        emit(max);
      }
    },
    [disabled, value, emit, step, min, max]
  );

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        userSelect: "none",
        width: size + 24,
      }}
    >
      <Box
        sx={{
          minHeight: `calc(${LABEL_FONT_SIZE} * ${LABEL_LINE_HEIGHT} * ${LABEL_LINES})`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          mb: 0.75,
        }}
      >
        {label && (
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255, 255, 255, 0.92)",
              fontSize: LABEL_FONT_SIZE,
              fontWeight: 600,
              lineHeight: LABEL_LINE_HEIGHT,
              textAlign: "center",
              letterSpacing: "0.02em",
              wordBreak: "break-word",
              px: 0.25,
            }}
          >
            {label}
          </Typography>
        )}
      </Box>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onSvgClick}
        onKeyDown={onKeyDown}
        style={{
          cursor: disabled ? "not-allowed" : "grab",
          outline: "none",
          display: "block",
        }}
        onFocus={(e) => {
          e.currentTarget.style.filter = `drop-shadow(0 0 ${strokeWidth}px ${accentColor}99)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.filter = "none";
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r - strokeWidth / 2}
          fill={bgColor}
          stroke={ringColor}
          strokeWidth={1}
        />
        <path
          d={trackPath}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={activePath}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={indicatorPos.x}
          cy={indicatorPos.y}
          r={strokeWidth * 0.7}
          fill={activeColor}
        />
      </svg>
    </Box>
  );
}
