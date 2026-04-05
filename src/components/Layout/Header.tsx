import { useState } from 'react'
import { RefreshCw, Printer, Search, Settings } from 'lucide-react'
import { api } from '../../lib/api'
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
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await api.syncGmail()
      console.log('Sync result:', result)
      onSyncComplete()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed'
      if (msg.includes('Inactivity Timeout') || msg.includes('504')) {
        setSyncError('Синхронізація працює у фоні. Оновіть сторінку через хвилину.')
      } else {
        setSyncError(msg)
      }
      // Auto-dismiss after 5s
      setTimeout(() => setSyncError(null), 5000)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
          <Printer size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 tracking-tight">
            {uk.appTitle}
          </h1>
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

      {syncError && (
        <div className="absolute right-6 top-14 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {syncError}
        </div>
      )}
    </header>
  )
}
