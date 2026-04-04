import { useState, useEffect } from 'react'
import {
  Settings,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'

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

  useEffect(() => {
    fetchSettings()

    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    const msg = params.get('message')
    if (status && msg) {
      setMessage({ type: status as 'success' | 'error', text: msg })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) setSettings(await res.json())
    } catch {
      // not available yet
    } finally {
      setLoading(false)
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
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to start OAuth' })
      setConnecting(false)
    }
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
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </button>
        <Settings size={18} className="text-indigo-500" />
        <h1 className="text-base font-bold text-gray-900">Налаштування</h1>
      </header>

      <div className="mx-auto max-w-lg p-6 space-y-6">
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Gmail Connection */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <Mail size={22} className="text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Google Gmail</h2>
              <p className="text-xs text-gray-500">
                Підключіть пошту для збору запитів на дизайн
              </p>
            </div>
            {isGoogleConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 border border-green-200">
                <CheckCircle size={12} />
                Підключено
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                <XCircle size={12} />
                Не підключено
              </span>
            )}
          </div>

          {isGoogleConnected && googleEmail && (
            <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-2.5 text-sm text-gray-700">
              <span className="font-medium">{googleEmail}</span>
              {connectedAt && (
                <span className="ml-2 text-xs text-gray-400">
                  з {new Date(connectedAt).toLocaleDateString('uk-UA')}
                </span>
              )}
            </div>
          )}

          <button
            onClick={connectGmail}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
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
