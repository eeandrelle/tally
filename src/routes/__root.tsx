import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'
import { TaxYearProvider } from '@/contexts/TaxYearContext'
import { BetaBanner, FeedbackWidget, OnboardingFlow } from '@/components'
import { AppShell } from '@/components/layout'

// Import global styles
import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <TaxYearProvider>
      {/* Beta Banner - shown at top of page */}
      <BetaBanner />
      
      {/* Main layout with navigation */}
      <AppShell>
        <Outlet />
      </AppShell>
      
      {/* Feedback Widget - floating action button */}
      <FeedbackWidget />
      
      {/* Onboarding Flow - shown for new users */}
      <OnboardingFlow />
      
      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
      
      {/* Router devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </TaxYearProvider>
  )
}
