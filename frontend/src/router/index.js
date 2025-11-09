import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import SearchResult from '@/views/SearchResult.vue'
import ModelDetail from '@/views/ModelDetail.vue'
// TODO: 添加其他路由

const routes = [
  { path: '/', component: HomePage },
  { path: '/search', component: SearchResult },
  { path: '/model/:id', component: ModelDetail }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
