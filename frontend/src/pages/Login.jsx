import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { login as loginApi, parseApiError } from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import Footer from '../components/Footer.jsx'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await loginApi({ email, password })
      login(data.token, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(parseApiError(err) || t('auth.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      {/* language */}
      <Box sx={{ position: 'fixed', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </Box>

      <Card sx={{ width: '100%', maxWidth: 420 }}>
        {/* header gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1565c0, #1976d2)',
            p: 4,
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <Typography variant="h5">{t('app.title')}</Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('auth.login')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              sx={{ mb: 2 }}
            />
            <TextField
              label={t('auth.password')}
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd((v) => !v)} edge="end">
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
            >
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" textAlign="center">
            <Link component={RouterLink} to="/register" underline="hover">
              {t('auth.noAccount')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
      <Footer />
    </Box>
  )
}
