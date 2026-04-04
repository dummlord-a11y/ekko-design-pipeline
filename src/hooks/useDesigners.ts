import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Designer } from '../types'

export function useDesigners() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('designers')
        .select('*')
        .order('name')
      setDesigners(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  return { designers, loading }
}
