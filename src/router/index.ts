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
        path: 'requirements/:id',
        name: 'RequirementWorkspace',
        component: () => import('@/features/requirement-workspace/index.vue')
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

  if (to.path === '/login' && userStore.token) {
    next('/requirements')
    return
  }

  if (to.path !== '/login' && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
