import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Knob } from "@grantler-instruments/mui-theme";
import {
  EQ_BAND_TYPE_LABELS,
  type EqBandParams,
  parseEqBands,
} from "../audio/eqPresets";
import {
  EQ_BAND_COLORS,
  bandSupportsGainDrag,
  buildCombinedCurve,
  clamp,
  combinedGainAtFrequency,
  curveToFillPath,
  curveToPoints,
  formatFrequency,
  freqToX,
  gainDeltaForBandAtFrequency,
  gainToY,
  nearestBandIndex,
  pointsToLinePath,
  xToFreq,
  yToGain,
} from "../audio/eqCurve";
import useLiveSetStore from "../store/liveSet";

const GRAPH_WIDTH = 400;
const GRAPH_HEIGHT = 200;
const PLOT = { top: 12, bottom: 18, left: 32, right: 10 };
const PLOT_W = GRAPH_WIDTH - PLOT.left - PLOT.right;
const PLOT_H = GRAPH_HEIGHT - PLOT.top - PLOT.bottom;
const GRID_FREQS = [100, 1000, 10000];
const HANDLE_HIT_PX = 16;

interface Props {
  effect: { id: string; name?: string; type: string; parameters: Record<string, any> };
  dragHandleProps?: Record<string, unknown>;
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const local = pt.matrixTransform(matrix.inverse());
  return { x: local.x, y: local.y };
}

