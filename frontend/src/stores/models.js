// stores/models.js
import { defineStore } from 'pinia'
import api from '@/api' // Axios实例

export const useModelsStore = defineStore('models', {
  state: () => ({
    models: [],
    users: [],
  }),
  actions: {
    async fetchRecommendedModels() {
      const res = await api.get('/api/models/recommend')
      this.models = res.data.models
      return this.models
    },
    async fetchRecommendedUsers() {
      const res = await api.get('/api/users/recommend')
      this.users = res.data.users
      return this.users
    },
    async fetchLatestModels(limit = 20) {
      const res = await api.get('/api/search', {
        params: {
          q: '',
          type: 'model',
          sort: 'time',
          page: 1,
          pageSize: limit
        }
      })
      this.models = res.data?.items || []
      return this.models
    },
    async fetchLatestUsers(limit = 5) {
      const res = await api.get('/api/search', {
        params: {
          q: '',
          type: 'author',
          sort: 'time',
          page: 1,
          pageSize: limit
        }
      })
      this.users = res.data?.items || []
      return this.users
    },
    async searchModels(params) {
      const res = await api.get('/api/search', { params })
      return res.data // { models, totalPages }
    },
    async fetchModelById(id) {
      const res = await api.get(`/api/models/${id}`)
      return res.data
    },
    async toggleLike(modelId) {
      return await api.post(`/api/models/${modelId}/like`)
    },
    async toggleCollect(modelId) {
      return await api.post(`/api/models/${modelId}/collect`)
    },
    async postComment(payload) {
      return await api.post('/api/comments', payload)
    },
    async fetchComments(modelId, page = 1, size = 10) {
      return await api.get('/api/comments', { params: { modelId, page, size }})
    },
  }
})
