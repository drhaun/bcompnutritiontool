import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import type {
  UserProfile,
  BodyCompGoals,
  DietPreferences,
  WeeklyMealPlan,
  DayNutritionTargets,
  Meal,
  DayOfWeek,
  WeeklySchedule,
} from '@/types';

// Fitomics Brand Colors
const COLORS = {
  darkBlue: '#00263d',
  navy: '#003b59',
  lightBlue: '#82c2d7',
  darkGold: '#c19962',
  lightGold: '#e4ac61',
  white: '#ffffff',
  lightGray: '#f8f9fa',
  gray: '#64748b',
  border: '#e2e8f0',
  success: '#22c55e',
  warning: '#f59e0b',
};

// Register fonts (using standard fonts for reliability)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    padding: 40,
    fontFamily: 'Helvetica',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.darkGold,
  },
  headerLogo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkGold,
    letterSpacing: 2,
  },
  headerText: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'right',
  },
  
  // Cover page styles
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.darkGold,
    letterSpacing: 4,
    marginBottom: 15,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 40,
    textAlign: 'center',
  },
  coverInfo: {
    backgroundColor: COLORS.lightGray,
    padding: 30,
    borderRadius: 8,
    width: '85%',
    marginBottom: 30,
  },
  coverInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coverInfoLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  coverInfoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
  },
  coverDivider: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  // Section styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.darkGold,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 8,
    marginTop: 12,
  },
  
  // Info box styles
  infoBox: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  infoBoxHighlight: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.darkGold,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
  },
  
  // Two column layout
  twoColumn: {
    flexDirection: 'row',
    gap: 15,
  },
  column: {
    flex: 1,
  },
  
  // Table styles
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkBlue,
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 6,
  },
  tableRowAlt: {
    backgroundColor: COLORS.lightGray,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: COLORS.darkBlue,
    textAlign: 'center',
  },
  
  // Meal card styles
  mealCard: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.darkGold,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mealName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
  },
  mealTime: {
    fontSize: 9,
    color: COLORS.gray,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mealMacros: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    gap: 4,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  macroValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
  },
  macroLabel: {
    fontSize: 7,
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mealRationale: {
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  rationaleText: {
    fontSize: 8,
    color: '#065f46',
    fontStyle: 'italic',
  },
  
  // Ingredients list
  ingredientsList: {
    marginTop: 8,
    backgroundColor: '#fafafa',
    padding: 8,
    borderRadius: 4,
  },
  ingredientsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  ingredientBullet: {
    width: 10,
    fontSize: 9,
    color: COLORS.darkGold,
    fontWeight: 'bold',
  },
  ingredientText: {
    flex: 1,
    fontSize: 9,
    color: COLORS.darkBlue,
    lineHeight: 1.3,
  },
  
  // Instructions
  instructionsList: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  instructionsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 16,
    fontSize: 9,
    color: '#15803d',
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 9,
    color: COLORS.darkBlue,
    lineHeight: 1.4,
  },
  
  // Tag/badge styles
  tag: {
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 8,
    color: COLORS.darkBlue,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  
  // Grocery list
  grocerySection: {
    marginBottom: 12,
  },
  groceryCategory: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.white,
    backgroundColor: COLORS.darkBlue,
    padding: 6,
    marginBottom: 2,
  },
  groceryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groceryItemName: {
    fontSize: 9,
    color: COLORS.darkBlue,
  },
  groceryItemAmount: {
    fontSize: 9,
    color: COLORS.gray,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.gray,
  },
  pageNumber: {
    fontSize: 7,
    color: COLORS.gray,
  },
  
  // Paragraph text
  bodyText: {
    fontSize: 9,
    color: COLORS.darkBlue,
    lineHeight: 1.4,
    marginBottom: 8,
  },
  
  // Highlight box
  highlightBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.darkGold,
  },
  highlightTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 9,
    color: COLORS.navy,
  },
});

// Day order constant
const DAYS_ORDER: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper Components
const Header = ({ title }: { title: string }) => (
  <View style={styles.header}>
    <Text style={styles.headerLogo}>FITOMICS</Text>
    <Text style={styles.headerText}>{title}</Text>
  </View>
);

const Footer = () => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>Fitomics Personalized Nutrition Strategy • Confidential</Text>
    <Text 
      style={styles.pageNumber} 
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} 
    />
  </View>
);

const MacroBox = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
  <View style={styles.macroItem}>
    <Text style={styles.macroValue}>{Math.round(value)}{unit}</Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const Tag = ({ text }: { text: string }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{text}</Text>
  </View>
);

