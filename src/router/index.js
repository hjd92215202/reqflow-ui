import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  { path: '/', redirect: '/login' },
  { 
    path: '/login', 
    component: () => import('@/views/Login.vue') 
  },
  { 
    // 统一全局骨架布局路由
    path: '/', 
    component: () => import('@/views/MainLayout.vue'),
    redirect: '/requirements',
    children: [
      { 
        path: 'requirements', 
        component: () => import('@/views/RequirementList.vue') 
      },
      { 
        path: 'matrix', 
        component: () => import('@/views/WorkMatrix.vue') 
      }
    ]
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