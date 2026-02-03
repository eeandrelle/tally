import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

// Simple standalone app for desktop build
function DesktopApp() {
  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Tally Desktop</h1>
          <p className="text-neutral-500">Tax Receipt Manager</p>
          <p className="text-sm text-neutral-400 mt-4">Built with TanStack Start + shadcn/ui + Tauri</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500 mb-1">Total Deductions</p>
            <p className="text-3xl font-semibold">$156.49</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500 mb-1">Receipts</p>
            <p className="text-3xl font-semibold">12</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500 mb-1">Days to Deadline</p>
            <p className="text-3xl font-semibold">73</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm text-center">
          <p className="text-lg mb-4">🎉 Desktop app is running!</p>
          <p className="text-neutral-500">All 36 shadcn/ui components are ready to use.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button className="bg-neutral-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-neutral-800 transition-colors">
              + Capture Receipt
            </button>
            <button className="bg-white border border-neutral-200 text-neutral-700 px-5 py-2.5 rounded-xl font-medium hover:bg-neutral-50 transition-colors">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesktopApp />
  </React.StrictMode>,
)
