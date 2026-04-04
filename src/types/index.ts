export type TaskStatus = 'backlog' | 'assigned' | 'in_progress' | 'review' | 'done'

export type TaskCategory =
  | 'label_design'
  | 'packaging'
  | 'sticker'
  | 'banner'
  | 'brochure'
  | 'other'

export interface Task {
  id: string
  gmail_message_id: string
  gmail_thread_id: string | null
  sender: string
  sender_email: string
  subject: string
  body_preview: string
  full_body: string
  complexity: number
  category: TaskCategory
  ai_summary: string
  ai_analysis: AiAnalysis | null
  status: TaskStatus
  assigned_to: string | null
  sort_order: number
  created_at: string
  updated_at: string
  attachments?: Attachment[]
  designer?: Designer
}

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export interface AiAnalysis {
  complexity: number
  priority: TaskPriority
  category: string
  summary_uk: string
  complexity_reasoning: string
  estimated_hours: number
  key_requirements: string[]
  technical_notes: string[]
  prepress_checklist: string[]
}

export interface Designer {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string
  created_at: string
}

export interface Attachment {
  id: string
  task_id: string
  filename: string
  mime_type: string
  size_bytes: number
  gmail_attachment_id: string
  created_at: string
}

export interface SyncResult {
  processed: number
  errors: string[]
  timestamp: string
}
