import { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Instrument from "./Instrument";
import Effect from "./Effect";
import AddEffectDialog from "./AddEffectDialog";
import AddMidiEffectDialog from "./AddMidiEffectDialog";
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

function SortableMidiEffectItem({ effect }: { effect: any }) {
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
  const midiEffects = track?.midiEffects ?? [];
  const [addEffectOpen, setAddEffectOpen] = useState(false);
  const [addMidiEffectOpen, setAddMidiEffectOpen] = useState(false);
  const reorderEffects = useLiveSetStore((state) => state.reorderEffects);
  const reorderMidiEffects = useLiveSetStore(
    (state) => state.reorderMidiEffects
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const onEffectsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const fromIndex = effects.findIndex((e: any) => e.id === active.id);
    const toIndex = effects.findIndex((e: any) => e.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    void reorderEffects(track.id, fromIndex, toIndex);
  };

  const onMidiEffectsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const fromIndex = midiEffects.findIndex((e: any) => e.id === active.id);
    const toIndex = midiEffects.findIndex((e: any) => e.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    void reorderMidiEffects(track.id, fromIndex, toIndex);
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isStrip ? 1 : 2,
          width: isStrip ? "100%" : "auto",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onMidiEffectsDragEnd}
        >
          <SortableContext
            items={midiEffects.map((e: any) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            {midiEffects.map((effect: any) => (
              <SortableMidiEffectItem key={effect.id} effect={effect} />
            ))}
          </SortableContext>
        </DndContext>
        <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
          <Tooltip title="Add MIDI effect">
            <IconButton
              size="small"
              aria-label="Add MIDI effect"
              onClick={() => setAddMidiEffectOpen(true)}
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
      {instrument && <Instrument instrument={instrument}></Instrument>}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isStrip ? 1 : 2,
          width: isStrip ? "100%" : "auto",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onEffectsDragEnd}
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
      <AddMidiEffectDialog
        trackId={track.id}
        open={addMidiEffectOpen}
        onClose={() => setAddMidiEffectOpen(false)}
      />
    </Box>
  );
}

export default TrackDetails;
