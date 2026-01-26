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
  blue: '#2563eb',
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
    width: '30%',
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.blue,
  },
  macroLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  strategyBox: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  strategyTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.primary,
    marginBottom: 6,
  },
  strategyItem: {
    fontSize: 9,
    color: COLORS.text,
    marginBottom: 3,
    paddingLeft: 8,
  },
  recipeCard: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },
  recipeTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.primary,
    marginBottom: 4,
  },
  recipeContent: {
    flexDirection: 'row',
  },
  recipeColumn: {
    width: '50%',
  },
  recipeLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: COLORS.gold,
    marginBottom: 3,
  },
  recipeItem: {
    fontSize: 8,
    color: COLORS.text,
    marginBottom: 2,
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
  inputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  inputBox: {
    width: '33%',
    padding: 6,
  },
  inputLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  inputValue: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.primary,
  },
  electrolytesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  electrolyteBox: {
    width: '50%',
    padding: 6,
  },
  electrolyteName: {
    fontSize: 9,
    fontWeight: 600,
    color: COLORS.primary,
  },
  electrolyteValue: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.gold,
  },
  electrolyteRange: {
    fontSize: 7,
    color: COLORS.muted,
  },
});

interface HydrationPDFProps {
  results: {
    sweatRate: number;
    totalFluidLoss: number;
    sodiumLoss: number;
    during15min: number;
    during20min: number;
    postMinimum: number;
    postOptimal: number;
    dailyBaseNeeds: number;
    electrolytes: Array<{
      name: string;
      symbol: string;
      amount: number;
      rangeMin: number;
      rangeMax: number;
      unit: string;
    }>;
    temperatureImpact: string;
    humidityImpact: string;
    calculationMethod: string;
  };
  inputs: {
    weightKg: number;
    durationMinutes: number;
    exerciseType: string;
    intensity: string;
    tempC: number;
    humidity: number;
    altitude: number;
    clothing: string;
    acclimatization: string;
  };
  measurementSystem: 'metric' | 'imperial';
}

const lToOz = (l: number) => Math.round(l * 33.814);
const mlToOz = (ml: number) => Math.round(ml * 0.033814);

const HydrationPDF: React.FC<HydrationPDFProps> = ({ results, inputs, measurementSystem }) => {
  const isMetric = measurementSystem === 'metric';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Personalized Hydration Plan</Text>
          <Text style={styles.subtitle}>
            Science-backed hydration strategy by Fitomics
          </Text>
        </View>

        {/* Inputs Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Profile</Text>
          <View style={styles.inputsRow}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Body Weight</Text>
              <Text style={styles.inputValue}>
                {isMetric ? `${inputs.weightKg} kg` : `${Math.round(inputs.weightKg * 2.205)} lbs`}
              </Text>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Duration</Text>
              <Text style={styles.inputValue}>{inputs.durationMinutes} min</Text>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Exercise Type</Text>
              <Text style={styles.inputValue}>{inputs.exerciseType}</Text>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Intensity</Text>
              <Text style={styles.inputValue}>{inputs.intensity}</Text>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Temperature</Text>
              <Text style={styles.inputValue}>
                {isMetric ? `${inputs.tempC}°C` : `${Math.round(inputs.tempC * 9/5 + 32)}°F`}
              </Text>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Humidity</Text>
              <Text style={styles.inputValue}>{inputs.humidity}%</Text>
            </View>
          </View>
        </View>

        {/* Key Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Hydration Needs</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>
                {isMetric ? `${results.sweatRate} L/hr` : `${lToOz(results.sweatRate)} oz/hr`}
              </Text>
              <Text style={styles.macroLabel}>Sweat Rate</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>
                {isMetric ? `${results.totalFluidLoss} L` : `${lToOz(results.totalFluidLoss)} oz`}
              </Text>
              <Text style={styles.macroLabel}>Total Fluid Loss</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{results.sodiumLoss} mg</Text>
              <Text style={styles.macroLabel}>Sodium Loss</Text>
            </View>
          </View>
        </View>

        {/* Hydration Strategy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Hydration Strategy</Text>
          
          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>Pre-Workout (2 hours before)</Text>
            <Text style={styles.strategyItem}>• Drink {isMetric ? '400-600 mL' : '14-20 fl oz'} of water</Text>
            <Text style={styles.strategyItem}>• Have a small salty snack</Text>
            <Text style={styles.strategyItem}>• Check urine color - aim for pale yellow</Text>
          </View>

          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>During Exercise</Text>
            <Text style={styles.strategyItem}>
              • Every 15 min: {isMetric ? `${results.during15min} mL` : `${mlToOz(results.during15min)} fl oz`}
            </Text>
            <Text style={styles.strategyItem}>
              • Every 20 min: {isMetric ? `${results.during20min} mL` : `${mlToOz(results.during20min)} fl oz`}
            </Text>
            <Text style={styles.strategyItem}>• Keep fluids cool (15-22°C / 59-72°F)</Text>
            {inputs.durationMinutes > 60 && (
              <Text style={styles.strategyItem}>• Use electrolyte drink for this duration</Text>
            )}
          </View>

          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>Post-Workout Recovery</Text>
            <Text style={styles.strategyItem}>
              • Target: {isMetric ? `${results.postOptimal} mL` : `${mlToOz(results.postOptimal)} fl oz`} over 2-4 hours
            </Text>
            <Text style={styles.strategyItem}>• Include sodium-rich foods</Text>
            <Text style={styles.strategyItem}>• Pair with carbs and protein</Text>
          </View>
        </View>

        {/* Electrolyte Losses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Electrolyte Losses to Replace</Text>
          <View style={styles.electrolytesGrid}>
            {results.electrolytes.slice(0, 4).map((e, i) => (
              <View key={i} style={styles.electrolyteBox}>
                <Text style={styles.electrolyteName}>{e.name}</Text>
                <Text style={styles.electrolyteValue}>{e.amount} {e.unit}</Text>
                <Text style={styles.electrolyteRange}>Range: {e.rangeMin}-{e.rangeMax} {e.unit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* DIY Recipe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DIY Electrolyte Drink Recipe</Text>
          <View style={styles.recipeCard}>
            <Text style={styles.recipeTitle}>Basic Electrolyte Water (per 1 liter)</Text>
            <View style={styles.recipeContent}>
              <View style={styles.recipeColumn}>
                <Text style={styles.recipeLabel}>Ingredients:</Text>
                <Text style={styles.recipeItem}>• 1 liter water</Text>
                <Text style={styles.recipeItem}>• 1/4 tsp sea salt (~600mg Na)</Text>
                <Text style={styles.recipeItem}>• 1/4 tsp lite salt (~350mg K)</Text>
                <Text style={styles.recipeItem}>• Squeeze of lemon</Text>
              </View>
              <View style={styles.recipeColumn}>
                <Text style={styles.recipeLabel}>For 60+ min workouts, add:</Text>
                <Text style={styles.recipeItem}>• 3 tbsp honey or maple syrup</Text>
                <Text style={styles.recipeItem}>• 2 tbsp fresh citrus juice</Text>
                <Text style={styles.recipeItem}>(Provides ~45g carbs, 180 cal)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Fitomics Nutrition Planning OS • {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results, inputs, measurementSystem } = body;

    const pdfBuffer = await renderToBuffer(
      React.createElement(HydrationPDF, { results, inputs, measurementSystem })
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="hydration-plan.pdf"',
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
