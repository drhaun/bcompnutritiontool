import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import * as fs from 'fs';
import * as path from 'path';

const COLORS = {
  primary: '#00263d',
  gold: '#c19962',
  lightGold: '#e4ac61',
  text: '#1a1a1a',
  muted: '#666666',
  lightMuted: '#999999',
  background: '#f8f9fa',
  white: '#ffffff',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: COLORS.white,
    fontFamily: 'Helvetica',
  },
  // Header with logo
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 160,
    height: 39,  // Maintains 4.1:1 aspect ratio of original image (1409x344)
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.muted,
  },
  clientBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clientName: {
    fontSize: 11,
    color: COLORS.gold,
    fontWeight: 600,
  },
  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
  },
  // Phase Summary
  phaseSummaryContainer: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
  },
  phaseRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 10,
    color: COLORS.muted,
    width: 120,
  },
  phaseValue: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: 600,
    flex: 1,
  },
  // Goals section
  goalsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  goalBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: COLORS.gold,
  },
  goalValue: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 2,
  },
  goalLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'center',
  },
  goalChange: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: 600,
  },
  // Macro targets
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  macroBox: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.gold,
  },
  macroUnit: {
    fontSize: 12,
    color: COLORS.gold,
  },
  macroLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
  },
  macroDetail: {
    fontSize: 8,
    color: COLORS.lightMuted,
    marginTop: 2,
  },
  // Day breakdown table
  tableContainer: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderCell: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
  },
  workoutBadge: {
    backgroundColor: COLORS.gold,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  workoutBadgeText: {
    fontSize: 7,
    color: COLORS.white,
    fontWeight: 600,
  },
  restBadge: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  restBadgeText: {
    fontSize: 7,
    color: COLORS.muted,
  },
  // Info box
  infoBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 6,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.muted,
  },
  footerBrand: {
    fontSize: 8,
    color: COLORS.gold,
    fontWeight: 600,
  },
  // Two column layout
  twoColumn: {
    flexDirection: 'row',
    gap: 15,
  },
  column: {
    flex: 1,
  },
  // Timeline
  timelineBox: {
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timelineLabel: {
    fontSize: 9,
    color: COLORS.muted,
  },
  timelineValue: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: 600,
  },
});

interface PhaseTargetsPDFProps {
  clientName: string;
  phase: {
    name: string;
    goalType: string;
    startDate: string;
    endDate: string;
    durationWeeks: number;
    weeklyChange: number;
  };
  currentStats: {
    weight: number;
    bodyFat: number;
    fatMass: number;
    leanMass: number;
    tdee: number;
  };
  targetStats: {
    weight: number;
    bodyFat: number;
    fatMass: number;
    leanMass: number;
  };
  averageTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dayTargets: Array<{
    day: string;
    isWorkout: boolean;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  notes?: string;
}

// Read logo from file system and convert to base64
function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'fitomics_horizontal_gold.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading logo:', error);
    return null;
  }
}

