type GateVoice = {
  key: string;
  gate: number;
  setGate: (value: { value: number }) => Promise<void>;
};

const triggerQueues = new Map<string, Promise<void>>();

function waitForAudioFrame() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 20);
  });
}

export async function pulseGate(voice: GateVoice) {
  const previous = triggerQueues.get(voice.key) ?? Promise.resolve();

  const trigger = previous
    .catch(() => {})
    .then(async () => {
      await voice.setGate({ value: 0.0 });
      voice.gate = 0.0;
      await waitForAudioFrame();
      await voice.setGate({ value: 1.0 });
      voice.gate = 1.0;
    });

  triggerQueues.set(voice.key, trigger);
  await trigger;
}
