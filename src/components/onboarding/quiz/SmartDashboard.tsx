import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Car, 
  Home, 
  Briefcase, 
  TrendingUp, 
  Receipt,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SoleTraderProfile } from './SoleTraderQuiz'

interface SmartDashboardProps {
  profile: SoleTraderProfile
}

const sections = {
  'income': {
    id: 'income',
    title: 'Income Summary',
    description: 'Your salary and other income sources',
    icon: Briefcase,
    required: true,
    estimatedTime: '5 min',
    deductions: 'N/A'
  },
  'business-income': {
    id: 'business-income',
    title: 'Business Income',
    description: 'Track invoices, payments, and business revenue',
    icon: TrendingUp,
    required: false,
    estimatedTime: '10 min',
    deductions: 'Preliminary tax calc'
  },
  'd1-vehicle': {
    id: 'd1-vehicle',
    title: 'Vehicle Expenses',
    description: 'Logbook method or cents per kilometre',
    icon: Car,
    required: false,
    estimatedTime: '15 min',
    deductions: '$3,000 - $8,000'
  },
  'd3-home-office': {
    id: 'd3-home-office',
    title: 'Home Office',
    description: 'Running costs for your workspace',
    icon: Home,
    required: false,
    estimatedTime: '10 min',
    deductions: '$500 - $2,000'
  },
  'dividends': {
    id: 'dividends',
    title: 'Dividend Income',
    description: 'Share investments and franking credits',
    icon: TrendingUp,
    required: false,
    estimatedTime: '10 min',
    deductions: 'Franking credits'
  },
  'rental-property': {
    id: 'rental-property',
    title: 'Rental Property',
    description: 'Income, expenses, and depreciation',
    icon: Home,
    required: false,
    estimatedTime: '20 min',
    deductions: 'Varies widely'
  },
  'deductions': {
    id: 'deductions',
    title: 'Other Deductions',
    description: 'Tools, education, travel, clothing',
    icon: Receipt,
    required: false,
    estimatedTime: '15 min',
    deductions: '$500 - $5,000'
  },
  'summary': {
    id: 'summary',
    title: 'Tax Summary',
    description: 'Review and estimate your tax position',
    icon: CheckCircle2,
    required: true,
    estimatedTime: '5 min',
    deductions: 'Final estimate'
  }
}

export function SmartDashboard({ profile }: SmartDashboardProps) {
  const [completed, setCompleted] = useState<string[]>(['income'])
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const relevantSections = profile.relevantSections
  const progress = (completed.length / relevantSections.length) * 100

  const handleComplete = (sectionId: string) => {
    if (!completed.includes(sectionId)) {
      setCompleted(prev => [...prev, sectionId])
    }
    setActiveSection(null)
  }

  const getEstimatedRefund = () => {
    // Simple estimate based on complexity
    if (profile.complexity === 'simple') return '$500 - $1,500'
    if (profile.complexity === 'moderate') return '$1,500 - $4,000'
    return '$3,000 - $8,000'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Your Tax Return</h1>
        <p className="text-muted-foreground">
          Based on your answers, we've customized your tax return
        </p>
        <Badge variant="secondary" className="mt-2">
          {profile.complexity === 'simple' ? 'Simple Return' : 
           profile.complexity === 'moderate' ? 'Moderate Complexity' : 
           'Complex Return'}
        </Badge>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completed.length} of {relevantSections.length} completed
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-4">
            Estimated refund range: <span className="font-semibold text-green-600">{getEstimatedRefund()}</span>
          </p>
        </CardContent>
      </Card>

      {/* Relevant Sections */}
      <div className="grid gap-4">
        {relevantSections.map((sectionId, index) => {
          const section = sections[sectionId]
          const Icon = section.icon
          const isCompleted = completed.includes(sectionId)
          const isLocked = index > 0 && !completed.includes(relevantSections[index - 1])
          const isActive = activeSection === sectionId

          return (
            <Card 
              key={sectionId}
              className={cn(
                "transition-all cursor-pointer",
                isCompleted && "border-green-500/50 bg-green-500/5",
                isLocked && "opacity-60 cursor-not-allowed",
                isActive && "ring-2 ring-primary"
              )}
              onClick={() => !isLocked && setActiveSection(sectionId)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    isCompleted ? "bg-green-500/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      isCompleted ? "text-green-600" : "text-muted-foreground"
                    )} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{section.title}</h3>
                      {section.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                      {isCompleted && (
                        <Badge className="bg-green-500 text-white text-xs">Done</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {section.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>⏱ {section.estimatedTime}</span>
                      {section.deductions && (
                        <span>💰 {section.deductions}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isLocked ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Quick Action */}
                {isActive && !isCompleted && (
                  <div className="mt-4 pt-4 border-t">
                    <Button onClick={() => handleComplete(sectionId)}>
                      Start {section.title}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Hidden Sections Notice */}
      <Card className="bg-muted/50">
        <CardContent className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            We've hidden {Object.keys(sections).length - relevantSections.length} sections that don't apply to you.
            {' '}
            <button className="text-primary hover:underline">
              Show all sections
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
