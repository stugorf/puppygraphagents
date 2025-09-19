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

// Simple, effective force-directed layout based on D3.js best practices
const forceLayout = (nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) => {
  if (nodes.length === 0) return nodes;
  
  // Calculate optimal parameters based on container size and node count
  const nodeCount = nodes.length;
  const area = width * height;
  const k = Math.sqrt(area / nodeCount);
  
  // Force parameters optimized for good spacing
  const chargeStrength = -500; // Stronger repulsion for bigger nodes
  const linkDistance = 120; // Distance for connected nodes
  const collisionRadius = 80; // Larger minimum distance for bigger nodes
  const minDistance = 100; // Minimum distance between nodes
  const iterations = 300; // Sufficient iterations for convergence
  
  // Initialize positions centered in the container
  nodes.forEach((node, index) => {
    if (node.x === undefined || node.y === undefined || isNaN(node.x) || isNaN(node.y)) {
      // Start nodes in a small area around the center
      const centerX = width / 2;
      const centerY = height / 2;
      const spread = Math.min(width, height) * 0.3; // 30% of smaller dimension for better spread
      
      node.x = centerX + (Math.random() - 0.5) * spread;
      node.y = centerY + (Math.random() - 0.5) * spread;
      
      // Ensure nodes start within bounds
      const nodeRadius = 35;
      const padding = nodeRadius + 10;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
    
    // Initialize velocity
    node.vx = 0;
    node.vy = 0;
  });
  
  // Run force simulation
  for (let i = 0; i < iterations; i++) {
    // Apply charge force (repulsion between all nodes)
    nodes.forEach((node, i) => {
      let fx = 0, fy = 0;
      
      // Add centering force to pull nodes toward center
      const centerX = width / 2;
      const centerY = height / 2;
      const centerForce = 0.01; // Gentle centering force
      fx += (centerX - node.x) * centerForce;
      fy += (centerY - node.y) * centerForce;
      
      nodes.forEach((other, j) => {
        if (i !== j) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Apply repulsion force
          const force = chargeStrength / (distance * distance);
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      });
      
      // Apply collision force to prevent overlap
      nodes.forEach((other, j) => {
        if (i !== j) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (distance < collisionRadius) {
            const overlap = collisionRadius - distance;
            const force = overlap / collisionRadius;
            fx += (dx / distance) * force * 100;
            fy += (dy / distance) * force * 100;
          }
        }
      });
      
      // Apply link force for connected nodes
      edges.forEach(edge => {
        if (edge.source === node.id) {
          const target = nodes.find(n => n.id === edge.target);
          if (target) {
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            if (distance > linkDistance) {
              const force = (distance - linkDistance) / k;
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
            
            if (distance > linkDistance) {
              const force = (distance - linkDistance) / k;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        }
      });
      
      // Update velocity and position
      node.vx = (node.vx + fx) * 0.9; // Damping
      node.vy = (node.vy + fy) * 0.9; // Damping
      
      node.x += node.vx;
      node.y += node.vy;
      
      // Keep nodes within bounds with node radius consideration
      const nodeRadius = 35;
      const padding = nodeRadius + 10; // Extra padding beyond node radius
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    });
  }
  
  // Post-process to ensure nodes are centered
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Calculate the centroid of all nodes
  const avgX = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
  const avgY = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
  
  // Calculate offset to center the nodes
  const offsetX = centerX - avgX;
  const offsetY = centerY - avgY;
  
  // Apply offset to all nodes
  nodes.forEach(node => {
    node.x += offsetX;
    node.y += offsetY;
    
    // Ensure nodes stay within bounds after centering
    const nodeRadius = 35;
    const padding = nodeRadius + 10;
    node.x = Math.max(padding, Math.min(width - padding, node.x));
    node.y = Math.max(padding, Math.min(height - padding, node.y));
  });
  
  console.log('Force layout completed:', {
    width,
    height,
    centerX,
    centerY,
    nodeCount: nodes.length,
    nodePositions: nodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
  });
  
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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState<{ x: number; y: number; nodeX: number; nodeY: number; svgX?: number; svgY?: number } | null>(null);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [layoutApplied, setLayoutApplied] = useState(false);
  const [lastNodeCount, setLastNodeCount] = useState(0);

  // Create display nodes with custom positions
  const displayNodes = nodes.map(node => {
    const customPos = nodePositions[node.id];
    return {
      ...node,
      x: customPos ? customPos.x : node.x,
      y: customPos ? customPos.y : node.y
    };
  });
  const displayEdges = edges || [];
  
  // Reset layout when nodes prop changes (new query)
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      setLayoutApplied(false);
      setNodePositions({});
    }
  }, [nodes]);

  // Apply force layout when nodes change
  useEffect(() => {
    if (displayNodes.length === 0) {
      setLayoutApplied(false);
      setLastNodeCount(0);
      setNodePositions({});
      return;
    }
    
    // Only apply layout if needed
    const needsLayout = !layoutApplied || 
                       lastNodeCount !== displayNodes.length ||
                       displayNodes.some(node => node.x === undefined || node.y === undefined);
    
    if (!needsLayout) return;
    
    const applyLayout = () => {
      // Use viewBox dimensions for consistent layout
      const containerWidth = 1000;
      const containerHeight = 600;
      
      console.log('Applying force layout to', displayNodes.length, 'nodes', {
        containerWidth,
        containerHeight
      });
      
      // Apply force layout
      const layoutedNodes = forceLayout(displayNodes, displayEdges, containerWidth, containerHeight);
      
      // Update the original nodes with new positions
      nodes.forEach((node, index) => {
        if (layoutedNodes[index]) {
          node.x = layoutedNodes[index].x;
          node.y = layoutedNodes[index].y;
        }
      });
      
      setLayoutApplied(true);
      setLastNodeCount(displayNodes.length);
      
      console.log('Force layout applied:', nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
    };
    
    // Apply layout after a short delay to ensure container is ready
    const timeoutId = setTimeout(applyLayout, 100);
    
    return () => clearTimeout(timeoutId);
  }, [displayNodes, layoutApplied, lastNodeCount, nodes, displayEdges]);

  const handleNodeClick = useCallback((node: GraphNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    const svgX = ((e.clientX - svgRect.left) / zoom) - pan.x;
    const svgY = ((e.clientY - svgRect.top) / zoom) - pan.y;
    
    console.log('Starting drag for node:', node.id);
    
    setDraggedNode(node.id);
    setNodeDragStart({
      x: e.clientX,
      y: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
      svgX: svgX,
      svgY: svgY
    });
    setIsNodeDragging(false);
  }, [zoom, pan]);

  const handleNodeMouseUp = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    
    console.log('Mouse up on node:', node.id, 'wasDragging:', isNodeDragging);
    
    if (!isNodeDragging) {
      // This was a click, not a drag
      handleNodeClick(node, e);
    }
    
    setDraggedNode(null);
    setNodeDragStart(null);
    setIsNodeDragging(false);
  }, [isNodeDragging, handleNodeClick]);

  const handleNodeMouseLeave = useCallback(() => {
    // Only reset if we're not actively dragging
    if (!isNodeDragging) {
      setDraggedNode(null);
      setNodeDragStart(null);
      setIsNodeDragging(false);
    }
  }, [isNodeDragging]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (draggedNode && nodeDragStart) {
      const deltaX = e.clientX - nodeDragStart.x;
      const deltaY = e.clientY - nodeDragStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Start dragging immediately when mouse moves
      if (distance > 2) {
        if (!isNodeDragging) {
          console.log('Starting drag movement');
          setIsNodeDragging(true);
        }
      }
      
      if (isNodeDragging) {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) {
          console.log('No SVG rect found');
          return;
        }
        
        // Convert screen coordinates directly to SVG coordinates
        const svgX = (e.clientX - svgRect.left) / zoom - pan.x;
        const svgY = (e.clientY - svgRect.top) / zoom - pan.y;
        
        // Calculate delta from the initial mouse position
        const deltaX = svgX - (nodeDragStart.svgX || 0);
        const deltaY = svgY - (nodeDragStart.svgY || 0);
        
        const newX = nodeDragStart.nodeX + deltaX;
        const newY = nodeDragStart.nodeY + deltaY;
        
        // Keep within bounds with node radius consideration
        const nodeRadius = 35;
        const padding = nodeRadius + 10; // Extra padding beyond node radius
        
        // Use viewBox dimensions for consistent boundaries
        const containerWidth = 1000;
        const containerHeight = 600;
        
        const boundedX = Math.max(padding, Math.min(containerWidth - padding, newX));
        const boundedY = Math.max(padding, Math.min(containerHeight - padding, newY));
        
        console.log('Dragging node:', {
          draggedNode,
          newX: boundedX,
          newY: boundedY,
          deltaX,
          deltaY
        });
        
        // Update node position in state
        setNodePositions(prev => ({
          ...prev,
          [draggedNode]: { x: boundedX, y: boundedY }
        }));
        
        // Update drag start for next move
        setNodeDragStart(prev => ({
          ...prev!,
          x: e.clientX,
          y: e.clientY,
          nodeX: boundedX,
          nodeY: boundedY,
          svgX: svgX,
          svgY: svgY
        }));
      }
    }
  }, [draggedNode, nodeDragStart, isNodeDragging, zoom, pan]);

  const handleGlobalMouseUp = useCallback(() => {
    console.log('Global mouse up, stopping drag');
    setDraggedNode(null);
    setNodeDragStart(null);
    setIsNodeDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Handle wheel events for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  const getNodeColor = (type: string, label?: string) => {
    if (type?.toLowerCase() === 'company' && label) {
      // Better hash function for more even color distribution
      let hash = 0;
      for (let i = 0; i < label.length; i++) {
        const char = label.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      // Add some additional variation
      hash = hash * 31 + label.length;
      hash = Math.abs(hash);
      // Use bright, high-contrast colors that stand out against dark background
      const colors = [
        '#3b82f6', // Blue
        '#10b981', // Green
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#8b5cf6', // Purple
        '#06b6d4', // Cyan
        '#f97316', // Orange
        '#84cc16', // Lime
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#a855f7', // Violet
        '#f43f5e', // Rose
        '#22c55e', // Emerald
        '#eab308', // Yellow
        '#06b6d4', // Sky
        '#f97316', // Orange
        '#84cc16', // Lime
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#a855f7', // Violet
        '#f43f5e', // Rose
        '#22c55e', // Emerald
        '#eab308', // Yellow
      ];
      return colors[Math.abs(hash) % colors.length];
    }
    switch (type?.toLowerCase()) {
      case 'person': return '#10b981'; // Green
      case 'transaction': return '#3b82f6'; // Blue
      case 'rating': return '#f59e0b'; // Amber
      case 'regulatoryevent': return '#ef4444'; // Red
      case 'transactionevent': return '#8b5cf6'; // Purple
      case 'company': return '#06b6d4'; // Cyan
      default: return '#f97316'; // Orange
    }
  };


  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setNodePositions({});
    setLayoutApplied(false);
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
            viewBox="0 0 1000 600"
            className="select-none"
            data-testid="graph-canvas"
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
            {displayNodes.map((node, index) => (
              <motion.g 
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="cursor-pointer"
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseUp={(e) => handleNodeMouseUp(e, node)}
                onMouseLeave={handleNodeMouseLeave}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="35"
                  fill={getNodeColor(node.type, node.label)}
                  className="hover:opacity-80 transition-opacity"
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className="text-xs fill-background pointer-events-none font-medium"
                  style={{ fontSize: '10px' }}
                >
                  {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
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
                viewBox="0 0 1000 600"
                className="select-none"
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
                {displayNodes.map((node, index) => (
                  <motion.g 
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="cursor-pointer"
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onMouseUp={(e) => handleNodeMouseUp(e, node)}
                    onMouseLeave={handleNodeMouseLeave}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="35"
                      fill={getNodeColor(node.type, node.label)}
                      className="hover:opacity-80 transition-opacity"
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      className="text-xs fill-background pointer-events-none font-medium"
                      style={{ fontSize: '10px' }}
                    >
                      {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
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