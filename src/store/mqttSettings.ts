export interface MqttSettings {
  brokerUrl: string;
  roomId: string;
  autoConnect?: boolean;
}

export type MqttStatus = "disconnected" | "connecting" | "connected" | "error";

export function shouldAutoConnectMqtt(settings: MqttSettings): boolean {
  return settings.autoConnect !== false && Boolean(settings.brokerUrl.trim());
}

export function mergeMqttSettingsForLoad(
  saved: Partial<MqttSettings> | null | undefined,
  session: MqttSettings,
  config: any
): MqttSettings {
  const merged = normalizeMqttSettings(saved, config);
  if (session.autoConnect === false) {
    merged.autoConnect = false;
  }
  return merged;
}

export function resolveBrokerUrl(config: any, override?: string): string {
  if (override?.trim()) {
    return override.trim();
  }

  const fromEnv = import.meta.env.VITE_MQTT_BROKER_URL;
  if (fromEnv) return fromEnv;

  const connection = config?.connection;
  if (import.meta.env.DEV && connection?.["broker.local"]) {
    return connection["broker.local"];
  }

  const broker = connection?.broker;
  if (broker) return broker;

  return "";
}

export function defaultMqttSettings(config: any): MqttSettings {
  return {
    brokerUrl: resolveBrokerUrl(config),
    roomId: "demo",
  };
}

export function normalizeMqttSettings(
  value: Partial<MqttSettings> | null | undefined,
  config: any
): MqttSettings {
  const defaults = defaultMqttSettings(config);
  return {
    brokerUrl: value?.brokerUrl?.trim() ?? defaults.brokerUrl,
    roomId: value?.roomId?.trim() || defaults.roomId,
    autoConnect: value?.autoConnect,
  };
}

export function parseMqttSettings(
  data: unknown,
  config: any
): MqttSettings | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const obj = data as Record<string, unknown>;

  if (obj.mqtt && typeof obj.mqtt === "object") {
    const mqtt = obj.mqtt as Partial<MqttSettings> & { autoConnect?: boolean };
    return normalizeMqttSettings(mqtt, config);
  }

  if (obj.mqttSettings && typeof obj.mqttSettings === "object") {
    return normalizeMqttSettings(
      obj.mqttSettings as Partial<MqttSettings>,
      config
    );
  }

  if (obj.connection && typeof obj.connection === "object") {
    const connection = obj.connection as Record<string, unknown>;
    const broker =
      typeof connection.broker === "string"
        ? connection.broker
        : typeof connection["broker.local"] === "string"
          ? connection["broker.local"]
          : undefined;
    const roomId =
      typeof connection.roomId === "string"
        ? connection.roomId
        : typeof obj.roomId === "string"
          ? obj.roomId
          : undefined;

    if (broker || roomId) {
      return normalizeMqttSettings({ brokerUrl: broker, roomId }, config);
    }
  }

  return undefined;
}
