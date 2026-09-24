// src/router/index.ts
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
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
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/requirements'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  // 1. 已登录用户访问登录页直接跳到主页
  if (to.path === '/login' && userStore.token) {
    next('/requirements')
    return
  }

  // 2. 未登录拦截至登录页
  if (to.path !== '/login' && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
