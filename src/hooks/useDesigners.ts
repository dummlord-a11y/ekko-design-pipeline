import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Designer } from '../types'

export function useDesigners() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDesigners = useCallback(async () => {
    const { data } = await supabase
      .from('designers')
      .select('*')
      .order('name')
    setDesigners(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDesigners()
  }, [fetchDesigners])

  const addDesigner = useCallback(async (name: string, email: string) => {
    const { error } = await supabase
      .from('designers')
      .insert({ name, email, role: 'Дизайнер' })
    if (error) throw error
    await fetchDesigners()
  }, [fetchDesigners])

  const updateDesigner = useCallback(async (id: string, updates: Partial<Designer>) => {
    const { error } = await supabase
      .from('designers')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    await fetchDesigners()
  }, [fetchDesigners])

  const removeDesigner = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('designers')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchDesigners()
  }, [fetchDesigners])

  return { designers, loading, refetch: fetchDesigners, addDesigner, updateDesigner, removeDesigner }
}
