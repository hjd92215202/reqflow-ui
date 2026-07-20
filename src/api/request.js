import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const request = axios.create({
  baseURL: '', // 留空，以便通过 vite.config 中的 proxy 转发代理
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(config => {
  const userStore = useUserStore()
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