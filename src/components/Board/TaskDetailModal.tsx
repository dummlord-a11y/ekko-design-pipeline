import { useState, useEffect } from 'react'
import {
  X, Paperclip, Brain, Clock, Tag, User, ChevronDown,
  AlertTriangle, Wrench, CheckSquare, Trash2, FileText, Image, Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { ComplexityBadge } from '../common/ComplexityBadge'
import { Avatar } from '../common/Avatar'
import { uk } from '../../lib/i18n'
import { api } from '../../lib/api'
import mammoth from 'mammoth'
import type { Task, Designer, TaskStatus, Attachment } from '../../types'

interface Props {
  task: Task
  designers: Designer[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
}

const statusOptions: TaskStatus[] = ['backlog', 'assigned', 'in_progress', 'review', 'done']

const DOCX_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
const TEXT_TYPES = ['text/plain', 'text/csv', 'text/html', 'text/xml']

function getAttachmentIcon(mime: string, filename: string) {
  if (mime.startsWith('image/')) return <Image size={12} className="text-blue-500" />
  if (mime === 'application/pdf') return <FileText size={12} className="text-red-500" />
  if (DOCX_TYPES.includes(mime) || filename.match(/\.docx?$/i)) return <FileText size={12} className="text-blue-600" />
  if (TEXT_TYPES.includes(mime) || filename.match(/\.(txt|csv)$/i)) return <FileText size={12} className="text-gray-500" />
  return <Paperclip size={12} className="text-gray-400" />
}

function canPreview(att: Attachment) {
  const mime = att.mime_type
  const name = att.filename.toLowerCase()
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    DOCX_TYPES.includes(mime) ||
    TEXT_TYPES.includes(mime) ||
    name.endsWith('.docx') || name.endsWith('.doc') ||
    name.endsWith('.txt') || name.endsWith('.csv')
  )
}

function DocxViewer({ base64, filename }: { base64: string; filename: string }) {
  const [html, setHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const isOldDoc = filename.toLowerCase().endsWith('.doc') && !filename.toLowerCase().endsWith('.docx')

  useEffect(() => {
    if (isOldDoc) {
      // .doc format not supported by mammoth — show download option
      setError('old_doc')
      return
    }
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
      .then(result => setHtml(result.value))
      .catch(() => setError('parse_failed'))
  }, [base64, isOldDoc])

  const handleDownload = () => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <FileText size={40} className="text-gray-300" />
        <p className="text-sm text-gray-500">
          {error === 'old_doc'
            ? 'Формат .doc не підтримує попередній перегляд'
            : 'Не вдалося відкрити документ'}
        </p>
        <button
          onClick={handleDownload}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Завантажити файл
        </button>
      </div>
    )
  }

  if (!html) return <p className="text-sm text-gray-400 text-center py-8">Завантаження...</p>

  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function TextViewer({ base64 }: { base64: string }) {
  let text: string
  try {
    text = atob(base64)
    // Try decoding as UTF-8
    text = new TextDecoder('utf-8').decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)))
  } catch {
    text = atob(base64)
  }

  return (
    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
      {text}
    </pre>
  )
}

