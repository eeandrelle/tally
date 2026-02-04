import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileUp,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useDividendPdfParser,
  useMultipleDividendParsers,
  type ParsedDividend,
  type RegistryProvider,
} from '@/hooks/useDividendPdfParser'
import {
  exportToCSV,
  formatDividend,
} from '@/lib/dividend-pdf-parser'

export const Route = createFileRoute('/dividend-parser')({
  component: DividendParserPage,
})

// ============================================================================
// SAMPLE STATEMENTS FOR DEMO
// ============================================================================

const SAMPLE_COMPUTERSHARE = `COMPUTERSHARE INVESTOR SERVICES PTY LIMITED
Level 3, 60 Carrington Street, Sydney NSW 2000
ABN 48 078 279 277

DIVIDEND ADVICE

Company: COMMONWEALTH BANK OF AUSTRALIA
ASX Code: CBA
ABN: 48 123 123 124

Security Details:
Holder: John Smith
SRN: X0001234567
Shares Held: 500

Dividend Details:
Dividend per Share: $2.15
Franked Amount: $1075.00
Unfranked Amount: $0.00
Franking Credits: $461.36
Franking Percentage: 100%

Payment Details:
Payment Date: 15/03/2024
Record Date: 21/02/2024
Amount Payable: $1075.00

Direct Credit to: Account ending in 1234`

const SAMPLE_LINK = `Link Market Services Limited
Level 12, 680 George Street, Sydney NSW 2000

DIVIDEND STATEMENT

Issuer: BHP Group Limited
Security Code: BHP
ABN: 49 004 028 077

Holding Details:
Shareholder: Jane Doe
Number of Shares: 1,250

Distribution Details:
Gross Dividend: $2,875.00
Fully Franked: $2,875.00
Franking Credit: $1,232.14
Unfranked: $0.00

Payment Information:
Date Paid: 28/09/2024
Record Date: 07/09/2024
Payment Method: Direct Credit

Franking Percentage: 100%`

const SAMPLE_BOARDROOM = `Boardroom Pty Limited
Level 12, 225 George Street, Sydney NSW 2000
ABN: 14 003 209 836

DIVIDEND PAYMENT ADVICE

Company Name: Telstra Corporation Limited
ASX: TLS
Australian Company Number: 051 775 556

Registered Holder: Robert Johnson
Holding: 2,000 shares

Dividend Information:
Dividend Amount: $340.00
Franked Dividend: $340.00
Unfranked Dividend: $0.00
Imputation Credits: $145.71

Payment Date: 31/08/2024
Entitlement Date: 24/08/2024`

const SAMPLE_DIRECT = `Wesfarmers Limited
ABN 28 008 984 049

DIVIDEND STATEMENT

Shareholder: Mary Williams
Holding: 800 shares

Final Dividend 2024:
Dividend per Share: $1.03
Total Payment: $824.00
Fully Franked at 30%
Franking Credits: $353.14

Payment Date: 10/04/2024
Record Date: 28/02/2024`

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ProviderBadge({ provider }: { provider: RegistryProvider }) {
  const styles: Record<RegistryProvider, string> = {
    computershare: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    link: 'bg-green-100 text-green-800 hover:bg-green-100',
    boardroom: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    direct: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    unknown: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  }

  const labels: Record<RegistryProvider, string> = {
    computershare: 'Computershare',
    link: 'Link Market Services',
    boardroom: 'BoardRoom',
    direct: 'Direct',
    unknown: 'Unknown',
  }

  return (
    <Badge variant="secondary" className={cn(styles[provider], 'font-medium')}>
      {labels[provider]}
    </Badge>
  )
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500')}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      <span className={cn('text-sm font-medium', getColor())}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  )
}

