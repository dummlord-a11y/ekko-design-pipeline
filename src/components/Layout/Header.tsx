import { useState } from 'react'
import { RefreshCw, Printer, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { uk } from '../../lib/i18n'

interface Props {
  lastSync: string | null
  onSyncComplete: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function Header({ lastSync, onSyncComplete, searchQuery, onSearchChange }: Props) {
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
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-[#0c0c12] px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20">
          <Printer size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-zinc-100 tracking-tight">
            {uk.appTitle}
          </h1>
          {lastSync && (
            <p className="text-[11px] text-zinc-600">
              {uk.lastSync}: {new Date(lastSync).toLocaleString('uk-UA')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={uk.search}
            className="h-8 w-56 rounded-lg border border-white/10 bg-[#111118] pl-8 pr-3 text-xs text-zinc-300 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500/40"
          />
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-indigo-600/20 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-600/30 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={syncing ? 'animate-spin' : ''}
          />
          {syncing ? uk.syncing : uk.syncGmail}
        </button>
      </div>

      {syncError && (
        <div className="absolute right-6 top-14 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {syncError}
        </div>
      )}
    </header>
  )
}