const PhaseTargetsPDF: React.FC<PhaseTargetsPDFProps & { logoSrc: string | null }> = ({ 
  clientName, 
  phase, 
  currentStats, 
  targetStats, 
  averageTargets,
  dayTargets,
  notes,
  logoSrc,
}) => {
  const weightChange = targetStats.weight - currentStats.weight;
  const bfChange = targetStats.bodyFat - currentStats.bodyFat;
  
  const goalTypeLabel = {
    lose_fat: 'Fat Loss Phase',
    gain_muscle: 'Muscle Building Phase',
    maintain: 'Maintenance Phase',
    recomp: 'Body Recomposition',
  }[phase.goalType] || phase.goalType;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Nutrition Phase Plan</Text>
            <Text style={styles.subtitle}>Personalized nutrition targets designed for optimal results</Text>
            {clientName && (
              <View style={styles.clientBadge}>
                <Text style={styles.clientName}>Prepared for: {clientName}</Text>
              </View>
            )}
          </View>
          {logoSrc && (
            <Image src={logoSrc} style={styles.logo} />
          )}
        </View>

        {/* Phase Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase Overview</Text>
          <View style={styles.phaseSummaryContainer}>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase Type:</Text>
              <Text style={styles.phaseValue}>{goalTypeLabel}</Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Duration:</Text>
              <Text style={styles.phaseValue}>{phase.durationWeeks} weeks</Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Start Date:</Text>
              <Text style={styles.phaseValue}>{phase.startDate}</Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Target End Date:</Text>
              <Text style={styles.phaseValue}>{phase.endDate}</Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Weekly Rate:</Text>
              <Text style={styles.phaseValue}>{Math.abs(phase.weeklyChange).toFixed(2)} lbs/week</Text>
            </View>
          </View>
        </View>

        {/* Goals - Current vs Target */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Composition Goals</Text>
          <View style={styles.goalsContainer}>
            <View style={styles.goalBox}>
              <Text style={styles.goalValue}>{currentStats.weight.toFixed(0)}</Text>
              <Text style={styles.goalLabel}>Current Weight (lbs)</Text>
            </View>
            <View style={styles.goalBox}>
              <Text style={styles.goalValue}>{targetStats.weight.toFixed(0)}</Text>
              <Text style={styles.goalLabel}>Target Weight (lbs)</Text>
              <Text style={[styles.goalChange, { color: weightChange < 0 ? COLORS.success : weightChange > 0 ? '#3b82f6' : COLORS.muted }]}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
              </Text>
            </View>
            <View style={styles.goalBox}>
              <Text style={styles.goalValue}>{currentStats.bodyFat.toFixed(1)}%</Text>
              <Text style={styles.goalLabel}>Current Body Fat</Text>
            </View>
            <View style={styles.goalBox}>
              <Text style={styles.goalValue}>{targetStats.bodyFat.toFixed(1)}%</Text>
              <Text style={styles.goalLabel}>Target Body Fat</Text>
              <Text style={[styles.goalChange, { color: bfChange < 0 ? COLORS.success : bfChange > 0 ? COLORS.warning : COLORS.muted }]}>
                {bfChange > 0 ? '+' : ''}{bfChange.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Nutrition Targets (Average) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average Daily Nutrition Targets</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{averageTargets.calories}</Text>
              <Text style={styles.macroLabel}>CALORIES</Text>
              <Text style={styles.macroDetail}>kcal/day</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{averageTargets.protein}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>PROTEIN</Text>
              <Text style={styles.macroDetail}>{((averageTargets.protein * 4 / averageTargets.calories) * 100).toFixed(0)}% of calories</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{averageTargets.carbs}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>CARBS</Text>
              <Text style={styles.macroDetail}>{((averageTargets.carbs * 4 / averageTargets.calories) * 100).toFixed(0)}% of calories</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{averageTargets.fat}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>FAT</Text>
              <Text style={styles.macroDetail}>{((averageTargets.fat * 9 / averageTargets.calories) * 100).toFixed(0)}% of calories</Text>
            </View>
          </View>
        </View>

        {/* Day-by-Day Targets Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Target Breakdown</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Day</Text>
              <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'center' }]}>Calories</Text>
              <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'center' }]}>Protein</Text>
              <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'center' }]}>Carbs</Text>
              <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'center' }]}>Fat</Text>
            </View>
            {dayTargets.map((day, index) => (
              <View key={day.day} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { width: '18%', fontWeight: 600 }]}>{day.day}</Text>
                <View style={{ width: '14%' }}>
                  {day.isWorkout ? (
                    <View style={styles.workoutBadge}>
                      <Text style={styles.workoutBadgeText}>WORKOUT</Text>
                    </View>
                  ) : (
                    <View style={styles.restBadge}>
                      <Text style={styles.restBadgeText}>REST</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tableCell, { width: '17%', textAlign: 'center' }]}>{day.calories}</Text>
                <Text style={[styles.tableCell, { width: '17%', textAlign: 'center' }]}>{day.protein}g</Text>
                <Text style={[styles.tableCell, { width: '17%', textAlign: 'center' }]}>{day.carbs}g</Text>
                <Text style={[styles.tableCell, { width: '17%', textAlign: 'center' }]}>{day.fat}g</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Important Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Important Information</Text>
          <Text style={styles.infoText}>
            These nutrition targets are designed as starting recommendations based on your individual profile, 
            goals, and activity level. Adjustments may be needed based on your progress, energy levels, and 
            how your body responds. Track your progress weekly and communicate with your coach for optimal results.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.footerBrand}>Powered by Fitomics Nutrition Planning OS</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, phase, currentStats, targetStats, averageTargets, dayTargets, notes } = body;

    // Get logo as base64
    const logoSrc = getLogoBase64();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(PhaseTargetsPDF, { 
        clientName, 
        phase, 
        currentStats, 
        targetStats, 
        averageTargets,
        dayTargets,
        notes,
        logoSrc,
      }) as any
    );

    const fileName = clientName 
      ? `${clientName.replace(/\s+/g, '-')}-nutrition-phase-plan.pdf`
      : 'nutrition-phase-plan.pdf';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
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