function DividendCard({ dividend }: { dividend: ParsedDividend }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{dividend.companyName}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {dividend.asxCode && (
                <Badge variant="outline" className="font-mono">
                  {dividend.asxCode}
                </Badge>
              )}
              <ProviderBadge provider={dividend.provider} />
            </CardDescription>
          </div>
          <ConfidenceIndicator confidence={dividend.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Dividend Amount
            </div>
            <div className="text-2xl font-bold">${dividend.dividendAmount.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Franking Credits
            </div>
            <div className="text-2xl font-bold text-green-700">
              ${dividend.frankingCredits.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Payment:</span>
            <span className="font-medium">{dividend.paymentDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Shares:</span>
            <span className="font-medium">{dividend.sharesHeld.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Franking:</span>
            <span className="font-medium">{dividend.frankingPercentage}%</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tax Year:</span>
            <span className="font-medium">{dividend.financialYear}</span>
          </div>
        </div>

        {/* Franked/Unfranked Breakdown */}
        <div className="pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Franked Amount:</span>
            <span className="font-medium">${dividend.frankedAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Unfranked Amount:</span>
            <span className="font-medium">${dividend.unfrankedAmount.toFixed(2)}</span>
          </div>
          {dividend.dividendPerShare > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Per Share:</span>
              <span className="font-medium">${dividend.dividendPerShare.toFixed(4)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DividendParserPage() {
  const [activeTab, setActiveTab] = useState('text')
  const [textInput, setTextInput] = useState('')
  const [parsedDividends, setParsedDividends] = useState<ParsedDividend[]>([])
  const [showRawText, setShowRawText] = useState<Record<number, boolean>>({})
  
  const {
    result,
    progress,
    isParsing,
    isComplete,
    error,
    dividend,
    parsePDF,
    parseText,
    reset,
  } = useDividendPdfParser()

  const batchParser = useMultipleDividendParsers()

  // Handle file drop
  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type === 'application/pdf')
      if (files.length === 0) {
        toast.error('Please drop PDF files only')
        return
      }

      if (files.length === 1) {
        await parsePDF(files[0])
      } else {
        const dividends = await batchParser.parseFiles(files)
        setParsedDividends(dividends)
      }
    },
    [parsePDF, batchParser]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) => f.type === 'application/pdf')
      if (files.length === 0) return

      if (files.length === 1) {
        await parsePDF(files[0])
      } else {
        const dividends = await batchParser.parseFiles(files)
        setParsedDividends(dividends)
      }
    },
    [parsePDF, batchParser]
  )

  const handleTextParse = useCallback(() => {
    if (!textInput.trim()) {
      toast.error('Please enter dividend statement text')
      return
    }
    parseText(textInput)
  }, [textInput, parseText])

  const loadSample = useCallback((sample: string) => {
    setTextInput(sample)
    toast.success('Sample loaded. Click Parse to extract data.')
  }, [])

  const handleCopyResult = useCallback(() => {
    if (dividend) {
      navigator.clipboard.writeText(formatDividend(dividend))
      toast.success('Copied to clipboard')
    }
  }, [dividend])

  const handleExportCSV = useCallback(() => {
    const allDividends = [...(dividend ? [dividend] : []), ...parsedDividends]
    if (allDividends.length === 0) {
      toast.error('No dividends to export')
      return
    }
    const csv = exportToCSV(allDividends)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dividends-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }, [dividend, parsedDividends])

  const clearAll = useCallback(() => {
    reset()
    setParsedDividends([])
    setTextInput('')
    batchParser.reset()
    toast.success('Cleared all results')
  }, [reset, batchParser])

  // Combine single and batch results for display
  const allDividends = [
    ...(dividend ? [dividend] : []),
    ...parsedDividends.filter((d) => !dividend || d.rawText !== dividend.rawText),
  ]

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          Dividend Statement Parser
        </h1>
        <p className="text-muted-foreground mt-2">
          Parse PDF dividend statements from Computershare, Link Market Services, BoardRoom, and direct company statements.
          Extracts dividend amounts, franking credits, dates, and more.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">
                <FileText className="h-4 w-4 mr-2" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="pdf">
                <FileUp className="h-4 w-4 mr-2" />
                Upload PDF
              </TabsTrigger>
            </TabsList>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Paste Dividend Statement</CardTitle>
                  <CardDescription>
                    Copy and paste text from your dividend statement for instant parsing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sample Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Try a sample:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample(SAMPLE_COMPUTERSHARE)}
                    >
                      Computershare
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadSample(SAMPLE_LINK)}>
                      Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample(SAMPLE_BOARDROOM)}
                    >
                      BoardRoom
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadSample(SAMPLE_DIRECT)}>
                      Direct
                    </Button>
                  </div>

                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your dividend statement text here..."
                    className="min-h-[300px] font-mono text-sm"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={handleTextParse}
                      disabled={isParsing || !textInput.trim()}
                      className="flex-1"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Parse Statement
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setTextInput('')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PDF Upload Tab */}
            <TabsContent value="pdf" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload PDF Statement</CardTitle>
                  <CardDescription>
                    Drag and drop or select PDF dividend statements to parse.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                      'hover:border-primary/50 hover:bg-primary/5',
                      isParsing && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Drag & drop PDF statements here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Supports Computershare, Link Market Services, BoardRoom, and direct company statements
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="pdf-upload" className="cursor-pointer">
                        Select Files
                      </label>
                    </Button>
                  </div>

                  {/* Progress */}
                  {(isParsing || batchParser.isProcessing) && (
                    <div className="space-y-2">
                      <Progress value={progress.progress} />
                      <p className="text-sm text-center text-muted-foreground">
                        {progress.message || 'Processing...'}
                      </p>
                      {batchParser.state.currentFile && (
                        <p className="text-xs text-center text-muted-foreground">
                          Processing: {batchParser.state.currentFile} (
                          {batchParser.state.processed + 1}/{batchParser.state.total})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Batch Results Summary */}
                  {batchParser.state.total > 0 && !batchParser.isProcessing && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Processed {batchParser.state.total} files:{' '}
                        <span className="text-green-600 font-medium">
                          {batchParser.state.successful} successful
                        </span>
                        ,{' '}
                        <span className="text-red-600 font-medium">
                          {batchParser.state.failed} failed
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Supported Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                    CS
                  </div>
                  <div>
                    <div className="font-medium text-sm">Computershare</div>
                    <div className="text-xs text-muted-foreground">Australia&apos;s largest</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
                    LM
                  </div>
                  <div>
                    <div className="font-medium text-sm">Link Market</div>
                    <div className="text-xs text-muted-foreground">Services</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-xs">
                    BR
                  </div>
                  <div>
                    <div className="font-medium text-sm">BoardRoom</div>
                    <div className="text-xs text-muted-foreground">Registry</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs">
                    DC
                  </div>
                  <div>
                    <div className="font-medium text-sm">Direct</div>
                    <div className="text-xs text-muted-foreground">Company</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Single Parse Result */}
          {dividend && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Parsed Result</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyResult}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={reset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
              </div>
              <DividendCard dividend={dividend} />

              {/* Raw Text Toggle */}
              <Card>
                <CardHeader className="py-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() =>
                      setShowRawText((prev) => ({ ...prev, single: !prev.single }))
                    }
                  >
                    <span className="text-sm font-medium">Raw Extracted Text</span>
                    {showRawText.single ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                {showRawText.single && (
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {dividend.rawText}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            </div>
          )}

 {/* Batch Results */}
          {parsedDividends.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Parsed Dividends ({parsedDividends.length})
                </h2>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {parsedDividends.map((d, i) => (
                  <DividendCard key={i} dividend={d} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!dividend && parsedDividends.length === 0 && !isParsing && !batchParser.isProcessing && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No Statements Parsed</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Paste dividend statement text or upload PDF files to extract dividend data,
                  franking credits, and payment details.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Parsing State */}
          {(isParsing || batchParser.isProcessing) && (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <h3 className="text-lg font-medium">Parsing Statement...</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {progress.message || 'Extracting dividend details'}
                </p>
                <Progress value={progress.progress} className="mt-4 max-w-xs mx-auto" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {allDividends.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button variant="outline" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Results
          </Button>
        </div>
      )}
    </div>
  )
}
