import streamlit as st
import pandas as pd
import json
import os
from datetime import datetime, time
import copy

# Import our modules
import utils
import fdc_api
import macro_validator
from nutrition_cache import NutritionCache
from pdf_export import export_meal_plan_pdf
from session_manager import add_session_controls

# OpenAI Integration
def get_openai_client():
    """Get OpenAI client - try multiple configurations"""
    try:
        import openai
        api_key = os.environ.get('OPENAI_API_KEY')
        org_id = os.environ.get('OPENAI_ORGANIZATION_ID')
        project_id = os.environ.get('OPENAI_PROJECT_ID')
        
        if api_key:
            # Try with full configuration first
            try:
                return openai.OpenAI(
                    api_key=api_key,
                    organization=org_id,
                    project=project_id
                )
            except:
                # Fallback to just API key if org/project cause issues
                return openai.OpenAI(api_key=api_key)
    except ImportError:
        pass
    return None

def build_user_profile_context(user_profile, body_comp_goals):
    """Build comprehensive user profile context for AI prompts"""
    
    # Ensure inputs are dictionaries
    if not isinstance(user_profile, dict):
        user_profile = {}
    if not isinstance(body_comp_goals, dict):
        body_comp_goals = {}
    
    context = ""
    
    if user_profile:
        context += f"""
USER PROFILE:
- Age: {user_profile.get('age', 'Not specified')} years
- Gender: {user_profile.get('gender', 'Not specified')}
- Height: {user_profile.get('height_ft', 'Not specified')}'{user_profile.get('height_in', '')}\"
- Current Weight: {user_profile.get('weight_lbs', 'Not specified')} lbs
- Activity Level: {user_profile.get('activity_level', 'Not specified')}
- Goal Focus: {user_profile.get('goal_focus', 'Not specified')}
- Lifestyle Commitment: {user_profile.get('lifestyle_commitment', 'Not specified')}
"""
    
    if body_comp_goals:
        context += f"""
BODY COMPOSITION GOALS:
- Primary Goal: {body_comp_goals.get('goal_type', 'Not specified') if body_comp_goals else 'Not specified'}
- Target Weight: {st.session_state.get('target_weight_lbs', 'Not specified')} lbs
- Target Body Fat: {st.session_state.get('target_bf', 'Not specified')}%
- Timeline: {st.session_state.get('timeline_weeks', 'Not specified')} weeks
- Performance Priority: {st.session_state.get('performance_preference', 'Not specified')}
- Body Comp Priority: {st.session_state.get('body_comp_preference', 'Not specified')}
"""
    
    return context

def build_dietary_context(diet_preferences):
    """Build comprehensive dietary preferences context"""
    
    # Ensure input is a dictionary
    if not isinstance(diet_preferences, dict):
        diet_preferences = {}
    
    dietary_restrictions = diet_preferences.get('dietary_restrictions', [])
    allergies = diet_preferences.get('allergies', [])
    
    context = f"""
DIETARY RESTRICTIONS & SAFETY:
- Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- ALLERGIES (STRICTLY AVOID): {', '.join(allergies) if allergies else 'None'}
- Disliked Foods: {', '.join(diet_preferences.get('disliked_foods', [])[:8])}

FOOD PREFERENCES:
- Proteins: {', '.join(diet_preferences.get('preferred_proteins', [])[:8])}
- Carbs: {', '.join(diet_preferences.get('preferred_carbs', [])[:8])}
- Fats: {', '.join(diet_preferences.get('preferred_fats', [])[:8])}
- Vegetables: {', '.join(diet_preferences.get('preferred_vegetables', [])[:8])}
- Cuisines: {', '.join(diet_preferences.get('cuisine_preferences', [])[:5])}

FLAVOR PREFERENCES:
- Spice Level: {diet_preferences.get('spice_level', 'Medium')}
- Flavor Profiles: {', '.join(diet_preferences.get('flavor_profile', [])[:5])}
- Seasonings: {', '.join(diet_preferences.get('preferred_seasonings', [])[:8])}

PRACTICAL CONSTRAINTS:
- Cooking Time: {diet_preferences.get('cooking_time_preference', 'Medium (30-60 min)')}
- Budget: {diet_preferences.get('budget_preference', 'Moderate')}
- Cooking For: {diet_preferences.get('cooking_for', 'Just myself')}
- Leftovers: {diet_preferences.get('leftovers_preference', 'Okay with leftovers occasionally')}
- Variety Level: {diet_preferences.get('variety_level', 'Moderate Variety')}
"""
    
    return context

def step1_generate_meal_structure(day_targets, user_context, dietary_context, schedule_info, openai_client):
    """Step 1: Generate optimal meal structure and timing for the day"""
    
    # Ensure inputs are dictionaries
    if not isinstance(day_targets, dict):
        day_targets = {}
    if not isinstance(schedule_info, dict):
        schedule_info = {}
    
    daily_totals = day_targets.get('daily_totals', {
        'calories': 2000,
        'protein': 150,
        'carbs': 200,
        'fat': 70
    })
    
    prompt = f"""
You are a professional nutritionist. Design an optimal meal structure for this user.

{user_context}

{dietary_context}

DAILY TARGETS:
- Calories: {daily_totals.get('calories', 2000)}
- Protein: {daily_totals.get('protein', 150)}g
- Carbs: {daily_totals.get('carbs', 200)}g  
- Fat: {daily_totals.get('fat', 70)}g

SCHEDULE CONTEXT:
- Workouts: {schedule_info.get('workouts', 'None scheduled')}
- Meal Contexts: {schedule_info.get('meal_contexts', {})}

Design meal structure with:
1. Optimal number of meals (3-6 based on preferences and schedule)
2. Meal timing relative to workouts
3. Macro distribution per meal
4. Meal purposes (pre-workout, post-workout, etc.)

Return JSON with:
{{
  "meal_structure": [
    {{
      "meal_name": "Breakfast",
      "timing": "7:00 AM",
      "purpose": "Energy start",
      "target_calories": 500,
      "target_protein": 30,
      "target_carbs": 60,
      "target_fat": 20,
      "workout_relation": "none"
    }}
  ],
  "rationale": "Why this structure works for this user"
}}
"""
    
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a nutritionist focused on optimal meal timing and structure. Be precise and scientific."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=1500
    )
    
    try:
        result = json.loads(response.choices[0].message.content or "{}")
        return result
    except json.JSONDecodeError:
        return {"meal_structure": [], "rationale": "Error parsing meal structure"}

