import { cn } from '@/lib/cn'

type CarbonBadgeProps = {
  co2eKg: number
  className?: string
}

function getSeverityClass(co2eKg: number): string {
  if (co2eKg < 0.5) return 'text-carbon-low border-carbon-low/30 bg-carbon-low/10'
  if (co2eKg < 2) return 'text-carbon-mid border-carbon-mid/30 bg-carbon-mid/10'
  if (co2eKg < 5) return 'text-carbon-high border-carbon-high/30 bg-carbon-high/10'
  return 'text-carbon-critical border-carbon-critical/30 bg-carbon-critical/10'
}

export function CarbonBadge({ co2eKg, className }: CarbonBadgeProps) {
  const formatted =
    co2eKg >= 1000
      ? `${(co2eKg / 1000).toFixed(1)}t`
      : co2eKg >= 1
      ? `${co2eKg.toFixed(1)} kg`
      : `${(co2eKg * 1000).toFixed(0)} g`

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-xs font-medium border',
        getSeverityClass(co2eKg),
        className
      )}
      aria-label={`${formatted} CO₂ equivalent`}
    >
      {formatted} CO₂e
    </span>
  )
}

type CategoryDotProps = {
  category: string
  className?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-red-500',
  transport: 'bg-orange-500',
  energy: 'bg-yellow-500',
  shopping: 'bg-violet-500',
  travel: 'bg-blue-500',
  other: 'bg-gray-500',
}

export function CategoryDot({ category, className }: CategoryDotProps) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', CATEGORY_COLORS[category] ?? 'bg-gray-500', className)}
      aria-hidden="true"
    />
  )
}
