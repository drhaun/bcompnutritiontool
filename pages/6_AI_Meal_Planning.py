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

def generate_ai_meal_plan(meal_targets, diet_preferences, meal_config, openai_client):
    """Generate complete AI meal plan using OpenAI"""
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
st.set_page_config(page_title="AI Meal Planning", layout="wide")
st.title("🤖 AI Meal Planning")
st.markdown("*Complete AI-powered meal planning workflow - from preferences to PDF export*")

# Initialize nutrition cache
if 'nutrition_cache' not in st.session_state:
    st.session_state.nutrition_cache = NutritionCache()

# Step 1: Mode Selection
st.markdown("## 1. Planning Mode")
mode_col1, mode_col2 = st.columns(2)

with mode_col1:
    if st.button("🔧 Standalone Mode", use_container_width=True):
        st.session_state.meal_planner_mode = 'standalone'
        st.session_state.planning_step = 1

with mode_col2:
    if st.button("🔄 Sync Profile Mode", use_container_width=True):
        st.session_state.meal_planner_mode = 'sync'
        st.session_state.planning_step = 1

# Initialize session state
if 'meal_planner_mode' not in st.session_state:
    st.session_state.meal_planner_mode = 'none'
if 'planning_step' not in st.session_state:
    st.session_state.planning_step = 0

# Show current mode
if st.session_state.meal_planner_mode != 'none':
    mode_display = "Standalone" if st.session_state.meal_planner_mode == 'standalone' else "Sync Profile"
    st.info(f"**Current Mode:** {mode_display}")
    
    if st.session_state.meal_planner_mode == 'sync':
        # Check for synced data
        if not st.session_state.get('day_specific_nutrition'):
            st.warning("No synced nutrition data found. Complete Body Composition Goals → Weekly Schedule → Nutrition Targets first, or use Standalone Mode.")
            st.stop()
        else:
            st.success("✅ Synced nutrition targets detected")

# Step 2: Nutrition Targets
if st.session_state.get('planning_step', 0) >= 1:
    st.markdown("---")
    st.markdown("## 2. Nutrition Targets")
    
    if st.session_state.meal_planner_mode == 'sync':
        # Use synced targets
        today = datetime.now().strftime('%A')
        day_nutrition = st.session_state.day_specific_nutrition.get(today, {})
        
        target_calories = day_nutrition.get('target_calories', 2000)
        target_protein = day_nutrition.get('protein', 150)
        target_carbs = day_nutrition.get('carbs', 200)
        target_fat = day_nutrition.get('fat', 70)
        
        st.markdown(f"**Today ({today}) Targets:**")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Calories", f"{target_calories:,}")
        with col2:
            st.metric("Protein", f"{target_protein}g")
        with col3:
            st.metric("Carbs", f"{target_carbs}g")
        with col4:
            st.metric("Fat", f"{target_fat}g")
    
    else:
        # Standalone mode - manual input
        st.markdown("**Set your daily nutrition targets:**")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            target_calories = st.number_input("Calories", min_value=1200, max_value=4000, value=2000, step=50)
        with col2:
            target_protein = st.number_input("Protein (g)", min_value=50, max_value=300, value=150, step=5)
        with col3:
            target_carbs = st.number_input("Carbs (g)", min_value=50, max_value=400, value=200, step=10)
        with col4:
            target_fat = st.number_input("Fat (g)", min_value=30, max_value=200, value=70, step=5)
    
    # Confirm targets and proceed
    if st.button("✅ Confirm Nutrition Targets", key="confirm_targets"):
        st.session_state.planning_step = 2
        st.session_state.confirmed_targets = {
            'calories': target_calories,
            'protein': target_protein,
            'carbs': target_carbs,
            'fat': target_fat
        }
        st.success("Nutrition targets confirmed!")
        st.rerun()

# Step 3: Dietary Preferences
if st.session_state.get('planning_step', 0) >= 2:
    st.markdown("---")
    st.markdown("## 3. Dietary Preferences")
    
    # Use existing preferences if available
    existing_prefs = st.session_state.get('diet_preferences', {})
    
    pref_col1, pref_col2, pref_col3 = st.columns(3)
    
    with pref_col1:
        vegetarian = st.checkbox("Vegetarian", value=existing_prefs.get('vegetarian', False))
        vegan = st.checkbox("Vegan", value=existing_prefs.get('vegan', False))
    
    with pref_col2:
        gluten_free = st.checkbox("Gluten-Free", value=existing_prefs.get('gluten_free', False))
        dairy_free = st.checkbox("Dairy-Free", value=existing_prefs.get('dairy_free', False))
    
    with pref_col3:
        nut_free = st.checkbox("Nut-Free", value=existing_prefs.get('nut_free', False))
        low_sodium = st.checkbox("Low Sodium", value=existing_prefs.get('low_sodium', False))
    
    diet_preferences = {
        'vegetarian': vegetarian,
        'vegan': vegan,
        'gluten_free': gluten_free,
        'dairy_free': dairy_free,
        'nut_free': nut_free,
        'low_sodium': low_sodium
    }
    
    if st.button("✅ Confirm Dietary Preferences", key="confirm_diet"):
        st.session_state.planning_step = 3
        st.session_state.confirmed_diet_prefs = diet_preferences
        st.success("Dietary preferences confirmed!")
        st.rerun()

