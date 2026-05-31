import { useCallback } from "react";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useLiveSetStore from "../store/liveSet";
import { useDropzone } from "react-dropzone";

interface Props {
  onClose?: () => void;
}

const FileBrowser = ({ onClose }: Props) => {
  const theme = useTheme();
  const files = useLiveSetStore((state) => state.config.files);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  const fileEntries = Object.entries(files);

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
          Files
        </Typography>
        {onClose && (
          <IconButton aria-label="Close file browser" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <Box
        {...getRootProps()}
        sx={{
          p: 3,
          textAlign: "center",
          borderRadius: 2,
          border: `1px dashed ${theme.palette.primary.main}`,
          bgcolor: "rgba(255, 255, 255, 0.03)",
          cursor: "pointer",
          transition: "background-color 0.2s",
          ...(isDragActive && {
            bgcolor: "rgba(42, 157, 143, 0.12)",
          }),
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="body2" color="text.secondary">
          {isDragActive
            ? "Drop files here…"
            : "Drag and drop files, or click to browse"}
        </Typography>
      </Box>

      {fileEntries.length > 0 ? (
        <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
          {fileEntries.map(([key, path], index) => (
            <ListItem key={index} disablePadding sx={{ py: 0.75 }}>
              <ListItemText
                primary={key}
                secondary={path as string}
                slotProps={{
                  primary: { variant: "body2" },
                  secondary: { variant: "caption", noWrap: true },
                }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No files loaded yet.
        </Typography>
      )}
    </Box>
  );
};

export default FileBrowser;
