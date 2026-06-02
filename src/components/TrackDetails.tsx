import { useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Instrument from "./Instrument";
import Effect from "./Effect";
import AddEffectDialog from "./AddEffectDialog";
import useLiveSetStore from "../store/liveSet";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props extends React.PropsWithChildren {
  track: any;
  layout?: "strip" | "row";
}

function SortableEffectItem({ effect }: { effect: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: effect.id });

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      <Effect
        effect={effect}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </Box>
  );
}

function TrackDetails({ children, track, layout = "row" }: Props) {
  const instrument = track?.instrument;
  const isStrip = layout === "strip";
  const effects = track?.effects ?? [];
  const [addEffectOpen, setAddEffectOpen] = useState(false);
  const reorderEffects = useLiveSetStore((state) => state.reorderEffects);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const fromIndex = effects.findIndex((e: any) => e.id === active.id);
    const toIndex = effects.findIndex((e: any) => e.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    void reorderEffects(track.id, fromIndex, toIndex);
  };

  return (
    <Box
      sx={{
        height: isStrip ? "auto" : "100%",
        minHeight: isStrip ? 200 : 280,
        overflowX: isStrip ? "visible" : "auto",
        overflowY: isStrip ? "visible" : "hidden",
        display: "flex",
        flexDirection: isStrip ? "column" : "row",
        gap: isStrip ? 2 : 3,
        alignItems: isStrip ? "stretch" : "flex-start",
      }}
    >
      {children}
      {instrument && <Instrument instrument={instrument}></Instrument>}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isStrip ? 1 : 2,
          width: isStrip ? "100%" : "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 0.5,
          }}
        >
          <Typography variant="subtitle2" color="primary" fontWeight={600}>
            Effects
          </Typography>
          <Tooltip title="Add effect">
            <IconButton
              size="small"
              aria-label="Add effect"
              onClick={() => setAddEffectOpen(true)}
              color="primary"
              sx={{
                border: 1,
                borderColor: "divider",
                borderStyle: "dashed",
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={effects.map((e: any) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            {effects.map((effect: any) => (
              <SortableEffectItem
                key={effect.id}
                effect={effect}
              />
            ))}
          </SortableContext>
        </DndContext>
        <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
          <Tooltip title="Add effect">
            <IconButton
              size="small"
              aria-label="Add effect below list"
              onClick={() => setAddEffectOpen(true)}
              color="primary"
              sx={{
                border: 1,
                borderColor: "divider",
                borderStyle: "dashed",
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <AddEffectDialog
        trackId={track.id}
        open={addEffectOpen}
        onClose={() => setAddEffectOpen(false)}
      />
    </Box>
  );
}

export default TrackDetails;
