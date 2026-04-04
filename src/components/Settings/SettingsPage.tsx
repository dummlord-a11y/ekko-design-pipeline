import { useState, useEffect } from 'react'
import {
  Settings,
  Mail,
  Brain,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Key,
  Save,
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
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form values
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  useEffect(() => {
    fetchSettings()

    // Check URL params for OAuth callback messages
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
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch {
      // Settings not available yet
    } finally {
      setLoading(false)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    setSaving(key)
    setMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMessage({ type: 'success', text: `${key} saved!` })
      await fetchSettings()
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(null)
    }
  }

  const connectGmail = async () => {
    setMessage(null)
    try {
      const res = await fetch('/api/auth-google-start', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to start OAuth' })
    }
  }

  const isGoogleConnected = !!settings.google_refresh_token
  const googleEmail = settings.google_email?.value
  const connectedAt = settings.google_connected_at?.value

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/5 bg-[#0c0c12] px-6 py-3">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <Settings size={18} className="text-indigo-400" />
        <h1 className="text-base font-bold text-zinc-100">Налаштування</h1>
      </header>

      <div className="mx-auto max-w-2xl p-6 space-y-6">
        {/* Status message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Google Gmail Section */}
        <section className="rounded-xl border border-white/5 bg-[#111118] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Mail size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Google Gmail</h2>
              <p className="text-xs text-zinc-500">
                Підключіть Gmail для автоматичного збору запитів на дизайн
              </p>
            </div>
            <div className="ml-auto">
              {isGoogleConnected ? (
                <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                  <CheckCircle size={12} />
                  Підключено
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-3 py-1 text-xs font-medium text-zinc-500">
                  <XCircle size={12} />
                  Не підключено
                </span>
              )}
            </div>
          </div>

          {isGoogleConnected && googleEmail && (
            <div className="rounded-lg bg-green-500/5 border border-green-500/10 px-4 py-2 text-xs text-zinc-400">
              Підключено: <span className="text-zinc-200">{googleEmail}</span>
              {connectedAt && (
                <span className="ml-2 text-zinc-600">
                  ({new Date(connectedAt).toLocaleString('uk-UA')})
                </span>
              )}
            </div>
          )}

          {/* Step 1: Google credentials */}
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 leading-relaxed">
              1. Створіть OAuth 2.0 Client у{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                Google Cloud Console <ExternalLink size={10} />
              </a>
              {' '}(тип: Web Application). Додайте redirect URI:{' '}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-indigo-300">
                {window.location.origin}/api/auth-google-callback
              </code>
            </p>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Google Client ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder={settings.google_client_id?.value || 'xxx.apps.googleusercontent.com'}
                    className="flex-1 rounded-lg border border-white/10 bg-[#0e0e15] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500/40"
                  />
                  <button
                    onClick={() => saveSetting('google_client_id', googleClientId)}
                    disabled={!googleClientId || saving === 'google_client_id'}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40"
                  >
                    {saving === 'google_client_id' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Зберегти
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Google Client Secret
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    placeholder={settings.google_client_secret?.value || '••••••'}
                    className="flex-1 rounded-lg border border-white/10 bg-[#0e0e15] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500/40"
                  />
                  <button
                    onClick={() => saveSetting('google_client_secret', googleClientSecret)}
                    disabled={!googleClientSecret || saving === 'google_client_secret'}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40"
                  >
                    {saving === 'google_client_secret' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Зберегти
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Connect */}
            <div className="pt-2">
              <p className="mb-2 text-xs text-zinc-500">
                2. Після збереження Client ID та Secret, натисніть кнопку:
              </p>
              <button
                onClick={connectGmail}
                className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30"
              >
                <Mail size={16} />
                {isGoogleConnected ? 'Перепідключити Gmail' : 'Підключити Gmail'}
              </button>
            </div>
          </div>
        </section>

        {/* Anthropic API Key Section */}
        <section className="rounded-xl border border-white/5 bg-[#111118] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Brain size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Claude API (Anthropic)</h2>
              <p className="text-xs text-zinc-500">
                API ключ для AI аналізу складності завдань
              </p>
            </div>
            <div className="ml-auto">
              {settings.anthropic_api_key ? (
                <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                  <CheckCircle size={12} />
                  Налаштовано
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-3 py-1 text-xs font-medium text-zinc-500">
                  <Key size={12} />
                  Не налаштовано
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Anthropic API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={settings.anthropic_api_key?.value || 'sk-ant-api03-...'}
                className="flex-1 rounded-lg border border-white/10 bg-[#0e0e15] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500/40"
              />
              <button
                onClick={() => saveSetting('anthropic_api_key', anthropicKey)}
                disabled={!anthropicKey || saving === 'anthropic_api_key'}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40"
              >
                {saving === 'anthropic_api_key' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Зберегти
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Отримайте ключ на{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">
                console.anthropic.com <ExternalLink size={9} />
              </a>
            </p>
          </div>
        </section>

        {/* Info */}
        <div className="rounded-lg border border-white/5 bg-[#0e0e15] p-4 text-xs text-zinc-600 leading-relaxed">
          <p className="font-medium text-zinc-500 mb-1">Як це працює:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Система кожні 2 години перевіряє Gmail на нові запити на дизайн</li>
            <li>Claude AI аналізує лист і оцінює складність від 1 до 5</li>
            <li>Завдання автоматично з'являються у беклозі, відсортовані за складністю</li>
            <li>Дизайнери перетягують завдання з беклогу у свою колонку</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
