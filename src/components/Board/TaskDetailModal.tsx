import { useState } from 'react'
import { X, Paperclip, Brain, Clock, Tag, User, ChevronDown, AlertTriangle, Wrench, CheckSquare } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div className="flex-1 pr-4">
            <div className="mb-2 flex items-center gap-2">
              <ComplexityBadge level={task.complexity} />
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {uk.categories[task.category] || task.category}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {task.subject}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {task.sender} &middot;{' '}
              {format(new Date(task.created_at), 'dd MMM yyyy, HH:mm', {
                locale: ukLocale,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-3">
          {/* Email body */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Tag size={14} /> Зміст листа
              </h3>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                {task.full_body || task.body_preview}
              </div>
            </div>

            {task.attachments && task.attachments.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Paperclip size={14} /> {uk.attachments} ({task.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500"
                    >
                      <Paperclip size={12} />
                      <span className="max-w-[200px] truncate">{att.filename}</span>
                      <span className="text-gray-300">
                        {(att.size_bytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Brain size={14} /> {uk.aiAnalysis}
                </h3>
                <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                  {/* Priority + hours */}
                  <div className="flex items-center gap-3">
                    {analysis.priority && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
                        analysis.priority === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                        analysis.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        analysis.priority === 'medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {analysis.priority === 'critical' && <AlertTriangle size={10} />}
                        {analysis.priority === 'critical' ? 'Критично' :
                         analysis.priority === 'high' ? 'Важливо' :
                         analysis.priority === 'medium' ? 'Стандартно' : 'Не терміново'}
                      </span>
                    )}
                    {analysis.estimated_hours > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} />
                        ~{analysis.estimated_hours} год
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700">{analysis.summary_uk}</p>

                  {analysis.key_requirements?.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">
                        {uk.requirements}:
                      </p>
                      <ul className="space-y-1">
                        {analysis.key_requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.complexity_reasoning && (
                    <div className="border-t border-indigo-100 pt-2">
                      <p className="text-[11px] text-gray-400">
                        <span className="font-medium">{uk.reasoning}:</span>{' '}
                        {analysis.complexity_reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical notes */}
            {analysis?.technical_notes && analysis.technical_notes.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Wrench size={14} /> Технічні зауваження
                </h3>
                <ul className="space-y-1.5 rounded-lg border border-amber-100 bg-amber-50 p-3">
                  {analysis.technical_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-amber-400" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prepress checklist */}
            {analysis?.prepress_checklist && analysis.prepress_checklist.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <CheckSquare size={14} /> Допечатна підготовка
                </h3>
                <ul className="space-y-1.5 rounded-lg border border-green-100 bg-green-50 p-3">
                  {analysis.prepress_checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="mt-0.5 text-green-400">☐</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar controls */}
          <div className="space-y-4">
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {uk.status}
              </label>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-300"
              >
                {uk.statuses[task.status]}
                <ChevronDown size={14} />
              </button>
              {showStatusDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onUpdate(task.id, { status: s })
                        setShowStatusDropdown(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {uk.statuses[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {uk.assignTo}
              </label>
              <button
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-300"
              >
                {task.designer ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={task.designer.name} url={task.designer.avatar_url} size="sm" />
                    {task.designer.name}
                  </span>
                ) : (
                  <span className="text-gray-400">Не призначено</span>
                )}
                <ChevronDown size={14} />
              </button>
              {showAssignDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      onUpdate(task.id, { assigned_to: null, status: 'backlog' })
                      setShowAssignDropdown(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-50"
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
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Avatar name={d.name} url={d.avatar_url} size="sm" />
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {task.status !== 'done' && (
              <button
                onClick={() => onUpdate(task.id, { status: 'done' })}
                className="w-full rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
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
