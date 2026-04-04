import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Paperclip, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { ComplexityBadge } from '../common/ComplexityBadge'
import { uk } from '../../lib/i18n'
import type { Task } from '../../types'

interface Props {
  task: Task
  onClick: () => void
  overlay?: boolean
}

export function TaskCard({ task, onClick, overlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const attachmentCount = task.attachments?.length || 0
  const categoryLabel = uk.categories[task.category] || task.category
  const priority = task.ai_analysis?.priority || 'medium'

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={onClick}
      className="group cursor-grab rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {priority === 'critical' && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Критично" />
          )}
          {priority === 'high' && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-orange-400" title="Важливо" />
          )}
          <span className="text-[11px] text-gray-400 truncate">
            {task.sender}
          </span>
        </div>
        <ComplexityBadge level={task.complexity} />
      </div>

      <h4 className="mb-1.5 text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
        {task.subject}
      </h4>

      {task.ai_summary && (
        <p className="mb-2 text-xs text-gray-400 line-clamp-2">
          {task.ai_summary}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <div className="flex items-center gap-3">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
            {categoryLabel}
          </span>
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={11} />
              {attachmentCount}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-gray-300">
          <Clock size={11} />
          {formatDistanceToNow(new Date(task.created_at), {
            addSuffix: true,
            locale: ukLocale,
          })}
        </span>
      </div>
    </div>
  )
}
