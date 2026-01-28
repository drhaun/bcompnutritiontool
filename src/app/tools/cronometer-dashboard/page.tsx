'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, subDays, differenceInDays } from 'date-fns';
import { useFitomicsStore } from '@/lib/store';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Utensils,
  Timer,
  Activity,
  Heart,
  Scale,
  MessageSquare,
  ChevronRight,
  Check,
  ChevronsUpDown,
  User,
  Link2,
  Flame,
  Droplets,
  Zap,
  Moon,
  Sun,
  Clock,
  Apple,
  Coffee,
  Sandwich,
  Pizza,
  Cookie,
  Target,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Types
interface TrendDataPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  completed: boolean;
  foodGrams: number;
}

interface MacroDistribution {
  name: string;
  value: number;
  grams: number;
  color: string;
}

interface MealData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: { name: string; serving: string }[];
}

interface DayLog {
  date: string;
  completed: boolean;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  potassium: number;
  micronutrients: {
    vitaminA: number;
    vitaminC: number;
    vitaminD: number;
    vitaminE: number;
    vitaminK: number;
    vitaminB12: number;
    folate: number;
    calcium: number;
    iron: number;
    magnesium: number;
    zinc: number;
    omega3: number;
  };
  meals: MealData[];
}

interface FastData {
  name: string;
  start: string;
  finish: string | null;
  comments: string;
  duration: string | null;
  ongoing: boolean;
}

interface BiometricData {
  date: string;
  type: string;
  value: number;
  unit: string;
}

interface DashboardData {
  success: boolean;
  daysAnalyzed: number;
  daysWithEntries: string[];
  dateRange: { start: string; end: string };
  trendData: TrendDataPoint[];
  macroDistribution: MacroDistribution[];
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  foodLog: DayLog[];
  fasts: FastData[];
  biometrics: BiometricData[];
  micronutrientAverages: { name: string; value: number }[];
  targets: Record<string, { min?: number; max?: number; unit: string }>;
}

// Default RDA targets for comparison when Cronometer targets aren't available
const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 75,
  fiber: 30,
  sodium: 2300,
  potassium: 2600,
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 600,
  vitaminE: 15,
  vitaminK: 120,
  vitaminB12: 2.4,
  folate: 400,
  calcium: 1000,
  iron: 18,
  magnesium: 400,
  zinc: 11,
  omega3: 1.6,
};

// Helper to get nutrient status
function getNutrientStatus(actual: number, target: number, isMaxLimit = false): { 
  status: 'low' | 'optimal' | 'high'; 
  percent: number; 
  diff: number;
  color: string;
} {
  const percent = target > 0 ? Math.round((actual / target) * 100) : 0;
  const diff = actual - target;
  
  if (isMaxLimit) {
    // For things like sodium where exceeding is bad
    if (percent <= 100) return { status: 'optimal', percent, diff, color: 'text-green-600' };
    if (percent <= 130) return { status: 'high', percent, diff, color: 'text-yellow-600' };
    return { status: 'high', percent, diff, color: 'text-red-600' };
  }
  
  // For normal nutrients where meeting minimum is good
  // Order matters: check ranges from low to high
  if (percent < 70) return { status: 'low', percent, diff, color: 'text-red-600' };
  if (percent < 90) return { status: 'low', percent, diff, color: 'text-yellow-600' };
  if (percent <= 130) return { status: 'optimal', percent, diff, color: 'text-green-600' };
  // Above 130% is high (excess)
  if (percent <= 200) return { status: 'high', percent, diff, color: 'text-yellow-600' };
  return { status: 'high', percent, diff, color: 'text-red-600' }; // Very high (>200%)
}

// Round to specified decimals
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Color palette
const COLORS = {
  protein: '#ef4444',
  carbs: '#3b82f6',
  fat: '#eab308',
  fiber: '#22c55e',
  calories: '#c19962',
  gold: '#c19962',
  navy: '#00263d',
};

// Meal icons
const getMealIcon = (mealName: string) => {
  const name = mealName.toLowerCase();
  if (name.includes('breakfast')) return <Coffee className="h-4 w-4" />;
  if (name.includes('lunch')) return <Sandwich className="h-4 w-4" />;
  if (name.includes('dinner')) return <Pizza className="h-4 w-4" />;
  if (name.includes('snack')) return <Cookie className="h-4 w-4" />;
  return <Utensils className="h-4 w-4" />;
};

