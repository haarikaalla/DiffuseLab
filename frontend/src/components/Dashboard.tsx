import { useEffect, useState } from 'react'
import { Image, Heart, Star, Zap, BookOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { getStats, getHealth, type StatsRecord, type HealthRecord } from '../api/client'

export default function Dashboard() {
  const [stats, setStats]   = useState<StatsRecord | null>(null)
  const [health, setHealth] = useState<HealthRecord | null>(null)

  useEffect(() => {
    getStats().then(setStats).catch(() => {})
    getHealth().then(setHealth).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* Health banner */}
      {health && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          health.token_ok
            ? 'bg-green-950/30 border-green-800/50 text-green-300'
            : 'bg-red-950/30 border-red-800/50 text-red-300'
        }`}>
          {health.token_ok
            ? <CheckCircle size={18} />
            : <AlertCircle size={18} />
          }
          <span className="text-sm font-medium">{health.message}</span>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Studio Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Image,     label: 'Images generated', value: stats.total_images, color: 'text-purple-400' },
              { icon: Heart,     label: 'Favourites',       value: stats.favourite_count, color: 'text-pink-400' },
              { icon: Star,      label: 'Avg rating',       value: stats.avg_rating, color: 'text-yellow-400' },
              { icon: BookOpen,  label: 'Saved prompts',    value: stats.total_prompts, color: 'text-blue-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card text-center">
                <Icon size={24} className={`${color} mx-auto mb-2`} />
                <div className="text-2xl font-semibold text-gray-100">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">How this project works</h2>
        <div className="space-y-3">
          {[
            { step: '01', title: 'You enter a prompt', desc: 'Text describing what you want to generate. The Auto-enhance feature adds quality keywords automatically.' },
            { step: '02', title: 'CLIP text encoding', desc: 'Your prompt is converted to numerical embeddings by OpenAI\'s CLIP model — these numbers represent the meaning of your text.' },
            { step: '03', title: 'Diffusion denoising', desc: 'The UNet starts with pure random noise and denoises it step-by-step, guided by your text embeddings. Each step removes a little noise, revealing structure.' },
            { step: '04', title: 'VAE decoding', desc: 'The final denoised latent tensor is decoded by a Variational Autoencoder into actual RGB pixels — your generated image.' },
            { step: '05', title: 'HuggingFace GPU runs it', desc: 'Steps 2–4 run entirely on HuggingFace\'s free inference API. Their GPU does the heavy lifting, your laptop just sends/receives HTTP requests.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="card flex gap-4">
              <span className="text-2xl font-bold text-purple-800/60 font-mono flex-shrink-0">{step}</span>
              <div>
                <p className="font-medium text-gray-200 text-sm">{title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Tech stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { category: 'Backend', items: ['FastAPI (Python)', 'SQLAlchemy + SQLite', 'Pydantic v2 validation', 'Prometheus metrics'], color: 'border-purple-800/40 bg-purple-950/20' },
            { category: 'AI / Models', items: ['Stable Diffusion XL', 'SD 2.1 (fast mode)', 'HuggingFace Inference API', 'CLIP text encoder'], color: 'border-pink-800/40 bg-pink-950/20' },
            { category: 'Frontend', items: ['React 18 + TypeScript', 'Tailwind CSS', 'Zustand state mgmt', 'React Query + Axios'], color: 'border-blue-800/40 bg-blue-950/20' },
            { category: 'DevOps', items: ['Docker Compose', 'GitHub Actions CI', 'Prometheus + Grafana', 'Nginx reverse proxy'], color: 'border-green-800/40 bg-green-950/20' },
          ].map(({ category, items, color }) => (
            <div key={category} className={`rounded-xl p-4 border ${color}`}>
              <p className="font-medium text-gray-200 text-sm mb-3">{category}</p>
              <ul className="space-y-1.5">
                {items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-xs text-gray-400">
                    <Zap size={10} className="text-purple-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
