// src/api/request.js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const request = axios.create({
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const userStore = useUserStore()

    // 动态拼接自定义后端地址
    if (userStore.serverUrl) {
      config.baseURL = userStore.serverUrl
    }

    if (userStore.token) {
      config.headers['Authorization'] = `Bearer ${userStore.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    const userStore = useUserStore()
    if (error.response && error.response.status === 401) {
      userStore.clearUserInfo()
      ElMessage.error('会话已过期，请重新登录')
      window.location.hash = '#/login'
    } else {
      // 提取友好的错误信息，杜绝 [object Object]
      const resData = error.response?.data
      let message = '服务器响应异常'
      if (typeof resData === 'string') {
        message = resData
      } else if (resData && typeof resData === 'object') {
        message = resData.message || resData.msg || resData.error || JSON.stringify(resData)
      } else if (error.message) {
        message = error.message
      }
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default request
