import { useState, useMemo, useEffect } from 'react'
import { Header } from './components/Layout/Header'
import { KanbanBoard } from './components/Board/KanbanBoard'
import { SettingsPage } from './components/Settings/SettingsPage'
import { useTasks } from './hooks/useTasks'
import { useDesigners } from './hooks/useDesigners'
import { Loader2 } from 'lucide-react'

type Page = 'dashboard' | 'settings'

export default function App() {
  const { tasks, loading, error, refetch, updateTask } = useTasks()
  const { designers } = useDesigners()
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState<Page>('dashboard')

  // Handle /settings path from OAuth callback redirect
  useEffect(() => {
    if (window.location.pathname === '/settings') {
      setPage('settings')
    }
  }, [])

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks
    const q = searchQuery.toLowerCase()
    return tasks.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.sender.toLowerCase().includes(q) ||
        t.ai_summary?.toLowerCase().includes(q) ||
        t.body_preview?.toLowerCase().includes(q)
    )
  }, [tasks, searchQuery])

  const handleSyncComplete = () => {
    setLastSync(new Date().toISOString())
    refetch()
  }

  if (page === 'settings') {
    return (
      <SettingsPage
        onBack={() => {
          setPage('dashboard')
          window.history.pushState({}, '', '/')
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-red-500">{error}</p>
        <button
          onClick={refetch}
          className="rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-100"
        >
          Спробувати знову
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Header
        lastSync={lastSync}
        onSyncComplete={handleSyncComplete}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsClick={() => {
          setPage('settings')
          window.history.pushState({}, '', '/settings')
        }}
      />
      <main className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={filteredTasks}
          designers={designers}
          onUpdateTask={updateTask}
        />
      </main>
    </div>
  )
}
