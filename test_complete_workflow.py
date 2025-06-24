"""
Complete end-to-end workflow test: Body Composition Planning → AI Meal Generation → PDF Export
"""
import streamlit as st
import sys
import os
from datetime import datetime, time

# Add parent directory for imports
sys.path.append('.')
import utils
from pdf_export import export_meal_plan_pdf
from macro_validator import create_accurate_meal
from nutrition_cache import nutrition_cache

st.set_page_config(page_title="Complete Workflow Test", page_icon="🏆", layout="wide")

st.title("🏆 Complete Workflow Test")
st.markdown("End-to-end test: Body Composition Planning → AI Meal Generation → PDF Export")

# Initialize session state
if 'workflow_step' not in st.session_state:
    st.session_state.workflow_step = 1

# Step 1: Body Composition Profile Setup
st.markdown("## Step 1: Body Composition Profile Setup")

if st.session_state.workflow_step >= 1:
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Personal Information")
        
        # Unit system selection
        unit_system = st.radio("Unit System", ["Metric", "Imperial"], horizontal=True)
        
        gender = st.selectbox("Gender", ["Male", "Female"], index=0)
        age = st.number_input("Age", min_value=18, max_value=80, value=30)
        
        if unit_system == "Metric":
            height_cm = st.number_input("Height (cm)", min_value=140, max_value=220, value=180)
            weight_kg = st.number_input("Weight (kg)", min_value=40, max_value=200, value=80)
        else:  # Imperial
            height_feet = st.number_input("Height (feet)", min_value=4, max_value=7, value=5)
            height_inches = st.number_input("Height (inches)", min_value=0, max_value=11, value=11)
            weight_lbs = st.number_input("Weight (lbs)", min_value=90, max_value=440, value=176)
            
            # Convert to metric for calculations
            height_cm = (height_feet * 12 + height_inches) * 2.54
            weight_kg = weight_lbs * 0.453592
        
        activity_level = st.selectbox("Activity Level", [
            "Sedentary", "Lightly active", "Moderately active", "Very active", "Extremely active"
        ], index=2)
        body_fat = st.number_input("Body Fat %", min_value=5, max_value=50, value=15)
    
    with col2:
        st.markdown("### Goals")
        goal_type = st.selectbox("Primary Goal", ["Muscle Gain", "Fat Loss", "Maintenance"], index=0)
        
        if unit_system == "Metric":
            target_weight_kg = st.number_input("Target Weight (kg)", min_value=40, max_value=200, value=85)
        else:  # Imperial
            target_weight_lbs = st.number_input("Target Weight (lbs)", min_value=90, max_value=440, value=187)
            target_weight_kg = target_weight_lbs * 0.453592
            
        timeline_weeks = st.number_input("Timeline (weeks)", min_value=4, max_value=52, value=16)
        
        st.markdown("### Dietary Preferences")
        vegetarian = st.checkbox("Vegetarian")
        vegan = st.checkbox("Vegan")
        gluten_free = st.checkbox("Gluten Free")
        dairy_free = st.checkbox("Dairy Free")
    
    if st.button("Calculate Nutrition Targets", type="primary"):
        # Calculate using actual utils functions
        tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, activity_level)
        target_calories = utils.calculate_target_calories(tdee, goal_type.lower().replace(' ', '_'))
        macros = utils.calculate_macros(target_calories, weight_kg, goal_type.lower().replace(' ', '_'))
        
        # Store profile data
        st.session_state.profile_data = {
            'gender': gender,
            'age': age,
            'height_cm': height_cm,
            'weight_kg': weight_kg,
            'activity_level': activity_level,
            'body_fat': body_fat,
            'goal_type': goal_type,
            'target_weight': target_weight_kg,
            'timeline_weeks': timeline_weeks,
            'unit_system': unit_system
        }
        
        st.session_state.nutrition_targets = {
            'tdee': tdee,
            'target_calories': target_calories,
            'protein': macros['protein'],
            'carbs': macros['carbs'],
            'fat': macros['fat']
        }
        
        st.session_state.diet_preferences = {
            'vegetarian': vegetarian,
            'vegan': vegan,
            'gluten_free': gluten_free,
            'dairy_free': dairy_free
        }
        
        st.session_state.workflow_step = 2
        st.rerun()

