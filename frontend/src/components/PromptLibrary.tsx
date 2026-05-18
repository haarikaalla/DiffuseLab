import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrompts, savePrompt, deletePrompt, type PromptRecord } from '../api/client'

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<PromptRecord[]>([])
  const [title, setTitle]     = useState('')
  const [prompt, setPrompt]   = useState('')
  const [negPrompt, setNeg]   = useState('')
  const [tags, setTags]       = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getPrompts().then(setPrompts).catch(() => toast.error('Failed to load prompts'))
  }, [])

  async function handleSave() {
    if (!title.trim() || !prompt.trim()) {
      toast.error('Title and prompt are required')
      return
    }
    setSaving(true)
    try {
      const saved = await savePrompt({ title, prompt, negative_prompt: negPrompt, tags })
      setPrompts(p => [saved, ...p])
      setTitle(''); setPrompt(''); setNeg(''); setTags('')
      toast.success('Prompt saved!')
    } catch {
      toast.error('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await deletePrompt(id)
    setPrompts(p => p.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-100">Prompt Library</h2>

      {/* Save form */}
      <div className="card space-y-4">
        <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Plus size={15} /> Save a prompt
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs">Title</label>
            <input className="input-field text-sm" placeholder="e.g. Cinematic portrait"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Tags (comma-separated)</label>
            <input className="input-field text-sm" placeholder="portrait, cinematic, realistic"
              value={tags} onChange={e => setTags(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label text-xs">Prompt</label>
          <textarea className="input-field resize-none h-20 text-sm" value={prompt}
            onChange={e => setPrompt(e.target.value)} placeholder="Your prompt text…" />
        </div>
        <div>
          <label className="label text-xs">Negative prompt (optional)</label>
          <input className="input-field text-sm" value={negPrompt}
            onChange={e => setNeg(e.target.value)} placeholder="blurry, bad quality…" />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Plus size={14} /> {saving ? 'Saving…' : 'Save Prompt'}
        </button>
      </div>

      {/* Prompt list */}
      {prompts.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p>No saved prompts yet</p>
        </div>
      )}
      <div className="space-y-3">
        {prompts.map(p => (
          <div key={p.id} className="card hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-200 text-sm">{p.title}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{p.prompt}</p>
                {p.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.tags.split(',').filter(Boolean).map(t => (
                      <span key={t} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { navigator.clipboard.writeText(p.prompt); toast.success('Copied!') }}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                  <Copy size={14} className="text-gray-400" />
                </button>
                <button onClick={() => handleDelete(p.id)}
                  className="p-1.5 hover:bg-red-900/40 rounded-lg transition-colors">
                  <Trash2 size={14} className="text-gray-500 hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
