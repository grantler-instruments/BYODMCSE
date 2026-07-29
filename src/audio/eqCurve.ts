import type { EqBandType } from "./eqPresets";

export const EQ_FREQ_MIN = 20;
export const EQ_FREQ_MAX = 20000;
export const EQ_GAIN_MIN = -24;
export const EQ_GAIN_MAX = 24;
export const EQ_CURVE_POINTS = 128;

export const EQ_BAND_COLORS = [
  "#4fc3f7",
  "#81c784",
  "#ffb74d",
  "#f06292",
  "#ba68c8",
  "#4dd0e1",
  "#aed581",
  "#ff8a65",
] as const;

export interface EqBandCurveInput {
  active: boolean;
  type: EqBandType;
  frequency: number;
  gain: number;
  q: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function freqToX(freq: number, width: number) {
  const logMin = Math.log10(EQ_FREQ_MIN);
  const logMax = Math.log10(EQ_FREQ_MAX);
  const logF = Math.log10(clamp(freq, EQ_FREQ_MIN, EQ_FREQ_MAX));
  return ((logF - logMin) / (logMax - logMin)) * width;
}

export function xToFreq(x: number, width: number) {
  const t = clamp(x / width, 0, 1);
  const logF =
    Math.log10(EQ_FREQ_MIN) +
    t * (Math.log10(EQ_FREQ_MAX) - Math.log10(EQ_FREQ_MIN));
  return Math.pow(10, logF);
}

export function gainToY(gainDb: number, height: number) {
  const t = (gainDb - EQ_GAIN_MIN) / (EQ_GAIN_MAX - EQ_GAIN_MIN);
  return height * (1 - clamp(t, 0, 1));
}

export function yToGain(y: number, height: number) {
  const t = 1 - clamp(y / height, 0, 1);
  return EQ_GAIN_MIN + t * (EQ_GAIN_MAX - EQ_GAIN_MIN);
}

function freqAtIndex(index: number, count: number) {
  const t = index / (count - 1);
  const logF =
    Math.log10(EQ_FREQ_MIN) +
    t * (Math.log10(EQ_FREQ_MAX) - Math.log10(EQ_FREQ_MIN));
  return Math.pow(10, logF);
}

function bellGainDb(f: number, fc: number, gain: number, q: number) {
  const x = Math.log2(f / fc);
  return gain * Math.exp(-(x * x) * q * 0.35);
}

function lowShelfGainDb(f: number, fc: number, gain: number, q: number) {
  const x = Math.log2(f / fc);
  return gain * 0.5 * (1 + Math.tanh(x * q * 0.7));
}

function highShelfGainDb(f: number, fc: number, gain: number, q: number) {
  const x = Math.log2(f / fc);
  return gain * 0.5 * (1 - Math.tanh(x * q * 0.7));
}

function lowCutGainDb(f: number, fc: number, q: number) {
  if (f >= fc) return 0;
  const x = Math.log2(fc / f);
  return -24 * (1 - Math.exp(-(x * x) * q * 0.25));
}

function highCutGainDb(f: number, fc: number, q: number) {
  if (f <= fc) return 0;
  const x = Math.log2(f / fc);
  return -24 * (1 - Math.exp(-(x * x) * q * 0.25));
}

function notchGainDb(f: number, fc: number, q: number) {
  const x = Math.log2(f / fc);
  return -24 * Math.exp(-(x * x) * q * 0.5);
}

function bandPassGainDb(f: number, fc: number, q: number) {
  const x = Math.log2(f / fc);
  const peak = -12 + 12 * Math.exp(-(x * x) * q * 0.35);
  return peak;
}

export function bandGainAtFrequency(band: EqBandCurveInput, frequency: number) {
  if (!band.active) return 0;
  const { type, frequency: fc, gain, q } = band;
  const f = clamp(frequency, EQ_FREQ_MIN, EQ_FREQ_MAX);
  const safeQ = Math.max(q, 0.05);

  switch (type) {
    case "bell":
      return bellGainDb(f, fc, gain, safeQ);
    case "lowShelf":
      return lowShelfGainDb(f, fc, gain, safeQ);
    case "highShelf":
      return highShelfGainDb(f, fc, gain, safeQ);
    case "lowCut":
      return lowCutGainDb(f, fc, safeQ);
    case "highCut":
      return highCutGainDb(f, fc, safeQ);
    case "notch":
      return notchGainDb(f, fc, safeQ);
    case "bandPass":
      return bandPassGainDb(f, fc, safeQ);
    default:
      return 0;
  }
}

export function buildCombinedCurve(
  bands: EqBandCurveInput[],
  outputGainDb: number
): number[] {
  const curve: number[] = [];
  for (let i = 0; i < EQ_CURVE_POINTS; i++) {
    const f = freqAtIndex(i, EQ_CURVE_POINTS);
    let sum = outputGainDb;
    for (const band of bands) {
      sum += bandGainAtFrequency(band, f);
    }
    curve.push(clamp(sum, EQ_GAIN_MIN - 6, EQ_GAIN_MAX + 6));
  }
  return curve;
}

export type EqPlotPadding = { top: number; bottom: number; left: number; right: number };

export function curveToPoints(
  curve: number[],
  width: number,
  height: number,
  padding: EqPlotPadding
) {
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  return curve.map((gainDb, index) => {
    const t = index / (curve.length - 1);
    const freq = freqAtIndex(index, curve.length);
    return {
      freq,
      gainDb,
      x: padding.left + freqToX(freq, plotW),
      y: padding.top + gainToY(gainDb, plotH),
    };
  });
}

export function pointsToLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

export function curveToPath(
  curve: number[],
  width: number,
  height: number,
  padding: EqPlotPadding = { top: 8, bottom: 8, left: 4, right: 4 }
) {
  return pointsToLinePath(curveToPoints(curve, width, height, padding));
}

export function curveToFillPath(
  curve: number[],
  width: number,
  height: number,
  padding: EqPlotPadding
) {
  const points = curveToPoints(curve, width, height, padding);
  if (points.length === 0) return "";
  const zeroY = padding.top + gainToY(0, height - padding.top - padding.bottom);
  const line = pointsToLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(1)} ${zeroY.toFixed(1)} L ${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
}

export function combinedGainAtFrequency(
  bands: EqBandCurveInput[],
  outputGainDb: number,
  frequency: number
) {
  let sum = outputGainDb;
  for (const band of bands) {
    sum += bandGainAtFrequency(band, frequency);
  }
  return sum;
}

export function nearestBandIndex(
  bands: EqBandCurveInput[],
  frequency: number,
  preferActive = true
) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  const logF = Math.log10(clamp(frequency, EQ_FREQ_MIN, EQ_FREQ_MAX));

