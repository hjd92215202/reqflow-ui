import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const request = axios.create({
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(config => {
  const userStore = useUserStore()
  
  // 核心逻辑：动态拼接自定义后端地址
  if (userStore.serverUrl) {
    // 如果 config.url 是 '/api/xxx'，拼接后变成 'http://ip:port/api/xxx'
    config.baseURL = userStore.serverUrl
  }

  if (userStore.token) {
    config.headers['Authorization'] = `Bearer ${userStore.token}`
  }
  return config;
}, error => {
  return Promise.reject(error)
})

// 响应拦截器
request.interceptors.response.use(response => {
  return response.data; // 直接返回业务数据
}, error => {
  const userStore = useUserStore()
  if (error.response && error.response.status === 401) {
    userStore.clearUserInfo()
    ElMessage.error('会话已过期，请重新登录')
    window.location.hash = '#/login'
  } else {
    ElMessage.error(error.response?.data || '服务器响应异常')
  }
  return Promise.reject(error)
})

export default request