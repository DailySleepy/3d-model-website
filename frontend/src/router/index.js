import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import SearchResult from '@/views/SearchResult.vue'
import ModelDetail from '@/views/ModelDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/search',
    name: 'Search',
    component: SearchResult
  },
  {
    path: '/model/:id',
    name: 'ModelDetail',
    component: ModelDetail
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('@/views/UploadPage.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue')
  },
  {
    path: '/user/:id',
    name: 'UserProfile',
    component: () => import('@/views/UserProfile.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
