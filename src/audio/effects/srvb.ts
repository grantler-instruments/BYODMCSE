import { el } from "@elemaudio/core";

const SAMPLE_RATE = 44100;

// Size-8 Hadamard matrix; each element scaled by sqrt(1/8) for stable feedback.
const H8 = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, -1, 1, -1, 1, -1, 1, -1],
  [1, 1, -1, -1, 1, 1, -1, -1],
  [1, -1, -1, 1, 1, -1, -1, 1],
  [1, 1, 1, 1, -1, -1, -1, -1],
  [1, -1, 1, -1, -1, 1, -1, 1],
  [1, 1, -1, -1, -1, -1, 1, 1],
  [1, -1, -1, 1, -1, 1, 1, -1],
];

const H8_SCALE = Math.sqrt(1 / 8);

function ms2samps(ms: number) {
  return SAMPLE_RATE * (ms / 1000);
}

function diffuse(size: number, ...ins: any[]) {
  const dels = ins.map((input, i) => {
    const lineSize = size * ((i + 1) / ins.length);
    return el.sdelay({ size: lineSize, key: `srvb-diffuse-${size}-${i}` }, input);
  });

  return H8.map((row) =>
    el.add(
      ...row.map((col, j) => el.mul(col * H8_SCALE, dels[j]))
    )
  );
}

function dampFDN(
  name: string,
  size: any,
  decay: any,
  modDepth: any,
  ...ins: any[]
) {
  const md = el.mul(modDepth, 0.02);

  const dels = ins.map((input, i) =>
    el.add(
      input,
      el.mul(
        decay,
        el.smooth(
          { key: `${name}-smooth-${i}` },
          0.105,
          el.tapIn({ name: `${name}:fdn${i}` })
        )
      )
    )
  );

  const mix = H8.map((row) =>
    el.add(...row.map((col, j) => el.mul(col * H8_SCALE, dels[j])))
  );

  return mix.map((mm, i) => {
    const modulate = (x: any, rate: any, amt: any) =>
      el.add(x, el.mul(amt, el.cycle({ key: `${name}-lfo-${i}` }, rate)));

    const delaySize = el.mul(
      el.add(1, el.mul(3, size)),
      el.const({ key: `${name}-base-delay-${i}`, value: ms2samps((i + 1) * 17) })
    );

    const readPos = modulate(
      delaySize,
      el.add(
        el.const({ key: `${name}-rate-${i}`, value: 0.1 }),
        el.mul(el.const({ key: `${name}-idx-${i}`, value: i }), md)
      ),
      el.const({ key: `${name}-mod-amt-${i}`, value: ms2samps(2.5) })
    );

    return el.tapOut(
      { name: `${name}:fdn${i}` },
      el.delay(
        { size: ms2samps(750), key: `${name}-delay-${i}` },
        readPos,
        el.const({ key: `${name}-fb-${i}`, value: 0 }),
        mm
      )
    );
  });
}

/**
 * Mono SRVB reverb adapted from Elementary Audio's reference implementation.
 * @see https://github.com/elemaudio/srvb
 */
export function srvbMono(
  key: string,
  size: any,
  decay: any,
  modDepth: any,
  input: any
) {
  const mid = input;
  const side = el.const({ key: `${key}-side`, value: 0 });
  const four = [input, input, mid, side];
  const eight = [...four, ...four.map((x) => el.mul(-1, x))];

  const d1 = diffuse(ms2samps(43), ...eight);
  const d2 = diffuse(ms2samps(97), ...d1);
  const d3 = diffuse(ms2samps(117), ...d2);

  const d4 = dampFDN(
    `${key}:d4`,
    size,
    el.const({ key: `${key}-predelay-decay`, value: 0.004 }),
    modDepth,
    ...d3
  );
  const r0 = dampFDN(`${key}:r0`, size, decay, modDepth, ...d4);

  const yl = el.mul(0.25, el.add(r0[0], r0[2], r0[4], r0[6]));
  const yr = el.mul(0.25, el.add(r0[1], r0[3], r0[5], r0[7]));

  return el.mul(0.5, el.add(yl, yr));
}
