import { create } from 'zustand'
import type { ImageRecord } from '../api/client'

type Tab = 'generate' | 'gallery' | 'prompts' | 'about'

interface StudioStore {
  // Navigation
  activeTab: Tab
  setActiveTab: (tab: Tab) => void

  // Generation state
  isGenerating: boolean
  setGenerating: (v: boolean) => void
  lastGenerated: ImageRecord | null
  setLastGenerated: (img: ImageRecord | null) => void

  // Gallery
  gallery: ImageRecord[]
  setGallery: (imgs: ImageRecord[]) => void
  addToGallery: (img: ImageRecord) => void
  removeFromGallery: (id: number) => void
  updateGalleryItem: (img: ImageRecord) => void

  // Selected image (for detail view)
  selectedImage: ImageRecord | null
  setSelectedImage: (img: ImageRecord | null) => void
}

export const useStore = create<StudioStore>((set) => ({
  activeTab: 'generate',
  setActiveTab: (tab) => set({ activeTab: tab }),

  isGenerating: false,
  setGenerating: (v) => set({ isGenerating: v }),
  lastGenerated: null,
  setLastGenerated: (img) => set({ lastGenerated: img }),

  gallery: [],
  setGallery: (imgs) => set({ gallery: imgs }),
  addToGallery: (img) => set((s) => ({ gallery: [img, ...s.gallery] })),
  removeFromGallery: (id) =>
    set((s) => ({ gallery: s.gallery.filter((i) => i.id !== id) })),
  updateGalleryItem: (img) =>
    set((s) => ({
      gallery: s.gallery.map((i) => (i.id === img.id ? img : i)),
    })),

  selectedImage: null,
  setSelectedImage: (img) => set({ selectedImage: img }),
}))
