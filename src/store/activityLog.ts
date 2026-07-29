import { create } from "zustand";

export type ActivitySource = "keyboard" | "midi" | "mqtt";
export type ActivityType = "noteOn" | "noteOff" | "controlChange";

export interface ActivityEvent {
  id: string;
  timestamp: number;
  source: ActivitySource;
  type: ActivityType;
  channel?: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
}

interface ActivityLogState {
  events: ActivityEvent[];
  addEvent: (
    event: Omit<ActivityEvent, "id" | "timestamp">
  ) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 200;
let nextEventId = 0;

const useActivityLogStore = create<ActivityLogState>((set) => ({
  events: [],
  addEvent: (event) =>
    set((state) => ({
      events: [
        {
          ...event,
          id: `${Date.now()}-${nextEventId++}`,
          timestamp: Date.now(),
        },
        ...state.events,
      ].slice(0, MAX_EVENTS),
    })),
  clearEvents: () => set({ events: [] }),
}));

export default useActivityLogStore;