const MealCard = ({ meal, mealNumber, context }: { meal: Meal; mealNumber: number; context?: string }) => {
  // Get source label
  const getSourceLabel = () => {
    switch (meal.source) {
      case 'ai': return 'AI Generated';
      case 'manual': return 'Custom';
      case 'swapped': return 'Swapped';
      case 'recipe': return 'Recipe';
      default: return null;
    }
  };
  
  const getSourceColor = () => {
    switch (meal.source) {
      case 'ai': return { bg: '#f3e8ff', text: '#7c3aed' };
      case 'manual': return { bg: '#dbeafe', text: '#2563eb' };
      case 'swapped': return { bg: '#ffedd5', text: '#ea580c' };
      case 'recipe': return { bg: '#dcfce7', text: '#16a34a' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };
  
  const sourceLabel = getSourceLabel();
  const sourceColor = getSourceColor();
  
  return (
    <View style={styles.mealCard} wrap={false}>
      <View style={styles.mealHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.mealName}>
            {meal.type === 'meal' ? `Meal ${mealNumber}` : `Snack ${mealNumber}`}: {meal.name}
          </Text>
          {sourceLabel && (
            <View style={{
              backgroundColor: sourceColor.bg,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
            }}>
              <Text style={{ 
                fontSize: 7, 
                color: sourceColor.text,
              }}>
                {sourceLabel}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.mealTime}>{meal.time} • {meal.prepTime}</Text>
      </View>
      
      <View style={styles.mealMacros}>
        <MacroBox label="Calories" value={meal.totalMacros.calories} unit="" />
        <MacroBox label="Protein" value={meal.totalMacros.protein} unit="g" />
        <MacroBox label="Carbs" value={meal.totalMacros.carbs} unit="g" />
        <MacroBox label="Fat" value={meal.totalMacros.fat} unit="g" />
      </View>
      
      {/* Target comparison - shows if meal is on target */}
      {meal.targetMacros && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 6,
          paddingTop: 2,
        }}>
          {Math.abs(meal.totalMacros.calories - meal.targetMacros.calories) <= meal.targetMacros.calories * 0.05 &&
           Math.abs(meal.totalMacros.protein - meal.targetMacros.protein) <= 5 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 7, color: '#15803d' }}>[On Target]</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 7, color: COLORS.gray }}>
                Target: {Math.round(meal.targetMacros.calories)} cal | {Math.round(meal.targetMacros.protein)}g P
              </Text>
              {meal.totalMacros.calories > meal.targetMacros.calories ? (
                <Text style={{ fontSize: 7, color: '#dc2626' }}>
                  (+{Math.round(meal.totalMacros.calories - meal.targetMacros.calories)} cal)
                </Text>
              ) : (
                <Text style={{ fontSize: 7, color: '#2563eb' }}>
                  ({Math.round(meal.totalMacros.calories - meal.targetMacros.calories)} cal)
                </Text>
              )}
            </View>
          )}
        </View>
      )}
      
      {/* AI Rationale */}
      {(meal.aiRationale || context) && (
        <View style={styles.mealRationale}>
          <Text style={styles.rationaleText}>{meal.aiRationale || context}</Text>
        </View>
      )}
      
      {/* Implementation Tips - for dialing in macros */}
      {meal.staffNote && meal.staffNote.includes('needed:') && (
        <View style={{
          backgroundColor: '#fef3c7',
          padding: 10,
          borderRadius: 4,
          marginBottom: 6,
          borderLeftWidth: 3,
          borderLeftColor: '#d97706',
        }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#92400e', marginBottom: 4 }}>
            HOW TO HIT YOUR TARGETS:
          </Text>
          {meal.staffNote.split('\n').filter(Boolean).map((tip, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 2, paddingLeft: 4 }}>
              <Text style={{ fontSize: 8, color: '#92400e', marginRight: 4 }}>-</Text>
              <Text style={{ fontSize: 8, color: '#78350f', flex: 1 }}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Staff/Coach Note (if not implementation tips) */}
      {meal.staffNote && !meal.staffNote.includes('needed:') && (
        <View style={{
          backgroundColor: '#dbeafe',
          padding: 8,
          borderRadius: 4,
          marginBottom: 6,
          borderLeftWidth: 3,
          borderLeftColor: '#2563eb',
        }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e40af', marginBottom: 2 }}>
            COACH NOTE:
          </Text>
          <Text style={{ fontSize: 8, color: '#1e40af' }}>
            {meal.staffNote}
          </Text>
        </View>
      )}
      
      {/* Ingredients Section */}
      <View style={styles.ingredientsList}>
        <Text style={styles.ingredientsTitle}>INGREDIENTS:</Text>
        {meal.ingredients && meal.ingredients.length > 0 ? (
          meal.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientItem}>
              <Text style={styles.ingredientBullet}>•</Text>
              <Text style={styles.ingredientText}>
                {ing.amount ? `${ing.amount} ` : ''}{ing.item || 'Ingredient'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 8, color: COLORS.gray, fontStyle: 'italic' }}>
            See app for detailed ingredient list
          </Text>
        )}
      </View>
      
      {/* Instructions Section */}
      <View style={styles.instructionsList}>
        <Text style={styles.instructionsTitle}>INSTRUCTIONS:</Text>
        {meal.instructions && meal.instructions.length > 0 ? (
          meal.instructions.map((inst, idx) => (
            <View key={idx} style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>{idx + 1}.</Text>
              <Text style={styles.instructionText}>{inst}</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 8, color: COLORS.gray, fontStyle: 'italic' }}>
            Prepare according to recipe - see app for detailed instructions
          </Text>
        )}
      </View>
    </View>
  );
};

