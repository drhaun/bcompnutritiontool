'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  ArrowLeft, 
  Utensils, 
  Calendar, 
  X, 
  Check, 
  Pill, 
  ShoppingCart,
  Flame,
  Repeat,
  Leaf,
  MapPin,
  Plus,
  StickyNote
} from 'lucide-react';
import type { DayOfWeek, DaySchedule, InterestLevel, SupplementStatus, SupplementPreference } from '@/types';

// ============ DATA CONSTANTS ============

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Low-FODMAP', 'Low-Sodium', 'Diabetic-Friendly'
];

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 
  'Milk/Dairy', 'Wheat', 'Soy', 'Sesame', 'Mustard'
];

const PROTEINS = [
  'Chicken Breast', 'Chicken Thighs', 'Turkey', 'Ground Turkey', 'Beef (Lean)', 
  'Ground Beef', 'Pork Tenderloin', 'Pork Chops', 'Bacon', 'Salmon', 
  'Tuna', 'Tilapia', 'Shrimp', 'Cod', 'Eggs', 'Egg Whites',
  'Tofu', 'Tempeh', 'Greek Yogurt', 'Cottage Cheese', 'Whey Protein'
];

const CARBS = [
  'White Rice', 'Brown Rice', 'Quinoa', 'Oats', 'Pasta', 
  'Whole Wheat Pasta', 'Bread', 'Whole Wheat Bread', 'Potatoes', 'Sweet Potatoes',
  'Beans', 'Lentils', 'Chickpeas', 'Corn', 'Tortillas', 
  'Couscous', 'Barley', 'Farro', 'Bagels', 'English Muffins'
];

const FATS = [
  'Olive Oil', 'Coconut Oil', 'Avocado Oil', 'Butter', 'Ghee',
  'Avocado', 'Almonds', 'Walnuts', 'Cashews', 'Peanut Butter',
  'Almond Butter', 'Cheese', 'Full-Fat Yogurt', 'Chia Seeds', 'Flax Seeds'
];

const VEGETABLES = [
  'Spinach', 'Kale', 'Broccoli', 'Asparagus', 'Green Beans',
  'Brussels Sprouts', 'Cauliflower', 'Zucchini', 'Bell Peppers', 'Tomatoes',
  'Carrots', 'Onions', 'Garlic', 'Mushrooms', 'Cucumber',
  'Lettuce', 'Cabbage', 'Celery', 'Snap Peas', 'Eggplant'
];

const CUISINES = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese',
  'Thai', 'Indian', 'Mediterranean', 'Greek', 'French',
  'Korean', 'Vietnamese', 'Middle Eastern', 'Spanish', 'Cajun/Southern'
];

const SUPPLEMENTS: string[] = [
  // Performance & Muscle
  'Creatine Monohydrate',
  'Protein Powder',
  'EAAs (Essential Amino Acids)',
  'BCAAs',
  'Beta-Alanine',
  'Citrulline',
  'Pre-Workout',
  'Post-Workout',
  'HMB',
  // Vitamins & Minerals
  'Multivitamin',
  'Vitamin D',
  'Vitamin B Complex',
  'Vitamin C',
  'Iron',
  'Zinc',
  'Magnesium',
  'Calcium',
  'Potassium',
  // Health & Recovery
  'Omega-3/Fish Oil',
  'Collagen',
  'Probiotics',
  'Digestive Enzymes',
  'Fiber Supplement',
  'Greens Powder',
  // Specialty
  'Caffeine',
  'Ashwagandha',
  'Melatonin',
  'Electrolytes',
  'Glutamine',
  'Taurine',
];

const FLAVOR_PROFILES = [
  'Savory/Umami', 'Sweet', 'Sour/Tangy', 'Bitter', 'Spicy/Hot',
  'Smoky', 'Citrusy', 'Garlic-heavy', 'Onion-heavy', 'Herbal'
];

const SEASONINGS = [
  'Salt', 'Black Pepper', 'Garlic Powder', 'Onion Powder', 'Paprika',
  'Cumin', 'Oregano', 'Basil', 'Thyme', 'Rosemary',
  'Chili Powder', 'Cayenne', 'Cinnamon', 'Turmeric', 'Ginger'
];

