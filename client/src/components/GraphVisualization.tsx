import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Info } from "lucide-react";

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

interface GraphVisualizationProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

export function GraphVisualization({ 
  nodes = [], 
  edges = [],
  onNodeClick,
  onEdgeClick 
}: GraphVisualizationProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Mock data for demonstration - todo: remove mock functionality
  const mockNodes: GraphNode[] = [
    { id: "1", label: "Goldman Sachs", type: "company", x: 100, y: 100 },
    { id: "2", label: "JPMorgan Chase", type: "company", x: 300, y: 150 },
    { id: "3", label: "David Solomon", type: "person", x: 150, y: 250 },
    { id: "4", label: "AAA Rating", type: "rating", x: 250, y: 50 },
    { id: "5", label: "Merger Deal", type: "transaction", x: 400, y: 200 },
  ];

  const mockEdges: GraphEdge[] = [
    { id: "e1", source: "1", target: "3", label: "CEO", type: "HAS_EXECUTIVE" },
    { id: "e2", source: "1", target: "4", label: "rated", type: "HAS_RATING" },
    { id: "e3", source: "2", target: "5", label: "involved", type: "PARTICIPATES_IN" },
    { id: "e4", source: "1", target: "2", label: "competitor", type: "COMPETES_WITH" },
  ];

  const displayNodes = nodes.length > 0 ? nodes : mockNodes;
  const displayEdges = edges.length > 0 ? edges : mockEdges;

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'company': return 'hsl(var(--primary))';
      case 'person': return 'hsl(var(--chart-3))';
      case 'transaction': return 'hsl(var(--chart-2))';
      case 'rating': return 'hsl(var(--chart-4))';
      default: return 'hsl(var(--muted))';
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);
    console.log('Node clicked:', node);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Knowledge Graph</span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {displayNodes.length} nodes, {displayEdges.length} edges
            </Badge>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={handleZoomIn} data-testid="button-zoom-in">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleZoomOut} data-testid="button-zoom-out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleReset} data-testid="button-reset-view">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-fullscreen">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative w-full h-96 border border-border rounded-b-lg overflow-hidden bg-card">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`${-pan.x} ${-pan.y} ${500/zoom} ${400/zoom}`}
            className="cursor-grab"
            data-testid="graph-canvas"
          >
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Edges */}
            {displayEdges.map((edge) => {
              const sourceNode = displayNodes.find(n => n.id === edge.source);
              const targetNode = displayNodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              return (
                <g key={edge.id}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                    opacity="0.6"
                    className="cursor-pointer hover:opacity-100"
                    onClick={() => onEdgeClick?.(edge)}
                    data-testid={`edge-${edge.id}`}
                  />
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground pointer-events-none"
                    dy="-5"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}
            
            {/* Nodes */}
            {displayNodes.map((node) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={selectedNode === node.id ? "25" : "20"}
                  fill={getNodeColor(node.type)}
                  stroke={selectedNode === node.id ? "hsl(var(--ring))" : "white"}
                  strokeWidth={selectedNode === node.id ? "3" : "2"}
                  className="cursor-pointer hover:opacity-80 transition-all"
                  onClick={() => handleNodeClick(node)}
                  data-testid={`node-${node.id}`}
                />
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  className="text-xs fill-foreground pointer-events-none font-medium"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 48}
                  textAnchor="middle"
                  className="text-xs fill-muted-foreground pointer-events-none"
                >
                  {node.type}
                </text>
              </g>
            ))}
          </svg>
          
          {/* Info panel */}
          {selectedNode && (
            <div className="absolute top-4 right-4 bg-popover border border-popover-border rounded-lg p-3 shadow-lg max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Node Details</span>
              </div>
              {(() => {
                const node = displayNodes.find(n => n.id === selectedNode);
                return node ? (
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Label:</span> {node.label}</p>
                    <p><span className="text-muted-foreground">Type:</span> {node.type}</p>
                    <p><span className="text-muted-foreground">ID:</span> {node.id}</p>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}