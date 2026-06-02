import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import { readParamBoolean, readParamNumber, coerceBoolean } from "../parameterUtils";

class EQ extends Base {
  private active = true;
  private lowGainRef: ReturnType<typeof createEffectParamRef>;
  private midGainRef: ReturnType<typeof createEffectParamRef>;
  private highGainRef: ReturnType<typeof createEffectParamRef>;
  private lowFreqRef: ReturnType<typeof createEffectParamRef>;
  private highFreqRef: ReturnType<typeof createEffectParamRef>;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.active = readParamBoolean(parameters, "active", true);
    this.lowGainRef = createEffectParamRef(
      core,
      `eq-${id}-low-gain`,
      readParamNumber(parameters, "lowGain", 1)
    );
    this.midGainRef = createEffectParamRef(
      core,
      `eq-${id}-mid-gain`,
      readParamNumber(parameters, "midGain", 1)
    );
    this.highGainRef = createEffectParamRef(
      core,
      `eq-${id}-high-gain`,
      readParamNumber(parameters, "highGain", 1)
    );
    this.lowFreqRef = createEffectParamRef(
      core,
      `eq-${id}-low-freq`,
      readParamNumber(parameters, "lowFreq", 200)
    );
    this.highFreqRef = createEffectParamRef(
      core,
      `eq-${id}-high-freq`,
      readParamNumber(parameters, "highFreq", 8000)
    );
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
    registerEffectParameter(setters, parameters.lowGain, async (value) => {
      await this.lowGainRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.midGain, async (value) => {
      await this.midGainRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.highGain, async (value) => {
      await this.highGainRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.lowFreq, async (value) => {
      await this.lowFreqRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.highFreq, async (value) => {
      await this.highFreqRef.setValue({ value });
    });
  }

  render(signal: any) {
    if (!this.active) {
      return signal;
    }

    const low = el.lowpass(
      this.lowFreqRef.node,
      1.41,
      el.mul(signal, this.lowGainRef.node)
    );

    const high = el.highpass(
      this.highFreqRef.node,
      1.41,
      el.mul(signal, this.highGainRef.node)
    );

    const midCenter = el.mul(
      el.add(this.lowFreqRef.node, this.highFreqRef.node),
      el.const({ key: `eq-${this.id}-mid-center-scale`, value: 0.5 })
    );

    const band = el.bandpass(midCenter, 1.41, el.mul(signal, this.midGainRef.node));

    return el.add(low, band, high);
  }
}

export default EQ;
