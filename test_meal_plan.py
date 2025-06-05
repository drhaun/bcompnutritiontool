"""
Simple meal plan test application to validate PDF export and nutritional accuracy
"""
import streamlit as st
import os
from nutrition_cache import NutritionCache
from pdf_export import export_meal_plan_pdf

# Page config
st.set_page_config(
    page_title="Meal Plan Test",
    page_icon="🍽️",
    layout="wide"
)

# Initialize nutrition cache
nutrition_cache = NutritionCache()

st.title("🍽️ Meal Plan PDF Export Test")
st.markdown("Test the complete meal planning and PDF export functionality")

# Initialize session state
if 'test_meals' not in st.session_state:
    st.session_state.test_meals = {}

# Generate test meal plan
if st.button("Generate Test Meal Plan", type="primary"):
    with st.spinner("Creating meal plan with authentic nutritional data..."):
        
        # Define meal templates with real foods
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
        
        # Generate meals with authentic nutritional data
        for meal_type, ingredients in meal_templates.items():
            detailed_ingredients = []
            total_macros = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            
            for ing in ingredients:
                # Get authentic nutritional data from USDA-verified cache
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
            
            # Create meal structure
            meal_data = {
                'recipe': {
                    'title': f"Balanced {meal_type.title()}",
                    'ingredients': [f"{ing['amount']}g {ing['name']}" for ing in ingredients],
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
            st.session_state.test_meals[meal_type] = meal_data
    
    st.success("Test meal plan generated with authentic nutritional data!")

# Display generated meals
if st.session_state.test_meals:
    st.markdown("## Generated Meal Plan")
    
    # Calculate daily totals
    total_calories = sum(meal['macros']['calories'] for meal in st.session_state.test_meals.values())
    total_protein = sum(meal['macros']['protein'] for meal in st.session_state.test_meals.values())
    total_carbs = sum(meal['macros']['carbs'] for meal in st.session_state.test_meals.values())
    total_fat = sum(meal['macros']['fat'] for meal in st.session_state.test_meals.values())
    
    # Daily summary
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Calories", f"{total_calories}")
    with col2:
        st.metric("Total Protein", f"{total_protein:.1f}g")
    with col3:
        st.metric("Total Carbs", f"{total_carbs:.1f}g")
    with col4:
        st.metric("Total Fat", f"{total_fat:.1f}g")
    
    # Show each meal
    for meal_type, meal_data in st.session_state.test_meals.items():
        with st.expander(f"🍽️ {meal_type.title()}", expanded=False):
            recipe = meal_data.get('recipe', {})
            macros = meal_data.get('macros', {})
            
            st.markdown(f"**{recipe.get('title', 'Meal')}**")
            st.write(f"**Nutrition:** {macros.get('calories', 0)} cal | {macros.get('protein', 0):.1f}g protein | {macros.get('carbs', 0):.1f}g carbs | {macros.get('fat', 0):.1f}g fat")
            
            if 'ingredients' in recipe:
                st.write("**Ingredients:** " + ", ".join(recipe['ingredients']))
    
    # Export options
    st.markdown("## Export Options")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📋 Generate Grocery List"):
            with st.spinner("Creating consolidated grocery list..."):
                # Consolidate ingredients
                grocery_list = {}
                for meal_data in st.session_state.test_meals.values():
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
                
                st.success("Grocery list generated successfully!")
    
    with col2:
        if st.button("📄 Export PDF Meal Plan"):
            with st.spinner("Creating branded PDF with meal plan and grocery list..."):
                try:
                    # Export to PDF
                    pdf_filename = export_meal_plan_pdf(st.session_state.test_meals, {})
                    
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
                        st.error("Error creating PDF. Check console for details.")
                        
                except Exception as e:
                    import traceback
                    st.error(f"Error exporting PDF: {str(e)}")
                    st.text(traceback.format_exc())

# Clear button
if st.session_state.test_meals:
    if st.button("🔄 Clear Test Data"):
        st.session_state.test_meals = {}
        st.rerun()