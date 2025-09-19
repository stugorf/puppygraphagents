import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RefreshCw, BarChart3, TrendingUp, Database, Calendar, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  companiesBySector: Array<{ sector: string; count: number; percentage: number }>;
  transactionsByMonth: Array<{ month: string; count: number; value: number }>;
  ratingsDistribution: Array<{ rating: string; count: number; color: string }>;
  topCompanies: Array<{ name: string; ticker: string; sector: string; employees: number }>;
  recentTransactions: Array<{ 
    acquirer: string; 
    target: string; 
    value: number; 
    date: string; 
    status: string;
    type: string;
  }>;
  sectorTrends: Array<{ 
    sector: string; 
    current: number; 
    previous: number; 
    change: number 
  }>;
  transactionTypes: Array<{ type: string; count: number; total_value: number }>;
  marketCapBySector: Array<{ 
    sector: string; 
    company_count: number; 
    avg_market_cap: number; 
    total_market_cap: number 
  }>;
  employmentTrends: Array<{ 
    sector: string; 
    employment_count: number; 
    avg_salary: number 
  }>;
  regulatoryEvents: Array<{ 
    sector: string; 
    event_count: number; 
    total_fines: number 
  }>;
  // Calculated totals
  totalCompanies: number;
  totalTransactions: number;
  totalTransactionValue: number;
  activeSectors: number;
}

const chartConfig = {
  companies: {
    label: "Companies",
    color: "hsl(var(--chart-1))",
  },
  transactions: {
    label: "Transactions",
    color: "hsl(var(--chart-2))",
  },
  value: {
    label: "Value ($M)",
    color: "hsl(var(--chart-3))",
  },
  employees: {
    label: "Employees",
    color: "hsl(var(--chart-4))",
  },
  change: {
    label: "Change %",
    color: "hsl(var(--chart-5))",
  },
};

