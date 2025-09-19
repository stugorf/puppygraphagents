import { UnifiedGraphRecord } from './simplified_puppygraph_client';

export interface GraphNode {
  id: string;
  label: string;
  type: 'company' | 'person' | 'transaction' | 'rating';
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  timestamp?: string;
}

export interface GraphRecord {
  id: string;
  type: 'node' | 'edge';
  label: string;
  properties: Record<string, any>;
  source?: string;
  target?: string;
  relationship?: string;
}

export class DataTransformer {
  /**
   * Transform unified records to graph visualization format
   */
  static toGraphVisualization(records: UnifiedGraphRecord[]): { nodes: GraphNode[], edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    // Simple circular layout for nodes (exclude scalar records)
    const nodeRecords = records.filter(r => r.type === 'node');
    const radius = Math.min(150 + nodeRecords.length * 10, 250);
    
    nodeRecords.forEach((record, index) => {
      const angle = (index * 2 * Math.PI) / nodeRecords.length;
      
      nodes.push({
        id: record.id,
        label: record.label,
        type: record.displayType || 'other',
        x: 250 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle),
        properties: record.properties
      });
    });
    
    // Add edges (exclude scalar records)
    const edgeRecords = records.filter(r => r.type === 'edge');
    edgeRecords.forEach(record => {
      if (record.source && record.target) {
        edges.push({
          id: record.id,
          source: record.source,
          target: record.target,
          label: record.label,
          type: record.relationship || record.label,
          timestamp: record.properties?.start_date || record.properties?.valid_from
        });
      }
    });
    
    return { nodes, edges };
  }

  /**
   * Transform unified records to data table format
   */
  static toDataTable(records: UnifiedGraphRecord[]): GraphRecord[] {
    return records.map(record => ({
      id: record.id,
      type: record.type,
      label: record.label,
      properties: record.properties,
      source: record.source,
      target: record.target,
      relationship: record.relationship
    }));
  }

  /**
   * Transform unified records to legacy format for backward compatibility
   * Properly handles PuppyGraph's response format with dynamic property detection
   */
  static toLegacyFormat(records: UnifiedGraphRecord[]): { nodes: any[], edges: any[], scalarResults: any[] } {
    const nodes: any[] = [];
    const edges: any[] = [];
    const scalarResults: any[] = [];
    
    // Group scalars by their node variable (e.g., c.name -> c)
    const scalarGroups: Record<string, Record<string, any>> = {};
    
    records.forEach(record => {
      if (record.type === 'node') {
        // For nodes, use their actual properties from PuppyGraph
        const nodeData = {
          id: record.id,
          label: record.label,
          properties: record.properties,
          labels: record.labels
        };
        
        // Try to extract a better label from properties
        if (record.properties?.name) {
          nodeData.label = record.properties.name;
        } else if (record.properties?.title) {
          nodeData.label = record.properties.title;
        }
        
        nodes.push(nodeData);
      } else if (record.type === 'edge') {
        edges.push({
          id: record.id,
          fromId: record.source,
          toId: record.target,
          label: record.label,
          properties: record.properties
        });
      } else if (record.type === 'scalar') {
        // Handle scalar results - group by node variable
        scalarResults.push({
          key: record.label,
          value: Object.values(record.properties)[0]
        });
        
        // Extract node variable and property from scalar key (e.g., "c.name" -> nodeVar="c", property="name")
        const match = record.label.match(/^([a-zA-Z]+)\.(.+)$/);
        if (match) {
          const [, nodeVar, property] = match;
          if (!scalarGroups[nodeVar]) {
            scalarGroups[nodeVar] = {};
          }
          scalarGroups[nodeVar][property] = Object.values(record.properties)[0];
        }
      }
    });
    
    // If we have scalar groups, merge them with nodes that don't have properties
    // This handles cases where PuppyGraph returns nodes without properties but with scalar values
    if (Object.keys(scalarGroups).length > 0) {
      nodes.forEach(node => {
        // If node has no properties but we have scalar data, merge it
        if (!node.properties || Object.keys(node.properties).length === 0) {
          // Find the first scalar group that might match this node
          const scalarGroup = Object.values(scalarGroups)[0];
          if (scalarGroup) {
            node.properties = { ...node.properties, ...scalarGroup };
            
            // Update label if we have a name property
            if (scalarGroup.name) {
              node.label = scalarGroup.name;
            }
          }
        }
      });
    }
    
    return { nodes, edges, scalarResults };
  }

  /**
   * Apply force layout to nodes for better graph visualization
   */
  static applyForceLayout(nodes: GraphNode[], edges: GraphEdge[], width: number = 800, height: number = 400): GraphNode[] {
    if (nodes.length === 0) return nodes;
    
    const iterations = 100;
    const k = Math.sqrt((width * height) / Math.max(nodes.length, 1));
    const minDistance = 80;
    const maxDistance = 250;
    const temperature = 0.3;
    const coolingRate = 0.95;
    
    // Initialize positions
    nodes.forEach((node, index) => {
      if (node.x === undefined || node.y === undefined) {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const rows = Math.ceil(nodes.length / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const padding = 100;
        const availableWidth = width - 2 * padding;
        const availableHeight = height - 2 * padding;
        
        node.x = padding + (col + 0.5) * (availableWidth / cols);
        node.y = padding + (row + 0.5) * (availableHeight / rows);
        
        node.x += (Math.random() - 0.5) * 80;
        node.y += (Math.random() - 0.5) * 80;
      }
    });

    let currentTemp = temperature;

    for (let i = 0; i < iterations; i++) {
      nodes.forEach((node, i) => {
        let fx = 0, fy = 0;
        
        // Repulsive forces
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
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
              
              if (distance > maxDistance) {
                const force = (distance - maxDistance) / k;
                fx += (dx / distance) * force;
                fy += (dy / distance) * force;
              }
            }
          }
        });
        
        const coolingFactor = Math.pow(coolingRate, i);
        const forceMultiplier = currentTemp * coolingFactor;
        
        node.x += fx * forceMultiplier;
        node.y += fy * forceMultiplier;
        
        const padding = 80;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
      });
      
      currentTemp *= coolingRate;
    }
    
    return nodes;
  }
}
