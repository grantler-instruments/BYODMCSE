import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useActivityLogStore, {
  type ActivityEvent,
} from "../store/activityLog";

interface Props {
  onClose?: () => void;
}

const sourceLabels = {
  keyboard: "Keyboard",
  midi: "MIDI",
  mqtt: "MQTT",
} as const;

function noteName(note: number) {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}

function eventDescription(event: ActivityEvent) {
  if (event.type === "controlChange") {
    return `Control change ${event.controller} → ${event.value}`;
  }

  const action = event.type === "noteOn" ? "Note on" : "Note off";
  const note = event.note === undefined ? "Unknown note" : noteName(event.note);
  const velocity =
    event.type === "noteOn" && event.velocity !== undefined
      ? ` · velocity ${event.velocity}`
      : "";
  const channel = event.channel === undefined ? "" : ` · channel ${event.channel}`;
  return `${action} ${note}${velocity}${channel}`;
}

function ActivityPanel({ onClose }: Props) {
  const events = useActivityLogStore((state) => state.events);
  const clearEvents = useActivityLogStore((state) => state.clearEvents);

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
          Activity
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Button size="small" onClick={clearEvents} disabled={events.length === 0}>
            Clear
          </Button>
          {onClose && (
            <IconButton aria-label="Close activity" onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Incoming MIDI, keyboard, and MQTT activity will appear here.
        </Typography>
      ) : (
        <List
          dense
          disablePadding
          aria-label="Incoming activity"
          sx={{ overflowY: "auto", minHeight: 0 }}
        >
          {events.map((event) => (
            <ListItem
              key={event.id}
              disableGutters
              divider
              secondaryAction={
                <Typography variant="caption" color="text.secondary">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Typography>
              }
            >
              <Chip
                label={sourceLabels[event.source]}
                size="small"
                color={event.source === "mqtt" ? "secondary" : "primary"}
                variant="outlined"
                sx={{ mr: 1, minWidth: 76 }}
              />
              <ListItemText primary={eventDescription(event)} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default ActivityPanel;
