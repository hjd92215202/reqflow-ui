// src/router/index.ts
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    // 切换到特性驱动模块
    component: () => import('@/features/auth/index.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/requirements',
    children: [
      {
        path: 'todos',
        name: 'Todos',
        component: () => import('@/features/todo/index.vue')
      },
      {
        path: 'requirements',
        name: 'Requirements',
        component: () => import('@/features/requirement/index.vue')
      },
      {
        path: 'matrix',
        name: 'Matrix',
        component: () => import('@/features/matrix/index.vue')
      },
      {
        path: 'wiki',
        name: 'Wiki',
        component: () => import('@/features/wiki/index.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  if (to.path !== '/login' && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
