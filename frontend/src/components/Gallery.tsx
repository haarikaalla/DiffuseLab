import { useEffect, useState } from 'react'
import { Trash2, Heart, Star, X, Download, Copy, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getGallery, deleteImage, rateImage, toggleFavourite, type ImageRecord } from '../api/client'
import { useStore } from '../store'

export default function Gallery() {
  const { gallery, setGallery, removeFromGallery, updateGalleryItem } = useStore()
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<ImageRecord | null>(null)
  const [favOnly, setFavOnly]       = useState(false)

  useEffect(() => {
    setLoading(true)
    getGallery(favOnly)
      .then(setGallery)
      .catch(() => toast.error('Failed to load gallery'))
      .finally(() => setLoading(false))
  }, [favOnly])

  async function handleDelete(id: number) {
    await deleteImage(id)
    removeFromGallery(id)
    if (selected?.id === id) setSelected(null)
    toast.success('Deleted')
  }

  async function handleRate(id: number, r: number) {
    await rateImage(id, r)
    const updated = gallery.find(i => i.id === id)
    if (updated) {
      const newImg = { ...updated, rating: r }
      updateGalleryItem(newImg)
      if (selected?.id === id) setSelected(newImg)
    }
  }

  async function handleFav(id: number) {
    const res = await toggleFavourite(id)
    const updated = gallery.find(i => i.id === id)
    if (updated) {
      const newImg = { ...updated, is_favourite: res.is_favourite }
      updateGalleryItem(newImg)
      if (selected?.id === id) setSelected(newImg)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Image Gallery</h2>
          <p className="text-sm text-gray-500">{gallery.length} images generated</p>
        </div>
        <button
          onClick={() => setFavOnly(!favOnly)}
          className={`btn-secondary gap-2 ${favOnly ? 'text-pink-400 border-pink-700' : ''}`}
        >
          <Heart size={15} className={favOnly ? 'fill-pink-400 text-pink-400' : ''} />
          {favOnly ? 'All images' : 'Favourites'}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square shimmer rounded-xl" />
          ))}
        </div>
      )}

      {!loading && gallery.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-lg">No images yet</p>
          <p className="text-sm mt-1">Generate your first image to see it here</p>
        </div>
      )}

      {!loading && gallery.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map(img => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer
                         border border-gray-800 hover:border-purple-600 transition-all"
              onClick={() => setSelected(img)}
            >
              <img
                src={img.url}
                alt={img.prompt}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                              transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-end gap-2">
                  <button onClick={e => { e.stopPropagation(); handleFav(img.id) }}
                    className="p-1.5 bg-black/50 rounded-lg hover:bg-black/80 transition-colors">
                    <Heart size={14} className={img.is_favourite ? 'fill-pink-400 text-pink-400' : 'text-white'} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(img.id) }}
                    className="p-1.5 bg-black/50 rounded-lg hover:bg-red-900/80 transition-colors">
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
                <p className="text-xs text-gray-300 line-clamp-2">{img.prompt}</p>
              </div>
              {img.is_favourite && (
                <div className="absolute top-2 left-2">
                  <Heart size={12} className="fill-pink-400 text-pink-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto
                          border border-gray-700"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="font-medium text-gray-100">Image Details</h3>
              <button onClick={() => setSelected(null)}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <img src={selected.url} alt={selected.prompt}
                className="w-full rounded-xl object-contain" />
              <div className="space-y-4">
                {/* Rating */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Rating</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(r => (
                      <button key={r} onClick={() => handleRate(selected.id, r)}>
                        <Star size={20} className={r <= selected.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-600 hover:text-yellow-400 transition-colors'} />
                      </button>
                    ))}
                  </div>
                </div>
                {/* Metadata */}
                <div className="space-y-2">
                  {[
                    ['Prompt', selected.prompt],
                    ['Model', selected.model.toUpperCase()],
                    ['Size', `${selected.width}×${selected.height}`],
                    ['Steps', selected.steps],
                    ['Guidance', selected.guidance_scale],
                    ['Seed', selected.seed],
                    ['Gen time', `${selected.generation_time}s`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex gap-3 text-sm">
                      <span className="text-gray-500 min-w-[80px] flex-shrink-0">{k}</span>
                      <span className="text-gray-200 break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <a href={selected.url} download
                    className="btn-primary flex-1 justify-center">
                    <Download size={14} /> Download
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(selected.prompt); toast.success('Prompt copied!') }}
                    className="btn-secondary">
                    <Copy size={14} /> Copy prompt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
