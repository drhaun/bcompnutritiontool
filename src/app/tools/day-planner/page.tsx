'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar,
  Clock,
  Utensils,
  Dumbbell,
  Target,
  Sparkles,
  Download,
  RefreshCw,
  ChefHat,
  Coffee,
  Sun,
  Moon,
  Zap,
  Apple,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2
} from 'lucide-react';

// ============ TYPES ============

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type PrepMethod = 'cook' | 'meal_prep' | 'takeout' | 'delivery' | 'quick';
type WorkoutTiming = 'none' | 'morning' | 'midday' | 'evening';

interface MealSlot {
  id: string;
  type: MealType;
  time: string;
  prepMethod: PrepMethod;
  location: string;
  notes: string;
}

interface GeneratedMeal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
}

interface DayPlan {
  meals: { slot: MealSlot; meal: GeneratedMeal }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

// ============ CONSTANTS ============

const MEAL_TYPES: { value: MealType; label: string; icon: React.ReactNode }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: <Coffee className="h-4 w-4" /> },
  { value: 'lunch', label: 'Lunch', icon: <Sun className="h-4 w-4" /> },
  { value: 'dinner', label: 'Dinner', icon: <Moon className="h-4 w-4" /> },
  { value: 'snack', label: 'Snack', icon: <Apple className="h-4 w-4" /> },
];

const PREP_METHODS: { value: PrepMethod; label: string }[] = [
  { value: 'cook', label: 'Cook from scratch' },
  { value: 'meal_prep', label: 'Use meal prep/leftovers' },
  { value: 'takeout', label: 'Takeout/Restaurant' },
  { value: 'delivery', label: 'Meal delivery service' },
  { value: 'quick', label: 'Quick & easy (<10 min)' },
];

const COMMON_PROTEINS = [
  'Chicken', 'Beef', 'Fish', 'Eggs', 'Turkey', 'Pork', 'Tofu', 'Greek Yogurt', 'Cottage Cheese', 'Protein Powder'
];

const COMMON_CARBS = [
  'Rice', 'Oats', 'Bread', 'Pasta', 'Potatoes', 'Sweet Potatoes', 'Quinoa', 'Fruits', 'Beans'
];

const DIETARY_RESTRICTIONS = [
  'None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo'
];

// ============ COMPONENT ============

