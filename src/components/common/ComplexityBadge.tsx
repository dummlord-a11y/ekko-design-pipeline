import { clsx } from 'clsx'

const colors: Record<number, string> = {
  1: 'bg-green-500/20 text-green-400 border-green-500/30',
  2: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  5: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function ComplexityBadge({ level }: { level: number }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        colors[level] || colors[3]
      )}
    >
      <span className="text-[10px]">{'●'.repeat(level)}</span>
      {level}
    </span>
  )
}
