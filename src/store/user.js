// src/store/user.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const nickname = ref(localStorage.getItem('nickname') || '')
  // 保存用户自定义的后端地址
  const serverUrl = ref(localStorage.getItem('serverUrl') || '')

  // 单独更新并持久化服务器地址
  function setServerUrl(url) {
    if (url) {
      // 自动清理末尾的斜杠，如 http://1.2.3.4:8080/ -> http://1.2.3.4:8080
      serverUrl.value = url.trim().replace(/\/$/, '')
      localStorage.setItem('serverUrl', serverUrl.value)
    } else {
      serverUrl.value = ''
      localStorage.removeItem('serverUrl')
    }
  }

  function setUserInfo(userToken, userNickname, url) {
    token.value = userToken
    nickname.value = userNickname
    if (url) {
      setServerUrl(url)
    }
    localStorage.setItem('token', userToken)
    localStorage.setItem('nickname', userNickname)
  }

  function clearUserInfo() {
    token.value = ''
    nickname.value = ''
    // 退出登录时不清除 serverUrl，方便用户下次直接输入账密登录
    localStorage.removeItem('token')
    localStorage.removeItem('nickname')
  }

  return { token, nickname, serverUrl, setServerUrl, setUserInfo, clearUserInfo }
})