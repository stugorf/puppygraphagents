import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Info, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  isExpanded?: boolean;
  onExpand?: () => void;
}

// Enhanced force-directed layout algorithm
const forceLayout = (nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) => {
  if (nodes.length === 0) return nodes;
  
  const iterations = 100;
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1));
  const minDistance = 80; // Minimum distance between nodes (increased for better separation)
  const maxDistance = 250; // Maximum distance for attractive forces
  const temperature = 0.3; // Increased temperature for more movement
  const coolingRate = 0.95;
  
  // Initialize positions with better distribution
  nodes.forEach((node, index) => {
    if (node.x === undefined || node.y === undefined) {
      // Use a more structured initial layout
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const rows = Math.ceil(nodes.length / cols);
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      // Add more padding and better spacing
      const padding = 100;
      const availableWidth = width - 2 * padding;
      const availableHeight = height - 2 * padding;
      
      node.x = padding + (col + 0.5) * (availableWidth / cols);
      node.y = padding + (row + 0.5) * (availableHeight / rows);
      
      // Add more randomness to break symmetry
      node.x += (Math.random() - 0.5) * 80;
      node.y += (Math.random() - 0.5) * 80;
    }
  });

  let currentTemp = temperature;

  for (let i = 0; i < iterations; i++) {
    // Repulsive forces between all nodes
    nodes.forEach((node, i) => {
      let fx = 0, fy = 0;
      
      nodes.forEach((other, j) => {
        if (i !== j) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Stronger repulsion for closer nodes
          if (distance < minDistance) {
            const force = (minDistance * minDistance) / (distance * distance);
            fx += (dx / distance) * force * 2;
            fy += (dy / distance) * force * 2;
          } else {
            const force = (k * k) / distance;
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        }
      });
      
      // Attractive forces for connected nodes
      edges.forEach(edge => {
        if (edge.source === node.id) {
          const target = nodes.find(n => n.id === edge.target);
          if (target) {
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Only apply attraction if nodes are too far apart
            if (distance > maxDistance) {
              const force = (distance - maxDistance) / k;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        } else if (edge.target === node.id) {
          const source = nodes.find(n => n.id === edge.source);
          if (source) {
            const dx = source.x - node.x;
            const dy = source.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Only apply attraction if nodes are too far apart
            if (distance > maxDistance) {
              const force = (distance - maxDistance) / k;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        }
      });
      
      // Apply forces with temperature cooling
      const coolingFactor = Math.pow(coolingRate, i);
      const forceMultiplier = currentTemp * coolingFactor;
      
      node.x += fx * forceMultiplier;
      node.y += fy * forceMultiplier;
      
      // Keep nodes within bounds with padding
      const padding = 80;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    });
    
    // Cool down the temperature
    currentTemp *= coolingRate;
  }
  
  // Post-processing: resolve any remaining overlaps
  const resolveOverlaps = (nodes: GraphNode[], minDistance: number) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance > 0) {
          const overlap = minDistance - distance;
          const separationX = (dx / distance) * (overlap / 2);
          const separationY = (dy / distance) * (overlap / 2);
          
          node1.x += separationX;
          node1.y += separationY;
          node2.x -= separationX;
          node2.y -= separationY;
        }
      }
    }
  };
  
  resolveOverlaps(nodes, minDistance);
  
  return nodes;
};

