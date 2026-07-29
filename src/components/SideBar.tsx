import {
  Box,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  Tooltip,
  Typography,
} from "@mui/material";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import LibraryMusicOutlinedIcon from "@mui/icons-material/LibraryMusicOutlined";
import PianoOutlinedIcon from "@mui/icons-material/PianoOutlined";
import SettingsInputComponentOutlinedIcon from "@mui/icons-material/SettingsInputComponentOutlined";
import SettingsInputAntennaOutlinedIcon from "@mui/icons-material/SettingsInputAntennaOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import useAppStore from "../store/app";
import useLiveSetStore from "../store/liveSet";

export const SIDEBAR_WIDTH = 72;

interface Props {}

const SideBar = (_props: Props) => {
  const showFileBrowser = useAppStore((state) => state.showFileBrowser);
  const showSetsLibrary = useAppStore((state) => state.showSetsLibrary);
  const showMqttPanel = useAppStore((state) => state.showMqttPanel);
  const showMidiPanel = useAppStore((state) => state.showMidiPanel);
  const showActivityPanel = useAppStore((state) => state.showActivityPanel);
  const setSidebarPanel = useAppStore((state) => state.setSidebarPanel);
  const mqttStatus = useLiveSetStore((state) => state.mqttStatus);
  const midiSettings = useLiveSetStore((state) => state.midiSettings);
  const midiError = useLiveSetStore((state) => state.midiError);
  const showVirtualKeyboard = useAppStore((state) => state.showVirtualKeyboard);
  const setShowVirtualKeyboard = useAppStore(
    (state) => state.setShowVirtualKeyboard
  );
  const midiPermissionDenied =
    !!midiError &&
    /(denied|permission|not allowed|security)/i.test(midiError);
  const midiUnavailable =
    typeof navigator === "undefined" ||
    !("requestMIDIAccess" in navigator) ||
    midiPermissionDenied;

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        alignSelf: "stretch",
        height: "100%",
        position: "relative",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(0, 0, 0, 0.35)",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 2,
          pb: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 1.5,
            color: "primary.main",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          BYOD
        </Typography>
        <Divider flexItem sx={{ mt: 1.5, width: "60%" }} />
      </Box>

      <Stack
        component="div"
        role="group"
        aria-label="Navigation items"
        sx={{
          flex: 1,
          alignItems: "center",
          width: "100%",
          py: 1,
          gap: 0.5,
        }}
      >
        <Tooltip title="Live set (⌘O / Ctrl+O)" placement="right">
          <IconButton
            aria-label="Open live set library"
            aria-pressed={showSetsLibrary}
            onClick={() => {
              setSidebarPanel(showSetsLibrary ? null : "setsLibrary");
            }}
            color={showSetsLibrary ? "primary" : "default"}
            size="large"
          >
            <LibraryMusicOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Files" placement="right">
          <IconButton
            aria-label="Open file browser"
            aria-pressed={showFileBrowser}
            onClick={() => {
              setSidebarPanel(showFileBrowser ? null : "fileBrowser");
            }}
            color={showFileBrowser ? "primary" : "default"}
            size="large"
          >
            <FolderOpenOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="MQTT connection" placement="right">
          <IconButton
            aria-label="Open MQTT settings"
            aria-pressed={showMqttPanel}
            onClick={() => {
              setSidebarPanel(showMqttPanel ? null : "mqtt");
            }}
            color={
              showMqttPanel || mqttStatus === "connected" ? "primary" : "default"
            }
            size="large"
          >
            <SettingsInputAntennaOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="MIDI input settings" placement="right">
          <IconButton
            aria-label="Open MIDI input settings"
            aria-pressed={showMidiPanel}
            onClick={() => {
              setSidebarPanel(showMidiPanel ? null : "midi");
            }}
            color={showMidiPanel || midiSettings.enabled ? "primary" : "default"}
            size="large"
          >
            <Box
              component="span"
              sx={{
                position: "relative",
                display: "flex",
                "&::after": midiUnavailable
                  ? {
                      content: '""',
                      position: "absolute",
                      top: "50%",
                      left: -2,
                      width: "calc(100% + 4px)",
                      borderTop: "2px solid currentColor",
                      transform: "rotate(-45deg)",
                    }
                  : undefined,
              }}
            >
              <SettingsInputComponentOutlinedIcon />
            </Box>
          </IconButton>
        </Tooltip>
        <Tooltip title="Incoming activity" placement="right">
          <IconButton
            aria-label="Open incoming activity"
            aria-pressed={showActivityPanel}
            onClick={() => {
              setSidebarPanel(showActivityPanel ? null : "activity");
            }}
            color={showActivityPanel ? "primary" : "default"}
            size="large"
          >
            <HistoryOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Virtual keyboard" placement="right">
          <ToggleButton
            value="keyboard"
            selected={showVirtualKeyboard}
            aria-label="Toggle virtual keyboard"
            size="small"
            onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
            sx={{
              border: "none",
              borderRadius: 1,
              width: 48,
              height: 48,
              color: showVirtualKeyboard ? "primary.main" : "inherit",
              "&.Mui-selected": {
                bgcolor: "rgba(42, 157, 143, 0.18)",
                color: "primary.main",
                "&:hover": {
                  bgcolor: "rgba(42, 157, 143, 0.28)",
                },
              },
            }}
          >
            <PianoOutlinedIcon />
          </ToggleButton>
        </Tooltip>
      </Stack>

      <Box sx={{ flexShrink: 0, pb: 2 }} />
    </Box>
  );
};

export default SideBar;
