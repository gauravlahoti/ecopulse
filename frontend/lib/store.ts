import { create } from 'zustand'
import type { ActivityRecord, IdentifiedItem, ChatMessage, Intervention } from './types'

type AppState = {
  // Activities
  activities: ActivityRecord[]
  totalCo2eKg: number
  isLoadingActivities: boolean

  // Streaming (Snap-to-Carbon)
  isSnapping: boolean
  streamingItems: Array<IdentifiedItem & { co2e_kg: number }>
  swapSuggestion: string | null
  swapSavingPct: number | null

  // Chat (Carbon Conversations)
  chatOpen: boolean
  chatMessages: ChatMessage[]
  chatStreaming: boolean

  // Simulator
  simulatorOpen: boolean
  interventions: Intervention[]
  currentScenarioCo2e: number[]
  committedScenarioCo2e: number[]

  // Actions
  setActivities: (activities: ActivityRecord[]) => void
  addActivity: (activity: ActivityRecord) => void
  setIsLoadingActivities: (loading: boolean) => void
  setIsSnapping: (snapping: boolean) => void
  addStreamingItem: (item: IdentifiedItem & { co2e_kg: number }) => void
  setSwapSuggestion: (suggestion: string, pct: number) => void
  clearSnap: () => void
  setChatOpen: (open: boolean) => void
  addChatMessage: (msg: ChatMessage) => void
  updateLastAssistantMessage: (content: string, done?: boolean) => void
  setChatStreaming: (streaming: boolean) => void
  setSimulatorOpen: (open: boolean) => void
  toggleIntervention: (key: string) => void
  setScenarios: (current: number[], committed: number[]) => void
}

const DEFAULT_INTERVENTIONS: Intervention[] = [
  { key: 'cycle_2x', label: 'Cycle 2×/week', icon: '🚲', saving_pct: 8, active: false },
  { key: 'plant_meals', label: '2 plant meals/day', icon: '🥦', saving_pct: 12, active: false },
  { key: 'no_short_haul', label: 'No short-haul flights', icon: '✈', saving_pct: 15, active: false },
  { key: 'solar_tariff', label: 'Switch to solar tariff', icon: '☀', saving_pct: 6, active: false },
]

function calcTotal(activities: ActivityRecord[]): number {
  return activities.reduce((sum, a) => sum + a.co2e_kg, 0)
}

export const useStore = create<AppState>((set) => ({
  activities: [],
  totalCo2eKg: 0,
  isLoadingActivities: false,
  isSnapping: false,
  streamingItems: [],
  swapSuggestion: null,
  swapSavingPct: null,
  chatOpen: false,
  chatMessages: [],
  chatStreaming: false,
  simulatorOpen: false,
  interventions: DEFAULT_INTERVENTIONS,
  currentScenarioCo2e: Array(12).fill(0) as number[],
  committedScenarioCo2e: Array(12).fill(0) as number[],

  setActivities: (activities) =>
    set({ activities, totalCo2eKg: calcTotal(activities) }),

  addActivity: (activity) =>
    set((s) => {
      const activities = [activity, ...s.activities]
      return { activities, totalCo2eKg: calcTotal(activities) }
    }),

  setIsLoadingActivities: (loading) => set({ isLoadingActivities: loading }),

  setIsSnapping: (snapping) => set({ isSnapping: snapping, streamingItems: [] }),

  addStreamingItem: (item) =>
    set((s) => ({ streamingItems: [...s.streamingItems, item] })),

  setSwapSuggestion: (suggestion, pct) =>
    set({ swapSuggestion: suggestion, swapSavingPct: pct }),

  clearSnap: () =>
    set({ isSnapping: false, streamingItems: [], swapSuggestion: null, swapSavingPct: null }),

  setChatOpen: (open) => set({ chatOpen: open }),

  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

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

  setSimulatorOpen: (open) => set({ simulatorOpen: open }),

  toggleIntervention: (key) =>
    set((s) => ({
      interventions: s.interventions.map((i) =>
        i.key === key ? { ...i, active: !i.active } : i
      ),
    })),

  setScenarios: (current, committed) =>
    set({ currentScenarioCo2e: current, committedScenarioCo2e: committed }),
}))
