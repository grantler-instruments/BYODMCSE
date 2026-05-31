export type EffectParamRef = {
  node: any;
  setValue: (props: { value: number }) => Promise<void>;
};

export type ParameterSetter = (value: any) => void | Promise<void>;

export function createEffectParamRef(
  core: any,
  key: string,
  initialValue: number
): EffectParamRef {
  const [node, setValue] = core.createRef(
    "const",
    { key, value: initialValue },
    []
  );
  return { node, setValue };
}

export function registerEffectParameter(
  setters: Map<string, ParameterSetter>,
  param: { id?: string } | undefined,
  setter: ParameterSetter
) {
  if (param?.id) {
    setters.set(param.id, setter);
  }
}
