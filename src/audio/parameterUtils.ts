export function readParamNumber(
  parameters: Record<string, { value?: number }> | undefined,
  key: string,
  fallback: number
): number {
  const value = parameters?.[key]?.value;
  return typeof value === "number" ? value : fallback;
}

export function readParamString(
  parameters: Record<string, { value?: string }> | undefined,
  key: string,
  fallback: string
): string {
  const value = parameters?.[key]?.value;
  return typeof value === "string" ? value : fallback;
}

export function readParamBoolean(
  parameters: Record<string, { value?: boolean }> | undefined,
  key: string,
  fallback: boolean
): boolean {
  const value = parameters?.[key]?.value;
  return typeof value === "boolean" ? value : fallback;
}

export function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}
