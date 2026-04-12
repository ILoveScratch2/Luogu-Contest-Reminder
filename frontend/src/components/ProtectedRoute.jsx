import { Box, CircularProgress } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
