import { clsx } from 'clsx'

const colors: Record<number, string> = {
  1: 'bg-green-50 text-green-600 border-green-200',
  2: 'bg-lime-50 text-lime-600 border-lime-200',
  3: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  4: 'bg-orange-50 text-orange-600 border-orange-200',
  5: 'bg-red-50 text-red-600 border-red-200',
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
