import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Mail, CheckCircle, XCircle, Loader2, ArrowLeft,
  Users, Plus, Trash2, Pencil, Check, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Designer } from '../../types'

interface SettingsData {
  [key: string]: { value: string; updated_at: string }
}

interface Props {
  onBack: () => void
}

export function SettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Domain whitelist
  const [domains, setDomains] = useState<string[]>([])
  const [newDomain, setNewDomain] = useState('')

  // Designer management
  const [designers, setDesigners] = useState<Designer[]>([])
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const fetchDesigners = useCallback(async () => {
    const { data } = await supabase.from('designers').select('*').order('name')
    setDesigners(data || [])
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchDesigners()

    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    const msg = params.get('message')
    if (status && msg) {
      setMessage({ type: status as 'success' | 'error', text: msg })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchDesigners])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        // Load domains
        if (data.allowed_domains?.value) {
          try { setDomains(JSON.parse(data.allowed_domains.value)) } catch { /* */ }
        }
      }
    } catch { /* */ } finally {
      setLoading(false)
    }
  }

  const saveDomains = async (updatedDomains: string[]) => {
    setDomains(updatedDomains)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'allowed_domains', value: JSON.stringify(updatedDomains) }),
      })
    } catch { /* */ }
  }

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!d || domains.includes(d)) return
    saveDomains([...domains, d])
    setNewDomain('')
  }

  const removeDomain = (domain: string) => {
    saveDomains(domains.filter(d => d !== domain))
  }

  const disconnectGmail = async () => {
    setMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect_gmail' }),
      })
      if (!res.ok) throw new Error('Failed to disconnect')
      setMessage({ type: 'success', text: 'Gmail відключено' })
      await fetchSettings()
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' })
    }
  }

  const disconnectDesignerGmail = async (designerId: string) => {
    setMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect_designer_gmail', designerId }),
      })
      if (!res.ok) throw new Error('Failed to disconnect')
      setMessage({ type: 'success', text: 'Gmail дизайнера відключено' })
      await fetchDesigners()
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' })
    }
  }

  const connectDesignerGmail = async (designerId: string) => {
    setMessage(null)
    try {
      const res = await fetch('/api/auth-google-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designerId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Connection failed' }))
        throw new Error(err.error || 'Failed to start OAuth')
      }
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' })
    }
  }

  const connectGmail = async () => {
    setConnecting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth-google-start', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Connection failed' }))
        throw new Error(err.error || 'Failed to start OAuth')
      }
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' })
      setConnecting(false)
    }
  }

  const addDesigner = async () => {
    if (!newName.trim()) return
    const { error } = await supabase.from('designers').insert({
      name: newName.trim(),
      email: newEmail.trim() || `${newName.trim().toLowerCase().replace(/\s+/g, '.')}@team.local`,
      role: 'Дизайнер',
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setNewName('')
    setNewEmail('')
    fetchDesigners()
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    const { error } = await supabase.from('designers').update({
      name: editName.trim(),
      email: editEmail.trim(),
    }).eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setEditingId(null)
    fetchDesigners()
  }

  const removeDesigner = async (id: string) => {
    // Unassign tasks first
    await supabase.from('tasks').update({ assigned_to: null, status: 'backlog' }).eq('assigned_to', id)
    await supabase.from('designers').delete().eq('id', id)
    fetchDesigners()
  }

  const startEdit = (d: Designer) => {
    setEditingId(d.id)
    setEditName(d.name)
    setEditEmail(d.email)
  }

  const isGoogleConnected = !!settings.google_refresh_token
  const googleEmail = settings.google_email?.value
  const connectedAt = settings.google_connected_at?.value

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
        <button onClick={onBack} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft size={18} />
        </button>
        <Settings size={18} className="text-indigo-500" />
        <h1 className="text-base font-bold text-gray-900">Налаштування</h1>
      </header>

      <div className="mx-auto max-w-lg p-6 space-y-6">
        {message && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Gmail */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <Mail size={22} className="text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Google Gmail</h2>
              <p className="text-xs text-gray-500">Підключіть пошту для збору запитів</p>
            </div>
            {isGoogleConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 border border-green-200">
                <CheckCircle size={12} /> Підключено
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                <XCircle size={12} /> Не підключено
              </span>
            )}
          </div>
          {isGoogleConnected && googleEmail && (
            <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-4 py-2.5">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{googleEmail}</span>
                {connectedAt && (
                  <span className="ml-2 text-xs text-gray-400">з {new Date(connectedAt).toLocaleDateString('uk-UA')}</span>
                )}
              </div>
              <button onClick={disconnectGmail}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                Відключити
              </button>
            </div>
          )}
          <button onClick={connectGmail} disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50">
            {connecting ? <Loader2 size={18} className="animate-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {isGoogleConnected ? 'Перепідключити Gmail' : 'Увійти через Google'}
          </button>
        </section>

        {/* Domain whitelist */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Mail size={22} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Дозволені домени</h2>
              <p className="text-xs text-gray-500">
                {domains.length > 0
                  ? 'Обробляються тільки листи з цих доменів'
                  : 'Обробляються листи з усіх доменів'}
              </p>
            </div>
            {domains.length > 0 && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                {domains.length} {domains.length === 1 ? 'домен' : 'доменів'}
              </span>
            )}
          </div>

          {domains.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {domains.map(d => (
                <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 pl-3 pr-1.5 py-1 text-xs text-gray-700">
                  @{d}
                  <button onClick={() => removeDomain(d)}
                    className="rounded-full p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
              placeholder="sp-ekko.com.ua"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-300"
              onKeyDown={(e) => e.key === 'Enter' && addDomain()} />
            <button onClick={addDomain} disabled={!newDomain.trim()}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40 transition-colors">
              <Plus size={16} />
            </button>
          </div>

          {domains.length === 0 && (
            <p className="text-[11px] text-gray-400">
              Без обмежень — система обробляє листи з будь-якого домену. Додайте домен щоб обмежити.
            </p>
          )}
        </section>

        {/* Designers */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
              <Users size={22} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Команда дизайнерів</h2>
              <p className="text-xs text-gray-500">Керуйте дизайнерами та їх поштами</p>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {designers.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                {editingId === d.id ? (
                  <>
                    <div className="flex-1 space-y-1.5">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-indigo-300"
                        placeholder="Ім'я" />
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 outline-none focus:border-indigo-300"
                        placeholder="email@example.com" />
                    </div>
                    <button onClick={() => saveEdit(d.id)} className="rounded p-1 text-green-500 hover:bg-green-50"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-600">
                      {d.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{d.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{d.email}</p>
                      {d.gmail_connected_at && (
                        <p className="text-[10px] text-green-500 flex items-center gap-1 mt-0.5">
                          <CheckCircle size={9} /> Gmail підключено
                        </p>
                      )}
                    </div>
                    {!d.gmail_refresh_token ? (
                      <button onClick={() => connectDesignerGmail(d.id)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 flex items-center gap-1">
                        <Mail size={11} /> Gmail
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => connectDesignerGmail(d.id)}
                          className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[11px] text-green-600 hover:bg-green-100 flex items-center gap-1"
                          title="Перепідключити">
                          <CheckCircle size={11} /> Gmail
                        </button>
                        <button onClick={() => disconnectDesignerGmail(d.id)}
                          className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50"
                          title="Відключити Gmail">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <button onClick={() => startEdit(d)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil size={14} /></button>
                    <button onClick={() => removeDesigner(d.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ім'я дизайнера"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-300"
                onKeyDown={(e) => e.key === 'Enter' && addDesigner()} />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com (необов'язково)"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 outline-none focus:border-indigo-300" />
            </div>
            <button onClick={addDesigner} disabled={!newName.trim()}
              className="self-start rounded-lg bg-indigo-600 p-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40">
              <Plus size={18} />
            </button>
          </div>
        </section>

        {/* Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500 leading-relaxed">
          <p className="font-medium text-gray-700 mb-1.5">Як це працює:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Підключіть Gmail — система автоматично зчитує запити на дизайн</li>
            <li>Кожні 2 години перевіряються нові листи</li>
            <li>AI аналізує лист і оцінює складність від 1 до 5</li>
            <li>Завдання з'являються у беклозі, відсортовані за складністю</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
