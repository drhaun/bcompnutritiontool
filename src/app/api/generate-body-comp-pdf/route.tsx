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
  Svg,
  Rect,
  Line,
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
  blue: '#3b82f6',
  purple: '#8b5cf6',
  fatMass: '#ef4444',
  leanMass: '#22c55e',
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
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '23%',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: COLORS.gold,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 3,
  },
  // Body composition visual
  compChart: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  compBarContainer: {
    flex: 1,
    marginRight: 20,
  },
  compLegend: {
    width: 120,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 9,
    color: COLORS.text,
  },
  legendValue: {
    fontSize: 9,
    color: COLORS.muted,
    marginLeft: 'auto',
  },
  // Goals comparison
  goalsComparison: {
    flexDirection: 'row',
    gap: 15,
  },
  goalColumn: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 8,
  },
  goalColumnTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 9,
    color: COLORS.muted,
  },
  goalValue: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: 600,
  },
  changeArrow: {
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  arrowText: {
    fontSize: 24,
    color: COLORS.gold,
  },
  // Timeline table
  timelineTable: {
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
    fontSize: 8,
    color: COLORS.white,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.text,
  },
  // Macro targets
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroBox: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.gold,
  },
  macroUnit: {
    fontSize: 10,
    color: COLORS.gold,
  },
  macroLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 3,
  },
  // TDEE breakdown
  tdeeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  tdeeBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    alignItems: 'center',
  },
  tdeeValue: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary,
  },
  tdeeLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 2,
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
    paddingTop: 12,
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
  // Phase info box
  phaseBox: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
  },
  phaseTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.gold,
    marginBottom: 6,
  },
  phaseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  phaseDetail: {
    flexDirection: 'row',
  },
  phaseDetailLabel: {
    fontSize: 9,
    color: COLORS.lightMuted,
  },
  phaseDetailValue: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: 600,
    marginLeft: 4,
  },
  // Metric indices
  indexRow: {
    flexDirection: 'row',
    gap: 10,
  },
  indexBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  indexTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 6,
  },
  indexValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  indexLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  indexValue: {
    fontSize: 8,
    color: COLORS.text,
    fontWeight: 600,
  },
});

interface BodyCompPDFProps {
  clientName: string;
  currentStats: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    bodyFat: number;
    fatMass: number;
    leanMass: number;
    bmi: number;
    fmi: number;
    ffmi: number;
  };
  targetStats: {
    weight: number;
    bodyFat: number;
    fatMass: number;
    leanMass: number;
    fmi: number;
    ffmi: number;
  };
  metabolicData: {
    rmr: number;
    neat: number;
    tef: number;
    eee: number;
    tdee: number;
  };
  phase: {
    goalType: string;
    durationWeeks: number;
    weeklyChange: number;
    startDate: string;
  };
  projections: Array<{
    week: number;
    weight: number;
    bodyFat: number;
    fatMass: number;
    leanMass: number;
  }>;
  startingTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
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

