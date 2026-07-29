function extractBaseFrequenciesEnergy(
  fftOutput: ArrayLike<number>,
  sampleRate: number,
  baseFrequencyRange: [number, number]
): number {
  const binSize = sampleRate / fftOutput.length;
  const baseFrequencyIndices = baseFrequencyRange.map((freq) =>
    Math.round(freq / binSize)
  );

  let energy = 0;
  for (let i = 0; i < baseFrequencyIndices.length; i++) {
    const binIndex = baseFrequencyIndices[i];
    const binValue = fftOutput[binIndex];
    energy += Math.abs(binValue) ** 2;
  }

  return energy;
}

const constrain = (n: number, low: number, high: number) =>
  Math.max(Math.min(n, high), low);

const map = (
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds?: boolean
) => {
  const newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2);
  }
  return constrain(newval, stop2, start2);
};

const loadSample = async (path: string, ctx: AudioContext) => {
  const res = await fetch(path);
  const sampleBuffer = await ctx.decodeAudioData(await res.arrayBuffer());
  return sampleBuffer.getChannelData(0);
};

export { extractBaseFrequenciesEnergy, map, loadSample };
