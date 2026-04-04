import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { clsx } from 'clsx'
import type { Task } from '../../types'
import { TaskCard } from './TaskCard'

interface Props {
  id: string
  title: string
  tasks: Task[]
  icon?: React.ReactNode
  onTaskClick: (task: Task) => void
  accent?: string
}

export function Column({ id, title, tasks, icon, onTaskClick, accent }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex w-72 min-w-[288px] flex-shrink-0 flex-col rounded-xl border bg-white transition-colors',
        isOver ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200'
      )}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span
          className={clsx(
            'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium',
            accent || 'bg-gray-100 text-gray-500'
          )}
        >
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
            Перетягніть завдання сюди
          </div>
        )}
      </div>
    </div>
  )
}
