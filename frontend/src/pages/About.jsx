import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GitHubIcon from '@mui/icons-material/GitHub'
import { getAbout } from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import Footer from '../components/Footer.jsx'

const REPO = 'https://github.com/ILoveScratch2/Luogu-Contest-Reminder'
/* global __APP_VERSION__ */

export default function About() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAbout()
      .then(({ data }) => setInfo(data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [])

  const handleBack = () => {
    if (user) navigate('/dashboard')
    else navigate('/login')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* top bar */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: '#fff',
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Button
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          size="small"
          sx={{ textTransform: 'none' }}
        >
          {t('common.back')}
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {t('app.title')}
        </Typography>
        <LanguageSwitcher sx={{ color: 'inherit' }} />
      </Box>

      {/* content */}
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 2, py: 5 }}>
        <Box sx={{ width: '100%', maxWidth: 560 }}>
          {/* hero */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              {t('app.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {t('about.description')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<GitHubIcon />}
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('about.repository')}
            </Button>
          </Box>

          {/* version info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('about.title')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : info ? (
                <Stack spacing={1.5}>
                  <InfoRow label={t('about.frontendVersion')} value={__APP_VERSION__} />
                  <InfoRow label={t('about.backendVersion')} value={info.backend?.version} />
                  <InfoRow label={t('about.pythonVersion')} value={info.backend?.python} />
                  <InfoRow label={t('about.fastapiVersion')} value={info.backend?.fastapi} />
                  <InfoRow
                    label={t('about.license')}
                    value={
                      <Link href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" underline="hover">
                        {info.license}
                      </Link>
                    }
                  />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('about.loading')}
                </Typography>
              )}
            </CardContent>
          </Card>


        </Box>
      </Box>

      <Footer />
    </Box>
  )
}

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value ?? '—'}
      </Typography>
    </Box>
  )
}
