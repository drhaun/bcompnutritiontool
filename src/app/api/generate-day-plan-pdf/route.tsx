import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const COLORS = {
  primary: '#00263d',
  gold: '#c19962',
  lightGold: '#e4ac61',
  text: '#1a1a1a',
  muted: '#666666',
  background: '#f8f9fa',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: COLORS.white,
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gold,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  macroBox: {
    width: '23%',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.gold,
  },
  macroLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  mealCard: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTime: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: 600,
  },
  mealName: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.primary,
  },
  mealMacros: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 10,
    color: COLORS.text,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  ingredientsTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.primary,
    marginBottom: 5,
  },
  ingredient: {
    fontSize: 9,
    color: COLORS.text,
    marginBottom: 2,
    paddingLeft: 10,
  },
  instructionsTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.primary,
    marginTop: 10,
    marginBottom: 5,
  },
  instruction: {
    fontSize: 9,
    color: COLORS.text,
    marginBottom: 2,
    paddingLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: COLORS.muted,
  },
  dayContext: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  contextBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  contextText: {
    fontSize: 9,
    color: COLORS.white,
  },
});

interface DayPlanPDFProps {
  clientName: string;
  targets: { calories: number; protein: number; carbs: number; fat: number };
  dayContext: {
    dayType: string;
    workoutTiming: string;
    workoutType: string;
    wakeTime: string;
    sleepTime: string;
  };
  plan: {
    meals: Array<{
      slot: { time: string; type: string };
      meal: {
        name: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        ingredients: string[];
        instructions: string[];
      };
    }>;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
}

const DayPlanPDF: React.FC<DayPlanPDFProps> = ({ clientName, targets, dayContext, plan }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {clientName ? `${clientName}'s Nutrition Plan` : 'Daily Nutrition Plan'}
        </Text>
        <Text style={styles.subtitle}>
          Personalized meal plan designed by Fitomics
        </Text>
      </View>

      {/* Day Context */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Day Overview</Text>
        <View style={styles.dayContext}>
          <View style={styles.contextBadge}>
            <Text style={styles.contextText}>
              {dayContext.dayType === 'workout' ? 'Workout Day' : 'Rest Day'}
            </Text>
          </View>
          {dayContext.dayType === 'workout' && (
            <View style={styles.contextBadge}>
              <Text style={styles.contextText}>
                {dayContext.workoutTiming} - {dayContext.workoutType}
              </Text>
            </View>
          )}
          <View style={styles.contextBadge}>
            <Text style={styles.contextText}>
              Wake: {dayContext.wakeTime} | Sleep: {dayContext.sleepTime}
            </Text>
          </View>
        </View>
      </View>

      {/* Macro Targets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Targets</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{plan.totalCalories}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{plan.totalProtein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{plan.totalCarbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{plan.totalFat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* Meals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Plan</Text>
        {plan.meals.map((item, index) => (
          <View key={index} style={styles.mealCard} wrap={false}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTime}>{item.slot.time}</Text>
              <Text style={styles.mealMacros}>
                {item.meal.calories} cal | {item.meal.protein}g P | {item.meal.carbs}g C | {item.meal.fat}g F
              </Text>
            </View>
            <Text style={styles.mealName}>{item.meal.name}</Text>
            {item.meal.description && (
              <Text style={styles.mealDescription}>{item.meal.description}</Text>
            )}
            
            <Text style={styles.ingredientsTitle}>Ingredients:</Text>
            {item.meal.ingredients.map((ing, i) => (
              <Text key={i} style={styles.ingredient}>• {ing}</Text>
            ))}
            
            {item.meal.instructions && item.meal.instructions.length > 0 && (
              <View>
                <Text style={styles.instructionsTitle}>Instructions:</Text>
                {item.meal.instructions.map((inst, i) => (
                  <Text key={i} style={styles.instruction}>{i + 1}. {inst}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by Fitomics Nutrition Planning OS • {new Date().toLocaleDateString()}
      </Text>
    </Page>
  </Document>
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, targets, dayContext, plan } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(DayPlanPDF, { clientName, targets, dayContext, plan }) as any
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${clientName || 'day'}-nutrition-plan.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