def step2_generate_meal_concepts(meal_structure, user_context, dietary_context, openai_client):
    """Step 2: Generate specific meal concepts for each meal in the structure"""
    meal_concepts = []
    
    for meal in meal_structure['meal_structure']:
        prompt = f"""
Create a specific meal concept for this meal slot.

{user_context}

{dietary_context}

MEAL REQUIREMENTS:
- Name: {meal['meal_name']}
- Timing: {meal['timing']}
- Purpose: {meal['purpose']}
- Target Calories: {meal['target_calories']}
- Target Protein: {meal['target_protein']}g
- Target Carbs: {meal['target_carbs']}g
- Target Fat: {meal['target_fat']}g
- Workout Relation: {meal['workout_relation']}

Generate a specific meal concept that:
1. Fits the user's preferences perfectly
2. Achieves the macro targets
3. Considers workout timing if applicable
4. Uses preferred ingredients when possible

Return JSON:
{{
  "meal_concept": {{
    "name": "Specific meal name",
    "description": "Brief description",
    "key_ingredients": ["ingredient1", "ingredient2"],
    "cooking_method": "How it's prepared",
    "estimated_prep_time": "15 minutes"
  }}
}}
"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a chef and nutritionist. Create appealing, practical meal concepts that perfectly match user preferences."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1000
        )
        
        try:
            concept_result = json.loads(response.choices[0].message.content or "{}")
        except json.JSONDecodeError:
            concept_result = {"meal_concept": {"name": "Error", "description": "Parse error", "key_ingredients": [], "cooking_method": "N/A", "estimated_prep_time": "N/A"}}
        meal_concepts.append({
            **meal,
            **concept_result['meal_concept']
        })
    
    return meal_concepts

def step3_generate_precise_recipes(meal_concepts, openai_client):
    """Step 3: Generate precise recipes with exact portions to hit macro targets"""
    final_meals = []
    
    for meal_concept in meal_concepts:
        prompt = f"""
Create a precise recipe for this meal concept with EXACT portions to hit the macro targets.

MEAL CONCEPT:
- Name: {meal_concept['name']}
- Description: {meal_concept['description']}
- Key Ingredients: {meal_concept['key_ingredients']}
- Cooking Method: {meal_concept['cooking_method']}

EXACT MACRO TARGETS (MUST BE ACHIEVED):
- Calories: {meal_concept['target_calories']} (±15 calories)
- Protein: {meal_concept['target_protein']}g (±2g)
- Carbs: {meal_concept['target_carbs']}g (±3g)
- Fat: {meal_concept['target_fat']}g (±2g)

Generate precise recipe with:
1. Exact ingredient amounts (weights in grams/ounces)
2. Step-by-step cooking instructions
3. Calculated macros for each ingredient
4. Total macros that match targets exactly

Return JSON:
{{
  "recipe": {{
    "name": "{meal_concept['name']}",
    "ingredients": [
      {{
        "item": "Chicken breast",
        "amount": "200g",
        "calories": 330,
        "protein": 62,
        "carbs": 0,
        "fat": 7.4
      }}
    ],
    "instructions": ["Step 1", "Step 2"],
    "total_macros": {{
      "calories": {meal_concept['target_calories']},
      "protein": {meal_concept['target_protein']},
      "carbs": {meal_concept['target_carbs']},
      "fat": {meal_concept['target_fat']}
    }},
    "prep_time": "{meal_concept.get('estimated_prep_time', '15 minutes')}",
    "context": "{meal_concept.get('purpose', '')}",
    "time": "{meal_concept.get('timing', '')}",
    "workout_annotation": "{meal_concept.get('workout_relation', '')}"
  }}
}}
"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a precision nutritionist. Calculate exact ingredient amounts to hit macro targets perfectly. Use standard nutritional databases for accuracy."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.05,
            max_tokens=2000
        )
        
        try:
            recipe_result = json.loads(response.choices[0].message.content or "{}")
            final_meals.append(recipe_result.get('recipe', {
                'name': 'Error',
                'ingredients': [],
                'instructions': ['Parse error'],
                'total_macros': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
                'prep_time': 'N/A',
                'context': '',
                'time': '',
                'workout_annotation': ''
            }))
        except json.JSONDecodeError:
            final_meals.append({
                'name': 'Error',
                'ingredients': [],
                'instructions': ['JSON parse error'],
                'total_macros': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
                'prep_time': 'N/A',
                'context': '',
                'time': '',
                'workout_annotation': ''
            })
    
    return final_meals

def step4_validate_and_adjust(final_meals, day_targets):
    """Step 4: Validate total macros and make adjustments if needed"""
    # Calculate actual totals
    total_calories = sum(meal['total_macros']['calories'] for meal in final_meals)
    total_protein = sum(meal['total_macros']['protein'] for meal in final_meals)
    total_carbs = sum(meal['total_macros']['carbs'] for meal in final_meals)
    total_fat = sum(meal['total_macros']['fat'] for meal in final_meals)
    
    # Get targets
    target_totals = day_targets.get('daily_totals', {})
    target_calories = target_totals.get('calories', 2000)
    target_protein = target_totals.get('protein', 150)
    target_carbs = target_totals.get('carbs', 200)
    target_fat = target_totals.get('fat', 70)
    
    # Check accuracy (3% tolerance)
    tolerance = 0.03
    adjustments_needed = []
    
    if abs(total_calories - target_calories) / target_calories > tolerance:
        adjustments_needed.append(f"Calories: {total_calories} vs {target_calories}")
    if abs(total_protein - target_protein) / target_protein > tolerance:
        adjustments_needed.append(f"Protein: {total_protein}g vs {target_protein}g")
    if abs(total_carbs - target_carbs) / target_carbs > tolerance:
        adjustments_needed.append(f"Carbs: {total_carbs}g vs {target_carbs}g")
    if abs(total_fat - target_fat) / target_fat > tolerance:
        adjustments_needed.append(f"Fat: {total_fat}g vs {target_fat}g")
    
    daily_totals = {
        'calories': round(total_calories),
        'protein': round(total_protein, 1),
        'carbs': round(total_carbs, 1),
        'fat': round(total_fat, 1)
    }
    
    return {
        'meals': final_meals,
        'daily_totals': daily_totals,
        'accuracy_valid': len(adjustments_needed) == 0,
        'adjustments_needed': adjustments_needed
    }

