import { el } from "@elemaudio/core";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import {
  DRIVE_MODE_PRESETS,
  isDriveMode,
  type DriveMode,
} from "../drivePresets";
import {
  coerceBoolean,
  readParamBoolean,
  readParamNumber,
  readParamString,
} from "../parameterUtils";

class Drive extends Base {
  private dryRef: ReturnType<typeof createEffectParamRef>;
  private wetRef: ReturnType<typeof createEffectParamRef>;
  private driveRef: ReturnType<typeof createEffectParamRef>;
  private toneRef: ReturnType<typeof createEffectParamRef>;
  private mix = 0.5;
  private mode: DriveMode = "overdrive";
  private active = true;

  constructor(id: string, core: any, parameters: Record<string, any> = {}) {
    super(id);
    const modeValue = readParamString(parameters, "mode", "overdrive");
    this.mode = isDriveMode(modeValue) ? modeValue : "overdrive";
    this.mix = readParamNumber(parameters, "mix", DRIVE_MODE_PRESETS[this.mode].mix);
    this.active = readParamBoolean(parameters, "active", true);
    const drive = readParamNumber(
      parameters,
      "drive",
      DRIVE_MODE_PRESETS[this.mode].drive
    );
    const tone = readParamNumber(
      parameters,
      "tone",
      DRIVE_MODE_PRESETS[this.mode].tone
    );

    this.dryRef = createEffectParamRef(core, `drive-${id}-dry`, 1 - this.mix);
    this.wetRef = createEffectParamRef(core, `drive-${id}-wet`, this.mix);
    this.driveRef = createEffectParamRef(core, `drive-${id}-drive`, drive);
    this.toneRef = createEffectParamRef(core, `drive-${id}-tone`, tone);
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

    registerEffectParameter(setters, parameters.drive, async (value) => {
      await this.driveRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.tone, async (value) => {
      await this.toneRef.setValue({ value });
    });

    registerEffectParameter(setters, parameters.mode, async (value) => {
      if (!isDriveMode(value)) return;

      this.mode = value;
      const preset = DRIVE_MODE_PRESETS[value];
      this.mix = preset.mix;
      await this.driveRef.setValue({ value: preset.drive });
      await this.toneRef.setValue({ value: preset.tone });
      await updateMix();
      requestRender?.();
    });

    registerEffectParameter(setters, parameters.active, (value) => {
      this.active = coerceBoolean(value, this.active);
      requestRender?.();
    });
  }

  private clipSignal(signal: any) {
    const gained = el.mul(signal, this.driveRef.node);

    switch (this.mode) {
      case "distortion": {
        const ceiling = el.const({
          key: `drive-${this.id}-clip-ceiling`,
          value: 0.75,
        });
        return el.max(el.min(gained, ceiling), el.mul(ceiling, -1));
      }
      case "fuzz": {
        const shaped = el.sub(
          gained,
          el.mul(
            el.const({ key: `drive-${this.id}-fuzz-curve`, value: 0.35 }),
            el.mul(gained, el.mul(gained, gained))
          )
        );
        return el.tanh(shaped);
      }
      case "overdrive":
      default:
        return el.tanh(gained);
    }
  }

  render(signal: any) {
    if (!this.active) {
      return signal;
    }

    const drivenSignal = this.clipSignal(signal);
    const warmedSignal = el.lowpass(this.toneRef.node, 1.41, drivenSignal);

    return el.add(
      el.mul(this.dryRef.node, signal),
      el.mul(this.wetRef.node, warmedSignal)
    );
  }
}

export default Drive;
