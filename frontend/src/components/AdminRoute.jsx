import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { Box, CircularProgress } from '@mui/material'

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_root) return <Navigate to="/dashboard" replace />
  return children
}
