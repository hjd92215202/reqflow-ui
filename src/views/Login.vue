<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="title">ReqFlow</h2>
      <p class="subtitle">私有化部署 · 工作需求事项记录系统</p>
      
      <el-tabs v-model="activeTab" stretch>
        <!-- 登录面板 -->
        <el-tab-pane label="账密登录" name="login">
          <el-form :model="loginForm" label-position="top">
            <!-- 新增：服务器地址输入框 -->
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
            <!-- 新增：服务器地址输入框 -->
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
import { ref, onMounted } from 'vue' // 新增引入 onMounted
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)

// 新增 serverUrl 字段
const loginForm = ref({ serverUrl: '', username: '', password: '' })
const registerForm = ref({ serverUrl: '', username: '', password: '', nickname: '' })

// 页面加载时，读取 Store 中缓存的上次使用的服务器地址，实现自动回显
onMounted(() => {
  if (userStore.serverUrl) {
    loginForm.value.serverUrl = userStore.serverUrl
    registerForm.value.serverUrl = userStore.serverUrl
  }
})

const handleLogin = async () => {
  if (!loginForm.value.serverUrl || !loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请填写完整的服务器地址、账号和密码')
    return
  }
  
  // 核心逻辑：发起请求前，先将用户输入的 URL 保存到 store (自动去除末尾斜杠)
  // 这样底层的 Axios 拦截器在发起此次登录请求时，立刻就能拿到最新的 URL
  userStore.serverUrl = loginForm.value.serverUrl.replace(/\/$/, '')
  
  loading.value = true
  try {
    const payload = {
      username: loginForm.value.username,
      password: loginForm.value.password
    }
    const data = await loginApi(payload)
    // 登录成功后，持久化保存 Token 和最终确认的 Server URL
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
  
  // 同理，注册前也需要指定向哪个服务器注册
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
    // 顺便把注册成功的服务器地址同步给登录面板
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
  justify-content: center;
  align-items: center;
  height: 100%; 
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
  padding: 15px;
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