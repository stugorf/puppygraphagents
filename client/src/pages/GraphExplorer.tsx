import { useState, useEffect } from "react";
import { GraphVisualization } from "@/components/GraphVisualization";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GraphNode {
  id: string;
  label: string;
  type: 'company' | 'person' | 'transaction' | 'rating' | 'regulatoryevent';
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

interface GraphSchema {
  vertices: Array<{
    label: string;
    oneToOne: {
      tableSource: {
        catalog: string;
        schema: string;
        table: string;
      };
      attributes: Array<{
        type: string;
        field: string;
        alias: string;
      }>;
    };
  }>;
  edges: Array<{
    label: string;
    fromVertex: string;
    toVertex: string;
    tableSource: {
      catalog: string;
      schema: string;
      table: string;
    };
    attributes?: Array<{
      type: string;
      field: string;
      alias: string;
    }>;
  }>;
}

// Convert schema data to GraphVisualization format
const convertSchemaToGraphData = (schema: GraphSchema) => {
  const nodes = schema.vertices.map((vertex, index) => ({
    id: vertex.label,
    label: vertex.label,
    type: vertex.label.toLowerCase() as 'company' | 'person' | 'transaction' | 'rating' | 'regulatoryevent',
    x: 0, // Will be set by force layout
    y: 0, // Will be set by force layout
    properties: {
      attributes: vertex.oneToOne.attributes.map(attr => ({
        name: attr.alias,
        type: attr.type
      })),
      table: vertex.oneToOne.tableSource.table,
      attributeCount: vertex.oneToOne.attributes.length
    }
  }));

  const edges = schema.edges.map((edge, index) => ({
    id: `edge-${index}`,
    source: edge.fromVertex,
    target: edge.toVertex,
    label: edge.label,
    type: edge.label,
    properties: edge.attributes ? {
      attributes: edge.attributes.map(attr => ({
        name: attr.alias,
        type: attr.type
      }))
    } : {}
  }));

  return { nodes, edges };
};

export default function GraphExplorer() {
  const [graphSchema, setGraphSchema] = useState<GraphSchema | null>(null);
  const [schemaNodes, setSchemaNodes] = useState<GraphNode[]>([]);
  const [schemaEdges, setSchemaEdges] = useState<GraphEdge[]>([]);
  const [queryResult, setQueryResult] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [showSchema, setShowSchema] = useState(true);
  const { toast } = useToast();

  // Fetch graph schema on component mount
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/graph/status');
        if (response.ok) {
          const data = await response.json();
          console.log('GraphExplorer - Fetched schema data:', data.schema.graph);
          setGraphSchema(data.schema.graph);
          
          // Convert schema to graph data
          const { nodes, edges } = convertSchemaToGraphData(data.schema.graph);
          setSchemaNodes(nodes);
          setSchemaEdges(edges);
        } else {
          throw new Error('Failed to fetch schema');
        }
      } catch (error) {
        console.error('Failed to fetch graph schema:', error);
        toast({
          title: "Error",
          description: "Failed to load graph schema. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSchema();
  }, [toast]);

  const handleNodeDoubleClick = async (node: GraphNode) => {
    console.log('Node double-clicked:', node);
    
    try {
      setIsExecutingQuery(true);
      
      // Generate a MATCH query for all nodes of this type with explicit properties
      const cypherQuery = `MATCH (n:${node.label}) RETURN n.name as name, n.ticker as ticker, n.sector as sector, n.industry as industry, n.title as title, n.rating as rating, n.type as type, n.event_type as event_type, n LIMIT 100`;
      
      console.log('Executing query:', cypherQuery);
      
      const response = await fetch('/api/graph/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cypher_query: cypherQuery
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Query result:', result);
      console.log('First node:', result.nodes?.[0]);
      console.log('First node properties:', result.nodes?.[0]?.properties);
      console.log('Scalar results:', result.scalarResults);
      console.log('Records:', result.records);

      if (result.success && result.nodes) {
        // Process nodes to extract meaningful labels from properties
        const processedNodes = result.nodes.map((node: any, index: number) => {
          console.log('Processing node:', node);
          
          // Try to find a meaningful label from properties
          let label = node.label;
          let nodeType = node.label; // Store original label as type
          let properties = node.properties || {};
          
          // Handle different property structures
          if (node.props) {
            properties = node.props;
          }
          
          // Check if we have scalar results that might contain properties
          if (result.scalarResults && result.scalarResults.length > 0) {
            // Group scalars by node index (assuming they're in order)
            const nodeScalars = result.scalarResults.slice(index * 8, (index + 1) * 8); // 8 properties per node
            
            // Convert scalars to properties
            const scalarProperties: Record<string, any> = {};
            nodeScalars.forEach((scalar: any) => {
              if (scalar.value !== null && scalar.value !== undefined) {
                scalarProperties[scalar.key] = scalar.value;
              }
            });
            
            if (Object.keys(scalarProperties).length > 0) {
              properties = { ...properties, ...scalarProperties };
            }
          }
          
          console.log('Node properties:', properties);
          
          if (properties && Object.keys(properties).length > 0) {
            // Priority order for label selection
            if (properties.name) {
              label = properties.name;
            } else if (properties.title) {
              label = properties.title;
            } else if (properties.ticker) {
              label = properties.ticker;
            } else if (properties.rating) {
              label = properties.rating;
            } else if (properties.type) {
              label = properties.type;
            } else if (properties.event_type) {
              label = properties.event_type;
            }
          }
          
          return {
            ...node,
            label: label,
            type: nodeType.toLowerCase() as 'company' | 'person' | 'transaction' | 'rating' | 'regulatoryevent',
            properties: properties
          };
        });
        
        setQueryResult({
          nodes: processedNodes,
          edges: result.edges || []
        });
        setShowSchema(false);
        
        toast({
          title: "Query Executed",
          description: `Found ${result.nodes.length} ${node.label} nodes`,
        });
      } else {
        throw new Error(result.error || 'Query failed');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast({
        title: "Query Error",
        description: `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const handleRefreshSchema = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/graph/status');
      if (response.ok) {
        const data = await response.json();
        setGraphSchema(data.schema.graph);
        
        const { nodes, edges } = convertSchemaToGraphData(data.schema.graph);
        setSchemaNodes(nodes);
        setSchemaEdges(edges);
        
        toast({
          title: "Schema Refreshed",
          description: "Graph schema has been updated",
        });
      }
    } catch (error) {
      console.error('Failed to refresh schema:', error);
      toast({
        title: "Error",
        description: "Failed to refresh schema",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSchema = () => {
    setQueryResult(null);
    setShowSchema(true);
  };

  const displayNodes = showSchema ? schemaNodes : (queryResult?.nodes || []);
  const displayEdges = showSchema ? schemaEdges : (queryResult?.edges || []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h1 className="text-xl font-semibold">Graph Explorer</h1>
          <Badge variant="outline" className="text-xs">
            {displayNodes.length} nodes, {displayEdges.length} edges
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {!showSchema && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToSchema}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Back to Schema
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSchema}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
              <h3 className="text-xl font-semibold">Loading Graph Schema...</h3>
              <p className="text-muted-foreground">
                Fetching graph schema information.
              </p>
            </div>
          </div>
        ) : showSchema ? (
          <div className="h-full p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Graph Schema</h2>
              <p className="text-sm text-muted-foreground">
                Double-click on any node type to explore all instances of that type in the graph.
              </p>
            </div>
            <div className="h-[calc(100%-80px)]">
              <GraphVisualization 
                nodes={displayNodes}
                edges={displayEdges}
                onNodeClick={(node) => {
                  console.log('Schema node clicked:', node);
                }}
                onNodeDoubleClick={handleNodeDoubleClick}
                isExpanded={true}
              />
            </div>
          </div>
        ) : (
          <div className="h-full p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Query Results</h2>
              <p className="text-sm text-muted-foreground">
                Showing all instances of the selected node type. Double-click nodes to explore further.
              </p>
            </div>
            <div className="h-[calc(100%-80px)]">
              <GraphVisualization 
                nodes={displayNodes}
                edges={displayEdges}
                onNodeClick={(node) => {
                  console.log('Result node clicked:', node);
                }}
                onNodeDoubleClick={handleNodeDoubleClick}
                isExpanded={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
