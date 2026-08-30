import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const UserContext = createContext(null)
const STORAGE_KEY = 'recipe-app-current-user-id'

export function UserProvider({ children }) {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('users').select('id, name, email').order('name')
      setUsers(data ?? [])

      const savedId = localStorage.getItem(STORAGE_KEY)
      const saved = data?.find((u) => u.id === savedId)
      setCurrentUser(saved ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const selectUser = (userId) => {
    const found = users.find((u) => u.id === userId) ?? null
    setCurrentUser(found)
    if (found) localStorage.setItem(STORAGE_KEY, found.id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <UserContext.Provider value={{ users, currentUser, selectUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}
