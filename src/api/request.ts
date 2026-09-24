// src/api/request.ts
import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useWorkspaceStore } from '@/store/workspace'

// 1. 创建基础 Axios 实例
const service = axios.create({
  timeout: 10000
})

// 2. 请求拦截器
service.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    const workspaceStore = useWorkspaceStore()

    // 动态拼接私有化自托管服务器 BaseURL
    if (userStore.serverUrl) {
      config.baseURL = userStore.serverUrl
    }

    // 注入 JWT 令牌
    if (userStore.token) {
      config.headers['Authorization'] = `Bearer ${userStore.token}`
    }

    // v2.0 增量：全局请求头透传当前项目集 ID（如果已选中）
    if (workspaceStore.activeProjectId) {
      config.headers['X-Project-Id'] = String(workspaceStore.activeProjectId)
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 3. 响应拦截器
service.interceptors.response.use(
  response => {
    // 后端直出业务数据，直接解包返回
    return response.data
  },
  error => {
    const userStore = useUserStore()
    if (error.response && error.response.status === 401) {
      userStore.clearUserInfo()
      ElMessage.error('会话已过期，请重新登录')
      window.location.hash = '#/login'
    } else {
      ElMessage.error(error.response?.data || '服务器响应异常')
    }
    return Promise.reject(error)
  }
)

// 4. 强类型泛型接口封装（100% 兼容既有调用语法）
interface CustomRequest {
  <T = any>(config: AxiosRequestConfig): Promise<T>
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
}

const request = ((config: AxiosRequestConfig) => {
  return service(config)
}) as CustomRequest

request.get = (url, config) => service.get(url, config)
request.post = (url, data, config) => service.post(url, data, config)
request.put = (url, data, config) => service.put(url, data, config)
request.delete = (url, config) => service.delete(url, config)
request.patch = (url, data, config) => service.patch(url, data, config)

export default request
