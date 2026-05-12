// ════════════════════════════════════════════════════════════════
//  Zustand · UI store (sidebar, command palette, AI floating panel)
// ════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUI = create(persist(
  (set, get) => ({
    sidebarOpen: true,
    paletteOpen: false,
    aiPanelOpen: false,
    theme: 'dark',

    toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
    setSidebar: (v) => set({ sidebarOpen: v }),

    openPalette:  () => set({ paletteOpen: true }),
    closePalette: () => set({ paletteOpen: false }),
    togglePalette: () => set({ paletteOpen: !get().paletteOpen }),

    toggleAIPanel: () => set({ aiPanelOpen: !get().aiPanelOpen }),
    setAIPanel:    (v) => set({ aiPanelOpen: v }),
  }),
  { name: 'aiws-ui' },
));
