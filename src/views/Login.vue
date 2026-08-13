<template>
  <div class="login-container" data-tauri-drag-region @mousedown="startDrag">
    <!-- 顶部登录页极简控制栏 -->
    <div class="login-titlebar" data-tauri-drag-region @mousedown="startDrag">
      <div class="titlebar-brand" data-tauri-drag-region @mousedown="startDrag">
        <span class="brand-logo">🌊</span>
        <span class="brand-title">ReqFlow</span>
      </div>
      <div class="titlebar-controls" @mousedown.stop>
        <button class="control-btn" @click.stop="minimizeWindow" title="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="currentColor" d="M1 5h8v1H1z" />
          </svg>
        </button>
        <button class="control-btn close-btn" @click.stop="closeWindow" title="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="currentColor" d="M1.707 1 1 1.707 4.293 5 1 8.293 1.707 9 5 5.707 8.293 9 9 8.293 5.707 5 9 1.707 8.293 1 5 4.293z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 登录卡片 (@mousedown.stop 阻止冒泡，避免在卡片内打字和点输入框时触发拖拽) -->
    <el-card class="login-card" @mousedown.stop>
      <h2 class="title">ReqFlow</h2>
      <p class="subtitle">私有化部署 · 工作需求事项记录系统</p>
      
      <el-tabs v-model="activeTab" stretch>
        <!-- 登录面板 -->
        <el-tab-pane label="账密登录" name="login">
          <el-form :model="loginForm" label-position="top">
            <el-form-item label="服务器地址 (Server URL)">
              <el-input v-model="loginForm.serverUrl" placeholder="例如: http://192.168.1.100:8080" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-form-item style="margin-top: 25px;">
              <el-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%;">连 接 并 登 录</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 注册面板 -->
        <el-tab-pane label="注册账户" name="register">
          <el-form :model="registerForm" label-position="top">
            <el-form-item label="服务器地址 (Server URL)">
              <el-input v-model="registerForm.serverUrl" placeholder="例如: http://192.168.1.100:8080" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="registerForm.username" placeholder="创建系统用户名" />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="registerForm.nickname" placeholder="显示昵称（如：张三）" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="registerForm.password" type="password" placeholder="设置密码" show-password />
            </el-form-item>
            <el-form-item style="margin-top: 25px;">
              <el-button type="success" :loading="loading" @click="handleRegister" style="width: 100%;">注 册</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { getCurrentWindow } from '@tauri-apps/api/window'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)

const loginForm = ref({ serverUrl: '', username: '', password: '' })
const registerForm = ref({ serverUrl: '', username: '', password: '', nickname: '' })

// 页面加载时自动回显历史服务器地址
onMounted(() => {
  if (userStore.serverUrl) {
    loginForm.value.serverUrl = userStore.serverUrl
    registerForm.value.serverUrl = userStore.serverUrl
  }
})

// ----------------- Tauri 窗口控制与原生拖拽 -----------------
const startDrag = async (e) => {
  if (e.button === 0) { // 仅左键拖拽
    try {
      const appWindow = getCurrentWindow()
      await appWindow.startDragging()
    } catch (err) {}
  }
}

const minimizeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.minimize()
  } catch (err) {}
}

const closeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.close()
  } catch (err) {}
}

// ----------------- 登录 / 注册业务逻辑 -----------------
const handleLogin = async () => {
  if (!loginForm.value.serverUrl || !loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请填写完整的服务器地址、账号和密码')
    return
  }
  
  userStore.serverUrl = loginForm.value.serverUrl.replace(/\/$/, '')
  
  loading.value = true
  try {
    const payload = {
      username: loginForm.value.username,
      password: loginForm.value.password
    }
    const data = await loginApi(payload)
    userStore.setUserInfo(data.token, data.nickname, userStore.serverUrl)
    ElMessage.success('连接并登录成功')
    router.push('/requirements')
  } catch (error) {
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.value.serverUrl || !registerForm.value.username || !registerForm.value.password) {
    ElMessage.warning('服务器地址、用户名和密码为必填项')
    return
  }
  
  userStore.serverUrl = registerForm.value.serverUrl.replace(/\/$/, '')
  
  loading.value = true
  try {
    const payload = {
      username: registerForm.value.username,
      passwordHash: registerForm.value.password, 
      nickname: registerForm.value.nickname
    }
    await registerApi(payload)
    ElMessage.success('注册成功，请使用新账户登录')
    activeTab.value = 'login'
    loginForm.value.username = registerForm.value.username
    loginForm.value.serverUrl = registerForm.value.serverUrl
  } catch (error) {
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: #f0f2f5;
  position: relative;
  overflow: hidden;
  user-select: none;
}

/* 顶部独立拖拽控制栏 */
.login-titlebar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 0 12px;
  z-index: 100;
}

.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
}

.brand-logo {
  font-size: 14px;
}

.brand-title {
  letter-spacing: 0.5px;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  height: 100%;
}

.control-btn {
  width: 42px;
  height: 100%;
  border: none;
  background: transparent;
  color: #5f5e5b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.control-btn:hover {
  background-color: rgba(55, 53, 47, 0.08);
  color: #37352f;
}

.control-btn.close-btn:hover {
  background-color: #e81123;
  color: #ffffff;
}

/* 登录卡片 */
.login-card {
  width: 400px;
  padding: 15px;
  z-index: 10;
  cursor: default;
}

.title {
  text-align: center;
  margin: 0;
  color: #409EFF;
}

.subtitle {
  text-align: center;
  margin-top: 5px;
  margin-bottom: 25px;
  font-size: 13px;
  color: #909399;
}
</style>