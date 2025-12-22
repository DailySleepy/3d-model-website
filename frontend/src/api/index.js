import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

// 认证
export const authApi = {
  login: (payload) => api.post('/api/auth/login', payload), // {identifier,password}
  sendCode: (email) => api.post('/api/auth/send-code', { email }),
  register: (payload) => api.post('/api/auth/register', payload), // {email,username,password,code}
  forgot: (email) => api.post('/api/auth/forgot', { email }),
  resetPassword: (payload) => api.post('/api/auth/reset', payload) // {email,newPassword}
}

// 用户
export const userApi = {
  getById: (id) => api.get(`/api/users/${id}`)
}

// 关注
export const followApi = {
  follow: (userId) => api.post(`/api/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/api/users/${userId}/follow`)
}

// 用户设置
export const userSettingsApi = {
  updateAll: (userId, payload) => 
    api.patch('/api/settings/user', payload, { params: { userId } }),
  updateUsername: (userId, username) =>
    api.patch('/api/settings/user/username', { username }, { params: { userId } }),
  updateEmail: (userId, email) => 
    api.patch('/api/settings/user/email', { email }, { params: { userId } }),
  updateAvatar: (userId, avatar) => 
    api.patch('/api/settings/user/avatar', { avatar }, { params: { userId } }),
  updateBio: (userId, bio) => 
    api.patch('/api/settings/user/bio', { bio }, { params: { userId } }),
  changePassword: (userId, payload) =>
    api.post('/api/settings/user/password', payload, { params: { userId } }),
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/settings/user/avatar/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// 模型
export const modelsApi = {
  publish: (payload) => api.post('/api/models', payload),
  listByAuthor: (authorId) => api.get('/api/models', { params: { authorId } }),
  getById: (id) => api.get(`/api/models/${id}`),
  toggleLike: (id) => api.post(`/api/models/${id}/like`),
  toggleCollect: (id) => api.post(`/api/models/${id}/collect`),
  search: (params) => api.get('/api/search', { params })
}

// 上传
export const uploadApi = {
  uploadThumbnail: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/upload/thumbnail', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadPreviews: (files) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return api.post('/api/upload/previews', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadModel: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/upload/model', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}
