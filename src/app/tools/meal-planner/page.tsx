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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Utensils,
  Clock,
  Target,
  Sparkles,
  RefreshCw,
  ChefHat,
  Coffee,
  Sun,
  Moon,
  Apple,
  Copy,
  Check,
  Flame,
  Timer,
  MapPin,
  Heart,
  Lightbulb,
  ShoppingCart,
  Download,
  Loader2
} from 'lucide-react';

// ============ TYPES ============

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
type PrepComplexity = 'no_cook' | 'quick' | 'moderate' | 'elaborate';
type MealStyle = 'comfort' | 'healthy' | 'gourmet' | 'quick_fuel' | 'indulgent';

interface GeneratedMeal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: { item: string; amount: string; notes?: string }[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  tips: string[];
  substitutions: { original: string; substitute: string; reason: string }[];
  nutritionHighlights: string[];
}

// ============ CONSTANTS ============

const MEAL_TYPES: { value: MealType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: <Coffee className="h-4 w-4" />, description: 'Morning meal to start the day' },
  { value: 'lunch', label: 'Lunch', icon: <Sun className="h-4 w-4" />, description: 'Midday meal for sustained energy' },
  { value: 'dinner', label: 'Dinner', icon: <Moon className="h-4 w-4" />, description: 'Evening meal, typically larger' },
  { value: 'snack', label: 'Snack', icon: <Apple className="h-4 w-4" />, description: 'Light between-meal option' },
  { value: 'pre_workout', label: 'Pre-Workout', icon: <Flame className="h-4 w-4" />, description: 'Fuel before training' },
  { value: 'post_workout', label: 'Post-Workout', icon: <Target className="h-4 w-4" />, description: 'Recovery nutrition' },
];

const PREP_COMPLEXITIES: { value: PrepComplexity; label: string; time: string }[] = [
  { value: 'no_cook', label: 'No Cook', time: '< 5 min' },
  { value: 'quick', label: 'Quick & Easy', time: '5-15 min' },
  { value: 'moderate', label: 'Moderate', time: '15-30 min' },
  { value: 'elaborate', label: 'Elaborate', time: '30+ min' },
];

const MEAL_STYLES: { value: MealStyle; label: string; description: string }[] = [
  { value: 'comfort', label: 'Comfort Food', description: 'Satisfying and familiar' },
  { value: 'healthy', label: 'Health-Focused', description: 'Nutrient-dense choices' },
  { value: 'gourmet', label: 'Gourmet', description: 'Restaurant-quality' },
  { value: 'quick_fuel', label: 'Quick Fuel', description: 'Fast and functional' },
  { value: 'indulgent', label: 'Balanced Indulgent', description: 'Treats within macros' },
];

const CUISINES = [
  'Any', 'American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'Japanese', 'Thai', 'Greek'
];

const PROTEIN_SOURCES = [
  'Chicken', 'Beef', 'Fish', 'Eggs', 'Turkey', 'Pork', 'Tofu', 'Tempeh', 'Greek Yogurt', 'Cottage Cheese', 'Protein Powder', 'Shrimp'
];

const DIETARY_RESTRICTIONS = [
  'None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo', 'Low-Sodium'
];

// ============ COMPONENT ============

