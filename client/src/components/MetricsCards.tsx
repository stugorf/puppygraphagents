import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Database, Brain, Clock } from "lucide-react";

interface MetricData {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: any;
  description: string;
}

interface QueryResult {
  nodes: any[];
  edges: any[];
  reasoning?: string;
  execution_time?: number;
  query_type?: string;
  cypher_query?: string;
}

interface MetricsCardsProps {
  metrics?: MetricData[];
  queryResult?: QueryResult | null;
}

export function MetricsCards({ metrics, queryResult }: MetricsCardsProps) {
  // Mock data for demonstration - todo: remove mock functionality
  const defaultMetrics: MetricData[] = [
    {
      title: "Total Entities",
      value: "12,847",
      change: "+234",
      trend: "up",
      icon: Database,
      description: "Companies, executives, and transactions"
    },
    {
      title: "Active Relationships",
      value: "45,629",
      change: "+1,205",
      trend: "up",
      icon: Activity,
      description: "Current valid connections in graph"
    },
    {
      title: "Temporal Events",
      value: "8,394",
      change: "-126",
      trend: "down",
      icon: Clock,
      description: "Time-stamped changes this month"
    },
    {
      title: "AI Queries Processed",
      value: "2,847",
      change: "+89",
      trend: "up",
      icon: Brain,
      description: "Natural language queries today"
    }
  ];

  const displayMetrics = metrics || defaultMetrics;

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-chart-2" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-chart-4" />;
      default: return null;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return 'text-chart-2';
      case 'down': return 'text-chart-4';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {displayMetrics.map((metric, index) => {
        const IconComponent = metric.icon;
        
        return (
          <Card key={index} className="hover-elevate" data-testid={`metric-card-${index}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </span>
                <IconComponent className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold" data-testid={`metric-value-${index}`}>
                    {metric.value}
                  </span>
                  {metric.change && (
                    <div className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
                      {getTrendIcon(metric.trend)}
                      <span className="text-sm font-medium">{metric.change}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                
                {metric.trend && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      metric.trend === 'up' 
                        ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' 
                        : metric.trend === 'down'
                        ? 'bg-chart-4/10 text-chart-4 border-chart-4/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {metric.trend === 'up' ? 'Growing' : metric.trend === 'down' ? 'Declining' : 'Stable'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}