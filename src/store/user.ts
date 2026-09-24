// src/store/user.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const nickname = ref<string>(localStorage.getItem('nickname') || '')
  // 保存用户自定义的私有化后端地址
  const serverUrl = ref<string>(localStorage.getItem('serverUrl') || '')

  // 单独更新并持久化服务器地址
  function setServerUrl(url: string | null | undefined): void {
    if (url && url.trim()) {
      // 自动清理末尾多余的斜杠，例如：http://1.2.3.4:8080/ -> http://1.2.3.4:8080
      serverUrl.value = url.trim().replace(/\/$/, '')
      localStorage.setItem('serverUrl', serverUrl.value)
    } else {
      serverUrl.value = ''
      localStorage.removeItem('serverUrl')
    }
  }

  function setUserInfo(userToken: string, userNickname: string, url?: string): void {
    token.value = userToken
    nickname.value = userNickname
    if (url) {
      setServerUrl(url)
    }
    localStorage.setItem('token', userToken)
    localStorage.setItem('nickname', userNickname)
  }

  function clearUserInfo(): void {
    token.value = ''
    nickname.value = ''
    // 退出登录时不清除 serverUrl，方便用户下次直接登录
    localStorage.removeItem('token')
    localStorage.removeItem('nickname')
  }

  return {
    token,
    nickname,
    serverUrl,
    setServerUrl,
    setUserInfo,
    clearUserInfo
  }
})
