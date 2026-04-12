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

// contests
export const getUpcomingContests = () => api.get('/contests/upcoming')

// admin – users
export const getUsers = () => api.get('/admin/users')

export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data)

export const deleteUser = (id) => api.delete(`/admin/users/${id}`)

// admin – smtp
export const getSmtp = () => api.get('/admin/smtp')

export const saveSmtp = (data) => api.put('/admin/smtp', data)

export const testSmtp = () => api.post('/admin/smtp/test')

// admin – remind
export const triggerReminder = () => api.post('/admin/remind/trigger')
