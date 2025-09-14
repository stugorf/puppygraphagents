import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { GraphVisualization } from "./GraphVisualization";

interface SchemaVertex {
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
}

interface SchemaEdge {
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
}

interface GraphSchema {
  vertices: SchemaVertex[];
  edges: SchemaEdge[];
}

interface SchemaGraphProps {
  schema?: GraphSchema;
  className?: string;
}

// Convert schema data to GraphVisualization format
const convertSchemaToGraphData = (schema: GraphSchema) => {
  const nodes = schema.vertices.map((vertex, index) => ({
    id: vertex.label,
    label: vertex.label,
    type: vertex.label.toLowerCase() as 'company' | 'person' | 'transaction' | 'rating' | 'regulatoryevent',
    // Don't set x, y - let force layout handle positioning
    properties: {
      attributes: vertex.oneToOne.attributes.map(attr => ({
        name: attr.alias,
        type: attr.type
      })),
      table: vertex.oneToOne.tableSource.table
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

export function SchemaGraph({ schema, className = "" }: SchemaGraphProps) {
  if (!schema) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center space-y-4">
          <Database className="w-16 h-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">Loading Schema Graph...</h3>
          <p className="text-muted-foreground">
            Fetching graph schema information.
          </p>
        </div>
      </div>
    );
  }

  // Convert schema to graph data format
  const { nodes, edges } = convertSchemaToGraphData(schema);
  
  console.log('SchemaGraph - Converted data:', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length,
    nodes: nodes.map(n => ({ id: n.id, label: n.label, type: n.type, x: n.x, y: n.y })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label }))
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Schema Graph ({nodes.length} nodes, {edges.length} edges)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px]">
          <GraphVisualization 
            nodes={nodes}
            edges={edges}
            onNodeClick={(node) => {
              console.log('Schema node clicked:', node);
            }}
            isExpanded={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
