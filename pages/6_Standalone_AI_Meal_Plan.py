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

def generate_standalone_meal_plan(meal_targets, diet_preferences, meal_config, openai_client):
    """Generate complete AI meal plan using OpenAI for standalone mode"""
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
st.set_page_config(page_title="Standalone AI Meal Plan", layout="wide")
st.title("🚀 Standalone AI Meal Plan")
st.markdown("*Quick and easy AI meal planning - no setup required*")

# Initialize nutrition cache
if 'nutrition_cache' not in st.session_state:
    st.session_state.nutrition_cache = NutritionCache()

# Initialize session state for standalone mode
if 'standalone_step' not in st.session_state:
    st.session_state.standalone_step = 0

st.markdown("""
Get a personalized meal plan in just a few clicks! This standalone tool creates AI-powered meal plans 
without requiring body composition analysis or weekly scheduling.
""")

# Compact form for all inputs
with st.form("standalone_meal_planner", clear_on_submit=False):
    st.markdown("## 📋 Quick Setup")
    
    # Nutrition targets in columns
    st.markdown("### Daily Nutrition Targets")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        target_calories = st.number_input("Calories", min_value=1200, max_value=4000, value=2000, step=50)
    with col2:
        target_protein = st.number_input("Protein (g)", min_value=50, max_value=300, value=150, step=5)
    with col3:
        target_carbs = st.number_input("Carbs (g)", min_value=50, max_value=400, value=200, step=10)
    with col4:
        target_fat = st.number_input("Fat (g)", min_value=30, max_value=200, value=70, step=5)
    
    # Dietary preferences in columns
    st.markdown("### Dietary Preferences")
    pref_col1, pref_col2, pref_col3 = st.columns(3)
    
    with pref_col1:
        vegetarian = st.checkbox("Vegetarian")
        vegan = st.checkbox("Vegan")
    
    with pref_col2:
        gluten_free = st.checkbox("Gluten-Free")
        dairy_free = st.checkbox("Dairy-Free")
    
    with pref_col3:
        nut_free = st.checkbox("Nut-Free")
        low_sodium = st.checkbox("Low Sodium")
    
    # Meal configuration
    st.markdown("### Meal Configuration")
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
    
    # Additional preferences
    st.markdown("### Additional Preferences")
    add_col1, add_col2, add_col3 = st.columns(3)
    
    with add_col1:
        num_meals = st.selectbox("Main Meals", [2, 3, 4], index=1)
        num_snacks = st.selectbox("Snacks", [0, 1, 2], index=1)
    
    with add_col2:
        cooking_time = st.selectbox("Cooking Time", [
            "Quick (Under 30 min)", "Medium (30-60 min)", "Long (60+ min)"
        ], index=1)
        budget = st.selectbox("Budget", ["Budget-friendly", "Moderate", "Premium"], index=1)
    
    with add_col3:
        cooking_for = st.selectbox("Cooking For", [
            "Just myself", "2 people", "3-4 people", "Family (5+ people)"
        ])
        leftovers = st.selectbox("Leftovers", [
            "Love leftovers", "Okay with leftovers occasionally", "Prefer fresh meals"
        ], index=1)
    
    # Generate button
    st.markdown("---")
    generate_button = st.form_submit_button("🚀 Generate My Meal Plan", type="primary", use_container_width=True)
    
    if generate_button:
        openai_client = get_openai_client()
        
        if not openai_client:
            st.error("OpenAI API key not found. Please add your OPENAI_API_KEY to generate AI meal plans.")
            st.stop()
        
        # Prepare data for AI generation
        total_meals = num_meals + num_snacks
        
        if total_meals == 3:  # 2 meals + 1 snack
            meal_distribution = {'breakfast': 0.35, 'lunch': 0.45, 'snack': 0.20}
        elif total_meals == 4:  # 3 meals + 1 snack
            meal_distribution = {'breakfast': 0.25, 'lunch': 0.35, 'dinner': 0.30, 'snack': 0.10}
        elif total_meals == 5:  # 3 meals + 2 snacks
            meal_distribution = {'breakfast': 0.25, 'lunch': 0.30, 'dinner': 0.30, 'snack1': 0.08, 'snack2': 0.07}
        else:  # Default to 4 meals
            meal_distribution = {'breakfast': 0.25, 'lunch': 0.35, 'dinner': 0.30, 'snack': 0.10}
        
        # Calculate meal targets
        meal_targets = {}
        for meal_type, percentage in meal_distribution.items():
            meal_targets[meal_type] = {
                'calories': int(target_calories * percentage),
                'protein': int(target_protein * percentage),
                'carbs': int(target_carbs * percentage),
                'fat': int(target_fat * percentage)
            }
        
        # Prepare preferences
        diet_preferences = {
            'vegetarian': vegetarian,
            'vegan': vegan,
            'gluten_free': gluten_free,
            'dairy_free': dairy_free,
            'nut_free': nut_free,
            'low_sodium': low_sodium,
            'cooking_time_preference': cooking_time,
            'budget_preference': budget,
            'cooking_for': cooking_for,
            'leftovers_preference': leftovers
        }
        
        # Prepare meal config
        meal_config = {
            'wake_time': wake_time.strftime("%H:%M"),
            'sleep_time': sleep_time.strftime("%H:%M"),
            'workout_time': workout_time,
            'num_meals': num_meals,
            'num_snacks': num_snacks,
            'is_training_day': is_training_day
        }
        
        with st.spinner("🤖 Creating your personalized meal plan..."):
            meal_plan = generate_standalone_meal_plan(
                meal_targets, diet_preferences, meal_config, openai_client
            )
            
            if meal_plan:
                st.session_state.generated_standalone_plan = meal_plan
                st.session_state.standalone_targets = {
                    'calories': target_calories,
                    'protein': target_protein,
                    'carbs': target_carbs,
                    'fat': target_fat
                }
                st.session_state.standalone_preferences = diet_preferences
                st.success("✅ **Meal plan generated successfully!**")
                st.rerun()

