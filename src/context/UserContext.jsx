import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [session, setSession] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const load = async (authUser) => {
      if (!authUser) { if (alive) setCurrentUser(null); return }
      const { data } = await supabase.from('users').select('id, name, email').eq('id', authUser.id).single()
      if (alive) setCurrentUser(data ?? null)
    }
    supabase.auth.getSession().then(({ data: { session: next } }) => {
      if (!alive) return
      setSession(next); load(next?.user).finally(() => alive && setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); load(next?.user) })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (name, email, password) => supabase.auth.signUp({ email, password, options: { data: { name } } })
  const signOut = () => supabase.auth.signOut()
  return <UserContext.Provider value={{ session, currentUser, loading, signIn, signUp, signOut }}>{children}</UserContext.Provider>
}
export function useUser() { const ctx = useContext(UserContext); if (!ctx) throw new Error('useUser must be used within a UserProvider'); return ctx }
