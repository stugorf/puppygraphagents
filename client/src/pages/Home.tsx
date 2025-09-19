import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Database, Brain, Server, Zap, ArrowRight, ArrowDown, ArrowUp } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h1 className="text-xl font-semibold">PuppyGraph Analytics Platform</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Relational and Connected Data Analytics
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A demonstration platform showcasing PuppyGraph's capabilities for unified 
              relational and graph analytics on PostgreSQL data.
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary" className="text-sm">
                PostgreSQL Integration
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Graph Analytics
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Real-time Queries
              </Badge>
            </div>
          </div>

          {/* Architecture Diagram */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">System Architecture</CardTitle>
              <CardDescription className="text-center">
                Unified data platform combining relational and graph analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Top Row - Application Layer */}
                <div className="flex justify-center">
                  <Card className="w-80 h-40 flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <Server className="w-12 h-12 text-orange-600 dark:text-orange-400 mb-3" />
                    <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100">Analytics Platform</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 text-center">
                      Web Application & APIs
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">React Frontend</Badge>
                      <Badge variant="outline" className="text-xs">Node.js Backend</Badge>
                    </div>
                  </Card>
                </div>

                {/* Middle Row - Processing Layer */}
                <div className="flex justify-center">
                  <ArrowDown className="w-6 h-6 text-muted-foreground" />
                </div>

                <div className="flex justify-center">
                  <Card className="w-80 h-40 flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                    <Brain className="w-12 h-12 text-purple-600 dark:text-purple-400 mb-3" />
                    <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">PuppyGraph</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300 text-center">
                      Graph Analytics Engine
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">Cypher Queries</Badge>
                      <Badge variant="outline" className="text-xs">Natural Language</Badge>
                    </div>
                  </Card>
                </div>

                {/* Bottom Row - Data Sources */}
                <div className="flex justify-center">
                  <ArrowDown className="w-6 h-6 text-muted-foreground" />
                </div>

                <div className="flex justify-center items-center space-x-8">
                  <Card className="w-48 h-32 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <Database className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">PostgreSQL</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 text-center">Relational Data</p>
                  </Card>
                  
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  
                  <Card className="w-48 h-32 flex flex-col items-center justify-center bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <Zap className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">LanceDB</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 text-center">Vector Database</p>
                    <Badge variant="outline" className="text-xs mt-1">Coming Soon</Badge>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Relational Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Leverage PostgreSQL's robust relational capabilities for complex queries, 
                  aggregations, and traditional analytics workflows.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Graph Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Discover patterns and relationships in your data using graph algorithms, 
                  path analysis, and network effects through PuppyGraph.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  Vector Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Enhanced semantic search and similarity matching capabilities coming soon 
                  with LanceDB integration for AI-powered analytics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-orange-600" />
                  Unified Interface
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Single platform for both SQL and graph queries with natural language 
                  processing and intelligent query suggestions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUp className="w-5 h-5 text-indigo-600" />
                  Real-time Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Live data synchronization between PostgreSQL and PuppyGraph ensures 
                  your analytics are always up-to-date with the latest information.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-pink-600" />
                  Scalable Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Built for enterprise scale with Docker containerization, horizontal 
                  scaling capabilities, and cloud deployment options.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Explore the platform's capabilities through our interactive tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Query Builder</h4>
                  <p className="text-sm text-muted-foreground">
                    Start with natural language queries or write Cypher directly to explore your data.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Graph Explorer</h4>
                  <p className="text-sm text-muted-foreground">
                    Visualize relationships and patterns in your data with interactive graph views.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Data Browser</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse and analyze your data in traditional table format with advanced filtering.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Analytics Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate insights and reports with temporal analytics and trend analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}