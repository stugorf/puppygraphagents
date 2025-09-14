import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Users, Building2, Star, TrendingUp, Shield, Network, Table } from "lucide-react";
import { SchemaGraph } from "./SchemaGraph";

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

interface SchemaVisualizationProps {
  schema?: GraphSchema;
  className?: string;
}

const getVertexIcon = (label: string) => {
  switch (label.toLowerCase()) {
    case 'company':
      return <Building2 className="w-5 h-5" />;
    case 'person':
      return <Users className="w-5 h-5" />;
    case 'rating':
      return <Star className="w-5 h-5" />;
    case 'transaction':
      return <TrendingUp className="w-5 h-5" />;
    case 'regulatoryevent':
      return <Shield className="w-5 h-5" />;
    default:
      return <Database className="w-5 h-5" />;
  }
};

const getVertexColor = (label: string) => {
  switch (label.toLowerCase()) {
    case 'company':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'person':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rating':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'transaction':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'regulatoryevent':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function SchemaVisualization({ schema, className = "" }: SchemaVisualizationProps) {
  if (!schema) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center space-y-4">
          <Database className="w-16 h-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">Loading Schema...</h3>
          <p className="text-muted-foreground">
            Fetching graph schema information.
          </p>
        </div>
      </div>
    );
  }

  const { vertices, edges } = schema;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Schema Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Graph Schema Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{vertices.length}</div>
              <div className="text-sm text-muted-foreground">Node Types</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{edges.length}</div>
              <div className="text-sm text-muted-foreground">Relationship Types</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {vertices.reduce((sum, v) => sum + v.oneToOne.attributes.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Attributes</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {edges.reduce((sum, e) => sum + (e.attributes?.length || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Edge Attributes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema Visualization Tabs */}
      <Tabs defaultValue="graph" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="graph" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Graph View
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Table View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="graph" className="mt-4">
          <SchemaGraph schema={schema} />
        </TabsContent>
        
        <TabsContent value="table" className="mt-4 space-y-6">
          {/* Node Types */}
          <Card>
            <CardHeader>
              <CardTitle>Node Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {vertices.map((vertex) => (
                  <div key={vertex.label} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${getVertexColor(vertex.label)}`}>
                        {getVertexIcon(vertex.label)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{vertex.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {vertex.oneToOne.tableSource.table}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Attributes:</div>
                      <div className="flex flex-wrap gap-1">
                        {vertex.oneToOne.attributes.map((attr) => (
                          <Badge key={attr.alias} variant="outline" className="text-xs">
                            {attr.alias}
                            <span className="ml-1 text-muted-foreground">({attr.type})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Relationship Types */}
          <Card>
            <CardHeader>
              <CardTitle>Relationship Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {edges.map((edge) => (
                  <div key={edge.label} className="border rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getVertexColor(edge.fromVertex)}>
                          {edge.fromVertex}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-0.5 bg-border"></div>
                          <Badge variant="secondary" className="px-2 py-1">
                            {edge.label}
                          </Badge>
                          <div className="w-8 h-0.5 bg-border"></div>
                        </div>
                        <Badge variant="outline" className={getVertexColor(edge.toVertex)}>
                          {edge.toVertex}
                        </Badge>
                      </div>
                    </div>
                    {edge.attributes && edge.attributes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Edge Attributes:</div>
                        <div className="flex flex-wrap gap-1">
                          {edge.attributes.map((attr) => (
                            <Badge key={attr.alias} variant="outline" className="text-xs">
                              {attr.alias}
                              <span className="ml-1 text-muted-foreground">({attr.type})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
