"""
Compact AI Meal Plan page with streamlined interface for testing PDF export
"""
import streamlit as st
import os
from nutrition_cache import NutritionCache
from pdf_export import export_meal_plan_pdf

# Initialize nutrition cache
nutrition_cache = NutritionCache()

def generate_test_meal(meal_type, target_macros):
    """Generate test meal with authentic nutritional data"""
    meal_templates = {
        'breakfast': [
            {'name': 'eggs', 'amount': 120, 'category': 'protein'},
            {'name': 'oatmeal', 'amount': 60, 'category': 'carbs'},
            {'name': 'berries', 'amount': 80, 'category': 'carbs'},
            {'name': 'almonds', 'amount': 15, 'category': 'fat'}
        ],
        'lunch': [
            {'name': 'chicken breast', 'amount': 150, 'category': 'protein'},
            {'name': 'quinoa', 'amount': 80, 'category': 'carbs'},
            {'name': 'avocado', 'amount': 40, 'category': 'fat'},
            {'name': 'mixed greens', 'amount': 100, 'category': 'vegetable'}
        ],
        'dinner': [
            {'name': 'salmon', 'amount': 140, 'category': 'protein'},
            {'name': 'sweet potato', 'amount': 120, 'category': 'carbs'},
            {'name': 'olive oil', 'amount': 10, 'category': 'fat'},
            {'name': 'asparagus', 'amount': 150, 'category': 'vegetable'}
        ],
        'snack': [
            {'name': 'greek yogurt', 'amount': 150, 'category': 'protein'},
            {'name': 'banana', 'amount': 80, 'category': 'carbs'},
            {'name': 'walnuts', 'amount': 12, 'category': 'fat'}
        ]
    }
    
    # Get ingredients for this meal type
    base_ingredients = meal_templates.get(meal_type, meal_templates['lunch'])
    
    # Add authentic nutritional data
    detailed_ingredients = []
    total_macros = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
    
    for ing in base_ingredients:
        cached_data = nutrition_cache.get_fallback_nutrition(ing['name'], ing['category'])
        
        # Calculate nutritional contribution
        multiplier = ing['amount'] / 100.0
        calories = cached_data['calories_per_100g'] * multiplier
        protein = cached_data['protein_per_100g'] * multiplier
        carbs = cached_data['carbs_per_100g'] * multiplier
        fat = cached_data['fat_per_100g'] * multiplier
        
        total_macros['calories'] += calories
        total_macros['protein'] += protein
        total_macros['carbs'] += carbs
        total_macros['fat'] += fat
        
        detailed_ingredients.append({
            'name': ing['name'],
            'amount': ing['amount'],
            'category': ing['category'],
            'calories_per_100g': cached_data['calories_per_100g'],
            'protein_per_100g': cached_data['protein_per_100g'],
            'carbs_per_100g': cached_data['carbs_per_100g'],
            'fat_per_100g': cached_data['fat_per_100g']
        })
    
    return {
        'recipe': {
            'title': f"Balanced {meal_type.title()}",
            'ingredients': [f"{ing['amount']}g {ing['name']}" for ing in base_ingredients],
            'directions': ['Prepare all ingredients according to preference', 'Combine for a nutritious, balanced meal']
        },
        'macros': {
            'calories': int(total_macros['calories']),
            'protein': round(total_macros['protein'], 1),
            'carbs': round(total_macros['carbs'], 1),
            'fat': round(total_macros['fat'], 1)
        },
        'ingredient_details': detailed_ingredients
    }

# Page Header
st.title("🍽️ AI Meal Plan - Compact View")
st.markdown("*Streamlined meal planning with one-click PDF export*")

# Check if configuration exists
if not st.session_state.get('meal_planning_confirmed', False):
    st.warning("Please complete your meal planning configuration first.")
    if st.button("Generate Test Configuration"):
        # Create test configuration for PDF testing
        st.session_state.confirmed_meal_targets = {
            'breakfast': {'calories': 500, 'protein': 30, 'carbs': 45, 'fat': 20},
            'lunch': {'calories': 650, 'protein': 45, 'carbs': 60, 'fat': 25},
            'dinner': {'calories': 600, 'protein': 40, 'carbs': 55, 'fat': 22},
            'snack': {'calories': 250, 'protein': 15, 'carbs': 25, 'fat': 10}
        }
        st.session_state.confirmed_diet_prefs = {
            'vegetarian': False,
            'vegan': False,
            'gluten_free': False,
            'dairy_free': False,
            'nut_free': False
        }
        st.session_state.meal_planning_confirmed = True
        st.success("Test configuration created!")
        st.rerun()
    st.stop()

# Get configuration
meal_targets = st.session_state.get('confirmed_meal_targets', {})
diet_prefs = st.session_state.get('confirmed_diet_prefs', {})

# Initialize confirmed meals
if 'confirmed_meals' not in st.session_state:
    st.session_state.confirmed_meals = {}

