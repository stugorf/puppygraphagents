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
  reasoning?: string;
  execution_time?: number;
  query_type?: string;
  cypher_query?: string;
}

export function Dashboard() {
  const [selectedTab, setSelectedTab] = useState("query");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");

  const handleExecuteQuery = (query: string, type: 'natural' | 'cypher') => {
    console.log(`Executing ${type} query:`, query);
    setLastQuery(query);
    // Switch to graph view after query execution
    setSelectedTab("graph");
  };

  const handleQueryResult = (result: QueryResult) => {
    console.log('Received query result:', result);
    setQueryResult(result);
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
  };

  const handlePlaybackSpeed = (speed: number) => {
    console.log('Playback speed changed:', speed);
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
                  <GraphVisualization 
                    nodes={queryResult?.nodes} 
                    edges={queryResult?.edges}
                    onNodeClick={handleNodeClick} 
                  />
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
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}