export default function MealPlannerPage() {
  const router = useRouter();

  // Meal Target
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [targetCalories, setTargetCalories] = useState(500);
  const [targetProtein, setTargetProtein] = useState(40);
  const [targetCarbs, setTargetCarbs] = useState(50);
  const [targetFat, setTargetFat] = useState(15);
  const [macroFlexibility, setMacroFlexibility] = useState(10); // +/- percentage

  // Preferences
  const [prepComplexity, setPrepComplexity] = useState<PrepComplexity>('moderate');
  const [mealStyle, setMealStyle] = useState<MealStyle>('healthy');
  const [cuisine, setCuisine] = useState('Any');
  const [preferredProtein, setPreferredProtein] = useState('Chicken');
  const [dietaryRestriction, setDietaryRestriction] = useState('None');
  const [allergies, setAllergies] = useState('');
  const [dislikes, setDislikes] = useState('');

  // Context
  const [mealTime, setMealTime] = useState('12:30');
  const [location, setLocation] = useState('Home');
  const [specialRequests, setSpecialRequests] = useState('');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedMeal, setGeneratedMeal] = useState<GeneratedMeal | null>(null);
  const [alternatives, setAlternatives] = useState<GeneratedMeal[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate actual macro calories
  const actualCalories = useMemo(() => {
    return targetProtein * 4 + targetCarbs * 4 + targetFat * 9;
  }, [targetProtein, targetCarbs, targetFat]);

  // Macro percentages
  const macroPercentages = useMemo(() => {
    const total = actualCalories;
    return {
      protein: total > 0 ? Math.round((targetProtein * 4 / total) * 100) : 0,
      carbs: total > 0 ? Math.round((targetCarbs * 4 / total) * 100) : 0,
      fat: total > 0 ? Math.round((targetFat * 9 / total) * 100) : 0,
    };
  }, [actualCalories, targetProtein, targetCarbs, targetFat]);

  // Quick presets
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'high_protein_breakfast':
        setMealType('breakfast');
        setTargetCalories(450);
        setTargetProtein(40);
        setTargetCarbs(35);
        setTargetFat(15);
        break;
      case 'balanced_lunch':
        setMealType('lunch');
        setTargetCalories(600);
        setTargetProtein(45);
        setTargetCarbs(55);
        setTargetFat(20);
        break;
      case 'light_dinner':
        setMealType('dinner');
        setTargetCalories(500);
        setTargetProtein(40);
        setTargetCarbs(40);
        setTargetFat(18);
        break;
      case 'post_workout':
        setMealType('post_workout');
        setTargetCalories(400);
        setTargetProtein(35);
        setTargetCarbs(45);
        setTargetFat(8);
        break;
      case 'protein_snack':
        setMealType('snack');
        setTargetCalories(200);
        setTargetProtein(25);
        setTargetCarbs(15);
        setTargetFat(6);
        break;
    }
    toast.success('Preset applied!');
  };

  // Generate Meal
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      const response = await fetch('/api/generate-single-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          targets: {
            calories: targetCalories,
            protein: targetProtein,
            carbs: targetCarbs,
            fat: targetFat,
            flexibility: macroFlexibility,
          },
          preferences: {
            prepComplexity,
            mealStyle,
            cuisine,
            preferredProtein,
            dietaryRestriction,
            allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
            dislikes: dislikes.split(',').map(d => d.trim()).filter(Boolean),
          },
          context: {
            mealTime,
            location,
            specialRequests,
          },
        }),
      });

      setGenerationProgress(60);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate meal');
      }

      const data = await response.json();
      setGeneratedMeal(data.meal);
      setAlternatives(data.alternatives || []);
      setGenerationProgress(100);
      toast.success('Meal generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate meal');
      
      // Generate mock data for demo
      const mockMeal: GeneratedMeal = {
        name: `${cuisine !== 'Any' ? cuisine + ' ' : ''}${MEAL_TYPES.find(m => m.value === mealType)?.label} Bowl`,
        description: `A delicious ${mealStyle} ${mealType} featuring ${preferredProtein.toLowerCase()} with balanced macros to meet your goals.`,
        calories: targetCalories,
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat,
        fiber: 8,
        ingredients: [
          { item: preferredProtein, amount: '150g', notes: 'grilled or baked' },
          { item: 'Mixed Vegetables', amount: '1 cup' },
          { item: 'Brown Rice', amount: '1/2 cup cooked' },
          { item: 'Olive Oil', amount: '1 tbsp' },
          { item: 'Seasonings', amount: 'to taste' },
        ],
        instructions: [
          'Prepare and season the protein source',
          'Cook protein using your preferred method',
          'Steam or sauté vegetables until tender',
          'Combine all ingredients in a bowl',
          'Drizzle with olive oil and serve',
        ],
        prepTime: prepComplexity === 'no_cook' ? 5 : prepComplexity === 'quick' ? 10 : 15,
        cookTime: prepComplexity === 'no_cook' ? 0 : prepComplexity === 'quick' ? 10 : 20,
        tips: [
          'Prep vegetables ahead of time for faster cooking',
          'Season protein liberally for best flavor',
          'Meal can be stored for up to 3 days refrigerated',
        ],
        substitutions: [
          { original: preferredProtein, substitute: 'Tofu', reason: 'For vegetarian option' },
          { original: 'Brown Rice', substitute: 'Quinoa', reason: 'Higher protein content' },
          { original: 'Olive Oil', substitute: 'Avocado', reason: 'Whole food fat source' },
        ],
        nutritionHighlights: [
          'High in complete protein for muscle recovery',
          'Complex carbs for sustained energy',
          'Healthy fats for hormone function',
        ],
      };
      setGeneratedMeal(mockMeal);
      setGenerationProgress(100);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 2000);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (!generatedMeal) return;
    
    let text = `🍽️ ${generatedMeal.name}\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `${generatedMeal.description}\n\n`;
    text += `📊 Nutrition: ${generatedMeal.calories} cal | ${generatedMeal.protein}g P | ${generatedMeal.carbs}g C | ${generatedMeal.fat}g F\n`;
    text += `⏱️ Prep: ${generatedMeal.prepTime} min | Cook: ${generatedMeal.cookTime} min\n\n`;
    
    text += `📝 Ingredients:\n`;
    generatedMeal.ingredients.forEach(ing => {
      text += `  • ${ing.amount} ${ing.item}${ing.notes ? ` (${ing.notes})` : ''}\n`;
    });
    
    text += `\n👨‍🍳 Instructions:\n`;
    generatedMeal.instructions.forEach((inst, i) => {
      text += `  ${i + 1}. ${inst}\n`;
    });

    if (generatedMeal.tips.length > 0) {
      text += `\n💡 Tips:\n`;
      generatedMeal.tips.forEach(tip => {
        text += `  • ${tip}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    toast.success('Meal copied to clipboard!');
  };

  // Download PDF
  const downloadPDF = async () => {
    if (!generatedMeal) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-meal-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal: generatedMeal,
          context: {
            mealType,
            mealTime,
            location,
            cuisine,
            mealStyle,
            prepComplexity,
          },
          targets: {
            calories: targetCalories,
            protein: targetProtein,
            carbs: targetCarbs,
            fat: targetFat,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedMeal.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
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
            <ChefHat className="h-8 w-8 text-[#c19962]" />
            <h1 className="text-3xl font-bold">Single Meal Planner</h1>
          </div>
          <p className="text-muted-foreground">
            Generate a perfectly macro-balanced meal tailored to your preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Quick Presets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Quick Presets
                </CardTitle>
                <CardDescription>Start with a common meal template</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => applyPreset('high_protein_breakfast')}>
                    🍳 High-Protein Breakfast
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset('balanced_lunch')}>
                    🥗 Balanced Lunch
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset('light_dinner')}>
                    🍽️ Light Dinner
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset('post_workout')}>
                    💪 Post-Workout
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset('protein_snack')}>
                    🥜 Protein Snack
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Meal Type Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#c19962]" />
                  Meal Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {MEAL_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={mealType === type.value ? 'default' : 'outline'}
                      className={cn(
                        "h-auto py-3 flex flex-col items-center gap-1",
                        mealType === type.value && "bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      )}
                      onClick={() => setMealType(type.value)}
                    >
                      {type.icon}
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Macro Targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#c19962]" />
                  Macro Targets
                </CardTitle>
                <CardDescription>
                  Calculated calories: {actualCalories} 
                  {Math.abs(actualCalories - targetCalories) > 20 && (
                    <span className="text-yellow-600 ml-2">(adjust to match target)</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Calories: {targetCalories}</Label>
                  <Slider
                    min={100}
                    max={1500}
                    step={25}
                    value={[targetCalories]}
                    onValueChange={(v) => setTargetCalories(v[0])}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Protein: {targetProtein}g</Label>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[targetProtein]}
                      onValueChange={(v) => setTargetProtein(v[0])}
                    />
                    <p className="text-xs text-muted-foreground text-center">{macroPercentages.protein}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Carbs: {targetCarbs}g</Label>
                    <Slider
                      min={0}
                      max={150}
                      step={5}
                      value={[targetCarbs]}
                      onValueChange={(v) => setTargetCarbs(v[0])}
                    />
                    <p className="text-xs text-muted-foreground text-center">{macroPercentages.carbs}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Fat: {targetFat}g</Label>
                    <Slider
                      min={5}
                      max={60}
                      step={1}
                      value={[targetFat]}
                      onValueChange={(v) => setTargetFat(v[0])}
                    />
                    <p className="text-xs text-muted-foreground text-center">{macroPercentages.fat}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Macro Flexibility: ±{macroFlexibility}%</Label>
                  <Slider
                    min={0}
                    max={20}
                    step={5}
                    value={[macroFlexibility]}
                    onValueChange={(v) => setMacroFlexibility(v[0])}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-[#c19962]" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prep Complexity</Label>
                    <Select value={prepComplexity} onValueChange={(v) => setPrepComplexity(v as PrepComplexity)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PREP_COMPLEXITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label} ({p.time})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meal Style</Label>
                    <Select value={mealStyle} onValueChange={(v) => setMealStyle(v as MealStyle)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cuisine</Label>
                    <Select value={cuisine} onValueChange={setCuisine}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUISINES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Main Protein</Label>
                    <Select value={preferredProtein} onValueChange={setPreferredProtein}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROTEIN_SOURCES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Allergies (comma-separated)</Label>
                    <Input
                      placeholder="e.g., Peanuts, Shellfish"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Foods to Avoid</Label>
                    <Input
                      placeholder="e.g., Mushrooms, Olives"
                      value={dislikes}
                      onChange={(e) => setDislikes(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Context */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#c19962]" />
                  Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meal Time</Label>
                    <Input
                      type="time"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="Home, Work, Gym..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Special Requests</Label>
                  <Textarea
                    placeholder="e.g., Extra filling, good for meal prep, needs to be portable..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

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
                      Generate Meal
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
            {generatedMeal ? (
              <>
                {/* Main Meal Card */}
                <Card className="border-[#c19962] bg-gradient-to-br from-[#c19962]/5 to-transparent">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">{generatedMeal.name}</CardTitle>
                        <CardDescription className="mt-1">{generatedMeal.description}</CardDescription>
                      </div>
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
                          New
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Macros */}
                    <div className="grid grid-cols-5 gap-3 text-center">
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xl font-bold text-[#c19962]">{generatedMeal.calories}</p>
                        <p className="text-xs text-muted-foreground">Calories</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xl font-bold">{generatedMeal.protein}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xl font-bold">{generatedMeal.carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xl font-bold">{generatedMeal.fat}g</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xl font-bold">{generatedMeal.fiber}g</p>
                        <p className="text-xs text-muted-foreground">Fiber</p>
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        Prep: {generatedMeal.prepTime} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame className="h-4 w-4" />
                        Cook: {generatedMeal.cookTime} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Total: {generatedMeal.prepTime + generatedMeal.cookTime} min
                      </div>
                    </div>

                    <Separator />

                    {/* Ingredients */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <ShoppingCart className="h-4 w-4 text-[#c19962]" />
                        Ingredients
                      </h4>
                      <div className="space-y-2">
                        {generatedMeal.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="font-medium">{ing.amount}</span>
                            <span>{ing.item}</span>
                            {ing.notes && <span className="text-muted-foreground">({ing.notes})</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Instructions */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <ChefHat className="h-4 w-4 text-[#c19962]" />
                        Instructions
                      </h4>
                      <ol className="space-y-2">
                        {generatedMeal.instructions.map((inst, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="h-6 w-6 rounded-full bg-[#c19962]/20 text-[#c19962] flex items-center justify-center flex-shrink-0 font-medium text-xs">
                              {i + 1}
                            </span>
                            <span>{inst}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Tips */}
                    {generatedMeal.tips.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold flex items-center gap-2 mb-3">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Pro Tips
                          </h4>
                          <ul className="space-y-1">
                            {generatedMeal.tips.map((tip, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-yellow-500">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Substitutions */}
                    {generatedMeal.substitutions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold flex items-center gap-2 mb-3">
                            🔄 Substitutions
                          </h4>
                          <div className="space-y-2">
                            {generatedMeal.substitutions.map((sub, i) => (
                              <div key={i} className="text-sm p-2 bg-muted rounded-lg">
                                <span className="font-medium">{sub.original}</span>
                                <span className="text-muted-foreground"> → </span>
                                <span className="font-medium text-[#c19962]">{sub.substitute}</span>
                                <span className="text-muted-foreground text-xs ml-2">({sub.reason})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Nutrition Highlights */}
                    {generatedMeal.nutritionHighlights.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold flex items-center gap-2 mb-3">
                            ✨ Nutrition Highlights
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {generatedMeal.nutritionHighlights.map((highlight, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {highlight}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center">
                  <ChefHat className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Meal Generated Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Set your macro targets and preferences, then click "Generate Meal" to create a perfectly balanced meal.
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
