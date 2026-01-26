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
  green: '#16a34a',
  red: '#dc2626',
  yellow: '#ca8a04',
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
    marginBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.muted,
  },
  section: {
    marginBottom: 18,
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
  scoreBox: {
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.gold,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  macroBox: {
    width: '18%',
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary,
  },
  macroLabel: {
    fontSize: 7,
    color: COLORS.muted,
  },
  issueRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
  issueName: {
    fontSize: 9,
    fontWeight: 600,
    color: COLORS.primary,
    width: '40%',
  },
  issueValue: {
    fontSize: 9,
    color: COLORS.text,
    width: '30%',
  },
  issuePercent: {
    fontSize: 9,
    fontWeight: 600,
    width: '30%',
    textAlign: 'right',
  },
  deficient: {
    color: COLORS.red,
  },
  excess: {
    color: COLORS.yellow,
  },
  optimal: {
    color: COLORS.green,
  },
  commentsBox: {
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  commentsText: {
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  aiBox: {
    padding: 12,
    backgroundColor: '#f3e8ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#9333ea',
  },
  aiText: {
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  mealCard: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.primary,
  },
  mealMacros: {
    fontSize: 8,
    color: COLORS.muted,
  },
  mealFoods: {
    fontSize: 8,
    color: COLORS.text,
  },
  ratioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginBottom: 4,
  },
  ratioName: {
    fontSize: 9,
    color: COLORS.primary,
  },
  ratioValue: {
    fontSize: 9,
    fontWeight: 600,
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
  twoColumn: {
    flexDirection: 'row',
  },
  column: {
    width: '48%',
  },
  columnSpacer: {
    width: '4%',
  },
});

interface NutritionPDFProps {
  analysis: any;
  targets: any;
  coachComments: string;
  aiRecommendations: string;
  sampleDayPlan: any;
}

const NutritionPDF: React.FC<NutritionPDFProps> = ({ 
  analysis, 
  targets, 
  coachComments, 
  aiRecommendations, 
  sampleDayPlan 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Analysis Report</Text>
        <Text style={styles.subtitle}>
          Comprehensive dietary assessment by Fitomics
        </Text>
      </View>

      {/* Score & Summary */}
      <View style={styles.section}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreValue}>{analysis.summary.overallScore}/100</Text>
          <Text style={styles.scoreLabel}>Overall Nutrition Score ({analysis.summary.daysAnalyzed} days analyzed)</Text>
        </View>

        <View style={styles.macroRow}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{analysis.summary.totalCalories}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{analysis.summary.totalProtein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{analysis.summary.totalCarbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{analysis.summary.totalFat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{analysis.summary.totalFiber}g</Text>
            <Text style={styles.macroLabel}>Fiber</Text>
          </View>
        </View>
      </View>

      {/* Two Column Layout for Issues */}
      <View style={styles.twoColumn}>
        {/* Deficiencies Column */}
        <View style={styles.column}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrients Below Target</Text>
            {analysis.deficiencies.length === 0 ? (
              <Text style={{ fontSize: 9, color: COLORS.green }}>No significant deficiencies</Text>
            ) : (
              analysis.deficiencies.slice(0, 8).map((d: any, i: number) => (
                <View key={i} style={styles.issueRow}>
                  <Text style={styles.issueName}>{d.nutrient}</Text>
                  <Text style={styles.issueValue}>{d.actual} {d.unit}</Text>
                  <Text style={[styles.issuePercent, styles.deficient]}>{d.percentage}%</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.columnSpacer} />

        {/* Excesses Column */}
        <View style={styles.column}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrients Above Target</Text>
            {analysis.excesses.length === 0 ? (
              <Text style={{ fontSize: 9, color: COLORS.green }}>No excessive intakes</Text>
            ) : (
              analysis.excesses.slice(0, 8).map((e: any, i: number) => (
                <View key={i} style={styles.issueRow}>
                  <Text style={styles.issueName}>{e.nutrient}</Text>
                  <Text style={styles.issueValue}>{e.actual} {e.unit}</Text>
                  <Text style={[styles.issuePercent, styles.excess]}>{e.percentage}%</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* Nutrient Ratios */}
      {analysis.ratios && analysis.ratios.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrient Ratios</Text>
          {analysis.ratios.map((r: any, i: number) => (
            <View key={i} style={styles.ratioRow}>
              <Text style={styles.ratioName}>{r.name}</Text>
              <Text style={[
                styles.ratioValue,
                r.status === 'optimal' ? styles.optimal : r.status === 'suboptimal' ? styles.excess : styles.deficient
              ]}>
                {r.ratio}:1 ({r.status})
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Coach Comments */}
      {coachComments && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coach Notes</Text>
          <View style={styles.commentsBox}>
            <Text style={styles.commentsText}>{coachComments}</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by Fitomics Nutrition Planning OS • {new Date().toLocaleDateString()}
      </Text>
    </Page>

    {/* Page 2: AI Recommendations & Sample Day */}
    {(aiRecommendations || sampleDayPlan) && (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>AI-Powered Recommendations</Text>
          <Text style={styles.subtitle}>Personalized insights based on your nutrition analysis</Text>
        </View>

        {/* AI Recommendations */}
        {aiRecommendations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
            <View style={styles.aiBox}>
              <Text style={styles.aiText}>{aiRecommendations}</Text>
            </View>
          </View>
        )}

        {/* Sample Day Plan */}
        {sampleDayPlan && sampleDayPlan.meals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optimized Sample Day</Text>
            {sampleDayPlan.meals.map((meal: any, i: number) => (
              <View key={i} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealMacros}>
                    {meal.calories} cal | {meal.protein}g P | {meal.carbs}g C | {meal.fat}g F
                  </Text>
                </View>
                {meal.foods && (
                  <Text style={styles.mealFoods}>{meal.foods.join(', ')}</Text>
                )}
              </View>
            ))}
            
            {sampleDayPlan.totals && (
              <View style={[styles.mealCard, { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.mealName, { textAlign: 'center' }]}>
                  Daily Total: {sampleDayPlan.totals.calories} cal | {sampleDayPlan.totals.protein}g P | {sampleDayPlan.totals.carbs}g C | {sampleDayPlan.totals.fat}g F
                </Text>
              </View>
            )}

            {sampleDayPlan.keyNutrients && sampleDayPlan.keyNutrients.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: COLORS.muted }}>
                  Key nutrients addressed: {sampleDayPlan.keyNutrients.join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Fitomics Nutrition Planning OS • {new Date().toLocaleDateString()}
        </Text>
      </Page>
    )}
  </Document>
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis, targets, coachComments, aiRecommendations, sampleDayPlan } = body;

    const pdfBuffer = await renderToBuffer(
      React.createElement(NutritionPDF, { 
        analysis, 
        targets, 
        coachComments: coachComments || '', 
        aiRecommendations: aiRecommendations || '', 
        sampleDayPlan 
      })
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="nutrition-analysis-report.pdf"',
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