export default function CronometerDashboardPage() {
  const router = useRouter();
  const { clients } = useFitomicsStore();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [cronometerStatus, setCronometerStatus] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [cronometerClients, setCronometerClients] = useState<Array<{ client_id: number; name: string; email?: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<string>('self');
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 21),
    to: new Date(),
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Check Cronometer connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const [statusRes, clientsRes] = await Promise.all([
          fetch('/api/cronometer/status'),
          fetch('/api/cronometer/clients'),
        ]);
        
        if (statusRes.ok) {
          const status = await statusRes.json();
          setCronometerStatus(status);
        }
        
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setCronometerClients(data.clients || []);
          
          // Auto-select linked client if available
          const activeClient = clients.find(c => c.cronometerClientId);
          if (activeClient?.cronometerClientId) {
            setSelectedClient(activeClient.cronometerClientId.toString());
          }
        }
      } catch (error) {
        console.error('Error checking Cronometer status:', error);
      }
    };
    
    checkConnection();
  }, [clients]);
  
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!cronometerStatus?.connected) {
      toast.error('Please connect your Cronometer account first');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd'),
      });
      
      if (selectedClient && selectedClient !== 'self') {
        params.append('client_id', selectedClient);
      }
      
      const response = await fetch(`/api/cronometer/dashboard?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
      
      if (data.daysAnalyzed === 0) {
        toast.warning('No data found for the selected date range');
      } else {
        toast.success(`Loaded ${data.daysAnalyzed} days of data`);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [cronometerStatus, dateRange, selectedClient]);
  
  // Get selected client name
  const getSelectedClientName = () => {
    if (selectedClient === 'self') return 'My Data';
    const client = cronometerClients.find(c => c.client_id.toString() === selectedClient);
    return client?.name || 'Select Client';
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name === 'Calories' ? ' kcal' : 'g'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00263d]/5 to-background">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#00263d]">Cronometer Dashboard</h1>
              <p className="text-muted-foreground">Visualize nutrition data, logs, and trends</p>
            </div>
          </div>
          <Badge variant="outline" className="border-orange-300 text-orange-600">
            <Activity className="h-3 w-3 mr-1" />
            Cronometer Connected
          </Badge>
        </div>
        
        {/* Connection Check */}
        {!cronometerStatus?.connected && (
          <Alert className="mb-6">
            <Link2 className="h-4 w-4" />
            <AlertTitle>Not Connected</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your Cronometer Pro account to view dashboard data</span>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings">Connect Cronometer</a>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Client Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[220px] justify-between"
                    >
                      <span className="truncate">{getSelectedClientName()}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <Command>
                      <CommandInput placeholder="Search clients..." />
                      <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="self"
                            onSelect={() => {
                              setSelectedClient('self');
                              setClientSearchOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedClient === 'self' ? "opacity-100" : "opacity-0")} />
                            <User className="mr-2 h-4 w-4" />
                            My Data
                          </CommandItem>
                          {cronometerClients.map((client) => (
                            <CommandItem
                              key={client.client_id}
                              value={`${client.name} ${client.email || ''}`}
                              onSelect={() => {
                                setSelectedClient(client.client_id.toString());
                                setClientSearchOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedClient === client.client_id.toString() ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{client.name}</span>
                                {client.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[130px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(dateRange.from, 'MMM d')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[130px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(dateRange.to, 'MMM d')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Quick Presets */}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                  7 days
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 14), to: new Date() })}>
                  14 days
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 21), to: new Date() })}>
                  21 days
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                  30 days
                </Button>
              </div>
              
              {/* Load Button */}
              <Button 
                onClick={fetchDashboardData} 
                disabled={isLoading || !cronometerStatus?.connected}
                className="bg-[#c19962] hover:bg-[#a88652]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Dashboard Content - Always show when connected */}
        {cronometerStatus?.connected && (
          <>
            {/* Summary Cards - Only show when data loaded */}
            {dashboardData && dashboardData.daysAnalyzed > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Calories</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData.averages.calories}</p>
                  <p className="text-xs text-muted-foreground">kcal/day</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-50 to-white">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Protein</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData.averages.protein}g</p>
                  <p className="text-xs text-muted-foreground">/day</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Apple className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Carbs</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData.averages.carbs}g</p>
                  <p className="text-xs text-muted-foreground">/day</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-50 to-white">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <Droplets className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Fat</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData.averages.fat}g</p>
                  <p className="text-xs text-muted-foreground">/day</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-white">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium">Days Tracked</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData.daysAnalyzed}</p>
                  <p className="text-xs text-muted-foreground">
                    of {differenceInDays(dateRange.to, dateRange.from) + 1}
                  </p>
                </CardContent>
              </Card>
            </div>
            )}
            
            {/* Tabs for different views - Always visible when connected */}
            <Tabs defaultValue="trends" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="trends">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trends
                </TabsTrigger>
                <TabsTrigger value="logs">
                  <Utensils className="h-4 w-4 mr-2" />
                  Food Logs
                </TabsTrigger>
                <TabsTrigger value="fasting">
                  <Timer className="h-4 w-4 mr-2" />
                  Fasting
                </TabsTrigger>
                <TabsTrigger value="biometrics">
                  <Heart className="h-4 w-4 mr-2" />
                  Biometrics
                </TabsTrigger>
              </TabsList>
              
              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4">
                {!dashboardData ? (
                  <Card className="py-12">
                    <CardContent className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Data Loaded</h3>
                      <p className="text-muted-foreground mb-4">
                        Select a client and date range above, then click "Load Data" to see trends
                      </p>
                      <Button onClick={fetchDashboardData} disabled={isLoading} className="bg-[#c19962] hover:bg-[#a88652]">
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Load Data
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                <>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Calorie Trend */}
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        Calorie Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dashboardData.trendData}>
                            <defs>
                              <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.calories} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={COLORS.calories} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => format(new Date(value), 'M/d')}
                              fontSize={12}
                            />
                            <YAxis fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="calories"
                              name="Calories"
                              stroke={COLORS.calories}
                              fillOpacity={1}
                              fill="url(#colorCalories)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Macro Distribution Pie */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Macro Distribution</CardTitle>
                      <CardDescription>Average daily breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dashboardData.macroDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {dashboardData.macroDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => [
                                `${value}% (${props.payload.grams}g)`,
                                name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-2">
                        {dashboardData.macroDistribution.map((macro) => (
                          <div key={macro.name} className="flex items-center gap-1 text-xs">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: macro.color }} />
                            <span>{macro.name}: {macro.value}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Macro Trends */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#c19962]" />
                      Macronutrient Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.trendData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'M/d')}
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line type="monotone" dataKey="protein" name="Protein" stroke={COLORS.protein} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="carbs" name="Carbs" stroke={COLORS.carbs} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="fat" name="Fat" stroke={COLORS.fat} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                </>
                )}
              </TabsContent>
              
              {/* Food Logs Tab */}
              <TabsContent value="logs" className="space-y-4">
                {!dashboardData ? (
                  <Card className="py-12">
                    <CardContent className="text-center">
                      <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Data Loaded</h3>
                      <p className="text-muted-foreground mb-4">
                        Load data to see detailed food logs
                      </p>
                      <Button onClick={fetchDashboardData} disabled={isLoading} className="bg-[#c19962] hover:bg-[#a88652]">
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Load Data
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-[#c19962]" />
                      Detailed Food Logs
                    </CardTitle>
                    <CardDescription>
                      Day-by-day breakdown of meals and foods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <Accordion type="multiple" className="w-full">
                        {dashboardData.foodLog.map((day, i) => {
                          // Get targets - use Cronometer targets if available, else defaults
                          const getTarget = (key: string, defaultVal: number): number => {
                            const t = dashboardData.targets?.[key];
                            return t?.min || t?.max || defaultVal;
                          };
                          
                          const targets = {
                            calories: getTarget('Energy', DEFAULT_TARGETS.calories),
                            protein: getTarget('Protein', DEFAULT_TARGETS.protein),
                            carbs: getTarget('Carbs', DEFAULT_TARGETS.carbs),
                            fat: getTarget('Fat', DEFAULT_TARGETS.fat),
                            fiber: getTarget('Fiber', DEFAULT_TARGETS.fiber),
                            sodium: getTarget('Sodium', DEFAULT_TARGETS.sodium),
                          };
                          
                          // Calculate status for each macro using client's targets
                          const calStatus = getNutrientStatus(day.totalCalories, targets.calories);
                          const proteinStatus = getNutrientStatus(day.protein, targets.protein);
                          const carbsStatus = getNutrientStatus(day.carbs, targets.carbs);
                          const fatStatus = getNutrientStatus(day.fat, targets.fat);
                          const fiberStatus = getNutrientStatus(day.fiber, targets.fiber);
                          const sodiumStatus = getNutrientStatus(day.sodium, targets.sodium, true);
                          
                          // Count issues - only significant deviations
                          const issues = [calStatus, proteinStatus, carbsStatus, fatStatus, fiberStatus, sodiumStatus]
                            .filter(s => s.status !== 'optimal').length;
                          
                          return (
                            <AccordionItem key={i} value={`day-${i}`}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{format(new Date(day.date), 'EEEE, MMM d')}</span>
                                    {day.completed && (
                                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                        Complete
                                      </Badge>
                                    )}
                                    {issues > 0 && (
                                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
                                        {issues} issue{issues !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={cn("text-sm font-medium", calStatus.color)}>
                                      {day.totalCalories} kcal
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({calStatus.percent}%)
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                {/* Day Summary */}
                                <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    Day Summary vs Targets
                                  </h4>
                                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                    <div className="text-center p-2 rounded bg-background">
                                      <p className={cn("font-bold text-lg", calStatus.color)}>{day.totalCalories}</p>
                                      <p className="text-muted-foreground">Calories</p>
                                      <p className={cn("text-xs", calStatus.color)}>{calStatus.percent}%</p>
                                    </div>
                                    <div className="text-center p-2 rounded bg-background">
                                      <p className={cn("font-bold text-lg", proteinStatus.color)}>{round(day.protein, 1)}g</p>
                                      <p className="text-muted-foreground">Protein</p>
                                      <p className={cn("text-xs", proteinStatus.color)}>{proteinStatus.percent}%</p>
                                    </div>
                                    <div className="text-center p-2 rounded bg-background">
                                      <p className={cn("font-bold text-lg", carbsStatus.color)}>{round(day.carbs, 1)}g</p>
                                      <p className="text-muted-foreground">Carbs</p>
                                      <p className={cn("text-xs", carbsStatus.color)}>{carbsStatus.percent}%</p>
                                    </div>
                                    <div className="text-center p-2 rounded bg-background">
                                      <p className={cn("font-bold text-lg", fatStatus.color)}>{round(day.fat, 1)}g</p>
                                      <p className="text-muted-foreground">Fat</p>
                                      <p className={cn("text-xs", fatStatus.color)}>{fatStatus.percent}%</p>
                                    </div>
                                    <div className="text-center p-2 rounded bg-background">
                                      <p className={cn("font-bold text-lg", fiberStatus.color)}>{round(day.fiber, 1)}g</p>
                                      <p className="text-muted-foreground">Fiber</p>
                                      <p className={cn("text-xs", fiberStatus.color)}>{fiberStatus.percent}%</p>
                                    </div>
                                    <div className="text-center p-2 rounded bg-background">
                                      <p className={cn("font-bold text-lg", sodiumStatus.color)}>{round(day.sodium, 0)}</p>
                                      <p className="text-muted-foreground">Sodium (mg)</p>
                                      <p className={cn("text-xs", sodiumStatus.color)}>{sodiumStatus.percent}%</p>
                                    </div>
                                  </div>
                                  
                                  {/* Key Micronutrients */}
                                  {day.micronutrients && (
                                    <div className="mt-3 pt-3 border-t">
                                      <h5 className="text-xs font-semibold mb-2 text-muted-foreground">Key Micronutrients</h5>
                                      <div className="grid grid-cols-4 md:grid-cols-6 gap-1 text-xs">
                                        {[
                                          { name: 'Vit D', val: day.micronutrients.vitaminD, key: 'Vitamin D', defaultTarget: DEFAULT_TARGETS.vitaminD, unit: 'IU' },
                                          { name: 'Vit B12', val: day.micronutrients.vitaminB12, key: 'Vitamin B12', defaultTarget: DEFAULT_TARGETS.vitaminB12, unit: 'µg' },
                                          { name: 'Iron', val: day.micronutrients.iron, key: 'Iron', defaultTarget: DEFAULT_TARGETS.iron, unit: 'mg' },
                                          { name: 'Calcium', val: day.micronutrients.calcium, key: 'Calcium', defaultTarget: DEFAULT_TARGETS.calcium, unit: 'mg' },
                                          { name: 'Magnesium', val: day.micronutrients.magnesium, key: 'Magnesium', defaultTarget: DEFAULT_TARGETS.magnesium, unit: 'mg' },
                                          { name: 'Zinc', val: day.micronutrients.zinc, key: 'Zinc', defaultTarget: DEFAULT_TARGETS.zinc, unit: 'mg' },
                                        ].map((micro, idx) => {
                                          // Use Cronometer targets if available, else defaults
                                          const t = dashboardData.targets?.[micro.key];
                                          const target = t?.min || t?.max || micro.defaultTarget;
                                          const status = getNutrientStatus(micro.val, target);
                                          return (
                                            <div key={idx} className="text-center p-1 rounded bg-background/50">
                                              <p className={cn("font-medium", status.color)}>{round(micro.val, 1)}</p>
                                              <p className="text-muted-foreground text-[10px]">{micro.name}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Issues Summary */}
                                  {issues > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <h5 className="text-xs font-semibold mb-1 text-yellow-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Issues Identified
                                      </h5>
                                      <div className="flex flex-wrap gap-1">
                                        {/* Protein issues */}
                                        {proteinStatus.status === 'low' && (
                                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                            Low Protein ({round(proteinStatus.diff, 1)}g from target)
                                          </Badge>
                                        )}
                                        {proteinStatus.status === 'high' && proteinStatus.percent > 150 && (
                                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                            High Protein (+{round(proteinStatus.diff, 1)}g over)
                                          </Badge>
                                        )}
                                        {/* Fiber issues */}
                                        {fiberStatus.status === 'low' && (
                                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                            Low Fiber ({round(fiberStatus.diff, 1)}g from target)
                                          </Badge>
                                        )}
                                        {/* Sodium issues */}
                                        {sodiumStatus.status === 'high' && (
                                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                            High Sodium (+{round(sodiumStatus.diff, 0)}mg over limit)
                                          </Badge>
                                        )}
                                        {/* Calorie issues */}
                                        {calStatus.status === 'low' && (
                                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                            Under Calories ({calStatus.percent}% of target)
                                          </Badge>
                                        )}
                                        {calStatus.status === 'high' && (
                                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                            Over Calories (+{round(calStatus.diff, 0)} kcal)
                                          </Badge>
                                        )}
                                        {/* Carbs/Fat issues - only flag significant deviations */}
                                        {carbsStatus.status === 'high' && carbsStatus.percent > 150 && (
                                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                            High Carbs ({carbsStatus.percent}%)
                                          </Badge>
                                        )}
                                        {fatStatus.status === 'high' && fatStatus.percent > 150 && (
                                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                            High Fat ({fatStatus.percent}%)
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Meal Breakdown */}
                                <div className="space-y-3">
                                  {day.meals.map((meal, j) => (
                                    <div key={j} className="bg-muted/50 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          {getMealIcon(meal.name)}
                                          <span className="font-medium">{meal.name}</span>
                                        </div>
                                        <div className="flex gap-3 text-xs">
                                          <span className="text-orange-600">{meal.calories} kcal</span>
                                          <span className="text-red-600">{round(meal.protein, 1)}g P</span>
                                          <span className="text-blue-600">{round(meal.carbs, 1)}g C</span>
                                          <span className="text-yellow-600">{round(meal.fat, 1)}g F</span>
                                        </div>
                                      </div>
                                      <div className="pl-6 space-y-1">
                                        {meal.foods.map((food, k) => (
                                          <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-muted last:border-0">
                                            <span className="text-muted-foreground">{food.name}</span>
                                            <span className="text-xs text-muted-foreground">{food.serving}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  {day.meals.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                      No meal breakdown available for this day
                                    </p>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </ScrollArea>
                  </CardContent>
                </Card>
                )}
              </TabsContent>
              
              {/* Fasting Tab */}
              <TabsContent value="fasting" className="space-y-4">
                {!dashboardData ? (
                  <Card className="py-12">
                    <CardContent className="text-center">
                      <Timer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Data Loaded</h3>
                      <p className="text-muted-foreground mb-4">
                        Load data to see fasting logs with notes
                      </p>
                      <Button onClick={fetchDashboardData} disabled={isLoading} className="bg-[#c19962] hover:bg-[#a88652]">
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Load Data
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-purple-500" />
                      Fasting Log
                    </CardTitle>
                    <CardDescription>
                      Intermittent fasting records with notes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.fasts.length === 0 ? (
                      <div className="text-center py-12">
                        <Timer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No fasting data recorded for this period</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Fasting records will appear here when logged in Cronometer
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {dashboardData.fasts.map((fast, i) => (
                            <Card key={i} className={cn(
                              "border-l-4",
                              fast.ongoing ? "border-l-purple-500 bg-purple-50/50" : "border-l-green-500"
                            )}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-medium flex items-center gap-2">
                                      {fast.name}
                                      {fast.ongoing && (
                                        <Badge className="bg-purple-100 text-purple-700">
                                          <Clock className="h-3 w-3 mr-1" />
                                          In Progress
                                        </Badge>
                                      )}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <Sun className="h-3 w-3" />
                                        Started: {fast.start}
                                      </span>
                                      {fast.finish && (
                                        <span className="flex items-center gap-1">
                                          <Moon className="h-3 w-3" />
                                          Ended: {fast.finish}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {fast.duration && (
                                    <Badge variant="outline" className="font-mono text-lg">
                                      {fast.duration}
                                    </Badge>
                                  )}
                                </div>
                                {fast.comments && (
                                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <p className="text-sm italic">{fast.comments}</p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
                )}
              </TabsContent>
              
              {/* Biometrics Tab */}
              <TabsContent value="biometrics" className="space-y-4">
                {!dashboardData ? (
                  <Card className="py-12">
                    <CardContent className="text-center">
                      <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Data Loaded</h3>
                      <p className="text-muted-foreground mb-4">
                        Load data to see biometric information
                      </p>
                      <Button onClick={fetchDashboardData} disabled={isLoading} className="bg-[#c19962] hover:bg-[#a88652]">
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Load Data
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Biometrics & Wearable Data
                    </CardTitle>
                    <CardDescription>
                      Health metrics synced from Cronometer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.biometrics.length === 0 ? (
                      <div className="text-center py-12">
                        <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No biometric data available</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Biometric data (weight, body fat, etc.) may not be available via the API
                        </p>
                        <Alert className="mt-6 text-left">
                          <Activity className="h-4 w-4" />
                          <AlertTitle>API Limitation</AlertTitle>
                          <AlertDescription>
                            Cronometer's API currently has limited support for biometric/wearable data export.
                            To view full biometric history, please use the Cronometer web or mobile app directly.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Group biometrics by type */}
                        {Object.entries(
                          dashboardData.biometrics.reduce((acc, bio) => {
                            if (!acc[bio.type]) acc[bio.type] = [];
                            acc[bio.type].push(bio);
                            return acc;
                          }, {} as Record<string, BiometricData[]>)
                        ).map(([type, data]) => {
                          const sortedData = data.sort((a, b) => a.date.localeCompare(b.date));
                          const latestValue = sortedData[sortedData.length - 1];
                          const unit = latestValue?.unit || '';
                          
                          return (
                            <Card key={type}>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm">{type}</CardTitle>
                                  {latestValue && (
                                    <span className="text-lg font-bold text-[#c19962]">
                                      {latestValue.value} {unit}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {sortedData.length} data point{sortedData.length !== 1 ? 's' : ''} • 
                                  Latest: {latestValue?.date ? format(new Date(latestValue.date), 'MMM d, yyyy') : 'N/A'}
                                </p>
                              </CardHeader>
                              <CardContent>
                                <div className="h-[150px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sortedData}>
                                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                      <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(value) => {
                                          try {
                                            return format(new Date(value), 'M/d');
                                          } catch {
                                            return value;
                                          }
                                        }}
                                        fontSize={10}
                                      />
                                      <YAxis 
                                        fontSize={10} 
                                        domain={['auto', 'auto']}
                                        tickFormatter={(value) => value.toFixed(1)}
                                      />
                                      <Tooltip 
                                        formatter={(value: number) => [`${value} ${unit}`, type]}
                                        labelFormatter={(label) => {
                                          try {
                                            return format(new Date(label), 'MMM d, yyyy');
                                          } catch {
                                            return label;
                                          }
                                        }}
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke={COLORS.gold}
                                        strokeWidth={2}
                                        dot={{ fill: COLORS.gold, r: 4 }}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