// Helper functions
const getGoalLabel = (goalType?: string) => {
  switch (goalType) {
    case 'lose_fat': 
    case 'fat_loss': 
      return 'Fat Loss';
    case 'gain_muscle': 
    case 'muscle_gain': 
      return 'Muscle Gain';
    case 'maintain': 
    case 'maintenance': 
      return 'Maintenance';
    case 'recomposition': 
    case 'recomp': 
      return 'Recomposition';
    case 'performance': 
      return 'Performance';
    case 'health': 
      return 'Health Focus';
    case 'other': 
      return 'Custom Goal';
    default: 
      return 'Maintenance';
  }
};

const getCommitmentLabel = (commitment?: string) => {
  switch (commitment) {
    case 'fully_committed': return 'Fully Committed';
    case 'moderately_committed': return 'Moderately Committed';
    case 'limited_commitment': return 'Limited Commitment';
    default: return 'Not specified';
  }
};

// Calculate FMI and FFMI
const calculateIndices = (weightLbs: number, bodyFatPct: number, heightCm: number) => {
  const weightKg = weightLbs * 0.453592;
  const fatMassKg = weightKg * (bodyFatPct / 100);
  const ffmKg = weightKg - fatMassKg;
  const heightM = heightCm / 100;
  const fmi = fatMassKg / (heightM * heightM);
  const ffmi = ffmKg / (heightM * heightM);
  return { fmi: fmi.toFixed(1), ffmi: ffmi.toFixed(1), fatMassLbs: (fatMassKg * 2.20462).toFixed(1), ffmLbs: (ffmKg * 2.20462).toFixed(1) };
};

// Main PDF Document Component
interface MealPlanPDFProps {
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;
  dietPreferences: Partial<DietPreferences>;
  weeklySchedule: Partial<WeeklySchedule>;
  nutritionTargets: DayNutritionTargets[];
  mealPlan: WeeklyMealPlan;
  groceryList: Record<string, { name: string; totalAmount: string }[]>;
  logoUrl?: string; // Optional high-resolution logo URL
}