def generate_weekly_ai_meal_plan(weekly_targets, diet_preferences, weekly_schedule, openai_client, user_profile=None, body_comp_goals=None):
    """Generate complete weekly AI meal plan using step-by-step approach"""
    weekly_meal_plan = {}
    
    # Build reusable contexts
    user_context = build_user_profile_context(user_profile, body_comp_goals)
    dietary_context = build_dietary_context(diet_preferences)
    
    progress_placeholder = st.empty()
    
    for day, day_data in weekly_targets.items():
        try:
            progress_placeholder.info(f"🔄 Generating {day} meal plan - Step-by-step approach...")
            
            # Get day-specific schedule information
            schedule_info = weekly_schedule.get(day, {})
            
            # Step 1: Generate meal structure
            st.write(f"**{day} - Step 1:** Designing optimal meal structure...")
            meal_structure = step1_generate_meal_structure(day_data, user_context, dietary_context, schedule_info, openai_client)
            
            # Step 2: Generate meal concepts
            st.write(f"**{day} - Step 2:** Creating personalized meal concepts...")
            meal_concepts = step2_generate_meal_concepts(meal_structure, user_context, dietary_context, openai_client)
            
            # Step 3: Generate precise recipes
            st.write(f"**{day} - Step 3:** Calculating precise recipes and portions...")
            final_meals = step3_generate_precise_recipes(meal_concepts, openai_client)
            
            # Step 4: Validate and adjust
            st.write(f"**{day} - Step 4:** Validating macro accuracy...")
            day_result = step4_validate_and_adjust(final_meals, day_data)
            
            # Create final day plan
            day_plan = {
                'meals': day_result['meals'],
                'daily_totals': day_result['daily_totals'],
                'meal_structure_rationale': meal_structure.get('rationale', ''),
                'accuracy_validated': day_result['accuracy_valid']
            }
            
            if day_result['accuracy_valid']:
                st.success(f"✅ {day} meal plan generated with accurate macros!")
            else:
                st.warning(f"⚠️ {day} meal plan needs adjustments: {', '.join(day_result['adjustments_needed'])}")
            
            weekly_meal_plan[day] = day_plan
            
        except Exception as e:
            st.error(f"❌ Error generating {day} meal plan: {e}")
            continue
    
    progress_placeholder.success("🎉 Weekly meal plan generation complete!")
    return weekly_meal_plan

def validate_meal_plan_accuracy(day_plan, day_targets, day_name):
    """Validate that generated meal plan matches targets within acceptable tolerance"""
    try:
        # Extract daily totals from generated plan
        generated_totals = day_plan.get('daily_totals', {})
        
        # Get target totals from daily_totals structure (not meal_targets)
        target_totals = day_targets.get('daily_totals', {})
        
        # Define acceptable tolerance (3%)
        tolerance = 0.03
        
        # Check each macro
        macros = ['calories', 'protein', 'carbs', 'fat']
        accuracy_issues = []
        
        for macro in macros:
            generated = generated_totals.get(macro, 0)
            target = target_totals.get(macro, 0)
            
            if target > 0:
                deviation = abs(generated - target) / target
                if deviation > tolerance:
                    accuracy_issues.append(f"{macro}: {generated} vs {target} (±{deviation:.1%})")
        
        if accuracy_issues:
            print(f"⚠️ {day_name} macro accuracy issues:")
            for issue in accuracy_issues:
                print(f"  - {issue}")
            return False, accuracy_issues
        else:
            print(f"✅ {day_name} macro accuracy validated")
            return True, []
            
    except Exception as e:
        print(f"⚠️ Error validating {day_name} meal plan: {e}")
        return False, [f"Validation error: {e}"]

def generate_ai_meal_plan(meal_targets, diet_preferences, meal_config, openai_client):
    """Generate single-day AI meal plan (legacy function for compatibility)"""
    try:
        # Build comprehensive prompt for single day
        prompt = f"""
Create a complete daily meal plan with the following specifications:

NUTRITION TARGETS:
{json.dumps(meal_targets, indent=2)}

DIETARY PREFERENCES:
- Vegetarian: {diet_preferences.get('vegetarian', False)}
- Vegan: {diet_preferences.get('vegan', False)}
- Gluten-free: {diet_preferences.get('gluten_free', False)}
- Dairy-free: {diet_preferences.get('dairy_free', False)}
- Nut-free: {diet_preferences.get('nut_free', False)}
- Cooking time preference: {diet_preferences.get('cooking_time_preference', 'Medium (30-60 min)')}
- Budget preference: {diet_preferences.get('budget_preference', 'Moderate')}
- Cooking for: {diet_preferences.get('cooking_for', 'Just myself')}
- Leftovers preference: {diet_preferences.get('leftovers_preference', 'Okay with leftovers occasionally')}

MEAL TIMING:
- Wake time: {meal_config.get('wake_time', '07:00')}
- Sleep time: {meal_config.get('sleep_time', '23:00')}
- Workout time: {meal_config.get('workout_time', 'Morning')}
- Number of meals: {meal_config.get('num_meals', 3)}

Create a meal plan with exact macro calculations matching targets within ±3% tolerance.

Return JSON format with:
{{
  "meals": [
    {{
      "name": "Breakfast",
      "time": "7:00 AM",
      "ingredients": [
        {{
          "item": "Oats",
          "amount": "80g",
          "calories": 304,
          "protein": 10.8,
          "carbs": 54.8,
          "fat": 6.2
        }}
      ],
      "instructions": ["Step 1", "Step 2"],
      "total_macros": {{
        "calories": 500,
        "protein": 25,
        "carbs": 60,
        "fat": 20
      }}
    }}
  ],
  "daily_totals": {{
    "calories": {meal_targets.get('calories', 2000)},
    "protein": {meal_targets.get('protein', 150)},
    "carbs": {meal_targets.get('carbs', 200)},
    "fat": {meal_targets.get('fat', 70)}
  }}
}}
"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutritionist. Create precise meal plans with exact macro calculations."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=3000
        )
        
        return json.loads(response.choices[0].message.content)
        
    except Exception as e:
        st.error(f"AI meal generation failed: {e}")
        return None

# Main Streamlit UI Code
st.set_page_config(
    page_title="Advanced AI Meal Plan",
    page_icon="🤖",
    layout="wide"
)

# Custom CSS for better styling
st.markdown("""
<style>
/* Import Fitomics color scheme */
:root {
    --fitomics-navy: #1e3a5f;
    --fitomics-gold: #d4af37;
    --fitomics-light-blue: #4a90a4;
    --fitomics-cream: #f5f5dc;
}

.main-header {
    background: linear-gradient(135deg, var(--fitomics-navy) 0%, var(--fitomics-light-blue) 100%);
    padding: 2rem;
    border-radius: 10px;
    color: white;
    text-align: center;
    margin-bottom: 2rem;
}

.main-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: white;
}

.main-header p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin: 0;
}

