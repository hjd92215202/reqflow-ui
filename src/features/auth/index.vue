<!-- src/features/auth/index.vue -->
<template>
  <div class="login-container">
    <!-- 1. 复用解耦后的独立标题栏，只在右侧提供服务器设置按钮 -->
    <TitleBar>
      <template #actions>
        <button class="control-btn" title="服务器设置" @click.stop="serverConfigVisible = true">
          <el-icon :size="13"><Setting /></el-icon>
        </button>
      </template>
    </TitleBar>

    <!-- 2. 登录/注册核心卡片 -->
    <div class="card-wrap" @mousedown.stop>
      <el-card class="login-card">
        <div class="login-header-box">
          <img src="@/assets/logo.png" class="login-main-logo" alt="ReqFlow" />
          <h2 class="title">ReqFlow</h2>
          <p class="subtitle">私有化部署 · 工作需求事项记录系统</p>
        </div>

        <el-tabs v-model="activeTab" stretch>
          <!-- 登录面板 -->
          <el-tab-pane label="账密登录" name="login">
            <el-form :model="loginForm" label-position="top">
              <el-form-item label="用户名">
                <el-input v-model="loginForm.username" placeholder="请输入用户名" />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  show-password
                  @keyup.enter="handleLogin"
                />
              </el-form-item>
              <el-form-item style="margin-top: 25px">
                <el-button
                  type="primary"
                  :loading="loading"
                  style="width: 100%"
                  @click="handleLogin"
                >
                  登 录
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 注册面板 -->
          <el-tab-pane label="注册账户" name="register">
            <el-form :model="registerForm" label-position="top">
              <el-form-item label="用户名">
                <el-input v-model="registerForm.username" placeholder="创建系统用户名" />
              </el-form-item>
              <el-form-item label="昵称">
                <el-input v-model="registerForm.nickname" placeholder="显示昵称（如：张三）" />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="设置密码"
                  show-password
                />
              </el-form-item>
              <el-form-item style="margin-top: 25px">
                <el-button
                  type="success"
                  :loading="loading"
                  style="width: 100%"
                  @click="handleRegister"
                >
                  注 册
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <!-- 底部服务器状态与快捷修改栏 -->
        <div class="server-status-bar" @click="serverConfigVisible = true">
          <span :class="['server-status-dot', { connected: Boolean(userStore.serverUrl) }]"></span>
          <span class="server-status-text">
            {{
              userStore.serverUrl ? `服务地址: ${userStore.serverUrl}` : '未配置后端地址 (点击设置)'
            }}
          </span>
        </div>
      </el-card>
    </div>

    <!-- 3. 解耦出来的服务器设置弹窗 -->
    <ServerConfigDialog v-model="serverConfigVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from './api'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import TitleBar from '@/components/layout/TitleBar.vue'
import ServerConfigDialog from './components/ServerConfigDialog.vue'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)
const serverConfigVisible = ref(false)

const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', nickname: '' })

const handleLogin = async () => {
  if (!userStore.serverUrl) {
    ElMessage.warning('请先设置服务器连接地址')
    serverConfigVisible.value = true
    return
  }
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }

  loading.value = true
  try {
    const data = await loginApi({
      username: loginForm.value.username,
      password: loginForm.value.password
    })
    userStore.setUserInfo(data.token, data.nickname, userStore.serverUrl)
    ElMessage.success('登录成功')
    router.push('/requirements')
  } catch (error) {
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!userStore.serverUrl) {
    ElMessage.warning('请先设置服务器连接地址')
    serverConfigVisible.value = true
    return
  }
  if (!registerForm.value.username || !registerForm.value.password) {
    ElMessage.warning('用户名和密码为必填项')
    return
  }

  loading.value = true
  try {
    await registerApi({
      username: registerForm.value.username,
      passwordHash: registerForm.value.password,
      nickname: registerForm.value.nickname
    })
    ElMessage.success('注册成功，请使用新账户登录')
    activeTab.value = 'login'
    loginForm.value.username = registerForm.value.username
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
  height: 100vh;
  width: 100vw;
  background-color: #f0f2f5;
  overflow: hidden;
  user-select: none;
}

.card-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 400px;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.login-header-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
}

.login-main-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
  margin-bottom: 6px;
}

.title {
  text-align: center;
  margin: 0;
  color: #409eff;
  font-size: 20px;
}

.subtitle {
  text-align: center;
  margin-top: 4px;
  margin-bottom: 16px;
  font-size: 12.5px;
  color: #909399;
}

.server-status-bar {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  transition: color 0.15s ease;
}

.server-status-bar:hover {
  color: #409eff;
}

.server-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #f56c6c;
  display: inline-block;
  flex-shrink: 0;
}

.server-status-dot.connected {
  background-color: #67c23a;
}

.server-status-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
