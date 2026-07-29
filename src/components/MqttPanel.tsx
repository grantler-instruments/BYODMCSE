import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useLiveSetStore from "../store/liveSet";
import {
  buildMqttUrl,
  defaultPortForProtocol,
  MQTT_PROTOCOLS,
  parseMqttEndpoint,
  type MqttEndpoint,
  type MqttProtocol,
  validateMqttEndpoint,
} from "../mqttEndpoint";

interface Props {
  onClose?: () => void;
}

const statusLabels = {
  disconnected: "Disconnected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Error",
} as const;

function endpointFromUrl(url: string): MqttEndpoint {
  return (
    parseMqttEndpoint(url) ?? {
      protocol: "ws",
      host: "",
      port: defaultPortForProtocol("ws"),
      path: "",
    }
  );
}

function MqttPanel({ onClose }: Props) {
  const mqttSettings = useLiveSetStore((state) => state.mqttSettings);
  const mqttStatus = useLiveSetStore((state) => state.mqttStatus);
  const mqttError = useLiveSetStore((state) => state.mqttError);
  const setMqttSettings = useLiveSetStore((state) => state.setMqttSettings);
  const connectMqtt = useLiveSetStore((state) => state.connectMqtt);
  const disconnectMqtt = useLiveSetStore((state) => state.disconnectMqtt);
  const [endpoint, setEndpoint] = useState(() =>
    endpointFromUrl(mqttSettings.brokerUrl)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [username, setUsername] = useState(mqttSettings.username);
  const [password, setPassword] = useState(mqttSettings.password);
  const [roomId, setRoomId] = useState(mqttSettings.roomId);

  useEffect(() => {
    setEndpoint(endpointFromUrl(mqttSettings.brokerUrl));
    setUsername(mqttSettings.username);
    setPassword(mqttSettings.password);
    setRoomId(mqttSettings.roomId);
  }, [
    mqttSettings.brokerUrl,
    mqttSettings.password,
    mqttSettings.roomId,
    mqttSettings.username,
  ]);

  const endpointError = validateMqttEndpoint(endpoint);

  const applySettings = () => {
    if (endpointError) return false;

    setMqttSettings({
      brokerUrl: buildMqttUrl(endpoint),
      username: username.trim(),
      password,
      roomId: roomId.trim() || "demo",
    });
    return true;
  };

  const handleConnect = () => {
    if (!applySettings()) return;
    connectMqtt();
  };

  const handleDisconnect = () => {
    void disconnectMqtt();
  };

  const statusColor =
    mqttStatus === "connected"
      ? "success"
      : mqttStatus === "error"
        ? "error"
        : mqttStatus === "connecting"
          ? "warning"
          : "default";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        gap: 2,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h6" color="primary">
          MQTT
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={
                  mqttStatus === "connected" || mqttStatus === "connecting"
                }
                onChange={(_, checked) => {
                  if (checked) {
                    handleConnect();
                  } else {
                    handleDisconnect();
                  }
                }}
              />
            }
            label="Connect MQTT"
          />
          {onClose && (
            <IconButton
              aria-label="Close MQTT panel"
              onClick={onClose}
              edge="end"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip
          size="small"
          label={statusLabels[mqttStatus]}
          color={statusColor}
          variant={mqttStatus === "connected" ? "filled" : "outlined"}
        />
        <Typography variant="caption" color="text.secondary">
          Topic prefix: {roomId.trim() || "demo"}
        </Typography>
      </Stack>

      {mqttError && (
        <Typography variant="caption" color="error">
          {mqttError}
        </Typography>
      )}

      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl size="small" sx={{ width: { sm: 100 }, flexShrink: 0 }}>
            <InputLabel id="mqtt-protocol-label">Protocol</InputLabel>
            <Select
              labelId="mqtt-protocol-label"
              label="Protocol"
              value={endpoint.protocol}
              onChange={(event) => {
                const protocol = event.target.value as MqttProtocol;
                setEndpoint((current) => ({
                  ...current,
                  protocol,
                  port: defaultPortForProtocol(protocol),
                }));
              }}
            >
              {MQTT_PROTOCOLS.map((protocol) => (
                <MenuItem key={protocol} value={protocol}>
                  {protocol}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Broker host"
            value={endpoint.host}
            onChange={(event) =>
              setEndpoint((current) => ({ ...current, host: event.target.value }))
            }
            onBlur={applySettings}
            size="small"
            fullWidth
            error={!endpoint.host.trim()}
            placeholder="localhost"
            helperText={!endpoint.host.trim() ? "Broker host is required." : " "}
          />
          <TextField
            label="Port"
            type="number"
            value={endpoint.port}
            onChange={(event) => {
              if (/^\d*$/.test(event.target.value)) {
                setEndpoint((current) => ({
                  ...current,
                  port: event.target.value,
                }));
              }
            }}
            onBlur={applySettings}
            size="small"
            sx={{ width: { sm: 120 }, flexShrink: 0 }}
            error={endpoint.port !== "" && endpointError !== null}
            helperText="1–65535"
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                min: 1,
                max: 65_535,
                step: 1,
              },
            }}
          />
        </Stack>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showAdvanced}
              onChange={(_, checked) => setShowAdvanced(checked)}
            />
          }
          label="Advanced"
          sx={{ alignSelf: "flex-start", m: 0 }}
        />
        {showAdvanced && (
          <>
            <TextField
              label="WebSocket path"
              value={endpoint.path}
              onChange={(event) =>
                setEndpoint((current) => ({
                  ...current,
                  path: event.target.value,
                }))
              }
              onBlur={applySettings}
              size="small"
              fullWidth
              placeholder="/mqtt"
              helperText="Optional; for example, /mqtt"
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onBlur={applySettings}
                size="small"
                sx={{ flex: 1 }}
                autoComplete="username"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={applySettings}
                size="small"
                sx={{ flex: 1 }}
                autoComplete="current-password"
              />
            </Stack>
          </>
        )}
        <TextField
          label="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onBlur={applySettings}
          size="small"
          fullWidth
          placeholder="demo"
          helperText="MIDI arrives on <room>/out/..."
        />
        <Typography variant="caption" color="text.secondary">
          Connection settings are saved with the current live set.
        </Typography>
      </Stack>
    </Box>
  );
}

export default MqttPanel;
