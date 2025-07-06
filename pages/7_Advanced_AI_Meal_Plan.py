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

def generate_weekly_ai_meal_plan(weekly_targets, diet_preferences, weekly_schedule, openai_client):
    """Generate complete weekly AI meal plan using OpenAI"""
    weekly_meal_plan = {}
    
    for day, day_data in weekly_targets.items():
        try:
            # Get day-specific schedule information
            schedule_info = weekly_schedule.get(day, {})
            
            # Build day-specific prompt
            prompt = f"""
Create a complete meal plan for {day} with the following specifications:

NUTRITION TARGETS:
{json.dumps(day_data['meal_targets'], indent=2)}

DAILY SCHEDULE CONTEXT:
- Wake time: {schedule_info.get('wake_time', '07:00')}
- Sleep time: {schedule_info.get('bed_time', '23:00')}
- Work schedule: {schedule_info.get('work_start', 'N/A')} - {schedule_info.get('work_end', 'N/A')}
- Workout day: {schedule_info.get('has_workout', False)}
- Workout time: {schedule_info.get('workout_time', 'N/A')}
- Workout duration: {schedule_info.get('workout_duration', 0)} minutes
- Estimated TDEE: {schedule_info.get('estimated_tdee', 2000)} calories

MEAL CONTEXTS:
{json.dumps(schedule_info.get('meal_contexts', {}), indent=2)}

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

MEAL SCHEDULE:
{json.dumps([{"name": meal["name"], "time": meal["time"], "context": meal["context"]} for meal in schedule_info.get('meals', [])], indent=2)}

Please create realistic meals considering:
1. Specific food items and portions matching meal contexts (e.g., Pre-Workout = easily digestible, Post-Workout = protein focus)
2. Accurate macro calculations matching targets (±10% tolerance)
3. Practical preparation based on context (On-the-Go = quick prep, Home Cooking = more elaborate)
4. Meal timing around workouts and work schedule
5. Day-specific variety to avoid repetition across the week

Format as JSON with this structure:
{{
  "meals": [
    {{
      "name": "meal name matching schedule",
      "time": "scheduled time",
      "context": "meal context from schedule",
      "ingredients": [
        {{"item": "food name", "amount": "portion", "calories": number, "protein": number, "carbs": number, "fat": number}}
      ],
      "instructions": "context-appropriate preparation steps",
      "total_macros": {{"calories": number, "protein": number, "carbs": number, "fat": number}}
    }}
  ],
  "daily_totals": {{"calories": number, "protein": number, "carbs": number, "fat": number}}
}}
"""

            response = openai_client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages=[
                    {"role": "system", "content": f"You are a nutrition expert creating a {day} meal plan that fits seamlessly into the user's schedule and lifestyle."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.8  # Slightly higher for day-to-day variety
            )
            
            day_plan = json.loads(response.choices[0].message.content)
            weekly_meal_plan[day] = day_plan
            
        except Exception as e:
            st.error(f"AI meal generation failed for {day}: {e}")
            continue
    
    return weekly_meal_plan

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
    
    # Get all data sources
    weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
    day_nutrition = st.session_state.get('day_specific_nutrition', {})
    body_comp_goals = st.session_state.get('body_composition_goals', {})
    initial_setup = st.session_state.get('user_profile', {})
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
            'TDEE': f"{schedule.get('estimated_tdee', 0):.0f}",
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
    
    # Display summary information from previous steps
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**📊 Body Composition Goals:**")
        if body_comp_goals:
            st.write(f"• Goal: {body_comp_goals.get('goal_type', 'Not set')}")
            st.write(f"• Current Weight: {body_comp_goals.get('current_weight_lbs', 'Not set')} lbs")
            st.write(f"• Target Weight: {body_comp_goals.get('target_weight_lbs', 'Not set')} lbs")
            st.write(f"• Timeline: {body_comp_goals.get('timeline_weeks', 'Not set')} weeks")
        else:
            st.write("Not configured")
            
        st.markdown("**👤 User Profile:**")
        if initial_setup:
            st.write(f"• Age: {initial_setup.get('age', 'Not set')}")
            st.write(f"• Gender: {initial_setup.get('gender', 'Not set')}")
            st.write(f"• Height: {initial_setup.get('height_ft', 'Not set')}'{initial_setup.get('height_in', '')}\"")
            st.write(f"• Activity: {initial_setup.get('activity_level', 'Not set')}")
        else:
            st.write("Not configured")
    
    with col2:
        st.markdown("**🥗 Diet Preferences:**")
        if diet_prefs:
            restrictions = []
            if diet_prefs.get('vegetarian'): restrictions.append("Vegetarian")
            if diet_prefs.get('vegan'): restrictions.append("Vegan")
            if diet_prefs.get('gluten_free'): restrictions.append("Gluten-Free")
            if diet_prefs.get('dairy_free'): restrictions.append("Dairy-Free")
            if diet_prefs.get('nut_free'): restrictions.append("Nut-Free")
            if diet_prefs.get('low_sodium'): restrictions.append("Low Sodium")
            
            if restrictions:
                st.write(f"• Restrictions: {', '.join(restrictions)}")
            else:
                st.write("• No dietary restrictions")
                
            st.write(f"• Meal Frequency: {diet_prefs.get('meal_frequency', 'Not set')}")
            st.write(f"• Cooking Time: {diet_prefs.get('cooking_time', 'Not set')}")
            st.write(f"• Budget: {diet_prefs.get('budget_preference', 'Not set')}")
        else:
            st.write("Not configured")
            
        st.markdown("**📅 Weekly Schedule:**")
        if weekly_schedule:
            total_workout_days = sum(1 for day_data in weekly_schedule.values() if day_data.get('workouts', []))
            avg_wake = "Variable" if len(set(d.get('wake_time', '07:00') for d in weekly_schedule.values())) > 1 else list(weekly_schedule.values())[0].get('wake_time', '07:00')
            st.write(f"• Workout Days: {total_workout_days}/7")
            st.write(f"• Wake Time: {avg_wake}")
            st.write(f"• Days Configured: {len(weekly_schedule)}/7")
        else:
            st.write("Not configured")

# Step 1: Dietary Preferences
st.markdown("---")
st.markdown("## 1. Dietary Preferences")

# Use existing preferences if available
existing_prefs = st.session_state.get('diet_preferences', {})

if existing_prefs:
    st.info("Using preferences from Diet Preferences page")
    with st.expander("View Current Preferences", expanded=False):
        prefs_to_show = []
        if existing_prefs.get('vegetarian'): prefs_to_show.append("Vegetarian")
        if existing_prefs.get('vegan'): prefs_to_show.append("Vegan")
        if existing_prefs.get('gluten_free'): prefs_to_show.append("Gluten-Free")
        if existing_prefs.get('dairy_free'): prefs_to_show.append("Dairy-Free")
        if existing_prefs.get('nut_free'): prefs_to_show.append("Nut-Free")
        if existing_prefs.get('low_sodium'): prefs_to_show.append("Low Sodium")
        
        if prefs_to_show:
            st.write("**Dietary Restrictions:** " + ", ".join(prefs_to_show))
        else:
            st.write("**Dietary Restrictions:** None")
        
        st.write(f"**Cooking Time:** {existing_prefs.get('cooking_time_preference', 'Medium (30-60 min)')}")
        st.write(f"**Budget:** {existing_prefs.get('budget_preference', 'Moderate')}")
        st.write(f"**Cooking For:** {existing_prefs.get('cooking_for', 'Just myself')}")
        st.write(f"**Leftovers:** {existing_prefs.get('leftovers_preference', 'Okay with leftovers occasionally')}")
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
        total_calories = nutrition.get('target_calories', 2000)
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
            
            meal_targets[f"{meal['name']}_{i}"] = {
                'name': meal['name'],
                'time': meal.get('time', '12:00'),
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
        
        # Prepare weekly targets
        weekly_targets = prepare_weekly_targets()
        weekly_schedule = st.session_state.weekly_schedule_v2
        diet_prefs = existing_prefs if existing_prefs else {}
        
        with st.spinner("🤖 Creating your personalized weekly meal plan... This may take 1-2 minutes."):
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            weekly_meal_plan = generate_weekly_ai_meal_plan(
                weekly_targets, diet_prefs, weekly_schedule, openai_client
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
                            
                            # Display macros
                            if 'total_macros' in meal:
                                macros = meal['total_macros']
                                st.markdown(f"**Macros:** {macros['calories']} cal, {macros['protein']}g protein, {macros['carbs']}g carbs, {macros['fat']}g fat")
                            
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
                    
                    # Get user preferences for PDF
                    user_info = {
                        'name': 'Fitomics User',
                        'plan_type': 'Weekly Meal Plan',
                        'generation_date': datetime.now().strftime('%B %d, %Y')
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