import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface QuizProps {
  onComplete: (profile: SoleTraderProfile) => void
}

export interface SoleTraderProfile {
  workType: 'salaried' | 'side-hustle' | 'freelance' | 'business'
  expenses: string[]
  investments: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  relevantSections: string[]
}

const questions = [
  {
    id: 'workType',
    question: 'How do you earn your income?',
    description: 'This helps us show the right tax sections for you',
    options: [
      { value: 'salaried', label: 'Salary/wages only', description: 'I have a regular job with PAYG withholding' },
      { value: 'side-hustle', label: 'Side hustle / casual work', description: 'I have a main job plus some extra income' },
      { value: 'freelance', label: 'Freelance / contractor', description: 'I work for myself, invoice clients' },
      { value: 'business', label: 'Small business owner', description: 'I run a business with multiple clients/customers' },
    ]
  },
  {
    id: 'vehicle',
    question: 'Do you use a vehicle for work?',
    description: 'Car, van, or other vehicle used for business purposes',
    options: [
      { value: 'none', label: 'No vehicle for work', description: 'I use public transport or walk' },
      { value: 'occasional', label: 'Occasionally', description: 'A few times a month for work trips' },
      { value: 'regular', label: 'Regularly', description: 'Weekly or daily work travel' },
      { value: 'business-vehicle', label: 'Business vehicle', description: 'I have a dedicated work vehicle or ute' },
    ]
  },
  {
    id: 'home-office',
    question: 'Do you work from home?',
    description: 'Home office expenses can be significant deductions',
    options: [
      { value: 'no', label: 'No', description: 'I work at an office or client sites' },
      { value: 'occasionally', label: 'Occasionally', description: 'A day or two per week from home' },
      { value: 'hybrid', label: 'Hybrid (2-3 days/week)', description: 'Regular home office use' },
      { value: 'full-home', label: 'Full time from home', description: 'I run my business from home' },
    ]
  },
  {
    id: 'investments',
    question: 'Do you have any of these?',
    description: 'Select all that apply',
    options: [
      { value: 'none', label: 'None of these', description: 'Just salary/wages income' },
      { value: 'shares', label: 'Shares / dividends', description: 'ASX investments with dividend income' },
      { value: 'property', label: 'Investment property', description: 'Rental property income' },
      { value: 'crypto', label: 'Cryptocurrency', description: 'Crypto trading or staking' },
    ]
  },
  {
    id: 'other-expenses',
    question: 'Any other work expenses?',
    description: 'Things you pay for to do your job',
    options: [
      { value: 'none', label: 'None / Not sure', description: 'I\'ll add expenses as I go' },
      { value: 'tools', label: 'Tools or equipment', description: 'Computers, phones, specialist tools' },
      { value: 'education', label: 'Education / courses', description: 'Work-related training or study' },
      { value: 'travel', label: 'Travel & accommodation', description: 'Work trips, conferences, client visits' },
      { value: 'uniform', label: 'Uniform / protective clothing', description: 'Work-specific clothing or safety gear' },
    ]
  }
]

export function SoleTraderQuiz({ onComplete }: QuizProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const currentQuestion = questions[currentStep]
  const progress = ((currentStep + 1) / questions.length) * 100
  const hasAnswer = answers[currentQuestion.id]

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      generateProfile()
    }
  }

  const generateProfile = () => {
    const profile: SoleTraderProfile = {
      workType: answers.workType as SoleTraderProfile['workType'],
      expenses: [],
      investments: [],
      complexity: 'simple',
      relevantSections: []
    }

    // Determine complexity
    if (answers.workType === 'business' || answers.investments?.includes('property')) {
      profile.complexity = 'complex'
    } else if (answers.workType === 'freelance' || answers.investments === 'shares') {
      profile.complexity = 'moderate'
    }

    // Build relevant sections
    profile.relevantSections = ['income'] // Everyone has income

    if (answers.workType !== 'salaried') {
      profile.relevantSections.push('business-income')
    }

    if (answers.vehicle !== 'none') {
      profile.relevantSections.push('d1-vehicle')
    }

    if (answers['home-office'] !== 'no') {
      profile.relevantSections.push('d3-home-office')
    }

    if (answers.investments === 'shares') {
      profile.relevantSections.push('dividends')
    }

    if (answers.investments === 'property') {
      profile.relevantSections.push('rental-property')
    }

    if (answers['other-expenses'] !== 'none') {
      profile.relevantSections.push('deductions')
    }

    // Always show summary
    profile.relevantSections.push('summary')

    onComplete(profile)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            Question {currentStep + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="text-2xl mt-6">{currentQuestion.question}</CardTitle>
        <p className="text-muted-foreground">{currentQuestion.description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={answers[currentQuestion.id] || ''}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {currentQuestion.options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                answers[currentQuestion.id] === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
              onClick={() => handleAnswer(option.value)}
            >
              <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={option.value} className="font-medium cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleNext} 
            disabled={!hasAnswer}
            size="lg"
          >
            {currentStep < questions.length - 1 ? 'Next' : 'See My Tax Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
