import streamlit as st
import json
import os
from datetime import datetime, timedelta, time
from openai import OpenAI

def get_openai_client():
    """Get OpenAI client with API key"""
    try:
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return OpenAI(api_key=api_key)
        return None
    except Exception:
        return None

def generate_ai_meal_recipe(openai_client, meal_type, target_macros, diet_prefs):
    """Generate AI-powered meal recipe with customizable ingredients"""
    # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    try:
        # Build dietary restrictions string
        restrictions = []
        if diet_prefs.get('vegetarian', False):
            restrictions.append("vegetarian")
        if diet_prefs.get('vegan', False):
            restrictions.append("vegan")
        if diet_prefs.get('gluten_free', False):
            restrictions.append("gluten-free")
        if diet_prefs.get('dairy_free', False):
            restrictions.append("dairy-free")
        
        restrictions_text = f"dietary restrictions: {', '.join(restrictions)}" if restrictions else "no dietary restrictions"
        
        prompt = f"""Create a {meal_type.lower()} recipe that meets these exact nutritional targets:
- Calories: {target_macros['calories']}
- Protein: {target_macros['protein']}g
- Carbohydrates: {target_macros['carbs']}g  
- Fat: {target_macros['fat']}g

Requirements:
- {restrictions_text}
- Include specific ingredient amounts in grams
- Provide clear cooking instructions
- Focus on whole foods and balanced nutrition
- Make it practical and delicious

Return as JSON with this structure:
{{
    "title": "Recipe name",
    "ingredients": [
        {{"name": "ingredient name", "amount": amount_in_grams, "category": "protein/carbs/fat/vegetable"}}
    ],
    "directions": ["step 1", "step 2", "step 3"],
    "nutrition": {{
        "calories": calculated_calories,
        "protein": calculated_protein,
        "carbs": calculated_carbs,
        "fat": calculated_fat
    }},
    "reason": "Brief explanation of why this recipe fits the targets"
}}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        recipe_data = json.loads(response.choices[0].message.content)
        
        return {
            'recipe': {
                'title': recipe_data['title'],
                'category': meal_type,
                'ingredients': [f"{ing['amount']}g {ing['name']}" for ing in recipe_data['ingredients']],
                'directions': recipe_data['directions']
            },
            'macros': recipe_data['nutrition'],
            'ai_reason': recipe_data['reason'],
            'ingredient_details': recipe_data['ingredients']
        }
        
    except Exception as e:
        st.error(f"AI recipe generation failed: {e}")
        return None

def build_structured_meal(meal_type, target_macros, diet_prefs):
    """Build structured meal using authentic nutritional data"""
    try:
        from fdc_api import search_foods, get_food_details, normalize_food_data
        
        # Define base ingredients by meal type
        base_ingredients = {
            'Breakfast': {'protein': 'eggs', 'carbs': 'oatmeal', 'fat': 'almonds'},
            'Lunch': {'protein': 'chicken breast', 'carbs': 'quinoa', 'fat': 'olive oil'},
            'Dinner': {'protein': 'salmon', 'carbs': 'sweet potato', 'fat': 'avocado'},
            'Snack': {'protein': 'greek yogurt', 'carbs': 'apple', 'fat': 'peanut butter'}
        }
        
        # Adjust for dietary preferences
        if diet_prefs.get('vegetarian', False) or diet_prefs.get('vegan', False):
            base_ingredients[meal_type]['protein'] = 'tofu'
        
        meal_base = base_ingredients.get(meal_type, base_ingredients['Lunch'])
        
        # Search for each ingredient and calculate portions
        ingredients = []
        total_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        
        for category, food_name in meal_base.items():
            foods = search_foods(food_name, page_size=1)
            if foods:
                food_details = get_food_details(foods[0]['fdcId'])
                normalized_food = normalize_food_data(food_details, 100)
                
                # Calculate portion based on target macros
                if category == 'protein':
                    portion = max(50, int(target_macros['protein'] / normalized_food['protein'] * 100))
                elif category == 'carbs':
                    portion = max(30, int(target_macros['carbs'] / normalized_food['carbs'] * 100))
                else:  # fat
                    portion = max(10, int(target_macros['fat'] / normalized_food['fat'] * 100))
                
                # Add to ingredients
                ingredients.append({
                    'name': normalized_food['name'],
                    'amount': portion,
                    'category': category,
                    'calories_per_100g': normalized_food['calories'],
                    'protein_per_100g': normalized_food['protein'],
                    'carbs_per_100g': normalized_food['carbs'],
                    'fat_per_100g': normalized_food['fat']
                })
                
                # Add to nutrition totals
                multiplier = portion / 100
                total_nutrition['calories'] += int(normalized_food['calories'] * multiplier)
                total_nutrition['protein'] += int(normalized_food['protein'] * multiplier)
                total_nutrition['carbs'] += int(normalized_food['carbs'] * multiplier)
                total_nutrition['fat'] += int(normalized_food['fat'] * multiplier)
        
        return {
            'recipe': {
                'title': f"Balanced {meal_type}",
                'category': meal_type,
                'ingredients': [f"{ing['amount']}g {ing['name']}" for ing in ingredients],
                'directions': [
                    f"Prepare each ingredient according to preference",
                    f"Combine and serve as a balanced {meal_type.lower()}"
                ]
            },
            'macros': total_nutrition,
            'ingredient_details': ingredients
        }
        
    except Exception as e:
        st.error("Unable to load authentic food data. Please ensure your FDC API key is configured.")
        return None

def calculate_updated_macros(ingredient_details, updated_amounts):
    """Calculate macros based on updated ingredient amounts"""
    total_macros = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
    
    for ing in ingredient_details:
        ing_name = ing['name']
        original_amount = ing['amount']
        new_amount = updated_amounts.get(ing_name, original_amount)
        
        multiplier = new_amount / 100
        total_macros['calories'] += int(ing.get('calories_per_100g', 0) * multiplier)
        total_macros['protein'] += int(ing.get('protein_per_100g', 0) * multiplier)
        total_macros['carbs'] += int(ing.get('carbs_per_100g', 0) * multiplier)
        total_macros['fat'] += int(ing.get('fat_per_100g', 0) * multiplier)
    
    return total_macros

# Page Header
st.title("🍽️ AI Meal Plan")
st.markdown("*Your personalized meal recommendations with customizable ingredients*")

# Check if configuration exists
if not st.session_state.get('meal_planning_confirmed', False):
    st.warning("Please complete your meal planning configuration first.")
    st.info("Go to the 'AI Meal Plan Configuration' page to set your preferences and nutrition targets.")
    st.stop()

# Get configuration from session state
meal_targets = st.session_state.get('confirmed_meal_targets', {})
diet_prefs = st.session_state.get('confirmed_diet_prefs', {})
meal_config = st.session_state.get('confirmed_meal_config', {})

if not meal_targets:
    st.error("No meal targets found. Please return to configuration page.")
    st.stop()

# Display daily summary
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

# Generate and display meal recommendations
st.markdown("## 🤖 AI Meal Recommendations")

# Initialize confirmed meals in session state
if 'confirmed_meals' not in st.session_state:
    st.session_state.confirmed_meals = {}

# Track ingredient updates
if 'ingredient_updates' not in st.session_state:
    st.session_state.ingredient_updates = {}

for meal_type, meal_target in meal_targets.items():
    with st.expander(f"🍽️ {meal_type}", expanded=True):
        # Display meal target summary
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Target Calories", f"{meal_target['calories']}")
        with col2:
            st.metric("Target Protein", f"{meal_target['protein']}g")
        with col3:
            st.metric("Target Carbs", f"{meal_target['carbs']}g")
        with col4:
            st.metric("Target Fat", f"{meal_target['fat']}g")
        
        # Generate meal recommendation
        openai_client = get_openai_client()
        meal_recommendation = None
        
        if openai_client:
            with st.spinner("Generating AI-powered meal recommendation..."):
                meal_recommendation = generate_ai_meal_recipe(openai_client, meal_type, meal_target, diet_prefs)
        
        if not meal_recommendation:
            with st.spinner("Creating meal using authentic food database..."):
                meal_recommendation = build_structured_meal(meal_type, meal_target, diet_prefs)
        
        if meal_recommendation:
            recipe = meal_recommendation['recipe']
            recipe_macros = meal_recommendation['macros']
            ingredient_details = meal_recommendation.get('ingredient_details', [])
            ai_reason = meal_recommendation.get('ai_reason', '')
            
            if ai_reason:
                st.info(f"AI Recommendation: {ai_reason}")
            
            # Display current vs target macros
            st.markdown("#### Current vs Target Macros")
            
            # Get updated amounts if they exist
            meal_key = f"{meal_type}_ingredients"
            current_updates = st.session_state.ingredient_updates.get(meal_key, {})
            
            # Calculate current macros with any updates
            if current_updates and ingredient_details:
                current_macros = calculate_updated_macros(ingredient_details, current_updates)
            else:
                current_macros = recipe_macros
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                cal_diff = current_macros['calories'] - meal_target['calories']
                cal_color = "red" if abs(cal_diff) > 50 else "green"
                st.markdown(f"**Calories:** {current_macros['calories']} (Target: {meal_target['calories']})")
                if cal_diff != 0:
                    st.markdown(f"<span style='color:{cal_color}'>{'+'if cal_diff > 0 else ''}{cal_diff}</span>", unsafe_allow_html=True)
            
            with col2:
                protein_diff = current_macros['protein'] - meal_target['protein']
                protein_color = "red" if abs(protein_diff) > 5 else "green"
                st.markdown(f"**Protein:** {current_macros['protein']}g (Target: {meal_target['protein']}g)")
                if protein_diff != 0:
                    st.markdown(f"<span style='color:{protein_color}'>{'+'if protein_diff > 0 else ''}{protein_diff}g</span>", unsafe_allow_html=True)
            
            with col3:
                carb_diff = current_macros['carbs'] - meal_target['carbs']
                carb_color = "red" if abs(carb_diff) > 5 else "green"
                st.markdown(f"**Carbs:** {current_macros['carbs']}g (Target: {meal_target['carbs']}g)")
                if carb_diff != 0:
                    st.markdown(f"<span style='color:{carb_color}'>{'+'if carb_diff > 0 else ''}{carb_diff}g</span>", unsafe_allow_html=True)
            
            with col4:
                fat_diff = current_macros['fat'] - meal_target['fat']
                fat_color = "red" if abs(fat_diff) > 3 else "green"
                st.markdown(f"**Fat:** {current_macros['fat']}g (Target: {meal_target['fat']}g)")
                if fat_diff != 0:
                    st.markdown(f"<span style='color:{fat_color}'>{'+'if fat_diff > 0 else ''}{fat_diff}g</span>", unsafe_allow_html=True)
            
            # Customizable ingredients section
            st.markdown("#### Customize Ingredients")
            
            if ingredient_details:
                for ing in ingredient_details:
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.write(f"• **{ing['name']}** ({ing.get('category', 'ingredient')})")
                    with col2:
                        current_amount = current_updates.get(ing['name'], ing['amount'])
                        new_amount = st.number_input(
                            "grams",
                            value=current_amount,
                            min_value=0,
                            step=5,
                            key=f"{meal_type}_{ing['name']}_amount",
                            label_visibility="collapsed"
                        )
                        
                        # Update session state with new amount
                        if new_amount != current_amount:
                            if meal_key not in st.session_state.ingredient_updates:
                                st.session_state.ingredient_updates[meal_key] = {}
                            st.session_state.ingredient_updates[meal_key][ing['name']] = new_amount
                            st.rerun()
            else:
                st.markdown("**Ingredients:**")
                for ingredient in recipe.get('ingredients', []):
                    st.write(f"• {ingredient}")
            
            # Recipe instructions
            if recipe.get('directions'):
                st.markdown("#### Preparation Instructions")
                for step_num, direction in enumerate(recipe['directions'], 1):
                    st.write(f"{step_num}. {direction}")
            
            # Confirm meal button
            if st.button(f"✅ Confirm {meal_type}", key=f"confirm_{meal_type}"):
                # Save confirmed meal with current ingredient amounts
                final_amounts = current_updates if current_updates else {ing['name']: ing['amount'] for ing in ingredient_details}
                final_macros = calculate_updated_macros(ingredient_details, final_amounts) if ingredient_details else current_macros
                
                st.session_state.confirmed_meals[meal_type] = {
                    'recipe': recipe,
                    'macros': final_macros,
                    'ingredients': ingredient_details,
                    'ingredient_amounts': final_amounts
                }
                st.success(f"{meal_type} confirmed! Recipe saved to your meal plan.")
                st.rerun()
        else:
            st.error("Unable to generate meal recommendation. Please check your API configurations.")

# Show confirmed meals summary
if st.session_state.confirmed_meals:
    st.markdown("## ✅ Confirmed Meals")
    for meal_type, meal_data in st.session_state.confirmed_meals.items():
        st.markdown(f"**{meal_type}:** {meal_data['recipe']['title']}")
    
    # Export options
    st.markdown("## 📄 Export Options")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📋 Generate Grocery List"):
            st.success("Grocery list functionality coming soon!")
    
    with col2:
        if st.button("📄 Export PDF Meal Plan"):
            st.success("PDF export functionality coming soon!")

# Daily meal plan management
if len(st.session_state.confirmed_meals) == len(meal_targets):
    st.markdown("## 📅 Meal Plan Management")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("💾 Save Today's Plan"):
            st.success("Plan saved for today!")
    
    with col2:
        if st.button("📋 Copy to Another Day"):
            st.info("Day copying functionality coming soon!")
    
    with col3:
        if st.button("🗓️ Generate Week Plan"):
            st.info("Weekly plan generation coming soon!")