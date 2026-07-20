import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const nickname = ref(localStorage.getItem('nickname') || '')

  function setUserInfo(userToken, userNickname) {
    token.value = userToken
    nickname.value = userNickname
    localStorage.setItem('token', userToken)
    localStorage.setItem('nickname', userNickname)
  }

  function clearUserInfo() {
    token.value = ''
    nickname.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('nickname')
  }

  return { token, nickname, setUserInfo, clearUserInfo }
})