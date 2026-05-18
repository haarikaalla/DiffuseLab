import { Wand2, Images, BookOpen, LayoutDashboard } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store'
import GenerationPanel from './components/GenerationPanel'
import Gallery from './components/Gallery'
import PromptLibrary from './components/PromptLibrary'
import Dashboard from './components/Dashboard'

const TABS = [
  { id: 'generate',  label: 'Generate',  icon: Wand2 },
  { id: 'gallery',   label: 'Gallery',   icon: Images },
  { id: 'prompts',   label: 'Prompts',   icon: BookOpen },
  { id: 'about',     label: 'Dashboard', icon: LayoutDashboard },
] as const

export default function App() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
        }}
      />

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg
                            flex items-center justify-center">
              <Wand2 size={14} className="text-white" />
            </div>
            <span className="font-semibold text-gray-100">AI Image Studio</span>
            <span className="text-xs text-gray-600 hidden sm:block">— Stable Diffusion XL</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                             transition-colors ${
                  activeTab === id
                    ? 'bg-purple-900/50 text-purple-300'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {activeTab === 'generate' && <GenerationPanel />}
        {activeTab === 'gallery'  && <Gallery />}
        {activeTab === 'prompts'  && <PromptLibrary />}
        {activeTab === 'about'    && <Dashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-3 px-6 text-center text-xs text-gray-700">
        AI Image Studio — Built with FastAPI + React + HuggingFace Inference API
      </footer>
    </div>
  )
}
