import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
});

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
    fontFamily: 'Inter',
    backgroundColor: COLORS.white,
  },
  header: {
    marginBottom: 25,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gold,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  macroBox: {
    width: '18%',
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.gold,
  },
  macroLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  timingRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timingItemSpacer: {
    marginRight: 20,
  },
  timingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timingText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 10,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginRight: 8,
    marginTop: 4,
  },
  ingredientText: {
    fontSize: 10,
    color: COLORS.text,
    flex: 1,
  },
  ingredientAmount: {
    fontWeight: 600,
    color: COLORS.primary,
  },
  ingredientNotes: {
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 10,
  },
  instructionNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 10,
  },
  instructionText: {
    fontSize: 10,
    color: COLORS.text,
    flex: 1,
    lineHeight: 1.4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingLeft: 10,
  },
  tipBullet: {
    fontSize: 10,
    color: COLORS.gold,
    marginRight: 6,
  },
  tipText: {
    fontSize: 9,
    color: COLORS.muted,
    flex: 1,
  },
  substitutionBox: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginBottom: 6,
  },
  substitutionText: {
    fontSize: 9,
    color: COLORS.text,
  },
  substitutionArrow: {
    color: COLORS.gold,
    fontWeight: 600,
  },
  substitutionReason: {
    fontSize: 8,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  highlightBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 8,
    color: COLORS.white,
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
  contextRow: {
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

interface Meal {
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

interface MealPDFProps {
  meal: Meal;
  context: {
    mealType: string;
    mealTime: string;
    location: string;
    cuisine: string;
    mealStyle: string;
    prepComplexity: string;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const MealPDF: React.FC<MealPDFProps> = ({ meal, context }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{meal.name}</Text>
        <Text style={styles.subtitle}>{meal.description}</Text>
      </View>

      {/* Context Badges */}
      <View style={styles.contextRow}>
        <View style={styles.contextBadge}>
          <Text style={styles.contextText}>
            {context.mealType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        {context.cuisine !== 'Any' && (
          <View style={styles.contextBadge}>
            <Text style={styles.contextText}>{context.cuisine}</Text>
          </View>
        )}
        <View style={styles.contextBadge}>
          <Text style={styles.contextText}>
            {context.mealStyle.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        <View style={styles.contextBadge}>
          <Text style={styles.contextText}>@ {context.mealTime}</Text>
        </View>
      </View>

      {/* Macros */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Facts</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{meal.calories}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{meal.protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{meal.carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{meal.fat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{meal.fiber}g</Text>
            <Text style={styles.macroLabel}>Fiber</Text>
          </View>
        </View>

        <View style={styles.timingRow}>
          <View style={styles.timingItem}>
            <Text style={styles.timingText}>Prep: {meal.prepTime} min</Text>
          </View>
          <View style={styles.timingItem}>
            <Text style={styles.timingText}>Cook: {meal.cookTime} min</Text>
          </View>
          <View style={styles.timingItem}>
            <Text style={styles.timingText}>Total: {meal.prepTime + meal.cookTime} min</Text>
          </View>
        </View>
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {meal.ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredientItem}>
            <View style={styles.ingredientBullet} />
            <Text style={styles.ingredientText}>
              <Text style={styles.ingredientAmount}>{ing.amount}</Text> {ing.item}
              {ing.notes && <Text style={styles.ingredientNotes}> ({ing.notes})</Text>}
            </Text>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {meal.instructions.map((inst, i) => (
          <View key={i} style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>{i + 1}</Text>
            <Text style={styles.instructionText}>{inst}</Text>
          </View>
        ))}
      </View>

      {/* Tips */}
      {meal.tips && meal.tips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Tips</Text>
          {meal.tips.map((tip, i) => (
            <View key={i} style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Substitutions */}
      {meal.substitutions && meal.substitutions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Substitutions</Text>
          {meal.substitutions.map((sub, i) => (
            <View key={i} style={styles.substitutionBox}>
              <Text style={styles.substitutionText}>
                {sub.original} <Text style={styles.substitutionArrow}>→</Text> {sub.substitute}
              </Text>
              <Text style={styles.substitutionReason}>{sub.reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Nutrition Highlights */}
      {meal.nutritionHighlights && meal.nutritionHighlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Highlights</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {meal.nutritionHighlights.map((highlight, i) => (
              <View key={i} style={styles.highlightBadge}>
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
    const { meal, context, targets } = body;

    const pdfBuffer = await renderToBuffer(
      React.createElement(MealPDF, { meal, context, targets })
    );

    const filename = meal.name.replace(/\s+/g, '-').toLowerCase();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
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
