import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Example company reports for users to select from
const exampleReports = [
  {
    id: 1,
    title: "Acme Widgets Corporation",
    description: "Technology manufacturing company with recent acquisitions",
    content: `Acme Widgets Corporation (AWC) is a leading technology manufacturing company founded in 1995 and headquartered in San Francisco, California. The company operates in the technology sector with a focus on industrial automation and robotics.

Key Leadership:
- CEO: Sarah Johnson, 45, MBA from Stanford University
- CFO: Michael Chen, 42, CPA with 15 years experience
- CTO: Dr. Emily Rodriguez, 38, PhD in Computer Science from MIT

Financial Performance:
- Market Cap: $2.3 billion
- Revenue (2023): $450 million
- Employee Count: 2,500 employees
- Founded: 1995

Recent Developments:
- Acquired TechFlow Solutions in March 2024 for $180 million
- Received AAA credit rating from Moody's in January 2024
- Fined $2.5 million by SEC in December 2023 for regulatory compliance issues
- Announced partnership with Global Manufacturing Corp in Q2 2024

The company has been expanding internationally with new facilities in Germany and Japan.`
  },
  {
    id: 2,
    title: "Global Financial Services Inc.",
    description: "Banking and financial services with regulatory events",
    content: `Global Financial Services Inc. (GFSI) is a major banking and financial services company established in 1987. Headquartered in New York City, the company serves customers across North America and Europe.

Executive Team:
- CEO: Robert Williams, 52, former Goldman Sachs executive
- President: Lisa Thompson, 48, Harvard Business School graduate
- Chief Risk Officer: David Kim, 44, former Federal Reserve analyst

Business Overview:
- Sector: Financial Services
- Industry: Banking and Investment
- Market Cap: $8.7 billion
- Employee Count: 12,000 employees
- Headquarters: New York, NY

Regulatory History:
- Fined $15 million by FINRA in 2023 for trading violations
- Under investigation by SEC for insider trading (ongoing since 2024)
- Received AA+ credit rating from S&P Global in 2023
- Approved by Federal Reserve for international expansion in 2024

Recent Transactions:
- Merged with Regional Bank Corp in January 2024 ($1.2 billion deal)
- Acquired Digital Payment Solutions in Q3 2023 ($300 million)
- Spun off insurance division in 2022 ($500 million valuation)`
  },
  {
    id: 3,
    title: "MedTech Innovations Ltd.",
    description: "Healthcare technology with regulatory approvals and partnerships",
    content: `MedTech Innovations Ltd. (MTI) is a cutting-edge healthcare technology company specializing in medical devices and digital health solutions. Founded in 2010, the company has rapidly grown to become a leader in the medical technology space.

Leadership:
- CEO: Dr. Jennifer Martinez, 41, MD and former Johnson & Johnson executive
- COO: James Wilson, 39, former GE Healthcare manager
- Chief Medical Officer: Dr. Sarah Lee, 43, former FDA medical reviewer

Company Details:
- Sector: Healthcare
- Industry: Medical Technology
- Market Cap: $1.8 billion
- Employee Count: 1,200 employees
- Founded: 2010
- Headquarters: Boston, Massachusetts

Regulatory Milestones:
- FDA approval for AI-powered diagnostic device in March 2024
- CE marking for European market expansion in 2023
- Fined $500,000 by FDA for manufacturing compliance issues in 2022
- Received breakthrough device designation in 2024

Strategic Partnerships:
- Partnership with Mayo Clinic for clinical trials (2023-2025)
- Collaboration with Google Health for AI integration
- Joint venture with European MedTech Corp for international expansion

The company has been at the forefront of digital health innovation, with several patents in AI-assisted diagnostics and remote patient monitoring.`
  }
];

interface ProcessingStatus {
  stage: 'idle' | 'extracting' | 'ingesting' | 'complete' | 'error';
  progress: number;
  message: string;
}

export default function NER() {
  const [inputText, setInputText] = useState("");
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to process company report'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleExampleClick = (reportId: number) => {
    const report = exampleReports.find(r => r.id === reportId);
    if (report) {
      setInputText(report.content);
      setSelectedReport(reportId);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast({
        title: "No text provided",
        description: "Please enter or select a company report to process.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({
      stage: 'extracting',
      progress: 10,
      message: 'Starting NER extraction...'
    });

    try {
      setProcessingStatus({
        stage: 'extracting',
        progress: 30,
        message: 'Processing with DSPy agent...'
      });

      // Call the actual NER API
      const response = await fetch('/api/ner/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to process NER request');
      }

      setProcessingStatus({
        stage: 'ingesting',
        progress: 70,
        message: 'Saving entities to database...'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'NER processing failed');
      }

      setProcessingStatus({
        stage: 'complete',
        progress: 100,
        message: 'NER processing completed successfully!'
      });

      toast({
        title: "Processing Complete",
        description: `Successfully extracted and ingested ${result.entitiesCount || 0} entities from the company report.`,
      });

    } catch (error) {
      console.error('NER processing error:', error);
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: 'Error processing NER request. Please try again.'
      });
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process the company report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (processingStatus.stage) {
      case 'idle':
        return <FileText className="h-4 w-4" />;
      case 'extracting':
      case 'ingesting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (processingStatus.stage) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'extracting':
      case 'ingesting':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">Named Entity Recognition</h1>
          <Badge variant="outline" className="text-xs">DSPy Agent</Badge>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="space-y-2 mb-6">
          <p className="text-muted-foreground">
            Extract and ingest company information from text reports into the knowledge graph.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Company Report Input
                </CardTitle>
                <CardDescription>
                  Paste or select a company report to extract entities and relationships.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your company report here or select an example below..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[300px]"
                  disabled={isProcessing}
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {inputText.length} characters
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!inputText.trim() || isProcessing}
                    className="min-w-[120px]"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Process Report
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Processing Status */}
            {isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon()}
                    Processing Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{processingStatus.message}</span>
                      <span>{processingStatus.progress}%</span>
                    </div>
                    <Progress 
                      value={processingStatus.progress} 
                      className="h-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                    <span className="text-sm text-muted-foreground">
                      {processingStatus.stage === 'extracting' && 'Extracting entities from text...'}
                      {processingStatus.stage === 'ingesting' && 'Saving to database...'}
                      {processingStatus.stage === 'complete' && 'Processing completed successfully!'}
                      {processingStatus.stage === 'error' && 'An error occurred during processing.'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Example Reports */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Example Reports</CardTitle>
                <CardDescription>
                  Click on any example to populate the input field.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {exampleReports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedReport === report.id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => handleExampleClick(report.id)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{report.title}</h4>
                            {selectedReport === report.id && (
                              <Badge variant="secondary" className="text-xs">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {report.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {report.content.length} characters
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