export const MealPlanPDF = ({
  userProfile,
  bodyCompGoals,
  dietPreferences,
  weeklySchedule,
  nutritionTargets,
  mealPlan,
  groceryList,
  logoUrl,
}: MealPlanPDFProps) => {
  // Calculate averages
  const avgCalories = nutritionTargets.length > 0 
    ? nutritionTargets.reduce((sum, t) => sum + t.targetCalories, 0) / nutritionTargets.length 
    : 0;
  const avgProtein = nutritionTargets.length > 0 
    ? nutritionTargets.reduce((sum, t) => sum + t.protein, 0) / nutritionTargets.length 
    : 0;
  const avgCarbs = nutritionTargets.length > 0 
    ? nutritionTargets.reduce((sum, t) => sum + t.carbs, 0) / nutritionTargets.length 
    : 0;
  const avgFat = nutritionTargets.length > 0 
    ? nutritionTargets.reduce((sum, t) => sum + t.fat, 0) / nutritionTargets.length 
    : 0;
  
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Calculate body composition metrics
  const currentMetrics = userProfile.weightLbs && userProfile.bodyFatPercentage && userProfile.heightCm
    ? calculateIndices(userProfile.weightLbs, userProfile.bodyFatPercentage, userProfile.heightCm)
    : null;
  
  // Get workout days
  const workoutDays = DAYS_ORDER.filter(day => {
    const daySchedule = weeklySchedule[day];
    return daySchedule?.workouts && daySchedule.workouts.some(w => w.enabled);
  });
  
  return (
    <Document>
      {/* ====== COVER PAGE ====== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          {logoUrl ? (
            <Image 
              src={logoUrl} 
              style={{ 
                width: 220, 
                height: 'auto', 
                marginBottom: 25,
              }} 
            />
          ) : (
            <Text style={styles.coverLogo}>FITOMICS</Text>
          )}
          <Text style={styles.coverTitle}>PERSONALIZED</Text>
          <Text style={styles.coverTitle}>NUTRITION STRATEGY</Text>
          <Text style={styles.coverSubtitle}>Evidence-Based • Individualized • Results-Driven</Text>
          
          <View style={styles.coverInfo}>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Prepared For</Text>
              <Text style={[styles.coverInfoValue, { fontSize: 14 }]}>{userProfile.name || 'Client'}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Date Generated</Text>
              <Text style={styles.coverInfoValue}>{today}</Text>
            </View>
            {bodyCompGoals.phaseName && (
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Phase</Text>
                <Text style={[styles.coverInfoValue, { color: COLORS.darkGold }]}>
                  {bodyCompGoals.phaseName}
                </Text>
              </View>
            )}
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Primary Goal</Text>
              <Text style={[styles.coverInfoValue, { color: COLORS.darkGold }]}>
                {getGoalLabel(bodyCompGoals.goalType)}
              </Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Duration</Text>
              <Text style={styles.coverInfoValue}>{bodyCompGoals.timelineWeeks || 12} weeks</Text>
            </View>
            {bodyCompGoals.phaseStartDate && bodyCompGoals.phaseEndDate && (
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Period</Text>
                <Text style={styles.coverInfoValue}>
                  {new Date(bodyCompGoals.phaseStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(bodyCompGoals.phaseEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}
            
            <View style={styles.coverDivider}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: COLORS.navy, marginBottom: 8 }}>
                DAILY NUTRITION TARGETS
              </Text>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Calories</Text>
                <Text style={styles.coverInfoValue}>{Math.round(avgCalories)} kcal/day</Text>
              </View>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Protein</Text>
                <Text style={styles.coverInfoValue}>{Math.round(avgProtein)}g ({Math.round(avgProtein * 4 / avgCalories * 100)}%)</Text>
              </View>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Carbohydrates</Text>
                <Text style={styles.coverInfoValue}>{Math.round(avgCarbs)}g ({Math.round(avgCarbs * 4 / avgCalories * 100)}%)</Text>
              </View>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Fat</Text>
                <Text style={styles.coverInfoValue}>{Math.round(avgFat)}g ({Math.round(avgFat * 9 / avgCalories * 100)}%)</Text>
              </View>
            </View>
          </View>
          
          <Text style={{ fontSize: 8, color: COLORS.gray, textAlign: 'center' }}>
            This nutrition strategy has been designed based on your individual profile,{'\n'}
            goals, preferences, and lifestyle factors.
          </Text>
        </View>
        <Footer />
      </Page>

      {/* ====== CLIENT PROFILE PAGE ====== */}
      <Page size="A4" style={styles.page}>
        <Header title="Client Profile Summary" />
        <Text style={styles.sectionTitle}>YOUR PROFILE & GOALS</Text>
        
        <View style={styles.twoColumn}>
          {/* Left Column - Demographics & Body Composition */}
          <View style={styles.column}>
            <Text style={styles.sectionSubtitle}>Demographics</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{userProfile.age || '-'} years</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{userProfile.gender || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Height</Text>
                <Text style={styles.infoValue}>{userProfile.heightFt}'{userProfile.heightIn}" ({userProfile.heightCm?.toFixed(0)} cm)</Text>
              </View>
            </View>
            
            <Text style={styles.sectionSubtitle}>Current Body Composition</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Weight</Text>
                <Text style={styles.infoValue}>{userProfile.weightLbs} lbs ({userProfile.weightKg?.toFixed(1)} kg)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Body Fat</Text>
                <Text style={styles.infoValue}>{Number(userProfile.bodyFatPercentage).toFixed(1)}%</Text>
              </View>
              {currentMetrics && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fat Mass</Text>
                    <Text style={styles.infoValue}>{currentMetrics.fatMassLbs} lbs</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Lean Mass</Text>
                    <Text style={styles.infoValue}>{currentMetrics.ffmLbs} lbs</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>FMI / FFMI</Text>
                    <Text style={styles.infoValue}>{currentMetrics.fmi} / {currentMetrics.ffmi}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
          
          {/* Right Column - Goals & Context */}
          <View style={styles.column}>
            <Text style={styles.sectionSubtitle}>Goals & Targets</Text>
            <View style={[styles.infoBox, { borderLeftWidth: 3, borderLeftColor: COLORS.darkGold }]}>
              {bodyCompGoals.phaseName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phase</Text>
                  <Text style={[styles.infoValue, { color: COLORS.darkGold, fontWeight: 'bold' }]}>{bodyCompGoals.phaseName}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Primary Goal</Text>
                <Text style={[styles.infoValue, { color: COLORS.darkGold }]}>{getGoalLabel(bodyCompGoals.goalType)}</Text>
              </View>
              {bodyCompGoals.targetWeightLbs && bodyCompGoals.targetWeightLbs > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Target Weight</Text>
                  <Text style={styles.infoValue}>{Math.round(bodyCompGoals.targetWeightLbs)} lbs</Text>
                </View>
              )}
              {bodyCompGoals.targetBodyFat && bodyCompGoals.targetBodyFat > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Target Body Fat</Text>
                  <Text style={styles.infoValue}>{Number(bodyCompGoals.targetBodyFat).toFixed(1)}%</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{bodyCompGoals.timelineWeeks || 12} weeks</Text>
              </View>
              {bodyCompGoals.phaseStartDate && bodyCompGoals.phaseEndDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Period</Text>
                  <Text style={styles.infoValue}>
                    {new Date(bodyCompGoals.phaseStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(bodyCompGoals.phaseEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
              {bodyCompGoals.weeklyWeightChange !== undefined && bodyCompGoals.weeklyWeightChange !== 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Weekly Change</Text>
                  <Text style={styles.infoValue}>{bodyCompGoals.weeklyWeightChange > 0 ? '+' : ''}{Number(bodyCompGoals.weeklyWeightChange).toFixed(2)} lbs/wk</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.sectionSubtitle}>Commitment Assessment</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lifestyle</Text>
                <Text style={styles.infoValue}>{getCommitmentLabel(bodyCompGoals.lifestyleCommitment)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tracking</Text>
                <Text style={styles.infoValue}>{bodyCompGoals.trackingCommitment === 'committed_tracking' ? 'Will Track' : 'Intuitive'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Performance Priority</Text>
                <Text style={styles.infoValue}>{bodyCompGoals.performancePriority === 'performance_priority' ? 'Performance' : 'Body Comp'}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Strategy Rationale */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Strategy Rationale</Text>
          <Text style={styles.highlightText}>
            Based on your {getGoalLabel(bodyCompGoals.goalType).toLowerCase()} goal, current body composition, 
            and {getCommitmentLabel(bodyCompGoals.lifestyleCommitment).toLowerCase()} commitment level, 
            this plan is designed with a {bodyCompGoals.goalType === 'lose_fat' ? 'caloric deficit' : bodyCompGoals.goalType === 'gain_muscle' ? 'caloric surplus' : 'balanced intake'} approach.
            {bodyCompGoals.goalType === 'lose_fat' && ' Protein is prioritized to preserve lean mass during the deficit.'}
            {bodyCompGoals.goalType === 'gain_muscle' && ' Protein and calories are optimized to support muscle protein synthesis.'}
            Daily targets adjust between workout and rest days to match your energy needs.
          </Text>
        </View>
        
        <Footer />
      </Page>

      {/* ====== SCHEDULE & LIFESTYLE PAGE ====== */}
      <Page size="A4" style={styles.page}>
        <Header title="Schedule & Lifestyle" />
        <Text style={styles.sectionTitle}>YOUR WEEKLY SCHEDULE</Text>
        
        <Text style={styles.sectionSubtitle}>Workout Schedule ({workoutDays.length} days/week)</Text>
        <View style={styles.tagRow}>
          {workoutDays.length > 0 ? workoutDays.map(day => (
            <Tag key={day} text={day} />
          )) : <Text style={styles.bodyText}>No workout days configured</Text>}
        </View>
        
        <Text style={styles.sectionSubtitle}>Daily Schedule Overview</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Day</Text>
            <Text style={styles.tableHeaderCell}>Wake</Text>
            <Text style={styles.tableHeaderCell}>Sleep</Text>
            <Text style={styles.tableHeaderCell}>Meals</Text>
            <Text style={styles.tableHeaderCell}>Workout</Text>
            <Text style={styles.tableHeaderCell}>TDEE</Text>
          </View>
          {DAYS_ORDER.map((day, idx) => {
            const daySchedule = weeklySchedule[day];
            const targets = nutritionTargets.find(t => t.day === day);
            const hasWorkout = daySchedule?.workouts?.some(w => w.enabled);
            return (
              <View key={day} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 1.2, fontWeight: 'bold' }]}>{day.substring(0, 3)}</Text>
                <Text style={styles.tableCell}>{daySchedule?.wakeTime || '-'}</Text>
                <Text style={styles.tableCell}>{daySchedule?.sleepTime || '-'}</Text>
                <Text style={styles.tableCell}>{daySchedule?.mealCount || 3}M + {daySchedule?.snackCount || 2}S</Text>
                <Text style={styles.tableCell}>{hasWorkout ? 'Yes' : '-'}</Text>
                <Text style={styles.tableCell}>{targets?.tdee ? Math.round(targets.tdee) : '-'}</Text>
              </View>
            );
          })}
        </View>
        
        {/* Diet Preferences Summary */}
        <Text style={styles.sectionTitle}>DIET PREFERENCES</Text>
        
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            {dietPreferences.dietaryRestrictions && dietPreferences.dietaryRestrictions.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Dietary Restrictions</Text>
                <View style={styles.tagRow}>
                  {dietPreferences.dietaryRestrictions.map((r, i) => <Tag key={i} text={r} />)}
                </View>
              </>
            )}
            
            {dietPreferences.preferredProteins && dietPreferences.preferredProteins.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Preferred Proteins</Text>
                <View style={styles.tagRow}>
                  {dietPreferences.preferredProteins.slice(0, 8).map((p, i) => <Tag key={i} text={p} />)}
                  {dietPreferences.preferredProteins.length > 8 && <Tag text={`+${dietPreferences.preferredProteins.length - 8} more`} />}
                </View>
              </>
            )}
            
            {dietPreferences.cuisinePreferences && dietPreferences.cuisinePreferences.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Cuisine Preferences</Text>
                <View style={styles.tagRow}>
                  {dietPreferences.cuisinePreferences.map((c, i) => <Tag key={i} text={c} />)}
                </View>
              </>
            )}
          </View>
          
          <View style={styles.column}>
            {dietPreferences.foodsToAvoid && dietPreferences.foodsToAvoid.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Foods to Avoid</Text>
                <View style={styles.tagRow}>
                  {dietPreferences.foodsToAvoid.slice(0, 6).map((f, i) => <Tag key={i} text={f} />)}
                  {dietPreferences.foodsToAvoid.length > 6 && <Tag text={`+${dietPreferences.foodsToAvoid.length - 6} more`} />}
                </View>
              </>
            )}
            
            {dietPreferences.foodsToEmphasize && dietPreferences.foodsToEmphasize.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Foods to Emphasize</Text>
                <View style={styles.tagRow}>
                  {dietPreferences.foodsToEmphasize.slice(0, 6).map((f, i) => <Tag key={i} text={f} />)}
                  {dietPreferences.foodsToEmphasize.length > 6 && <Tag text={`+${dietPreferences.foodsToEmphasize.length - 6} more`} />}
                </View>
              </>
            )}
            
            <Text style={styles.sectionSubtitle}>Meal Prep Style</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Home Cooking</Text>
                <Text style={styles.infoValue}>{dietPreferences.homeCookingInterest || 'Medium'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cooking Time</Text>
                <Text style={styles.infoValue}>{dietPreferences.cookingTimePreference || 'Moderate'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Budget</Text>
                <Text style={styles.infoValue}>{dietPreferences.budgetPreference || 'Moderate'}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <Footer />
      </Page>

      {/* ====== NUTRITION TARGETS PAGE ====== */}
      <Page size="A4" style={styles.page}>
        <Header title="Nutrition Targets" />
        <Text style={styles.sectionTitle}>DAILY NUTRITION TARGETS</Text>
        
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>How These Targets Were Calculated</Text>
          <Text style={styles.highlightText}>
            Your targets are based on your Resting Metabolic Rate (RMR), activity level, workout schedule, 
            and {getGoalLabel(bodyCompGoals.goalType).toLowerCase()} goal. Workout days have higher calorie 
            and carbohydrate targets to fuel training and recovery.
          </Text>
        </View>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Day</Text>
            <Text style={styles.tableHeaderCell}>TDEE</Text>
            <Text style={styles.tableHeaderCell}>Target Cal</Text>
            <Text style={styles.tableHeaderCell}>Deficit/Surplus</Text>
            <Text style={styles.tableHeaderCell}>Protein</Text>
            <Text style={styles.tableHeaderCell}>Carbs</Text>
            <Text style={styles.tableHeaderCell}>Fat</Text>
          </View>
          {DAYS_ORDER.map((day, idx) => {
            const targets = nutritionTargets.find(t => t.day === day);
            const diff = targets ? Math.round(targets.targetCalories - targets.tdee) : 0;
            return (
              <View key={day} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 1.2, fontWeight: 'bold' }]}>
                  {day.substring(0, 3)} {targets?.isWorkoutDay ? '*' : ''}
                </Text>
                <Text style={styles.tableCell}>{targets?.tdee ? Math.round(targets.tdee) : '-'}</Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{targets?.targetCalories ? Math.round(targets.targetCalories) : '-'}</Text>
                <Text style={[styles.tableCell, { color: diff < 0 ? '#ef4444' : diff > 0 ? '#22c55e' : COLORS.gray }]}>
                  {diff > 0 ? '+' : ''}{diff}
                </Text>
                <Text style={styles.tableCell}>{targets?.protein ? Math.round(targets.protein) : '-'}g</Text>
                <Text style={styles.tableCell}>{targets?.carbs ? Math.round(targets.carbs) : '-'}g</Text>
                <Text style={styles.tableCell}>{targets?.fat ? Math.round(targets.fat) : '-'}g</Text>
              </View>
            );
          })}
        </View>
        
        <Text style={styles.sectionSubtitle}>Weekly Summary</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Average Daily Calories</Text>
            <Text style={styles.infoValue}>{Math.round(avgCalories)} kcal</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weekly Calorie Total</Text>
            <Text style={styles.infoValue}>{Math.round(avgCalories * 7)} kcal</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Protein (daily avg)</Text>
            <Text style={styles.infoValue}>{Math.round(avgProtein)}g ({(avgProtein / ((userProfile.weightLbs || 1) * 0.453592)).toFixed(1)}g/kg)</Text>
          </View>
        </View>
        
        {/* Actual vs Target Comparison */}
        <Text style={styles.sectionSubtitle}>Meal Plan Accuracy</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Day</Text>
            <Text style={styles.tableHeaderCell}>Target</Text>
            <Text style={styles.tableHeaderCell}>Actual</Text>
            <Text style={styles.tableHeaderCell}>Variance</Text>
            <Text style={styles.tableHeaderCell}>Status</Text>
          </View>
          {DAYS_ORDER.map((day, idx) => {
            const targets = nutritionTargets.find(t => t.day === day);
            const dayPlan = mealPlan[day];
            const actualCal = dayPlan?.dailyTotals?.calories || 0;
            const variance = targets ? actualCal - targets.targetCalories : 0;
            const variancePct = targets ? Math.abs(variance / targets.targetCalories * 100) : 0;
            const isGood = variancePct <= 5;
            
            return (
              <View key={day} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 1.2, fontWeight: 'bold' }]}>{day.substring(0, 3)}</Text>
                <Text style={styles.tableCell}>{targets?.targetCalories || '-'}</Text>
                <Text style={styles.tableCell}>{Math.round(actualCal)}</Text>
                <Text style={[styles.tableCell, { color: Math.abs(variance) > 100 ? '#ef4444' : COLORS.gray }]}>
                  {variance > 0 ? '+' : ''}{Math.round(variance)}
                </Text>
                <Text style={[styles.tableCell, { color: isGood ? '#22c55e' : '#f59e0b' }]}>
                  {isGood ? '✓ On Target' : '~ Close'}
                </Text>
              </View>
            );
          })}
        </View>
        
        <Footer />
      </Page>

      {/* ====== DAILY MEAL PLAN PAGES ====== */}
      {DAYS_ORDER.map(day => {
        const dayPlan = mealPlan[day];
        if (!dayPlan) return null;
        
        const targets = nutritionTargets.find(t => t.day === day);
        const daySchedule = weeklySchedule[day];
        let mealNum = 0;
        let snackNum = 0;
        
        // Generate context for meals based on schedule
        const getMealContext = (meal: Meal, index: number) => {
          if (targets?.isWorkoutDay && index === 0) {
            return "Higher carbs to fuel your workout later today";
          }
          if (targets?.isWorkoutDay && meal.time && meal.time.includes('PM')) {
            return "Post-workout nutrition to support recovery and muscle protein synthesis";
          }
          if (meal.type === 'snack') {
            return "Strategic snack to maintain energy levels and hit daily protein targets";
          }
          if (index === dayPlan.meals.length - 1) {
            return "Evening meal balanced to complete daily macro targets";
          }
          return null;
        };
        
        return (
          <Page key={day} size="A4" style={styles.page}>
            <Header title={`${day} Meal Plan`} />
            <Text style={styles.sectionTitle}>{day.toUpperCase()} {targets?.isWorkoutDay ? '(WORKOUT DAY)' : '(REST DAY)'}</Text>
            
            {/* Day Summary */}
            <View style={styles.infoBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.darkBlue }}>{Math.round(dayPlan.dailyTotals.calories)}</Text>
                  <Text style={{ fontSize: 8, color: COLORS.gray }}>Calories</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.darkBlue }}>{Math.round(dayPlan.dailyTotals.protein)}g</Text>
                  <Text style={{ fontSize: 8, color: COLORS.gray }}>Protein</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.darkBlue }}>{Math.round(dayPlan.dailyTotals.carbs)}g</Text>
                  <Text style={{ fontSize: 8, color: COLORS.gray }}>Carbs</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.darkBlue }}>{Math.round(dayPlan.dailyTotals.fat)}g</Text>
                  <Text style={{ fontSize: 8, color: COLORS.gray }}>Fat</Text>
                </View>
              </View>
              {daySchedule?.wakeTime && daySchedule?.sleepTime && (
                <Text style={{ fontSize: 8, color: COLORS.gray, textAlign: 'center', marginTop: 8 }}>
                  Wake: {daySchedule.wakeTime} • Sleep: {daySchedule.sleepTime}
                </Text>
              )}
            </View>
            
            {/* Meals */}
            {dayPlan.meals.filter(meal => meal !== null && meal !== undefined).map((meal, idx) => {
              if (meal.type === 'meal') {
                mealNum++;
                return <MealCard key={idx} meal={meal} mealNumber={mealNum} context={getMealContext(meal, idx) || undefined} />;
              } else {
                snackNum++;
                return <MealCard key={idx} meal={meal} mealNumber={snackNum} context={getMealContext(meal, idx) || undefined} />;
              }
            })}
            
            <Footer />
          </Page>
        );
      })}

      {/* ====== GROCERY LIST PAGE ====== */}
      <Page size="A4" style={styles.page}>
        <Header title="Grocery List" />
        <Text style={styles.sectionTitle}>CONSOLIDATED GROCERY LIST</Text>
        
        <Text style={styles.bodyText}>
          This list consolidates all ingredients needed for the full week. Quantities are combined 
          and rounded up to practical shopping amounts.
        </Text>
        
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            {Object.entries(groceryList).slice(0, Math.ceil(Object.keys(groceryList).length / 2)).map(([category, items]) => {
              if (!items || items.length === 0) return null;
              
              const categoryLabels: Record<string, string> = {
                protein: 'PROTEINS',
                carbs: 'CARBOHYDRATES',
                fats: 'FATS & OILS',
                vegetables: 'VEGETABLES',
                fruits: 'FRUITS',
                dairy: 'DAIRY',
                seasonings: 'SEASONINGS',
                other: 'OTHER',
              };
              
              return (
                <View key={category} style={styles.grocerySection}>
                  <Text style={styles.groceryCategory}>{categoryLabels[category] || category.toUpperCase()}</Text>
                  {items.map((item, idx) => (
                    <View key={idx} style={styles.groceryItem}>
                      <Text style={styles.groceryItemName}>[ ] {item.name}</Text>
                      <Text style={styles.groceryItemAmount}>{item.totalAmount}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
          
          <View style={styles.column}>
            {Object.entries(groceryList).slice(Math.ceil(Object.keys(groceryList).length / 2)).map(([category, items]) => {
              if (!items || items.length === 0) return null;
              
              const categoryLabels: Record<string, string> = {
                protein: 'PROTEINS',
                carbs: 'CARBOHYDRATES',
                fats: 'FATS & OILS',
                vegetables: 'VEGETABLES',
                fruits: 'FRUITS',
                dairy: 'DAIRY',
                seasonings: 'SEASONINGS',
                other: 'OTHER',
              };
              
              return (
                <View key={category} style={styles.grocerySection}>
                  <Text style={styles.groceryCategory}>{categoryLabels[category] || category.toUpperCase()}</Text>
                  {items.map((item, idx) => (
                    <View key={idx} style={styles.groceryItem}>
                      <Text style={styles.groceryItemName}>[ ] {item.name}</Text>
                      <Text style={styles.groceryItemAmount}>{item.totalAmount}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </View>
        
        <Footer />
      </Page>
    </Document>
  );
};

export default MealPlanPDF;
