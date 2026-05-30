export function createConstRef(
  core: any,
  key: string,
  initialValue: number
) {
  const [node, setValue] = core.createRef(
    "const",
    { key, value: initialValue },
    []
  );
  return { node, setValue };
}

export function createGateRef(core: any, voiceKey: string) {
  return createConstRef(core, `gate-${voiceKey}`, 0.0);
}
