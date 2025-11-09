import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080', // 后端地址
  timeout: 10000
})

// 请求拦截器：添加JWT token（从localStorage）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
// 导出统一API
export const modelsApi = {
  recommend: () => api.get('/api/models/recommend'),
  search: (params) => api.get('/api/search', { params }),
  getById: (id) => api.get(`/api/models/${id}`)
}
