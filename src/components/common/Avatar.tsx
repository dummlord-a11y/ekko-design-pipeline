import { clsx } from 'clsx'

export function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sizes = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={clsx('rounded-full object-cover', sizes[size])}
      />
    )
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-indigo-100 font-medium text-indigo-600',
        sizes[size]
      )}
    >
      {initials}
    </div>
  )
}
