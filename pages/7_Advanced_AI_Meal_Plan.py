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
    """Get OpenAI client if API key is available"""
    try:
        import openai
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return openai.OpenAI(api_key=api_key)
    except ImportError:
        pass
    return None

def generate_weekly_ai_meal_plan(weekly_targets, diet_preferences, weekly_schedule, openai_client, user_profile=None, body_comp_goals=None):
    """Generate complete weekly AI meal plan using OpenAI with comprehensive context"""
    weekly_meal_plan = {}
    
    # Build comprehensive user context for better meal planning
    user_context = ""
    if user_profile:
        user_context += f"""
USER PROFILE:
- Age: {user_profile.get('age', 'Not specified')} years
- Gender: {user_profile.get('gender', 'Not specified')}
- Height: {user_profile.get('height_ft', 'Not specified')}'{user_profile.get('height_in', '')}\"
- Activity Level: {user_profile.get('activity_level', 'Not specified')}
- Experience Level: {user_profile.get('experience_level', 'Not specified')}
"""
    
    if body_comp_goals:
        user_context += f"""
BODY COMPOSITION GOALS:
- Primary Goal: {body_comp_goals.get('goal_type', 'Not specified')}
- Current Weight: {user_profile.get('weight_lbs', 'Not specified')} lbs
- Target Weight: {st.session_state.get('target_weight_lbs', 'Not specified')} lbs
- Target Body Fat: {st.session_state.get('target_bf', 'Not specified')}%
- Timeline: {st.session_state.get('timeline_weeks', 'Not specified')} weeks
"""
    
    # Enhanced dietary preferences context
    dietary_restrictions = diet_preferences.get('dietary_restrictions', [])
    diet_context = f"""
DIETARY PREFERENCES & RESTRICTIONS:
- Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- Allergies: {', '.join(diet_preferences.get('allergies', []))}
- Disliked Foods: {', '.join(diet_preferences.get('disliked_foods', [])[:5])}

FOOD PREFERENCES:
- Preferred Proteins: {', '.join(diet_preferences.get('preferred_proteins', [])[:5])}
- Preferred Carbs: {', '.join(diet_preferences.get('preferred_carbs', [])[:5])}
- Preferred Fats: {', '.join(diet_preferences.get('preferred_fats', [])[:5])}
- Preferred Vegetables: {', '.join(diet_preferences.get('preferred_vegetables', [])[:5])}
- Preferred Cuisines: {', '.join(diet_preferences.get('cuisine_preferences', [])[:3])}

PRACTICAL PREFERENCES:
- Cooking Time: {diet_preferences.get('cooking_time_preference', 'Not specified')}
- Budget: {diet_preferences.get('budget_preference', 'Not specified')}
- Meal Sourcing: Home cooking interest - {diet_preferences.get('home_cooking_interest', 'High')}
- Meal Frequency: {diet_preferences.get('meal_frequency', 'Not specified')}

VARIETY PREFERENCES:
- Variety Level: {diet_preferences.get('variety_level', 'Moderate Variety')}
- Repetition Preference: {diet_preferences.get('repetition_preference', 'I like some repetition but with variations')}
- Weekly Structure: {diet_preferences.get('weekly_structure', 'Mix of routine and variety')}
- Cooking Variety: {diet_preferences.get('cooking_variety', 'Some variety in cooking methods')}
"""
    
    for day, day_data in weekly_targets.items():
        try:
            # Get day-specific schedule information
            schedule_info = weekly_schedule.get(day, {})
            
            # Build comprehensive day-specific prompt
            prompt = f"""
Create a complete, personalized meal plan for {day} with the following comprehensive specifications:

{user_context}

{diet_context}

DAILY NUTRITION TARGETS:
{json.dumps(day_data['meal_targets'], indent=2)}

DAILY SCHEDULE CONTEXT:
- Wake time: {schedule_info.get('wake_time', '07:00')}
- Sleep time: {schedule_info.get('bed_time', '23:00')}
- Work schedule: {schedule_info.get('work_start', 'N/A')} - {schedule_info.get('work_end', 'N/A')}
- Workout day: {len(schedule_info.get('workouts', [])) > 0}
- Workout times: {', '.join([f"{w.get('time', 'N/A')} ({w.get('duration', 0)}min {w.get('type', 'workout')})" for w in schedule_info.get('workouts', [])])}
- Estimated TDEE: {schedule_info.get('total_calories', 2000)} calories

MEAL SCHEDULE & CONTEXTS:
- Scheduled meals with times and contexts from user's weekly schedule

CRITICAL REQUIREMENTS - MUST BE FOLLOWED EXACTLY:

1. **MACRO ACCURACY (HIGHEST PRIORITY)**:
   - Each meal MUST match its target macros within ±3% tolerance (not ±5% or ±10%)
   - Daily totals MUST match daily targets within ±3% tolerance
   - Calculate each ingredient's exact macros using standard USDA nutrition data
   - Verify total meal macros add up correctly before including in response
   - If a meal doesn't hit targets, INCREASE portion sizes and add calorie-dense ingredients
   - Use calorie-dense ingredients: nuts, oils, avocado, cheese, nut butters to boost calories
   - Add cooking oils (olive oil, coconut oil, butter) generously to increase fat and calories
   - Include larger protein portions (6-8oz meat, 1-2 cups legumes) to hit protein targets
   - Use calorie-dense carbs (quinoa, oats, sweet potatoes, rice) in adequate amounts
   - Example: If target is 500 calories, acceptable range is 485-515 calories
   - CRITICAL: Ensure daily totals sum to match the specified daily targets exactly - err on the side of slightly higher rather than lower

2. **INGREDIENT PRECISION**:
   - Use specific quantities: "150g chicken breast" not "1 serving chicken"
   - Include exact macro values for each ingredient
   - Use common portion sizes that are easy to measure
   - Ensure ingredient macros are nutritionally accurate

3. **MEAL CONTEXT OPTIMIZATION**:
   - Pre-Workout: Lower fat (<10g), moderate carbs (20-40g), some protein (15-25g)
   - Post-Workout: Higher protein (25-40g), moderate-high carbs (30-50g), lower fat (<15g)
   - Regular meals: Balanced distribution based on targets
   - Snacks: Smaller portions, typically 10-25% of daily targets

4. **VARIETY CONTROL**: Apply user's variety preferences - {diet_preferences.get('variety_level', 'Moderate Variety')}
   - For "Low Variety": Use similar meal structures with minor variations (same proteins, rotate sides)
   - For "Moderate Variety": Mix familiar and new meals with some repetition (2-3 different proteins per week)
   - For "High Variety": Create mostly different meals with occasional repeats (different proteins, cooking methods, cuisines)
   - For "Maximum Variety": Ensure each meal is unique and creative (different proteins, varied cuisines, diverse cooking methods)
   - ENFORCE VARIETY: Track ingredients used and actively avoid repetition based on user preference level

5. **PRACTICAL CONSIDERATIONS**:
   - Cooking time: {diet_preferences.get('cooking_time_preference', 'Not specified')}
   - Budget: {diet_preferences.get('budget_preference', 'Not specified')}
   - Meal timing around workouts and work schedule
   - {diet_preferences.get('repetition_preference', 'I like some repetition but with variations')}
   - {diet_preferences.get('weekly_structure', 'Mix of routine and variety')}
   - {diet_preferences.get('cooking_variety', 'Some variety in cooking methods')}

6. **FLAVOR AND SEASONING REQUIREMENTS**:
   - Spice Level: {diet_preferences.get('spice_level', 'Medium')} - adjust heat accordingly
   - Flavor Profiles: {', '.join(diet_preferences.get('flavor_profile', ['Savory/Umami', 'Herbal']))} - emphasize these tastes
   - Preferred Seasonings: {', '.join(diet_preferences.get('preferred_seasonings', ['Salt', 'Black Pepper', 'Garlic Powder', 'Oregano']))} - use these in recipes
   - Cooking Enhancers: {', '.join(diet_preferences.get('cooking_enhancers', ['Olive Oil', 'Lemon Juice', 'Garlic']))} - incorporate these for flavor
   - CRITICAL: Include specific seasoning recommendations in each recipe's instructions
   - Make meals flavorful and appetizing, not bland or boring

7. **QUALITY ASSURANCE**:
   - Double-check all calculations before providing response
   - Ensure daily totals sum correctly across all meals
   - Verify no ingredient conflicts with dietary restrictions or allergies
   - Make sure portion sizes are realistic and practical

**MANDATORY JSON FORMAT** - Follow this structure exactly:
{{
  "meals": [
    {{
      "name": "meal name matching schedule",
      "time": "scheduled time",
      "context": "meal context from schedule",
      "ingredients": [
        {{"item": "specific food name", "amount": "exact quantity with unit", "calories": precise_number, "protein": precise_number, "carbs": precise_number, "fat": precise_number}}
      ],
      "instructions": "step-by-step preparation instructions",
      "total_macros": {{"calories": sum_of_ingredient_calories, "protein": sum_of_ingredient_protein, "carbs": sum_of_ingredient_carbs, "fat": sum_of_ingredient_fat}}
    }}
  ],
  "daily_totals": {{"calories": sum_of_all_meal_calories, "protein": sum_of_all_meal_protein, "carbs": sum_of_all_meal_carbs, "fat": sum_of_all_meal_fat}}
}}

**VALIDATION CHECKLIST** - Verify before responding:
✓ Each meal's total_macros equals sum of its ingredients
✓ Daily_totals equals sum of all meal total_macros
✓ Each meal hits its individual target within ±3%
✓ Daily totals hit overall targets within ±3% (THIS IS CRITICAL)
✓ All ingredient amounts are specific and measurable
✓ All macro values are realistic and nutritionally accurate
✓ Variety level is properly applied (no excessive repetition)
✓ Meal context matches daily schedule requirements

**FINAL VALIDATION STEP**:
Before providing your response:
1. Calculate the daily totals by summing all meal macros
2. Compare these totals to the daily targets provided
3. If any macro is outside ±3% tolerance, INCREASE ingredient portions appropriately
4. Add calorie-dense ingredients (nuts, oils, larger portions) to boost low macros
5. Ensure the adjusted totals meet the targets within ±3%
6. Only then provide your final JSON response

Remember: The user needs these exact macros for precise body composition goals. Accuracy is paramount - err on the side of slightly higher calories rather than lower.
"""

            response = openai_client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages=[
                    {"role": "system", "content": f"You are a professional nutritionist and meal planning expert with expertise in precise macro calculations. You MUST create meal plans that exactly match the specified macro targets within ±3% tolerance. Always double-check your calculations and ensure ingredient macros are nutritionally accurate. Use calorie-dense ingredients and larger portions to hit higher targets. Prioritize macro accuracy above all other considerations. You are creating a {day} meal plan."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,  # Even lower temperature for maximum calculation consistency
                max_tokens=4000  # Increased for more detailed responses and validation
            )
            
            day_plan = json.loads(response.choices[0].message.content)
            
            # Validate macro accuracy and provide feedback
            if validate_meal_plan_accuracy(day_plan, day_data, day):
                weekly_meal_plan[day] = day_plan
            else:
                st.warning(f"⚠️ {day} meal plan generated but may have macro accuracy issues. Check the results carefully.")
                weekly_meal_plan[day] = day_plan
            
        except Exception as e:
            st.error(f"AI meal generation failed for {day}: {e}")
            continue
    
    return weekly_meal_plan

def validate_meal_plan_accuracy(day_plan, day_targets, day_name):
    """Validate that generated meal plan matches targets within acceptable tolerance"""
    try:
        # Extract daily totals from generated plan
        generated_totals = day_plan.get('daily_totals', {})
        
        # Calculate target totals from individual meal targets
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
            return False
        else:
            print(f"✅ {day_name} macro accuracy validated")
            return True
            
    except Exception as e:
        print(f"⚠️ Error validating {day_name} meal plan: {e}")
        return False

def generate_ai_meal_plan(meal_targets, diet_preferences, meal_config, openai_client):
    """Generate complete daily AI meal plan using OpenAI (legacy single-day function)"""
    try:
        # Build comprehensive prompt
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
- Number of snacks: {meal_config.get('num_snacks', 1)}
- Training day: {meal_config.get('is_training_day', True)}

Please create realistic meals with:
1. Specific food items and portions
2. Accurate macro calculations matching targets (±10% tolerance)
3. Practical cooking instructions
4. Consideration for meal timing around workouts
5. Variety and palatability

Format as JSON with this structure:
{{
  "breakfast": {{
    "name": "meal name",
    "ingredients": [
      {{"item": "food name", "amount": "portion", "calories": number, "protein": number, "carbs": number, "fat": number}}
    ],
    "instructions": "cooking steps",
    "total_macros": {{"calories": number, "protein": number, "carbs": number, "fat": number}},
    "timing": "suggested time"
  }},
  "lunch": {{ ... }},
  "dinner": {{ ... }},
  "snack": {{ ... }}
}}
"""

        response = openai_client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {"role": "system", "content": "You are a nutrition expert who creates precise meal plans with accurate macro calculations."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        st.error(f"AI meal generation failed: {e}")
        return None

# Page Setup
st.set_page_config(page_title="Advanced AI Meal Plan", layout="wide")
st.title("🧠 Advanced AI Meal Plan")
st.markdown("*Generate complete weekly meal plans optimized for your body composition goals, schedule, and preferences*")

# Add session management controls to sidebar
add_session_controls()

# Initialize nutrition cache
if 'nutrition_cache' not in st.session_state:
    st.session_state.nutrition_cache = NutritionCache()

# Check for required data
if not st.session_state.get('weekly_schedule_v2') or not st.session_state.get('day_specific_nutrition'):
    st.warning("⚠️ **Weekly schedule and nutrition targets required**")
    st.markdown("To generate AI meal plans, you need to complete:")
    st.markdown("1. **Body Composition Goals** - Set your targets")
    st.markdown("2. **Weekly Schedule** - Plan your daily activities") 
    st.markdown("3. **Nutrition Targets** - Calculate daily nutrition needs")
    st.markdown("4. **Diet Preferences** - Set dietary restrictions and preferences")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📊 Go to Body Composition Goals", use_container_width=True):
            st.switch_page("pages/2_Body_Composition_Goals.py")
    with col2:
        if st.button("📅 Go to Weekly Schedule", use_container_width=True):
            st.switch_page("pages/4_Weekly_Schedule.py")
    st.stop()

# Display current sync status
st.success("✅ **Sync Profile Mode Active** - Using your personalized body composition targets and weekly schedule")

# Show comprehensive weekly overview
with st.expander("📋 Complete Weekly Overview", expanded=True):
    st.markdown("**Summary of all your selections and calculations:**")
    
    # Get all data sources with correct session state keys
    weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
    day_nutrition = st.session_state.get('day_specific_nutrition', {})
    body_comp_goals = st.session_state.get('goal_info', {})  # Corrected key name
    initial_setup = st.session_state.get('user_info', {})  # Corrected key name
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
    
    # Display comprehensive summary information from all previous steps
    st.markdown("---")
    st.markdown("### 📋 Complete Setup Summary")
    st.markdown("*This information will be used to generate your personalized weekly meal plan*")
    
    # Create three columns for organized summary
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("**👤 Initial Setup:**")
        if initial_setup:
            st.write(f"• **Name:** {initial_setup.get('name', 'Not set')}")
            st.write(f"• **Age:** {initial_setup.get('age', 'Not set')} years")
            st.write(f"• **Gender:** {initial_setup.get('gender', 'Not set')}")
            height_ft = initial_setup.get('height_ft', 0)
            height_in = initial_setup.get('height_in', 0)
            if height_ft and height_in:
                st.write(f"• **Height:** {height_ft}'{height_in}\"")
            st.write(f"• **Activity Level:** {initial_setup.get('activity_level', 'Not set')}")
            st.write(f"• **Workout Frequency:** {initial_setup.get('workout_frequency', 'Not set')}")
            st.write(f"• **Goal Focus:** {initial_setup.get('goal_focus', 'Not set')}")
        else:
            st.info("Initial Setup not completed - will use default values")
            
        st.markdown("**📊 Body Composition Goals:**")
        if body_comp_goals:
            st.write(f"• **Primary Goal:** {body_comp_goals.get('goal_type', 'Not set')}")
            st.write(f"• **Current Weight:** {initial_setup.get('weight_lbs', 'Not set')} lbs")
            st.write(f"• **Target Weight:** {st.session_state.get('target_weight_lbs', 'Not set')} lbs")
            st.write(f"• **Target Body Fat:** {st.session_state.get('target_bf', 'Not set')}%")
            st.write(f"• **Timeline:** {st.session_state.get('timeline_weeks', 'Not set')} weeks")
            
            # Calculate weekly change rate
            current_weight = initial_setup.get('weight_lbs', 0)
            target_weight = st.session_state.get('target_weight_lbs', 0)
            timeline = st.session_state.get('timeline_weeks', 1)
            if current_weight and target_weight and timeline:
                weekly_change = (target_weight - current_weight) / timeline
                change_type = "gain" if weekly_change > 0 else "loss"
                st.write(f"• **Weekly Target:** {abs(weekly_change):.1f} lbs {change_type}/week")
        else:
            st.info("Body Composition Goals not set - will use default targets")
    
    with col2:
        st.markdown("**🥗 Diet Preferences:**")
        if diet_prefs:
            # Dietary restrictions from actual session state structure
            restrictions = diet_prefs.get('dietary_restrictions', [])
            if restrictions:
                st.write(f"• **Dietary Restrictions:** {', '.join(restrictions)}")
            else:
                st.write("• **Dietary Restrictions:** None")
            
            # Allergies
            allergies = diet_prefs.get('allergies', [])
            if allergies:
                st.write(f"• **Allergies:** {', '.join(allergies)}")
            
            # Disliked foods
            disliked_foods = diet_prefs.get('disliked_foods', [])
            if disliked_foods:
                st.write(f"• **Disliked Foods:** {', '.join(disliked_foods[:3])}{'...' if len(disliked_foods) > 3 else ''}")
            
            # Food preferences
            st.write(f"• **Meal Frequency:** {diet_prefs.get('meal_frequency', 'Not set')}")
            st.write(f"• **Cooking Time:** {diet_prefs.get('cooking_time_preference', 'Not set')}")
            st.write(f"• **Budget:** {diet_prefs.get('budget_preference', 'Not set')}")
            st.write(f"• **Home Cooking Interest:** {diet_prefs.get('home_cooking_interest', 'Not set')}")
            
            # Variety preferences
            variety_level = diet_prefs.get('variety_level', 'Not set')
            repetition_preference = diet_prefs.get('repetition_preference', 'Not set')
            weekly_structure = diet_prefs.get('weekly_structure', 'Not set')
            
            st.write(f"• **Variety Level:** {variety_level}")
            st.write(f"• **Repetition Preference:** {repetition_preference}")
            st.write(f"• **Weekly Structure:** {weekly_structure}")
            
            # Preferred foods
            preferred_proteins = diet_prefs.get('preferred_proteins', [])
            preferred_carbs = diet_prefs.get('preferred_carbs', [])
            preferred_fats = diet_prefs.get('preferred_fats', [])
            preferred_vegetables = diet_prefs.get('preferred_vegetables', [])
            
            if preferred_proteins:
                st.write(f"• **Preferred Proteins:** {', '.join(preferred_proteins[:3])}{'...' if len(preferred_proteins) > 3 else ''}")
            if preferred_carbs:
                st.write(f"• **Preferred Carbs:** {', '.join(preferred_carbs[:3])}{'...' if len(preferred_carbs) > 3 else ''}")
            if preferred_vegetables:
                st.write(f"• **Preferred Vegetables:** {', '.join(preferred_vegetables[:3])}{'...' if len(preferred_vegetables) > 3 else ''}")
                
            # Cuisine preferences (correct key name)
            preferred_cuisines = diet_prefs.get('cuisine_preferences', [])
            if preferred_cuisines:
                st.write(f"• **Preferred Cuisines:** {', '.join(preferred_cuisines[:3])}{'...' if len(preferred_cuisines) > 3 else ''}")
        else:
            st.warning("Diet Preferences not set")
    
    with col3:
        st.markdown("**📅 Weekly Schedule Summary:**")
        if weekly_schedule:
            # Calculate weekly totals
            total_workouts = 0
            total_meals = 0
            total_snacks = 0
            workout_days = []
            rest_days = []
            
            for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
                schedule = weekly_schedule.get(day, {})
                workouts = schedule.get('workouts', [])
                meals = schedule.get('meals', [])
                
                if workouts:
                    total_workouts += len(workouts)
                    workout_days.append(day)
                else:
                    rest_days.append(day)
                    
                total_meals += len([m for m in meals if m.get('type') == 'meal'])
                total_snacks += len([m for m in meals if m.get('type') == 'snack'])
            
            st.write(f"• **Workout Days:** {total_workouts} workouts/week")
            if workout_days:
                st.write(f"  └ {', '.join(workout_days[:3])}{'...' if len(workout_days) > 3 else ''}")
            
            st.write(f"• **Meals per Day:** {total_meals // 7} average")
            st.write(f"• **Snacks per Day:** {total_snacks // 7} average")
            
            # Show sleep and wake patterns
            sample_day = next(iter(weekly_schedule.values())) if weekly_schedule else {}
            wake_time = sample_day.get('wake_time', 'Not set')
            bed_time = sample_day.get('bed_time', 'Not set')
            st.write(f"• **Wake Time:** {wake_time}")
            st.write(f"• **Sleep Time:** {bed_time}")
            
            # Work schedule
            work_start = sample_day.get('work_start', 'Not set')
            work_end = sample_day.get('work_end', 'Not set')
            if work_start != 'Not set' and work_end != 'Not set':
                st.write(f"• **Work Schedule:** {work_start} - {work_end}")
        else:
            st.warning("Weekly Schedule not completed")
            
        st.markdown("**🎯 Nutrition Targets Summary:**")
        if day_nutrition:
            # Calculate average targets
            total_days = len(day_nutrition)
            avg_calories = sum(day.get('calories', 0) for day in day_nutrition.values()) / total_days
            avg_protein = sum(day.get('protein', 0) for day in day_nutrition.values()) / total_days
            avg_carbs = sum(day.get('carbs', 0) for day in day_nutrition.values()) / total_days
            avg_fat = sum(day.get('fat', 0) for day in day_nutrition.values()) / total_days
            
            st.write(f"• **Average Daily Calories:** {avg_calories:,.0f}")
            st.write(f"• **Average Protein:** {avg_protein:.0f}g")
            st.write(f"• **Average Carbs:** {avg_carbs:.0f}g")
            st.write(f"• **Average Fat:** {avg_fat:.0f}g")
            
            # Show range
            min_cal = min(day.get('calories', 0) for day in day_nutrition.values())
            max_cal = max(day.get('calories', 0) for day in day_nutrition.values())
            if min_cal != max_cal:
                st.write(f"• **Calorie Range:** {min_cal:,.0f} - {max_cal:,.0f}")
        else:
            st.warning("Nutrition Targets not calculated")

# Step 1: Dietary Preferences
st.markdown("---")
st.markdown("## 1. Dietary Preferences")

# Use existing preferences if available
existing_prefs = st.session_state.get('diet_preferences', {})

if existing_prefs:
    st.info("Using preferences from Diet Preferences page")
    with st.expander("View Current Preferences", expanded=False):
        # Use correct key names from Diet Preferences page
        dietary_restrictions = existing_prefs.get('dietary_restrictions', [])
        if dietary_restrictions:
            st.write("**Dietary Restrictions:** " + ", ".join(dietary_restrictions))
        else:
            st.write("**Dietary Restrictions:** None")
        
        allergies = existing_prefs.get('allergies', [])
        if allergies:
            st.write("**Allergies:** " + ", ".join(allergies))
        
        st.write(f"**Cooking Time:** {existing_prefs.get('cooking_time_preference', 'Medium (30-60 min)')}")
        st.write(f"**Budget:** {existing_prefs.get('budget_preference', 'Moderate')}")
        st.write(f"**Home Cooking Interest:** {existing_prefs.get('home_cooking_interest', 'High')}")
        st.write(f"**Meal Frequency:** {existing_prefs.get('meal_frequency', 3)}")
        
        # Show preferred foods
        preferred_proteins = existing_prefs.get('preferred_proteins', [])
        preferred_carbs = existing_prefs.get('preferred_carbs', [])
        preferred_vegetables = existing_prefs.get('preferred_vegetables', [])
        preferred_cuisines = existing_prefs.get('cuisine_preferences', [])
        
        if preferred_proteins:
            st.write(f"**Preferred Proteins:** {', '.join(preferred_proteins[:5])}")
        if preferred_carbs:
            st.write(f"**Preferred Carbs:** {', '.join(preferred_carbs[:5])}")
        if preferred_vegetables:
            st.write(f"**Preferred Vegetables:** {', '.join(preferred_vegetables[:5])}")
        if preferred_cuisines:
            st.write(f"**Preferred Cuisines:** {', '.join(preferred_cuisines[:3])}")
else:
    st.warning("No dietary preferences set. Using default preferences.")
    if st.button("📝 Set Diet Preferences", use_container_width=True):
        st.switch_page("pages/3_Diet_Preferences.py")

# Step 2: Weekly Meal Plan Generation
st.markdown("---")
st.markdown("## 2. Generate Weekly Meal Plan")

st.markdown("Your AI meal plan will be optimized for:")
st.markdown("• **Body Composition Goals** - Personalized macro targets for each day")
st.markdown("• **Daily Schedule** - Meal timing around work, workouts, and activities")
st.markdown("• **Meal Contexts** - Pre/post-workout, on-the-go, home cooking, etc.")
st.markdown("• **Weekly Variety** - Different meals each day to prevent boredom")

# Prepare weekly targets for AI generation
def prepare_weekly_targets():
    """Prepare weekly meal targets for AI generation"""
    weekly_targets = {}
    weekly_schedule = st.session_state.weekly_schedule_v2
    day_nutrition = st.session_state.day_specific_nutrition
    
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        schedule = weekly_schedule.get(day, {})
        nutrition = day_nutrition.get(day, {})
        
        # Calculate meal distribution based on number of meals
        meals = schedule.get('meals', [])
        num_meals = len(meals)
        
        # Create meal targets based on actual meal schedule
        meal_targets = {}
        total_calories = nutrition.get('calories', 2000)  # Using correct key name
        total_protein = nutrition.get('protein', 150)
        total_carbs = nutrition.get('carbs', 200)
        total_fat = nutrition.get('fat', 70)
        
        # Distribute macros across scheduled meals
        for i, meal in enumerate(meals):
            # Adjust distribution based on meal context and timing
            if meal['context'] == 'Pre-Workout':
                cal_pct = 0.15  # Lighter, easily digestible
            elif meal['context'] == 'Post-Workout':
                cal_pct = 0.30  # Larger, protein-focused
            elif 'Breakfast' in meal['name']:
                cal_pct = 0.25
            elif 'Lunch' in meal['name']:
                cal_pct = 0.35
            elif 'Dinner' in meal['name']:
                cal_pct = 0.30
            elif 'Snack' in meal['name']:
                cal_pct = 0.10
            else:
                cal_pct = 1.0 / num_meals  # Equal distribution if unclear
            
            # Handle time conversion from time object to string
            meal_time = meal.get('time', '12:00')
            if hasattr(meal_time, 'strftime'):
                meal_time = meal_time.strftime('%H:%M')
            elif not isinstance(meal_time, str):
                meal_time = '12:00'
            
            meal_targets[f"{meal['name']}_{i}"] = {
                'name': meal['name'],
                'time': meal_time,
                'context': meal.get('context', 'Regular meal'),
                'type': meal.get('type', 'meal'),
                'calories': int(total_calories * cal_pct),
                'protein': int(total_protein * cal_pct),
                'carbs': int(total_carbs * cal_pct),
                'fat': int(total_fat * cal_pct)
            }
        
        weekly_targets[day] = {
            'meal_targets': meal_targets,
            'daily_totals': {
                'calories': total_calories,
                'protein': total_protein,
                'carbs': total_carbs,
                'fat': total_fat
            }
        }
    
    return weekly_targets

# Generate weekly meal plan
generation_col1, generation_col2 = st.columns([3, 1])

with generation_col1:
    if st.button("🚀 Generate Complete Weekly Meal Plan", type="primary", use_container_width=True):
        openai_client = get_openai_client()
        
        if not openai_client:
            st.error("OpenAI API key not found. Please add your OPENAI_API_KEY to generate AI meal plans.")
            st.stop()
        
        # Prepare weekly targets and comprehensive context
        weekly_targets = prepare_weekly_targets()
        weekly_schedule = st.session_state.weekly_schedule_v2
        diet_prefs = existing_prefs if existing_prefs else {}
        user_profile = st.session_state.get('user_profile', {})
        body_comp_goals = st.session_state.get('body_composition_goals', {})
        
        with st.spinner("🤖 Creating your personalized weekly meal plan... This may take 1-2 minutes."):
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            weekly_meal_plan = generate_weekly_ai_meal_plan(
                weekly_targets, diet_prefs, weekly_schedule, openai_client, 
                user_profile, body_comp_goals
            )
            
            progress_bar.progress(100)
            status_text.empty()
            
            if weekly_meal_plan:
                st.session_state.generated_weekly_meal_plan = weekly_meal_plan
                st.success("✅ **Weekly meal plan generated successfully!**")
                st.rerun()

with generation_col2:
    st.markdown("**Plan includes:**")
    st.markdown("• 7 days of meals")
    st.markdown("• Recipe instructions")
    st.markdown("• Macro breakdowns")
    st.markdown("• Grocery list")
    st.markdown("• PDF export")

# Step 3: Display Generated Weekly Meal Plan
if 'generated_weekly_meal_plan' in st.session_state:
    st.markdown("---")
    st.markdown("## 3. Your Weekly Meal Plan")
    
    weekly_meal_plan = st.session_state.generated_weekly_meal_plan
    
    # Prepare weekly targets for accuracy comparison
    weekly_targets = prepare_weekly_targets()
    
    # Calculate and display overall accuracy summary
    st.markdown("### 🎯 Macro Accuracy Summary")
    
    accuracy_data = []
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        if day in weekly_meal_plan:
            day_plan = weekly_meal_plan[day]
            day_targets = weekly_targets.get(day, {})
            target_totals = day_targets.get('daily_totals', {})
            generated_totals = day_plan.get('daily_totals', {})
            
            # Calculate accuracy for each macro
            cal_accuracy = "✅" if abs(generated_totals.get('calories', 0) - target_totals.get('calories', 0)) <= target_totals.get('calories', 0) * 0.05 else "⚠️"
            protein_accuracy = "✅" if abs(generated_totals.get('protein', 0) - target_totals.get('protein', 0)) <= target_totals.get('protein', 0) * 0.05 else "⚠️"
            carb_accuracy = "✅" if abs(generated_totals.get('carbs', 0) - target_totals.get('carbs', 0)) <= target_totals.get('carbs', 0) * 0.05 else "⚠️"
            fat_accuracy = "✅" if abs(generated_totals.get('fat', 0) - target_totals.get('fat', 0)) <= target_totals.get('fat', 0) * 0.05 else "⚠️"
            
            accuracy_data.append({
                'Day': day,
                'Calories': f"{generated_totals.get('calories', 0):.0f} / {target_totals.get('calories', 0):.0f} {cal_accuracy}",
                'Protein': f"{generated_totals.get('protein', 0):.0f}g / {target_totals.get('protein', 0):.0f}g {protein_accuracy}",
                'Carbs': f"{generated_totals.get('carbs', 0):.0f}g / {target_totals.get('carbs', 0):.0f}g {carb_accuracy}",
                'Fat': f"{generated_totals.get('fat', 0):.0f}g / {target_totals.get('fat', 0):.0f}g {fat_accuracy}"
            })
    
    if accuracy_data:
        accuracy_df = pd.DataFrame(accuracy_data)
        st.dataframe(accuracy_df, use_container_width=True, hide_index=True)
        st.caption("Format: Generated / Target | ✅ = Within 5% | ⚠️ = Outside 5%")
    
    # Create tabs for each day
    day_tabs = st.tabs(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    
    for i, day in enumerate(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']):
        with day_tabs[i]:
            if day in weekly_meal_plan:
                day_plan = weekly_meal_plan[day]
                
                # Display daily summary
                if 'daily_totals' in day_plan:
                    totals = day_plan['daily_totals']
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Calories", f"{totals['calories']:,}")
                    with col2:
                        st.metric("Protein", f"{totals['protein']}g")
                    with col3:
                        st.metric("Carbs", f"{totals['carbs']}g")
                    with col4:
                        st.metric("Fat", f"{totals['fat']}g")
                
                # Display meals
                if 'meals' in day_plan:
                    for meal in day_plan['meals']:
                        with st.container():
                            st.markdown(f"### {meal['name']} - {meal['time']}")
                            st.markdown(f"**Context:** {meal['context']}")
                            
                            # Display ingredients
                            if 'ingredients' in meal:
                                st.markdown("**Ingredients:**")
                                for ingredient in meal['ingredients']:
                                    st.markdown(f"• {ingredient['amount']} {ingredient['item']} ({ingredient['calories']} cal)")
                            
                            # Display instructions
                            if 'instructions' in meal:
                                st.markdown("**Instructions:**")
                                st.markdown(meal['instructions'])
                            
                            # Display macros with target comparison
                            if 'total_macros' in meal:
                                macros = meal['total_macros']
                                st.markdown(f"**Macros:** {macros['calories']} cal, {macros['protein']}g protein, {macros['carbs']}g carbs, {macros['fat']}g fat")
                                
                                # Show target comparison if available
                                day_targets = weekly_targets.get(day, {})
                                meal_targets = day_targets.get('meal_targets', {})
                                
                                # Find matching meal target
                                meal_target = None
                                for target_key, target_data in meal_targets.items():
                                    if target_data.get('name') == meal.get('name'):
                                        meal_target = target_data
                                        break
                                
                                if meal_target:
                                    # Calculate accuracy
                                    cal_diff = macros['calories'] - meal_target['calories']
                                    protein_diff = macros['protein'] - meal_target['protein']
                                    carb_diff = macros['carbs'] - meal_target['carbs']
                                    fat_diff = macros['fat'] - meal_target['fat']
                                    
                                    # Show comparison
                                    accuracy_color = "green" if abs(cal_diff) <= meal_target['calories'] * 0.05 else "orange"
                                    st.markdown(f"**Target:** {meal_target['calories']} cal, {meal_target['protein']}g protein, {meal_target['carbs']}g carbs, {meal_target['fat']}g fat")
                                    st.markdown(f"**Difference:** <span style='color: {accuracy_color}'>{cal_diff:+.0f} cal, {protein_diff:+.0f}g protein, {carb_diff:+.0f}g carbs, {fat_diff:+.0f}g fat</span>", unsafe_allow_html=True)
                            
                            st.markdown("---")
            else:
                st.warning(f"No meal plan generated for {day}")
    
    # Step 4: Export Options
    st.markdown("---")
    st.markdown("## 4. Export Your Meal Plan")
    
    export_col1, export_col2, export_col3 = st.columns(3)
    
    with export_col1:
        if st.button("📄 Export to PDF", use_container_width=True):
            with st.spinner("Generating PDF meal plan..."):
                try:
                    # Prepare meal data for PDF export
                    meal_data_for_pdf = []
                    all_ingredients = {}
                    
                    for day, day_plan in weekly_meal_plan.items():
                        if 'meals' in day_plan:
                            for meal in day_plan['meals']:
                                meal_info = {
                                    'day': day,
                                    'meal_type': meal['name'],
                                    'time': meal['time'],
                                    'context': meal['context'],
                                    'recipe': {
                                        'name': meal['name'],
                                        'ingredients': meal.get('ingredients', []),
                                        'instructions': meal.get('instructions', ''),
                                        'macros': meal.get('total_macros', {})
                                    }
                                }
                                meal_data_for_pdf.append(meal_info)
                                
                                # Collect ingredients for grocery list
                                if 'ingredients' in meal:
                                    for ingredient in meal['ingredients']:
                                        item = ingredient['item']
                                        amount = ingredient['amount']
                                        if item in all_ingredients:
                                            all_ingredients[item] += f", {amount}"
                                        else:
                                            all_ingredients[item] = amount
                    
                    # Get user preferences for PDF including profile summary
                    user_profile = st.session_state.get('user_info', {})
                    goal_info = st.session_state.get('goal_info', {})
                    diet_preferences = st.session_state.get('diet_preferences', {})
                    
                    user_info = {
                        'name': user_profile.get('name', 'Fitomics User'),
                        'plan_type': 'Weekly Meal Plan',
                        'generation_date': datetime.now().strftime('%B %d, %Y'),
                        'profile': user_profile,
                        'goals': goal_info,
                        'diet_preferences': diet_preferences
                    }
                    
                    # Generate PDF
                    pdf_path = export_meal_plan_pdf(meal_data_for_pdf, user_info)
                    
                    if pdf_path and os.path.exists(pdf_path):
                        st.success("✅ PDF generated successfully!")
                        
                        # Provide download link
                        with open(pdf_path, "rb") as pdf_file:
                            st.download_button(
                                label="⬇️ Download PDF Meal Plan",
                                data=pdf_file.read(),
                                file_name=f"fitomics_weekly_meal_plan_{datetime.now().strftime('%Y%m%d')}.pdf",
                                mime="application/pdf",
                                use_container_width=True
                            )
                    else:
                        st.error("Failed to generate PDF. Please try again.")
                        
                except Exception as e:
                    st.error(f"PDF generation error: {e}")
    
    with export_col2:
        if st.button("🛒 Generate Grocery List", use_container_width=True):
            # Generate consolidated grocery list
            all_ingredients = {}
            
            for day, day_plan in weekly_meal_plan.items():
                if 'meals' in day_plan:
                    for meal in day_plan['meals']:
                        if 'ingredients' in meal:
                            for ingredient in meal['ingredients']:
                                item = ingredient['item']
                                amount = ingredient['amount']
                                if item in all_ingredients:
                                    # Try to combine amounts if possible
                                    all_ingredients[item].append(amount)
                                else:
                                    all_ingredients[item] = [amount]
            
            # Display grocery list
            st.markdown("### 🛒 Weekly Grocery List")
            grocery_items = []
            for item, amounts in all_ingredients.items():
                # Combine amounts
                combined_amount = ", ".join(amounts)
                grocery_items.append(f"• {item}: {combined_amount}")
                
            grocery_text = "\n".join(grocery_items)
            st.text_area("Copy your grocery list:", grocery_text, height=300)
    
    with export_col3:
        if st.button("🔄 Generate New Plan", use_container_width=True):
            if 'generated_weekly_meal_plan' in st.session_state:
                del st.session_state.generated_weekly_meal_plan
            st.rerun()