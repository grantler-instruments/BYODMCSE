import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import useLiveSetStore from "../store/liveSet";
import {
  buildExportPayload,
  downloadJson,
  exportFilename,
  type SavedSet,
} from "../store/savedSet";

interface Props {
  onClose?: () => void;
}

function SetsLibrary({ onClose }: Props) {
  const tracks = useLiveSetStore((state) => state.tracks);
  const masterGain = useLiveSetStore((state) => state.masterGain);
  const mappings = useLiveSetStore((state) => state.mappings);
  const mqttSettings = useLiveSetStore((state) => state.mqttSettings);
  const config = useLiveSetStore((state) => state.config);
  const savedSets = useLiveSetStore((state) => state.savedSets);
  const activeSetId = useLiveSetStore((state) => state.activeSetId);
  const activeSetName = useLiveSetStore((state) => state.activeSetName);
  const draft = useLiveSetStore((state) => state.draft);
  const loading = useLiveSetStore((state) => state.loading);
  const saveNewSet = useLiveSetStore((state) => state.saveNewSet);
  const updateActiveSet = useLiveSetStore((state) => state.updateActiveSet);
  const loadSet = useLiveSetStore((state) => state.loadSet);
  const newEmptySet = useLiveSetStore((state) => state.newEmptySet);
  const importSet = useLiveSetStore((state) => state.importSet);
  const deleteSet = useLiveSetStore((state) => state.deleteSet);
  const [name, setName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(activeSetName ?? "");
  }, [activeSetId, activeSetName]);

  const handleSaveNew = () => {
    saveNewSet(name);
    setName("");
  };

  const handleUpdateActive = () => {
    updateActiveSet(name.trim() || undefined);
  };

  const handleNewEmptySet = () => {
    void newEmptySet();
    setName("");
  };

  const handleExport = () => {
    const payload = buildExportPayload({
      tracks,
      masterGain,
      mappings: mappings ?? {},
      activeSetName,
      mqttSettings,
      config,
    });
    downloadJson(exportFilename(activeSetName), payload);
  };

  const handleExportSet = (set: SavedSet) => {
    const payload = buildExportPayload({
      tracks: set.tracks,
      masterGain: set.masterGain,
      mappings: set.mappings ?? {},
      activeSetName: set.name,
      mqttSettings: set.mqtt,
      config,
    });
    downloadJson(exportFilename(set.name), payload);
  };

  const handleImportClick = () => {
    setImportError(null);
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const suggestedName = file.name.replace(/\.json$/i, "");
      const ok = await importSet(data, suggestedName);
      if (!ok) {
        setImportError("Invalid set file. Expected JSON with a tracks array.");
        return;
      }
      setImportError(null);
    } catch {
      setImportError("Could not read the file. Check that it is valid JSON.");
    }
  };

  const sortedSets = [...savedSets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

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
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => void handleImportFile(event)}
      />

      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h6" color="primary">
          Live set
        </Typography>
        {onClose && (
          <IconButton aria-label="Close sets library" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <Stack spacing={1.5}>
        <Button
          variant="outlined"
          onClick={handleNewEmptySet}
          disabled={loading}
          fullWidth
        >
          New empty set
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleExport}
            disabled={loading}
            fullWidth
          >
            Export JSON
          </Button>
          <Button
            variant="outlined"
            onClick={handleImportClick}
            disabled={loading}
            fullWidth
          >
            Import JSON
          </Button>
        </Stack>
        {importError && (
          <Typography variant="caption" color="error">
            {importError}
          </Typography>
        )}
        <TextField
          label="Set name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
          placeholder="e.g. Friday night"
        />
        <Button
          variant="contained"
          onClick={handleSaveNew}
          disabled={!name.trim()}
          fullWidth
        >
          Save as new set
        </Button>
        <Button
          variant="outlined"
          onClick={handleUpdateActive}
          disabled={!activeSetId}
          fullWidth
        >
          Update active set
        </Button>
        {activeSetName && (
          <Typography variant="caption" color="text.secondary">
            Active: {activeSetName}
          </Typography>
        )}
        {draft && (
          <Typography variant="caption" color="text.secondary">
            Autosaved {new Date(draft.updatedAt).toLocaleString()}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          ⌘/Ctrl+N new set · ⌘/Ctrl+S save · ⌘/Ctrl+O open sets
        </Typography>
      </Stack>

      <Typography variant="subtitle2" color="text.secondary">
        Saved sets ({savedSets.length})
      </Typography>

      <List
        disablePadding
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {sortedSets.length === 0 && (
          <ListItem disablePadding sx={{ py: 1 }}>
            <ListItemText
              primary="No saved sets yet"
              secondary="Each save creates a new entry. Use different names for different sets."
            />
          </ListItem>
        )}
        {sortedSets.map((set) => (
          <ListItem
            key={set.id}
            disablePadding
            sx={{
              py: 0.75,
              px: 1,
              bgcolor:
                set.id === activeSetId
                  ? "rgba(42, 157, 143, 0.12)"
                  : "transparent",
              borderRadius: 1,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%" }}
            >
              <ListItemText
                primary={set.name}
                secondary={`${set.tracks.length} tracks · ${new Date(set.updatedAt).toLocaleString()}`}
                sx={{ minWidth: 0, flex: 1 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleExportSet(set)}
              >
                Export
              </Button>
              <Button
                size="small"
                variant={set.id === activeSetId ? "contained" : "outlined"}
                onClick={() => void loadSet(set.id)}
                disabled={loading}
              >
                Load
              </Button>
              <IconButton
                aria-label={`Delete ${set.name}`}
                onClick={() => deleteSet(set.id)}
                size="small"
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default SetsLibrary;