  bands.forEach((band, index) => {
    if (preferActive && !band.active) return;
    const logFc = Math.log10(clamp(band.frequency, EQ_FREQ_MIN, EQ_FREQ_MAX));
    const distance = Math.abs(logF - logFc);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  if (preferActive && !bands[bestIndex]?.active) {
    return nearestBandIndex(bands, frequency, false);
  }

  return bestIndex;
}

/** Invert band gain so the combined curve passes through target dB at frequency. */
export function gainDeltaForBandAtFrequency(
  bands: EqBandCurveInput[],
  bandIndex: number,
  frequency: number,
  targetTotalDb: number,
  outputGainDb: number
) {
  const band = bands[bandIndex];
  if (!band?.active) return band?.gain ?? 0;

  let base = outputGainDb;
  bands.forEach((other, index) => {
    if (index === bandIndex || !other.active) return;
    base += bandGainAtFrequency(other, frequency);
  });

  const current = base + bandGainAtFrequency(band, frequency);
  const delta = targetTotalDb - current;
  return band.gain + delta;
}

export function distanceToCurve(
  points: { x: number; y: number }[],
  x: number,
  y: number
) {
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : clamp(((x - a.x) * dx + (y - a.y) * dy) / lenSq, 0, 1);
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const dist = Math.hypot(x - px, y - py);
    if (dist < min) min = dist;
  }
  return min;
}

export function formatFrequency(freq: number) {
  if (freq >= 1000) {
    const k = freq / 1000;
    return k >= 10 ? `${Math.round(k)} kHz` : `${k.toFixed(1)} kHz`;
  }
  return `${Math.round(freq)} Hz`;
}

export function bandSupportsGainDrag(type: EqBandType) {
  return type === "bell" || type === "lowShelf" || type === "highShelf";
}

export function handleGainForBand(band: EqBandCurveInput) {
  if (bandSupportsGainDrag(band.type)) return band.gain;
  return 0;
}
