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

interface QueryResult {
  nodes: any[];
  edges: any[];
  reasoning?: string;
  execution_time?: number;
  query_type?: string;
  cypher_query?: string;
}

interface DataTableProps {
  data?: FinancialRecord[];
  nodes?: any[];
  queryResult?: QueryResult | null;
  onRowClick?: (record: FinancialRecord) => void;
}

export function DataTable({ data = [], nodes, queryResult, onRowClick }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Mock data for demonstration - todo: remove mock functionality
  const mockData: FinancialRecord[] = [
    {
      id: "1",
      entity: "Goldman Sachs",
      event: "CEO Appointment",
      date: "2024-01-15",
      type: "executive",
      status: "completed"
    },
    {
      id: "2", 
      entity: "JPMorgan Chase",
      event: "Credit Rating Upgrade",
      date: "2024-02-20",
      value: "AA+",
      type: "rating",
      status: "active"
    },
    {
      id: "3",
      entity: "Wells Fargo",
      event: "Regulatory Fine",
      date: "2024-01-30",
      value: "$50M",
      type: "regulatory",
      status: "completed"
    },
    {
      id: "4",
      entity: "Bank of America",
      event: "Merger Discussion",
      date: "2024-03-01",
      type: "merger",
      status: "pending"
    },
    {
      id: "5",
      entity: "Citigroup",
      event: "CFO Resignation",
      date: "2024-02-15",
      type: "executive",
      status: "completed"
    }
  ];

  const displayData = data.length > 0 ? data : mockData;

  const filteredData = displayData
    .filter(record => {
      const matchesSearch = record.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.event.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === "all" || record.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aVal = a[sortField as keyof FinancialRecord] || "";
      const bVal = b[sortField as keyof FinancialRecord] || "";
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
          <span>Financial Records</span>
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
              <SelectItem value="merger">Mergers</SelectItem>
              <SelectItem value="rating">Ratings</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="regulatory">Regulatory</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
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
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => {
                    console.log('Record clicked:', record);
                    onRowClick?.(record);
                  }}
                  data-testid={`row-record-${record.id}`}
                >
                  <td className="p-3 font-medium">{record.entity}</td>
                  <td className="p-3">{record.event}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{record.date}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className={`text-xs ${getTypeColor(record.type)}`}>
                      {record.type}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm font-mono">{record.value || "—"}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(record.status)}`}>
                      {record.status}
                    </Badge>
                  </td>
                </tr>
              ))}
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