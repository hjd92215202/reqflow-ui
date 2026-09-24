// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  { path: '/', redirect: '/workspace' },
  { path: '/login', component: () => import('@/views/Login.vue') },
  // 免登录公开只读分享路由
  {
    path: '/share/wiki/:token',
    name: 'WikiShare',
    component: () => import('@/views/WikiShareView.vue')
  },
  {
    path: '/',
    component: () => import('@/views/MainLayout.vue'),
    redirect: '/workspace',
    children: [
      { path: 'workspace', component: () => import('@/views/WorkspaceHome.vue') },
      { path: 'requirements', component: () => import('@/views/RequirementList.vue') },
      { path: 'requirement/:id', component: () => import('@/views/RequirementWorkspace.vue') },
      { path: 'my-work', component: () => import('@/views/TodoList.vue') },
      // 保持旧路由兼容重定向
      { path: 'knowledge', redirect: '/requirements' },
      { path: 'matrix', redirect: '/requirements' }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  // 外部只读分享页面放行，不强制要求登录
  if (to.path.startsWith('/share/wiki/')) {
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
