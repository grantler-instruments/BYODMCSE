import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";

const MAX_CHORUS_MS = 80;
const CHORUS_BUFFER_SAMPLES = Math.ceil(44.1 * MAX_CHORUS_MS);

class Chorus extends Base {
  private dryRef: ReturnType<typeof createEffectParamRef>;
  private wetRef: ReturnType<typeof createEffectParamRef>;
  private rateRef: ReturnType<typeof createEffectParamRef>;
  private depthRef: ReturnType<typeof createEffectParamRef>;
  private timeRef: ReturnType<typeof createEffectParamRef>;
  private mix = 0.5;
  private active = true;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.mix = parameters.mix?.value ?? 0.5;
    this.active = parameters.active?.value ?? true;

    const effectiveMix = this.active ? this.mix : 0;
    this.dryRef = createEffectParamRef(
      core,
      `chorus-${id}-dry`,
      1 - effectiveMix
    );
    this.wetRef = createEffectParamRef(
      core,
      `chorus-${id}-wet`,
      effectiveMix
    );
    this.rateRef = createEffectParamRef(
      core,
      `chorus-${id}-rate`,
      parameters.rate?.value ?? 0.8
    );
    this.depthRef = createEffectParamRef(
      core,
      `chorus-${id}-depth`,
      parameters.depth?.value ?? 6
    );
    this.timeRef = createEffectParamRef(
      core,
      `chorus-${id}-time`,
      parameters.time?.value ?? 25
    );
  }

  registerParameterSetters(
    setters: Map<string, ParameterSetter>,
    parameters: Record<string, any>
  ) {
    const updateMix = async () => {
      const wet = this.active ? this.mix : 0;
      await this.wetRef.setValue({ value: wet });
      await this.dryRef.setValue({ value: 1 - wet });
    };

    registerEffectParameter(setters, parameters.mix, async (value) => {
      this.mix = value;
      await updateMix();
    });

    registerEffectParameter(setters, parameters.rate, async (value) => {
      await this.rateRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.depth, async (value) => {
      await this.depthRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.time, async (value) => {
      await this.timeRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.active, async (value) => {
      this.active = value;
      await updateMix();
    });
  }

  render(signal: any) {
    const lfo = el.cycle({ key: `chorus-${this.id}-lfo` }, this.rateRef.node);
    const noFeedback = el.const({ key: `chorus-${this.id}-fb`, value: 0 });
    const half = el.const({ key: `chorus-${this.id}-half`, value: 0.5 });
    const negOne = el.const({ key: `chorus-${this.id}-neg`, value: -1 });

    const delayMs1 = el.add(
      this.timeRef.node,
      el.mul(this.depthRef.node, lfo)
    );
    const delayMs2 = el.add(
      this.timeRef.node,
      el.mul(this.depthRef.node, el.mul(negOne, lfo))
    );

    const voice1 = el.delay(
      { size: CHORUS_BUFFER_SAMPLES, key: `chorus-${this.id}-d1` },
      el.ms2samps(delayMs1),
      noFeedback,
      signal
    );
    const voice2 = el.delay(
      { size: CHORUS_BUFFER_SAMPLES, key: `chorus-${this.id}-d2` },
      el.ms2samps(delayMs2),
      noFeedback,
      signal
    );

    const wetSignal = el.mul(half, el.add(voice1, voice2));

    return el.add(
      el.mul(this.dryRef.node, signal),
      el.mul(this.wetRef.node, wetSignal)
    );
  }
}

export default Chorus;
