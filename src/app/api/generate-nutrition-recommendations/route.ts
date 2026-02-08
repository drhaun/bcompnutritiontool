import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysis, targets, mode, nutrientGroups } = body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Build context from analysis
    const deficiencyList = analysis.deficiencies
      .slice(0, 8)
      .map((d: any) => `${d.nutrient}: ${d.percentage}% of target (${d.actual} ${d.unit})`)
      .join('\n');
    
    const excessList = analysis.excesses
      .slice(0, 5)
      .map((e: any) => `${e.nutrient}: ${e.percentage}% of target (${e.actual} ${e.unit})`)
      .join('\n');

    const ratioIssues = analysis.ratios
      .filter((r: any) => r.status !== 'optimal')
      .map((r: any) => `${r.name}: ${r.ratio}:1 (optimal: ${r.optimal.min}-${r.optimal.max}:1)`)
      .join('\n');

    const topFoodsText = analysis.topFoods
      .slice(0, 10)
      .map((f: any) => `${f.name} (${f.count}x, ${f.totalCalories} cal total)`)
      .join(', ');

    const nutritionContext = `CURRENT NUTRITION ANALYSIS:
- Average Daily: ${analysis.summary.totalCalories} calories, ${analysis.summary.totalProtein}g protein, ${analysis.summary.totalCarbs}g carbs, ${analysis.summary.totalFat}g fat
- Days Analyzed: ${analysis.summary.daysAnalyzed}
- Overall Score: ${analysis.summary.overallScore}/100

TARGETS:
- Calories: ${targets.calories}
- Protein: ${targets.protein}g
- Carbs: ${targets.carbs}g  
- Fat: ${targets.fat}g

DEFICIENCIES (Below Target):
${deficiencyList || 'None significant'}

EXCESSES (Above Target):
${excessList || 'None significant'}

RATIO ISSUES:
${ratioIssues || 'All ratios optimal'}

TOP CONSUMED FOODS:
${topFoodsText}`;

    // ===== CORRECTIVE MEAL PLAN MODE =====
    if (mode === 'corrective_meal_plan') {
      const weakGroups = (nutrientGroups || [])
        .map((g: any) => `${g.name} (${g.avgAdequacy}% adequacy): ${g.message}`)
        .join('\n');

      const correctivePrompt = `You are an expert registered dietitian and sports nutritionist. Create a detailed, COMPLETE corrective meal plan for ONE full day that specifically targets this client's nutritional gaps.

${nutritionContext}

WEAK FUNCTIONAL NUTRIENT GROUPS:
${weakGroups || 'None specified'}

Create a DETAILED corrective day plan with these requirements:
1. Design 4-5 meals/snacks that hit the calorie and macro targets
2. Specifically address the TOP deficiencies by choosing foods rich in those nutrients
3. Minimize or swap foods that contribute to the excesses
4. For EACH meal, provide:
   - Meal name and time
   - Complete ingredient list with exact portions (grams/cups/tbsp)
   - Brief preparation instructions
   - Per-meal macros (calories, protein, carbs, fat)
   - Which specific deficient nutrients this meal addresses and approximately how much it contributes
5. End with a DAY TOTAL summary and a brief explanation of how this day corrects the identified issues
6. Include practical tips: prep time, substitutions for common allergens, and meal prep advice

Be specific with real foods, real portions, and realistic recipes. This should be a plan someone could follow TODAY. Use nutrient-dense whole foods. Aim for clinical accuracy in nutrient content estimates.

Format as clear, readable text with headers for each meal. Do NOT return JSON — return well-formatted plain text.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert clinical dietitian. Provide detailed, actionable corrective meal plans with real foods and accurate nutrient estimates. Use clear formatting with meal headers, bullet points for ingredients, and macro breakdowns.'
          },
          { role: 'user', content: correctivePrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content || '';

      return NextResponse.json({
        recommendations: content,
        correctivePlan: content,
        sampleDay: null,
      });
    }

    // ===== STANDARD RECOMMENDATIONS MODE =====
    const prompt = `You are an expert registered dietitian and sports nutritionist. Analyze this client's nutrition data and provide actionable recommendations.

${nutritionContext}

Provide:
1. A concise analysis (3-4 sentences) of overall diet quality
2. Top 3 priority changes with specific food recommendations
3. One practical tip for improvement

Keep response under 300 words. Be specific with food names and portions. Focus on practical, achievable changes.

Then create an OPTIMIZED SAMPLE DAY meal plan that addresses the deficiencies while hitting the targets. Return as JSON:

{
  "recommendations": "Your analysis and recommendations text here...",
  "sampleDay": {
    "meals": [
      {
        "name": "Breakfast",
        "description": "Brief description",
        "foods": ["Food 1 with portion", "Food 2 with portion"],
        "calories": 500,
        "protein": 35,
        "carbs": 50,
        "fat": 15
      }
    ],
    "totals": {
      "calories": 2000,
      "protein": 150,
      "carbs": 200,
      "fat": 70
    },
    "keyNutrients": ["Lists nutrients this day addresses from deficiencies"]
  }
}

Create 4-5 meals/snacks that total close to the calorie and macro targets.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert nutritionist. Always respond with valid JSON only, no markdown code blocks.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      // If JSON parsing fails, treat entire response as recommendations text
      console.error('Failed to parse JSON, using raw text');
      result = {
        recommendations: content,
        sampleDay: null
      };
    }

    return NextResponse.json({
      recommendations: result.recommendations || content,
      sampleDay: result.sampleDay || null
    });
    
  } catch (error) {
    console.error('Nutrition recommendations error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
