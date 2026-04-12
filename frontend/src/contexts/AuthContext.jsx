import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (token && raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const patchUser = (partial) => {
    const updated = { ...user, ...partial }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, patchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
