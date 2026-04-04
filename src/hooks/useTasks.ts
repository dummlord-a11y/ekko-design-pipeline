import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Task } from '../types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*, designer:designers(*), attachments(*)')
        .order('complexity', { ascending: false })
        .order('created_at', { ascending: false })

      if (err) throw err
      setTasks(data || [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      )

      const { error: err } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)

      if (err) {
        fetchTasks()
        throw err
      }
    },
    [fetchTasks]
  )

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))

      const { error: err } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (err) {
        fetchTasks()
        throw err
      }
    },
    [fetchTasks]
  )

  return { tasks, loading, error, refetch: fetchTasks, updateTask, deleteTask }
}
