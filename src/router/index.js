import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  { path: '/', redirect: '/login' },
  { 
    path: '/login', 
    component: () => import('@/views/Login.vue') 
  },
  { 
    path: '/requirements', 
    component: () => import('@/views/RequirementList.vue') 
  },
  { 
    // 替换为全新的：工作事项矩阵路由
    path: '/matrix', 
    component: () => import('@/views/WorkMatrix.vue') 
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.path !== '/login' && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router