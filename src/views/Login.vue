<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="title">ReqFlow</h2>
      <p class="subtitle">工作需求事项记录与统计系统</p>
      
      <el-tabs v-model="activeTab" stretch>
        <!-- 登录面板 -->
        <el-tab-pane label="账密登录" name="login">
          <el-form :model="loginForm" label-position="top">
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password />
            </el-form-item>
            <el-form-item style="margin-top: 25px;">
              <el-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%;">登 录</el-button>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)

const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', nickname: '' })

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请填写完整的账号和密码')
    return
  }
  loading.value = true
  try {
    const data = await loginApi(loginForm.value)
    userStore.setUserInfo(data.token, data.nickname)
    ElMessage.success('登录成功')
    router.push('/requirements')
  } catch (error) {
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.value.username || !registerForm.value.password) {
    ElMessage.warning('用户名和密码为必填项')
    return
  }
  loading.value = true
  try {
    // 注册时，将前端输入的原始密码传给后端，后端负责进行 Bcrypt 哈希存储
    const payload = {
      username: registerForm.value.username,
      passwordHash: registerForm.value.password, // 后端注册入参映射 passwordHash 字段
      nickname: registerForm.value.nickname
    }
    await registerApi(payload)
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
  justify-content: center;
  align-items: center;
  height: 100%; /* 核心修改：将 100vh 替换为 100% */
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