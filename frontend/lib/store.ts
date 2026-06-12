import { create } from 'zustand'
import type { ActivityRecord, IdentifiedItem, ChatMessage } from './types'

type AppState = {
  // Activities
  activities: ActivityRecord[]
  totalCo2eKg: number
  isLoadingActivities: boolean

  // Scan (Snap-to-Carbon)
  isSnapping: boolean
  /** When set, the scan overlay analyses this uploaded file instead of the live camera. */
  pendingPhoto: File | null
  streamingItems: Array<IdentifiedItem & { co2e_kg: number }>
  swapSuggestion: string | null
  swapSavingPct: number | null

  // Chat (Carbon Conversations)
  chatOpen: boolean
  chatMessages: ChatMessage[]
  chatStreaming: boolean

  // Actions
  setActivities: (activities: ActivityRecord[]) => void
  addActivity: (activity: ActivityRecord) => void
  setIsLoadingActivities: (loading: boolean) => void
  setIsSnapping: (snapping: boolean) => void
  openScanWithPhoto: (file: File) => void
  addStreamingItem: (item: IdentifiedItem & { co2e_kg: number }) => void
  setSwapSuggestion: (suggestion: string, pct: number) => void
  clearSnap: () => void
  setChatOpen: (open: boolean) => void
  addChatMessage: (msg: ChatMessage) => void
  updateLastAssistantMessage: (content: string, done?: boolean) => void
  setChatStreaming: (streaming: boolean) => void
}

function calcTotal(activities: ActivityRecord[]): number {
  return activities.reduce((sum, a) => sum + a.co2e_kg, 0)
}

export const useStore = create<AppState>((set) => ({
  activities: [],
  totalCo2eKg: 0,
  isLoadingActivities: false,
  isSnapping: false,
  pendingPhoto: null,
  streamingItems: [],
  swapSuggestion: null,
  swapSavingPct: null,
  chatOpen: false,
  chatMessages: [],
  chatStreaming: false,

  setActivities: (activities) => set({ activities, totalCo2eKg: calcTotal(activities) }),

  addActivity: (activity) =>
    set((s) => {
      const activities = [activity, ...s.activities]
      return { activities, totalCo2eKg: calcTotal(activities) }
    }),

  setIsLoadingActivities: (loading) => set({ isLoadingActivities: loading }),

  setIsSnapping: (snapping) => set({ isSnapping: snapping, streamingItems: [], pendingPhoto: null }),

  openScanWithPhoto: (file) => set({ isSnapping: true, pendingPhoto: file, streamingItems: [] }),

  addStreamingItem: (item) => set((s) => ({ streamingItems: [...s.streamingItems, item] })),

  setSwapSuggestion: (suggestion, pct) => set({ swapSuggestion: suggestion, swapSavingPct: pct }),

  clearSnap: () =>
    set({ isSnapping: false, pendingPhoto: null, streamingItems: [], swapSuggestion: null, swapSavingPct: null }),

  setChatOpen: (open) => set({ chatOpen: open }),

  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  updateLastAssistantMessage: (content, done = false) =>
    set((s) => {
      const msgs = [...s.chatMessages]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content, isStreaming: !done }
      }
      return { chatMessages: msgs }
    }),

  setChatStreaming: (streaming) => set({ chatStreaming: streaming }),
}))