const EqEffect = ({ effect, dragHandleProps }: Props) => {
  const theme = useTheme();
  const setParameterValue = useLiveSetStore((state) => state.setParameterValue);
  const parameters = effect.parameters ?? {};
  const activeParam = parameters.active as { id: string; value: boolean } | undefined;
  const outputParam = parameters.outputGain as {
    id: string;
    value: number;
    options?: { min: number; max: number };
  } | undefined;
  const isActive = activeParam?.value ?? true;

  const bands = useMemo(() => parseEqBands(parameters), [parameters]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverPlot, setHoverPlot] = useState<{ freq: number; gain: number } | null>(
    null
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedBand = bands[selectedIndex] ?? bands[0];
  const outputGain = outputParam?.value ?? 0;

  const curveInputs = useMemo(
    () =>
      bands.map((band) => ({
        active: band.active.value,
        type: band.type.value,
        frequency: band.freq.value,
        gain: band.gain.value,
        q: band.q.value,
      })),
    [bands]
  );

  const curve = useMemo(
    () => buildCombinedCurve(curveInputs, outputGain),
    [curveInputs, outputGain]
  );

  const curvePoints = useMemo(
    () => curveToPoints(curve, GRAPH_WIDTH, GRAPH_HEIGHT, PLOT),
    [curve]
  );

  const curveLinePath = useMemo(() => pointsToLinePath(curvePoints), [curvePoints]);
  const curveFillPath = useMemo(
    () => curveToFillPath(curve, GRAPH_WIDTH, GRAPH_HEIGHT, PLOT),
    [curve]
  );

  const zeroLineY = PLOT.top + gainToY(0, PLOT_H);

  const plotCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const { x, y } = clientToSvg(svg, clientX, clientY);
    const plotX = clamp(x - PLOT.left, 0, PLOT_W);
    const plotY = clamp(y - PLOT.top, 0, PLOT_H);
    return {
      plotX,
      plotY,
      freq: xToFreq(plotX, PLOT_W),
      gainDb: yToGain(plotY, PLOT_H),
      x: PLOT.left + plotX,
      y: PLOT.top + plotY,
    };
  }, []);

  const pickBandAtPointer = useCallback(
    (clientX: number, clientY: number) => {
      const coords = plotCoords(clientX, clientY);
      if (!coords) return selectedIndex;

      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        const hx = PLOT.left + freqToX(band.freq.value, PLOT_W);
        const hy =
          PLOT.top +
          gainToY(combinedGainAtFrequency(curveInputs, outputGain, band.freq.value), PLOT_H);
        if (Math.hypot(coords.x - hx, coords.y - hy) <= HANDLE_HIT_PX) {
          return i;
        }
      }

      return nearestBandIndex(curveInputs, coords.freq, true);
    },
    [bands, curveInputs, curvePoints, outputGain, plotCoords, selectedIndex]
  );

  const applyPlotEdit = useCallback(
    (bandIndex: number, clientX: number, clientY: number) => {
      const coords = plotCoords(clientX, clientY);
      const band = bands[bandIndex];
      if (!coords || !band) return;

      const freq = clamp(
        coords.freq,
        band.freq.options.min,
        band.freq.options.max
      );
      setParameterValue(band.freq.id, Math.round(freq));

      if (bandSupportsGainDrag(band.type.value)) {
        const nextGain = gainDeltaForBandAtFrequency(
          curveInputs,
          bandIndex,
          freq,
          coords.gainDb,
          outputGain
        );
        setParameterValue(
          band.gain.id,
          clamp(
            Math.round(nextGain * 10) / 10,
            band.gain.options.min,
            band.gain.options.max
          )
        );
      }
    },
    [bands, curveInputs, outputGain, plotCoords, setParameterValue]
  );

  useEffect(() => {
    if (draggingIndex === null) return;

    const onMove = (event: PointerEvent) => {
      applyPlotEdit(draggingIndex, event.clientX, event.clientY);
      const coords = plotCoords(event.clientX, event.clientY);
      if (coords) {
        setHoverPlot({ freq: coords.freq, gain: coords.gainDb });
      }
    };
    const onUp = () => {
      setDraggingIndex(null);
      setHoverPlot(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [applyPlotEdit, draggingIndex, plotCoords]);

  const stopAccordionToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const beginBandDrag = (
    event: React.PointerEvent,
    bandIndex: number,
    captureTarget?: Element
  ) => {
    event.stopPropagation();
    event.preventDefault();
    (captureTarget ?? event.currentTarget as Element).setPointerCapture(
      event.pointerId
    );

    const band = bands[bandIndex];
    setSelectedIndex(bandIndex);
    if (band && !band.active.value) {
      setParameterValue(band.active.id, true);
    }
    setDraggingIndex(bandIndex);
    applyPlotEdit(bandIndex, event.clientX, event.clientY);

    const coords = plotCoords(event.clientX, event.clientY);
    if (coords) {
      setHoverPlot({ freq: coords.freq, gain: coords.gainDb });
    }
  };

  const onPlotPointerDown = (event: React.PointerEvent) => {
    const bandIndex = pickBandAtPointer(event.clientX, event.clientY);
    beginBandDrag(event, bandIndex, event.currentTarget as Element);
  };

  const onPlotPointerMove = (event: React.PointerEvent) => {
    if (draggingIndex !== null) return;
    const coords = plotCoords(event.clientX, event.clientY);
    if (coords) {
      setHoverPlot({ freq: coords.freq, gain: coords.gainDb });
    }
  };

  const panelSx = {
    bgcolor: "rgb(24, 24, 24)",
    borderRadius: "24px",
    overflow: "hidden",
    width: "100%",
    "&:before": { display: "none" },
    "&.Mui-expanded": { margin: 0 },
  };

  const readout =
    hoverPlot ?? (selectedBand
      ? {
          freq: selectedBand.freq.value,
          gain: combinedGainAtFrequency(
            curveInputs,
            outputGain,
            selectedBand.freq.value
          ),
        }
      : null);

  return (
    <Accordion disableGutters elevation={0} defaultExpanded sx={panelSx}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
        sx={{
          minHeight: 48,
          px: 1.5,
          "& .MuiAccordionSummary-content": { my: 1 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            pr: 1,
            gap: 1,
          }}
        >
          <IconButton
            size="small"
            aria-label="Reorder effect"
            sx={{ cursor: "grab" }}
            {...dragHandleProps}
            onMouseDown={stopAccordionToggle}
            onClick={stopAccordionToggle}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            color={isActive ? "primary" : "text.secondary"}
            fontWeight={600}
            sx={{ opacity: isActive ? 1 : 0.65 }}
          >
            {effect.name || "EQ"}
          </Typography>
          {activeParam && (
            <Switch
              size="small"
              checked={activeParam.value}
              onMouseDown={stopAccordionToggle}
              onClick={stopAccordionToggle}
              onChange={() => setParameterValue(activeParam.id, !activeParam.value)}
            />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1, pt: 0, pb: 1.5 }}>
        <Box
          sx={{
            width: "100%",
            borderRadius: 2,
            bgcolor: alpha(theme.palette.common.black, 0.4),
            border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            overflow: "hidden",
            userSelect: "none",
          }}
          onMouseDown={stopAccordionToggle}
          onClick={stopAccordionToggle}
        >
          <Box
            component="svg"
            ref={svgRef}
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
            sx={{
              display: "block",
              width: "100%",
              height: "auto",
              touchAction: "none",
              cursor: draggingIndex !== null ? "grabbing" : "crosshair",
            }}
          >
            <defs>
              <linearGradient id={`eq-fill-${effect.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            {[-24, -12, 0, 12, 24].map((db) => {
              const y = PLOT.top + gainToY(db, PLOT_H);
              const isZero = db === 0;
              return (
                <g key={db}>
                  <line
                    x1={PLOT.left}
                    x2={GRAPH_WIDTH - PLOT.right}
                    y1={y}
                    y2={y}
                    stroke={
                      isZero
                        ? alpha(theme.palette.common.white, 0.4)
                        : alpha(theme.palette.common.white, 0.08)
                    }
                    strokeWidth={isZero ? 1.25 : 0.5}
                  />
                  <text
                    x={PLOT.left - 4}
                    y={y + 3}
                    textAnchor="end"
                    fill={alpha(theme.palette.common.white, 0.45)}
                    fontSize={8}
                  >
                    {db > 0 ? `+${db}` : db}
                  </text>
                </g>
              );
            })}

            {GRID_FREQS.map((freq) => {
              const x = PLOT.left + freqToX(freq, PLOT_W);
              return (
                <g key={freq}>
                  <line
                    x1={x}
                    x2={x}
                    y1={PLOT.top}
                    y2={GRAPH_HEIGHT - PLOT.bottom}
                    stroke={alpha(theme.palette.common.white, 0.1)}
                    strokeWidth={0.5}
                  />
                  <text
                    x={x}
                    y={GRAPH_HEIGHT - 4}
                    textAnchor="middle"
                    fill={alpha(theme.palette.common.white, 0.45)}
                    fontSize={8}
                  >
                    {formatFrequency(freq)}
                  </text>
                </g>
              );
            })}

            <path
              d={curveFillPath}
              fill={`url(#eq-fill-${effect.id})`}
              stroke="none"
            />

            <line
              x1={PLOT.left}
              x2={GRAPH_WIDTH - PLOT.right}
              y1={zeroLineY}
              y2={zeroLineY}
              stroke={alpha(theme.palette.common.white, 0.2)}
              strokeWidth={1}
            />

            <path
              d={curveLinePath}
              fill="none"
              stroke={theme.palette.primary.main}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />

            <path
              d={curveLinePath}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />

            <rect
              x={PLOT.left}
              y={PLOT.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="transparent"
              onPointerDown={onPlotPointerDown}
              onPointerMove={onPlotPointerMove}
              onPointerLeave={() => {
                if (draggingIndex === null) setHoverPlot(null);
              }}
            />

            {draggingIndex !== null && hoverPlot && (
              <>
                <line
                  x1={PLOT.left + freqToX(hoverPlot.freq, PLOT_W)}
                  x2={PLOT.left + freqToX(hoverPlot.freq, PLOT_W)}
                  y1={PLOT.top}
                  y2={GRAPH_HEIGHT - PLOT.bottom}
                  stroke={alpha(theme.palette.primary.main, 0.45)}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  style={{ pointerEvents: "none" }}
                />
                <line
                  x1={PLOT.left}
                  x2={GRAPH_WIDTH - PLOT.right}
                  y1={PLOT.top + gainToY(hoverPlot.gain, PLOT_H)}
                  y2={PLOT.top + gainToY(hoverPlot.gain, PLOT_H)}
                  stroke={alpha(theme.palette.primary.main, 0.45)}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  style={{ pointerEvents: "none" }}
                />
              </>
            )}

            {bands.map((band, index) => {
              const color = EQ_BAND_COLORS[index];
              const active = band.active.value;
              const selected = index === selectedIndex;
              const x = PLOT.left + freqToX(band.freq.value, PLOT_W);
              const y =
                PLOT.top +
                gainToY(
                  combinedGainAtFrequency(
                    curveInputs,
                    outputGain,
                    band.freq.value
                  ),
                  PLOT_H
                );
              const radius = selected ? 8 : 6;

              return (
                <g
                  key={band.index}
                  opacity={active ? 1 : 0.4}
                  style={{
                    cursor: draggingIndex === index ? "grabbing" : "grab",
                  }}
                  onPointerDown={(event) => beginBandDrag(event, index)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 10}
                    fill="transparent"
                  />
                  {selected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={radius + 5}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.75}
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={color}
                    stroke={theme.palette.common.black}
                    strokeWidth={2}
                  />
                  <text
                    x={x}
                    y={y - radius - 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize={9}
                    fontWeight={700}
                    style={{ pointerEvents: "none" }}
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </Box>

          {readout && (
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                display: "flex",
                justifyContent: "space-between",
                borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatFrequency(readout.freq)}
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                {readout.gain > 0 ? "+" : ""}
                {readout.gain.toFixed(1)} dB
              </Typography>
            </Box>
          )}
        </Box>

        {selectedBand && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
              mt: 1.5,
              px: 0.5,
            }}
            onMouseDown={stopAccordionToggle}
            onClick={stopAccordionToggle}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: EQ_BAND_COLORS[selectedIndex],
                flexShrink: 0,
              }}
            />
            <Select
              size="small"
              value={selectedBand.type.value}
              sx={{ minWidth: 120, flex: 1 }}
              onChange={(event) =>
                setParameterValue(selectedBand.type.id, event.target.value)
              }
            >
              {selectedBand.type.options.map((option) => (
                <MenuItem key={option} value={option}>
                  {EQ_BAND_TYPE_LABELS[option]}
                </MenuItem>
              ))}
            </Select>
            <Switch
              size="small"
              checked={selectedBand.active.value}
              onChange={() =>
                setParameterValue(
                  selectedBand.active.id,
                  !selectedBand.active.value
                )
              }
            />
            <Knob
              value={selectedBand.q.value}
              min={selectedBand.q.options.min}
              max={selectedBand.q.options.max}
              step={0.01}
              size={48}
              label="Q"
              onChange={(value: number) =>
                setParameterValue(selectedBand.q.id, value)
              }
            />
            {outputParam && (
              <Knob
                value={outputParam.value}
                min={outputParam.options?.min ?? -12}
                max={outputParam.options?.max ?? 12}
                step={0.1}
                size={48}
                label="Out"
                onChange={(value: number) =>
                  setParameterValue(outputParam.id, value)
                }
              />
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default EqEffect;
