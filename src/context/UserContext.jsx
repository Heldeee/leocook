import { createContext, useContext, useState } from 'react'
const UserContext = createContext(null)
const visitor = { id: 'local', name: 'Catalogue' }
export function UserProvider({ children }) {
  const [editing, setEditing] = useState(false)
  return <UserContext.Provider value={{ currentUser: visitor, editing, setEditing }}>{children}</UserContext.Provider>
}
export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within a UserProvider')
  return context
}
