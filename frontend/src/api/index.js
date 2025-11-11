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


// 以下代码为测试用API，来源于基于Apifox创建的接口

const testApi = axios.create({
  baseURL: 'https://v3pz.itndedu.com/v3pz', 
  timeout: 10000
})
//登录请求需要额外参数
testApi.interceptors.request.use(config => {
  if (config.url === '/login') {
    config.headers.terminal = 'h5'
  }
  return config
})
//处理响应与错误
testApi.interceptors.response.use(response => {
  const data = response.data
  if (data.code === 10000) {
    return data
  } else {
      // 如果code不是10000，抛出错误（错误信息将在Store层格式化）
      const message = data.msg || data.message ||data.message?.msg || '请求失败'
      const error = new Error(message)
      // 保存原始错误信息（来自API响应的错误消息）
      error.originalMessage = message
      return Promise.reject(error)
    }
  }
)
//统一封装接口
export const AuthApi = {
  getCode: (tel) => testApi.post('/get/code', { tel }),
  verifyCode: (userName, passWord, validCode) => testApi.post('/user/authentication', { userName, passWord, validCode }),
  Login: (userName, passWord) => testApi.post('/login', { userName, passWord })
}