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
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  deleteAccount,
  getProfile,
  getUpcomingContests,
  updateSettings,
  parseApiError,
  sendChangeEmailCode,
  confirmChangeEmail,
} from '../api/index.js'
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

  // change email dialog state
  const [changeEmailOpen, setChangeEmailOpen] = useState(false)
  const [changeEmailStep, setChangeEmailStep] = useState(1) // 1: input new email, 2: input codes
  const [newEmail, setNewEmail] = useState('')
  const [oldCode, setOldCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [sendingCodes, setSendingCodes] = useState(false)
  const [confirmingChange, setConfirmingChange] = useState(false)
  const [codeCooldown, setCodeCooldown] = useState(0)

  useEffect(() => {
    if (codeCooldown <= 0) return
    const timer = setTimeout(() => setCodeCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [codeCooldown])

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

  const handleOpenChangeEmail = () => {
    setNewEmail('')
    setOldCode('')
    setNewCode('')
    setChangeEmailStep(1)
    setCodeCooldown(0)
    setChangeEmailOpen(true)
  }

  const handleSendChangeCodes = async () => {
    if (!newEmail) return
    setSendingCodes(true)
    try {
      await sendChangeEmailCode(newEmail)
      setChangeEmailStep(2)
      setCodeCooldown(60)
      showSnack(t('dashboard.changeEmail.codeSent'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setSendingCodes(false)
    }
  }

  const handleConfirmChangeEmail = async () => {
    setConfirmingChange(true)
    try {
      const { data } = await confirmChangeEmail({ new_email: newEmail, old_code: oldCode, new_code: newCode })
      patchUser(data.user)
      setChangeEmailOpen(false)
      showSnack(t('dashboard.changeEmail.success'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setConfirmingChange(false)
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
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  onClick={handleOpenChangeEmail}
                >
                  {t('dashboard.changeEmail.title')}
                </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteOpen(true)}
                disabled={user?.is_root}
              >
                {t('dashboard.deleteAccount')}
              </Button>
              </Stack>
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

      {/* change email dialog */}
      <Dialog open={changeEmailOpen} onClose={() => setChangeEmailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('dashboard.changeEmail.title')}</DialogTitle>
        <DialogContent>
          {changeEmailStep === 1 ? (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                {t('dashboard.changeEmail.step1Desc', { email: user?.email })}
              </DialogContentText>
              <TextField
                label={t('dashboard.changeEmail.newEmail')}
                type="email"
                fullWidth
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newEmail && handleSendChangeCodes()}
                autoFocus
              />
            </>
          ) : (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                {t('dashboard.changeEmail.step2Desc', { oldEmail: user?.email, newEmail })}
              </DialogContentText>
              <Stack spacing={2}>
                <TextField
                  label={t('dashboard.changeEmail.oldCode', { email: user?.email })}
                  fullWidth
                  inputProps={{ maxLength: 6 }}
                  value={oldCode}
                  onChange={(e) => setOldCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
                <TextField
                  label={t('dashboard.changeEmail.newCode', { email: newEmail })}
                  fullWidth
                  inputProps={{ maxLength: 6 }}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ''))}
                />
                <Button
                  size="small"
                  disabled={codeCooldown > 0 || sendingCodes}
                  onClick={handleSendChangeCodes}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {codeCooldown > 0
                    ? t('dashboard.changeEmail.resendCooldown', { seconds: codeCooldown })
                    : t('dashboard.changeEmail.resend')}
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeEmailOpen(false)}>{t('common.cancel')}</Button>
          {changeEmailStep === 1 ? (
            <Button
              variant="contained"
              onClick={handleSendChangeCodes}
              disabled={!newEmail || sendingCodes}
            >
              {sendingCodes ? <CircularProgress size={18} /> : t('dashboard.changeEmail.sendCodes')}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleConfirmChangeEmail}
              disabled={oldCode.length !== 6 || newCode.length !== 6 || confirmingChange}
            >
              {confirmingChange ? <CircularProgress size={18} /> : t('common.confirm')}
            </Button>
          )}
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