export default function DayPlannerPage() {
  const router = useRouter();

  // Client Context
  const [clientName, setClientName] = useState('');
  const [targetCalories, setTargetCalories] = useState(2000);
  const [targetProtein, setTargetProtein] = useState(150);
  const [targetCarbs, setTargetCarbs] = useState(200);
  const [targetFat, setTargetFat] = useState(70);
  const [dietaryRestriction, setDietaryRestriction] = useState('None');
  const [allergies, setAllergies] = useState('');
  const [preferredProteins, setPreferredProteins] = useState<string[]>(['Chicken', 'Eggs']);
  const [preferredCarbs, setPreferredCarbs] = useState<string[]>(['Rice', 'Oats']);
  const [foodsToAvoid, setFoodsToAvoid] = useState('');

  // Day Context
  const [dayType, setDayType] = useState<'workout' | 'rest'>('workout');
  const [workoutTiming, setWorkoutTiming] = useState<WorkoutTiming>('morning');
  const [workoutType, setWorkoutType] = useState('Resistance Training');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [specialNotes, setSpecialNotes] = useState('');

  // Meal Slots
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([
    { id: '1', type: 'breakfast', time: '08:00', prepMethod: 'cook', location: 'Home', notes: '' },
    { id: '2', type: 'snack', time: '10:30', prepMethod: 'quick', location: 'Work', notes: '' },
    { id: '3', type: 'lunch', time: '12:30', prepMethod: 'meal_prep', location: 'Work', notes: '' },
    { id: '4', type: 'snack', time: '15:30', prepMethod: 'quick', location: 'Work', notes: '' },
    { id: '5', type: 'dinner', time: '19:00', prepMethod: 'cook', location: 'Home', notes: '' },
  ]);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState<DayPlan | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Helpers
  const addMealSlot = () => {
    const newId = (Math.max(...mealSlots.map(m => parseInt(m.id))) + 1).toString();
    setMealSlots([...mealSlots, {
      id: newId,
      type: 'snack',
      time: '14:00',
      prepMethod: 'quick',
      location: 'Home',
      notes: '',
    }]);
  };

  const removeMealSlot = (id: string) => {
    if (mealSlots.length > 1) {
      setMealSlots(mealSlots.filter(m => m.id !== id));
    }
  };

  const updateMealSlot = (id: string, field: keyof MealSlot, value: string) => {
    setMealSlots(mealSlots.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const toggleProtein = (protein: string) => {
    setPreferredProteins(prev => 
      prev.includes(protein) ? prev.filter(p => p !== protein) : [...prev, protein]
    );
  };

  const toggleCarb = (carb: string) => {
    setPreferredCarbs(prev => 
      prev.includes(carb) ? prev.filter(c => c !== carb) : [...prev, carb]
    );
  };

  // Macro distribution calculation
  const macroDistribution = useMemo(() => {
    const totalCals = targetProtein * 4 + targetCarbs * 4 + targetFat * 9;
    return {
      protein: Math.round((targetProtein * 4 / totalCals) * 100) || 0,
      carbs: Math.round((targetCarbs * 4 / totalCals) * 100) || 0,
      fat: Math.round((targetFat * 9 / totalCals) * 100) || 0,
    };
  }, [targetProtein, targetCarbs, targetFat]);

  // Generate Day Plan
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      const response = await fetch('/api/generate-day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          targets: { calories: targetCalories, protein: targetProtein, carbs: targetCarbs, fat: targetFat },
          dietaryRestriction,
          allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
          preferredProteins,
          preferredCarbs,
          foodsToAvoid: foodsToAvoid.split(',').map(f => f.trim()).filter(Boolean),
          dayContext: {
            dayType,
            workoutTiming: dayType === 'workout' ? workoutTiming : 'none',
            workoutType: dayType === 'workout' ? workoutType : null,
            wakeTime,
            sleepTime,
            specialNotes,
          },
          mealSlots,
        }),
      });

      setGenerationProgress(50);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate day plan');
      }

      const data = await response.json();
      setGeneratedPlan(data.dayPlan);
      setGenerationProgress(100);
      toast.success('Day plan generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate plan');
      
      // Generate mock data for demo
      const mockPlan: DayPlan = {
        meals: mealSlots.map((slot, index) => ({
          slot,
          meal: {
            name: `${slot.type.charAt(0).toUpperCase() + slot.type.slice(1)} - Option ${index + 1}`,
            description: `A balanced ${slot.type} designed for your goals`,
            calories: Math.round(targetCalories / mealSlots.length),
            protein: Math.round(targetProtein / mealSlots.length),
            carbs: Math.round(targetCarbs / mealSlots.length),
            fat: Math.round(targetFat / mealSlots.length),
            ingredients: ['Ingredient 1', 'Ingredient 2', 'Ingredient 3'],
            instructions: ['Step 1: Prepare ingredients', 'Step 2: Cook', 'Step 3: Serve'],
            prepTime: slot.prepMethod === 'quick' ? 5 : 20,
          },
        })),
        totalCalories: targetCalories,
        totalProtein: targetProtein,
        totalCarbs: targetCarbs,
        totalFat: targetFat,
      };
      setGeneratedPlan(mockPlan);
      setGenerationProgress(100);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 2000);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (!generatedPlan) return;
    
    let text = `Single Day Nutrition Plan${clientName ? ` for ${clientName}` : ''}\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `📊 Daily Targets: ${targetCalories} cal | ${targetProtein}g P | ${targetCarbs}g C | ${targetFat}g F\n`;
    text += `🏋️ Day Type: ${dayType === 'workout' ? `Workout (${workoutTiming})` : 'Rest Day'}\n\n`;
    
    generatedPlan.meals.forEach((item, index) => {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `${item.slot.time} - ${item.meal.name}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `${item.meal.description}\n\n`;
      text += `Macros: ${item.meal.calories} cal | ${item.meal.protein}g P | ${item.meal.carbs}g C | ${item.meal.fat}g F\n\n`;
      text += `Ingredients:\n`;
      item.meal.ingredients.forEach(ing => text += `  • ${ing}\n`);
      text += `\nInstructions:\n`;
      item.meal.instructions.forEach((inst, i) => text += `  ${i + 1}. ${inst}\n`);
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    toast.success('Plan copied to clipboard!');
  };

  // Download PDF
  const downloadPDF = async () => {
    if (!generatedPlan) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-day-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          targets: { calories: targetCalories, protein: targetProtein, carbs: targetCarbs, fat: targetFat },
          dayContext: { dayType, workoutTiming, workoutType, wakeTime, sleepTime },
          plan: generatedPlan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('PDF error:', errorData);
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName || 'day'}-nutrition-plan.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-8 w-8 text-[#c19962]" />
            <h1 className="text-3xl font-bold">Single Day Planner</h1>
          </div>
          <p className="text-muted-foreground">
            Create a personalized nutrition plan for a single day based on your client's schedule and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="client">Client & Targets</TabsTrigger>
                <TabsTrigger value="day">Day Context</TabsTrigger>
                <TabsTrigger value="meals">Meal Structure</TabsTrigger>
              </TabsList>

              {/* Client & Targets Tab */}
              <TabsContent value="client" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-[#c19962]" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Client Name (Optional)</Label>
                      <Input
                        placeholder="Enter client name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Target Calories: {targetCalories}</Label>
                        <Slider
                          min={1200}
                          max={4000}
                          step={50}
                          value={[targetCalories]}
                          onValueChange={(v) => setTargetCalories(v[0])}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Protein (g): {targetProtein}</Label>
                          <Slider
                            min={50}
                            max={300}
                            step={5}
                            value={[targetProtein]}
                            onValueChange={(v) => setTargetProtein(v[0])}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Carbs (g): {targetCarbs}</Label>
                          <Slider
                            min={50}
                            max={400}
                            step={5}
                            value={[targetCarbs]}
                            onValueChange={(v) => setTargetCarbs(v[0])}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fat (g): {targetFat}</Label>
                          <Slider
                            min={30}
                            max={150}
                            step={5}
                            value={[targetFat]}
                            onValueChange={(v) => setTargetFat(v[0])}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Macro Split:</span>
                        <Badge variant="secondary">P: {macroDistribution.protein}%</Badge>
                        <Badge variant="secondary">C: {macroDistribution.carbs}%</Badge>
                        <Badge variant="secondary">F: {macroDistribution.fat}%</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-[#c19962]" />
                      Diet Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Dietary Restriction</Label>
                      <Select value={dietaryRestriction} onValueChange={setDietaryRestriction}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIETARY_RESTRICTIONS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Allergies (comma-separated)</Label>
                      <Input
                        placeholder="e.g., Peanuts, Shellfish"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Proteins</Label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_PROTEINS.map((protein) => (
                          <Badge
                            key={protein}
                            variant={preferredProteins.includes(protein) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleProtein(protein)}
                          >
                            {protein}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Carbs</Label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_CARBS.map((carb) => (
                          <Badge
                            key={carb}
                            variant={preferredCarbs.includes(carb) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleCarb(carb)}
                          >
                            {carb}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Foods to Avoid (comma-separated)</Label>
                      <Input
                        placeholder="e.g., Mushrooms, Olives"
                        value={foodsToAvoid}
                        onChange={(e) => setFoodsToAvoid(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Day Context Tab */}
              <TabsContent value="day" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-[#c19962]" />
                      Day Type & Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label>Day Type:</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={dayType === 'workout' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDayType('workout')}
                        >
                          <Dumbbell className="h-4 w-4 mr-1" />
                          Workout Day
                        </Button>
                        <Button
                          variant={dayType === 'rest' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDayType('rest')}
                        >
                          <Moon className="h-4 w-4 mr-1" />
                          Rest Day
                        </Button>
                      </div>
                    </div>

                    {dayType === 'workout' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Workout Timing</Label>
                            <Select value={workoutTiming} onValueChange={(v) => setWorkoutTiming(v as WorkoutTiming)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="morning">Morning (5-10 AM)</SelectItem>
                                <SelectItem value="midday">Midday (10 AM-2 PM)</SelectItem>
                                <SelectItem value="evening">Evening (5-9 PM)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Workout Type</Label>
                            <Select value={workoutType} onValueChange={setWorkoutType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Resistance Training">Resistance Training</SelectItem>
                                <SelectItem value="Cardio">Cardio</SelectItem>
                                <SelectItem value="HIIT">HIIT</SelectItem>
                                <SelectItem value="Sports">Sports</SelectItem>
                                <SelectItem value="Mixed">Mixed Training</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Wake Time</Label>
                        <Input
                          type="time"
                          value={wakeTime}
                          onChange={(e) => setWakeTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sleep Time</Label>
                        <Input
                          type="time"
                          value={sleepTime}
                          onChange={(e) => setSleepTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Special Notes for This Day</Label>
                      <Textarea
                        placeholder="e.g., Client has a business lunch at noon, needs portable snacks..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Meal Structure Tab */}
              <TabsContent value="meals" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-[#c19962]" />
                        Meal Schedule
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={addMealSlot}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Meal
                      </Button>
                    </div>
                    <CardDescription>Define the structure and timing of meals for this day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {mealSlots.sort((a, b) => a.time.localeCompare(b.time)).map((slot, index) => (
                          <Card key={slot.id} className="border-dashed">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{index + 1}</Badge>
                                  <span className="font-medium">{slot.time}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeMealSlot(slot.id)}
                                  disabled={mealSlots.length <= 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Time</Label>
                                  <Input
                                    type="time"
                                    value={slot.time}
                                    onChange={(e) => updateMealSlot(slot.id, 'time', e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Type</Label>
                                  <Select
                                    value={slot.type}
                                    onValueChange={(v) => updateMealSlot(slot.id, 'type', v)}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MEAL_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          <div className="flex items-center gap-2">
                                            {type.icon}
                                            {type.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Prep Method</Label>
                                  <Select
                                    value={slot.prepMethod}
                                    onValueChange={(v) => updateMealSlot(slot.id, 'prepMethod', v)}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PREP_METHODS.map((method) => (
                                        <SelectItem key={method.value} value={method.value}>
                                          {method.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Location</Label>
                                  <Input
                                    value={slot.location}
                                    onChange={(e) => updateMealSlot(slot.id, 'location', e.target.value)}
                                    placeholder="Home, Work, Gym..."
                                    className="h-8"
                                  />
                                </div>
                              </div>

                              <div className="mt-2 space-y-1">
                                <Label className="text-xs">Notes (optional)</Label>
                                <Input
                                  value={slot.notes}
                                  onChange={(e) => updateMealSlot(slot.id, 'notes', e.target.value)}
                                  placeholder="Special requirements..."
                                  className="h-8"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Generate Button */}
            <Card className="border-[#c19962]">
              <CardContent className="pt-6">
                <Button
                  className="w-full bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Day Plan
                    </>
                  )}
                </Button>
                {generationProgress > 0 && generationProgress < 100 && (
                  <Progress value={generationProgress} className="mt-3" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {generatedPlan ? (
              <>
                {/* Summary Card */}
                <Card className="border-[#c19962] bg-gradient-to-br from-[#c19962]/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {clientName ? `${clientName}'s Day Plan` : 'Generated Day Plan'}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={copyToClipboard}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={downloadPDF}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleGenerate()}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold text-[#c19962]">{generatedPlan.totalCalories}</p>
                        <p className="text-xs text-muted-foreground">Calories</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold">{generatedPlan.totalProtein}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold">{generatedPlan.totalCarbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold">{generatedPlan.totalFat}g</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Meals */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-[#c19962]" />
                      Meal Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <Accordion type="multiple" className="w-full">
                        {generatedPlan.meals.map((item, index) => (
                          <AccordionItem key={item.slot.id} value={item.slot.id}>
                            <AccordionTrigger>
                              <div className="flex items-center gap-3 text-left">
                                <Badge variant="secondary" className="font-mono">{item.slot.time}</Badge>
                                <div>
                                  <p className="font-medium">{item.meal.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.meal.calories} cal • {item.meal.protein}g P • {item.meal.carbs}g C • {item.meal.fat}g F
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">{item.meal.description}</p>
                                
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground mb-1">Context</p>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{item.slot.location}</Badge>
                                    <Badge variant="outline">{PREP_METHODS.find(m => m.value === item.slot.prepMethod)?.label}</Badge>
                                    {item.slot.notes && <Badge variant="outline">{item.slot.notes}</Badge>}
                                  </div>
                                </div>

                                <div>
                                  <p className="font-medium text-sm mb-2">Ingredients</p>
                                  <ul className="text-sm space-y-1">
                                    {item.meal.ingredients.map((ing, i) => (
                                      <li key={i} className="flex items-center gap-2">
                                        <Check className="h-3 w-3 text-green-500" />
                                        {ing}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <p className="font-medium text-sm mb-2">Instructions</p>
                                  <ol className="text-sm space-y-1">
                                    {item.meal.instructions.map((inst, i) => (
                                      <li key={i} className="flex gap-2">
                                        <span className="font-medium text-muted-foreground">{i + 1}.</span>
                                        {inst}
                                      </li>
                                    ))}
                                  </ol>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Prep time: ~{item.meal.prepTime} minutes
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Plan Generated Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Configure your client's targets, day context, and meal structure, then click "Generate Day Plan" to create a personalized nutrition plan.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
