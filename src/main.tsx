import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles.css'

// Import Tauri SQL plugin initialization
import { initDatabase } from './lib/db'

// Create router instance
const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  context: {
    // Add any global context here
  },
})

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Initialize database and mount app
async function bootstrap() {
  try {
    // Initialize SQLite database
    await initDatabase()
    console.log('[Tally] Database initialized successfully')
  } catch (error) {
    console.error('[Tally] Failed to initialize database:', error)
  }

  // Mount React app
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
}

bootstrap()
