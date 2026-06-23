// No authentication — open access
import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: true, role: 'advisor', loading: false, signOut: () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
