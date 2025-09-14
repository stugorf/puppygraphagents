import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Database, Brain, Clock } from "lucide-react";
import { useEffect, useState } from "react";

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

interface ApiMetrics {
  totalEntities: number;
  activeRelationships: number;
  temporalEvents: number;
  aiQueriesProcessed: number;
}

export function MetricsCards({ metrics, queryResult }: MetricsCardsProps) {
  const [apiMetrics, setApiMetrics] = useState<ApiMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        if (response.ok) {
          const data = await response.json();
          setApiMetrics(data);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Convert API metrics to display format
  const apiMetricsData: MetricData[] = apiMetrics ? [
    {
      title: "Total Entities",
      value: apiMetrics.totalEntities.toLocaleString(),
      change: undefined, // No change data from API yet
      trend: undefined,
      icon: Database,
      description: "Companies, executives, and transactions"
    },
    {
      title: "Active Relationships",
      value: apiMetrics.activeRelationships.toLocaleString(),
      change: undefined,
      trend: undefined,
      icon: Activity,
      description: "Current valid connections in graph"
    },
    {
      title: "Temporal Events",
      value: apiMetrics.temporalEvents.toLocaleString(),
      change: undefined,
      trend: undefined,
      icon: Clock,
      description: "Time-stamped changes this month"
    },
    {
      title: "AI Queries Processed",
      value: apiMetrics.aiQueriesProcessed.toLocaleString(),
      change: undefined,
      trend: undefined,
      icon: Brain,
      description: "Natural language queries today"
    }
  ] : [];

  // Mock data for demonstration - fallback when API fails
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

  const displayMetrics = metrics || (apiMetrics ? apiMetricsData : defaultMetrics);

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index} className="hover-elevate">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 bg-muted animate-pulse rounded w-20"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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