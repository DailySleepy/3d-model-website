import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import SearchResult from '@/views/SearchResult.vue'
import ModelDetail from '@/views/ModelDetail.vue'
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import UserSettingsPage from '@/views/UserSettingsPage.vue'
import UserPage from '@/views/UserPage.vue'
// TODO: 添加其他路由

const routes = [
  { path: '/', component: HomePage },
  { path: '/search', component: SearchResult },
  { path: '/model/:id', component: ModelDetail },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/user', component: UserPage },
  { path: '/user/settings', component: UserSettingsPage }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
