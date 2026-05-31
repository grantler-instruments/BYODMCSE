import { el, ElemNode } from "@elemaudio/core";

function cycle(key: string, freq: ElemNode | number, phaseOffset: ElemNode) {
  const t = el.add(el.phasor(freq, 0), phaseOffset);
  const p = el.sub(t, el.floor(t));
  return el.sin(el.mul(2 * Math.PI, p));
}

export default function hat(
  key: string,
  pitch: number,
  tone: number,
  attack: number,
  decay: number,
  gate: ElemNode
) {
  const m2 = el.noise({ key: `${key}-hat-noise` });
  const m1 = cycle(`${key}-hat-m1`, el.mul(2, pitch), el.mul(2, m2));
  const m0 = cycle(`${key}-hat-m0`, pitch, el.mul(2, m1));

  const filtered = el.bandpass(tone, 1.214, m0);
  const env = el.adsr({ key: `${key}-hat-env` }, attack, decay, 0.0, 0.1, gate);

  return el.mul(filtered, env);
}
