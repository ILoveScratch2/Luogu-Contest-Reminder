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
  Snackbar,
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import {
  createUser,
  deleteUser,
  getSmtp,
  getUsers,
  saveSmtp,
  testSmtp,
  triggerReminder,
  updateUser,
} from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
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
      showSnack(err.response?.data?.detail || t('common.error'), 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteUser(delTarget.id)
      showSnack(t('admin.users.deleted'))
      setDelTarget(null)
      load()
    } catch (err) {
      showSnack(err.response?.data?.detail || t('common.error'), 'error')
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
      showSnack(err.response?.data?.detail || t('common.error'), 'error')
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
  const [form, setForm] = useState({ host: '', port: 587, username: '', password: '', from_email: '', from_name: 'Luogu Contest Reminder', use_tls: true })
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
      showSnack(err.response?.data?.detail || t('common.error'), 'error')
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
      showSnack(`${t('admin.smtp.testFailed')}: ${err.response?.data?.detail || ''}`, 'error')
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
        sx={{ mb: 2 }}
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
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      await triggerReminder()
      setSnack({ open: true, msg: t('admin.system.triggered'), sev: 'success' })
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.detail || t('common.error'), sev: 'error' })
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

      <Alert severity="info">{t('admin.system.scheduleInfo')}</Alert>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
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
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={t('admin.tabs.users')} />
            <Tab label={t('admin.tabs.smtp')} />
            <Tab label={t('admin.tabs.system')} />
          </Tabs>
        </Box>

        <CardContent>
          <Divider sx={{ mb: 2 }} />
          {tab === 0 && <UsersTab t={t} />}
          {tab === 1 && <SmtpTab t={t} />}
          {tab === 2 && <SystemTab t={t} />}
        </CardContent>
      </Card>
    </Layout>
  )
}
