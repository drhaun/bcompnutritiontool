# Body Composition Calculator — Feature & Technical Specification

> **Purpose:** This document describes the standalone Body Composition Calculator tool in enough detail that it can be recreated in another application.

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Interface Layout](#2-user-interface-layout)
3. [Inputs](#3-inputs)
4. [Calculated Metrics](#4-calculated-metrics)
5. [Goal Configuration](#5-goal-configuration)
6. [Projection Engine](#6-projection-engine)
7. [Health Risk Visualization](#7-health-risk-visualization)
8. [Nutrition Target Estimation](#8-nutrition-target-estimation)
9. [Explore Mode](#9-explore-mode)
10. [PDF Export](#10-pdf-export)
11. [Formulas Reference](#11-formulas-reference)
12. [Constants & Evidence Base](#12-constants--evidence-base)

---

## 1. Overview

The Body Composition Calculator is a standalone tool (accessible at `/tools/body-composition`) that allows a coach or client to:

- Enter current body measurements and see calculated body composition indices (BMI, FMI, FFMI)
- See where they rank against population percentile data
- Set a goal (fat loss, muscle gain, or recomposition) with configurable rate presets
- Choose a target via multiple input methods (body fat %, FMI, FFMI, fat mass, or lean mass)
- View week-by-week projections as a graph or table
- See mortality risk curves based on FMI and FFMI research
- Get estimated starting nutrition targets (calories, protein, carbs, fat)
- Explore hypothetical body composition scenarios ("What if I had X lbs of fat and Y lbs of muscle?")
- Export a branded PDF report with all data

It is **completely self-contained** — no database, no AI, no authentication. All calculations happen client-side in the browser.

---

## 2. User Interface Layout

The page is organized as a **scrolling single-column layout** with numbered sections:

```
┌────────────────────────────────────────────┐
│ Header: "Body Composition Calculator"       │
│ Subtitle + Export PDF button               │
├────────────────────────────────────────────┤
│ [1] Current Stats (inputs)                 │
│     ├─ Demographics row                    │
│     ├─ Measurements row                    │
│     ├─ Derived metrics display             │
│     ├─ Population Percentile Rankings      │
│     └─ Mortality Risk Curves (FMI + FFMI)  │
├────────────────────────────────────────────┤
│ [2] Goal Configuration                     │
│     ├─ Phase type selector                 │
│     ├─ Target method + value               │
│     ├─ Rate presets or custom rate         │
│     ├─ Feasibility assessment              │
│     └─ Summary (current → projected)       │
├────────────────────────────────────────────┤
│ [3] Projected Timeline                     │
│     ├─ Graph view (SVG) or Table view      │
│     ├─ Variable selector for graph         │
│     ├─ Confidence intervals toggle         │
│     └─ Hover tooltips on data points       │
├────────────────────────────────────────────┤
│ [4] Starting Nutrition Targets             │
│     ├─ Calories, Protein, Carbs, Fat       │
│     ├─ TDEE breakdown                      │
│     └─ Metabolism inputs (RMR, NEAT, etc.) │
└────────────────────────────────────────────┘
```

---

## 3. Inputs

### 3.1 Demographics & Measurements

| Input | Type | Default | Range/Options |
|-------|------|---------|---------------|
| Gender | Select | Male | Male, Female |
| Age | Number | 35 | — |
| Height (ft) | Number | 5 | — |
| Height (in) | Number | 10 | 0-11 |
| Current Weight (lbs) | Number | 200 | — |
| Current Body Fat (%) | Slider + Number | 20 | 3-50 |

### 3.2 Metabolism Inputs

| Input | Type | Default | Options |
|-------|------|---------|---------|
| RMR Source | Select | Estimated | Estimated (Mifflin-St Jeor), Measured |
| Measured RMR | Number (if measured) | 1800 | — |
| NEAT Level | Select | Light | Sedentary, Light, Moderate, Active, Very Active |
| TEF (%) | Number | 10 | Thermic Effect of Food as % of RMR |
| Exercise Energy (kcal/session) | Number | 300 | — |
| Workouts per Week | Number | 4 | — |

### 3.3 Goal Inputs

| Input | Type | Default | Options |
|-------|------|---------|---------|
| Phase Type | Select | Fat Loss | Fat Loss, Muscle Gain, Recomposition |
| Target Method | Select | Body Fat % | Body Fat %, FMI, FFMI, Fat Mass (lbs), Lean Mass (lbs) |
| Target Value | Number | Varies by method | — |
| Rate Preset | Select | Moderate | Per-goal presets (see §5.2) |
| Custom Rate toggle | Switch | Off | Enables manual % BW/week entry |
| Start Date | Date picker | Today | — |
| Protein Level | Select | High | Low, Moderate, High, Very High |
| Training Level | Select | Moderate | None, Light, Moderate, Intense |
| Recomp Experience | Select (if recomp) | Intermediate | Untrained, Novice, Intermediate, Advanced |

---

## 4. Calculated Metrics

All derived from the inputs in real-time (no submit button needed):

### 4.1 Body Composition

| Metric | Formula | Unit |
|--------|---------|------|
| Fat Mass | `weight × (bodyFat% / 100)` | lbs |
| Fat-Free Mass (FFM) | `weight − fatMass` | lbs |
| BMI | `weightKg / (heightM)²` | kg/m² |
| FMI (Fat Mass Index) | `fatMassKg / (heightM)²` | kg/m² |
| FFMI (Fat-Free Mass Index) | `ffmKg / (heightM)²` | kg/m² |

### 4.2 Population Percentile Rankings

**Body Fat Percentile** (lower BF = higher leanness percentile):

| Percentile | Male BF% |
|-----------|----------|
| 95th (very lean) | 6% |
| 90th | 8% |
| 75th | 12% |
| 50th (average) | 18% |
| 25th | 24% |
| 10th | 30% |
| 5th | 35% |

Source: NHANES (CDC/NCHS), 2017-2020

**FFMI Percentile** (higher FFMI = higher percentile):

| Percentile | FFMI |
|-----------|------|
| 5th | 16.0 |
| 10th | 17.0 |
| 25th | 18.5 |
| 50th | 20.0 |
| 75th | 21.5 |
| 90th | 23.0 |
| 95th | 24.5 |

Source: Schutz Y, Kyle UU, Pichard C. *Int J Obes*. 2002;26(7):953-960

Interpolation between data points is linear.

### 4.3 Benchmark Labels

**FFMI Benchmarks:**

| FFMI Range | Label |
|-----------|-------|
| < 18 | Below Average |
| 18-20 | Average |
| 20-22 | Above Average |
| 22-24 | Excellent |
| 24-26 | Superior |
| 26+ | Elite |

**FMI Benchmarks:**

| FMI Range | Label |
|----------|-------|
| 0-3 | Essential |
| 3-6 | Athletic |
| 6-9 | Fitness |
| 9-13 | Average |
| 13+ | Above Average |

---

## 5. Goal Configuration

### 5.1 Phase Types

| Phase | Description |
|-------|-------------|
| **Fat Loss** | Caloric deficit to reduce fat mass. Some FFM loss expected (configurable ratio). |
| **Muscle Gain** | Caloric surplus to gain FFM. Some fat gain expected (configurable ratio). |
| **Recomposition** | Simultaneous fat loss and muscle gain at maintenance calories. No rate slider — uses experience-based expectations. |

### 5.2 Rate Presets

**Fat Loss:**

| Preset | Rate (% BW/week) | FFM Loss Ratio | Description |
|--------|------------------|----------------|-------------|
| Conservative | 0.50% | 10% | Max muscle retention |
| Moderate | 0.75% | 15% | Balanced approach |
| Aggressive | 1.00% | 25% | Faster results |
| Very Aggressive | 1.25% | 35% | Contest prep |

FFM Loss Ratio = proportion of total weight loss that comes from lean mass (rest is fat).

**Muscle Gain:**

| Preset | Rate (% BW/week) | Fat Gain Ratio | Description |
|--------|------------------|----------------|-------------|
| Lean Gain | 0.25% | 30% | Minimal fat gain |
| Moderate | 0.50% | 45% | Balanced approach |
| Aggressive | 0.75% | 55% | Faster muscle |
| Max Gain | 1.00% | 65% | Beginner bulk |

Fat Gain Ratio = proportion of total weight gain that is fat (rest is muscle).

**Recomposition Expectations (by training experience):**

| Experience | Monthly Fat Loss (lbs) | Monthly Muscle Gain (lbs) | Success Probability |
|-----------|----------------------|--------------------------|-------------------|
| Untrained (<1 yr) | 1.5 | 1.5 | 85% |
| Novice (1-2 yrs) | 1.0 | 0.75 | 70% |
| Intermediate (2-4 yrs) | 0.75 | 0.5 | 50% |
| Advanced (4+ yrs) | 0.5 | 0.25 | 25% |

### 5.3 Target Methods

Users can set their goal using any of these input modes:

| Method | What's Fixed | What's Calculated |
|--------|-------------|------------------|
| Body Fat % | Target BF%, FFM stays current | Target fat mass derived from target BF% and current FFM |
| FMI | Target FMI, FFM stays current | Target fat mass = targetFMI × heightM² |
| FFMI | Target FFMI, fat mass stays current | Target FFM = targetFFMI × heightM² |
| Fat Mass (lbs) | Target fat mass, FFM stays current | Direct entry |
| Lean Mass (lbs) | Target FFM, fat mass stays current | Direct entry |

Target body fat % is floored at 3%. Target fat mass is floored at 5 lbs.

### 5.4 Feasibility Assessment

A probability score and message based on the selected rate:

**Fat Loss:**
- ≤ 0.5% BW/week → 95% probability, "Very achievable with good adherence"
- ≤ 0.75% → 85%, "Achievable with consistent effort"
- ≤ 1.0% → 70%, "Challenging but possible"
- ≤ 1.25% → 50%, "Aggressive — expect some muscle loss"
- > 1.25% → 25%, "Unsustainable rate"

**Muscle Gain:**
- ≤ 0.25% → 90%, "Lean gains achievable"
- ≤ 0.5% → 80%, "Good balance of muscle and fat"
- ≤ 0.75% → 65%, "Expect significant fat gain"
- > 0.75% → 40%, "High fat accumulation expected"

**Recomposition:** Uses the experience-based probability from the table above.

### 5.5 Timeline Calculation

```
weeklyWeightChange = currentWeight × (rate% / 100)
totalWeightChange  = |targetWeight − currentWeight|
durationWeeks      = max(4, ceil(totalWeightChange / weeklyWeightChange))
endDate            = startDate + durationWeeks × 7 days
```

For recomposition: fixed at 12 weeks.

---

## 6. Projection Engine

### 6.1 Weekly Projections

Linear interpolation from current to projected end state, week by week:

```
For each week w from 0 to totalWeeks:
  t = w / totalWeeks
  fatMass[w]  = startFatMass  + (endFatMass  − startFatMass)  × t
  ffm[w]      = startFFM      + (endFFM      − startFFM)      × t
  weight[w]   = fatMass[w] + ffm[w]
  bodyFat[w]  = (fatMass[w] / weight[w]) × 100
  fmi[w]      = (fatMassKg[w] / heightM²)
  ffmi[w]     = (ffmKg[w] / heightM²)
```

### 6.2 Projected End State

**Fat Loss:**
```
ffmLossRatio = preset value (0.10 to 0.35)
endFFM      = currentFFM − |totalWeightChange| × ffmLossRatio
endFatMass  = currentFatMass − |totalWeightChange| × (1 − ffmLossRatio)
```

**Muscle Gain:**
```
fatGainRatio = preset value (0.30 to 0.65)
endFFM      = currentFFM + totalWeightChange × (1 − fatGainRatio)
endFatMass  = currentFatMass + totalWeightChange × fatGainRatio
```

**Recomposition:**
```
months = weeks / 4.33
endFatMass = currentFatMass − monthlyFatLoss × months
endFFM     = currentFFM + monthlyMuscleGain × months
```

### 6.3 Graph View

An SVG-based chart with:
- **Selectable variable:** Weight, Body Fat %, Fat Mass, or Lean Mass
- **X-axis:** Weeks (0 to duration)
- **Y-axis:** Selected metric value
- **Smooth curve:** Catmull-Rom spline interpolation through data points
- **Confidence intervals** (optional toggle): ±5% and ±10% bands shown as translucent fills
- **Hover tooltips:** Shows exact values for the hovered week
- **Start/end markers:** Highlighted data points with labels

### 6.4 Table View

Sortable table showing all projection data per week:

| Week | Date | Weight (lbs) | Body Fat % | Fat Mass (lbs) | Lean Mass (lbs) | FMI | FFMI |
|------|------|-------------|-----------|----------------|-----------------|-----|------|

---

## 7. Health Risk Visualization

Two mortality risk curves displayed as SVG charts, based on published cohort data.

### 7.1 FMI Mortality Risk

U-shaped curve showing hazard ratio (HR) by FMI. The optimal range is FMI 5-9 (HR ≈ 1.0). Both very low and very high FMI increase mortality risk.

**Data points (FMI → Hazard Ratio):**

```
2→1.80, 3→1.50, 4→1.25, 5→1.10, 6→1.02, 7→0.98, 7.3→1.00,
8→1.02, 9→1.10, 10→1.20, 11→1.35, 12→1.45, 13→1.56, 14→1.70,
15→1.85, 16→2.00, 17→2.20, 18→2.45, 19→2.65, 20→2.80
```

Optimal range: FMI 5-9

### 7.2 FFMI Mortality Risk

Inverse curve showing hazard ratio by FFMI. Higher FFMI generally associated with lower mortality risk, plateauing around FFMI 20-24.

**Data points (FFMI → Hazard Ratio):**

```
13→3.00, 14→2.50, 15→1.50, 16→1.10, 16.1→1.00, 17→0.90,
17.8→0.83, 18.5→0.78, 19.2→0.73, 20→0.71, 21→0.70, 21.9→0.70,
23→0.72, 24→0.74, 25→0.76, 26→0.78, 27→0.82
```

Optimal range: FFMI 19-24

**Source:** Sedlmeier AM, et al. *Am J Clin Nutr*. 2021;113(3):639-646. Pooled analysis of 7 prospective cohorts (n=16,155, 14-year median follow-up).

The user's current position is marked on both curves with a vertical indicator line and dot.

### 7.3 Hazard Ratio Interpolation

Values between data points are linearly interpolated:

```
For value between points[i] and points[i+1]:
  t = (value − points[i].x) / (points[i+1].x − points[i].x)
  hazardRatio = points[i].hr + t × (points[i+1].hr − points[i].hr)
```

---

## 8. Nutrition Target Estimation

### 8.1 TDEE Calculation

```
RMR = Mifflin-St Jeor (or measured)
NEAT = RMR × NEAT multiplier (see table below)
TEF = RMR × (TEF% / 100)     [default TEF% = 10]
Daily EEE = (exerciseCalories × workoutsPerWeek) / 7

TDEE = RMR + NEAT + TEF + Daily EEE
```

**NEAT Multipliers (conservative, based on Pontzer constrained energy model):**

| Level | Multiplier | Description |
|-------|-----------|-------------|
| Sedentary | 0.05 | <5k steps, desk job |
| Light | 0.10 | 5-8k steps |
| Moderate | 0.15 | 8-12k steps |
| Active | 0.20 | 12-15k steps |
| Very Active | 0.28 | >15k steps, physical job |

### 8.2 Calorie Target

```
weeklyWeightChangeLbs = summary.totalWeightChange / durationWeeks
dailyCalorieAdjustment = (weeklyWeightChangeLbs × 3500) / 7
targetCalories = max(1200, round(TDEE + dailyCalorieAdjustment))
```

Note: +3500 kcal ≈ +1 lb (surplus), −3500 kcal ≈ −1 lb (deficit).

### 8.3 Macro Distribution

```
// Reference weight: FFM for high-BF clients, total weight otherwise
highBF = (female && BF > 35%) || (male && BF > 25%)
referenceWeight = highBF ? fatFreeM assKg : totalWeightKg

// Protein
proteinGPerKg = from protein level (see table)
protein = min(round(referenceWeight × proteinGPerKg), 300g)

// Fat
fatGPerKg = highBF ? 1.0 : 0.9
fat = min(round(referenceWeight × fatGPerKg), 180g)

// Safety: protein + fat ≤ 75% of calories
if (protein×4 + fat×9) > (calories × 0.75):
    scale down both proportionally

// Carbs: fill remaining calories
carbs = max(100, round((calories − protein×4 − fat×9) / 4))
```

**Protein Level Coefficients (g/kg of reference weight):**

| Level | g/kg | Label |
|-------|------|-------|
| Low | 1.0 | <1.0 g/kg |
| Moderate | 1.4 | 1.0-1.6 g/kg |
| High | 1.8 | 1.6-2.2 g/kg |
| Very High | 2.4 | >2.2 g/kg |

---

## 9. Explore Mode

A toggle ("Explore hypothetical body composition") lets users manipulate **fat mass (lbs)** and **lean mass (lbs)** independently via sliders to see what any combination of fat and lean mass would look like in terms of:

- Total weight
- Body fat %
- FMI, FFMI
- Population percentiles
- Mortality risk position on both curves

When toggled on, initial values are set to the **95th percentile optimal** for the user's height:
- Target BF% = 6% (95th percentile leanness)
- Target FFMI = 24.5 (95th percentile muscularity)
- Fat mass and lean mass are back-calculated from these values and the user's height

This mode is purely educational — it doesn't affect the goal projections.

---

## 10. PDF Export

Clicking "Export PDF" generates a branded multi-section report via a server-side React-PDF renderer (`/api/generate-body-comp-pdf`).

### 10.1 PDF Sections

| Section | Content |
|---------|---------|
| **Header** | "Body Composition Analysis" title, client name (if available), logo |
| **Phase Overview** | Goal type, duration (weeks), weekly rate, start date |
| **Current Body Composition** | Weight, BF%, fat mass, lean mass as stat boxes |
| **Composition Visual** | Horizontal stacked bar (fat = red, lean = green) with percentages |
| **Body Composition Indices** | BMI, FMI (current + target), FFMI (current + target) |
| **Transformation Goals** | Side-by-side comparison: Current → Target (weight, BF%, fat mass, lean mass) |
| **Metabolic Assessment** | RMR, NEAT, TEF, EEE, TDEE as individual boxes |
| **Weekly Projections** | Table showing up to 8 milestone weeks + final (weight, BF%, fat mass, lean mass) |
| **Starting Nutrition Targets** | Calories, protein (g), carbs (g), fat (g) |
| **Footer** | Generation date, "Powered by Fitomics" branding |

### 10.2 PDF Data Payload

```typescript
{
  clientName: string;
  currentStats: {
    weight: number; height: number; age: number; gender: string;
    bodyFat: number; fatMass: number; leanMass: number;
    bmi: number; fmi: number; ffmi: number;
  };
  targetStats: {
    weight: number; bodyFat: number; fatMass: number; leanMass: number;
    fmi: number; ffmi: number;
  };
  metabolicData: {
    rmr: number; neat: number; tef: number; eee: number; tdee: number;
  };
  phase: {
    goalType: string; durationWeeks: number; weeklyChange: number; startDate: string;
  };
  projections: Array<{
    week: number; weight: number; bodyFat: number; fatMass: number; leanMass: number;
  }>;
  startingTargets: {
    calories: number; protein: number; carbs: number; fat: number;
  };
}
```

---

## 11. Formulas Reference

### Unit Conversions
```
weightKg = weightLbs × 0.453592
heightCm = (heightFt × 12 + heightIn) × 2.54
heightM  = heightCm / 100
```

### Body Composition
```
fatMassLbs = weight × (bodyFat% / 100)
ffmLbs     = weight − fatMassLbs
bmi        = weightKg / heightM²
fmi        = fatMassKg / heightM²
ffmi       = ffmKg / heightM²
```

### RMR (Mifflin-St Jeor)
```
Male:   10 × weightKg + 6.25 × heightCm − 5 × age + 5
Female: 10 × weightKg + 6.25 × heightCm − 5 × age − 161
```

### TDEE
```
TDEE = RMR + (RMR × NEAT_multiplier) + (RMR × TEF%/100) + (EEE × workoutsPerWeek / 7)
```

### Calorie Target
```
dailyAdjustment = (weeklyWeightChangeLbs × 3500) / 7
targetCalories  = max(1200, TDEE + dailyAdjustment)
```

### Timeline
```
weeklyChange = currentWeight × (rate% / 100)
weeks        = max(4, ceil(|weightDelta| / weeklyChange))
```

### Projection (Fat Loss)
```
endFFM     = currentFFM − |weightDelta| × ffmLossRatio
endFatMass = currentFatMass − |weightDelta| × (1 − ffmLossRatio)
```

### Projection (Muscle Gain)
```
endFFM     = currentFFM + weightDelta × (1 − fatGainRatio)
endFatMass = currentFatMass + weightDelta × fatGainRatio
```

### Macros
```
protein = min(referenceWeightKg × proteinCoefficient, 300g)
fat     = min(referenceWeightKg × fatCoefficient, 180g)
carbs   = max(100, (calories − protein×4 − fat×9) / 4)
```

---

## 12. Constants & Evidence Base

### Citations

| Data | Source | Reference |
|------|--------|-----------|
| Body Fat Percentiles | NHANES (CDC/NCHS) | 2017-2020 nationally representative U.S. adult data |
| FFMI Percentiles | Schutz, Kyle, Pichard | *Int J Obes*. 2002;26(7):953-960. DOI: 10.1038/sj.ijo.0802037 |
| Mortality Risk Curves | Sedlmeier AM, et al. | *Am J Clin Nutr*. 2021;113(3):639-646. DOI: 10.1093/ajcn/nqaa321 |
| NEAT Estimates | Pontzer (2016), Westerterp (2013) | Constrained energy model — conservative multipliers for modern populations |
| Caloric Equivalent | Standard | ~3,500 kcal per lb of body weight change |
| Energy Density | Standard | 7,700 kcal per kg of body weight change |

### SVG Curve Rendering

The graph uses **Catmull-Rom spline interpolation** for smooth curves:

```
For each segment between points[i] and points[i+1]:
  p0 = points[max(0, i-1)]
  p1 = points[i]
  p2 = points[i+1]
  p3 = points[min(len-1, i+2)]

  controlPoint1.x = p1.x + (p2.x − p0.x) / 6
  controlPoint1.y = p1.y + (p2.y − p0.y) / 6
  controlPoint2.x = p2.x − (p3.x − p1.x) / 6
  controlPoint2.y = p2.y − (p3.y − p1.y) / 6

  SVG path: C cp1x cp1y, cp2x cp2y, p2x p2y
```

### Tech Stack (for reference)

| Component | Technology |
|-----------|-----------|
| Framework | Next.js (React client component) |
| Charts | Custom SVG (no chart library) |
| UI | shadcn/ui (Radix + Tailwind) |
| PDF | React-PDF (`@react-pdf/renderer`) server-side |
| State | React `useState` + `useMemo` (no external store) |
