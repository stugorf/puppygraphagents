import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, ArrowUpDown, Calendar } from "lucide-react";

interface FinancialRecord {
  id: string;
  entity: string;
  event: string;
  date: string;
  value?: string;
  type: 'merger' | 'rating' | 'executive' | 'regulatory';
  status: 'active' | 'completed' | 'pending';
}

interface GraphRecord {
  id: string;
  type: 'node' | 'edge';
  label: string;
  properties: Record<string, any>;
  source?: string;
  target?: string;
  relationship?: string;
}

interface QueryResult {
  nodes: any[];
  edges: any[];
  scalarResults?: Array<{key: string, value: any}>;
  reasoning?: string;
  execution_time?: number;
  query_type?: string;
  cypher_query?: string;
}

interface DataTableProps {
  data?: FinancialRecord[];
  nodes?: any[];
  queryResult?: QueryResult | null;
  onRowClick?: (record: FinancialRecord | GraphRecord) => void;
}

export function DataTable({ data = [], nodes, queryResult, onRowClick }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Transform graph data to tabular format
  const transformGraphToTable = (nodes: any[], edges: any[]): GraphRecord[] => {
    const records: GraphRecord[] = [];
    
    // Add nodes as records
    nodes.forEach((node, index) => {
      const nodeRecord = {
        id: `node-${node.id || index}`,
        type: 'node' as const,
        label: node.label || node.properties?.name || node.properties?.title || `Node ${index + 1}`,
        properties: node.properties || {},
        source: undefined,
        target: undefined,
        relationship: undefined
      };
      records.push(nodeRecord);
    });
    
    // Add edges as records
    edges.forEach((edge, index) => {
      const edgeRecord = {
        id: `edge-${edge.id || index}`,
        type: 'edge' as const,
        label: edge.label || edge.type || 'RELATIONSHIP',
        properties: edge.properties || {},
        source: edge.source || edge.from_id || edge.fromId || edge.startNodeElementId,
        target: edge.target || edge.to_id || edge.toId || edge.endNodeElementId,
        relationship: edge.label || edge.type
      };
      records.push(edgeRecord);
    });
    return records;
  };

  // Transform scalar results to tabular format
  const transformScalarToTable = (scalarResults: Array<{key: string, value: any}>): GraphRecord[] => {
    const records: GraphRecord[] = [];
    
    // Group scalar results by row (assuming they come in groups of 3: c.name, p.name, p.title)
    // But we need to handle the case where they might not be in perfect groups
    const rowSize = 3; // Based on the query: c.name, p.name, p.title
    for (let i = 0; i < scalarResults.length; i += rowSize) {
      const row = scalarResults.slice(i, i + rowSize);
      const record: GraphRecord = {
        id: `scalar-${Math.floor(i / rowSize)}`,
        type: 'node' as const,
        label: `Row ${Math.floor(i / rowSize) + 1}`,
        properties: {},
        source: undefined,
        target: undefined,
        relationship: undefined
      };
      
      // Add scalar values as properties
      row.forEach(item => {
        record.properties[item.key] = item.value;
      });
      
      records.push(record);
    }
    
    return records;
  };

  // Determine which data to display
  const isGraphData = queryResult && (queryResult.nodes?.length > 0 || queryResult.edges?.length > 0);
  const isScalarData = queryResult && queryResult.scalarResults && queryResult.scalarResults.length > 0;
  
  // Debug logging
  console.log('DataTable Debug:', {
    queryResult,
    isGraphData,
    isScalarData,
    nodesLength: queryResult?.nodes?.length || 0,
    edgesLength: queryResult?.edges?.length || 0,
    scalarResultsLength: queryResult?.scalarResults?.length || 0
  });
  
  let displayData: any[] = [];
  if (isGraphData) {
    displayData = transformGraphToTable(queryResult.nodes || [], queryResult.edges || []);
  } else if (isScalarData) {
    displayData = transformScalarToTable(queryResult.scalarResults || []);
  } else {
    displayData = data || [];
  }
  
  console.log('DataTable Display Data:', {
    displayDataLength: displayData.length,
    displayData: displayData.slice(0, 2) // Show first 2 items for debugging
  });


  const filteredData = displayData
    .filter(record => {
      if (isGraphData) {
        const graphRecord = record as GraphRecord;
        const matchesSearch = graphRecord.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (graphRecord.relationship && graphRecord.relationship.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filterType === "all" || graphRecord.type === filterType;
        return matchesSearch && matchesFilter;
      } else if (isScalarData) {
        const graphRecord = record as GraphRecord;
        const matchesSearch = Object.values(graphRecord.properties).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesFilter = filterType === "all" || graphRecord.type === filterType;
        return matchesSearch && matchesFilter;
      } else {
        const financialRecord = record as FinancialRecord;
        const matchesSearch = financialRecord.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             financialRecord.event.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === "all" || financialRecord.type === filterType;
        return matchesSearch && matchesFilter;
      }
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (isGraphData || isScalarData) {
        const aGraph = a as GraphRecord;
        const bGraph = b as GraphRecord;
        aVal = aGraph[sortField as keyof GraphRecord] || aGraph.label || "";
        bVal = bGraph[sortField as keyof GraphRecord] || bGraph.label || "";
      } else {
        const aFinancial = a as FinancialRecord;
        const bFinancial = b as FinancialRecord;
        aVal = aFinancial[sortField as keyof FinancialRecord] || "";
        bVal = bFinancial[sortField as keyof FinancialRecord] || "";
      }
      const comparison = aVal.toString().localeCompare(bVal.toString());
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-chart-2 text-chart-2-foreground';
      case 'active': return 'bg-primary text-primary-foreground';
      case 'pending': return 'bg-chart-3 text-chart-3-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'merger': return 'bg-chart-1 text-chart-1-foreground';
      case 'rating': return 'bg-chart-4 text-chart-4-foreground';
      case 'executive': return 'bg-chart-3 text-chart-3-foreground';
      case 'regulatory': return 'bg-chart-5 text-chart-5-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {isGraphData ? "Graph Query Results" : 
             isScalarData ? "Scalar Query Results" : 
             "Financial Records"}
          </span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredData.length} records
            </Badge>
            <Button size="icon" variant="ghost" data-testid="button-export-data">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
        
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-records"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40" data-testid="select-filter-type">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {isGraphData ? (
                <>
                  <SelectItem value="node">Nodes</SelectItem>
                  <SelectItem value="edge">Relationships</SelectItem>
                </>
              ) : isScalarData ? (
                <>
                  <SelectItem value="node">All Rows</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="merger">Mergers</SelectItem>
                  <SelectItem value="rating">Ratings</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {isGraphData ? (
                  <>
                    <th className="text-left p-3 font-medium text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("label")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        data-testid="sort-label"
                      >
                        Label
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium text-sm">Type</th>
                    <th className="text-left p-3 font-medium text-sm">Properties</th>
                    <th className="text-left p-3 font-medium text-sm">Source</th>
                    <th className="text-left p-3 font-medium text-sm">Target</th>
                    <th className="text-left p-3 font-medium text-sm">Relationship</th>
                  </>
                ) : isScalarData ? (
                  <>
                    <th className="text-left p-3 font-medium text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("label")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        data-testid="sort-row"
                      >
                        Row
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium text-sm">Data</th>
                  </>
                ) : (
                  <>
                    <th className="text-left p-3 font-medium text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("entity")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        data-testid="sort-entity"
                      >
                        Entity
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("event")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        data-testid="sort-event"
                      >
                        Event
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("date")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        data-testid="sort-date"
                      >
                        Date
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium text-sm">Type</th>
                    <th className="text-left p-3 font-medium text-sm">Value</th>
                    <th className="text-left p-3 font-medium text-sm">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record) => {
                if (isGraphData) {
                  const graphRecord = record as GraphRecord;
                  return (
                    <tr
                      key={graphRecord.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        console.log('Graph record clicked:', graphRecord);
                        onRowClick?.(graphRecord);
                      }}
                      data-testid={`row-record-${graphRecord.id}`}
                    >
                      <td className="p-3 font-medium">{graphRecord.label}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className={`text-xs ${graphRecord.type === 'node' ? 'bg-primary text-primary-foreground' : 'bg-chart-2 text-chart-2-foreground'}`}>
                          {graphRecord.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="max-w-xs truncate">
                          {Object.keys(graphRecord.properties).length > 0 
                            ? Object.entries(graphRecord.properties).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))
                            : graphRecord.type === 'node' 
                              ? <div className="text-xs text-muted-foreground">Node ID: {graphRecord.id.replace('node-', '')}</div>
                              : <div className="text-xs text-muted-foreground">Edge ID: {graphRecord.id.replace('edge-', '')}</div>
                          }
                        </div>
                      </td>
                      <td className="p-3 text-sm font-mono">{graphRecord.source || "—"}</td>
                      <td className="p-3 text-sm font-mono">{graphRecord.target || "—"}</td>
                      <td className="p-3 text-sm">{graphRecord.relationship || "—"}</td>
                    </tr>
                  );
                } else if (isScalarData) {
                  const graphRecord = record as GraphRecord;
                  return (
                    <tr
                      key={graphRecord.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        console.log('Scalar record clicked:', graphRecord);
                        onRowClick?.(graphRecord);
                      }}
                      data-testid={`row-record-${graphRecord.id}`}
                    >
                      <td className="p-3 font-medium">{graphRecord.label}</td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          {Object.entries(graphRecord.properties).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="font-medium text-xs text-muted-foreground min-w-0 flex-shrink-0">{key}:</span>
                              <span className="text-sm">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  const financialRecord = record as FinancialRecord;
                  return (
                    <tr
                      key={financialRecord.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        console.log('Financial record clicked:', financialRecord);
                        onRowClick?.(financialRecord);
                      }}
                      data-testid={`row-record-${financialRecord.id}`}
                    >
                      <td className="p-3 font-medium">{financialRecord.entity}</td>
                      <td className="p-3">{financialRecord.event}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{financialRecord.date}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={`text-xs ${getTypeColor(financialRecord.type)}`}>
                          {financialRecord.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm font-mono">{financialRecord.value || "—"}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(financialRecord.status)}`}>
                          {financialRecord.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
          
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>No records found matching your criteria.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}