import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, CircularProgress, TextField } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getCaptcha } from '../api/index.js'

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'

function loadTurnstileScript() {
  if (document.getElementById(TURNSTILE_SCRIPT_ID)) return
  const s = document.createElement('script')
  s.id = TURNSTILE_SCRIPT_ID
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true
  s.defer = true
  document.head.appendChild(s)
}



export default function CaptchaWidget({ captchaType, turnstileSiteKey, onChange }) {
  const { t } = useTranslation()

  // builtin state
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [loadingCaptcha, setLoadingCaptcha] = useState(false)

  // turnstile
  const turnstileRef = useRef(null)
  const widgetIdRef = useRef(null)

  const fetchCaptcha = useCallback(async () => {
    setLoadingCaptcha(true)
    setCaptchaAnswer('')
    try {
      const { data } = await getCaptcha()
      setCaptchaToken(data.token)
      setCaptchaImage(data.image)
      onChange({ captcha_token: data.token, captcha_answer: '' })
    } catch {
      // ignore
    } finally {
      setLoadingCaptcha(false)
    }
  }, [onChange])

  // load builtin captcha on mount / type change
  useEffect(() => {
    if (captchaType === 'builtin') {
      fetchCaptcha()
    }
  }, [captchaType, fetchCaptcha])

  // load Turnstile
  useEffect(() => {
    if (captchaType !== 'turnstile') return
    loadTurnstileScript()
    let intervalId = null
    const tryRender = () => {
      if (window.turnstile && turnstileRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token) => onChange({ captcha_token: '', captcha_answer: token }),
          'error-callback': () => onChange({ captcha_token: '', captcha_answer: '' }),
          'expired-callback': () => onChange({ captcha_token: '', captcha_answer: '' }),
        })
        clearInterval(intervalId)
      }
    }
    // start with undefined so tryRender runs
    widgetIdRef.current = null
    intervalId = setInterval(tryRender, 200)
    return () => {
      clearInterval(intervalId)
      if (window.turnstile && widgetIdRef.current != null) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
      }
      widgetIdRef.current = null
    }
  }, [captchaType, turnstileSiteKey, onChange])

  const handleAnswerChange = (e) => {
    const val = e.target.value
    setCaptchaAnswer(val)
    onChange({ captcha_token: captchaToken, captcha_answer: val })
  }

  if (captchaType === 'builtin') {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {loadingCaptcha ? (
            <Box sx={{ width: 130, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <CircularProgress size={20} />
            </Box>
          ) : captchaImage ? (
            <Box
              component="img"
              src={captchaImage}
              sx={{ height: 44, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', display: 'block' }}
              onClick={fetchCaptcha}
              title={t('auth.captchaRefresh')}
            />
          ) : null}
          <Button size="small" variant="outlined" onClick={fetchCaptcha} disabled={loadingCaptcha} startIcon={<RefreshIcon />}>
            {t('auth.captchaRefresh')}
          </Button>
        </Box>
        <TextField
          label={t('auth.captcha')}
          value={captchaAnswer}
          onChange={handleAnswerChange}
          inputProps={{ maxLength: 6 }}
          size="small"
          fullWidth
          placeholder={t('auth.captchaPlaceholder')}
        />
      </Box>
    )
  }

  if (captchaType === 'turnstile') {
    return <Box ref={turnstileRef} sx={{ my: 1 }} />
  }

  return null
}
