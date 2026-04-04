import { useState } from 'react'
import { X, Paperclip, Brain, Clock, Tag, User, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { ComplexityBadge } from '../common/ComplexityBadge'
import { Avatar } from '../common/Avatar'
import { uk } from '../../lib/i18n'
import type { Task, Designer, TaskStatus } from '../../types'

interface Props {
  task: Task
  designers: Designer[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => void
}

const statusOptions: TaskStatus[] = ['backlog', 'assigned', 'in_progress', 'review', 'done']

export function TaskDetailModal({ task, designers, onClose, onUpdate }: Props) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)

  const analysis = task.ai_analysis

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/5 p-5">
          <div className="flex-1 pr-4">
            <div className="mb-2 flex items-center gap-2">
              <ComplexityBadge level={task.complexity} />
              <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                {uk.categories[task.category] || task.category}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {task.subject}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {task.sender} &middot;{' '}
              {format(new Date(task.created_at), 'dd MMM yyyy, HH:mm', {
                locale: ukLocale,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-3">
          {/* Email body */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Tag size={14} /> Зміст листа
              </h3>
              <div className="rounded-lg border border-white/5 bg-[#0e0e15] p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-80 overflow-y-auto">
                {task.full_body || task.body_preview}
              </div>
            </div>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <Paperclip size={14} /> {uk.attachments} ({task.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#0e0e15] px-3 py-2 text-xs text-zinc-400"
                    >
                      <Paperclip size={12} />
                      <span className="max-w-[200px] truncate">{att.filename}</span>
                      <span className="text-zinc-600">
                        {(att.size_bytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {analysis && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <Brain size={14} /> {uk.aiAnalysis}
                </h3>
                <div className="space-y-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <p className="text-sm text-zinc-300">{analysis.summary_uk}</p>

                  {analysis.estimated_hours > 0 && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock size={12} />
                      {uk.estimatedHours}: ~{analysis.estimated_hours} год
                    </div>
                  )}

                  {analysis.key_requirements?.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-zinc-400">
                        {uk.requirements}:
                      </p>
                      <ul className="space-y-1">
                        {analysis.key_requirements.map((req, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-zinc-400"
                          >
                            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.complexity_reasoning && (
                    <div className="border-t border-indigo-500/10 pt-2">
                      <p className="text-[11px] text-zinc-500">
                        <span className="font-medium">{uk.reasoning}:</span>{' '}
                        {analysis.complexity_reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar controls */}
          <div className="space-y-4">
            {/* Status */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                {uk.status}
              </label>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#0e0e15] px-3 py-2 text-sm text-zinc-300 hover:border-white/20"
              >
                {uk.statuses[task.status]}
                <ChevronDown size={14} />
              </button>
              {showStatusDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a24] py-1 shadow-xl">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onUpdate(task.id, { status: s })
                        setShowStatusDropdown(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-white/5"
                    >
                      {uk.statuses[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                {uk.assignTo}
              </label>
              <button
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#0e0e15] px-3 py-2 text-sm text-zinc-300 hover:border-white/20"
              >
                {task.designer ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={task.designer.name} url={task.designer.avatar_url} size="sm" />
                    {task.designer.name}
                  </span>
                ) : (
                  <span className="text-zinc-500">Не призначено</span>
                )}
                <ChevronDown size={14} />
              </button>
              {showAssignDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a24] py-1 shadow-xl">
                  <button
                    onClick={() => {
                      onUpdate(task.id, { assigned_to: null, status: 'backlog' })
                      setShowAssignDropdown(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-zinc-400 hover:bg-white/5"
                  >
                    <User size={14} className="mr-2 inline" />
                    Не призначено
                  </button>
                  {designers.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        onUpdate(task.id, { assigned_to: d.id, status: 'assigned' })
                        setShowAssignDropdown(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-white/5"
                    >
                      <Avatar name={d.name} url={d.avatar_url} size="sm" />
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            {task.status !== 'done' && (
              <button
                onClick={() => onUpdate(task.id, { status: 'done' })}
                className="w-full rounded-lg bg-green-600/20 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-600/30"
              >
                {uk.markDone}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