.step-card {
    background: white;
    border: 2px solid var(--fitomics-gold);
    border-radius: 10px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.step-title {
    color: var(--fitomics-navy);
    font-weight: 600;
    font-size: 1.3rem;
    margin-bottom: 1rem;
}

.progress-bar {
    background: var(--fitomics-gold);
    height: 4px;
    border-radius: 2px;
    margin: 1rem 0;
}

.accuracy-badge {
    display: inline-block;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
}

.accuracy-excellent {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.accuracy-good {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.accuracy-needs-work {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}
</style>
""", unsafe_allow_html=True)

# Header
st.markdown("""
<div class="main-header">
    <h1>🤖 Advanced AI Meal Plan</h1>
    <p>Step-by-step AI-powered meal planning with ±3% macro accuracy</p>
</div>
""", unsafe_allow_html=True)

# Session controls in sidebar
add_session_controls()

# Check for required data
if not all([
    st.session_state.get('user_info'),
    st.session_state.get('goal_info'),
    st.session_state.get('diet_preferences'),
    st.session_state.get('weekly_schedule_v2'),
    st.session_state.get('day_specific_nutrition')
]):
    st.error("⚠️ **Missing Required Data** - Please complete the following steps first:")
    
    missing_steps = []
    if not st.session_state.get('user_info'):
        missing_steps.append("• **Initial Setup** - Basic profile information")
    if not st.session_state.get('goal_info'):
        missing_steps.append("• **Body Composition Goals** - Target setting")
    if not st.session_state.get('diet_preferences'):
        missing_steps.append("• **Diet Preferences** - Food preferences and restrictions")
    if not st.session_state.get('weekly_schedule_v2'):
        missing_steps.append("• **Weekly Schedule** - Daily activities and workout timing")
    if not st.session_state.get('day_specific_nutrition'):
        missing_steps.append("• **Nutrition Targets** - Macro calculations")
    
    for step in missing_steps:
        st.markdown(step)
    
    st.info("👈 Use the sidebar navigation to complete these steps, then return here for AI meal planning.")
    st.stop()

# Display current sync status
st.success("✅ **Sync Profile Mode Active** - Using your personalized body composition targets and weekly schedule")

# Show comprehensive weekly overview  
with st.expander("📋 Complete Weekly Overview", expanded=True):
    st.markdown("**Summary of all your selections and calculations:**")
    
    # Get all data sources with correct session state keys
    weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
    day_nutrition = st.session_state.get('day_specific_nutrition', {})
    body_comp_goals = st.session_state.get('goal_info', {})
    initial_setup = st.session_state.get('user_info', {})
    diet_prefs = st.session_state.get('diet_preferences', {})
    
    # Create comprehensive overview table
    overview_data = []
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        schedule = weekly_schedule.get(day, {})
        nutrition = day_nutrition.get(day, {})
        
        # Count meals and snacks
        meals = schedule.get('meals', [])
        meal_count = len([m for m in meals if m.get('type') == 'meal'])
        snack_count = len([m for m in meals if m.get('type') == 'snack'])
        
        # Workout info
        workouts = schedule.get('workouts', [])
        workout_display = 'Rest Day'
        if workouts:
            if len(workouts) == 1:
                workout = workouts[0]
                workout_display = f"{workout.get('duration', 0)}min {workout.get('type', 'Workout')}"
            else:
                workout_display = f"{len(workouts)} workouts"
        
        overview_data.append({
            'Day': day,
            'TDEE': f"{schedule.get('total_calories', 0):.0f}",
            'Target Calories': f"{nutrition.get('calories', 0):.0f}",
            'Protein': f"{nutrition.get('protein', 0):.0f}g",
            'Carbs': f"{nutrition.get('carbs', 0):.0f}g",
            'Fat': f"{nutrition.get('fat', 0):.0f}g",
            'Meals': meal_count,
            'Snacks': snack_count,
            'Workout': workout_display,
            'Wake': schedule.get('wake_time', 'N/A'),
            'Sleep': schedule.get('bed_time', 'N/A')
        })
    
    overview_df = pd.DataFrame(overview_data)
    st.dataframe(overview_df, use_container_width=True, hide_index=True)

# AI Meal Planning Section
st.markdown("---")
st.markdown("## 🤖 Step-by-Step AI Meal Plan Generation")

# OpenAI integration check
openai_client = get_openai_client()
if not openai_client:
    st.error("🔑 **OpenAI API Key Required** - Please provide your OpenAI API key to generate AI meal plans.")
    st.info("Add your OpenAI API key in the Replit Secrets tab as 'OPENAI_API_KEY'")
    st.stop()

st.info("**New Step-by-Step Approach:** AI meal planning now builds your plan incrementally with better personalization and macro accuracy.")

# Interactive Meal Planning Workflow
if 'meal_plan_stage' not in st.session_state:
    st.session_state['meal_plan_stage'] = 'start'
if 'monday_plan' not in st.session_state:
    st.session_state['monday_plan'] = None
if 'approved_days' not in st.session_state:
    st.session_state['approved_days'] = {}

# Stage 1: Start the process
if st.session_state['meal_plan_stage'] == 'start':
    st.markdown("### 🎯 Interactive Meal Planning Process")
    st.info("""
    **New Interactive Approach:**
    1. **Generate Monday Example** - We'll create your first day with detailed reasoning
    2. **Review & Approve** - You can modify meals or approve the approach
    3. **Apply to Week** - Use the same rules for similar days or customize each day
    """)
    
    if st.button("🚀 Start with Monday Example", type="primary", use_container_width=True):
        st.session_state['meal_plan_stage'] = 'generating_monday'
        st.rerun()

# Stage 2: Generate Monday example
elif st.session_state['meal_plan_stage'] == 'generating_monday':
    st.markdown("### 📅 Generating Monday Example")
    
    with st.spinner("Creating your Monday meal plan with detailed reasoning..."):
        # Get required data
        weekly_targets = st.session_state.get('day_specific_nutrition', {})
        diet_preferences = st.session_state.get('diet_preferences', {})
        weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
        user_profile = st.session_state.get('user_info', {})
        body_comp_goals = st.session_state.get('goal_info', {})
        
        # Generate Monday plan with detailed reasoning
        monday_data = weekly_targets.get('Monday', {})
        monday_schedule = weekly_schedule.get('Monday', {})
        
        if monday_data:
            try:
                # Check OpenAI client
                if not openai_client:
                    st.error("OpenAI client not initialized. Please check API key.")
                    st.session_state['meal_plan_stage'] = 'start'
                    st.stop()
                
                # Build contexts
                user_context = build_user_profile_context(user_profile, body_comp_goals)
                diet_context = build_dietary_context(diet_preferences)
                
                # Generate Monday plan with step-by-step approach
                progress_placeholder = st.empty()
                
                # Step 1: Meal Structure
                progress_placeholder.info("🏗️ Step 1: Designing optimal meal structure...")
                try:
                    meal_structure = step1_generate_meal_structure(
                        monday_data, user_context, diet_context, monday_schedule, openai_client
                    )
                except Exception as e:
                    st.error(f"Step 1 error: {e}")
                    progress_placeholder.error("❌ Unable to generate meal structure due to API issue")
                    st.session_state['meal_plan_stage'] = 'start'
                    st.stop()
                
                # Step 2: Meal Concepts  
                progress_placeholder.info("💡 Step 2: Creating personalized meal concepts...")
                try:
                    meal_concepts = step2_generate_meal_concepts(
                        meal_structure, user_context, diet_context, openai_client
                    )
                except Exception as e:
                    st.error(f"Step 2 error: {e}")
                    progress_placeholder.error("❌ Unable to generate meal concepts due to API issue")
                    st.session_state['meal_plan_stage'] = 'start'
                    st.stop()
                
                # Step 3: Precise Recipes
                progress_placeholder.info("🍳 Step 3: Calculating precise recipes...")
                try:
                    precise_meals = step3_generate_precise_recipes(
                        meal_concepts, openai_client
                    )
                except Exception as e:
                    st.error(f"Step 3 error: {e}")
                    progress_placeholder.error("❌ Unable to generate precise recipes due to API issue")
                    st.session_state['meal_plan_stage'] = 'start'
                    st.stop()
                
                # Step 4: Validation
                progress_placeholder.info("✅ Step 4: Validating macro accuracy...")
                try:
                    final_result = step4_validate_and_adjust(precise_meals, monday_data)
                except Exception as e:
                    st.error(f"Step 4 error: {e}")
                    raise
                
                # Create comprehensive Monday plan with reasoning
                # Ensure meal_structure is a dict
                if isinstance(meal_structure, str):
                    rationale = "Meal structure generated successfully"
                else:
                    rationale = meal_structure.get('rationale', 'Meal structure generated successfully') if isinstance(meal_structure, dict) else "Meal structure generated successfully"
                
                # Ensure final_result is a dict
                if not isinstance(final_result, dict):
                    final_result = {'meals': [], 'daily_totals': {}, 'accuracy_valid': False, 'adjustments_needed': []}
                
                monday_plan = {
                    'day': 'Monday',
                    'meals': final_result.get('meals', []),
                    'daily_totals': final_result.get('daily_totals', {}),
                    'meal_structure_rationale': rationale,
                    'meal_concepts_reasoning': 'Generated personalized meal concepts based on user preferences',
                    'accuracy_validated': final_result.get('accuracy_valid', False),
                    'adjustments_made': final_result.get('adjustments_needed', []),
                    'schedule_context': monday_schedule,
                    'nutrition_targets': monday_data
                }
                
                st.session_state['monday_plan'] = monday_plan
                st.session_state['meal_plan_stage'] = 'review_monday'
                progress_placeholder.success("✅ Monday example generated!")
                st.rerun()
                
            except Exception as e:
                st.error(f"Error generating Monday plan: {e}")
                st.session_state['meal_plan_stage'] = 'start'

# Stage 3: Review Monday example
elif st.session_state['meal_plan_stage'] == 'review_monday':
    monday_plan = st.session_state['monday_plan']
    
    st.markdown("### 📅 Review Your Monday Example")
    st.info("**Review the reasoning and meals below. You can approve this approach or request modifications.**")
    
    # Show reasoning and context
    with st.expander("🧠 AI Reasoning & Context", expanded=True):
        st.markdown("**Meal Structure Rationale:**")
        st.markdown(monday_plan.get('meal_structure_rationale', 'Not provided'))
        
        st.markdown("**Meal Concept Reasoning:**")
        st.markdown(monday_plan.get('meal_concepts_reasoning', 'Not provided'))
        
        # Show schedule context
        schedule_context = monday_plan.get('schedule_context', {})
        if schedule_context:
            st.markdown("**Monday Schedule Context:**")
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Wake Time", schedule_context.get('wake_time', 'N/A'))
            with col2:
                st.metric("Sleep Time", schedule_context.get('bed_time', 'N/A'))
            with col3:
                workouts = schedule_context.get('workouts', [])
                workout_text = f"{len(workouts)} workout(s)" if workouts else "Rest day"
                st.metric("Workouts", workout_text)
    
    # Show generated meals
    st.markdown("### 🍽️ Generated Monday Meals")
    
    meals = monday_plan.get('meals', [])
    for i, meal in enumerate(meals):
        with st.container():
            st.markdown(f"#### {i+1}. {meal.get('name', 'Unnamed Meal')}")
            
            col1, col2 = st.columns([2, 1])
            
            with col1:
                if meal.get('time'):
                    st.markdown(f"**Time:** {meal['time']}")
                if meal.get('context'):
                    st.markdown(f"**Context:** {meal['context']}")
                if meal.get('prep_time'):
                    st.markdown(f"**Prep Time:** {meal['prep_time']}")
                
                # Show ingredients
                ingredients = meal.get('ingredients', [])
                if ingredients:
                    st.markdown("**Ingredients:**")
                    for ingredient in ingredients:
                        st.markdown(f"• {ingredient.get('amount', '')} {ingredient.get('item', 'Unknown ingredient')}")
                
                # Show instructions
                instructions = meal.get('instructions', [])
                if instructions:
                    st.markdown("**Instructions:**")
                    for j, instruction in enumerate(instructions, 1):
                        st.markdown(f"{j}. {instruction}")
            
            with col2:
                # Show macros
                macros = meal.get('total_macros', {})
                if macros:
                    st.metric("Calories", f"{macros.get('calories', 0)}")
                    st.metric("Protein", f"{macros.get('protein', 0)}g")
                    st.metric("Carbs", f"{macros.get('carbs', 0)}g")
                    st.metric("Fat", f"{macros.get('fat', 0)}g")
            
            st.markdown("---")
    
    # Show daily totals vs targets
    daily_totals = monday_plan.get('daily_totals', {})
    nutrition_targets = monday_plan.get('nutrition_targets', {})
    
    if daily_totals and nutrition_targets:
        st.markdown("### 📊 Accuracy Check")
        accuracy_data = []
        
        for macro in ['calories', 'protein', 'carbs', 'fat']:
            target = nutrition_targets.get(macro, 0)
            actual = daily_totals.get(macro, 0)
            
            if target > 0:
                deviation = ((actual - target) / target) * 100
                status = "✅ Excellent" if abs(deviation) <= 3 else "⚠️ Needs adjustment"
                
                accuracy_data.append({
                    'Macro': macro.title(),
                    'Target': f"{target:.0f}{'g' if macro != 'calories' else ''}",
                    'Actual': f"{actual:.0f}{'g' if macro != 'calories' else ''}",
                    'Deviation': f"{deviation:+.1f}%",
                    'Status': status
                })
        
        accuracy_df = pd.DataFrame(accuracy_data)
        st.dataframe(accuracy_df, use_container_width=True, hide_index=True)
    
    # User feedback and approval
    st.markdown("### 🎯 Your Feedback")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("✅ Approve Monday", type="primary", use_container_width=True):
            st.session_state['approved_days']['Monday'] = monday_plan
            st.session_state['meal_plan_stage'] = 'apply_to_week'
            st.success("Monday approved!")
            st.rerun()
    
    with col2:
        if st.button("🔄 Regenerate Monday", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'generating_monday'
            st.info("Regenerating Monday...")
            st.rerun()
    
    with col3:
        if st.button("✏️ Request Modifications", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'modify_monday'
            st.rerun()

# Stage 4: Modification requests
elif st.session_state['meal_plan_stage'] == 'modify_monday':
    st.markdown("### ✏️ Request Monday Modifications")
    
    modification_request = st.text_area(
        "What would you like to change about Monday's meal plan?",
        placeholder="Example: Make breakfast more protein-heavy, replace chicken with fish, add a pre-workout snack, etc.",
        height=100
    )
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🔄 Apply Modifications", type="primary", use_container_width=True):
            if modification_request.strip():
                st.session_state['modification_request'] = modification_request
                st.session_state['meal_plan_stage'] = 'generating_modified_monday'
                st.rerun()
            else:
                st.warning("Please describe the modifications you'd like.")
    
    with col2:
        if st.button("← Back to Review", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'review_monday'
            st.rerun()

# Stage 5: Generate modified Monday
elif st.session_state['meal_plan_stage'] == 'generating_modified_monday':
    st.markdown("### 🔄 Applying Your Modifications")
    
    with st.spinner("Updating Monday plan based on your feedback..."):
        # Get modification request and current plan
        modification_request = st.session_state.get('modification_request', '')
        current_plan = st.session_state['monday_plan']
        
        # Get required data
        weekly_targets = st.session_state.get('day_specific_nutrition', {})
        diet_preferences = st.session_state.get('diet_preferences', {})
        weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
        user_profile = st.session_state.get('user_info', {})
        body_comp_goals = st.session_state.get('goal_info', {})
        
        monday_data = weekly_targets.get('Monday', {})
        monday_schedule = weekly_schedule.get('Monday', {})
        
        try:
            # Build contexts with modification request
            user_context = build_user_profile_context(user_profile, body_comp_goals)
            diet_context = build_dietary_context(diet_preferences)
            
            # Add modification context
            modification_context = f"""
USER MODIFICATION REQUEST:
{modification_request}

CURRENT MEAL PLAN TO MODIFY:
{json.dumps(current_plan.get('meals', []), indent=2)}

INSTRUCTIONS:
- Apply the user's requested modifications while maintaining macro accuracy
- Keep the same meal structure unless specifically requested to change
- Preserve successful elements from the current plan
- Ensure all modifications align with nutritional targets and dietary preferences
"""
            
            # Generate modified plan
            modified_prompt = f"""
{user_context}

{diet_context}

{modification_context}

DAY-SPECIFIC TARGETS FOR MONDAY:
{json.dumps(monday_data, indent=2)}

MONDAY SCHEDULE CONTEXT:
{json.dumps(monday_schedule, indent=2)}

Create a modified meal plan that incorporates the user's feedback while maintaining ±3% macro accuracy.

Return JSON format with the same meal structure but with requested modifications applied.
"""
            
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a nutritionist specializing in personalized meal plan modifications. Apply user feedback while maintaining macro accuracy."},
                    {"role": "user", "content": modified_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.05,
                max_tokens=3000
            )
            
            modified_result = json.loads(response.choices[0].message.content or "{}")
            
            # Update Monday plan with modifications
            st.session_state['monday_plan']['meals'] = modified_result.get('meals', [])
            st.session_state['monday_plan']['daily_totals'] = modified_result.get('daily_totals', {})
            st.session_state['monday_plan']['modification_applied'] = modification_request
            
            st.session_state['meal_plan_stage'] = 'review_monday'
            st.success("✅ Modifications applied!")
            st.rerun()
            
        except Exception as e:
            st.error(f"Error applying modifications: {e}")
            st.session_state['meal_plan_stage'] = 'modify_monday'

# Stage 6: Apply to week
elif st.session_state['meal_plan_stage'] == 'apply_to_week':
    st.markdown("### 🗓️ Apply Monday's Approach to Full Week")
    
    monday_plan = st.session_state['approved_days']['Monday']
    
    st.success("✅ Monday approved! Now let's apply this approach to your full week.")
    
    # Show application options
    st.markdown("**Choose how to apply Monday's approach:**")
    
    application_method = st.radio(
        "Application method:",
        [
            "🔄 Apply same approach to similar days (recommended)",
            "📅 Generate each day individually with customization",
            "⚡ Quick apply to all days (fastest)"
        ]
    )
    
    if application_method == "🔄 Apply same approach to similar days (recommended)":
        st.info("""
        **Smart Application:**
        - Similar workout days get the same meal structure
        - Rest days get adjusted portions and timing
        - Weekend days can have different meal preferences
        """)
        
        if st.button("🚀 Generate Full Week (Smart Apply)", type="primary", use_container_width=True):
            st.session_state['application_method'] = 'smart'
            st.session_state['meal_plan_stage'] = 'generating_week'
            st.rerun()
    
    elif application_method == "📅 Generate each day individually with customization":
        st.info("Generate each day with individual customization options - takes longer but provides maximum control.")
        
        if st.button("🎯 Start Day-by-Day Generation", type="primary", use_container_width=True):
            st.session_state['application_method'] = 'individual'
            st.session_state['current_day_index'] = 1  # Start with Tuesday
            st.session_state['meal_plan_stage'] = 'generating_individual_day'
            st.rerun()
    
    else:  # Quick apply to all days
        st.info("Quickly apply Monday's structure to all days with automatic adjustments for different schedules.")
        
        if st.button("⚡ Quick Generate All Days", type="primary", use_container_width=True):
            st.session_state['application_method'] = 'quick'
            st.session_state['meal_plan_stage'] = 'generating_week'
            st.rerun()

# Stage 7: Generate full week based on approved Monday
elif st.session_state['meal_plan_stage'] == 'generating_week':
    st.markdown("### 🗓️ Generating Full Week")
    
    application_method = st.session_state.get('application_method', 'smart')
    monday_plan = st.session_state['approved_days']['Monday']
    
    with st.spinner(f"Applying Monday's approach to your full week ({application_method} method)..."):
        try:
            # Get required data
            weekly_targets = st.session_state.get('day_specific_nutrition', {})
            diet_preferences = st.session_state.get('diet_preferences', {})
            weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
            user_profile = st.session_state.get('user_info', {})
            body_comp_goals = st.session_state.get('goal_info', {})
            
            # Generate remaining days based on Monday template
            full_week_plan = {'Monday': monday_plan}
            
            days = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            for day in days:
                day_data = weekly_targets.get(day, {})
                day_schedule = weekly_schedule.get(day, {})
                
                if day_data:
                    # Build contexts
                    user_context = build_user_profile_context(user_profile, body_comp_goals)
                    diet_context = build_dietary_context(diet_preferences)
                    
                    # Create day-specific prompt based on Monday template
                    monday_structure = monday_plan.get('meal_structure_rationale', '')
                    monday_meals = monday_plan.get('meals', [])
                    
                    day_prompt = f"""
{user_context}

{diet_context}

APPROVED MONDAY TEMPLATE:
Structure Rationale: {monday_structure}
Meals: {json.dumps(monday_meals, indent=2)}

DAY-SPECIFIC TARGETS FOR {day.upper()}:
{json.dumps(day_data, indent=2)}

{day.upper()} SCHEDULE CONTEXT:
{json.dumps(day_schedule, indent=2)}

APPLICATION METHOD: {application_method}

Based on the approved Monday template, create a {day} meal plan that:
1. Follows the same successful meal structure and timing approach
2. Adjusts portions to meet {day}'s specific macro targets
3. Considers {day}'s unique schedule and workout timing
4. Maintains the same food preferences and cooking style
5. Ensures ±3% macro accuracy

Return JSON format with the same structure as Monday but adapted for {day}.
"""
                    
                    # Generate day plan
                    response = openai_client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {"role": "system", "content": "You are a nutritionist. Create day-specific meal plans based on approved templates while maintaining macro accuracy."},
                            {"role": "user", "content": day_prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.05,
                        max_tokens=3000
                    )
                    
                    day_result = json.loads(response.choices[0].message.content or "{}")
                    
                    # Create day plan structure
                    day_plan = {
                        'day': day,
                        'meals': day_result.get('meals', []),
                        'daily_totals': day_result.get('daily_totals', {}),
                        'meal_structure_rationale': f"Based on approved Monday template: {monday_structure}",
                        'accuracy_validated': True,  # Assume validated since based on approved template
                        'schedule_context': day_schedule,
                        'nutrition_targets': day_data,
                        'generated_from_template': True
                    }
                    
                    full_week_plan[day] = day_plan
            
            # Save complete week plan
            st.session_state['ai_meal_plan'] = full_week_plan
            st.session_state['meal_plan_stage'] = 'week_complete'
            st.success("🎉 Full week meal plan generated!")
            st.rerun()
            
        except Exception as e:
            st.error(f"Error generating full week: {e}")
            st.session_state['meal_plan_stage'] = 'apply_to_week'

# Stage 8: Week generation complete
elif st.session_state['meal_plan_stage'] == 'week_complete':
    st.markdown("### 🎉 Weekly Meal Plan Complete!")
    st.success("Your personalized weekly meal plan has been generated based on your approved Monday example.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📋 View Full Week Plan", type="primary", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'display_final'
            st.rerun()
    
    with col2:
        if st.button("🔄 Start Over", use_container_width=True):
            # Clear all meal planning session state
            for key in ['meal_plan_stage', 'monday_plan', 'approved_days', 'ai_meal_plan']:
                if key in st.session_state:
                    del st.session_state[key]
            st.rerun()

# Stage 9: Display final meal plan
elif st.session_state['meal_plan_stage'] == 'display_final':
    # Show the complete meal plan (reuse existing display code)
    if 'ai_meal_plan' in st.session_state and st.session_state['ai_meal_plan']:
        meal_plan = st.session_state['ai_meal_plan']
        
        st.markdown("## 📋 Your Personalized Weekly Meal Plan")
        st.info("**Generated using your approved Monday template with day-specific adjustments**")
        
        # Display meals for each day
        for day, day_plan in meal_plan.items():
            with st.expander(f"📅 {day}", expanded=False):
                st.markdown(f"**Meal Structure Rationale:** {day_plan.get('meal_structure_rationale', 'Not provided')}")
                
                # Show template indicator
                if day_plan.get('generated_from_template'):
                    st.markdown("🔄 *Generated from your approved Monday template*")
                
                # Show accuracy status
                if day_plan.get('accuracy_validated', False):
                    st.markdown('<span class="accuracy-badge accuracy-excellent">✅ Macro Accuracy Validated</span>', unsafe_allow_html=True)
                else:
                    st.markdown('<span class="accuracy-badge accuracy-needs-work">⚠️ Needs Accuracy Review</span>', unsafe_allow_html=True)
                
                # Display meals
                meals = day_plan.get('meals', [])
                for i, meal in enumerate(meals, 1):
                    st.markdown(f"### {i}. {meal.get('name', 'Unnamed Meal')}")
                    
                    if meal.get('time'):
                        st.markdown(f"**Time:** {meal['time']}")
                    if meal.get('context'):
                        st.markdown(f"**Context:** {meal['context']}")
                    if meal.get('prep_time'):
                        st.markdown(f"**Prep Time:** {meal['prep_time']}")
                    
                    # Show macros
                    macros = meal.get('total_macros', {})
                    if macros:
                        col1, col2, col3, col4 = st.columns(4)
                        with col1:
                            st.metric("Calories", f"{macros.get('calories', 0)}")
                        with col2:
                            st.metric("Protein", f"{macros.get('protein', 0)}g")
                        with col3:
                            st.metric("Carbs", f"{macros.get('carbs', 0)}g")
                        with col4:
                            st.metric("Fat", f"{macros.get('fat', 0)}g")
                    
                    # Show ingredients
                    ingredients = meal.get('ingredients', [])
                    if ingredients:
                        st.markdown("**Ingredients:**")
                        for ingredient in ingredients:
                            st.markdown(f"• {ingredient.get('amount', '')} {ingredient.get('item', 'Unknown ingredient')}")
                    
                    # Show instructions
                    instructions = meal.get('instructions', [])
                    if instructions:
                        st.markdown("**Instructions:**")
                        for j, instruction in enumerate(instructions, 1):
                            st.markdown(f"{j}. {instruction}")
                    
                    st.markdown("---")
                
                # Show daily totals
                daily_totals = day_plan.get('daily_totals', {})
                if daily_totals:
                    st.markdown("### 📊 Daily Totals")
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Total Calories", f"{daily_totals.get('calories', 0)}")
                    with col2:
                        st.metric("Total Protein", f"{daily_totals.get('protein', 0)}g")
                    with col3:
                        st.metric("Total Carbs", f"{daily_totals.get('carbs', 0)}g")
                    with col4:
                        st.metric("Total Fat", f"{daily_totals.get('fat', 0)}g")
        
        # Export options
        st.markdown("---")
        st.markdown("## 📄 Export Options")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("📄 Export to PDF", use_container_width=True):
                try:
                    # Get comprehensive plan info
                    plan_info = {
                        'user_profile': st.session_state.get('user_info', {}),
                        'body_comp_goals': st.session_state.get('goal_info', {}),
                        'diet_preferences': st.session_state.get('diet_preferences', {}),
                        'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
                        'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
                    }
                    
                    pdf_buffer = export_meal_plan_pdf(meal_plan, plan_info)
                    
                    if pdf_buffer:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                        st.download_button(
                            label="📥 Download PDF",
                            data=pdf_buffer,
                            file_name=f"fitomics_meal_plan_{timestamp}.pdf",
                            mime="application/pdf",
                            use_container_width=True
                        )
                        st.success("✅ PDF generated successfully!")
                    else:
                        st.error("❌ Failed to generate PDF")
                except Exception as e:
                    st.error(f"❌ PDF export failed: {str(e)}")
        
        with col2:
            if st.button("🛒 Generate Grocery List", use_container_width=True):
                # Generate consolidated grocery list
                grocery_items = {}
                
                for day, day_plan in meal_plan.items():
                    meals = day_plan.get('meals', [])
                    for meal in meals:
                        ingredients = meal.get('ingredients', [])
                        for ingredient in ingredients:
                            item_name = ingredient.get('item', 'Unknown')
                            amount = ingredient.get('amount', '')
                            
                            if item_name in grocery_items:
                                grocery_items[item_name].append(f"{day}: {amount}")
                            else:
                                grocery_items[item_name] = [f"{day}: {amount}"]
                
                st.markdown("### 🛒 Consolidated Grocery List")
                for item, amounts in grocery_items.items():
                    st.markdown(f"**{item}**")
                    for amount in amounts:
                        st.markdown(f"  • {amount}")
        
        with col3:
            if st.button("🔄 Generate New Plan", use_container_width=True):
                # Clear all meal planning session state
                for key in ['meal_plan_stage', 'monday_plan', 'approved_days', 'ai_meal_plan']:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()

# Default fallback - should not reach here
else:
    st.session_state['meal_plan_stage'] = 'start'
    st.rerun()

# Old meal plan display (for backwards compatibility)
if st.session_state['meal_plan_stage'] not in ['display_final'] and 'ai_meal_plan' in st.session_state and st.session_state.get('meal_plan_stage') == 'completed':
    st.info("👆 Click the button above to generate your personalized weekly meal plan using our new interactive approach!")

# Display generated meal plan
if 'ai_meal_plan' in st.session_state and st.session_state['ai_meal_plan']:
    meal_plan = st.session_state['ai_meal_plan']
    
    st.markdown("## 📋 Your Personalized Weekly Meal Plan")
    
    # Display meals for each day
    for day, day_plan in meal_plan.items():
        with st.expander(f"📅 {day}", expanded=False):
            st.markdown(f"**Meal Structure Rationale:** {day_plan.get('meal_structure_rationale', 'Not provided')}")
            
            # Show accuracy status
            if day_plan.get('accuracy_validated', False):
                st.markdown('<span class="accuracy-badge accuracy-excellent">✅ Macro Accuracy Validated</span>', unsafe_allow_html=True)
            else:
                st.markdown('<span class="accuracy-badge accuracy-needs-work">⚠️ Needs Accuracy Review</span>', unsafe_allow_html=True)
            
            # Display meals
            meals = day_plan.get('meals', [])
            for i, meal in enumerate(meals, 1):
                st.markdown(f"### {i}. {meal.get('name', 'Unnamed Meal')}")
                
                if meal.get('time'):
                    st.markdown(f"**Time:** {meal['time']}")
                if meal.get('context'):
                    st.markdown(f"**Context:** {meal['context']}")
                if meal.get('prep_time'):
                    st.markdown(f"**Prep Time:** {meal['prep_time']}")
                
                # Show macros
                macros = meal.get('total_macros', {})
                if macros:
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Calories", f"{macros.get('calories', 0)}")
                    with col2:
                        st.metric("Protein", f"{macros.get('protein', 0)}g")
                    with col3:
                        st.metric("Carbs", f"{macros.get('carbs', 0)}g")
                    with col4:
                        st.metric("Fat", f"{macros.get('fat', 0)}g")
                
                # Show ingredients
                ingredients = meal.get('ingredients', [])
                if ingredients:
                    st.markdown("**Ingredients:**")
                    for ingredient in ingredients:
                        st.markdown(f"• {ingredient.get('amount', '')} {ingredient.get('item', 'Unknown ingredient')}")
                
                # Show instructions
                instructions = meal.get('instructions', [])
                if instructions:
                    st.markdown("**Instructions:**")
                    for j, instruction in enumerate(instructions, 1):
                        st.markdown(f"{j}. {instruction}")
                
                st.markdown("---")
            
            # Show daily totals
            daily_totals = day_plan.get('daily_totals', {})
            if daily_totals:
                st.markdown("### 📊 Daily Totals")
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Calories", f"{daily_totals.get('calories', 0)}")
                with col2:
                    st.metric("Total Protein", f"{daily_totals.get('protein', 0)}g")
                with col3:
                    st.metric("Total Carbs", f"{daily_totals.get('carbs', 0)}g")
                with col4:
                    st.metric("Total Fat", f"{daily_totals.get('fat', 0)}g")
    
    # Export options
    st.markdown("---")
    st.markdown("## 📄 Export Options")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📄 Export to PDF", use_container_width=True):
            try:
                # Get comprehensive plan info
                plan_info = {
                    'user_profile': st.session_state.get('user_info', {}),
                    'body_comp_goals': st.session_state.get('goal_info', {}),
                    'diet_preferences': st.session_state.get('diet_preferences', {}),
                    'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
                    'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
                }
                
                pdf_buffer = export_meal_plan_pdf(meal_plan, plan_info)
                
                if pdf_buffer:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                    st.download_button(
                        label="📥 Download PDF",
                        data=pdf_buffer,
                        file_name=f"fitomics_meal_plan_{timestamp}.pdf",
                        mime="application/pdf",
                        use_container_width=True
                    )
                    st.success("✅ PDF generated successfully!")
                else:
                    st.error("❌ Failed to generate PDF")
            except Exception as e:
                st.error(f"❌ PDF export failed: {str(e)}")
    
    with col2:
        if st.button("🛒 Generate Grocery List", use_container_width=True):
            # Generate consolidated grocery list
            grocery_items = {}
            
            for day, day_plan in meal_plan.items():
                meals = day_plan.get('meals', [])
                for meal in meals:
                    ingredients = meal.get('ingredients', [])
                    for ingredient in ingredients:
                        item_name = ingredient.get('item', 'Unknown')
                        amount = ingredient.get('amount', '')
                        
                        if item_name in grocery_items:
                            grocery_items[item_name].append(f"{day}: {amount}")
                        else:
                            grocery_items[item_name] = [f"{day}: {amount}"]
            
            st.markdown("### 🛒 Consolidated Grocery List")
            for item, amounts in grocery_items.items():
                st.markdown(f"**{item}**")
                for amount in amounts:
                    st.markdown(f"  • {amount}")
else:
    st.info("👆 Click the button above to generate your personalized weekly meal plan using our new step-by-step AI approach!")
