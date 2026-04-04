import { useState, useMemo } from 'react'
import { Header } from './components/Layout/Header'
import { KanbanBoard } from './components/Board/KanbanBoard'
import { useTasks } from './hooks/useTasks'
import { useDesigners } from './hooks/useDesigners'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { tasks, loading, error, refetch, updateTask } = useTasks()
  const { designers } = useDesigners()
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f]">
        <p className="text-red-400">{error}</p>
        <button
          onClick={refetch}
          className="rounded-lg bg-indigo-600/20 px-4 py-2 text-sm text-indigo-300 hover:bg-indigo-600/30"
        >
          Спробувати знову
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0f]">
      <Header
        lastSync={lastSync}
        onSyncComplete={handleSyncComplete}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