# Step 4: Meal Configuration
if st.session_state.get('planning_step', 0) >= 3:
    st.markdown("---")
    st.markdown("## 4. Meal Timing & Configuration")
    
    config_col1, config_col2 = st.columns(2)
    
    with config_col1:
        wake_time = st.time_input("Wake Time", value=time(7, 0))
        sleep_time = st.time_input("Sleep Time", value=time(23, 0))
        
    with config_col2:
        workout_time = st.selectbox("Workout Timing", [
            "Morning (6-9 AM)", "Mid-Morning (9-12 PM)", "Afternoon (2-5 PM)", 
            "Evening (5-8 PM)", "No workout today"
        ])
        is_training_day = workout_time != "No workout today"
    
    meal_col1, meal_col2 = st.columns(2)
    with meal_col1:
        num_meals = st.selectbox("Number of Main Meals", [2, 3, 4], index=1)
    with meal_col2:
        num_snacks = st.selectbox("Number of Snacks", [0, 1, 2], index=1)
    
    meal_config = {
        'wake_time': wake_time.strftime("%H:%M"),
        'sleep_time': sleep_time.strftime("%H:%M"),
        'workout_time': workout_time,
        'num_meals': num_meals,
        'num_snacks': num_snacks,
        'is_training_day': is_training_day
    }
    
    if st.button("✅ Confirm Meal Configuration", key="confirm_config"):
        st.session_state.planning_step = 4
        st.session_state.confirmed_meal_config = meal_config
        st.success("Meal configuration confirmed!")
        st.rerun()

# Step 5: Generate AI Meal Plan
if st.session_state.get('planning_step', 0) >= 4:
    st.markdown("---")
    st.markdown("## 5. Generate AI Meal Plan")
    
    # Create meal distribution
    total_meals = st.session_state.confirmed_meal_config['num_meals'] + st.session_state.confirmed_meal_config['num_snacks']
    
    if total_meals == 3:  # 2 meals + 1 snack
        meal_distribution = {'breakfast': 0.35, 'lunch': 0.45, 'snack': 0.20}
    elif total_meals == 4:  # 3 meals + 1 snack
        meal_distribution = {'breakfast': 0.25, 'lunch': 0.35, 'dinner': 0.30, 'snack': 0.10}
    elif total_meals == 5:  # 3 meals + 2 snacks
        meal_distribution = {'breakfast': 0.25, 'lunch': 0.30, 'dinner': 0.30, 'snack1': 0.08, 'snack2': 0.07}
    else:  # Default to 4 meals
        meal_distribution = {'breakfast': 0.25, 'lunch': 0.35, 'dinner': 0.30, 'snack': 0.10}
    
    # Calculate meal targets
    targets = st.session_state.confirmed_targets
    meal_targets = {}
    
    for meal_type, percentage in meal_distribution.items():
        meal_targets[meal_type] = {
            'calories': int(targets['calories'] * percentage),
            'protein': int(targets['protein'] * percentage),
            'carbs': int(targets['carbs'] * percentage),
            'fat': int(targets['fat'] * percentage)
        }
    
    # Display meal target breakdown
    st.markdown("### Meal Target Breakdown")
    target_df = pd.DataFrame([
        {
            'Meal': meal_type.title(),
            'Calories': f"{targets['calories']} cal",
            'Protein': f"{targets['protein']}g",
            'Carbs': f"{targets['carbs']}g",
            'Fat': f"{targets['fat']}g"
        }
        for meal_type, targets in meal_targets.items()
    ])
    st.dataframe(target_df, use_container_width=True)
    
    # Generate meal plan
    if st.button("🚀 Generate Complete Meal Plan", type="primary", use_container_width=True):
        openai_client = get_openai_client()
        
        if not openai_client:
            st.error("OpenAI API key not found. Please add your OPENAI_API_KEY to generate AI meal plans.")
            st.stop()
        
        with st.spinner("Creating your personalized meal plan..."):
            meal_plan = generate_ai_meal_plan(
                meal_targets,
                st.session_state.confirmed_diet_prefs,
                st.session_state.confirmed_meal_config,
                openai_client
            )
            
            if meal_plan:
                st.session_state.generated_meal_plan = meal_plan
                st.session_state.planning_step = 5
                st.success("✅ Meal plan generated successfully!")
                st.rerun()

