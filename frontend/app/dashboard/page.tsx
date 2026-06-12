'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Globe } from '@/components/Globe'
import { CarbonScore } from '@/components/CarbonScore'
import { QuickLog } from '@/components/QuickLog'
import { ActivityFeed } from '@/components/ActivityFeed'
import { MetricStrip } from '@/components/MetricStrip'
import { CarbonConversations } from '@/components/CarbonConversations'
import { ParallelYouSimulator } from '@/components/ParallelYouSimulator'
import { CameraOverlay } from '@/components/CameraOverlay'
import { NeonButton } from '@/components/ui/NeonButton'
import { useStore } from '@/lib/store'

type Tab = 'dashboard' | 'simulator'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { activities, totalCo2eKg, isLoadingActivities, isSnapping, setActivities, setIsLoadingActivities, clearSnap } = useStore()

  // Load mock activities on mount
  useEffect(() => {
    setIsLoadingActivities(true)
    fetch('/api/v1/activities')
      .then((r) => r.json())
      .then((data: { activities: typeof activities }) => {
        setActivities(data.activities)
      })
      .catch(() => {
        // MSW mock not yet active — use empty state
      })
      .finally(() => setIsLoadingActivities(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Camera overlay (portal-style, full screen) */}
      {isSnapping && <CameraOverlay onClose={clearSnap} />}

      <div className="min-h-dvh bg-space-black flex flex-col">

        {/* ── Navigation header ─────────────────────────────────── */}
        <header className="glass border-b border-white/[0.07] px-4 py-3 flex items-center justify-between flex-shrink-0 z-30 sticky top-0">
          <Link href="/" aria-label="EcoPulse home" className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-lg">
            <span className="font-display font-extrabold text-xl">
              Eco<span className="text-neon-cyan text-glow-cyan">Pulse</span>
            </span>
          </Link>

          <nav aria-label="Dashboard navigation">
            <div className="flex gap-1 p-1 glass rounded-xl" role="tablist">
              {(['dashboard', 'simulator'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`${tab}-panel`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg font-display font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan capitalize ${
                    activeTab === tab
                      ? 'bg-neon-cyan text-space-black'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab === 'simulator' ? '🌍 Simulator' : '📊 Dashboard'}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <span className="font-mono text-carbon-label text-text-muted hidden sm:block uppercase tracking-widest">
              Demo Mode
            </span>
            <div className="w-8 h-8 rounded-full bg-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center text-sm" aria-label="User avatar">
              G
            </div>
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────────── */}
        <main id="main-content" className="flex-1 flex flex-col min-h-0">

          {/* Dashboard tab */}
          <div
            id="dashboard-panel"
            role="tabpanel"
            aria-labelledby="dashboard-tab"
            hidden={activeTab !== 'dashboard'}
            className="flex-1 flex flex-col lg:flex-row min-h-0"
          >
            {/* Globe panel — left 60% */}
            <section
              aria-label="Carbon globe visualization"
              className="lg:flex-[3] h-[45vh] lg:h-auto relative"
            >
              <Globe
                co2eKg={totalCo2eKg}
                activities={activities}
                height="100%"
                className="w-full h-full"
              />

              {/* Globe overlay — current total */}
              <div className="absolute bottom-4 left-4 pointer-events-none">
                <div className="glass px-3 py-2 rounded-xl">
                  <p className="font-mono text-carbon-label text-text-muted uppercase tracking-widest text-[10px]">
                    Total Load
                  </p>
                  <p className="font-display font-bold text-lg text-neon-cyan text-glow-cyan">
                    {totalCo2eKg >= 1000
                      ? `${(totalCo2eKg / 1000).toFixed(2)}t`
                      : `${totalCo2eKg.toFixed(1)}kg`} CO₂e
                  </p>
                </div>
              </div>
            </section>

            {/* Side panel — right 40% */}
            <aside
              aria-label="Carbon dashboard controls"
              className="lg:flex-[2] flex flex-col gap-3 p-4 overflow-y-auto"
            >
              <CarbonScore
                co2eKg={totalCo2eKg}
                period="THIS MONTH"
                deltaPercent={-12}
              />
              <QuickLog />
              <ActivityFeed activities={activities} isLoading={isLoadingActivities} />
            </aside>
          </div>

          {/* Simulator tab */}
          <div
            id="simulator-panel"
            role="tabpanel"
            aria-labelledby="simulator-tab"
            hidden={activeTab !== 'simulator'}
            className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full"
          >
            <ParallelYouSimulator />
          </div>

        </main>

        {/* ── Metric strip ─────────────────────────────────────── */}
        <MetricStrip activities={activities} />
      </div>

      {/* Carbon Conversations FAB — always visible */}
      <CarbonConversations />
    </>
  )
}
