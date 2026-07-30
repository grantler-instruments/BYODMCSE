import { useState, type FormEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import useLiveSetStore, { primeAudioContext } from "../store/liveSet";
import { randomStageId, slugify } from "../store/savedSet";

interface StageSummary {
  id: string;
  trackCount: number;
  updatedAt: string;
}

function useStageSummaries(): StageSummary[] {
  const savedSets = useLiveSetStore((state) => state.savedSets);
  const draftsByStageId = useLiveSetStore((state) => state.draftsByStageId);

  const byId = new Map<string, StageSummary>();
  for (const [id, draft] of Object.entries(draftsByStageId)) {
    byId.set(id, {
      id,
      trackCount: draft.tracks.length,
      updatedAt: draft.updatedAt,
    });
  }
  for (const set of savedSets) {
    const existing = byId.get(set.name);
    if (!existing || new Date(set.updatedAt) >= new Date(existing.updatedAt)) {
      byId.set(set.name, {
        id: set.name,
        trackCount: set.tracks.length,
        updatedAt: set.updatedAt,
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function Home() {
  const navigate = useNavigate();
  const deleteStage = useLiveSetStore((state) => state.deleteStage);
  const [stageId, setStageId] = useState(() => randomStageId());
  const stageSummaries = useStageSummaries();

  const enterStage = (id: string) => {
    // Must run inside this click handler's callstack — browsers only allow
    // creating/resuming an AudioContext from within a user gesture.
    primeAudioContext();
    navigate(`/stage/${id}/soundcheck`);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = stageId.trim();
    if (!trimmed) return;
    enterStage(trimmed);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        p: 4,
        overflowY: "auto",
      }}
    >
      <Typography variant="h4" color="primary">
        BYOD
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", maxWidth: 360 }}
      >
        There's no live view yet — just the sound check, where you build a
        stage's set.
      </Typography>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 360 }}>
        <TextField
          label="Stage name"
          value={stageId}
          onChange={(event) => setStageId(slugify(event.target.value))}
          size="small"
          fullWidth
          autoFocus
          placeholder="e.g. friday-night"
          helperText="Lowercase letters, numbers, hyphens only."
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!stageId.trim()}
          fullWidth
        >
          Soundcheck
        </Button>
      </Stack>

      {stageSummaries.length > 0 && (
        <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 720 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Recent stages
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1.5,
            }}
          >
            {stageSummaries.map((stage) => (
              <Card key={stage.id} variant="outlined" sx={{ position: "relative" }}>
                <CardActionArea
                  onClick={() => enterStage(stage.id)}
                  sx={{ p: 1.5, pr: 5 }}
                >
                  <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                    <Typography variant="body2" noWrap title={stage.id}>
                      {stage.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stage.trackCount} track
                      {stage.trackCount === 1 ? "" : "s"}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <IconButton
                  aria-label={`Delete ${stage.id}`}
                  size="small"
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    deleteStage(stage.id);
                  }}
                  sx={{ position: "absolute", top: 4, right: 4 }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Card>
            ))}
          </Box>
        </Stack>
      )}
    </Box>
  );
}

export default Home;
