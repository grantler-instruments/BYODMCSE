import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import { coerceBoolean, readParamBoolean } from "../parameterUtils";

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
    this.active = readParamBoolean(parameters, "active", true);

    this.dryRef = createEffectParamRef(core, `delay-${id}-dry`, 1 - this.mix);
    this.wetRef = createEffectParamRef(core, `delay-${id}-wet`, this.mix);
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
    parameters: Record<string, any>,
    requestRender?: () => void
  ) {
    const updateMix = async () => {
      await this.wetRef.setValue({ value: this.mix });
      await this.dryRef.setValue({ value: 1 - this.mix });
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

    registerEffectParameter(setters, parameters.active, (value) => {
      this.active = coerceBoolean(value, this.active);
      requestRender?.();
    });
  }

  render(signal: any) {
    if (!this.active) {
      return signal;
    }

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
