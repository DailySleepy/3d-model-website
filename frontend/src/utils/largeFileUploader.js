import axios from 'axios'
import SparkMD5 from 'spark-md5'
import { uploadApi } from '@/api'

export class LargeFileUploader {
  constructor({ file, chunkSize = 5 * 1024 * 1024, maxConcurrency = 3, maxRetries = 2, onProgress, onStatusChange }) {
    this.file = file
    this.chunkSize = chunkSize
    this.maxConcurrency = maxConcurrency
    this.maxRetries = maxRetries
    this.onProgress = onProgress || (() => {})
    this.onStatusChange = onStatusChange || (() => {})

    this.fileHash = ''
    this.chunks = []
    this.chunkProgressMap = {}
    this.status = 'idle' // idle, hashing, uploading, paused, success, error, cancelled

    this.activeRequests = new Map() // 用于存放当前并发执行的 cancelToken 映射 { index: cancelSource }
    this.retryingChunks = new Set() // 记录正在等待延时重试的 chunk index
    this.maxPercent = 0
    this.resolvePromise = null
    this.rejectPromise = null
  }

  #createChunks() {
    const chunks = []
    let cur = 0
    while (cur < this.file.size) {
      chunks.push({
        file: this.file.slice(cur, cur + this.chunkSize),
        index: chunks.length
      })
      cur += this.chunkSize
    }
    this.chunks = chunks
  }

  #calculateHash() {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      let count = 0

      const loadNext = (index) => {
        if (this.status === 'cancelled') {
          reject(new Error('CANCELLED'))
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          count++
          spark.append(e.target.result)

          if (count === this.chunks.length) {
            resolve(spark.end())
          } else {
            const percent = Math.round((count / this.chunks.length) * 100)
            this.#changeStatus('hashing', `分析文件指纹中: ${percent}%`)
            loadNext(count)
          }
        }
        reader.onerror = () => {
          reject(new Error('文件指纹计算失败，读取文件错误'))
        }
        reader.readAsArrayBuffer(this.chunks[index].file)
      }
      loadNext(0)
    })
  }

  #changeStatus(status, message) {
    this.status = status
    this.onStatusChange(status, message)
  }

  get #isInterrupted() {
    return this.status === 'paused' || this.status === 'cancelled' || this.status === 'error'
  }

  #updateProgress() {
    if (!this.file) return
    const loadedBytes = this.chunks.reduce((acc, chunk) => {
      const percent = this.chunkProgressMap[chunk.index] || 0
      return acc + (chunk.file.size * percent) / 100
    }, 0)

    const percent = Math.min(Math.round((loadedBytes * 100) / this.file.size), 99)
    this.maxPercent = Math.max(this.maxPercent, percent)
    this.onProgress(this.maxPercent)
  }

  #updateRetryStatusMessage() {
    if (this.status !== 'uploading') return

    if (this.retryingChunks.size === this.activeRequests.size && this.activeRequests.size > 0) {
      this.#changeStatus('uploading', '当前网络较差，正在重试...')
    } else {
      this.#changeStatus('uploading', '正在上传分片...')
    }
  }

  #uploadChunks(chunkList) {
    return new Promise((resolve, reject) => {
      const chunksToUpload = chunkList.filter(c => !c.isUploaded)

      if (chunksToUpload.length === 0) {
        resolve()
        return
      }

      let index = 0
      let finishedCount = 0

      const executeUpload = async () => {
        if (this.#isInterrupted) {
          return
        }
        if (index >= chunksToUpload.length) {
          return
        }

        const chunkData = chunksToUpload[index++]
        chunkData.retryCount = 0

        const sendRequest = async () => {
          this.retryingChunks.delete(chunkData.index)
          this.#updateRetryStatusMessage()

          const formData = new FormData()
          formData.append('file', chunkData.chunk)
          formData.append('uploadId', chunkData.fileHash)
          formData.append('chunkIndex', chunkData.index)

          const CancelToken = axios.CancelToken
          const source = CancelToken.source()
          this.activeRequests.set(chunkData.index, source)

          try {
            await uploadApi.uploadChunk(
              formData,
              (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                this.chunkProgressMap[chunkData.index] = percent
                this.#updateProgress()
              },
              source.token
            )

            this.activeRequests.delete(chunkData.index)
            this.retryingChunks.delete(chunkData.index)
            this.#updateRetryStatusMessage()
            finishedCount++

            if (finishedCount === chunksToUpload.length) {
              resolve()
            } else {
              await executeUpload()
            }
          } catch (err) {
            if (axios.isCancel(err)) {
              return
            }

            const isRetryable = !err.response || (err.response.status >= 500 || err.response.status === 0 || err.code === 'ECONNABORTED')

            if (isRetryable && chunkData.retryCount < this.maxRetries) {
              chunkData.retryCount++

              const delay = Math.pow(2, chunkData.retryCount) * 1000 + Math.random() * 2000

              this.retryingChunks.add(chunkData.index)
              this.#updateRetryStatusMessage()

              await new Promise(resolveDelay => setTimeout(resolveDelay, delay))

              if (this.#isInterrupted) {
                this.activeRequests.delete(chunkData.index)
                this.retryingChunks.delete(chunkData.index)
                return
              }

              await sendRequest()
            } else {
              this.#changeStatus('error', err.message || '上传异常')
              this.activeRequests.delete(chunkData.index)
              this.activeRequests.forEach(s => s.cancel('ERROR'))
              this.activeRequests.clear()
              this.retryingChunks.clear()

              reject(err)
            }
          }
        }

        await sendRequest()
      }

      const limit = Math.min(this.maxConcurrency, chunksToUpload.length)
      for (let i = 0; i < limit; i++) {
        executeUpload()
      }
    })
  }

  async #processUploadFlow(data) {
    if (this.#isInterrupted) {
      return
    }

    if (data.isExist) {
      this.#changeStatus('success', '上传成功 (重复文件秒传)')
      this.onProgress(100)
      this.resolvePromise(data.fileUrl)
      return
    }

    this.#updateProgress()
    this.#changeStatus('uploading', '正在上传分片...')

    await this.#uploadChunks(this.chunkList)

    if (this.status === 'uploading') {
      this.#changeStatus('uploading', '分片上传完成，正在合并文件...')
      const mergeRes = await uploadApi.mergeUpload(this.fileHash)
      this.#changeStatus('success', '上传成功')
      this.onProgress(100)
      this.resolvePromise(mergeRes.data)
    }
  }

  #initChunkList(uploadedChunks) {
    this.chunkList = this.chunks.map(({ file, index }) => {
      const chunkName = `${this.fileHash}-${index}`
      const isUploaded = uploadedChunks.includes(index)

      this.chunkProgressMap[index] = isUploaded ? 100 : 0

      return {
        fileHash: this.fileHash,
        chunk: file,
        index,
        chunkName,
        size: file.size,
        isUploaded
      }
    })
  }

  #handleError(err) {
    if (this.status === 'paused') {
      this.rejectPromise(new Error('PAUSED'))
    } else if (this.status === 'cancelled') {
      this.rejectPromise(new Error('CANCELLED'))
    } else {
      this.#changeStatus('error', err.message || '上传异常')
      this.rejectPromise(err)
    }
  }

  async #resumeUploadFlow() {
    try {
      const { data } = await uploadApi.initUpload(this.fileHash, this.file.name, this.file.size, this.chunks.length)
      if (this.status === 'cancelled') {
        this.rejectPromise(new Error('CANCELLED'))
        return
      }

      const uploadedChunks = data.uploadedChunks || []

      this.chunkList.forEach(chunk => {
        const isUploaded = uploadedChunks.includes(chunk.index)
        chunk.isUploaded = isUploaded
        this.chunkProgressMap[chunk.index] = isUploaded ? 100 : 0
      })

      await this.#processUploadFlow(data)
    } catch (err) {
      this.#handleError(err)
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject

      // 如果被暂停后恢复，不用重新切片和计算 Hash，直接走恢复流
      if (this.status === 'paused' && this.fileHash && this.chunks.length > 0) {
        this.#changeStatus('uploading', '正在恢复上传...')
        this.#resumeUploadFlow()
        return
      }

      this.#changeStatus('hashing', '正在准备分析文件...')

      // 进行全新分片与 Hash 计算
      this.#createChunks()
      this.#calculateHash()
        .then(hash => {
          this.fileHash = hash
          this.#changeStatus('uploading', '正在连接服务器预检...')
          return uploadApi.initUpload(hash, this.file.name, this.file.size, this.chunks.length)
        })
        .then(async ({ data }) => {
          this.#initChunkList(data.uploadedChunks || [])
          await this.#processUploadFlow(data)
        })
        .catch(err => {
          this.#handleError(err)
        })
    })
  }

  pause() {
    if (this.status !== 'uploading') return

    this.#changeStatus('paused', '已暂停上传')

    this.activeRequests.forEach((source) => {
      source.cancel('PAUSED')
    })
    this.activeRequests.clear()
    this.retryingChunks.clear()

    if (this.rejectPromise) {
      this.rejectPromise(new Error('PAUSED'))
    }
  }

  destroy() {
    this.#changeStatus('cancelled', '已取消上传')

    this.activeRequests.forEach((source) => {
      source.cancel('CANCELLED')
    })
    this.activeRequests.clear()

    this.chunks = []
    this.chunkList = []
    this.chunkProgressMap = {}
    this.retryingChunks.clear()
    this.maxPercent = 0
    this.file = null

    if (this.rejectPromise) {
      this.rejectPromise(new Error('CANCELLED'))
    }
  }
}
