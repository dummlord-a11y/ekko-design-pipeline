import { useState } from 'react'
import { RefreshCw, Search, Settings } from 'lucide-react'
import { uk } from '../../lib/i18n'

interface Props {
  lastSync: string | null
  onSyncComplete: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onSettingsClick: () => void
}

export function Header({ lastSync, onSyncComplete, searchQuery, onSearchChange, onSettingsClick }: Props) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const result = await fetch('/api/sync-gmail', {
        method: 'POST',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (result.ok) {
        const data = await result.json()
        console.log('Sync result:', data)
      }
    } catch {
      console.log('Sync request timed out — server continues processing')
    }

    onSyncComplete()
    setSyncing(false)
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <img src="/ekko-logo.png" alt="SP-EKKO" className="h-9" />
        <div>
          {lastSync && (
            <p className="text-[11px] text-gray-400">
              {uk.lastSync}: {new Date(lastSync).toLocaleString('uk-UA')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={uk.search}
            className="h-8 w-56 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-indigo-300 focus:bg-white"
          />
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? uk.syncing : uk.syncGmail}
        </button>

        <button
          onClick={onSettingsClick}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Налаштування"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
