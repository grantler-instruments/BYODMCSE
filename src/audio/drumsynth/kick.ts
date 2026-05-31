import { el, ElemNode } from "@elemaudio/core";

export default function kick(
  key: string,
  pitch: number,
  click: number,
  attack: number,
  decay: number,
  drive: number,
  gate: ElemNode
) {
  const env = el.adsr({ key: `${key}-kick-env` }, attack, decay, 0.0, 0.1, gate);
  const pitchenv = el.adsr(
    { key: `${key}-kick-pitch-env` },
    0.005,
    click,
    0.0,
    0.1,
    gate
  );

  const clean = el.mul(
    env,
    el.cycle(
      { key: `${key}-kick-osc` },
      el.mul(el.add(1, el.mul(4, pitchenv)), pitch)
    )
  );

  return el.tanh(el.mul(clean, drive));
}
