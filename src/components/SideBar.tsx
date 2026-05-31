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
import PianoOutlinedIcon from "@mui/icons-material/PianoOutlined";
import useAppStore from "../store/app";

export const SIDEBAR_WIDTH = 72;

interface Props {}

const SideBar = (_props: Props) => {
  const showFileBrowser = useAppStore((state) => state.showFileBrowser);
  const setShowFileBrowser = useAppStore((state) => state.setShowFileBrowser);
  const showVirtualKeyboard = useAppStore((state) => state.showVirtualKeyboard);
  const setShowVirtualKeyboard = useAppStore(
    (state) => state.setShowVirtualKeyboard
  );

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        alignSelf: "stretch",
        height: "100%",
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
        <Tooltip title="Files" placement="right">
          <IconButton
            aria-label="Open file browser"
            aria-pressed={showFileBrowser}
            onClick={() => setShowFileBrowser(!showFileBrowser)}
            color={showFileBrowser ? "primary" : "default"}
            size="large"
          >
            <FolderOpenOutlinedIcon />
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
