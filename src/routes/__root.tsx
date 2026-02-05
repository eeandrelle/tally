import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'
import { TaxYearProvider } from '@/contexts/TaxYearContext'
import { BetaBanner, FeedbackWidget, OnboardingFlow } from '@/components'

// Import global styles
import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen flex flex-col">
      <TaxYearProvider>
        {/* Beta Banner - shown at top of page */}
        <BetaBanner />
        
        {/* Main content */}
        <div className="flex-1">
          <Outlet />
        </div>
        
        {/* Feedback Widget - floating action button */}
        <FeedbackWidget />
        
        {/* Onboarding Flow - shown for new users */}
        <OnboardingFlow />
      </TaxYearProvider>
      
      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
      
      {/* Router devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </div>
  )
}
