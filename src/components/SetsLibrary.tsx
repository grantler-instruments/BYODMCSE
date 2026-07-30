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
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import useLiveSetStore from "../store/liveSet";
import {
  buildExportPayload,
  downloadJson,
  encodeSetForFragment,
  exportFilename,
  slugify,
  type ExportedSetFile,
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
  const midiSettings = useLiveSetStore((state) => state.midiSettings);
  const config = useLiveSetStore((state) => state.config);
  const savedSets = useLiveSetStore((state) => state.savedSets);
  const activeSetId = useLiveSetStore((state) => state.activeSetId);
  const draft = useLiveSetStore(
    (state) => state.draftsByStageId[state.mqttSettings.roomId]
  );
  const loading = useLiveSetStore((state) => state.loading);
  const forkSet = useLiveSetStore((state) => state.forkSet);
  const loadSet = useLiveSetStore((state) => state.loadSet);
  const newEmptySet = useLiveSetStore((state) => state.newEmptySet);
  const importSet = useLiveSetStore((state) => state.importSet);
  const deleteSet = useLiveSetStore((state) => state.deleteSet);
  const [name, setName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // The field always mirrors the current stage ID...
  useEffect(() => {
    setName(slugify(mqttSettings.roomId));
  }, [mqttSettings.roomId]);

  // ...until you type a different one — then, after a pause, that forks the
  // current content into a new stage instead of renaming this one in place.
  useEffect(() => {
    const trimmed = slugify(name);
    if (!trimmed || trimmed === mqttSettings.roomId) return;
    const timer = setTimeout(() => forkSet(trimmed), 600);
    return () => clearTimeout(timer);
  }, [name, mqttSettings.roomId, forkSet]);

  const handleNewEmptySet = () => {
    void newEmptySet();
    setName("");
  };

  const handleExport = () => {
    const payload = buildExportPayload({
      tracks,
      masterGain,
      mappings: mappings ?? {},
      activeSetName: mqttSettings.roomId,
      mqttSettings,
      midiSettings,
      config,
    });
    downloadJson(exportFilename(mqttSettings.roomId), payload);
  };

  const handleExportSet = (set: SavedSet) => {
    const payload = buildExportPayload({
      tracks: set.tracks,
      masterGain: set.masterGain,
      mappings: set.mappings ?? {},
      activeSetName: set.name,
      mqttSettings: set.mqtt,
      midiSettings: set.midi,
      config,
    });
    downloadJson(exportFilename(set.name), payload);
  };

  const copySetLink = async (payload: ExportedSetFile) => {
    try {
      const encoded = await encodeSetForFragment(payload);
      // Hash router owns "#" as its own path+query, so the payload has to
      // ride as "#/?set=..." (route "/") rather than a bare "#set=...".
      const url = `${location.origin}${location.pathname}#/?set=${encoded}`;
      await navigator.clipboard.writeText(url);
      setLinkMessage("Link copied to clipboard");
    } catch (err) {
      console.error("Failed to copy set link:", err);
      setLinkMessage("Could not copy link");
    }
    setTimeout(() => setLinkMessage(null), 3000);
  };

  const handleCopyLink = () => {
    void copySetLink(
      buildExportPayload({
        tracks,
        masterGain,
        mappings: mappings ?? {},
        activeSetName: mqttSettings.roomId,
        mqttSettings,
        midiSettings,
        config,
      })
    );
  };

  const handleCopySetLink = (set: SavedSet) => {
    void copySetLink(
      buildExportPayload({
        tracks: set.tracks,
        masterGain: set.masterGain,
        mappings: set.mappings ?? {},
        activeSetName: set.name,
        mqttSettings: set.mqtt,
        midiSettings: set.midi,
        config,
      })
    );
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

  // Two sets with the same ID are the same stage — only show whichever was
  // updated more recently (stale duplicates can linger from old imports).
  const latestByName = new Map<string, SavedSet>();
  for (const set of savedSets) {
    const existing = latestByName.get(set.name);
    if (!existing || new Date(set.updatedAt) >= new Date(existing.updatedAt)) {
      latestByName.set(set.name, set);
    }
  }
  const sortedSets = Array.from(latestByName.values()).sort(
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
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="New empty set">
            <span>
              <IconButton
                aria-label="New empty set"
                onClick={handleNewEmptySet}
                disabled={loading}
              >
                <NoteAddOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export JSON">
            <span>
              <IconButton
                aria-label="Export JSON"
                onClick={handleExport}
                disabled={loading}
              >
                <FileDownloadOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Import JSON">
            <span>
              <IconButton
                aria-label="Import JSON"
                onClick={handleImportClick}
                disabled={loading}
              >
                <FileUploadOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Copy set link">
            <span>
              <IconButton
                aria-label="Copy set link"
                onClick={handleCopyLink}
                disabled={loading}
              >
                <LinkOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {importError && (
          <Typography variant="caption" color="error">
            {importError}
          </Typography>
        )}
        {linkMessage && (
          <Typography variant="caption" color="text.secondary">
            {linkMessage}
          </Typography>
        )}
        <TextField
          label="Set ID"
          value={name}
          onChange={(e) => setName(slugify(e.target.value))}
          size="small"
          fullWidth
          placeholder="e.g. friday-night"
          helperText="Lowercase letters, numbers, hyphens only. Changing it forks into a new set after a moment — everything else autosaves as you go."
        />
        <Typography variant="caption" color="text.secondary">
          Active: {mqttSettings.roomId}
        </Typography>
        {draft && (
          <Typography variant="caption" color="text.secondary">
            Autosaved {new Date(draft.updatedAt).toLocaleString()}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          ⌘/Ctrl+N new set · ⌘/Ctrl+O open sets
        </Typography>
      </Stack>

      <Typography variant="subtitle2" color="text.secondary">
        Saved sets ({sortedSets.length})
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
                variant="outlined"
                onClick={() => handleCopySetLink(set)}
              >
                Link
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
