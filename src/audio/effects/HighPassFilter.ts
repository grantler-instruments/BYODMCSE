import { el, ElemNode } from "@elemaudio/core";
import Base from "./Base";
import type { ParameterSetter } from "../effectRefs";

class HighPassFilter extends Base {
  constructor(id: string) {
    super(id);
  }

  registerParameterSetters(
    _setters: Map<string, ParameterSetter>,
    _parameters: Record<string, unknown>
  ) {}

  render(signal: ElemNode): ElemNode {
    return el.highpass(500, 1.414, signal);
  }
}

export default HighPassFilter;
