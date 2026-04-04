const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API error ${res.status}: ${error}`)
  }
  return res.json()
}

export const api = {
  syncGmail: () => request<{ processed: number; errors: string[] }>('/sync-gmail', { method: 'POST' }),

  updateTask: (id: string, data: Record<string, unknown>) =>
    request(`/tasks`, {
      method: 'PATCH',
      body: JSON.stringify({ id, ...data }),
    }),

  getTaskEmail: (id: string) =>
    request<{ body: string; attachments: Array<{ filename: string; data: string; mime_type: string }> }>(
      `/task-email?id=${id}`
    ),
}
