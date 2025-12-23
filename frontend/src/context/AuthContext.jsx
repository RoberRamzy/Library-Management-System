import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiBase } from '../App'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const res = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Login failed')
      }

      const data = await res.json()
      const userData = data.user
      
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return { success: true, user: userData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const signup = async (formData) => {
    try {
      const res = await fetch(`${apiBase}/customer/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Signup failed')
      }

      const data = await res.json()
      return { success: true, userID: data.userID }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    if (user?.userID) {
      try {
        await fetch(`${apiBase}/customer/logout/${user.userID}`, {
          method: 'POST'
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    
    setUser(null)
    localStorage.removeItem('user')
  }

  const updateProfile = async (userID, updates) => {
    try {
      const res = await fetch(`${apiBase}/customer/profile/${userID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Update failed')
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

