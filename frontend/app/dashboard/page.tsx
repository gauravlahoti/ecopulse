'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CarbonIntelligence } from '@/components/CarbonIntelligence'
import { ActivityFeed } from '@/components/ActivityFeed'
import { MetricStrip } from '@/components/MetricStrip'
import { CarbonConversations } from '@/components/CarbonConversations'
import { CameraOverlay } from '@/components/CameraOverlay'
import { ScanHero } from '@/components/dashboard/ScanHero'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { CoachCard } from '@/components/dashboard/CoachCard'
import { useStore } from '@/lib/store'

export default function DashboardPage() {
  const {
    activities,
    totalCo2eKg,
    isLoadingActivities,
    isSnapping,
    streamingItems,
    setActivities,
    setIsLoadingActivities,
    clearSnap,
  } = useStore()

  const processing = isSnapping || streamingItems.length > 0

  useEffect(() => {
    setIsLoadingActivities(true)
    fetch('/api/v1/activities')
      .then((r) => r.json())
      .then((data: { activities: typeof activities }) => setActivities(data.activities))
      .catch(() => {})
      .finally(() => setIsLoadingActivities(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasData = !isLoadingActivities && activities.length > 0

  return (
    <>
      {isSnapping && <CameraOverlay onClose={clearSnap} />}

      <div className="flex min-h-dvh flex-col bg-space-black">
        {/* Ambient backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              'radial-gradient(900px circle at 15% -10%, rgba(0,245,212,0.10), transparent 55%), radial-gradient(800px circle at 100% 0%, rgba(123,97,255,0.10), transparent 50%)',
          }}
        />

        {/* Header */}
        <header className="glass sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <Link
            href="/"
            aria-label="EcoPulse home"
            className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            <span className="font-display text-xl font-extrabold">
              Eco<span className="text-neon-cyan text-glow-cyan">Pulse</span>
            </span>
          </Link>
          <span className="hidden font-mono text-carbon-label uppercase tracking-widest text-text-muted sm:block">
            Your carbon dashboard
          </span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neon-cyan/30 bg-neon-cyan/20 text-sm"
            aria-label="User avatar"
          >
            G
          </div>
        </header>

        {/* Main */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 lg:p-6">
            {/* Hero: the three ways to log */}
            <ScanHero />

            {/* Intelligence: score, agents, insights */}
            <CarbonIntelligence
              activities={activities}
              co2eKg={totalCo2eKg}
              deltaPercent={-12}
              processing={processing}
              isLoading={isLoadingActivities}
            />

            {/* Charts + AI coach (once there's data) */}
            {hasData && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="flex flex-col gap-4">
                  <TrendChart activities={activities} />
                  <ActivityFeed activities={activities} isLoading={isLoadingActivities} />
                </div>
                <div className="flex flex-col gap-4">
                  <CoachCard activities={activities} />
                  <CategoryDonut activities={activities} />
                </div>
              </div>
            )}

            {/* Empty state still shows the (empty) feed for context */}
            {!hasData && <ActivityFeed activities={activities} isLoading={isLoadingActivities} />}
          </div>
        </main>

        <MetricStrip activities={activities} />
      </div>

      <CarbonConversations />
    </>
  )
}
