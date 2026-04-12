import React, { useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { SiteConfigProvider, useSiteConfig } from './contexts/SiteConfigContext.jsx'
import createAppTheme from './theme.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Admin from './pages/Admin.jsx'
import About from './pages/About.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, fontFamily: 'sans-serif' }}>
          <h2>Page Error</h2>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
            style={{ padding: '8px 24px', cursor: 'pointer', fontSize: 16 }}
          >
            Return
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function ThemedRoot() {
  const { config } = useSiteConfig()
  const theme = useMemo(() => createAppTheme(config.primary_color), [config.primary_color])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SiteConfigProvider>
        <ThemedRoot />
      </SiteConfigProvider>
    </ErrorBoundary>
  )
}
