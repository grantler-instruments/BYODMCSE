import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";

class Tremolo extends Base {
  private dryRef: ReturnType<typeof createEffectParamRef>;
  private wetRef: ReturnType<typeof createEffectParamRef>;
  private rateRef: ReturnType<typeof createEffectParamRef>;
  private depthRef: ReturnType<typeof createEffectParamRef>;
  private mix = 0.5;
  private active = true;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.mix = parameters.mix?.value ?? 0.5;
    this.active = parameters.active?.value ?? true;

    const effectiveMix = this.active ? this.mix : 0;
    this.dryRef = createEffectParamRef(
      core,
      `tremolo-${id}-dry`,
      1 - effectiveMix
    );
    this.wetRef = createEffectParamRef(
      core,
      `tremolo-${id}-wet`,
      effectiveMix
    );
    this.rateRef = createEffectParamRef(
      core,
      `tremolo-${id}-rate`,
      parameters.rate?.value ?? 4.5
    );
    this.depthRef = createEffectParamRef(
      core,
      `tremolo-${id}-depth`,
      parameters.depth?.value ?? 0.3
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

    registerEffectParameter(setters, parameters.active, async (value) => {
      this.active = value;
      await updateMix();
    });
  }

  render(signal: any) {
    const lfo = el.cycle({ key: `tremolo-${this.id}-lfo` }, this.rateRef.node);
    const trem = el.add(
      el.const({ key: `tremolo-${this.id}-unity`, value: 1 }),
      el.mul(
        el.mul(
          el.const({ key: `tremolo-${this.id}-half`, value: 0.5 }),
          this.depthRef.node
        ),
        lfo
      )
    );
    const wetSignal = el.mul(signal, trem);

    return el.add(
      el.mul(this.dryRef.node, signal),
      el.mul(this.wetRef.node, wetSignal)
    );
  }
}

export default Tremolo;
