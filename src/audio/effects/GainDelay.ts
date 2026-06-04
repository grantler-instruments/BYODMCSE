import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import { coerceBoolean, readParamBoolean } from "../parameterUtils";

const MAX_DELAY_MS = 4000;
const DELAY_BUFFER_SAMPLES = Math.ceil(44.1 * MAX_DELAY_MS);
const DIFFUSE_SAMPLES = Math.ceil(44.1 * 120);

/** Microcosm-style swelling modulated multitap delay with shimmer and diffusion. */
class GainDelay extends Base {
  private dryRef: ReturnType<typeof createEffectParamRef>;
  private wetRef: ReturnType<typeof createEffectParamRef>;
  private timeRef: ReturnType<typeof createEffectParamRef>;
  private feedbackRef: ReturnType<typeof createEffectParamRef>;
  private swellRef: ReturnType<typeof createEffectParamRef>;
  private driftRef: ReturnType<typeof createEffectParamRef>;
  private shimmerRef: ReturnType<typeof createEffectParamRef>;
  private toneRef: ReturnType<typeof createEffectParamRef>;
  private spaceRef: ReturnType<typeof createEffectParamRef>;
  private mix = 0.45;
  private active = true;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    this.mix = parameters.mix?.value ?? 0.45;
    this.active = readParamBoolean(parameters, "active", true);

    const prefix = `gainDelay-${id}`;
    this.dryRef = createEffectParamRef(core, `${prefix}-dry`, 1 - this.mix);
    this.wetRef = createEffectParamRef(core, `${prefix}-wet`, this.mix);
    this.timeRef = createEffectParamRef(
      core,
      `${prefix}-time`,
      parameters.time?.value ?? 480
    );
    this.feedbackRef = createEffectParamRef(
      core,
      `${prefix}-feedback`,
      parameters.repeats?.value ?? 0.55
    );
    this.swellRef = createEffectParamRef(
      core,
      `${prefix}-swell`,
      parameters.swell?.value ?? 0.42
    );
    this.driftRef = createEffectParamRef(
      core,
      `${prefix}-drift`,
      parameters.drift?.value ?? 0.38
    );
    this.shimmerRef = createEffectParamRef(
      core,
      `${prefix}-shimmer`,
      parameters.shimmer?.value ?? 0.32
    );
    this.toneRef = createEffectParamRef(
      core,
      `${prefix}-tone`,
      parameters.tone?.value ?? 3200
    );
    this.spaceRef = createEffectParamRef(
      core,
      `${prefix}-space`,
      parameters.space?.value ?? 0.28
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

    registerEffectParameter(setters, parameters.repeats, async (value) => {
      await this.feedbackRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.swell, async (value) => {
      await this.swellRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.drift, async (value) => {
      await this.driftRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.shimmer, async (value) => {
      await this.shimmerRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.tone, async (value) => {
      await this.toneRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.space, async (value) => {
      await this.spaceRef.setValue({ value });
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

    const key = `gainDelay-${this.id}`;
    const noFb = el.const({ key: `${key}-no-fb`, value: 0 });

    const driftLfo = el.cycle({ key: `${key}-drift-lfo` }, 0.17);
    const shimmerLfo = el.cycle({ key: `${key}-shimmer-lfo` }, 0.41);
    const wanderLfo = el.cycle({ key: `${key}-wander-lfo` }, 0.07);

    const driftMs = el.mul(
      this.driftRef.node,
      el.const({ key: `${key}-drift-scale`, value: 55 })
    );
    const shimmerMs = el.mul(
      this.shimmerRef.node,
      el.const({ key: `${key}-shim-scale`, value: 28 })
    );

    const baseMs = el.sm(this.timeRef.node);
    const modMs = el.add(
      baseMs,
      el.mul(driftMs, driftLfo),
      el.mul(
        el.mul(this.driftRef.node, el.const({ key: `${key}-wander-scale`, value: 18 })),
        wanderLfo
      )
    );
    const baseSamps = el.ms2samps(modMs);

    const phi = el.const({ key: `${key}-phi`, value: 0.618 });
    const fifth = el.const({ key: `${key}-fifth`, value: 1.498 });
    const shimmerMix = el.sm(this.shimmerRef.node);

    const tapName = `${key}:swell`;
    const loopIn = el.tapIn({ name: tapName });
    const loopTone = el.lowpass(
      el.sm(this.toneRef.node),
      el.const({ key: `${key}-tone-q`, value: 0.62 }),
      loopIn
    );
    const swellBoost = el.add(
      this.feedbackRef.node,
      el.mul(this.swellRef.node, el.const({ key: `${key}-swell-boost`, value: 0.38 }))
    );
    const swelled = el.tanh(
      el.mul(swellBoost, el.smooth({ key: `${key}-fb-smooth` }, 0.04, loopTone))
    );
    const loopInput = el.add(signal, swelled);

    const main = el.tapOut(
      { name: tapName },
      el.delay(
        { size: DELAY_BUFFER_SAMPLES, key: `${key}-main` },
        baseSamps,
        noFb,
        loopInput
      )
    );

    const ghostSamps = el.ms2samps(el.mul(baseMs, phi));
    const ghost = el.delay(
      { size: DELAY_BUFFER_SAMPLES, key: `${key}-ghost` },
      el.add(ghostSamps, el.mul(shimmerMs, shimmerLfo)),
      noFb,
      signal
    );

    const haloSamps = el.ms2samps(el.mul(baseMs, fifth));
    const halo = el.delay(
      { size: DELAY_BUFFER_SAMPLES, key: `${key}-halo` },
      el.add(
        haloSamps,
        el.mul(
          el.mul(this.driftRef.node, el.const({ key: `${key}-halo-drift`, value: 22 })),
          el.mul(shimmerLfo, el.const({ key: `${key}-halo-inv`, value: -1 }))
        )
      ),
      noFb,
      signal
    );

    const multitap = el.add(
      main,
      el.mul(el.const({ key: `${key}-ghost-mix`, value: 0.42 }), ghost),
      el.mul(el.const({ key: `${key}-halo-mix`, value: 0.28 }), halo),
      el.mul(shimmerMix, el.mul(ghost, shimmerLfo))
    );

    const diffused = el.sdelay(
      { size: DIFFUSE_SAMPLES, key: `${key}-diffuse` },
      multitap
    );
    const spaced = el.add(
      multitap,
      el.mul(this.spaceRef.node, el.sub(diffused, multitap))
    );

    const wetSignal = el.tanh(
      el.mul(el.const({ key: `${key}-wet-gain`, value: 0.92 }), spaced)
    );

    return el.add(
      el.mul(this.dryRef.node, signal),
      el.mul(this.wetRef.node, wetSignal)
    );
  }
}

export default GainDelay;