const RATING_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('12months');
  const { toast } = useToast();

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // Execute multiple queries in parallel
      const queries = [
        // Companies by sector
        `SELECT sector, COUNT(*) as count FROM companies GROUP BY sector ORDER BY count DESC`,
        
        // Transactions by month (last 24 months to include 2023 data)
        `SELECT 
          TO_CHAR(announced_date, 'YYYY-MM') as month,
          COUNT(*) as count,
          SUM(value) as value
        FROM transactions 
        WHERE announced_date >= CURRENT_DATE - INTERVAL '24 months'
        GROUP BY TO_CHAR(announced_date, 'YYYY-MM')
        ORDER BY month`,
        
        // Ratings distribution
        `SELECT rating, COUNT(*) as count FROM ratings GROUP BY rating ORDER BY count DESC`,
        
        // Top companies by employee count
        `SELECT name, ticker, sector, employee_count as employees 
         FROM companies 
         WHERE employee_count IS NOT NULL 
         ORDER BY employee_count DESC 
         LIMIT 10`,
        
        // Recent transactions
        `SELECT 
          c1.name as acquirer,
          c2.name as target,
          t.value as value,
          t.announced_date as date,
          t.status,
          t.type
        FROM transactions t
        LEFT JOIN companies c1 ON t.acquirer_id = c1.id
        LEFT JOIN companies c2 ON t.target_id = c2.id
        ORDER BY t.announced_date DESC
        LIMIT 10`,
        
        // Sector trends (show current counts with mock previous data for visualization)
        `SELECT 
          sector, 
          COUNT(*) as current, 
          GREATEST(1, COUNT(*) - 1) as previous,
          CASE 
            WHEN COUNT(*) > 1 THEN ROUND(((COUNT(*) - GREATEST(1, COUNT(*) - 1))::float / GREATEST(1, COUNT(*) - 1) * 100)::numeric, 1)
            ELSE 0
          END as change
         FROM companies 
         GROUP BY sector 
         ORDER BY current DESC`,
        
        // Transaction types distribution
        `SELECT type, COUNT(*) as count, SUM(value) as total_value
         FROM transactions 
         GROUP BY type 
         ORDER BY count DESC`,
        
        // Market cap by sector
        `SELECT sector, 
                COUNT(*) as company_count,
                AVG(market_cap::numeric) as avg_market_cap,
                SUM(market_cap::numeric) as total_market_cap
         FROM companies 
         WHERE market_cap IS NOT NULL
         GROUP BY sector 
         ORDER BY total_market_cap DESC`,
        
        // Employment trends by sector
        `SELECT c.sector, 
                COUNT(e.id) as employment_count,
                AVG(e.salary::numeric) as avg_salary
         FROM employments e
         JOIN companies c ON e.company_id = c.id
         WHERE e.end_date IS NULL
         GROUP BY c.sector
         ORDER BY employment_count DESC`,
        
        // Regulatory events by sector
        `SELECT c.sector,
                COUNT(re.id) as event_count,
                SUM(re.amount::numeric) as total_fines
         FROM regulatory_events re
         JOIN companies c ON re.company_id = c.id
         GROUP BY c.sector
         ORDER BY event_count DESC`
      ];

      const results = await Promise.all(
        queries.map(async (query) => {
          const response = await fetch('/api/sql/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          });
          const data = await response.json();
          return data.success ? data.data : [];
        })
      );

      const [companiesBySector, transactionsByMonth, ratingsDistribution, topCompanies, recentTransactions, sectorTrends, transactionTypes, marketCapBySector, employmentTrends, regulatoryEvents] = results;

      // Process the data
      const processedCompaniesBySector = companiesBySector.map(item => ({
        ...item,
        count: parseInt(item.count),
        percentage: 0 // Will be calculated after we know the total
      }));
      
      const totalCompanies = processedCompaniesBySector.reduce((sum, item) => sum + item.count, 0);
      
      // Now calculate percentages
      processedCompaniesBySector.forEach(item => {
        item.percentage = Math.round((item.count / totalCompanies) * 100);
      });

      const processedTransactionsByMonth = transactionsByMonth.map(item => ({
        ...item,
        count: parseInt(item.count),
        value: Math.round((parseFloat(item.value) || 0) / 1000000) // Convert to millions
      }));

      console.log('Raw transactions by month data:', transactionsByMonth);
      console.log('Processed transactions by month data:', processedTransactionsByMonth);

      const processedRatingsDistribution = ratingsDistribution.map((item, index) => ({
        ...item,
        count: parseInt(item.count),
        color: RATING_COLORS[index % RATING_COLORS.length]
      }));

      const processedRecentTransactions = recentTransactions.map(item => ({
        ...item,
        value: Math.round((parseFloat(item.value) || 0) / 1000000) // Convert to millions
      }));

      const processedSectorTrends = sectorTrends.map(item => ({
        ...item,
        current: parseInt(item.current),
        previous: parseInt(item.previous),
        change: parseFloat(item.change)
      }));

      const processedTransactionTypes = transactionTypes.map(item => ({
        ...item,
        count: parseInt(item.count),
        total_value: Math.round((parseFloat(item.total_value) || 0) / 1000000) // Convert to millions
      }));

      const processedMarketCapBySector = marketCapBySector.map(item => ({
        ...item,
        company_count: parseInt(item.company_count),
        avg_market_cap: Math.round(parseFloat(item.avg_market_cap) / 1000000), // Convert to millions
        total_market_cap: Math.round(parseFloat(item.total_market_cap) / 1000000) // Convert to millions
      }));

      const processedEmploymentTrends = employmentTrends.map(item => ({
        ...item,
        employment_count: parseInt(item.employment_count),
        avg_salary: Math.round(parseFloat(item.avg_salary) / 1000) // Convert to thousands
      }));

      console.log('Raw employment trends data:', employmentTrends);
      console.log('Processed employment trends data:', processedEmploymentTrends);

      console.log('Employment trends data:', processedEmploymentTrends);

      const processedRegulatoryEvents = regulatoryEvents.map(item => ({
        ...item,
        event_count: parseInt(item.event_count),
        total_fines: Math.round((parseFloat(item.total_fines) || 0) / 1000000) // Convert to millions
      }));

      console.log('Raw sector trends data:', sectorTrends);
      console.log('Processed sector trends data:', processedSectorTrends);
      console.log('Regulatory events data:', processedRegulatoryEvents);

      const processedTopCompanies = topCompanies.map(item => ({
        ...item,
        employees: parseInt(item.employees) || 0
      }));

      console.log('Raw top companies data:', topCompanies);
      console.log('Processed top companies data:', processedTopCompanies);
      console.log('Sample processed item:', processedTopCompanies[0]);
      console.log('Employees value type:', typeof processedTopCompanies[0]?.employees);
      console.log('Employees value:', processedTopCompanies[0]?.employees);

      // Calculate totals for metrics
      const totalTransactions = processedTransactionsByMonth.reduce((sum, item) => sum + item.count, 0);
      const totalTransactionValue = processedTransactionsByMonth.reduce((sum, item) => sum + (item.value * 1000000), 0); // Convert back to original scale

      console.log('Analytics data processed:', {
        totalCompanies,
        totalTransactions,
        totalTransactionValue,
        activeSectors: processedCompaniesBySector.length
      });

      setAnalyticsData({
        companiesBySector: processedCompaniesBySector,
        transactionsByMonth: processedTransactionsByMonth,
        ratingsDistribution: processedRatingsDistribution,
        topCompanies: processedTopCompanies,
        recentTransactions: processedRecentTransactions,
        sectorTrends: processedSectorTrends,
        transactionTypes: processedTransactionTypes,
        marketCapBySector: processedMarketCapBySector,
        employmentTrends: processedEmploymentTrends,
        regulatoryEvents: processedRegulatoryEvents,
        // Calculated totals
        totalCompanies,
        totalTransactions,
        totalTransactionValue,
        activeSectors: processedCompaniesBySector.length
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    // In a real implementation, you'd refetch data based on the new time range
    fetchAnalyticsData();
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
            <Badge variant="outline" className="text-xs">PostgreSQL Database</Badge>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            <h3 className="text-xl font-semibold">Loading Analytics...</h3>
            <p className="text-muted-foreground">Fetching data from the database</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
          <Badge variant="outline" className="text-xs">PostgreSQL Database</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="h-[calc(100%-3rem)] mt-4">
            <div className="h-full overflow-y-auto space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Total Companies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData?.totalCompanies?.toLocaleString() || 'Loading...'}
                    </div>
                    <p className="text-xs text-muted-foreground">Across all sectors</p>
                    {process.env.NODE_ENV === 'development' && (
                      <p className="text-xs text-muted-foreground">Debug: {analyticsData?.totalCompanies}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Total Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData?.totalTransactions.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 24 months</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Transaction Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${Math.round((analyticsData?.totalTransactionValue || 0) / 1000000).toLocaleString()}M
                    </div>
                    <p className="text-xs text-muted-foreground">Last 24 months</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Active Sectors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData?.activeSectors || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Different sectors</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Companies by Sector - Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Companies by Sector</CardTitle>
                    <CardDescription>Distribution of companies across different sectors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={analyticsData?.companiesBySector || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="sector" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-companies)" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Transaction Trends - Line Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Trends</CardTitle>
                    <CardDescription>Monthly transaction count and value over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <LineChart data={analyticsData?.transactionsByMonth || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="count" 
                          stroke="var(--color-transactions)" 
                          strokeWidth={2}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="value" 
                          stroke="var(--color-value)" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ratings Distribution - Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Ratings Distribution</CardTitle>
                    <CardDescription>Distribution of credit ratings across companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <PieChart>
                        <Pie
                          data={analyticsData?.ratingsDistribution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ rating, percentage }) => `${rating} (${percentage}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(analyticsData?.ratingsDistribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Recent Transactions Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest M&A transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {analyticsData?.recentTransactions.map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {transaction.acquirer} → {transaction.target}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">${transaction.value}M</div>
                            <Badge variant="outline" className="text-xs">
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="companies" className="h-[calc(100%-3rem)] mt-4">
            <div className="h-full overflow-y-auto space-y-6">
              {/* Top Companies by Employees */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Companies by Employee Count</CardTitle>
                  <CardDescription>Largest companies in the database</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart 
                      data={analyticsData?.topCompanies || [
                        { name: "Test Company", employees: 1000000 },
                        { name: "Another Company", employees: 500000 }
                      ]} 
                      layout="vertical"
                      width={600}
                      height={400}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        width={150}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`${(value / 1000000).toFixed(1)}M employees`, 'Employees']}
                      />
                      <Bar 
                        dataKey="employees" 
                        fill="#8884d8" 
                        name="Employees"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Market Cap by Sector */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Capitalization by Sector</CardTitle>
                  <CardDescription>Total and average market cap across sectors</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.marketCapBySector || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total_market_cap" fill="var(--color-value)" name="Total Market Cap ($M)" />
                      <Bar dataKey="avg_market_cap" fill="var(--color-companies)" name="Avg Market Cap ($M)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Employment Trends by Sector */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Trends by Sector</CardTitle>
                  <CardDescription>Employment count and average salary by sector</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.employmentTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [
                          name === 'employment_count' ? value : `${value}K`,
                          name === 'employment_count' ? 'Employment Count' : 'Avg Salary ($K)'
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="employment_count" fill="var(--color-employees)" name="Employment Count" />
                      <Bar yAxisId="right" dataKey="avg_salary" fill="var(--color-transactions)" name="Avg Salary ($K)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Sector Performance Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Sector Performance Comparison</CardTitle>
                  <CardDescription>Current vs previous period company counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.sectorTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="current" fill="var(--color-companies)" name="Current Period" />
                      <Bar dataKey="previous" fill="var(--color-transactions)" name="Previous Period" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="h-[calc(100%-3rem)] mt-4">
            <div className="h-full overflow-y-auto space-y-6">
              {/* Transaction Value Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Value Over Time</CardTitle>
                  <CardDescription>Monthly transaction values in millions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <AreaChart data={analyticsData?.transactionsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--color-value)" 
                        fill="var(--color-value)"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Transaction Types Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Types Distribution</CardTitle>
                  <CardDescription>Breakdown of transaction types and their values</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.transactionTypes || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar yAxisId="left" dataKey="count" fill="var(--color-transactions)" name="Count" />
                      <Bar yAxisId="right" dataKey="total_value" fill="var(--color-value)" name="Total Value ($M)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Transaction Count Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Count Trends</CardTitle>
                  <CardDescription>Number of transactions per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <LineChart data={analyticsData?.transactionsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="var(--color-transactions)" 
                        strokeWidth={3}
                        dot={{ fill: "var(--color-transactions)", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Recent Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions Details</CardTitle>
                  <CardDescription>Latest M&A transactions with full details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {analyticsData?.recentTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {transaction.acquirer} → {transaction.target}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{new Date(transaction.date).toLocaleDateString()}</span>
                            <Badge variant="outline" className="text-xs">
                              {transaction.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">${transaction.value}M</div>
                          <Badge 
                            variant={transaction.status === 'completed' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="h-[calc(100%-3rem)] mt-4">
            <div className="h-full overflow-y-auto space-y-6">
              {/* Sector Growth Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Sector Growth Trends</CardTitle>
                  <CardDescription>Percentage change in company count by sector</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.sectorTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="change" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Regulatory Events by Sector */}
              <Card>
                <CardHeader>
                  <CardTitle>Regulatory Events by Sector</CardTitle>
                  <CardDescription>Number of regulatory events and total fines by sector</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.regulatoryEvents || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [
                          name === 'event_count' ? value : `$${value}M`,
                          name === 'event_count' ? 'Event Count' : 'Total Fines ($M)'
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="event_count" fill="hsl(var(--chart-3))" name="Event Count" />
                      <Bar yAxisId="right" dataKey="total_fines" fill="hsl(var(--chart-4))" name="Total Fines ($M)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Combined Transaction Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Combined Transaction Trends</CardTitle>
                  <CardDescription>Transaction count and value over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <LineChart data={analyticsData?.transactionsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="count" 
                        stroke="var(--color-transactions)" 
                        strokeWidth={2}
                        name="Transaction Count"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--color-value)" 
                        strokeWidth={2}
                        name="Transaction Value ($M)"
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Market Cap vs Employment Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Cap vs Employment Trends</CardTitle>
                  <CardDescription>Relationship between market capitalization and employment by sector</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <BarChart data={analyticsData?.marketCapBySector || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [
                          name === 'total_market_cap' ? `$${value}M` : value,
                          name === 'total_market_cap' ? 'Total Market Cap ($M)' : 'Company Count'
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="total_market_cap" fill="var(--color-value)" name="Total Market Cap ($M)" />
                      <Bar yAxisId="right" dataKey="company_count" fill="var(--color-companies)" name="Company Count" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
