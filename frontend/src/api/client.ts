import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 180000, // 3 min — image generation can be slow on first request
})

// ── Types ─────────────────────────────────────────────────────
export interface GenerateRequest {
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  steps?: number
  guidance_scale?: number
  seed?: number
  model?: 'sdxl' | 'sd21'
  enhance_prompt?: boolean
}

export interface ImageRecord {
  id: number
  filename: string
  url: string
  prompt: string
  negative_prompt: string
  model: string
  width: number
  height: number
  steps: number
  guidance_scale: number
  seed: number
  mode: string
  generation_time: number
  rating: number
  is_favourite: boolean
  created_at: string
}

export interface PromptRecord {
  id: number
  title: string
  prompt: string
  negative_prompt: string
  tags: string
  use_count: number
  created_at: string
}

export interface StatsRecord {
  total_images: number
  total_prompts: number
  favourite_count: number
  avg_rating: number
  models_used: Record<string, number>
}

export interface HealthRecord {
  status: string
  token_ok: boolean
  message: string
}

// ── API calls ─────────────────────────────────────────────────
export const generateImage = (req: GenerateRequest) =>
  api.post<ImageRecord>('/generate', req).then(r => r.data)

export const getGallery = (favouritesOnly = false) =>
  api.get<ImageRecord[]>(`/gallery?favourites_only=${favouritesOnly}`).then(r => r.data)

export const deleteImage = (id: number) =>
  api.delete(`/gallery/${id}`).then(r => r.data)

export const rateImage = (id: number, rating: number) =>
  api.patch(`/gallery/${id}/rate`, { rating }).then(r => r.data)

export const toggleFavourite = (id: number) =>
  api.patch(`/gallery/${id}/favourite`).then(r => r.data)

export const getStats = () =>
  api.get<StatsRecord>('/stats').then(r => r.data)

export const getHealth = () =>
  api.get<HealthRecord>('/health').then(r => r.data)

export const savePrompt = (data: { title: string; prompt: string; negative_prompt?: string; tags?: string }) =>
  api.post<PromptRecord>('/prompts', data).then(r => r.data)

export const getPrompts = () =>
  api.get<PromptRecord[]>('/prompts').then(r => r.data)

export const deletePrompt = (id: number) =>
  api.delete(`/prompts/${id}`).then(r => r.data)

export default api
