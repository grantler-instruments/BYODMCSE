export const MQTT_PROTOCOLS = ["ws", "wss"] as const;

export type MqttProtocol = (typeof MQTT_PROTOCOLS)[number];

export interface MqttEndpoint {
  protocol: MqttProtocol;
  host: string;
  port: string;
  path: string;
}

const DEFAULT_PORTS: Record<MqttProtocol, string> = {
  ws: "80",
  wss: "443",
};

function isMqttProtocol(value: string): value is MqttProtocol {
  return MQTT_PROTOCOLS.some((protocol) => protocol === value);
}

export function defaultPortForProtocol(protocol: MqttProtocol): string {
  return DEFAULT_PORTS[protocol];
}

export function normalizeMqttPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function buildMqttUrl({ protocol, host, port, path }: MqttEndpoint): string {
  const normalizedHost = host.trim().replace(/^\[|\]$/g, "");
  const urlHost = normalizedHost.includes(":")
    ? `[${normalizedHost}]`
    : normalizedHost;
  const normalizedPort = port.trim();
  return `${protocol}://${urlHost}${normalizedPort ? `:${normalizedPort}` : ""}${normalizeMqttPath(path)}`;
}

export function parseMqttEndpoint(url: string): MqttEndpoint | null {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.slice(0, -1);
    if (!isMqttProtocol(protocol) || !parsed.hostname) return null;

    return {
      protocol,
      host: parsed.hostname,
      port: parsed.port || defaultPortForProtocol(protocol),
      path:
        parsed.pathname !== "/" || parsed.search
          ? `${parsed.pathname}${parsed.search}`
          : "",
    };
  } catch {
    return null;
  }
}

export function validateMqttEndpoint({ host, port }: MqttEndpoint): string | null {
  if (!host.trim()) return "Broker host is required.";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535) {
    return "Port must be a number from 1 to 65535.";
  }
  return null;
}