export function TaskDetailModal({ task, designers, onClose, onUpdate, onDelete }: Props) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const [previewAtt, setPreviewAtt] = useState<{ filename: string; data: string; mime_type: string } | null>(null)
  const [loadingAtt, setLoadingAtt] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const analysis = task.ai_analysis

  const handlePreview = async (att: Attachment) => {
    setLoadingAtt(att.id)
    try {
      const res = await api.getTaskEmail(task.id)
      const found = res.attachments.find(
        (a: { filename: string }) => a.filename === att.filename
      )
      if (found?.data) {
        setPreviewAtt({
          filename: found.filename,
          data: found.data,
          mime_type: found.mime_type,
        })
      }
    } catch {
      // failed to load
    } finally {
      setLoadingAtt(null)
    }
  }

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  // Attachment preview overlay
  if (previewAtt) {
    const isImage = previewAtt.mime_type.startsWith('image/')
    const isPdf = previewAtt.mime_type === 'application/pdf'
    const isDocx = DOCX_TYPES.includes(previewAtt.mime_type) || previewAtt.filename.match(/\.docx?$/i)
    const isText = TEXT_TYPES.includes(previewAtt.mime_type) || previewAtt.filename.match(/\.(txt|csv)$/i)

    const b64 = previewAtt.data.replace(/-/g, '+').replace(/_/g, '/')
    const dataUrl = `data:${previewAtt.mime_type};base64,${b64}`

    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={() => setPreviewAtt(null)}
      >
        <div
          className="relative max-h-[90vh] max-w-4xl w-full rounded-2xl bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-medium text-gray-700 truncate">{previewAtt.filename}</span>
            <button
              onClick={() => setPreviewAtt(null)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-auto max-h-[80vh] bg-gray-50 p-4">
            {isImage && (
              <div className="flex items-center justify-center">
                <img src={dataUrl} alt={previewAtt.filename} className="max-w-full max-h-[75vh] object-contain" />
              </div>
            )}
            {isPdf && (
              <iframe src={dataUrl} className="w-full h-[75vh]" title={previewAtt.filename} />
            )}
            {isDocx && <DocxViewer base64={b64} filename={previewAtt.filename} />}
            {isText && <TextViewer base64={b64} />}
          </div>
        </div>
      </div>
    )
  }

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
            <h2 className="text-lg font-semibold text-gray-900">{task.subject}</h2>
            <p className="mt-1 text-sm text-gray-400">
              {task.sender} &middot;{' '}
              {format(new Date(task.created_at), 'dd MMM yyyy, HH:mm', { locale: ukLocale })}
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
          {/* Main content */}
          <div className="md:col-span-2 space-y-4">
            {/* Email body */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Tag size={14} /> Зміст листа
              </h3>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                {task.full_body || task.body_preview}
              </div>
            </div>

            {/* Attachments with preview */}
            {task.attachments && task.attachments.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Paperclip size={14} /> {uk.attachments} ({task.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => canPreview(att) && handlePreview(att)}
                      disabled={!canPreview(att) || loadingAtt === att.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        canPreview(att)
                          ? 'border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-100 cursor-pointer'
                          : 'border-gray-100 bg-gray-50 text-gray-500 cursor-default'
                      }`}
                    >
                      {loadingAtt === att.id ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      ) : (
                        getAttachmentIcon(att.mime_type, att.filename)
                      )}
                      <span className="max-w-[160px] truncate">{att.filename}</span>
                      {canPreview(att) && <Eye size={11} className="text-blue-400" />}
                      <span className="text-gray-300">{(att.size_bytes / 1024).toFixed(0)}KB</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {analysis && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Brain size={14} /> {uk.aiAnalysis}
                </h3>
                <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
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
                        <Clock size={11} /> ~{analysis.estimated_hours} год
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{analysis.summary_uk}</p>
                  {analysis.key_requirements?.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">{uk.requirements}:</p>
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
                        <span className="font-medium">{uk.reasoning}:</span> {analysis.complexity_reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
            {/* Status */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-500">{uk.status}</label>
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
                    <button key={s} onClick={() => { onUpdate(task.id, { status: s }); setShowStatusDropdown(false) }}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50">
                      {uk.statuses[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-500">{uk.assignTo}</label>
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
                  <button onClick={() => { onUpdate(task.id, { assigned_to: null, status: 'backlog' }); setShowAssignDropdown(false) }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-50">
                    <User size={14} className="mr-2 inline" /> Не призначено
                  </button>
                  {designers.map((d) => (
                    <button key={d.id} onClick={() => { onUpdate(task.id, { assigned_to: d.id, status: 'assigned' }); setShowAssignDropdown(false) }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50">
                      <Avatar name={d.name} url={d.avatar_url} size="sm" /> {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mark done */}
            {task.status !== 'done' && (
              <button onClick={() => onUpdate(task.id, { status: 'done' })}
                className="w-full rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100">
                {uk.markDone}
              </button>
            )}

            {/* Delete */}
            <div className="border-t border-gray-100 pt-3">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-50">
                  <Trash2 size={14} /> Видалити завдання
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-500 text-center">Видалити назавжди?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
                      Скасувати
                    </button>
                    <button onClick={handleDelete}
                      className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600">
                      Видалити
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
