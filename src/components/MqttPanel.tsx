import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useLiveSetStore from "../store/liveSet";

interface Props {
  onClose?: () => void;
}

const statusLabels = {
  disconnected: "Disconnected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Error",
} as const;

function MqttPanel({ onClose }: Props) {
  const mqttSettings = useLiveSetStore((state) => state.mqttSettings);
  const mqttStatus = useLiveSetStore((state) => state.mqttStatus);
  const mqttError = useLiveSetStore((state) => state.mqttError);
  const setMqttSettings = useLiveSetStore((state) => state.setMqttSettings);
  const connectMqtt = useLiveSetStore((state) => state.connectMqtt);
  const disconnectMqtt = useLiveSetStore((state) => state.disconnectMqtt);
  const reconnectMqtt = useLiveSetStore((state) => state.reconnectMqtt);
  const [brokerUrl, setBrokerUrl] = useState(mqttSettings.brokerUrl);
  const [roomId, setRoomId] = useState(mqttSettings.roomId);

  useEffect(() => {
    setBrokerUrl(mqttSettings.brokerUrl);
    setRoomId(mqttSettings.roomId);
  }, [mqttSettings.brokerUrl, mqttSettings.roomId]);

  const applySettings = () => {
    setMqttSettings({
      brokerUrl: brokerUrl.trim(),
      roomId: roomId.trim() || "demo",
    });
  };

  const handleConnect = () => {
    applySettings();
    connectMqtt();
  };

  const handleDisconnect = () => {
    void disconnectMqtt();
  };

  const handleReconnect = () => {
    applySettings();
    void reconnectMqtt();
  };

  const statusColor =
    mqttStatus === "connected"
      ? "success"
      : mqttStatus === "error"
        ? "error"
        : mqttStatus === "connecting"
          ? "warning"
          : "default";

  const canDisconnect =
    mqttStatus === "connected" ||
    mqttStatus === "error" ||
    mqttStatus === "connecting";

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
        {onClose && (
          <IconButton aria-label="Close MQTT panel" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        )}
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
        <TextField
          label="Broker URL"
          value={brokerUrl}
          onChange={(e) => setBrokerUrl(e.target.value)}
          onBlur={applySettings}
          size="small"
          fullWidth
          placeholder="ws://localhost:9001"
          helperText="WebSocket URL for your MQTT broker"
        />
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
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={mqttStatus === "connecting"}
            fullWidth
          >
            Connect
          </Button>
          <Button
            variant="outlined"
            onClick={handleDisconnect}
            disabled={!canDisconnect}
            fullWidth
          >
            Disconnect
          </Button>
          <Button
            variant="outlined"
            onClick={handleReconnect}
            disabled={mqttStatus === "connecting"}
            fullWidth
          >
            Reconnect
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Connection settings are saved with the current live set.
        </Typography>
      </Stack>
    </Box>
  );
}

export default MqttPanel;