const COOKING_ENHANCERS = [
  'Olive Oil', 'Butter', 'Lemon Juice', 'Lime Juice', 'Garlic',
  'Hot Sauce', 'Soy Sauce', 'Worcestershire', 'Balsamic Vinegar', 'Honey',
  'Maple Syrup', 'Fresh Herbs', 'Mustard', 'Coconut Aminos', 'Fish Sauce'
];

const MICRONUTRIENTS = [
  'Iron', 'Zinc', 'Magnesium', 'Calcium', 'Potassium',
  'Omega-3 Fatty Acids', 'Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin K',
  'Folate', 'B12', 'Fiber', 'Antioxidants', 'Probiotics'
];

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultSchedule: DaySchedule = {
  wakeTime: '7:00 AM',
  sleepTime: '10:00 PM',
  workouts: [],
  mealCount: 3,
  snackCount: 2,
  mealContexts: [],
};

// ============ COMPONENT ============

export default function PreferencesPage() {
  const router = useRouter();
  const { dietPreferences, weeklySchedule, setDietPreferences, setWeeklySchedule, calculateNutritionTargets } = useFitomicsStore();
  
  // Handle hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const [activeTab, setActiveTab] = useState('restrictions');
  
  // ============ STATE ============
  
  // Dietary Restrictions & Allergies
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(dietPreferences.dietaryRestrictions || []);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(dietPreferences.allergies || []);
  const [customAllergies, setCustomAllergies] = useState<string>(
    (dietPreferences.customAllergies || []).join(', ')
  );
  
  // Food Preferences
  const [selectedProteins, setSelectedProteins] = useState<string[]>(dietPreferences.preferredProteins || []);
  const [selectedCarbs, setSelectedCarbs] = useState<string[]>(dietPreferences.preferredCarbs || []);
  const [selectedFats, setSelectedFats] = useState<string[]>(dietPreferences.preferredFats || []);
  const [selectedVegetables, setSelectedVegetables] = useState<string[]>(dietPreferences.preferredVegetables || []);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(dietPreferences.cuisinePreferences || []);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string>(
    (dietPreferences.foodsToAvoid || []).join('\n')
  );
  const [foodsToEmphasize, setFoodsToEmphasize] = useState<string>(
    (dietPreferences.foodsToEmphasize || []).join('\n')
  );
  
  // Supplements
  const [supplements, setSupplements] = useState<SupplementPreference[]>(
    dietPreferences.supplements || SUPPLEMENTS.map(s => ({ name: s, status: 'not_interested' as SupplementStatus, notes: '' }))
  );
  const [otherSupplements, setOtherSupplements] = useState<string>(
    (dietPreferences.otherSupplements || []).join('\n')
  );
  
  // Meal Sourcing
  const [mealDeliveryInterest, setMealDeliveryInterest] = useState<InterestLevel>(dietPreferences.mealDeliveryInterest || 'medium');
  const [homeCookingInterest, setHomeCookingInterest] = useState<InterestLevel>(dietPreferences.homeCookingInterest || 'medium');
  const [groceryShoppingInterest, setGroceryShoppingInterest] = useState<InterestLevel>(dietPreferences.groceryShoppingInterest || 'medium');
  const [cookingTime, setCookingTime] = useState(dietPreferences.cookingTimePreference || 'Medium (30-60 min)');
  const [budget, setBudget] = useState(dietPreferences.budgetPreference || 'Moderate');
  
  // Seasoning & Flavor
  const [spiceLevel, setSpiceLevel] = useState(dietPreferences.spiceLevel ?? 2);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(dietPreferences.flavorProfiles || []);
  const [selectedSeasonings, setSelectedSeasonings] = useState<string[]>(dietPreferences.preferredSeasonings || []);
  const [selectedEnhancers, setSelectedEnhancers] = useState<string[]>(dietPreferences.cookingEnhancers || []);
  
  // Meal Variety
  const [varietyLevel, setVarietyLevel] = useState(dietPreferences.varietyLevel ?? 3);
  const [repetitionPref, setRepetitionPref] = useState(dietPreferences.repetitionPreference || 'prefer_different');
  const [weeklyStructure, setWeeklyStructure] = useState(dietPreferences.weeklyMealStructure || 'mix');
  const [cookingVariety, setCookingVariety] = useState(dietPreferences.cookingVariety || 'some_variety');
  
  // Micronutrient & Seasonal
  const [selectedMicronutrients, setSelectedMicronutrients] = useState<string[]>(dietPreferences.micronutrientFocus || []);
  const [seasonalPref, setSeasonalPref] = useState(dietPreferences.seasonalPreference || 'auto');
  const [mealPrepCoord, setMealPrepCoord] = useState(dietPreferences.mealPrepCoordination || 'some');
  
  // Location
  const [homeZip, setHomeZip] = useState(dietPreferences.homeZipCode || '');
  const [workZip, setWorkZip] = useState(dietPreferences.workZipCode || '');
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<string>(
    (dietPreferences.favoriteRestaurants || []).join('\n')
  );
  const [favoriteStores, setFavoriteStores] = useState<string>(
    (dietPreferences.favoriteGroceryStores || []).join('\n')
  );
  

  // ============ HELPERS ============

  const toggleItem = (item: string, list: string[], setList: (items: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const selectAll = (items: string[], setList: (items: string[]) => void) => {
    setList([...items]);
  };

  const clearAll = (setList: (items: string[]) => void) => {
    setList([]);
  };

  const updateSupplementStatus = (name: string, status: SupplementStatus) => {
    setSupplements(prev => prev.map(s => s.name === name ? { ...s, status } : s));
  };
  
  const updateSupplementNotes = (name: string, notes: string) => {
    setSupplements(prev => prev.map(s => s.name === name ? { ...s, notes } : s));
  };

  const spiceLevelLabels = ['No Spice', 'Mild', 'Medium', 'Spicy', 'Very Hot'];

  // ============ SAVE HANDLERS ============

  const handleSaveAll = () => {
    // Save all diet preferences
    setDietPreferences({
      dietaryRestrictions: selectedRestrictions,
      allergies: selectedAllergies,
      customAllergies: customAllergies.split(',').map(s => s.trim()).filter(Boolean),
      preferredProteins: selectedProteins,
      preferredCarbs: selectedCarbs,
      preferredFats: selectedFats,
      preferredVegetables: selectedVegetables,
      cuisinePreferences: selectedCuisines,
      foodsToAvoid: foodsToAvoid.split('\n').map(s => s.trim()).filter(Boolean),
      foodsToEmphasize: foodsToEmphasize.split('\n').map(s => s.trim()).filter(Boolean),
      supplements,
      otherSupplements: otherSupplements.split('\n').map(s => s.trim()).filter(Boolean),
      mealDeliveryInterest,
      homeCookingInterest,
      groceryShoppingInterest,
      cookingTimePreference: cookingTime,
      budgetPreference: budget,
      spiceLevel,
      flavorProfiles: selectedFlavors,
      preferredSeasonings: selectedSeasonings,
      cookingEnhancers: selectedEnhancers,
      varietyLevel,
      repetitionPreference: repetitionPref,
      weeklyMealStructure: weeklyStructure,
      cookingVariety,
      micronutrientFocus: selectedMicronutrients,
      seasonalPreference: seasonalPref,
      ingredientSubstitutions: true,
      mealPrepCoordination: mealPrepCoord,
      preferredProduceSeasons: [],
      homeZipCode: homeZip,
      workZipCode: workZip,
      favoriteRestaurants: favoriteRestaurants.split('\n').map(s => s.trim()).filter(Boolean),
      favoriteGroceryStores: favoriteStores.split('\n').map(s => s.trim()).filter(Boolean),
    });
    
    // Calculate nutrition targets based on previously saved schedule
    calculateNutritionTargets();
    
    toast.success('All preferences saved!');
    router.push('/targets');
  };

  // ============ COMPONENTS ============

  const SelectionGridWithCustom = ({ 
    items, 
    selected, 
    onToggle,
    onAddCustom,
    columns = 4,
    showControls = true,
    onSelectAll,
    onClearAll,
    placeholder = "Add custom items (comma-separated)",
    categoryName = "items",
  }: { 
    items: string[]; 
    selected: string[]; 
    onToggle: (item: string) => void;
    onAddCustom?: (items: string[]) => void;
    columns?: number;
    showControls?: boolean;
    onSelectAll?: () => void;
    onClearAll?: () => void;
    placeholder?: string;
    categoryName?: string;
  }) => {
    const [customInput, setCustomInput] = useState('');
    
    const handleAddCustom = () => {
      if (!customInput.trim() || !onAddCustom) return;
      
      const newItems = customInput
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0 && !selected.includes(item));
      
      if (newItems.length > 0) {
        onAddCustom(newItems);
        toast.success(`Added ${newItems.length} custom ${categoryName}`);
      }
      setCustomInput('');
    };
    
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustom();
      }
    };
    
    // Separate predefined items from custom items
    const predefinedItems = items;
    const customItems = selected.filter(item => !predefinedItems.includes(item));
    
    return (
      <div className="space-y-3">
        {showControls && (
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          </div>
        )}
        
        {/* Predefined options grid */}
        <div className={cn(
          'grid gap-2',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 md:grid-cols-3',
          columns === 4 && 'grid-cols-2 md:grid-cols-4',
          columns === 5 && 'grid-cols-2 md:grid-cols-5',
        )}>
          {predefinedItems.map((item) => (
            <div
              key={item}
              onClick={() => onToggle(item)}
              className={cn(
                'flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-center',
                selected.includes(item) 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background hover:bg-muted border-border'
              )}
            >
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
        
        {/* Custom items display */}
        {customItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Custom {categoryName}:</p>
            <div className="flex flex-wrap gap-2">
              {customItems.map((item) => (
                <Badge 
                  key={item} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onToggle(item)}
                >
                  {item}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Custom input field */}
        {onAddCustom && (
          <div className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-right">
          {selected.length} selected ({predefinedItems.filter(i => selected.includes(i)).length} preset + {customItems.length} custom)
        </p>
      </div>
    );
  };

  // Legacy SelectionGrid for backward compatibility (no custom input)
  const SelectionGrid = ({ 
    items, 
    selected, 
    onToggle,
    columns = 4,
    showControls = true,
    onSelectAll,
    onClearAll,
  }: { 
    items: string[]; 
    selected: string[]; 
    onToggle: (item: string) => void;
    columns?: number;
    showControls?: boolean;
    onSelectAll?: () => void;
    onClearAll?: () => void;
  }) => (
    <div className="space-y-2">
      {showControls && (
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
            Clear All
          </Button>
        </div>
      )}
      <div className={cn(
        'grid gap-2',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-2 md:grid-cols-3',
        columns === 4 && 'grid-cols-2 md:grid-cols-4',
        columns === 5 && 'grid-cols-2 md:grid-cols-5',
      )}>
        {items.map((item) => (
          <div
            key={item}
            onClick={() => onToggle(item)}
            className={cn(
              'flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-center',
              selected.includes(item) 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background hover:bg-muted border-border'
            )}
          >
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-right">{selected.length} selected</p>
    </div>
  );

  const InterestSelector = ({
    label,
    value,
    onChange,
    icon,
  }: {
    label: string;
    value: InterestLevel;
    onChange: (v: InterestLevel) => void;
    icon: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="flex gap-2">
        {(['low', 'medium', 'high'] as InterestLevel[]).map((level) => (
          <Button
            key={level}
            type="button"
            variant={value === level ? 'default' : 'outline'}
            size="sm"
            className="flex-1 capitalize"
            onClick={() => onChange(level)}
          >
            {level}
          </Button>
        ))}
      </div>
    </div>
  );

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <ProgressSteps currentStep={3} />
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Diet & Lifestyle Preferences</h1>
            <p className="text-muted-foreground">Comprehensive preferences for personalized meal planning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
                <TabsTrigger value="restrictions" className="text-xs px-2">Restrictions</TabsTrigger>
                <TabsTrigger value="foods" className="text-xs px-2">Foods</TabsTrigger>
                <TabsTrigger value="supplements" className="text-xs px-2">Supplements</TabsTrigger>
                <TabsTrigger value="sourcing" className="text-xs px-2">Sourcing</TabsTrigger>
                <TabsTrigger value="flavors" className="text-xs px-2">Flavors</TabsTrigger>
                <TabsTrigger value="variety" className="text-xs px-2">Variety</TabsTrigger>
                <TabsTrigger value="nutrition" className="text-xs px-2">Nutrition</TabsTrigger>
              </TabsList>

              {/* ============ TAB 1: RESTRICTIONS ============ */}
              <TabsContent value="restrictions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dietary Restrictions</CardTitle>
                    <CardDescription>Select all that apply to your diet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGrid
                      items={DIETARY_RESTRICTIONS}
                      selected={selectedRestrictions}
                      onToggle={(item) => toggleItem(item, selectedRestrictions, setSelectedRestrictions)}
                      columns={5}
                      showControls={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Food Allergies</CardTitle>
                    <CardDescription>These will be strictly avoided in all meal plans</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SelectionGrid
                      items={COMMON_ALLERGIES}
                      selected={selectedAllergies}
                      onToggle={(item) => toggleItem(item, selectedAllergies, setSelectedAllergies)}
                      columns={5}
                      showControls={false}
                    />
                    <Separator />
                    <div className="space-y-2">
                      <Label>Other Allergies (comma-separated)</Label>
                      <Input
                        placeholder="e.g., Kiwi, Latex, Red Dye 40"
                        value={customAllergies}
                        onChange={(e) => setCustomAllergies(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('foods')} size="lg">
                    Continue to Food Preferences
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 2: FOOD PREFERENCES ============ */}
              <TabsContent value="foods" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Proteins</CardTitle>
                    <CardDescription>Select from common options or add your own</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGridWithCustom
                      items={PROTEINS}
                      selected={selectedProteins}
                      onToggle={(item) => toggleItem(item, selectedProteins, setSelectedProteins)}
                      onAddCustom={(items) => setSelectedProteins(prev => [...prev, ...items])}
                      columns={4}
                      onSelectAll={() => selectAll(PROTEINS, setSelectedProteins)}
                      onClearAll={() => clearAll(setSelectedProteins)}
                      placeholder="Add custom proteins (comma-separated)"
                      categoryName="proteins"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Carbohydrates</CardTitle>
                    <CardDescription>Select from common options or add your own</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGridWithCustom
                      items={CARBS}
                      selected={selectedCarbs}
                      onToggle={(item) => toggleItem(item, selectedCarbs, setSelectedCarbs)}
                      onAddCustom={(items) => setSelectedCarbs(prev => [...prev, ...items])}
                      columns={4}
                      onSelectAll={() => selectAll(CARBS, setSelectedCarbs)}
                      onClearAll={() => clearAll(setSelectedCarbs)}
                      placeholder="Add custom carbs (comma-separated)"
                      categoryName="carbohydrates"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Fats & Oils</CardTitle>
                    <CardDescription>Select from common options or add your own</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGridWithCustom
                      items={FATS}
                      selected={selectedFats}
                      onToggle={(item) => toggleItem(item, selectedFats, setSelectedFats)}
                      onAddCustom={(items) => setSelectedFats(prev => [...prev, ...items])}
                      columns={5}
                      onSelectAll={() => selectAll(FATS, setSelectedFats)}
                      onClearAll={() => clearAll(setSelectedFats)}
                      placeholder="Add custom fats (comma-separated)"
                      categoryName="fats"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Vegetables</CardTitle>
                    <CardDescription>Select from common options or add your own</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGridWithCustom
                      items={VEGETABLES}
                      selected={selectedVegetables}
                      onToggle={(item) => toggleItem(item, selectedVegetables, setSelectedVegetables)}
                      onAddCustom={(items) => setSelectedVegetables(prev => [...prev, ...items])}
                      columns={5}
                      onSelectAll={() => selectAll(VEGETABLES, setSelectedVegetables)}
                      onClearAll={() => clearAll(setSelectedVegetables)}
                      placeholder="Add custom vegetables (comma-separated)"
                      categoryName="vegetables"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cuisine Preferences</CardTitle>
                    <CardDescription>Select from common options or add your own</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGridWithCustom
                      items={CUISINES}
                      selected={selectedCuisines}
                      onToggle={(item) => toggleItem(item, selectedCuisines, setSelectedCuisines)}
                      onAddCustom={(items) => setSelectedCuisines(prev => [...prev, ...items])}
                      columns={5}
                      onSelectAll={() => selectAll(CUISINES, setSelectedCuisines)}
                      onClearAll={() => clearAll(setSelectedCuisines)}
                      placeholder="Add custom cuisines (comma-separated)"
                      categoryName="cuisines"
                    />
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Foods to Avoid</CardTitle>
                      <CardDescription>Foods to exclude from meal plans (one per line or comma-separated)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="e.g.,&#10;Liver&#10;Anchovies&#10;Blue cheese"
                        value={foodsToAvoid}
                        onChange={(e) => setFoodsToAvoid(e.target.value)}
                        rows={5}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">Foods to Emphasize</CardTitle>
                      <CardDescription>Foods to prioritize in meal plans (one per line or comma-separated)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="e.g.,&#10;Salmon&#10;Spinach&#10;Sweet potatoes&#10;Blueberries"
                        value={foodsToEmphasize}
                        onChange={(e) => setFoodsToEmphasize(e.target.value)}
                        rows={5}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('restrictions')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('supplements')} size="lg">
                    Continue to Supplements
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 3: SUPPLEMENTS ============ */}
              <TabsContent value="supplements" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-[#c19962]" />
                      Supplement Tracking
                    </CardTitle>
                    <CardDescription>
                      Track supplements the client is taking or interested in. Add notes for details like brand, dosage, timing, and purpose.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {SUPPLEMENTS.map((suppName) => {
                        const current = supplements.find(s => s.name === suppName);
                        const status = current?.status || 'not_interested';
                        const notes = current?.notes || '';
                        const isActive = status === 'taking' || status === 'interested';
                        return (
                          <div 
                            key={suppName} 
                            className={cn(
                              "p-3 border rounded-lg transition-all",
                              status === 'taking' && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
                              status === 'interested' && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{suppName}</p>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={status === 'taking' ? 'default' : 'outline'}
                                  className={status === 'taking' ? 'bg-green-600 hover:bg-green-700' : ''}
                                  onClick={() => updateSupplementStatus(suppName, 'taking')}
                                >
                                  <Check className="h-3 w-3 mr-1" /> Taking
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={status === 'interested' ? 'default' : 'outline'}
                                  className={status === 'interested' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                  onClick={() => updateSupplementStatus(suppName, 'interested')}
                                >
                                  Interested
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={status === 'not_interested' ? 'secondary' : 'ghost'}
                                  onClick={() => updateSupplementStatus(suppName, 'not_interested')}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {isActive && (
                              <div className="mt-2">
                                <Input
                                  placeholder="Notes: brand, dosage, timing, purpose..."
                                  value={notes}
                                  onChange={(e) => updateSupplementNotes(suppName, e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Other Supplements</CardTitle>
                    <CardDescription>
                      Add any other supplements not listed above. Include name, dosage, timing, and purpose (one per line).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="e.g.,&#10;Berberine 500mg - 2x daily with meals for glucose control&#10;Lion's Mane 1000mg - morning for cognitive support&#10;Tongkat Ali 400mg - morning for testosterone support"
                      value={otherSupplements}
                      onChange={(e) => setOtherSupplements(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('foods')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('sourcing')} size="lg">
                    Continue to Meal Sourcing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 4: MEAL SOURCING ============ */}
              <TabsContent value="sourcing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-[#c19962]" />
                      Meal Sourcing Preferences
                    </CardTitle>
                    <CardDescription>How do you prefer to get your meals?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <InterestSelector
                      label="Ready-to-Eat Meal Delivery"
                      value={mealDeliveryInterest}
                      onChange={setMealDeliveryInterest}
                      icon={<Utensils className="h-4 w-4" />}
                    />
                    <InterestSelector
                      label="Home Cooking / DIY Meal Prep"
                      value={homeCookingInterest}
                      onChange={setHomeCookingInterest}
                      icon={<Flame className="h-4 w-4" />}
                    />
                    <InterestSelector
                      label="Grocery Shopping"
                      value={groceryShoppingInterest}
                      onChange={setGroceryShoppingInterest}
                      icon={<ShoppingCart className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cooking & Budget</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Cooking Time Preference</Label>
                      <Select value={cookingTime} onValueChange={setCookingTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Quick (under 15 min)">Quick (under 15 min)</SelectItem>
                          <SelectItem value="Short (15-30 min)">Short (15-30 min)</SelectItem>
                          <SelectItem value="Medium (30-60 min)">Medium (30-60 min)</SelectItem>
                          <SelectItem value="Long (60+ min)">Long (60+ min)</SelectItem>
                          <SelectItem value="Any">Any - I have time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Budget Preference</Label>
                      <Select value={budget} onValueChange={setBudget}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Budget-Conscious">Budget-Conscious</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Flexible">Flexible</SelectItem>
                          <SelectItem value="Premium">Premium - No limits</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#c19962]" />
                      Location (Optional)
                    </CardTitle>
                    <CardDescription>For local restaurant and grocery recommendations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Home Zip Code</Label>
                        <Input
                          placeholder="e.g., 35124"
                          value={homeZip}
                          onChange={(e) => setHomeZip(e.target.value)}
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Work Zip Code (Optional)</Label>
                        <Input
                          placeholder="e.g., 35007"
                          value={workZip}
                          onChange={(e) => setWorkZip(e.target.value)}
                          maxLength={10}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Favorite Restaurants (one per line)</Label>
                        <Textarea
                          placeholder="e.g.,&#10;Chipotle&#10;Sweetgreen"
                          value={favoriteRestaurants}
                          onChange={(e) => setFavoriteRestaurants(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Favorite Grocery Stores (one per line)</Label>
                        <Textarea
                          placeholder="e.g.,&#10;Whole Foods&#10;Trader Joe's"
                          value={favoriteStores}
                          onChange={(e) => setFavoriteStores(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('supplements')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('flavors')} size="lg">
                    Continue to Flavors
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 5: FLAVORS ============ */}
              <TabsContent value="flavors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-[#c19962]" />
                      Spice Level
                    </CardTitle>
                    <CardDescription>How spicy do you like your food?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Slider
                        min={0}
                        max={4}
                        step={1}
                        value={[spiceLevel]}
                        onValueChange={(v) => setSpiceLevel(v[0])}
                      />
                      <div className="flex justify-between text-sm">
                        {spiceLevelLabels.map((label, i) => (
                          <span 
                            key={label} 
                            className={cn(
                              'text-center',
                              i === spiceLevel ? 'font-bold text-[#c19962]' : 'text-muted-foreground'
                            )}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Flavor Profiles</CardTitle>
                    <CardDescription>What flavor profiles do you enjoy?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGrid
                      items={FLAVOR_PROFILES}
                      selected={selectedFlavors}
                      onToggle={(item) => toggleItem(item, selectedFlavors, setSelectedFlavors)}
                      columns={5}
                      showControls={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Seasonings</CardTitle>
                    <CardDescription>What seasonings and spices do you love?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGrid
                      items={SEASONINGS}
                      selected={selectedSeasonings}
                      onToggle={(item) => toggleItem(item, selectedSeasonings, setSelectedSeasonings)}
                      columns={5}
                      onSelectAll={() => selectAll(SEASONINGS, setSelectedSeasonings)}
                      onClearAll={() => clearAll(setSelectedSeasonings)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cooking Enhancers</CardTitle>
                    <CardDescription>What do you use to enhance your cooking?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGrid
                      items={COOKING_ENHANCERS}
                      selected={selectedEnhancers}
                      onToggle={(item) => toggleItem(item, selectedEnhancers, setSelectedEnhancers)}
                      columns={5}
                      onSelectAll={() => selectAll(COOKING_ENHANCERS, setSelectedEnhancers)}
                      onClearAll={() => clearAll(setSelectedEnhancers)}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('sourcing')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('variety')} size="lg">
                    Continue to Variety
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 6: VARIETY ============ */}
              <TabsContent value="variety" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5 text-[#c19962]" />
                      Meal Variety Preferences
                    </CardTitle>
                    <CardDescription>Control how much variety you want in your meal plans</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>Meal Variety Level</Label>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[varietyLevel]}
                        onValueChange={(v) => setVarietyLevel(v[0])}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Low Variety</span>
                        <span>Maximum Variety</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Repetition Preference</Label>
                      <RadioGroup value={repetitionPref} onValueChange={setRepetitionPref}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="enjoy_same" id="rep1" />
                          <Label htmlFor="rep1" className="font-normal">I enjoy eating the same meals regularly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="some_repetition" id="rep2" />
                          <Label htmlFor="rep2" className="font-normal">I like some repetition but with variations</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="prefer_different" id="rep3" />
                          <Label htmlFor="rep3" className="font-normal">I prefer different meals but can repeat favorites</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="max_variety" id="rep4" />
                          <Label htmlFor="rep4" className="font-normal">I want as much variety as possible</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Weekly Meal Planning Structure</Label>
                      <RadioGroup value={weeklyStructure} onValueChange={setWeeklyStructure}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="same_daily" id="str1" />
                          <Label htmlFor="str1" className="font-normal">Same breakfast, lunch, and dinner daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="same_breakfast" id="str2" />
                          <Label htmlFor="str2" className="font-normal">Same breakfast, varied lunch and dinner</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="different_daily" id="str3" />
                          <Label htmlFor="str3" className="font-normal">Different meals each day</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mix" id="str4" />
                          <Label htmlFor="str4" className="font-normal">Mix of routine and variety</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Cooking Variety</Label>
                      <RadioGroup value={cookingVariety} onValueChange={setCookingVariety}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="simple" id="cv1" />
                          <Label htmlFor="cv1" className="font-normal">Keep it simple - same cooking methods</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="some_variety" id="cv2" />
                          <Label htmlFor="cv2" className="font-normal">Some variety in cooking methods</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="try_different" id="cv3" />
                          <Label htmlFor="cv3" className="font-normal">Try different cooking techniques</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="max_cooking" id="cv4" />
                          <Label htmlFor="cv4" className="font-normal">Maximum cooking variety and creativity</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('flavors')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('nutrition')} size="lg">
                    Continue to Nutrition
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 7: MICRONUTRITION ============ */}
              <TabsContent value="nutrition" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-[#c19962]" />
                      Micronutrient Focus Areas
                    </CardTitle>
                    <CardDescription>Which micronutrients would you like to optimize?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectionGrid
                      items={MICRONUTRIENTS}
                      selected={selectedMicronutrients}
                      onToggle={(item) => toggleItem(item, selectedMicronutrients, setSelectedMicronutrients)}
                      columns={5}
                      showControls={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal & Meal Prep Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Seasonal Ingredients</Label>
                        <Select value={seasonalPref} onValueChange={setSeasonalPref}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect current season</SelectItem>
                            <SelectItem value="spring">Spring produce focus</SelectItem>
                            <SelectItem value="summer">Summer produce focus</SelectItem>
                            <SelectItem value="fall">Fall produce focus</SelectItem>
                            <SelectItem value="winter">Winter produce focus</SelectItem>
                            <SelectItem value="none">No preference</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Meal Prep Coordination</Label>
                        <Select value={mealPrepCoord} onValueChange={setMealPrepCoord}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No coordination needed</SelectItem>
                            <SelectItem value="some">Some coordination - Share ingredients across meals</SelectItem>
                            <SelectItem value="full">Full coordination - Batch cooking friendly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold">Enhanced Features:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Micronutrient Optimization:</strong> Meals designed to include foods rich in your selected nutrients</li>
                        <li>• <strong>Seasonal Integration:</strong> Ingredients reflect current season for better taste and cost</li>
                        <li>• <strong>Smart Substitutions:</strong> Alternative ingredients suggested when needed</li>
                        <li>• <strong>Meal Prep Coordination:</strong> Ingredient overlap optimized across your weekly plan</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('variety')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleSaveAll} size="lg" className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]">
                    Save All & Continue to Targets
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Progress Summary Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-24">
              <ProgressSummary currentStep={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
