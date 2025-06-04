import streamlit as st
import pandas as pd
import json
import sys
import os
import random
import math
from datetime import datetime, date
from openai import OpenAI

# Import utilities
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import utils

# Initialize OpenAI client
def get_openai_client():
    """Get OpenAI client with API key"""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        return OpenAI(api_key=api_key)
    except Exception as e:
        st.error(f"Error initializing OpenAI: {str(e)}")
        return None

st.set_page_config(page_title="AI Meal Planner", page_icon="🤖", layout="wide")

# Load Fitomics recipes
@st.cache_data
def load_fitomics_recipes():
    try:
        with open('data/fitomics_recipes.json', 'r') as f:
            recipes = json.load(f)
            return recipes
    except Exception as e:
        st.error(f"Error loading recipes: {str(e)}")
        return []

def calculate_recipe_macros(recipe, serving_multiplier=1.0):
    """Calculate macros for a recipe with serving adjustment"""
    try:
        base_calories = recipe.get('estimated_macros', {}).get('calories', 0)
        base_protein = recipe.get('estimated_macros', {}).get('protein', 0)
        base_carbs = recipe.get('estimated_macros', {}).get('carbs', 0)
        base_fat = recipe.get('estimated_macros', {}).get('fat', 0)
        
        return {
            'calories': int(base_calories * serving_multiplier),
            'protein': int(base_protein * serving_multiplier),
            'carbs': int(base_carbs * serving_multiplier),
            'fat': int(base_fat * serving_multiplier)
        }
    except:
        return {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}

def get_macro_additions():
    """Get common macro addition options"""
    return {
        'protein': [
            {'name': 'Protein Powder (1 scoop)', 'calories': 120, 'protein': 25, 'carbs': 2, 'fat': 1},
            {'name': 'Greek Yogurt (100g)', 'calories': 100, 'protein': 10, 'carbs': 4, 'fat': 0},
            {'name': 'Chicken Breast (100g)', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 4},
            {'name': 'Egg (1 large)', 'calories': 70, 'protein': 6, 'carbs': 1, 'fat': 5}
        ],
        'carbs': [
            {'name': 'White Rice (50g dry)', 'calories': 180, 'protein': 4, 'carbs': 38, 'fat': 1},
            {'name': 'Banana (1 medium)', 'calories': 105, 'protein': 1, 'carbs': 27, 'fat': 0},
            {'name': 'Oats (40g dry)', 'calories': 150, 'protein': 5, 'carbs': 27, 'fat': 3},
            {'name': 'Sweet Potato (100g)', 'calories': 86, 'protein': 2, 'carbs': 20, 'fat': 0}
        ],
        'fat': [
            {'name': 'Olive Oil (1 tbsp)', 'calories': 120, 'protein': 0, 'carbs': 0, 'fat': 14},
            {'name': 'Almonds (28g)', 'calories': 164, 'protein': 6, 'carbs': 6, 'fat': 14},
            {'name': 'Avocado (50g)', 'calories': 80, 'protein': 1, 'carbs': 4, 'fat': 7},
            {'name': 'Peanut Butter (1 tbsp)', 'calories': 95, 'protein': 4, 'carbs': 3, 'fat': 8}
        ]
    }

