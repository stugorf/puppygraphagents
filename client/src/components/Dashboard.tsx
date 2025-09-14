import { useState } from "react";
import { QueryInterface } from "./QueryInterface";
import { GraphVisualization } from "./GraphVisualization";
import { DataTable } from "./DataTable";
import { TemporalControls } from "./TemporalControls";
import { MetricsCards } from "./MetricsCards";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface GraphNode {
  id: string;
  label: string;
  type: 'company' | 'person' | 'transaction' | 'rating';
  x: number;
  y: number;
  properties?: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  timestamp?: string;
}

interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  scalarResults?: Array<{key: string, value: any}>;
  reasoning?: string;
  execution_time?: number;
  query_type?: string;
  cypher_query?: string;
}

export function Dashboard() {
  const [selectedTab, setSelectedTab] = useState("query");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [temporalParams, setTemporalParams] = useState<{
    startDate?: string;
    endDate?: string;
    granularity?: string;
  }>({});

  const handleExecuteQuery = (query: string, type: 'natural' | 'cypher') => {
    console.log(`Executing ${type} query:`, query);
    setLastQuery(query);
    // Switch to appropriate view based on result type
    // Will be determined after query execution
  };

  const handleQueryResult = (result: QueryResult) => {
    console.log('Received query result:', result);
    setQueryResult(result);
    
    // Determine which view to show based on result type
    const hasGraphData = result.nodes && result.nodes.length > 0;
    const hasScalarData = result.scalarResults && result.scalarResults.length > 0;
    
    if (hasGraphData) {
      // Show graph view for node/edge results
      setSelectedTab("graph");
    } else if (hasScalarData) {
      // Show data view for scalar-only results
      setSelectedTab("data");
    } else {
      // Default to data view if no specific data type
      setSelectedTab("data");
    }
  };

  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
    // Simulate switching to data view to show details
    setSelectedTab("data");
  };

  const handleRowClick = (record: any) => {
    console.log('Record clicked:', record);
  };

  const handleTimeRangeChange = (startDate: string, endDate: string) => {
    console.log('Time range changed:', { startDate, endDate });
    setTemporalParams(prev => ({ ...prev, startDate, endDate }));
  };

  const handlePlaybackSpeed = (speed: number) => {
    console.log('Playback speed changed:', speed);
    // Speed changes could affect granularity in the future
  };

  const handleGranularityChange = (granularity: string) => {
    console.log('Granularity changed:', granularity);
    setTemporalParams(prev => ({ ...prev, granularity }));
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h1 className="text-xl font-semibold">Temporal Knowledge Graph Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Query Interface */}
          <ResizablePanel defaultSize={30} minSize={25}>
            <div className="h-full p-4">
              <QueryInterface 
                onExecuteQuery={handleExecuteQuery} 
                onQueryResult={handleQueryResult}
                temporalParams={temporalParams}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Panel - Tabbed Content */}
          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4">
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="query" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="graph" data-testid="tab-graph">Graph View</TabsTrigger>
                  <TabsTrigger value="data" data-testid="tab-data">Data View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="query" className="h-[calc(100%-3rem)] mt-4">
                  <div className="space-y-4 h-full">
                    <MetricsCards queryResult={queryResult} />
                    <div className="flex-1">
                      <GraphVisualization 
                        nodes={queryResult?.nodes} 
                        edges={queryResult?.edges}
                        onNodeClick={handleNodeClick} 
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="graph" className="h-[calc(100%-3rem)] mt-4">
                  {queryResult?.nodes && queryResult.nodes.length > 0 ? (
                    <GraphVisualization 
                      nodes={queryResult.nodes} 
                      edges={queryResult.edges}
                      onNodeClick={handleNodeClick} 
                    />
                  ) : queryResult?.scalarResults && queryResult.scalarResults.length > 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <div className="text-6xl">📊</div>
                        <h3 className="text-xl font-semibold">Scalar Data Only</h3>
                        <p className="text-muted-foreground max-w-md">
                          This query returned scalar values (properties) instead of graph nodes and relationships. 
                          Switch to the Data View to see the results.
                        </p>
                        <button 
                          onClick={() => setSelectedTab("data")}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          View Data
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <div className="text-6xl">🔍</div>
                        <h3 className="text-xl font-semibold">No Graph Data</h3>
                        <p className="text-muted-foreground">
                          Execute a query to see graph visualization results.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="data" className="h-[calc(100%-3rem)] mt-4">
                  <DataTable 
                    nodes={queryResult?.nodes}
                    queryResult={queryResult}
                    onRowClick={handleRowClick} 
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel - Temporal Controls */}
          <ResizablePanel defaultSize={20} minSize={18}>
            <div className="h-full p-4">
              <TemporalControls 
                onTimeRangeChange={handleTimeRangeChange}
                onPlaybackSpeed={handlePlaybackSpeed}
                onGranularityChange={handleGranularityChange}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}