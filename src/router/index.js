import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    component: () => import('@/views/Login.vue')
  },
  {
    // 公开只读分享页面 (免登录鉴权)
    path: '/share/wiki/:id',
    component: () => import('@/views/WikiShareView.vue')
  },
  {
    // 统一全局骨架布局路由
    path: '/',
    component: () => import('@/views/MainLayout.vue'),
    redirect: '/requirements',
    children: [
      {
        path: 'todos',
        component: () => import('@/views/TodoList.vue')
      },
      {
        path: 'requirements',
        component: () => import('@/views/RequirementList.vue')
      },
      {
        path: 'matrix',
        component: () => import('@/views/WorkMatrix.vue')
      }, 
      {
        path: 'wiki',
        component: () => import('@/views/WikiLibrary.vue')
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
  // 允许免登录直接访问公开分享链接
  if (to.path.startsWith('/share/')) {
    next()
    return
  }
  if (to.path !== '/login' && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router