import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import { srvbMono } from "./srvb";
import { coerceBoolean, readParamBoolean } from "../parameterUtils";

class Reverb extends Base {
  private dryRef: ReturnType<typeof createEffectParamRef>;
  private wetRef: ReturnType<typeof createEffectParamRef>;
  private sizeRef: ReturnType<typeof createEffectParamRef>;
  private decayRef: ReturnType<typeof createEffectParamRef>;
  private modRef: ReturnType<typeof createEffectParamRef>;
  private mix = 0.35;
  private active = true;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.mix = parameters.mix?.value ?? 0.35;
    this.active = readParamBoolean(parameters, "active", true);

    this.dryRef = createEffectParamRef(
      core,
      `reverb-${id}-dry`,
      1 - this.mix
    );
    this.wetRef = createEffectParamRef(
      core,
      `reverb-${id}-wet`,
      this.mix
    );
    this.sizeRef = createEffectParamRef(
      core,
      `reverb-${id}-size`,
      parameters.size?.value ?? 0.7
    );
    this.decayRef = createEffectParamRef(
      core,
      `reverb-${id}-decay`,
      parameters.decay?.value ?? 0.75
    );
    this.modRef = createEffectParamRef(
      core,
      `reverb-${id}-mod`,
      parameters.mod?.value ?? 0.25
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

    registerEffectParameter(setters, parameters.size, async (value) => {
      await this.sizeRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.decay, async (value) => {
      await this.decayRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.mod, async (value) => {
      await this.modRef.setValue({ value });
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

    const size = el.sm(this.sizeRef.node);
    const decay = el.sm(this.decayRef.node);
    const modDepth = el.sm(this.modRef.node);

    const wetSignal = srvbMono(
      `reverb-${this.id}`,
      size,
      decay,
      modDepth,
      signal
    );

    return el.add(
      el.mul(this.dryRef.node, signal),
      el.mul(this.wetRef.node, wetSignal)
    );
  }
}

export default Reverb;
