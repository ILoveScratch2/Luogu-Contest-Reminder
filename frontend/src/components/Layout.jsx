import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSiteConfig } from '../contexts/SiteConfigContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import Footer from './Footer.jsx'

export default function Layout({ children, maxWidth = 'lg' }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { config } = useSiteConfig()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {/* Logo */}
          <Typography
            variant="h6"
            onClick={() => navigate('/dashboard')}
            sx={{ cursor: 'pointer', color: 'inherit', flexGrow: 0, mr: 2, fontWeight: 700 }}
          >
            {config.site_title || t('app.title')}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Nav buttons */}
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 1 }}
          >
            {t('nav.dashboard')}
          </Button>

          {user?.is_root && (
            <Button
              color="inherit"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => navigate('/admin')}
              sx={{ mr: 1 }}
            >
              {t('nav.admin')}
            </Button>
          )}

          <LanguageSwitcher sx={{ mr: 1, color: 'inherit' }} />

          <Tooltip title={user?.email || ''}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', mr: 1, fontSize: 14 }}>
              {user?.email?.[0]?.toUpperCase() || '?'}
            </Avatar>
          </Tooltip>

          <Tooltip title={t('nav.logout')}>
            <IconButton color="inherit" onClick={handleLogout} size="small">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth={maxWidth} sx={{ py: 4 }}>
        {children}
      </Container>
      <Footer />
    </Box>
  )
}