# Daily summary
st.markdown("## 📊 Daily Nutrition Summary")
total_calories = sum(meal.get('calories', 0) for meal in meal_targets.values())
total_protein = sum(meal.get('protein', 0) for meal in meal_targets.values())
total_carbs = sum(meal.get('carbs', 0) for meal in meal_targets.values())
total_fat = sum(meal.get('fat', 0) for meal in meal_targets.values())

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Total Calories", f"{total_calories}")
with col2:
    st.metric("Total Protein", f"{total_protein}g")
with col3:
    st.metric("Total Carbs", f"{total_carbs}g")
with col4:
    st.metric("Total Fat", f"{total_fat}g")

# Quick actions
st.markdown("## 🚀 Quick Actions")
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("✅ Generate All Meals", type="primary"):
        with st.spinner("Creating meal plan with authentic nutrition data..."):
            for meal_type, target_macros in meal_targets.items():
                meal_data = generate_test_meal(meal_type, target_macros)
                st.session_state.confirmed_meals[meal_type] = meal_data
            st.success("All meals generated with authentic nutritional data!")
            st.rerun()

with col2:
    if st.button("🔄 Clear All Meals"):
        st.session_state.confirmed_meals = {}
        st.rerun()

with col3:
    total_confirmed = len(st.session_state.confirmed_meals)
    st.write(f"**Confirmed: {total_confirmed}/{len(meal_targets)}**")

# Compact meal display
if st.session_state.confirmed_meals:
    st.markdown("## ✅ Confirmed Meals")
    
    for meal_type, meal_data in st.session_state.confirmed_meals.items():
        with st.expander(f"🍽️ {meal_type.title()}", expanded=False):
            recipe = meal_data.get('recipe', {})
            macros = meal_data.get('macros', {})
            
            st.markdown(f"**{recipe.get('title', 'Meal')}**")
            st.write(f"**Nutrition:** {macros.get('calories', 0)} cal | {macros.get('protein', 0)}g protein | {macros.get('carbs', 0)}g carbs | {macros.get('fat', 0)}g fat")
            
            if 'ingredients' in recipe:
                st.write("**Ingredients:** " + ", ".join(recipe['ingredients']))
            
            if st.button(f"❌ Remove {meal_type}", key=f"remove_{meal_type}"):
                del st.session_state.confirmed_meals[meal_type]
                st.rerun()

# Export options
if len(st.session_state.confirmed_meals) > 0:
    st.markdown("## 📄 Export Options")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📋 Generate Grocery List"):
            with st.spinner("Creating consolidated grocery list..."):
                # Consolidate ingredients
                grocery_list = {}
                for meal_data in st.session_state.confirmed_meals.values():
                    ingredients = meal_data.get('ingredient_details', [])
                    for ingredient in ingredients:
                        if isinstance(ingredient, dict):
                            name = ingredient.get('name', '').lower()
                            amount = float(ingredient.get('amount', 0))
                            
                            if name in grocery_list:
                                grocery_list[name] += amount
                            else:
                                grocery_list[name] = amount
                
                # Display grocery list
                st.markdown("### 🛒 Consolidated Grocery List")
                for name, total_amount in sorted(grocery_list.items()):
                    if name and total_amount > 0:
                        st.write(f"• {total_amount:.0f}g {name.title()}")
                
                st.success("Grocery list generated!")
    
    with col2:
        if st.button("📄 Export PDF Meal Plan"):
            with st.spinner("Creating branded PDF with meal plan and grocery list..."):
                try:
                    # Export to PDF
                    diet_prefs = st.session_state.get('confirmed_diet_prefs', {})
                    pdf_filename = export_meal_plan_pdf(st.session_state.confirmed_meals, diet_prefs)
                    
                    if pdf_filename and os.path.exists(pdf_filename):
                        # Provide download link
                        with open(pdf_filename, "rb") as pdf_file:
                            st.download_button(
                                label="📥 Download Fitomics Meal Plan PDF",
                                data=pdf_file.read(),
                                file_name=pdf_filename,
                                mime="application/pdf"
                            )
                        
                        # Clean up temporary file
                        try:
                            os.remove(pdf_filename)
                        except:
                            pass
                        st.success("PDF meal plan created successfully!")
                    else:
                        st.error("Error creating PDF. Please check console for details.")
                        
                except Exception as e:
                    import traceback
                    st.error(f"Error exporting PDF: {str(e)}")
                    st.text(traceback.format_exc())

else:
    st.info("Generate meals to enable export options.")

# Individual meal generation
st.markdown("## 🍽️ Individual Meal Generation")

for meal_type, target_macros in meal_targets.items():
    if meal_type not in st.session_state.confirmed_meals:
        col1, col2 = st.columns([3, 1])
        with col1:
            st.write(f"**{meal_type.title()}** - Target: {target_macros['calories']} cal | {target_macros['protein']}g protein | {target_macros['carbs']}g carbs | {target_macros['fat']}g fat")
        with col2:
            if st.button(f"Generate {meal_type.title()}", key=f"gen_{meal_type}"):
                meal_data = generate_test_meal(meal_type, target_macros)
                st.session_state.confirmed_meals[meal_type] = meal_data
                st.rerun()