export function GraphVisualization({ 
  nodes = [], 
  edges = [],
  onNodeClick,
  onEdgeClick,
  isExpanded = false,
  onExpand
}: GraphVisualizationProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use real data when available, show empty state when no data
  const displayNodes = nodes || [];
  const displayEdges = edges || [];
  
  // Track if layout has been applied to prevent unnecessary re-layouts
  const [layoutApplied, setLayoutApplied] = useState(false);
  const [lastNodeCount, setLastNodeCount] = useState(0);

  // Apply force layout when nodes change
  useEffect(() => {
    setSelectedNode(null);
    
    if (displayNodes.length === 0) {
      setLayoutApplied(false);
      setLastNodeCount(0);
      return;
    }
    
    // Only apply layout if:
    // 1. Layout hasn't been applied yet, OR
    // 2. Node count has changed (new data), OR
    // 3. Nodes don't have positions yet
    const needsLayout = !layoutApplied || 
                       lastNodeCount !== displayNodes.length ||
                       displayNodes.some(node => node.x === undefined || node.y === undefined);
    
    if (!needsLayout) return;
    
    const applyForceLayout = () => {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 400;
      
      console.log('Applying force layout to', displayNodes.length, 'nodes', {
        layoutApplied,
        lastNodeCount,
        needsLayout,
        sampleNode: displayNodes[0] ? { id: displayNodes[0].id, x: displayNodes[0].x, y: displayNodes[0].y } : null
      });
      
      // Create a copy of nodes - only randomize if no existing positions
      const nodesCopy = displayNodes.map(node => {
        if (node.x !== undefined && node.y !== undefined) {
          // Keep existing positions if they exist
          return { ...node };
        } else {
          // Only randomize if no existing position
          return { 
            ...node, 
            x: Math.random() * (containerWidth - 100) + 50,
            y: Math.random() * (containerHeight - 100) + 50
          };
        }
      });
      
      // Apply force layout
      const layoutedNodes = forceLayout(nodesCopy, displayEdges, containerWidth, containerHeight);
      
      // Update the original nodes with new positions
      displayNodes.forEach((node, index) => {
        if (layoutedNodes[index]) {
          node.x = layoutedNodes[index].x;
          node.y = layoutedNodes[index].y;
        }
      });
      
      setLayoutApplied(true);
      setLastNodeCount(displayNodes.length);
      
      console.log('Force layout applied:', displayNodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
    };
    
    // Apply layout immediately
    applyForceLayout();
    
    // Also apply with a small delay to ensure container is ready
    const timeoutId = setTimeout(applyForceLayout, 50);
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, layoutApplied, lastNodeCount]);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start dragging if clicking on the SVG background, not on nodes or edges
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // This is now handled by global listeners
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel events for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  // Global mouse event listeners for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'company': return 'hsl(var(--primary))';
      case 'person': return 'hsl(var(--chart-3))';
      case 'transaction': return 'hsl(var(--chart-2))';
      case 'rating': return 'hsl(var(--chart-4))';
      default: return 'hsl(var(--muted))';
    }
  };

  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
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

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleExpand = () => {
    onExpand?.();
  };

  const handleRefreshLayout = () => {
    if (displayNodes.length > 0) {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 400;
      
      console.log('Manual layout refresh triggered');
      
      // Reset layout state to force re-layout
      setLayoutApplied(false);
      
      // Create a copy of nodes with slight position adjustments to break symmetry
      const nodesCopy = displayNodes.map(node => ({ 
        ...node, 
        x: (node.x || 0) + (Math.random() - 0.5) * 20, // Small random adjustment
        y: (node.y || 0) + (Math.random() - 0.5) * 20  // Small random adjustment
      }));
      
      const layoutedNodes = forceLayout(nodesCopy, displayEdges, containerWidth, containerHeight);
      
      // Update the nodes with new positions
      displayNodes.forEach((node, index) => {
        if (layoutedNodes[index]) {
          node.x = layoutedNodes[index].x;
          node.y = layoutedNodes[index].y;
        }
      });
      
      setLayoutApplied(true);
      console.log('Manual layout refresh applied');
    }
  };

  const graphContent = (
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
              <Button size="icon" variant="ghost" onClick={handleRefreshLayout} data-testid="button-refresh-layout" title="Refresh Layout">
                <RefreshCw className="w-4 h-4" />
              </Button>
              {!isExpanded && onExpand ? (
                <Button size="icon" variant="ghost" onClick={handleExpand} data-testid="button-expand" title="Expand Graph">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" onClick={handleFullscreen} data-testid="button-fullscreen" title="Fullscreen">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className="relative w-full h-96 border border-border rounded-b-lg overflow-hidden bg-card"
        >
          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox={`${-pan.x} ${-pan.y} ${500/zoom} ${400/zoom}`}
            className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
            data-testid="graph-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
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
              <motion.g 
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.random() * 0.2 }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={selectedNode === node.id ? "25" : "20"}
                  fill={getNodeColor(node.type)}
                  stroke={selectedNode === node.id ? "hsl(var(--ring))" : "white"}
                  strokeWidth={selectedNode === node.id ? "3" : "2"}
                  className="cursor-pointer hover:opacity-80 transition-all"
                  onClick={(e) => handleNodeClick(node, e)}
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
              </motion.g>
            ))}
          </svg>
          
          {/* Info panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="absolute top-4 right-4 bg-popover border border-popover-border rounded-lg p-3 shadow-lg max-w-xs z-10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Node Details</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {(() => {
                  const node = displayNodes.find(n => n.id === selectedNode);
                  return node ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Label:</span>
                        <p className="font-medium">{node.label}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium capitalize">{node.type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <p className="font-mono text-xs break-all">{node.id}</p>
                      </div>
                      {node.properties && Object.keys(node.properties).length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Properties:</span>
                          <div className="mt-1 space-y-1">
                            {Object.entries(node.properties).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );

  // Fullscreen dialog
  if (isFullscreen) {
    return (
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Knowledge Graph - Fullscreen</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {displayNodes.length} nodes, {displayEdges.length} edges
                </Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleRefreshLayout} title="Refresh Layout">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-6 pt-0">
            <div className="w-full h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-card">
              <svg 
                ref={svgRef}
                width="100%" 
                height="100%" 
                viewBox={`${-pan.x} ${-pan.y} ${500/zoom} ${400/zoom}`}
                className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* Grid background */}
                <defs>
                  <pattern id="grid-fullscreen" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-fullscreen)" />
                
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
                  <motion.g 
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.random() * 0.2 }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={selectedNode === node.id ? "25" : "20"}
                      fill={getNodeColor(node.type)}
                      stroke={selectedNode === node.id ? "hsl(var(--ring))" : "white"}
                      strokeWidth={selectedNode === node.id ? "3" : "2"}
                      className="cursor-pointer hover:opacity-80 transition-all"
                      onClick={(e) => handleNodeClick(node, e)}
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
                  </motion.g>
                ))}
              </svg>
              
              {/* Info panel for fullscreen */}
              <AnimatePresence>
                {selectedNode && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="absolute top-4 right-4 bg-popover border border-popover-border rounded-lg p-3 shadow-lg max-w-xs z-10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Node Details</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setSelectedNode(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {(() => {
                      const node = displayNodes.find(n => n.id === selectedNode);
                      return node ? (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Label:</span>
                            <p className="font-medium">{node.label}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <p className="font-medium capitalize">{node.type}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ID:</span>
                            <p className="font-mono text-xs break-all">{node.id}</p>
                          </div>
                          {node.properties && Object.keys(node.properties).length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Properties:</span>
                              <div className="mt-1 space-y-1">
                                {Object.entries(node.properties).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return graphContent;
}