import React, { useCallback, useState } from 'react'
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
import { sendCode, register as registerApi, parseApiError } from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSiteConfig } from '../contexts/SiteConfigContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import Footer from '../components/Footer.jsx'
import CaptchaWidget from '../components/CaptchaWidget.jsx'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const { config } = useSiteConfig()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [codeSent, setCodeSent] = useState(false)
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [registering, setRegistering] = useState(false)

  const [captchaValue, setCaptchaValue] = useState({ captcha_token: '', captcha_answer: '' })

  const [info, setInfo] = useState('')
  const [error, setError] = useState('')

  const captchaType = config.captcha_on_register ? (config.captcha_type || 'none') : 'none'
  const turnstileSiteKey = config.turnstile_site_key || ''

  const handleCaptchaChange = useCallback((val) => setCaptchaValue(val), [])

  // cooldown timer for resend code button
  const startCooldown = () => {
    setCodeCooldown(60)
    const iv = setInterval(() => {
      setCodeCooldown((prev) => {
        if (prev <= 1) { clearInterval(iv); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    setError('')
    setInfo('')
    if (!email) { setError(t('auth.email')); return }
    if (captchaType !== 'none' && !captchaValue.captcha_answer) {
      setError(t('auth.captchaRequired')); return
    }
    setSendingCode(true)
    try {
      await sendCode(email, captchaValue.captcha_token, captchaValue.captcha_answer)
      setCodeSent(true)
      setInfo(t('auth.codeSent'))
      startCooldown()
    } catch (err) {
      setError(parseApiError(err) || t('common.error'))
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (password.length < 8) { setError(t('auth.passwordTooShort')); return }
    if (password !== confirm) { setError(t('auth.passwordMismatch')); return }
    setRegistering(true)
    try {
      const { data } = await registerApi({ email, code, password })
      login(data.token, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(parseApiError(err) || t('common.error'))
    } finally {
      setRegistering(false)
    }
  }

  // Registration disabled
  if (config.allow_register === false) {
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
        <Box sx={{ position: 'fixed', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </Box>
        <Card sx={{ width: '100%', maxWidth: 440 }}>
          <Box
            sx={{
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              p: 4,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <Typography variant="h5">{config.site_title || t('app.title')}</Typography>
          </Box>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>{t('auth.registerDisabled')}</Alert>
            <Typography variant="body2">
              <Link component={RouterLink} to="/login" underline="hover">
                {t('auth.hasAccount')}
              </Link>
            </Typography>
          </CardContent>
        </Card>
        <Footer />
      </Box>
    )
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
      <Box sx={{ position: 'fixed', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </Box>

      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <Box
          sx={{
            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            p: 4,
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <Typography variant="h5">{config.site_title || t('app.title')}</Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('auth.register')}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* email + send code */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={handleSendCode}
                disabled={sendingCode || codeCooldown > 0}
                sx={{ whiteSpace: 'nowrap', minWidth: 110 }}
              >
                {sendingCode
                  ? t('auth.sending')
                  : codeCooldown > 0
                  ? `${codeCooldown}s`
                  : codeSent
                  ? t('auth.resendCode')
                  : t('auth.sendCode')}
              </Button>
            </Box>

            {captchaType !== 'none' && (
              <Box sx={{ mb: 2 }}>
                <CaptchaWidget
                  captchaType={captchaType}
                  turnstileSiteKey={turnstileSiteKey}
                  onChange={handleCaptchaChange}
                />
              </Box>
            )}

            <TextField
              label={t('auth.verificationCode')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              sx={{ mb: 2 }}
            />

            <TextField
              label={t('auth.password')}
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 2 }}
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

            <TextField
              label={t('auth.confirmPassword')}
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={registering || !codeSent}
            >
              {registering ? t('auth.registering') : t('auth.register')}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" textAlign="center">
            <Link component={RouterLink} to="/login" underline="hover">
              {t('auth.hasAccount')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
      <Footer />
    </Box>
  )
}
