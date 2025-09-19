import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2, Database, Play, Copy, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TableSchema {
  name: string;
  type: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    default: string | null;
  }[];
}

interface QueryResult {
  success: boolean;
  data: any[];
  columns: { name: string; dataType: number }[];
  rowCount: number;
  executionTime: number;
  error?: string;
  details?: string;
}

const EXAMPLE_QUERIES = [
  {
    name: "All Companies",
    query: "SELECT * FROM companies LIMIT 10;",
    description: "Get all companies with basic information"
  },
  {
    name: "Companies by Sector",
    query: "SELECT name, ticker, sector, industry FROM companies WHERE sector = 'Technology' ORDER BY name;",
    description: "Find all technology companies"
  },
  {
    name: "Recent Transactions",
    query: "SELECT t.*, c1.name as acquirer_name, c2.name as target_name FROM transactions t LEFT JOIN companies c1 ON t.acquirer_id = c1.id LEFT JOIN companies c2 ON t.target_id = c2.id ORDER BY t.announced_date DESC LIMIT 10;",
    description: "Get recent M&A transactions with company names"
  },
  {
    name: "Employment Relationships",
    query: "SELECT p.name, c.name as company, e.position, e.start_date, e.end_date FROM employments e JOIN people p ON e.person_id = p.id JOIN companies c ON e.company_id = c.id ORDER BY e.start_date DESC LIMIT 10;",
    description: "Show current and past employment relationships"
  },
  {
    name: "Credit Ratings",
    query: "SELECT c.name, r.rating, r.rating_agency, r.valid_from FROM ratings r JOIN companies c ON r.company_id = c.id ORDER BY r.valid_from DESC LIMIT 10;",
    description: "Get recent credit ratings for companies"
  },
  {
    name: "Regulatory Events",
    query: "SELECT c.name, re.event_type, re.regulator, re.description, re.event_date FROM regulatory_events re JOIN companies c ON re.company_id = c.id ORDER BY re.event_date DESC LIMIT 10;",
    description: "Show recent regulatory events and compliance issues"
  }
];

export default function DataBrowser() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const { toast } = useToast();

  // Load database schema on component mount
  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    try {
      setSchemaLoading(true);
      const response = await fetch('/api/sql/schema');
      const data = await response.json();
      
      if (data.success) {
        setSchema(data.schema);
      } else {
        toast({
          title: "Error",
          description: "Failed to load database schema",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading schema:', error);
      toast({
        title: "Error",
        description: "Failed to load database schema",
        variant: "destructive"
      });
    } finally {
      setSchemaLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a SQL query",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/sql/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setResult(data);
      
      if (!data.success) {
        toast({
          title: "Query Error",
          description: data.error || "Failed to execute query",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `Query executed successfully. ${data.rowCount} rows returned.`,
        });
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast({
        title: "Error",
        description: "Failed to execute query",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    toast({
      title: "Copied",
      description: "Query copied to clipboard",
    });
  };

  const downloadResults = () => {
    if (!result?.data) return;
    
    const csv = convertToCSV(result.data, result.columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[], columns: { name: string }[]) => {
    if (!data.length) return '';
    
    const headers = columns.map(col => col.name).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.name];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h1 className="text-xl font-semibold">Data Browser</h1>
          <Badge variant="outline" className="text-xs">
            PostgreSQL Database
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchema}
            disabled={schemaLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${schemaLoading ? 'animate-spin' : ''}`} />
            Refresh Schema
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">

        <Tabs defaultValue="query" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="query">Query Editor</TabsTrigger>
            <TabsTrigger value="schema">Database Schema</TabsTrigger>
            <TabsTrigger value="examples">Example Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="h-[calc(100%-3rem)] mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>SQL Query Editor</CardTitle>
                <CardDescription>
                  Write and execute SQL queries. Only SELECT statements are allowed for security.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
              <div className="flex-1 flex flex-col space-y-2">
                <Textarea
                  placeholder="Enter your SQL query here..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 min-h-[200px] font-mono text-sm"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button onClick={executeQuery} disabled={loading || !query.trim()}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Execute Query
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyQuery} disabled={!query.trim()}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  {result?.success && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {result.rowCount} rows
                      </Badge>
                      <Badge variant="outline">
                        {result.executionTime}ms
                      </Badge>
                      <Button variant="outline" size="sm" onClick={downloadResults}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {result && (
                <div className="flex-1 flex flex-col space-y-2">
                  <h3 className="text-lg font-semibold">Query Results</h3>
                  {result.success ? (
                    <div className="flex-1 border rounded-lg">
                      <ScrollArea className="h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {result.columns.map((col, index) => (
                                <TableHead key={index}>{col.name}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.data.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {result.columns.map((col, colIndex) => (
                                  <TableCell key={colIndex}>
                                    {row[col.name]?.toString() || 'NULL'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Error:</strong> {result.error}
                        {result.details && (
                          <div className="mt-2 text-sm">
                            <strong>Details:</strong> {result.details}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="schema" className="h-[calc(100%-3rem)] mt-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Database Schema</CardTitle>
                <CardDescription>
                  Available tables and their structure
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-120px)] overflow-y-auto">
              {schemaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading schema...
                </div>
              ) : (
                <div className="space-y-4">
                  {schema.map((table) => (
                    <Card key={table.name}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <Database className="w-5 h-5" />
                          <CardTitle className="text-lg">{table.name}</CardTitle>
                          <Badge variant="secondary">{table.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Column</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Nullable</TableHead>
                              <TableHead>Default</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {table.columns.map((column, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono">{column.name}</TableCell>
                                <TableCell className="font-mono">{column.type}</TableCell>
                                <TableCell>
                                  <Badge variant={column.nullable ? "secondary" : "default"}>
                                    {column.nullable ? "Yes" : "No"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {column.default || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="examples" className="h-[calc(100%-3rem)] mt-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Example Queries</CardTitle>
                <CardDescription>
                  Click on any example to load it into the query editor
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-120px)] overflow-y-auto">
              <div className="grid gap-4">
                {EXAMPLE_QUERIES.map((example, index) => (
                  <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4" onClick={() => loadExampleQuery(example.query)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">{example.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{example.description}</p>
                          <pre className="text-xs bg-muted p-3 rounded font-mono overflow-x-auto">
                            {example.query}
                          </pre>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-4">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
