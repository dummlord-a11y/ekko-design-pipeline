import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Inbox, User } from 'lucide-react'
import { Column } from './Column'
import { TaskCard } from './TaskCard'
import { TaskDetailModal } from './TaskDetailModal'
import { uk } from '../../lib/i18n'
import type { Task, Designer } from '../../types'

interface Props {
  tasks: Task[]
  designers: Designer[]
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onDeleteTask: (id: string) => void
}

export function KanbanBoard({ tasks, designers, onUpdateTask, onDeleteTask }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const backlogTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'backlog' || (!t.assigned_to && t.status !== 'done'))
        .sort((a, b) => b.complexity - a.complexity),
    [tasks]
  )

  const getDesignerTasks = useCallback(
    (designerId: string) =>
      tasks.filter(
        (t) => t.assigned_to === designerId && t.status !== 'done'
      ),
    [tasks]
  )

  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === 'done'),
    [tasks]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    if (overId === 'backlog') {
      onUpdateTask(taskId, { assigned_to: null, status: 'backlog' })
    } else if (overId === 'done') {
      onUpdateTask(taskId, { status: 'done' })
    } else {
      const designer = designers.find((d) => d.id === overId)
      if (designer) {
        onUpdateTask(taskId, { assigned_to: designer.id, status: 'assigned' })
      }
    }
  }

  const handleTaskUpdate = (id: string, updates: Partial<Task>) => {
    onUpdateTask(id, updates)
    if (selectedTask?.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null))
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto p-4 pb-8">
          {/* Backlog */}
          <Column
            id="backlog"
            title={uk.backlog}
            tasks={backlogTasks}
            onTaskClick={setSelectedTask}
            icon={<Inbox size={16} className="text-indigo-500" />}
            accent="bg-indigo-100 text-indigo-600"
          />

          {/* Designer columns */}
          {designers.map((designer) => (
            <Column
              key={designer.id}
              id={designer.id}
              title={designer.name}
              tasks={getDesignerTasks(designer.id)}
              onTaskClick={setSelectedTask}
              icon={
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-600">
                  {designer.name.split(' ').map((w) => w[0]).join('')}
                </div>
              }
            />
          ))}

          {/* Done */}
          <Column
            id="done"
            title={uk.done}
            tasks={doneTasks}
            onTaskClick={setSelectedTask}
            icon={<User size={16} className="text-green-500" />}
            accent="bg-green-100 text-green-600"
          />
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} onClick={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          designers={designers}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={(id) => { onDeleteTask(id); setSelectedTask(null) }}
        />
      )}
    </>
  )
}
