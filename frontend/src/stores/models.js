import { defineStore } from 'pinia'
import api from '@/api' // Axios实例

export const useModelsStore = defineStore('models', {
  state: () => ({
    models: []
  }),
  actions: {
    async fetchRecommendedModels() {
      const res = await api.get('/api/models/recommend')
      this.models = res.data.models
      return this.models
    },
    async searchModels(params) {
      const res = await api.get('/api/search', { params })
      return res.data // { models, totalPages }
    },
    async fetchModelById(id) {
      const res = await api.get(`/api/models/${id}`)
      return res.data
    }
  }
})
