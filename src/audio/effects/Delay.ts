import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";

const MAX_DELAY_MS = 10000;
const DELAY_BUFFER_SAMPLES = Math.ceil(44.1 * MAX_DELAY_MS);

class Delay extends Base {
  private dryRef: ReturnType<typeof createEffectParamRef>;
  private wetRef: ReturnType<typeof createEffectParamRef>;
  private timeRef: ReturnType<typeof createEffectParamRef>;
  private feedbackRef: ReturnType<typeof createEffectParamRef>;
  private mix = 0.5;
  private active = true;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.mix = parameters.mix?.value ?? 0.5;
    this.active = parameters.active?.value ?? true;

    const effectiveMix = this.active ? this.mix : 0;
    this.dryRef = createEffectParamRef(core, `delay-${id}-dry`, 1 - effectiveMix);
    this.wetRef = createEffectParamRef(core, `delay-${id}-wet`, effectiveMix);
    this.timeRef = createEffectParamRef(
      core,
      `delay-${id}-time`,
      parameters.time?.value ?? 500
    );
    this.feedbackRef = createEffectParamRef(
      core,
      `delay-${id}-feedback`,
      parameters.feedback?.value ?? 0
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

    registerEffectParameter(setters, parameters.time, async (value) => {
      await this.timeRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.feedback, async (value) => {
      await this.feedbackRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.active, async (value) => {
      this.active = value;
      await updateMix();
    });
  }

  render(signal: any) {
    const wet = el.delay(
      { size: DELAY_BUFFER_SAMPLES },
      el.ms2samps(this.timeRef.node),
      this.feedbackRef.node,
      signal
    );

    return el.add(
      el.mul(this.dryRef.node, signal),
      el.mul(this.wetRef.node, wet)
    );
  }
}

export default Delay;
