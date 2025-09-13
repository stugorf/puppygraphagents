import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, RefreshCw, History, Copy } from "lucide-react";

interface QueryInterfaceProps {
  onExecuteQuery?: (query: string, type: 'natural' | 'cypher') => void;
}

export function QueryInterface({ onExecuteQuery }: QueryInterfaceProps) {
  const [naturalQuery, setNaturalQuery] = useState("");
  const [cypherQuery, setCypherQuery] = useState("");
  const [activeTab, setActiveTab] = useState("natural");
  const [isLoading, setIsLoading] = useState(false);

  const handleExecute = async () => {
    setIsLoading(true);
    
    // Simulate query execution
    setTimeout(() => {
      const query = activeTab === "natural" ? naturalQuery : cypherQuery;
      console.log(`Executing ${activeTab} query:`, query);
      onExecuteQuery?.(query, activeTab as 'natural' | 'cypher');
      setIsLoading(false);
    }, 1500);
  };

  const exampleQueries = {
    natural: [
      "Show me all companies that had leadership changes in 2023",
      "What mergers happened in the financial sector last quarter?",
      "Find all credit rating downgrades for banks since January 2024"
    ],
    cypher: [
      "MATCH (c:Company)-[:HAS_EXECUTIVE]->(p:Person) WHERE c.sector = 'Financial' RETURN c, p",
      "MATCH (c1:Company)-[:ACQUIRED]->(c2:Company) WHERE c1.industry = 'Banking' RETURN c1, c2",
      "MATCH (c:Company)-[:HAS_RATING]->(r:Rating) WHERE r.date > '2024-01-01' RETURN c, r"
    ]
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Query Interface</span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {activeTab === "natural" ? "Natural Language" : "Cypher"}
            </Badge>
            <Button size="icon" variant="ghost" data-testid="button-query-history">
              <History className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="natural" data-testid="tab-natural-language">Natural Language</TabsTrigger>
            <TabsTrigger value="cypher" data-testid="tab-cypher">Cypher Query</TabsTrigger>
          </TabsList>
          
          <TabsContent value="natural" className="space-y-4">
            <Textarea
              placeholder="Ask a question about your temporal knowledge graph..."
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              className="min-h-[120px] font-sans"
              data-testid="input-natural-query"
            />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Example queries:</p>
              <div className="space-y-1">
                {exampleQueries.natural.map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2 whitespace-normal"
                    onClick={() => setNaturalQuery(query)}
                    data-testid={`example-natural-${index}`}
                  >
                    <Copy className="w-3 h-3 mr-2 flex-shrink-0" />
                    <span className="text-xs">{query}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cypher" className="space-y-4">
            <Textarea
              placeholder="Enter your Cypher query..."
              value={cypherQuery}
              onChange={(e) => setCypherQuery(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              data-testid="input-cypher-query"
            />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Example queries:</p>
              <div className="space-y-1">
                {exampleQueries.cypher.map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2 whitespace-normal font-mono"
                    onClick={() => setCypherQuery(query)}
                    data-testid={`example-cypher-${index}`}
                  >
                    <Copy className="w-3 h-3 mr-2 flex-shrink-0" />
                    <span className="text-xs">{query}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleExecute}
            disabled={isLoading || (activeTab === "natural" && !naturalQuery.trim()) || (activeTab === "cypher" && !cypherQuery.trim())}
            className="flex-1"
            data-testid="button-execute-query"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Execute Query
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}