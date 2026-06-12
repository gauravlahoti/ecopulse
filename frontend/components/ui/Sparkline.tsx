'use client'

import { useId } from 'react'

/**
 * Tiny inline trend line for the insight cards. Pure SVG, no animation loop —
 * it renders the daily CO₂e buckets from computeInsights() as a filled area.
 */

type SparklineProps = {
  data: number[]
  color?: string
  width?: number
  height?: number
  className?: string
}

export function Sparkline({
  data,
  color = '#00F5D4',
  width = 96,
  height = 32,
  className,
}: SparklineProps) {
  const gradientId = useId()
  const points = data.length > 0 ? data : [0, 0]
  const max = Math.max(...points, 1)
  const stepX = points.length > 1 ? width / (points.length - 1) : width

  const coords = points.map((v, i) => {
    const x = i * stepX
    const y = height - (v / max) * (height - 4) - 2
    return [x, y] as const
  })

  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
