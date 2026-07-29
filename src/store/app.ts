import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { union } from "lodash";

interface State {
  uuid: string;
  users: any[];
  showFileBrowser: boolean;
  showVirtualKeyboard: boolean;
  showSetsLibrary: boolean;
  showMqttPanel: boolean;
  showMidiPanel: boolean;
  addUser: (uuid: string) => void;
  removeUser: (uuid: string) => void;
  toggleShowFileBrowser: () => void;
  setShowFileBrowser: (show: boolean) => void;
  toggleShowVirtualKeyboard: () => void;
  setShowVirtualKeyboard: (show: boolean) => void;
  setShowSetsLibrary: (show: boolean) => void;
  setShowMqttPanel: (show: boolean) => void;
  setShowMidiPanel: (show: boolean) => void;
}

const useAppStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        uuid: v4(),
        users: [],
        showFileBrowser: false,
        showVirtualKeyboard: false,
        showSetsLibrary: false,
        showMqttPanel: false,
        showMidiPanel: false,
        // Add a new user to the list of users
        addUser: (uuid: string) => {
          const users = get().users
          if (!get().users.find((u: any) => u.uuid === uuid)) {
            return set({
              users: [users, { uuid, timestamp: new Date() }],
            });
          }
        },
        removeUser: (uuid: string) => {
          const users = get().users
          set({
            users: users.filter((item:any) => item.uuid !== uuid),
          });
        },
        toggleShowFileBrowser: () => {
          set({ showFileBrowser: !get().showFileBrowser });
        },
        setShowFileBrowser: (show: boolean) => {
          set({ showFileBrowser: show });
        },
        toggleShowVirtualKeyboard: () => {
          set({ showVirtualKeyboard: !get().showVirtualKeyboard });
        },
        setShowVirtualKeyboard: (show: boolean) => {
          set({ showVirtualKeyboard: show });
        },
        setShowSetsLibrary: (show: boolean) => {
          set({ showSetsLibrary: show });
        },
        setShowMqttPanel: (show: boolean) => {
          set({ showMqttPanel: show });
        },
        setShowMidiPanel: (show: boolean) => {
          set({ showMidiPanel: show });
        },
      }),
      {
        name: "app",
        storage: createJSONStorage(() => localStorage),
        partialize: (state: any) => {
          return {};
        },
      }
    ),
    { name: "app" }
  )
);

export default useAppStore;