const BodyCompPDF: React.FC<BodyCompPDFProps & { logoSrc: string | null }> = ({ 
  clientName, 
  currentStats, 
  targetStats,
  metabolicData,
  phase,
  projections,
  startingTargets,
  logoSrc,
}) => {
  const goalTypeLabel = {
    lose_fat: 'Fat Loss',
    gain_muscle: 'Muscle Building',
    maintain: 'Maintenance',
    recomp: 'Body Recomposition',
  }[phase.goalType] || phase.goalType;

  const fatPercent = (currentStats.fatMass / currentStats.weight) * 100;
  const leanPercent = 100 - fatPercent;
  
  // Calculate bar widths for composition visual
  const barWidth = 300;
  const fatBarWidth = (fatPercent / 100) * barWidth;
  const leanBarWidth = barWidth - fatBarWidth;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Body Composition Analysis</Text>
            <Text style={styles.subtitle}>Comprehensive assessment with personalized recommendations</Text>
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

        {/* Phase Overview */}
        <View style={styles.phaseBox}>
          <Text style={styles.phaseTitle}>{goalTypeLabel} Phase Plan</Text>
          <View style={styles.phaseDetails}>
            <View style={styles.phaseDetail}>
              <Text style={styles.phaseDetailLabel}>Duration:</Text>
              <Text style={styles.phaseDetailValue}>{phase.durationWeeks} weeks</Text>
            </View>
            <View style={styles.phaseDetail}>
              <Text style={styles.phaseDetailLabel}>Weekly Rate:</Text>
              <Text style={styles.phaseDetailValue}>{Math.abs(phase.weeklyChange).toFixed(2)} lbs/week</Text>
            </View>
            <View style={styles.phaseDetail}>
              <Text style={styles.phaseDetailLabel}>Start Date:</Text>
              <Text style={styles.phaseDetailValue}>{phase.startDate}</Text>
            </View>
          </View>
        </View>

        {/* Current Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Body Composition</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{currentStats.weight.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Weight (lbs)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{currentStats.bodyFat.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Body Fat</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{currentStats.fatMass.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Fat Mass (lbs)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{currentStats.leanMass.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Lean Mass (lbs)</Text>
            </View>
          </View>
          
          {/* Body Composition Visual */}
          <View style={styles.compChart}>
            <View style={styles.compBarContainer}>
              <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 8 }}>Body Composition Breakdown</Text>
              <Svg width={barWidth} height={30}>
                <Rect x="0" y="0" width={fatBarWidth} height="30" fill={COLORS.fatMass} rx="4" />
                <Rect x={fatBarWidth} y="0" width={leanBarWidth} height="30" fill={COLORS.leanMass} rx="4" />
              </Svg>
            </View>
            <View style={styles.compLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.fatMass }]} />
                <Text style={styles.legendText}>Fat Mass</Text>
                <Text style={styles.legendValue}>{fatPercent.toFixed(1)}%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.leanMass }]} />
                <Text style={styles.legendText}>Lean Mass</Text>
                <Text style={styles.legendValue}>{leanPercent.toFixed(1)}%</Text>
              </View>
            </View>
          </View>

          {/* Body Composition Indices */}
          <View style={styles.indexRow}>
            <View style={styles.indexBox}>
              <Text style={styles.indexTitle}>Body Mass Index (BMI)</Text>
              <View style={styles.indexValueRow}>
                <Text style={styles.indexLabel}>Current:</Text>
                <Text style={styles.indexValue}>{currentStats.bmi.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.indexBox}>
              <Text style={styles.indexTitle}>Fat Mass Index (FMI)</Text>
              <View style={styles.indexValueRow}>
                <Text style={styles.indexLabel}>Current:</Text>
                <Text style={styles.indexValue}>{currentStats.fmi.toFixed(1)}</Text>
              </View>
              <View style={styles.indexValueRow}>
                <Text style={styles.indexLabel}>Target:</Text>
                <Text style={styles.indexValue}>{targetStats.fmi.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.indexBox}>
              <Text style={styles.indexTitle}>Fat-Free Mass Index (FFMI)</Text>
              <View style={styles.indexValueRow}>
                <Text style={styles.indexLabel}>Current:</Text>
                <Text style={styles.indexValue}>{currentStats.ffmi.toFixed(1)}</Text>
              </View>
              <View style={styles.indexValueRow}>
                <Text style={styles.indexLabel}>Target:</Text>
                <Text style={styles.indexValue}>{targetStats.ffmi.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Goals Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transformation Goals</Text>
          <View style={styles.goalsComparison}>
            <View style={styles.goalColumn}>
              <Text style={styles.goalColumnTitle}>CURRENT</Text>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Weight</Text>
                <Text style={styles.goalValue}>{currentStats.weight.toFixed(0)} lbs</Text>
              </View>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Body Fat</Text>
                <Text style={styles.goalValue}>{currentStats.bodyFat.toFixed(1)}%</Text>
              </View>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Fat Mass</Text>
                <Text style={styles.goalValue}>{currentStats.fatMass.toFixed(1)} lbs</Text>
              </View>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Lean Mass</Text>
                <Text style={styles.goalValue}>{currentStats.leanMass.toFixed(1)} lbs</Text>
              </View>
            </View>
            <View style={styles.changeArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
            <View style={styles.goalColumn}>
              <Text style={styles.goalColumnTitle}>TARGET</Text>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Weight</Text>
                <Text style={[styles.goalValue, { color: COLORS.gold }]}>{targetStats.weight.toFixed(0)} lbs</Text>
              </View>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Body Fat</Text>
                <Text style={[styles.goalValue, { color: COLORS.gold }]}>{targetStats.bodyFat.toFixed(1)}%</Text>
              </View>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Fat Mass</Text>
                <Text style={[styles.goalValue, { color: COLORS.gold }]}>{targetStats.fatMass.toFixed(1)} lbs</Text>
              </View>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Lean Mass</Text>
                <Text style={[styles.goalValue, { color: COLORS.gold }]}>{targetStats.leanMass.toFixed(1)} lbs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Metabolic Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metabolic Assessment</Text>
          <View style={styles.tdeeContainer}>
            <View style={styles.tdeeBox}>
              <Text style={styles.tdeeValue}>{metabolicData.rmr}</Text>
              <Text style={styles.tdeeLabel}>RMR (Resting Metabolic Rate)</Text>
            </View>
            <View style={styles.tdeeBox}>
              <Text style={styles.tdeeValue}>{metabolicData.neat}</Text>
              <Text style={styles.tdeeLabel}>NEAT (Non-Exercise Activity)</Text>
            </View>
            <View style={styles.tdeeBox}>
              <Text style={styles.tdeeValue}>{metabolicData.tef}</Text>
              <Text style={styles.tdeeLabel}>TEF (Thermic Effect of Food)</Text>
            </View>
            <View style={styles.tdeeBox}>
              <Text style={styles.tdeeValue}>{metabolicData.eee}</Text>
              <Text style={styles.tdeeLabel}>EEE (Exercise Energy)</Text>
            </View>
            <View style={[styles.tdeeBox, { backgroundColor: COLORS.gold }]}>
              <Text style={[styles.tdeeValue, { color: COLORS.white }]}>{metabolicData.tdee}</Text>
              <Text style={[styles.tdeeLabel, { color: COLORS.white }]}>TDEE (Total Daily)</Text>
            </View>
          </View>
        </View>

        {/* Projection Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Projections</Text>
          <View style={styles.timelineTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Week</Text>
              <Text style={[styles.tableHeaderCell, { width: '22%', textAlign: 'center' }]}>Weight (lbs)</Text>
              <Text style={[styles.tableHeaderCell, { width: '22%', textAlign: 'center' }]}>Body Fat %</Text>
              <Text style={[styles.tableHeaderCell, { width: '22%', textAlign: 'center' }]}>Fat Mass</Text>
              <Text style={[styles.tableHeaderCell, { width: '22%', textAlign: 'center' }]}>Lean Mass</Text>
            </View>
            {projections.slice(0, 8).map((proj, index) => (
              <View key={proj.week} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { width: '12%', fontWeight: 600 }]}>
                  {proj.week === 0 ? 'Start' : `Week ${proj.week}`}
                </Text>
                <Text style={[styles.tableCell, { width: '22%', textAlign: 'center' }]}>{proj.weight.toFixed(1)}</Text>
                <Text style={[styles.tableCell, { width: '22%', textAlign: 'center' }]}>{proj.bodyFat.toFixed(1)}%</Text>
                <Text style={[styles.tableCell, { width: '22%', textAlign: 'center' }]}>{proj.fatMass.toFixed(1)}</Text>
                <Text style={[styles.tableCell, { width: '22%', textAlign: 'center' }]}>{proj.leanMass.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Starting Nutrition Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Starting Nutrition Targets</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{startingTargets.calories}</Text>
              <Text style={styles.macroLabel}>CALORIES / DAY</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{startingTargets.protein}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>PROTEIN</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{startingTargets.carbs}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>CARBS</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{startingTargets.fat}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>FAT</Text>
            </View>
          </View>
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
    const { 
      clientName, 
      currentStats, 
      targetStats,
      metabolicData,
      phase,
      projections,
      startingTargets,
    } = body;

    // Get logo as base64
    const logoSrc = getLogoBase64();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(BodyCompPDF, { 
        clientName, 
        currentStats, 
        targetStats,
        metabolicData,
        phase,
        projections,
        startingTargets,
        logoSrc,
      }) as any
    );

    const fileName = clientName 
      ? `${clientName.replace(/\s+/g, '-')}-body-composition-report.pdf`
      : 'body-composition-report.pdf';

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
