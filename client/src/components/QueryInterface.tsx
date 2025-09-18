import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, RefreshCw, History, Copy, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface TemporalParams {
  startDate?: string;
  endDate?: string;
  granularity?: string;
}

interface QueryInterfaceProps {
  onExecuteQuery?: (query: string, type: 'natural' | 'cypher') => void;
  onQueryResult?: (result: QueryResult) => void;
  temporalParams?: TemporalParams;
}

export function QueryInterface({ onExecuteQuery, onQueryResult, temporalParams }: QueryInterfaceProps) {
  const [naturalQuery, setNaturalQuery] = useState("");
  const [cypherQuery, setCypherQuery] = useState("");
  const [activeTab, setActiveTab] = useState("natural");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCypherQuery, setGeneratedCypherQuery] = useState("");
  const [showCypherDialog, setShowCypherDialog] = useState(false);
  const { toast } = useToast();

  // Transform backend data to frontend format
  const transformGraphData = (backendNodes: any[], backendEdges: any[], scalarResults?: Array<{key: string, value: any}>): QueryResult => {
    const nodeTypeMapping: Record<string, 'company' | 'person' | 'transaction' | 'rating'> = {
      'Company': 'company',
      'Person': 'person', 
      'Transaction': 'transaction',
      'Rating': 'rating'
    };

    // Add positioning for graph layout (simple grid layout)
    const nodes: GraphNode[] = backendNodes.map((node, index) => {
      const angle = (index * 2 * Math.PI) / backendNodes.length;
      const radius = Math.min(150 + backendNodes.length * 10, 250);
      
      return {
        id: node.id,
        label: node.properties?.name || node.properties?.title || node.label || `${node.label} ${index + 1}`,
        type: nodeTypeMapping[node.label] || 'company',
        x: 250 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle),
        properties: node.properties
      };
    });

    // Transform edges to use source/target instead of fromId/toId
    const edges: GraphEdge[] = backendEdges.map(edge => ({
      id: edge.id,
      source: edge.fromId || edge.from_id,
      target: edge.toId || edge.to_id,
      label: edge.label,
      type: edge.label,
      timestamp: edge.properties?.start_date || edge.properties?.valid_from
    }));

    return { 
      nodes, 
      edges, 
      scalarResults: scalarResults || []
    };
  };

  const handleExecute = async () => {
    setIsLoading(true);
    
    try {
      const query = activeTab === "natural" ? naturalQuery : cypherQuery;
      console.log(`Executing ${activeTab} query:`, query);
      
      let apiUrl = '';
      let requestBody: any = {};

      if (activeTab === "natural") {
        apiUrl = '/api/graph/natural';
        requestBody = { 
          query,
          ...(temporalParams?.startDate && {
            startDate: temporalParams.startDate,
            endDate: temporalParams.endDate,
            granularity: temporalParams.granularity
          })
        };
      } else {
        // Use simplified endpoint for better data structure
        apiUrl = '/api/graph/query/simplified';
        requestBody = { cypher_query: query };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success && !data.nodes) {
        throw new Error(data.error || 'Query execution failed');
      }

      // Transform the backend data to frontend format
      let result: QueryResult;
      
      if (activeTab === "cypher" && data.nodes && data.edges) {
        // Simplified endpoint returns pre-formatted data
        result = {
          nodes: data.nodes || [],
          edges: data.edges || [],
          scalarResults: data.scalarResults || []
        };
      } else {
        // Natural language endpoint returns legacy format
        result = transformGraphData(data.nodes || [], data.edges || [], data.scalarResults || []);
      }
      
      // Add metadata
      result.reasoning = data.reasoning;
      result.execution_time = data.total_execution_time || data.execution_time;
      result.query_type = data.query_type;
      result.cypher_query = data.cypher_query || data.cypher_queries?.join('; ');

      // Store generated Cypher query for natural language queries
      if (activeTab === "natural" && result.cypher_query) {
        setGeneratedCypherQuery(result.cypher_query);
      }

      console.log('API response data:', data);
      console.log('Query result with scalarResults:', result);
      onExecuteQuery?.(query, activeTab as 'natural' | 'cypher');
      onQueryResult?.(result);

      const hasScalarData = result.scalarResults && result.scalarResults.length > 0;
      const scalarCount = hasScalarData ? Math.floor(result.scalarResults.length / 3) : 0; // Assuming 3 fields per row
      
      toast({
        title: "Query executed successfully",
        description: hasScalarData 
          ? `Found ${scalarCount} scalar result rows${result.execution_time ? ` in ${(result.execution_time/1000).toFixed(2)}s` : ''}`
          : `Found ${result.nodes.length} nodes and ${result.edges.length} edges${result.execution_time ? ` in ${(result.execution_time/1000).toFixed(2)}s` : ''}`,
      });

    } catch (error) {
      console.error('Query execution error:', error);
      toast({
        title: "Query execution failed", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQueries = {
    natural: [
      "Show me companies in the financial services sector with their executives",
      "Find financial services companies, their CEOs, and any credit ratings they have received",
      "What companies have employees and what are their credit ratings?"
    ],
    cypher: [
      "MATCH (c:Company {sector: 'Financial Services'})<-[:EMPLOYED_BY]-(p:Person) RETURN c.name, c.ticker, c.sector, p.name, p.title",
      "MATCH (c:Company)-[:HAS_RATING]->(r:Rating) RETURN c.name, c.ticker, r.rating, r.rating_agency",
      "MATCH (c:Company)<-[:EMPLOYED_BY]-(p:Person) WHERE c.sector = 'Financial Services' RETURN c.name, p.name, p.title LIMIT 10"
    ]
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Query Interface</span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {activeTab === "natural" ? "Natural Language" : "Cypher"}
            </Badge>
            <Button size="icon" variant="ghost" data-testid="button-query-history">
              <History className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="natural" data-testid="tab-natural-language">Natural Language</TabsTrigger>
            <TabsTrigger value="cypher" data-testid="tab-cypher">Cypher Query</TabsTrigger>
          </TabsList>
          
          <TabsContent value="natural" className="space-y-4">
            <Textarea
              placeholder="Ask a question about your temporal knowledge graph..."
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              className="min-h-[120px] font-sans"
              data-testid="input-natural-query"
            />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Example queries:</p>
              <div className="space-y-1">
                {exampleQueries.natural.map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2 whitespace-normal"
                    onClick={() => setNaturalQuery(query)}
                    data-testid={`example-natural-${index}`}
                  >
                    <Copy className="w-3 h-3 mr-2 flex-shrink-0" />
                    <span className="text-xs">{query}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cypher" className="space-y-4">
            <Textarea
              placeholder="Enter your Cypher query..."
              value={cypherQuery}
              onChange={(e) => setCypherQuery(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              data-testid="input-cypher-query"
            />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Example queries:</p>
              <div className="space-y-1">
                {exampleQueries.cypher.map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2 whitespace-normal font-mono"
                    onClick={() => setCypherQuery(query)}
                    data-testid={`example-cypher-${index}`}
                  >
                    <Copy className="w-3 h-3 mr-2 flex-shrink-0" />
                    <span className="text-xs">{query}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleExecute}
            disabled={isLoading || (activeTab === "natural" && !naturalQuery.trim()) || (activeTab === "cypher" && !cypherQuery.trim())}
            className="flex-1"
            data-testid="button-execute-query"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Execute Query
          </Button>
          
          {activeTab === "natural" && generatedCypherQuery && (
            <Dialog open={showCypherDialog} onOpenChange={setShowCypherDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-show-cypher">
                  <Code className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Generated Cypher Query</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {generatedCypherQuery}
                    </pre>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCypherQuery);
                        toast({
                          title: "Copied to clipboard",
                          description: "Cypher query copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Query
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}