# Display generated meal plan
if 'generated_standalone_plan' in st.session_state:
    st.markdown("---")
    st.markdown("## 🍽️ Your Personalized Meal Plan")
    
    meal_plan = st.session_state.generated_standalone_plan
    
    # Daily totals summary
    total_calories = sum(meal.get('total_macros', {}).get('calories', 0) for meal in meal_plan.values())
    total_protein = sum(meal.get('total_macros', {}).get('protein', 0) for meal in meal_plan.values())
    total_carbs = sum(meal.get('total_macros', {}).get('carbs', 0) for meal in meal_plan.values())
    total_fat = sum(meal.get('total_macros', {}).get('fat', 0) for meal in meal_plan.values())
    
    st.markdown("### Daily Nutrition Summary")
    summary_col1, summary_col2, summary_col3, summary_col4 = st.columns(4)
    
    with summary_col1:
        st.metric("Total Calories", f"{total_calories:,}")
    with summary_col2:
        st.metric("Total Protein", f"{total_protein}g")
    with summary_col3:
        st.metric("Total Carbs", f"{total_carbs}g")
    with summary_col4:
        st.metric("Total Fat", f"{total_fat}g")
    
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
    
    # Export Options
    st.markdown("---")
    st.markdown("## 📤 Export Your Meal Plan")
    
    export_col1, export_col2, export_col3 = st.columns(3)
    
    with export_col1:
        if st.button("📄 Export PDF", type="primary", use_container_width=True):
            try:
                # Convert meal plan to format expected by PDF export
                meal_data_for_pdf = []
                
                for meal_type, meal_data in meal_plan.items():
                    meal_info = {
                        'day': 'Today',
                        'meal_type': meal_type,
                        'time': meal_data.get('timing', ''),
                        'context': 'Standalone Plan',
                        'recipe': {
                            'name': meal_data.get('name', meal_type.title()),
                            'ingredients': meal_data.get('ingredients', []),
                            'instructions': meal_data.get('instructions', ''),
                            'macros': meal_data.get('total_macros', {})
                        }
                    }
                    meal_data_for_pdf.append(meal_info)
                
                # Get user preferences for PDF
                user_info = {
                    'name': 'Fitomics User',
                    'plan_type': 'Standalone Meal Plan',
                    'generation_date': datetime.now().strftime('%B %d, %Y')
                }
                
                pdf_path = export_meal_plan_pdf(meal_data_for_pdf, user_info)
                
                if pdf_path and os.path.exists(pdf_path):
                    st.success("✅ PDF generated successfully!")
                    
                    # Provide download link
                    with open(pdf_path, "rb") as pdf_file:
                        st.download_button(
                            label="⬇️ Download PDF",
                            data=pdf_file.read(),
                            file_name=f"fitomics_meal_plan_{datetime.now().strftime('%Y%m%d')}.pdf",
                            mime="application/pdf",
                            use_container_width=True
                        )
                else:
                    st.error("Failed to generate PDF. Please try again.")
                    
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
                st.dataframe(grocery_df, use_container_width=True, hide_index=True)
                
                # Text format for copying
                grocery_text = "\n".join([f"• {item['Item']}: {item['Amount']}" for item in grocery_items])
                st.text_area("Copy your grocery list:", grocery_text, height=200)
    
    with export_col3:
        if st.button("🔄 Generate New Plan", use_container_width=True):
            if 'generated_standalone_plan' in st.session_state:
                del st.session_state.generated_standalone_plan
            if 'standalone_targets' in st.session_state:
                del st.session_state.standalone_targets
            if 'standalone_preferences' in st.session_state:
                del st.session_state.standalone_preferences
            st.rerun()

# Help section
if 'generated_standalone_plan' not in st.session_state:
    st.markdown("---")
    st.markdown("## 💡 Need More Advanced Features?")
    
    help_col1, help_col2 = st.columns(2)
    
    with help_col1:
        st.markdown("**🧠 Advanced AI Meal Plan**")
        st.markdown("• Weekly meal plans (7 days)")
        st.markdown("• Body composition integration")
        st.markdown("• Schedule-optimized timing")
        st.markdown("• Pre/post-workout meal contexts")
        
        if st.button("🧠 Try Advanced AI Meal Plan", use_container_width=True):
            st.switch_page("pages/7_Advanced_AI_Meal_Plan.py")
    
    with help_col2:
        st.markdown("**📊 Complete Workflow**")
        st.markdown("• Body composition analysis")
        st.markdown("• Weekly schedule planning")
        st.markdown("• Nutrition target calculation")
        st.markdown("• Progress tracking")
        
        if st.button("📊 Start Complete Workflow", use_container_width=True):
            st.switch_page("pages/1_Initial_Setup.py")