<template>
  <div class="login-shell">
    <div class="login-brand">
      <img src="@/assets/logo.png" />
      <div><strong>ReqFlow</strong><span>ENGINEERING WORKSPACE</span></div>
    </div>
    <div class="login-card">
      <div class="intro">
        <div class="logo-mark"><img src="@/assets/logo.png" /></div>
        <h1>欢迎回来</h1>
        <p>连接你的私有化工作空间，继续推进需求。</p>
      </div>
      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button
        ><button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>
      <el-form
        v-if="mode === 'login'"
        :model="login"
        label-position="top"
        @submit.prevent="submitLogin"
        ><el-form-item label="用户名"
          ><el-input v-model="login.username" placeholder="请输入用户名" /></el-form-item
        ><el-form-item label="密码"
          ><el-input
            v-model="login.password"
            type="password"
            show-password
            placeholder="请输入密码"
            @keyup.enter="submitLogin" /></el-form-item
        ><el-button type="primary" class="submit" :loading="loading" @click="submitLogin"
          >进入工作空间</el-button
        ></el-form
      ><el-form v-else :model="register" label-position="top"
        ><el-form-item label="用户名"><el-input v-model="register.username" /></el-form-item
        ><el-form-item label="昵称"><el-input v-model="register.nickname" /></el-form-item
        ><el-form-item label="密码"
          ><el-input v-model="register.password" type="password" show-password /></el-form-item
        ><el-button type="primary" class="submit" :loading="loading" @click="submitRegister"
          >创建账户</el-button
        ></el-form
      >
      <div class="server">
        <span class="dot" :class="{ on: !!userStore.serverUrl }"></span>
        <div>
          <strong>{{ userStore.serverUrl ? '已连接私有节点' : '尚未配置服务端' }}</strong
          ><small>{{ userStore.serverUrl || '点击设置一个后端地址' }}</small>
        </div>
        <el-button text @click="serverVisible = true">设置</el-button>
      </div>
    </div>
    <el-dialog v-model="serverVisible" title="服务端连接" width="430px"
      ><el-form label-position="top"
        ><el-form-item label="Server URL"
          ><el-input
            v-model="serverUrl"
            placeholder="http://192.168.1.100:8080"
            @keyup.enter="saveServer" /></el-form-item></el-form
      ><template #footer
        ><el-button @click="serverVisible = false">取消</el-button
        ><el-button type="primary" @click="saveServer">保存</el-button></template
      ></el-dialog
    >
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loginApi, registerApi } from '@/api/auth'
import { useUserStore } from '@/store/user'
const router = useRouter(),
  userStore = useUserStore(),
  mode = ref('login'),
  loading = ref(false),
  serverVisible = ref(false),
  serverUrl = ref(userStore.serverUrl || ''),
  login = ref({ username: '', password: '' }),
  register = ref({ username: '', password: '', nickname: '' })
const saveServer = () => {
  if (!serverUrl.value.trim()) return
  userStore.setServerUrl(serverUrl.value)
  serverVisible.value = false
  ElMessage.success('服务端已保存')
}
const submitLogin = async () => {
  if (!userStore.serverUrl) {
    serverVisible.value = true
    return
  }
  if (!login.value.username || !login.value.password) return ElMessage.warning('请填写用户名和密码')
  loading.value = true
  try {
    const data = await loginApi(login.value)
    userStore.setUserInfo(data.token, data.nickname, userStore.serverUrl)
    router.push('/workspace')
  } catch {
  } finally {
    loading.value = false
  }
}
const submitRegister = async () => {
  if (!userStore.serverUrl) {
    serverVisible.value = true
    return
  }
  loading.value = true
  try {
    await registerApi({
      username: register.value.username,
      passwordHash: register.value.password,
      nickname: register.value.nickname
    })
    ElMessage.success('账户创建成功')
    login.value.username = register.value.username
    mode.value = 'login'
  } catch {
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.login-shell {
  height: 100%;
  background: radial-gradient(circle at 20% 15%, #f0f3ff 0, #f6f7f9 28%, #f6f7f9 100%);
  display: grid;
  place-items: center;
  position: relative;
}
.login-brand {
  position: absolute;
  left: 28px;
  top: 24px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.login-brand img {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}
.login-brand strong {
  display: block;
  font-size: 13px;
}
.login-brand span {
  display: block;
  color: var(--rf-text-3);
  font-size: 8px;
  letter-spacing: 1px;
  margin-top: 2px;
}
.login-card {
  width: 390px;
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 20px 50px rgba(20, 28, 40, 0.09);
}
.intro {
  text-align: center;
}
.logo-mark {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--rf-brand-soft);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
.logo-mark img {
  width: 26px;
  height: 26px;
}
.intro h1 {
  font-size: 21px;
  margin: 0;
}
.intro p {
  margin: 6px 0 20px;
  font-size: 12px;
  color: var(--rf-text-2);
}
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--rf-subtle);
  padding: 3px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.tabs button {
  border: 0;
  background: transparent;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--rf-text-2);
  cursor: pointer;
}
.tabs button.active {
  background: #fff;
  color: var(--rf-text);
  box-shadow: 0 1px 4px rgba(20, 28, 40, 0.06);
}
.submit {
  width: 100%;
  margin-top: 6px;
  height: 40px;
}
.server {
  margin-top: 20px;
  padding: 10px 11px;
  border: 1px solid var(--rf-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
}
.server .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #cbd0d7;
}
.server .dot.on {
  background: var(--rf-success);
  box-shadow: 0 0 0 4px var(--rf-success-soft);
}
.server div {
  flex: 1;
  min-width: 0;
}
.server strong,
.server small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.server strong {
  font-size: 10px;
}
.server small {
  font-size: 9px;
  color: var(--rf-text-3);
  margin-top: 2px;
}
</style>
