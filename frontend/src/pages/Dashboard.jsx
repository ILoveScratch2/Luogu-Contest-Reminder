import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Link,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { deleteAccount, getProfile, getUpcomingContests, updateSettings, parseApiError } from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

function tsCst(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, patchUser, logout } = useAuth()
  const navigate = useNavigate()

  const [settings, setSettings] = useState({
    email_reminder: user?.email_reminder ?? true,
    send_contest_body: user?.send_contest_body ?? false,
  })
  const [contests, setContests] = useState([])
  const [loadingContests, setLoadingContests] = useState(true)
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showSnack = (msg, severity = 'success') =>
    setSnack({ open: true, msg, severity })

  // load info
  useEffect(() => {
    getProfile()
      .then(({ data }) => {
        setSettings({
          email_reminder: data.email_reminder,
          send_contest_body: data.send_contest_body,
        })
        patchUser(data)
      })
      .catch(() => {})

    getUpcomingContests()
      .then(({ data }) => setContests(data))
      .catch(() => setContests([]))
      .finally(() => setLoadingContests(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(
    async (key) => {
      const next = { ...settings, [key]: !settings[key] }
      setSettings(next)
      try {
        await updateSettings({ [key]: next[key] })
        patchUser({ [key]: next[key] })
        showSnack(t('dashboard.settingsSaved'))
      } catch {
        setSettings(settings)
        showSnack(t('common.error'), 'error')
      }
    },
    [settings, t, patchUser]
  )

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <Layout>
      {/* welcome to LCM! */}
      <Typography variant="h5" gutterBottom>
        {t('dashboard.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {t('dashboard.welcome', { email: user?.email })}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 2 }}>
        {/* left column */}
        <Box sx={{ flex: 1 }}>
          {/* settings card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.settings')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email_reminder}
                    onChange={() => handleToggle('email_reminder')}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {t('dashboard.emailReminder')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.emailReminderDesc')}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.send_contest_body}
                    onChange={() => handleToggle('send_contest_body')}
                    color="primary"
                    disabled={!settings.email_reminder}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {t('dashboard.sendContestBody')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.sendContestBodyDesc')}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start' }}
              />

              <Box
                sx={{ mt: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 2, display: 'flex', gap: 1 }}
              >
                <InfoOutlinedIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.nextReminder')}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* account card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.account')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user?.email}
                {user?.is_root && (
                  <Chip label="Admin" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteOpen(true)}
                disabled={user?.is_root}
              >
                {t('dashboard.deleteAccount')}
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* right column – upcoming contests */}
        <Box sx={{ flex: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.upcomingContests')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {loadingContests ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : contests.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  {t('dashboard.noContests')}
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.contestName')}</TableCell>
                        <TableCell>{t('dashboard.startTime')}</TableCell>
                        <TableCell>{t('dashboard.endTime')}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contests.map((c) => (
                        <TableRow key={c.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{tsCst(c.startTime)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{tsCst(c.endTime)}</TableCell>
                          <TableCell>
                            <Link
                              href={`https://www.luogu.com.cn/contest/${c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                            >
                              {t('dashboard.goContest')}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* delete account dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle color="error">{t('dashboard.deleteAccount')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('dashboard.deleteAccountConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          variant="filled"
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
