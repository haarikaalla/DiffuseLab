import { useState } from 'react'
import { Wand2, Zap, Settings2, RefreshCw, Sparkles, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateImage, type GenerateRequest } from '../api/client'
import { useStore } from '../store'

const NEGATIVE_DEFAULT =
  'blurry, bad quality, distorted, watermark, ugly, low resolution, deformed, noisy'

const STYLE_PRESETS = [
  { id: 'none',          label: 'None' },
  { id: 'photorealistic', label: 'Photo' },
  { id: 'cinematic',     label: 'Cinematic' },
  { id: 'anime',         label: 'Anime' },
  { id: 'oil_painting',  label: 'Oil Paint' },
  { id: 'watercolor',    label: 'Watercolor' },
]

const EXAMPLE_PROMPTS = [
  'A futuristic city at sunset, neon lights reflecting on wet streets',
  'A majestic dragon flying over snow-capped mountains, fantasy art',
  'Portrait of an astronaut floating in space, cinematic lighting',
  'A cozy Japanese cafe in autumn, warm lighting, photorealistic',
  'Abstract geometric patterns in vibrant purple and gold, 8k',
]

export default function GenerationPanel() {
  const { isGenerating, setGenerating, setLastGenerated, addToGallery } = useStore()

  const [prompt, setPrompt]               = useState('')
  const [negPrompt, setNegPrompt]         = useState(NEGATIVE_DEFAULT)
  const [steps, setSteps]                 = useState(20)
  const [guidance, setGuidance]           = useState(7.5)
  const [width, setWidth]                 = useState(512)
  const [height, setHeight]               = useState(512)
  const [seed, setSeed]                   = useState(-1)
  const [model, setModel]                 = useState<'sdxl' | 'sd21'>('sd21')
  const [enhance, setEnhance]             = useState(false)
  const [style, setStyle]                 = useState('none')
  const [showAdvanced, setShowAdvanced]   = useState(false)
  const [result, setResult]               = useState<string | null>(null)
  const [genTime, setGenTime]             = useState<number | null>(null)

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt first!'); return }

    setGenerating(true)
    setResult(null)
    const tid = toast.loading('Generating image… (first request may take ~30s while model loads)')

    try {
      const req: GenerateRequest = {
        prompt,
        negative_prompt: negPrompt,
        steps,
        guidance_scale: guidance,
        width,
        height,
        seed,
        model,
        enhance_prompt: enhance,
      }
      const img = await generateImage(req)
      setResult(img.url)
      setGenTime(img.generation_time)
      setLastGenerated(img)
      addToGallery(img)
      toast.success(`Generated in ${img.generation_time}s`, { id: tid })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Generation failed'
      toast.error(msg, { id: tid })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-6xl mx-auto">

      {/* ── Left panel: controls ── */}
      <div className="space-y-5">

        {/* Prompt */}
        <div>
          <label className="label">Prompt</label>
          <textarea
            className="input-field resize-none h-28 text-sm"
            placeholder="A cinematic portrait of a samurai in cherry blossom rain…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200
                           px-2.5 py-1 rounded-lg transition-colors truncate max-w-[180px]"
                title={p}
              >
                {p.substring(0, 30)}…
              </button>
            ))}
          </div>
        </div>

        {/* Style presets */}
        <div>
          <label className="label">Style preset</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  style === s.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model selector */}
        <div>
          <label className="label">Model</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'sd21', label: 'SD 2.1', desc: 'Faster, great quality' },
              { id: 'sdxl', label: 'SDXL',   desc: 'Best quality, slower' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setModel(m.id as 'sdxl' | 'sd21')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === m.id
                    ? 'border-purple-500 bg-purple-900/30 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-sm">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Enhance toggle */}
        <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
          <Sparkles size={16} className="text-yellow-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-200">Auto-enhance prompt</div>
            <div className="text-xs text-gray-500">Adds quality keywords automatically</div>
          </div>
          <button
            onClick={() => setEnhance(!enhance)}
            className={`w-11 h-6 rounded-full transition-colors ${
              enhance ? 'bg-purple-600' : 'bg-gray-600'
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${
              enhance ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Quick sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm text-gray-300">Inference steps</label>
              <span className="text-sm text-purple-400 font-mono">{steps}</span>
            </div>
            <input type="range" min={10} max={50} step={1} value={steps}
              onChange={e => setSteps(+e.target.value)} className="slider" />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>10 (fast)</span><span>50 (best quality)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm text-gray-300">Guidance scale</label>
              <span className="text-sm text-purple-400 font-mono">{guidance}</span>
            </div>
            <input type="range" min={1} max={20} step={0.5} value={guidance}
              onChange={e => setGuidance(+e.target.value)} className="slider" />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1 (creative)</span><span>20 (strict prompt)</span>
            </div>
          </div>
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <Settings2 size={14} />
          {showAdvanced ? 'Hide' : 'Show'} advanced settings
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Width</label>
                <select className="input-field text-sm" value={width}
                  onChange={e => setWidth(+e.target.value)}>
                  {[256, 384, 512, 640, 768, 1024].map(w =>
                    <option key={w} value={w}>{w}px</option>
                  )}
                </select>
              </div>
              <div>
                <label className="label text-xs">Height</label>
                <select className="input-field text-sm" value={height}
                  onChange={e => setHeight(+e.target.value)}>
                  {[256, 384, 512, 640, 768, 1024].map(h =>
                    <option key={h} value={h}>{h}px</option>
                  )}
                </select>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-300">Seed (-1 = random)</label>
                <button onClick={() => setSeed(-1)}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <RefreshCw size={10} /> Randomize
                </button>
              </div>
              <input type="number" className="input-field text-sm" value={seed}
                onChange={e => setSeed(+e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Negative prompt</label>
              <textarea className="input-field resize-none h-20 text-xs" value={negPrompt}
                onChange={e => setNegPrompt(e.target.value)} />
            </div>
          </div>
        )}

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary w-full justify-center py-3 text-base">
          {isGenerating
            ? <><RefreshCw size={18} className="animate-spin" /> Generating…</>
            : <><Wand2 size={18} /> Generate Image</>
          }
        </button>
      </div>

      {/* ── Right panel: result ── */}
      <div className="flex flex-col gap-4">
        <div className="card flex-1 flex items-center justify-center min-h-[400px] relative overflow-hidden">
          {isGenerating && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto shimmer rounded-full" />
              <div className="text-gray-400 text-sm">Running diffusion steps…</div>
              <div className="text-gray-600 text-xs">HF GPU is generating your image</div>
            </div>
          )}
          {!isGenerating && result && (
            <div className="w-full space-y-3">
              <img
                src={result}
                alt="Generated"
                className="w-full rounded-xl object-contain max-h-[500px]"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Generated in {genTime}s</span>
                <a
                  href={result}
                  download
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
          )}
          {!isGenerating && !result && (
            <div className="text-center text-gray-600">
              <Wand2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Your image will appear here</p>
              <p className="text-xs mt-1">Enter a prompt and click Generate</p>
            </div>
          )}
        </div>

        {/* Tip card */}
        <div className="card bg-purple-950/30 border-purple-800/40">
          <p className="text-xs text-purple-300 font-medium mb-1 flex items-center gap-1">
            <Zap size={12} /> Pro tip
          </p>
          <p className="text-xs text-gray-400">
            First generation takes ~30s (model cold start). After that, each image takes 3–8s.
            Use SD 2.1 for speed, SDXL for the best quality.
          </p>
        </div>
      </div>
    </div>
  )
}
