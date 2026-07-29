import { el, ElemNode } from "@elemaudio/core";
import Base from "./Base";
import {
  EQ_BAND_COUNT,
  EQ_BAND_DEFAULTS,
  type EqBandType,
  isEqBandType,
} from "../eqPresets";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import {
  coerceBoolean,
  readParamBoolean,
  readParamNumber,
  readParamString,
} from "../parameterUtils";

type BandRefs = {
  freqRef: ReturnType<typeof createEffectParamRef>;
  gainRef: ReturnType<typeof createEffectParamRef>;
  qRef: ReturnType<typeof createEffectParamRef>;
};

type BandState = {
  active: boolean;
  type: EqBandType;
  refs: BandRefs;
};

class Eq extends Base {
  private active = true;
  private outputGainRef: ReturnType<typeof createEffectParamRef>;
  private bands: BandState[];

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.active = readParamBoolean(parameters, "active", true);
    this.outputGainRef = createEffectParamRef(
      core,
      `eq-${id}-output-gain-db`,
      readParamNumber(parameters, "outputGain", 0)
    );

    this.bands = Array.from({ length: EQ_BAND_COUNT }, (_, index) => {
      const n = index + 1;
      const defaults = EQ_BAND_DEFAULTS[index];
      const typeValue = readParamString(parameters, `band${n}Type`, defaults.type);
      return {
        active: readParamBoolean(parameters, `band${n}Active`, defaults.active),
        type: isEqBandType(typeValue) ? typeValue : defaults.type,
        refs: {
          freqRef: createEffectParamRef(
            core,
            `eq-${id}-b${n}-freq`,
            readParamNumber(parameters, `band${n}Freq`, defaults.frequency)
          ),
          gainRef: createEffectParamRef(
            core,
            `eq-${id}-b${n}-gain-db`,
            readParamNumber(parameters, `band${n}Gain`, defaults.gain)
          ),
          qRef: createEffectParamRef(
            core,
            `eq-${id}-b${n}-q`,
            readParamNumber(parameters, `band${n}Q`, defaults.q)
          ),
        },
      };
    });
  }

  registerParameterSetters(
    setters: Map<string, ParameterSetter>,
    parameters: Record<string, any>,
    requestRender?: () => void
  ) {
    registerEffectParameter(setters, parameters.active, (value) => {
      this.active = coerceBoolean(value, this.active);
      requestRender?.();
    });

    registerEffectParameter(setters, parameters.outputGain, async (value) => {
      await this.outputGainRef.setValue({ value });
    });

    this.bands.forEach((band, index) => {
      const n = index + 1;
      registerEffectParameter(setters, parameters[`band${n}Active`], (value) => {
        band.active = coerceBoolean(value, band.active);
        requestRender?.();
      });
      registerEffectParameter(setters, parameters[`band${n}Type`], (value) => {
        if (!isEqBandType(value)) return;
        band.type = value;
        requestRender?.();
      });
      registerEffectParameter(setters, parameters[`band${n}Freq`], async (value) => {
        await band.refs.freqRef.setValue({ value });
      });
      registerEffectParameter(setters, parameters[`band${n}Gain`], async (value) => {
        await band.refs.gainRef.setValue({ value });
      });
      registerEffectParameter(setters, parameters[`band${n}Q`], async (value) => {
        await band.refs.qRef.setValue({ value });
      });
    });
  }

  private applyBand(signal: ElemNode, bandIndex: number, band: BandState): ElemNode {
    const { freqRef, qRef, gainRef } = band.refs;
    const keyBase = `eq-${this.id}-b${bandIndex + 1}`;

    switch (band.type) {
      case "bell":
        return el.peak(
          { key: `${keyBase}-peak` },
          freqRef.node,
          qRef.node,
          gainRef.node,
          signal
        );
      case "lowShelf":
        return el.lowshelf(
          { key: `${keyBase}-lowshelf` },
          freqRef.node,
          qRef.node,
          gainRef.node,
          signal
        );
      case "highShelf":
        return el.highshelf(
          { key: `${keyBase}-highshelf` },
          freqRef.node,
          qRef.node,
          gainRef.node,
          signal
        );
      case "lowCut":
        return el.highpass(
          { key: `${keyBase}-lowcut` },
          freqRef.node,
          qRef.node,
          signal
        );
      case "highCut":
        return el.lowpass(
          { key: `${keyBase}-highcut` },
          freqRef.node,
          qRef.node,
          signal
        );
      case "notch":
        return el.notch(
          { key: `${keyBase}-notch` },
          freqRef.node,
          qRef.node,
          signal
        );
      case "bandPass":
        return el.bandpass(
          { key: `${keyBase}-bandpass` },
          freqRef.node,
          qRef.node,
          signal
        );
      default:
        return signal;
    }
  }

  render(signal: ElemNode): ElemNode {
    if (!this.active) {
      return signal;
    }

    let processed = signal;
    this.bands.forEach((band, index) => {
      if (band.active) {
        processed = this.applyBand(processed, index, band);
      }
    });

    return el.mul(processed, el.db2gain(this.outputGainRef.node));
  }
}

export default Eq;
