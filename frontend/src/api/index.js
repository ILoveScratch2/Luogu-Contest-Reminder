import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// 加 jwt
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 未授权重定向登录
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

/**
 * convert error info
 */
export function parseApiError(err, fallback = '') {
  const detail = err?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((e) => e.msg || String(e)).join('; ')
  return String(detail)
}

// public
export const getAbout = () => api.get('/about')

// auth
export const sendCode = (email) =>
  api.post('/auth/send-code', { email })

export const register = ({ email, code, password }) =>
  api.post('/auth/register', { email, code, password })

export const login = ({ email, password }) =>
  api.post('/auth/login', { email, password })

// user
export const getProfile = () => api.get('/user/profile')

export const updateSettings = (data) => api.put('/user/settings', data)

export const deleteAccount = () => api.delete('/user/account')

export const sendChangeEmailCode = (new_email) =>
  api.post('/user/send-change-email-code', { new_email })

export const confirmChangeEmail = (data) =>
  api.post('/user/confirm-change-email', data)

// contests
export const getUpcomingContests = () => api.get('/contests/upcoming')

// admin – users
export const getUsers = () => api.get('/admin/users')

export const createUser = (data) => api.post('/admin/users', data)

export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data)

export const deleteUser = (id) => api.delete(`/admin/users/${id}`)

// admin – smtp
export const getSmtp = () => api.get('/admin/smtp')

export const saveSmtp = (data) => api.put('/admin/smtp', data)

export const testSmtp = () => api.post('/admin/smtp/test')

// admin – remind
export const triggerReminder = () => api.post('/admin/remind/trigger')

// admin – site config
export const getSiteConfig = () => api.get('/site-config')

export const saveSiteConfig = (data) => api.put('/admin/site-config', data)

// admin – scheduler
export const getScheduler = () => api.get('/admin/scheduler')

export const saveScheduler = (data) => api.put('/admin/scheduler', data)

// admin – email templates
export const getEmailTemplate = (type) => api.get(`/admin/email-templates/${type}`)

export const saveEmailTemplate = (type, data) => api.put(`/admin/email-templates/${type}`, data)
