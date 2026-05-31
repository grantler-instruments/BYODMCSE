import { el, ElemNode } from "@elemaudio/core";

export default function clap(
  key: string,
  tone: number,
  attack: number,
  decay: number,
  gate: ElemNode
) {
  const no = el.noise({ key: `${key}-clap-noise` });

  const e1 = el.adsr(
    { key: `${key}-clap-e1` },
    attack + 0.035,
    decay + 0.06,
    0.0,
    0.1,
    gate
  );
  const e2 = el.adsr(
    { key: `${key}-clap-e2` },
    attack + 0.025,
    decay + 0.05,
    0.0,
    0.1,
    gate
  );
  const e3 = el.adsr(
    { key: `${key}-clap-e3` },
    attack + 0.015,
    decay + 0.04,
    0.0,
    0.1,
    gate
  );
  const e4 = el.adsr(
    { key: `${key}-clap-e4` },
    attack + 0.005,
    decay + 0.02,
    0.0,
    0.1,
    gate
  );

  return el.tanh(
    el.bandpass(
      tone,
      1.214,
      el.add(el.mul(no, e1), el.mul(no, e2), el.mul(no, e3), el.mul(no, e4))
    )
  );
}