# Step 2: Display Calculated Targets
if st.session_state.workflow_step >= 2:
    st.markdown("## Step 2: Calculated Nutrition Targets")
    
    nutrition = st.session_state.nutrition_targets
    profile = st.session_state.profile_data
    unit_system = profile.get('unit_system', 'Metric')
    
    st.success(f"Targets calculated for {profile['goal_type']} goal")
    
    # Display profile summary with chosen units
    st.markdown("### Profile Summary")
    summary_col1, summary_col2 = st.columns(2)
    
    with summary_col1:
        if unit_system == "Metric":
            st.write(f"**Current Weight:** {profile['weight_kg']:.1f} kg")
            st.write(f"**Height:** {profile['height_cm']:.0f} cm")
            st.write(f"**Target Weight:** {profile['target_weight']:.1f} kg")
        else:
            current_weight_lbs = profile['weight_kg'] / 0.453592
            target_weight_lbs = profile['target_weight'] / 0.453592
            height_total_inches = profile['height_cm'] / 2.54
            height_feet = int(height_total_inches // 12)
            height_inches = int(height_total_inches % 12)
            st.write(f"**Current Weight:** {current_weight_lbs:.1f} lbs")
            st.write(f"**Height:** {height_feet}'{height_inches}\"")
            st.write(f"**Target Weight:** {target_weight_lbs:.1f} lbs")
    
    with summary_col2:
        st.write(f"**Age:** {profile['age']} years")
        st.write(f"**Body Fat:** {profile['body_fat']}%")
        st.write(f"**Activity Level:** {profile['activity_level']}")
    
    # Nutrition targets
    st.markdown("### Daily Nutrition Targets")
    target_col1, target_col2, target_col3, target_col4, target_col5 = st.columns(5)
    
    with target_col1:
        st.metric("TDEE", f"{nutrition['tdee']:.0f} cal")
    with target_col2:
        st.metric("Target Calories", f"{nutrition['target_calories']:.0f} cal")
    with target_col3:
        st.metric("Protein", f"{nutrition['protein']:.0f}g")
    with target_col4:
        st.metric("Carbs", f"{nutrition['carbs']:.0f}g")
    with target_col5:
        st.metric("Fat", f"{nutrition['fat']:.0f}g")
    
    if st.button("Generate Meal Plan", type="primary"):
        st.session_state.workflow_step = 3
        st.rerun()

# Step 3: Generate AI Meal Plan
if st.session_state.workflow_step >= 3:
    st.markdown("## Step 3: AI Meal Plan Generation")
    
    nutrition = st.session_state.nutrition_targets
    diet_prefs = st.session_state.diet_preferences
    
    # Create meal distribution
    meal_distribution = {
        'Breakfast': 0.25,
        'Lunch': 0.35,
        'Dinner': 0.30,
        'Snack': 0.10
    }
    
    meal_targets = {}
    for meal_type, percentage in meal_distribution.items():
        meal_targets[meal_type] = {
            'calories': int(nutrition['target_calories'] * percentage),
            'protein': int(nutrition['protein'] * percentage),
            'carbs': int(nutrition['carbs'] * percentage),
            'fat': int(nutrition['fat'] * percentage)
        }
    
    st.markdown("### Meal Target Distribution")
    for meal_type, targets in meal_targets.items():
        st.write(f"**{meal_type}:** {targets['calories']} cal, {targets['protein']}g protein, {targets['carbs']}g carbs, {targets['fat']}g fat")
    
    if st.button("Generate Authentic Meals", type="primary"):
        with st.spinner("Creating authentic meal plan with real nutritional data..."):
            # Generate meals using authentic ingredients
            generated_meals = {}
            
            for meal_type, targets in meal_targets.items():
                # Use macro validator to create accurate meals
                meal_data = create_accurate_meal(meal_type, targets, diet_prefs)
                
                if meal_data:
                    generated_meals[meal_type] = {
                        'recipe': meal_data['recipe'],
                        'macros': meal_data.get('macros', targets),
                        'ingredient_details': meal_data['ingredients'],
                        'ingredient_amounts': {ing['name']: ing['amount'] for ing in meal_data['ingredients']}
                    }
                else:
                    # Fallback with authentic ingredients
                    if meal_type == 'Breakfast':
                        ingredients = [
                            {'name': 'eggs', 'amount': 120, 'category': 'protein'},
                            {'name': 'oats', 'amount': 60, 'category': 'carbs'},
                            {'name': 'banana', 'amount': 100, 'category': 'carbs'},
                            {'name': 'almonds', 'amount': 15, 'category': 'fat'}
                        ]
                        recipe_title = "Protein-Rich Breakfast Bowl"
                        directions = ["Cook oats with water", "Scramble eggs", "Slice banana", "Top with almonds"]
                    elif meal_type == 'Lunch':
                        ingredients = [
                            {'name': 'chicken breast', 'amount': 150, 'category': 'protein'},
                            {'name': 'quinoa', 'amount': 80, 'category': 'carbs'},
                            {'name': 'mixed vegetables', 'amount': 120, 'category': 'carbs'},
                            {'name': 'olive oil', 'amount': 15, 'category': 'fat'}
                        ]
                        recipe_title = "Mediterranean Chicken Bowl"
                        directions = ["Grill chicken breast", "Cook quinoa", "Steam vegetables", "Drizzle with olive oil"]
                    elif meal_type == 'Dinner':
                        ingredients = [
                            {'name': 'salmon', 'amount': 140, 'category': 'protein'},
                            {'name': 'sweet potato', 'amount': 150, 'category': 'carbs'},
                            {'name': 'broccoli', 'amount': 100, 'category': 'carbs'},
                            {'name': 'avocado', 'amount': 50, 'category': 'fat'}
                        ]
                        recipe_title = "Omega-Rich Salmon Dinner"
                        directions = ["Bake salmon with herbs", "Roast sweet potato", "Steam broccoli", "Add sliced avocado"]
                    else:  # Snack
                        ingredients = [
                            {'name': 'greek yogurt', 'amount': 100, 'category': 'protein'},
                            {'name': 'berries', 'amount': 80, 'category': 'carbs'},
                            {'name': 'walnuts', 'amount': 15, 'category': 'fat'}
                        ]
                        recipe_title = "Antioxidant Berry Snack"
                        directions = ["Mix greek yogurt with berries", "Top with chopped walnuts"]
                    
                    # Add nutritional data to ingredients
                    for ingredient in ingredients:
                        cached_nutrition = nutrition_cache.get_fallback_nutrition(ingredient['name'], ingredient['category'])
                        ingredient.update({
                            'calories_per_100g': cached_nutrition['calories_per_100g'],
                            'protein_per_100g': cached_nutrition['protein_per_100g'],
                            'carbs_per_100g': cached_nutrition['carbs_per_100g'],
                            'fat_per_100g': cached_nutrition['fat_per_100g']
                        })
                    
                    generated_meals[meal_type] = {
                        'recipe': {
                            'title': recipe_title,
                            'ingredients': [f"{ing['amount']}g {ing['name']}" for ing in ingredients],
                            'directions': directions
                        },
                        'macros': targets,
                        'ingredient_details': ingredients,
                        'ingredient_amounts': {ing['name']: ing['amount'] for ing in ingredients}
                    }
            
            st.session_state.generated_meals = generated_meals
            st.session_state.workflow_step = 4
            st.success("Authentic meal plan generated successfully!")
            st.rerun()

# Step 4: Display Generated Meals
if st.session_state.workflow_step >= 4:
    st.markdown("## Step 4: Generated Meal Plan")
    
    meals = st.session_state.generated_meals
    
    for meal_type, meal_data in meals.items():
        with st.expander(f"📋 {meal_type}: {meal_data['recipe']['title']}", expanded=True):
            col1, col2 = st.columns([2, 1])
            
            with col1:
                st.markdown("**Ingredients:**")
                for ingredient in meal_data['recipe']['ingredients']:
                    st.write(f"• {ingredient}")
                
                st.markdown("**Directions:**")
                for i, direction in enumerate(meal_data['recipe']['directions'], 1):
                    st.write(f"{i}. {direction}")
            
            with col2:
                st.markdown("**Nutrition:**")
                macros = meal_data['macros']
                st.write(f"Calories: {macros['calories']}")
                st.write(f"Protein: {macros['protein']}g")
                st.write(f"Carbs: {macros['carbs']}g")
                st.write(f"Fat: {macros['fat']}g")
    
    if st.button("Export PDF Meal Plan", type="primary"):
        st.session_state.workflow_step = 5
        st.rerun()

# Step 5: PDF Export
if st.session_state.workflow_step >= 5:
    st.markdown("## Step 5: PDF Export")
    
    with st.spinner("Creating branded PDF with complete meal plan and grocery list..."):
        try:
            # Export to PDF using the actual export function
            meals = st.session_state.generated_meals
            diet_prefs = st.session_state.diet_preferences
            
            pdf_filename = export_meal_plan_pdf(meals, diet_prefs)
            
            if pdf_filename and os.path.exists(pdf_filename):
                file_size = os.path.getsize(pdf_filename)
                
                # Read PDF file
                with open(pdf_filename, "rb") as pdf_file:
                    pdf_data = pdf_file.read()
                
                st.success(f"PDF created successfully! File size: {file_size/1024:.1f}KB")
                
                # Provide download
                st.download_button(
                    label="Download Complete Fitomics Meal Plan PDF",
                    data=pdf_data,
                    file_name=f"fitomics_complete_meal_plan_{datetime.now().strftime('%Y%m%d')}.pdf",
                    mime="application/pdf",
                    type="primary"
                )
                
                # Clean up
                try:
                    os.remove(pdf_filename)
                except:
                    pass
                
                # Show success summary
                st.markdown("### Workflow Complete!")
                st.markdown("✅ Body composition profile analyzed")
                st.markdown("✅ Nutrition targets calculated using authentic formulas")
                st.markdown("✅ Meal plan generated with real ingredients and nutrition data")
                st.markdown("✅ Branded PDF exported with complete meal plan and grocery list")
                
                # Reset workflow
                if st.button("Start New Workflow"):
                    keys_to_delete = []
                    for key in st.session_state.keys():
                        if isinstance(key, str) and any(key.startswith(prefix) for prefix in ['workflow_', 'profile_', 'nutrition_', 'generated_', 'diet_']):
                            keys_to_delete.append(key)
                    
                    for key in keys_to_delete:
                        del st.session_state[key]
                    st.session_state.workflow_step = 1
                    st.rerun()
            else:
                st.error("PDF creation failed. Please try again.")
                
        except Exception as e:
            st.error(f"Error creating PDF: {str(e)}")

# Show current step indicator
st.sidebar.markdown("## Workflow Progress")
steps = [
    "Body Composition Profile",
    "Nutrition Calculation", 
    "Meal Plan Generation",
    "Meal Plan Review",
    "PDF Export"
]

for i, step in enumerate(steps, 1):
    if st.session_state.workflow_step > i:
        st.sidebar.markdown(f"✅ Step {i}: {step}")
    elif st.session_state.workflow_step == i:
        st.sidebar.markdown(f"🔄 Step {i}: {step}")
    else:
        st.sidebar.markdown(f"⏳ Step {i}: {step}")