def ai_analyze_recipes_for_meal(recipes, meal_type, target_macros, diet_prefs, openai_client):
    """Use AI to intelligently find the best recipe matches"""
    try:
        # Prepare recipe data for AI analysis
        recipe_summaries = []
        for i, recipe in enumerate(recipes[:20]):  # Limit to avoid token limits
            macros = recipe.get('estimated_macros', {})
            recipe_summaries.append({
                'index': i,
                'title': recipe.get('title', ''),
                'category': recipe.get('category', ''),
                'calories': macros.get('calories', 0),
                'protein': macros.get('protein', 0),
                'carbs': macros.get('carbs', 0),
                'fat': macros.get('fat', 0),
                'ingredients': recipe.get('ingredients', [])[:5]  # First 5 ingredients
            })
        
        # Create AI prompt
        diet_restrictions = []
        if diet_prefs.get('vegetarian'):
            diet_restrictions.append('vegetarian')
        if diet_prefs.get('vegan'):
            diet_restrictions.append('vegan')
        if diet_prefs.get('gluten_free'):
            diet_restrictions.append('gluten-free')
        
        prompt = f"""
        Analyze these Fitomics recipes for a {meal_type} meal targeting:
        - {target_macros['calories']} calories
        - {target_macros['protein']}g protein
        - {target_macros['carbs']}g carbs
        - {target_macros['fat']}g fat
        
        Dietary restrictions: {', '.join(diet_restrictions) if diet_restrictions else 'None'}
        
        Recipes: {json.dumps(recipe_summaries)}
        
        Return the top 3 recipe indices that best match the nutrition targets and dietary preferences, considering:
        1. Macro alignment (especially protein and calories)
        2. Meal type appropriateness
        3. Dietary restrictions compliance
        4. Ingredient quality and variety
        
        Respond with JSON: {{"recommendations": [{"index": 0, "reason": "explanation"}, ...]}}
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=500
        )
        
        result = json.loads(response.choices[0].message.content)
        recommendations = result.get('recommendations', [])
        
        # Convert AI recommendations to recipe objects
        ai_recipes = []
        for rec in recommendations[:3]:
            index = rec.get('index')
            if index is not None and 0 <= index < len(recipes):
                recipe = recipes[index]
                ai_recipes.append({
                    'recipe': recipe,
                    'match_score': 1000 - len(ai_recipes) * 100,  # Higher score for higher rank
                    'macros': recipe.get('estimated_macros', {}),
                    'ai_reason': rec.get('reason', 'AI recommended')
                })
        
        return ai_recipes
        
    except Exception as e:
        st.error(f"AI analysis failed: {str(e)}. Using fallback matching.")
        return find_best_recipes_for_meal_fallback(recipes, meal_type, target_macros, diet_prefs)

def find_best_recipes_for_meal_fallback(recipes, meal_type, target_macros, diet_prefs):
    """Fallback recipe matching when AI is not available"""
    suitable_recipes = []
    
    for recipe in recipes:
        # Filter by meal type with more flexibility
        recipe_category = recipe.get('category', '').lower()
        recipe_title = recipe.get('title', '').lower()
        
        # More flexible meal type matching
        is_suitable = False
        if meal_type.lower() == 'breakfast':
            is_suitable = 'breakfast' in recipe_category or any(word in recipe_title for word in ['pancake', 'egg', 'oat', 'smoothie', 'toast'])
        elif meal_type.lower() == 'lunch':
            is_suitable = recipe_category in ['dinner', 'main'] or any(word in recipe_title for word in ['salad', 'bowl', 'wrap', 'sandwich'])
        elif meal_type.lower() == 'dinner':
            is_suitable = recipe_category in ['dinner', 'main'] or any(word in recipe_title for word in ['chicken', 'beef', 'fish', 'pasta', 'rice'])
        elif meal_type.lower() == 'snack':
            is_suitable = recipe_category in ['snack', 'dessert'] or any(word in recipe_title for word in ['bar', 'ball', 'bite', 'cup'])
        
        if not is_suitable:
            continue
            
        # Check diet preferences with flexibility
        recipe_ingredients = recipe.get('ingredients', [])
        ingredients_text = ' '.join(recipe_ingredients).lower() if recipe_ingredients else ''
        full_text = recipe_title + ' ' + ingredients_text
        
        # Flexible dietary restriction checking
        if diet_prefs.get('vegetarian'):
            meat_keywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'bacon', 'ham']
            if any(meat in full_text for meat in meat_keywords):
                continue
        
        if diet_prefs.get('vegan'):
            animal_keywords = ['cheese', 'milk', 'butter', 'egg', 'yogurt', 'cream', 'honey']
            if any(animal in full_text for animal in animal_keywords):
                continue
        
        if diet_prefs.get('gluten_free'):
            gluten_keywords = ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye']
            if any(gluten in full_text for gluten in gluten_keywords):
                continue
            
        # Calculate macro alignment score
        recipe_macros = recipe.get('estimated_macros', {})
        if recipe_macros:
            calorie_diff = abs(recipe_macros.get('calories', 0) - target_macros['calories'])
            protein_diff = abs(recipe_macros.get('protein', 0) - target_macros['protein'])
            
            # Weighted scoring favoring protein alignment
            match_score = 1000 - (calorie_diff * 0.3 + protein_diff * 3)
            
            suitable_recipes.append({
                'recipe': recipe,
                'match_score': match_score,
                'macros': recipe_macros
            })
    
    # Sort by match score and return top 3
    suitable_recipes.sort(key=lambda x: x['match_score'], reverse=True)
    return suitable_recipes[:3]

def get_protein_sources(diet_prefs):
    """Get protein sources based on dietary preferences"""
    sources = {
        'Chicken Breast': {'protein': 31, 'calories_per_g': 1.65},
        'Lean Ground Turkey': {'protein': 29, 'calories_per_g': 1.89},
        'Salmon': {'protein': 25, 'calories_per_g': 2.08},
        'Tuna': {'protein': 30, 'calories_per_g': 1.32},
        'Eggs': {'protein': 13, 'calories_per_g': 1.55},
        'Greek Yogurt': {'protein': 10, 'calories_per_g': 0.59},
        'Cottage Cheese': {'protein': 11, 'calories_per_g': 0.98},
        'Protein Powder': {'protein': 25, 'calories_per_g': 4.0},
        'Tofu': {'protein': 8, 'calories_per_g': 0.76},
        'Tempeh': {'protein': 19, 'calories_per_g': 1.93},
        'Lentils': {'protein': 9, 'calories_per_g': 1.16},
        'Black Beans': {'protein': 9, 'calories_per_g': 1.32},
        'Quinoa': {'protein': 4.4, 'calories_per_g': 1.2}
    }
    
    if diet_prefs.get('vegan'):
        # Remove all animal products
        vegan_sources = {k: v for k, v in sources.items() if k in ['Protein Powder', 'Tofu', 'Tempeh', 'Lentils', 'Black Beans', 'Quinoa']}
        return vegan_sources
    elif diet_prefs.get('vegetarian'):
        # Remove meat and fish
        vegetarian_sources = {k: v for k, v in sources.items() if k not in ['Chicken Breast', 'Lean Ground Turkey', 'Salmon', 'Tuna']}
        return vegetarian_sources
    
    return sources

def get_carb_sources(diet_prefs):
    """Get carbohydrate sources based on dietary preferences"""
    sources = {
        'White Rice': {'carbs': 28, 'calories_per_g': 1.3},
        'Brown Rice': {'carbs': 23, 'calories_per_g': 1.12},
        'Quinoa': {'carbs': 22, 'calories_per_g': 1.2},
        'Sweet Potato': {'carbs': 20, 'calories_per_g': 0.86},
        'Oats': {'carbs': 66, 'calories_per_g': 3.89},
        'Banana': {'carbs': 23, 'calories_per_g': 0.89},
        'Apple': {'carbs': 14, 'calories_per_g': 0.52},
        'Whole Wheat Pasta': {'carbs': 31, 'calories_per_g': 1.31},
        'Whole Wheat Bread': {'carbs': 49, 'calories_per_g': 2.47},
        'Potatoes': {'carbs': 17, 'calories_per_g': 0.77}
    }
    
    if diet_prefs.get('gluten_free'):
        # Remove gluten-containing items
        gluten_free_sources = {k: v for k, v in sources.items() if k not in ['Whole Wheat Pasta', 'Whole Wheat Bread']}
        return gluten_free_sources
    
    return sources

def get_fat_sources(diet_prefs):
    """Get fat sources based on dietary preferences"""
    sources = {
        'Olive Oil': {'fat': 100, 'calories_per_g': 9.0},
        'Avocado': {'fat': 15, 'calories_per_g': 1.6},
        'Almonds': {'fat': 50, 'calories_per_g': 5.79},
        'Walnuts': {'fat': 65, 'calories_per_g': 6.54},
        'Peanut Butter': {'fat': 50, 'calories_per_g': 5.88},
        'Almond Butter': {'fat': 56, 'calories_per_g': 6.14},
        'Coconut Oil': {'fat': 100, 'calories_per_g': 8.62},
        'Chia Seeds': {'fat': 31, 'calories_per_g': 4.86},
        'Flax Seeds': {'fat': 42, 'calories_per_g': 5.34},
        'Tahini': {'fat': 60, 'calories_per_g': 5.95}
    }
    
    # All fat sources are generally suitable for all dietary preferences
    return sources

def get_vegetable_sources(diet_prefs):
    """Get vegetable sources (mostly for micronutrients and fiber)"""
    sources = {
        'Spinach': {'calories_per_g': 0.23, 'fiber': 2.2},
        'Broccoli': {'calories_per_g': 0.34, 'fiber': 2.6},
        'Bell Peppers': {'calories_per_g': 0.31, 'fiber': 2.5},
        'Zucchini': {'calories_per_g': 0.17, 'fiber': 1.0},
        'Cauliflower': {'calories_per_g': 0.25, 'fiber': 2.0},
        'Asparagus': {'calories_per_g': 0.20, 'fiber': 2.1},
        'Green Beans': {'calories_per_g': 0.35, 'fiber': 2.7},
        'Cucumber': {'calories_per_g': 0.16, 'fiber': 0.5},
        'Tomatoes': {'calories_per_g': 0.18, 'fiber': 1.2},
        'Carrots': {'calories_per_g': 0.41, 'fiber': 2.8}
    }
    
    # All vegetables are suitable for all dietary preferences
    return sources

def find_best_recipes_for_meal(recipes, meal_type, target_macros, diet_prefs):
    """Main function to find best recipes, with AI enhancement if available"""
    openai_client = get_openai_client()
    
    if openai_client:
        return ai_analyze_recipes_for_meal(recipes, meal_type, target_macros, diet_prefs, openai_client)
    else:
        return find_best_recipes_for_meal_fallback(recipes, meal_type, target_macros, diet_prefs)

# Header
st.title("🤖 AI Meal Planner")
st.markdown("*Intelligent meal planning using authentic Fitomics recipes*")

# Check for required data
if 'user_info' not in st.session_state or not st.session_state.user_info.get('gender'):
    st.warning("Please complete your setup in Initial Setup first.")
    st.stop()

if 'diet_preferences' not in st.session_state:
    st.warning("Please complete your diet preferences first.")
    st.stop()

# Check if day-specific nutrition targets exist
if 'day_specific_nutrition' not in st.session_state or not st.session_state.day_specific_nutrition:
    st.warning("Please set up your day-specific nutrition targets in Weekly Schedule and Nutrition first.")
    
    # Add button to sync nutrition targets
    if st.button("🔗 Go to Nutrition Targets", type="primary"):
        st.switch_page("pages/4_Weekly_Schedule_and_Nutrition.py")
    st.stop()

# Load recipes
recipes = load_fitomics_recipes()
if not recipes:
    st.error("Unable to load recipe database. Please refresh the page.")
    st.stop()

# Get user preferences
diet_prefs = st.session_state.diet_preferences

# Day-based meal planning interface
st.subheader("📅 Weekly Meal Plan")

# Day selector
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
selected_day = st.selectbox("Select day to plan meals:", days_of_week)

# Get nutrition targets for selected day
day_nutrition = st.session_state.day_specific_nutrition.get(selected_day, {})
if not day_nutrition:
    st.warning(f"No nutrition targets set for {selected_day}. Please set up your nutrition targets first.")
    st.stop()

# Display day's nutrition targets
st.markdown(f"### Nutrition Targets for {selected_day}")
target_cols = st.columns(4)

with target_cols[0]:
    st.metric("Calories", f"{day_nutrition.get('target_calories', 0)}")
with target_cols[1]:
    st.metric("Protein", f"{day_nutrition.get('protein', 0)}g")
with target_cols[2]:
    st.metric("Carbs", f"{day_nutrition.get('carbs', 0)}g")
with target_cols[3]:
    st.metric("Fat", f"{day_nutrition.get('fat', 0)}g")

# Initialize meal plan storage
if 'meal_plans' not in st.session_state:
    st.session_state.meal_plans = {}

if selected_day not in st.session_state.meal_plans:
    st.session_state.meal_plans[selected_day] = {
        'breakfast': {'recipes': [], 'additions': []},
        'lunch': {'recipes': [], 'additions': []},
        'dinner': {'recipes': [], 'additions': []},
        'snack': {'recipes': [], 'additions': []}
    }

# Meal planning interface
st.markdown("---")
st.markdown("### Plan Your Meals")

# Calculate target macros per meal (rough distribution)
total_calories = day_nutrition.get('target_calories', 2000)
total_protein = day_nutrition.get('protein', 150)
total_carbs = day_nutrition.get('carbs', 200)
total_fat = day_nutrition.get('fat', 70)

# Typical meal distribution
meal_distributions = {
    'breakfast': 0.25,
    'lunch': 0.35,
    'dinner': 0.35,
    'snack': 0.05
}

# Meal tabs
meal_tabs = st.tabs(["🍳 Breakfast", "🥗 Lunch", "🍽️ Dinner", "🍎 Snack"])

for i, (meal_type, tab) in enumerate(zip(['breakfast', 'lunch', 'dinner', 'snack'], meal_tabs)):
    with tab:
        # Calculate target macros for this meal
        meal_target = {
            'calories': int(total_calories * meal_distributions[meal_type]),
            'protein': int(total_protein * meal_distributions[meal_type]),
            'carbs': int(total_carbs * meal_distributions[meal_type]),
            'fat': int(total_fat * meal_distributions[meal_type])
        }
        
        st.markdown(f"**Target for {meal_type.title()}:** {meal_target['calories']} cal | {meal_target['protein']}g protein | {meal_target['carbs']}g carbs | {meal_target['fat']}g fat")
        
        # Find recommended recipes
        recommended_recipes = find_best_recipes_for_meal(recipes, meal_type, meal_target, diet_prefs)
        
        if recommended_recipes:
            st.markdown("#### Recommended Recipes")
            
            # Display recipe options
            for j, rec_data in enumerate(recommended_recipes):
                recipe = rec_data['recipe']
                recipe_macros = rec_data['macros']
                ai_reason = rec_data.get('ai_reason', '')
                
                with st.expander(f"Option {j+1}: {recipe.get('title', 'Untitled Recipe')}", expanded=(j==0)):
                    if ai_reason:
                        st.info(f"AI Recommendation: {ai_reason}")
                    
                    col1, col2 = st.columns([2, 1])
                    
                    with col1:
                        # Recipe details
                        st.write(f"**Category:** {recipe.get('category', 'N/A')}")
                        if recipe.get('ingredients'):
                            st.write("**Key Ingredients:**")
                            ingredients = recipe['ingredients'][:5] if len(recipe['ingredients']) > 5 else recipe['ingredients']
                            for ingredient in ingredients:
                                st.write(f"• {ingredient}")
                        
                        # Serving adjustment
                        st.markdown("**Adjust Serving Size:**")
                        serving_multiplier = st.slider(
                            "Serving multiplier",
                            min_value=0.25,
                            max_value=3.0,
                            value=1.0,
                            step=0.25,
                            key=f"serving_{selected_day}_{meal_type}_{j}"
                        )
                        
                        # Calculate adjusted macros
                        adjusted_macros = calculate_recipe_macros(recipe, serving_multiplier)
                        
                        st.write(f"**Adjusted Nutrition:** {adjusted_macros['calories']} cal | {adjusted_macros['protein']}g protein | {adjusted_macros['carbs']}g carbs | {adjusted_macros['fat']}g fat")
                        
                        # Macro gap analysis
                        cal_gap = meal_target['calories'] - adjusted_macros['calories']
                        protein_gap = meal_target['protein'] - adjusted_macros['protein']
                        carb_gap = meal_target['carbs'] - adjusted_macros['carbs']
                        fat_gap = meal_target['fat'] - adjusted_macros['fat']
                        
                        if abs(cal_gap) > 50 or abs(protein_gap) > 5:
                            st.markdown("**Macro Gap Analysis:**")
                            if cal_gap > 50:
                                st.write(f"🔴 Need {cal_gap} more calories")
                            elif cal_gap < -50:
                                st.write(f"🟡 {abs(cal_gap)} calories over target")
                            
                            if protein_gap > 5:
                                st.write(f"🔴 Need {protein_gap}g more protein")
                            elif protein_gap < -5:
                                st.write(f"🟡 {abs(protein_gap)}g protein over target")
                            
                            # Suggest additions
                            st.markdown("**Suggested Additions:**")
                            macro_additions = get_macro_additions()
                            
                            if protein_gap > 5:
                                for addition in macro_additions['protein'][:2]:
                                    if addition['protein'] >= protein_gap * 0.5:
                                        st.write(f"• {addition['name']} (+{addition['calories']} cal, +{addition['protein']}g protein)")
                            
                            if carb_gap > 10:
                                for addition in macro_additions['carbs'][:2]:
                                    if addition['carbs'] >= carb_gap * 0.5:
                                        st.write(f"• {addition['name']} (+{addition['calories']} cal, +{addition['carbs']}g carbs)")
                            
                            if fat_gap > 5:
                                for addition in macro_additions['fat'][:2]:
                                    if addition['fat'] >= fat_gap * 0.5:
                                        st.write(f"• {addition['name']} (+{addition['calories']} cal, +{addition['fat']}g fat)")
                    
                    with col2:
                        # Add to meal plan button
                        if st.button(f"Add to {meal_type.title()}", key=f"add_{selected_day}_{meal_type}_{j}"):
                            # Store the selected recipe and serving size
                            meal_plan_entry = {
                                'recipe': recipe,
                                'serving_multiplier': serving_multiplier,
                                'adjusted_macros': adjusted_macros
                            }
                            
                            st.session_state.meal_plans[selected_day][meal_type]['recipes'].append(meal_plan_entry)
                            st.success(f"Added {recipe.get('title')} to {meal_type}!")
                            st.rerun()
        
        # Smart meal builder fallback
        if not recommended_recipes or len(recommended_recipes) == 0:
            st.markdown("#### Smart Meal Builder")
            st.info("No pre-made recipes found for your preferences. Build a custom meal using these components:")
            
            # Get food components based on dietary preferences
            protein_sources = get_protein_sources(diet_prefs)
            carb_sources = get_carb_sources(diet_prefs)
            fat_sources = get_fat_sources(diet_prefs)
            vegetable_sources = get_vegetable_sources(diet_prefs)
            
            with st.expander("Build Custom Meal", expanded=True):
                col1, col2 = st.columns(2)
                
                with col1:
                    selected_protein = st.selectbox(
                        "Choose protein source:",
                        options=list(protein_sources.keys()),
                        key=f"protein_{selected_day}_{meal_type}"
                    )
                    protein_amount = st.slider(
                        "Protein amount (g):",
                        min_value=0,
                        max_value=200,
                        value=meal_target['protein'],
                        step=5,
                        key=f"protein_amt_{selected_day}_{meal_type}"
                    )
                    
                    selected_carb = st.selectbox(
                        "Choose carb source:",
                        options=list(carb_sources.keys()),
                        key=f"carb_{selected_day}_{meal_type}"
                    )
                    carb_amount = st.slider(
                        "Carb amount (g):",
                        min_value=0,
                        max_value=150,
                        value=meal_target['carbs'],
                        step=5,
                        key=f"carb_amt_{selected_day}_{meal_type}"
                    )
                
                with col2:
                    selected_fat = st.selectbox(
                        "Choose fat source:",
                        options=list(fat_sources.keys()),
                        key=f"fat_{selected_day}_{meal_type}"
                    )
                    fat_amount = st.slider(
                        "Fat amount (g):",
                        min_value=0,
                        max_value=100,
                        value=meal_target['fat'],
                        step=2,
                        key=f"fat_amt_{selected_day}_{meal_type}"
                    )
                    
                    selected_vegetables = st.multiselect(
                        "Add vegetables:",
                        options=list(vegetable_sources.keys()),
                        default=list(vegetable_sources.keys())[:2],
                        key=f"veggies_{selected_day}_{meal_type}"
                    )
                
                # Calculate custom meal macros
                protein_cals = protein_amount * 4
                carb_cals = carb_amount * 4
                fat_cals = fat_amount * 9
                total_cals = protein_cals + carb_cals + fat_cals
                
                st.markdown("**Custom Meal Nutrition:**")
                st.write(f"Calories: {total_cals} | Protein: {protein_amount}g | Carbs: {carb_amount}g | Fat: {fat_amount}g")
                
                # Show how close to target
                cal_diff = total_cals - meal_target['calories']
                protein_diff = protein_amount - meal_target['protein']
                
                if abs(cal_diff) <= 50 and abs(protein_diff) <= 10:
                    st.success("Great macro alignment!")
                elif abs(cal_diff) <= 100:
                    st.warning("Close to target - consider small adjustments")
                else:
                    st.error("Significant macro difference - adjust portions")
                
                if st.button(f"Add Custom Meal to {meal_type.title()}", key=f"add_custom_{selected_day}_{meal_type}"):
                    # Create custom meal entry
                    custom_meal = {
                        'recipe': {
                            'title': f"Custom {meal_type.title()}",
                            'category': 'custom',
                            'ingredients': [
                                f"{selected_protein}",
                                f"{selected_carb}",
                                f"{selected_fat}",
                                *selected_vegetables
                            ]
                        },
                        'serving_multiplier': 1.0,
                        'adjusted_macros': {
                            'calories': total_cals,
                            'protein': protein_amount,
                            'carbs': carb_amount,
                            'fat': fat_amount
                        }
                    }
                    
                    st.session_state.meal_plans[selected_day][meal_type]['recipes'].append(custom_meal)
                    st.success(f"Added custom meal to {meal_type}!")
                    st.rerun()
        
        elif len(recommended_recipes) < 3:
            st.markdown("#### Additional Options")
            st.info("Limited recipe matches found. You can also build a custom meal above or try the meal builder.")
        
        # Display current meal plan for this meal
        current_meal_recipes = st.session_state.meal_plans[selected_day][meal_type]['recipes']
        if current_meal_recipes:
            st.markdown("#### Current Meal Plan")
            total_meal_macros = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            
            for k, meal_entry in enumerate(current_meal_recipes):
                recipe = meal_entry['recipe']
                macros = meal_entry['adjusted_macros']
                
                # Add to total
                for macro in total_meal_macros:
                    total_meal_macros[macro] += macros[macro]
                
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.write(f"**{recipe.get('title')}** (x{meal_entry['serving_multiplier']})")
                    st.write(f"{macros['calories']} cal | {macros['protein']}g protein | {macros['carbs']}g carbs | {macros['fat']}g fat")
                
                with col2:
                    if st.button("Remove", key=f"remove_{selected_day}_{meal_type}_{k}"):
                        st.session_state.meal_plans[selected_day][meal_type]['recipes'].pop(k)
                        st.rerun()
            
            # Show meal totals vs targets
            st.markdown("**Meal Totals vs Targets:**")
            macro_comparison_cols = st.columns(4)
            
            with macro_comparison_cols[0]:
                cal_diff = total_meal_macros['calories'] - meal_target['calories']
                color = "🟢" if abs(cal_diff) <= 50 else "🟡" if abs(cal_diff) <= 100 else "🔴"
                st.write(f"{color} {total_meal_macros['calories']}/{meal_target['calories']} cal ({cal_diff:+d})")
            
            with macro_comparison_cols[1]:
                protein_diff = total_meal_macros['protein'] - meal_target['protein']
                color = "🟢" if abs(protein_diff) <= 5 else "🟡" if abs(protein_diff) <= 10 else "🔴"
                st.write(f"{color} {total_meal_macros['protein']}/{meal_target['protein']}g protein ({protein_diff:+d}g)")
            
            with macro_comparison_cols[2]:
                carb_diff = total_meal_macros['carbs'] - meal_target['carbs']
                color = "🟢" if abs(carb_diff) <= 10 else "🟡" if abs(carb_diff) <= 20 else "🔴"
                st.write(f"{color} {total_meal_macros['carbs']}/{meal_target['carbs']}g carbs ({carb_diff:+d}g)")
            
            with macro_comparison_cols[3]:
                fat_diff = total_meal_macros['fat'] - meal_target['fat']
                color = "🟢" if abs(fat_diff) <= 5 else "🟡" if abs(fat_diff) <= 10 else "🔴"
                st.write(f"{color} {total_meal_macros['fat']}/{meal_target['fat']}g fat ({fat_diff:+d}g)")

# Daily summary
st.markdown("---")
st.markdown("### Daily Summary")

# Calculate total daily macros from meal plan
daily_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
day_meal_plan = st.session_state.meal_plans.get(selected_day, {})

for meal_type in ['breakfast', 'lunch', 'dinner', 'snack']:
    meal_recipes = day_meal_plan.get(meal_type, {}).get('recipes', [])
    for meal_entry in meal_recipes:
        macros = meal_entry['adjusted_macros']
        for macro in daily_totals:
            daily_totals[macro] += macros[macro]

# Display daily totals vs targets
summary_cols = st.columns(4)

with summary_cols[0]:
    cal_diff = daily_totals['calories'] - total_calories
    color = "🟢" if abs(cal_diff) <= 100 else "🟡" if abs(cal_diff) <= 200 else "🔴"
    st.metric("Daily Calories", f"{daily_totals['calories']}/{total_calories}", f"{cal_diff:+d}")

with summary_cols[1]:
    protein_diff = daily_totals['protein'] - total_protein
    color = "🟢" if abs(protein_diff) <= 10 else "🟡" if abs(protein_diff) <= 20 else "🔴"
    st.metric("Daily Protein", f"{daily_totals['protein']}/{total_protein}g", f"{protein_diff:+d}g")

with summary_cols[2]:
    carb_diff = daily_totals['carbs'] - total_carbs
    color = "🟢" if abs(carb_diff) <= 20 else "🟡" if abs(carb_diff) <= 40 else "🔴"
    st.metric("Daily Carbs", f"{daily_totals['carbs']}/{total_carbs}g", f"{carb_diff:+d}g")

with summary_cols[3]:
    fat_diff = daily_totals['fat'] - total_fat
    color = "🟢" if abs(fat_diff) <= 10 else "🟡" if abs(fat_diff) <= 20 else "🔴"
    st.metric("Daily Fat", f"{daily_totals['fat']}/{total_fat}g", f"{fat_diff:+d}g")

# Export options
if any(st.session_state.meal_plans.get(day, {}).get(meal, {}).get('recipes', []) for day in days_of_week for meal in ['breakfast', 'lunch', 'dinner', 'snack']):
    st.markdown("---")
    st.markdown("### Export Options")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📋 Generate Grocery List", type="secondary"):
            st.info("Grocery list generation coming soon!")
    
    with col2:
        if st.button("📄 Export PDF Meal Plan", type="primary"):
            st.info("PDF export with branded meal plan coming soon!")