import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  IconButton,
  Link,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import GitHubIcon from '@mui/icons-material/GitHub'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import {
  createUser,
  deleteUser,
  getAbout,
  getAdminSiteConfig,
  getEmailTemplate,
  getScheduler,
  getSmtp,
  getSiteConfig,
  getUsers,
  parseApiError,
  saveEmailTemplate,
  saveScheduler,
  saveSmtp,
  saveSiteConfig,
  testSmtp,
  triggerReminder,
  updateUser,
} from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSiteConfig } from '../contexts/SiteConfigContext.jsx'
import Layout from '../components/Layout.jsx'

// util
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

// users tab
function UsersTab({ t }) {
  const { user: self } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', password: '', is_root: false, is_active: true, email_reminder: true, send_contest_body: false })
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  const load = useCallback(() => {
    setLoading(true)
    getUsers()
      .then(({ data }) => setUsers(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({ is_active: u.is_active, email_reminder: u.email_reminder, send_contest_body: u.send_contest_body, is_root: u.is_root, new_password: '' })
  }

  const handleSaveEdit = async () => {
    try {
      await updateUser(editUser.id, editForm)
      showSnack(t('admin.users.updated'))
      setEditUser(null)
      load()
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteUser(delTarget.id)
      showSnack(t('admin.users.deleted'))
      setDelTarget(null)
      load()
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    }
  }

  const openCreate = () => {
    setCreateForm({ email: '', password: '', is_root: false, is_active: true, email_reminder: true, send_contest_body: false })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    try {
      await createUser(createForm)
      showSnack(t('admin.users.created'))
      setCreateOpen(false)
      load()
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
          {t('admin.users.createBtn')}
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.users.id')}</TableCell>
              <TableCell>{t('admin.users.email')}</TableCell>
              <TableCell>{t('admin.users.status')}</TableCell>
              <TableCell>{t('admin.users.role')}</TableCell>
              <TableCell>{t('admin.users.reminder')}</TableCell>
              <TableCell>{t('admin.users.body')}</TableCell>
              <TableCell>{t('admin.users.createdAt')}</TableCell>
              <TableCell>{t('admin.users.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.id}</TableCell>
                <TableCell sx={{ fontWeight: u.is_root ? 700 : 400 }}>{u.email}</TableCell>
                <TableCell>
                  <Chip
                    label={u.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                    color={u.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.is_root ? t('admin.users.root') : t('admin.users.normal')}
                    color={u.is_root ? 'primary' : 'default'}
                    size="small"
                    variant={u.is_root ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.email_reminder ? t('admin.users.on') : t('admin.users.off')}
                    color={u.email_reminder ? 'info' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.send_contest_body ? t('admin.users.on') : t('admin.users.off')}
                    color={u.send_contest_body ? 'info' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{fmtDate(u.created_at)}</TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={u.id === self?.id}
                        onClick={() => setDelTarget(u)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* edit dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('admin.users.editTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">{editUser?.email}</Typography>
          <FormControlLabel
            control={<Switch checked={!!editForm.is_active} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} />}
            label={t('admin.users.active')}
          />
          <FormControlLabel
            control={<Switch checked={!!editForm.email_reminder} onChange={(e) => setEditForm((f) => ({ ...f, email_reminder: e.target.checked }))} />}
            label={t('admin.users.reminder')}
          />
          <FormControlLabel
            control={<Switch checked={!!editForm.send_contest_body} onChange={(e) => setEditForm((f) => ({ ...f, send_contest_body: e.target.checked }))} />}
            label={t('admin.users.body')}
          />
          <FormControlLabel
            control={<Switch checked={!!editForm.is_root} onChange={(e) => setEditForm((f) => ({ ...f, is_root: e.target.checked }))} disabled={editUser?.id === self?.id} />}
            label={t('admin.users.root')}
          />
          <TextField
            label={t('admin.users.newPassword')}
            type="password"
            value={editForm.new_password || ''}
            onChange={(e) => setEditForm((f) => ({ ...f, new_password: e.target.value }))}
            helperText={t('admin.smtp.passwordHelp')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveEdit}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle color="error">{t('common.delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.users.deleteConfirm', { email: delTarget?.email })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>

      {/* create user dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('admin.users.createTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label={t('admin.users.email')}
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label={t('admin.users.password')}
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
          />
          <FormControlLabel
            control={<Switch checked={createForm.is_active} onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.checked }))} />}
            label={t('admin.users.active')}
          />
          <FormControlLabel
            control={<Switch checked={createForm.email_reminder} onChange={(e) => setCreateForm((f) => ({ ...f, email_reminder: e.target.checked }))} />}
            label={t('admin.users.reminder')}
          />
          <FormControlLabel
            control={<Switch checked={createForm.send_contest_body} onChange={(e) => setCreateForm((f) => ({ ...f, send_contest_body: e.target.checked }))} />}
            label={t('admin.users.body')}
          />
          <FormControlLabel
            control={<Switch checked={createForm.is_root} onChange={(e) => setCreateForm((f) => ({ ...f, is_root: e.target.checked }))} />}
            label={t('admin.users.root')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// smtp tab
function SmtpTab({ t }) {
  const [form, setForm] = useState({ host: '', port: 587, username: '', password: '', from_email: '', from_name: 'Luogu Contest Reminder', use_tls: true, retry_enabled: true, retry_max_attempts: 3, retry_interval: 30, bcc_batch_size: 100 })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    getSmtp().then(({ data }) => {
      if (data) setForm((f) => ({ ...f, ...data, password: '' }))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setCheck = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSmtp(form)
      showSnack(t('admin.smtp.saved'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await testSmtp()
      showSnack(t('admin.smtp.testSuccess'))
    } catch (err) {
      showSnack(`${t('admin.smtp.testFailed')}: ${parseApiError(err)}`, 'error')
    } finally {
      setTesting(false)
    }
  }

  if (!loaded) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>

  return (
    <>
      {!form.host && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          {t('admin.smtp.notConfigured')}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
        <TextField label={t('admin.smtp.host')} value={form.host} onChange={set('host')} sx={{ gridColumn: '1 / -1' }} />
        <TextField label={t('admin.smtp.port')} type="number" value={form.port} onChange={set('port')} />
        <TextField label={t('admin.smtp.username')} value={form.username} onChange={set('username')} />
        <TextField label={t('admin.smtp.password')} type="password" value={form.password} onChange={set('password')} helperText={t('admin.smtp.passwordHelp')} sx={{ gridColumn: '1 / -1' }} />
        <TextField label={t('admin.smtp.fromEmail')} type="email" value={form.from_email} onChange={set('from_email')} />
        <TextField label={t('admin.smtp.fromName')} value={form.from_name} onChange={set('from_name')} />
      </Box>
      <FormControlLabel
        control={<Switch checked={form.use_tls} onChange={setCheck('use_tls')} />}
        label={t('admin.smtp.useTls')}
        sx={{ mb: 2, display: 'block' }}
      />
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        {t('admin.smtp.retryTitle')}
      </Typography>
      <FormControlLabel
        control={<Switch checked={form.retry_enabled} onChange={setCheck('retry_enabled')} />}
        label={t('admin.smtp.retryEnabled')}
        sx={{ mb: 2, display: 'block' }}
      />
      {form.retry_enabled && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <TextField
            label={t('admin.smtp.retryMaxAttempts')}
            type="number"
            value={form.retry_max_attempts}
            onChange={set('retry_max_attempts')}
            inputProps={{ min: 1, max: 10 }}
            helperText={t('admin.smtp.retryMaxAttemptsHelp')}
          />
          <TextField
            label={t('admin.smtp.retryInterval')}
            type="number"
            value={form.retry_interval}
            onChange={set('retry_interval')}
            inputProps={{ min: 5 }}
            helperText={t('admin.smtp.retryIntervalHelp')}
          />
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        {t('admin.smtp.bccBatchTitle')}
      </Typography>
      <TextField
        label={t('admin.smtp.bccBatchSize')}
        type="number"
        value={form.bcc_batch_size}
        onChange={set('bcc_batch_size')}
        inputProps={{ min: 0 }}
        helperText={t('admin.smtp.bccBatchSizeHelp')}
        sx={{ mb: 2, maxWidth: 280 }}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : t('admin.smtp.save')}
        </Button>
        <Button variant="outlined" onClick={handleTest} disabled={testing || !form.host}>
          {testing ? <CircularProgress size={18} /> : t('admin.smtp.test')}
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// system tab
function SystemTab({ t }) {
  const [triggering, setTriggering] = useState(false)
  const [scheduleTimes, setScheduleTimes] = useState(null)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  useEffect(() => {
    getScheduler()
      .then(({ data }) => setScheduleTimes(data.times || []))
      .catch(() => setScheduleTimes([]))
  }, [])

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      await triggerReminder()
      setSnack({ open: true, msg: t('admin.system.triggered'), sev: 'success' })
    } catch (err) {
      setSnack({ open: true, msg: parseApiError(err) || t('common.error'), sev: 'error' })
    } finally {
      setTriggering(false)
    }
  }

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('admin.system.triggerTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('admin.system.triggerDesc')}
          </Typography>
          <Button variant="contained" onClick={handleTrigger} disabled={triggering}>
            {triggering ? <CircularProgress size={18} /> : t('admin.system.trigger')}
          </Button>
        </CardContent>
      </Card>

      <Alert severity="info">
        {scheduleTimes === null ? (
          t('common.loading')
        ) : scheduleTimes.length === 0 ? (
          t('admin.system.scheduleNone')
        ) : (
          <>{t('admin.system.scheduleInfo')}{' '}
            {scheduleTimes.map((time) => (
              <Chip key={time} label={`${time} CST`} size="small" color="info" sx={{ ml: 0.5 }} />
            ))}
          </>
        )}
      </Alert>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// scheduler tab
function SchedulerTab({ t }) {
  const [times, setTimes] = useState([])
  const [newTime, setNewTime] = useState('08:00')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    getScheduler()
      .then(({ data }) => { setTimes(data.times || ['08:00']); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const addTime = () => {
    if (!newTime) return
    if (times.includes(newTime)) { showSnack(t('admin.scheduler.duplicate'), 'warning'); return }
    setTimes((prev) => [...prev, newTime].sort())
    setNewTime('08:00')
  }

  const removeTime = (ti) => setTimes((prev) => prev.filter((x) => x !== ti))

  const handleSave = async () => {
    if (times.length === 0) { showSnack(t('admin.scheduler.emptyError'), 'error'); return }
    setSaving(true)
    try {
      await saveScheduler({ times })
      showSnack(t('admin.scheduler.saved'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('admin.scheduler.desc')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField
          label={t('admin.scheduler.addTime')}
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          sx={{ width: 160 }}
          fullWidth={false}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addTime}>
          {t('common.add')}
        </Button>
      </Box>
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {times.length === 0 && (
          <Typography variant="body2" color="text.secondary">{t('admin.scheduler.empty')}</Typography>
        )}
        {times.map((time) => (
          <Chip
            key={time}
            label={`${time} CST`}
            onDelete={() => removeTime(time)}
            color="primary"
            variant="outlined"
          />
        ))}
      </Box>
      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? <CircularProgress size={18} /> : t('common.save')}
      </Button>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// email templates tab
const TEMPLATE_PLACEHOLDERS = {
  verification: {
    subject: [],
    body: ['{{code}}', '{{primary_color}}', '{{dark_color}}', '{{site_title}}'],
  },
  reminder: {
    subject: ['{{count}}'],
    body: ['{{count}}', '{{cards_html}}', '{{advance_hours}}', '{{primary_color}}', '{{dark_color}}', '{{site_title}}'],
  },
}

function EmailTemplatesTab({ t }) {
  const [tplType, setTplType] = useState('reminder')
  const [data, setData] = useState({
    verification: { subject: '', html_body: '', default_subject: '', default_html: '' },
    reminder: { subject: '', html_body: '', default_subject: '', default_html: '' },
  })
  const [loaded, setLoaded] = useState({ verification: false, reminder: false })
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    ;['verification', 'reminder'].forEach((type) => {
      getEmailTemplate(type)
        .then(({ data: d }) => {
          setData((prev) => ({
            ...prev,
            [type]: {
              subject: d.subject || '',
              html_body: d.html_body || '',
              default_subject: d.default_subject || '',
              default_html: d.default_html || '',
            },
          }))
          setLoaded((prev) => ({ ...prev, [type]: true }))
        })
        .catch(() => setLoaded((prev) => ({ ...prev, [type]: true })))
    })
  }, [])

  const setCurrent = (field) => (e) =>
    setData((prev) => ({ ...prev, [tplType]: { ...prev[tplType], [field]: e.target.value } }))

  const handleReset = () => {
    if (!window.confirm(t('admin.emailTemplate.resetConfirm'))) return
    setData((prev) => ({
      ...prev,
      [tplType]: {
        ...prev[tplType],
        subject: prev[tplType].default_subject,
        html_body: prev[tplType].default_html,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cur = data[tplType]
      await saveEmailTemplate(tplType, { subject: cur.subject || null, html_body: cur.html_body || null })
      showSnack(t('admin.emailTemplate.saved'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const cur = data[tplType]
  const isLoaded = loaded[tplType]
  const ph = TEMPLATE_PLACEHOLDERS[tplType]

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tplType} onChange={(_, v) => setTplType(v)}>
          <Tab label={t('admin.emailTemplate.reminder')} value="reminder" />
          <Tab label={t('admin.emailTemplate.verification')} value="verification" />
        </Tabs>
      </Box>
      {!isLoaded ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Placeholder reference */}
          <Card variant="outlined">
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {t('admin.emailTemplate.subjectHint')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {ph.subject.length === 0
                  ? <Typography variant="caption" color="text.disabled">无</Typography>
                  : ph.subject.map((p) => <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 12 }} />)
                }
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {t('admin.emailTemplate.bodyHint')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {ph.body.map((p) => <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 12 }} />)}
              </Box>
            </CardContent>
          </Card>

          <TextField
            label={t('admin.emailTemplate.subject')}
            value={cur.subject}
            onChange={setCurrent('subject')}
            placeholder={cur.default_subject}
            helperText={t('admin.emailTemplate.emptyFallback')}
          />
          <TextField
            label={t('admin.emailTemplate.htmlBody')}
            value={cur.html_body}
            onChange={setCurrent('html_body')}
            placeholder={cur.default_html}
            helperText={t('admin.emailTemplate.emptyFallback')}
            multiline
            rows={22}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : t('admin.emailTemplate.save')}
            </Button>
            <Button variant="outlined" onClick={handleReset}>
              {t('admin.emailTemplate.resetToDefault')}
            </Button>
          </Box>
        </Box>
      )}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// site config tab
function SiteConfigTab({ t }) {
  const { config: globalConfig, setConfig: setGlobalConfig } = useSiteConfig()
  const [form, setForm] = useState({
    site_title: '',
    primary_color: '#1976d2',
    favicon_url: '',
    contest_cache_ttl: 5,
    reminder_advance_days: 1,
  })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    getAdminSiteConfig()
      .then(({ data }) => {
        if (data) setForm({ site_title: data.site_title || '', primary_color: data.primary_color || '#1976d2', favicon_url: data.favicon_url || '', contest_cache_ttl: data.contest_cache_ttl ?? 5, reminder_advance_days: data.reminder_advance_days ?? 1 })
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const isValidColor = (c) => /^#[0-9A-Fa-f]{6}$/.test(c)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!isValidColor(form.primary_color)) {
      showSnack(t('admin.site.primaryColorHelp'), 'error')
      return
    }
    setSaving(true)
    try {
      await saveSiteConfig(form)
      setGlobalConfig((prev) => ({ ...prev, ...form }))
      showSnack(t('admin.site.saved'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
        <TextField
          label={t('admin.site.siteTitle')}
          value={form.site_title}
          onChange={set('site_title')}
          helperText={t('admin.site.siteTitleHelp')}
        />
        <Box>
          <TextField
            label={t('admin.site.primaryColor')}
            value={form.primary_color}
            onChange={set('primary_color')}
            helperText={t('admin.site.primaryColorHelp')}
            error={!!form.primary_color && !isValidColor(form.primary_color)}
            InputProps={{
              endAdornment: isValidColor(form.primary_color) ? (
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: form.primary_color, border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
            ) : null,
            }}
          />
        </Box>
        <TextField
          label={t('admin.site.faviconUrl')}
          value={form.favicon_url}
          onChange={set('favicon_url')}
          helperText={t('admin.site.faviconUrlHelp')}
        />
        <TextField
          label={t('admin.site.contestCacheTtl')}
          value={form.contest_cache_ttl}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setForm((f) => ({ ...f, contest_cache_ttl: isNaN(v) ? 0 : Math.max(0, v) }))
          }}
          helperText={t('admin.site.contestCacheTtlHelp')}
          type="number"
          inputProps={{ min: 0 }}
        />
        <TextField
          label={t('admin.site.reminderAdvanceDays')}
          value={form.reminder_advance_days}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setForm((f) => ({ ...f, reminder_advance_days: isNaN(v) ? 1 : Math.max(1, v) }))
          }}
          helperText={t('admin.site.reminderAdvanceDaysHelp')}
          type="number"
          inputProps={{ min: 1 }}
        />
        <Box>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : t('admin.site.save')}
          </Button>
        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// security tab
function SecurityTab({ t }) {
  const [form, setForm] = useState({
    allow_register: true,
    captcha_type: 'none',
    captcha_on_register: false,
    captcha_on_login: false,
    captcha_on_change_email: false,
    turnstile_site_key: '',
    turnstile_secret_key: '',
    session_expire_days: 7,
    block_disposable_email: false,
  })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    getAdminSiteConfig()
      .then(({ data }) => {
        if (data) {
          setForm({
            allow_register: data.allow_register ?? true,
            captcha_type: data.captcha_type || 'none',
            captcha_on_register: data.captcha_on_register ?? false,
            captcha_on_login: data.captcha_on_login ?? false,
            captcha_on_change_email: data.captcha_on_change_email ?? false,
            turnstile_site_key: data.turnstile_site_key || '',
            turnstile_secret_key: data.turnstile_secret_key || '',
            session_expire_days: data.session_expire_days ?? 7,
            block_disposable_email: data.block_disposable_email ?? false,
          })
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const setCheck = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSiteConfig(form)
      showSnack(t('admin.security.saved'))
    } catch (err) {
      showSnack(parseApiError(err) || t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 520 }}>
        {/* Registration */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('admin.security.registrationTitle')}
          </Typography>
          <FormControlLabel
            control={<Switch checked={form.allow_register} onChange={setCheck('allow_register')} />}
            label={t('admin.security.allowRegister')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {t('admin.security.allowRegisterHelp')}
          </Typography>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch checked={form.block_disposable_email} onChange={setCheck('block_disposable_email')} />}
            label={t('admin.security.blockDisposableEmail')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {t('admin.security.blockDisposableEmailHelp')}
          </Typography>
        </Box>

        <Divider />

        {/* Session */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('admin.security.sessionTitle')}
          </Typography>
          <TextField
            label={t('admin.security.sessionExpireDays')}
            type="number"
            value={form.session_expire_days}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              setForm((f) => ({ ...f, session_expire_days: isNaN(v) ? 7 : Math.max(1, v) }))
            }}
            inputProps={{ min: 1 }}
            helperText={t('admin.security.sessionExpireDaysHelp')}
            sx={{ maxWidth: 260 }}
          />
        </Box>

        <Divider />

        {/* Captcha */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('admin.security.captchaTitle')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('admin.security.captchaType')}
            </Typography>
            <Select
              value={form.captcha_type}
              onChange={(e) => setForm((f) => ({ ...f, captcha_type: e.target.value }))}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="none">{t('admin.security.captchaTypeNone')}</MenuItem>
              <MenuItem value="builtin">{t('admin.security.captchaTypeBuiltin')}</MenuItem>
              <MenuItem value="turnstile">{t('admin.security.captchaTypeTurnstile')}</MenuItem>
            </Select>
          </Box>

          {form.captcha_type === 'turnstile' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2, pl: 1, borderLeft: '3px solid', borderColor: 'divider' }}>
              <TextField
                label={t('admin.security.turnstileSiteKey')}
                value={form.turnstile_site_key}
                onChange={(e) => setForm((f) => ({ ...f, turnstile_site_key: e.target.value }))}
                helperText={t('admin.security.turnstileSiteKeyHelp')}
              />
              <TextField
                label={t('admin.security.turnstileSecretKey')}
                type="password"
                value={form.turnstile_secret_key}
                onChange={(e) => setForm((f) => ({ ...f, turnstile_secret_key: e.target.value }))}
                helperText={t('admin.security.turnstileSecretKeyHelp')}
              />
            </Box>
          )}

          {form.captcha_type !== 'none' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('admin.security.captchaOnLabel')}
              </Typography>
              <FormControlLabel
                control={<Switch checked={form.captcha_on_register} onChange={setCheck('captcha_on_register')} />}
                label={t('admin.security.captchaOnRegister')}
              />
              <FormControlLabel
                control={<Switch checked={form.captcha_on_login} onChange={setCheck('captcha_on_login')} />}
                label={t('admin.security.captchaOnLogin')}
              />
              <FormControlLabel
                control={<Switch checked={form.captcha_on_change_email} onChange={setCheck('captcha_on_change_email')} />}
                label={t('admin.security.captchaOnChangeEmail')}
              />
            </Box>
          )}
        </Box>

        <Box>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : t('common.save')}
          </Button>
        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}

// about tab
const REPO = 'https://github.com/ILoveScratch2/Luogu-Contest-Reminder'
/* global __APP_VERSION__ */

function AboutTab({ t }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAbout()
      .then(({ data }) => setInfo(data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" gutterBottom>
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

      <Card variant="outlined" sx={{ mb: 3 }}>
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

// admin page
export default function Admin() {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  return (
    <Layout maxWidth="lg">
      <Typography variant="h5" gutterBottom>
        {t('admin.title')}
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label={t('admin.tabs.users')} />
            <Tab label={t('admin.tabs.smtp')} />
            <Tab label={t('admin.tabs.system')} />
            <Tab label={t('admin.tabs.site')} />
            <Tab label={t('admin.tabs.scheduler')} />
            <Tab label={t('admin.tabs.emailTemplate')} />
            <Tab label={t('admin.tabs.security')} />
            <Tab label={t('admin.tabs.about')} />
          </Tabs>
        </Box>

        <CardContent>
          <Divider sx={{ mb: 2 }} />
          {tab === 0 && <UsersTab t={t} />}
          {tab === 1 && <SmtpTab t={t} />}
          {tab === 2 && <SystemTab t={t} />}
          {tab === 3 && <SiteConfigTab t={t} />}
          {tab === 4 && <SchedulerTab t={t} />}
          {tab === 5 && <EmailTemplatesTab t={t} />}
          {tab === 6 && <SecurityTab t={t} />}
          {tab === 7 && <AboutTab t={t} />}
        </CardContent>
      </Card>
    </Layout>
  )
}