# Step 6: Display & Customize Meal Plan
if st.session_state.get('planning_step', 0) >= 5 and 'generated_meal_plan' in st.session_state:
    st.markdown("---")
    st.markdown("## 6. Your Personalized Meal Plan")
    
    meal_plan = st.session_state.generated_meal_plan
    
    # Create tabs for each meal
    meal_types = list(meal_plan.keys())
    meal_tabs = st.tabs([meal_type.title() for meal_type in meal_types])
    
    for i, meal_type in enumerate(meal_types):
        with meal_tabs[i]:
            meal_data = meal_plan[meal_type]
            
            st.markdown(f"### {meal_data.get('name', meal_type.title())}")
            if 'timing' in meal_data:
                st.markdown(f"**Suggested Time:** {meal_data['timing']}")
            
            # Macro summary
            macros = meal_data.get('total_macros', {})
            macro_col1, macro_col2, macro_col3, macro_col4 = st.columns(4)
            
            with macro_col1:
                st.metric("Calories", macros.get('calories', 0))
            with macro_col2:
                st.metric("Protein", f"{macros.get('protein', 0)}g")
            with macro_col3:
                st.metric("Carbs", f"{macros.get('carbs', 0)}g")
            with macro_col4:
                st.metric("Fat", f"{macros.get('fat', 0)}g")
            
            # Ingredients
            st.markdown("**Ingredients:**")
            ingredients = meal_data.get('ingredients', [])
            
            for j, ingredient in enumerate(ingredients):
                with st.expander(f"{ingredient.get('item', 'Unknown')} - {ingredient.get('amount', 'N/A')}", expanded=False):
                    ing_col1, ing_col2, ing_col3, ing_col4 = st.columns(4)
                    with ing_col1:
                        st.write(f"Calories: {ingredient.get('calories', 0)}")
                    with ing_col2:
                        st.write(f"Protein: {ingredient.get('protein', 0)}g")
                    with ing_col3:
                        st.write(f"Carbs: {ingredient.get('carbs', 0)}g")
                    with ing_col4:
                        st.write(f"Fat: {ingredient.get('fat', 0)}g")
            
            # Instructions
            if 'instructions' in meal_data:
                st.markdown("**Preparation Instructions:**")
                st.markdown(meal_data['instructions'])
    
    # Step 7: Export Options
    st.markdown("---")
    st.markdown("## 7. Export Your Meal Plan")
    
    export_col1, export_col2 = st.columns(2)
    
    with export_col1:
        if st.button("📄 Export PDF", type="primary", use_container_width=True):
            try:
                # Convert meal plan to format expected by PDF export
                pdf_data = {
                    'meals': meal_plan,
                    'daily_totals': st.session_state.confirmed_targets,
                    'user_preferences': st.session_state.confirmed_diet_prefs
                }
                
                pdf_buffer = export_meal_plan_pdf(pdf_data)
                
                if pdf_buffer:
                    st.download_button(
                        label="📥 Download PDF",
                        data=pdf_buffer,
                        file_name=f"fitomics_meal_plan_{datetime.now().strftime('%Y%m%d')}.pdf",
                        mime="application/pdf"
                    )
                    st.success("PDF generated successfully!")
                else:
                    st.error("PDF generation failed")
            except Exception as e:
                st.error(f"PDF export error: {e}")
    
    with export_col2:
        if st.button("🛒 Generate Grocery List", use_container_width=True):
            # Extract all ingredients for grocery list
            grocery_items = []
            for meal_type, meal_data in meal_plan.items():
                for ingredient in meal_data.get('ingredients', []):
                    grocery_items.append({
                        'Item': ingredient.get('item', 'Unknown'),
                        'Amount': ingredient.get('amount', 'N/A'),
                        'Meal': meal_type.title()
                    })
            
            if grocery_items:
                st.markdown("### 🛒 Grocery List")
                grocery_df = pd.DataFrame(grocery_items)
                st.dataframe(grocery_df, use_container_width=True)
                
                # CSV download
                csv = grocery_df.to_csv(index=False)
                st.download_button(
                    label="📥 Download Grocery List (CSV)",
                    data=csv,
                    file_name=f"grocery_list_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )

# Progress indicator
if st.session_state.get('planning_step', 0) > 0:
    progress_value = min(st.session_state.planning_step / 5, 1.0)
    st.sidebar.progress(progress_value)
    st.sidebar.markdown(f"**Progress:** Step {st.session_state.planning_step} of 5")
    
    # Quick navigation
    st.sidebar.markdown("### Quick Navigation")
    if st.sidebar.button("🔄 Reset Workflow"):
        # Clear planning state
        keys_to_clear = ['planning_step', 'meal_planner_mode', 'confirmed_targets', 
                        'confirmed_diet_prefs', 'confirmed_meal_config', 'generated_meal_plan']
        for key in keys_to_clear:
            if key in st.session_state:
                del st.session_state[key]
        st.rerun()

if st.session_state.meal_planner_mode == 'none':
    st.info("👆 Select a planning mode above to get started with AI meal planning.")