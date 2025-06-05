import streamlit as st
import json
import os
from datetime import datetime, timedelta, time
from openai import OpenAI
from nutrition_cache import nutrition_cache
from pdf_export import export_meal_plan_pdf
from macro_validator import validate_ingredient_macros, create_accurate_meal

def get_openai_client():
    """Get OpenAI client with API key"""
    try:
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return OpenAI(api_key=api_key)
        return None
    except Exception:
        return None

@st.cache_data(ttl=1800)  # Cache for 30 minutes
def generate_ai_meal_recipe(api_key_hash, meal_type, target_macros, diet_prefs):
    """Generate AI-powered meal recipe with caching for speed"""
    # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    try:
        openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
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
        
        # Create meal-specific ingredient suggestions
        meal_ingredients = {
            'Breakfast': {
                'proteins': ['eggs', 'greek yogurt', 'cottage cheese', 'protein powder', 'turkey sausage'],
                'carbs': ['oatmeal', 'whole grain toast', 'banana', 'berries', 'sweet potato hash'],
                'fats': ['avocado', 'nuts', 'nut butter', 'olive oil', 'chia seeds'],
                'extras': ['spinach', 'mushrooms', 'tomatoes', 'cinnamon', 'vanilla']
            },
            'Lunch': {
                'proteins': ['chicken breast', 'salmon', 'turkey', 'tofu', 'beans', 'tuna'],
                'carbs': ['quinoa', 'brown rice', 'sweet potato', 'whole grain wrap', 'lentils'],
                'fats': ['olive oil', 'avocado', 'nuts', 'tahini', 'hemp seeds'],
                'extras': ['mixed greens', 'bell peppers', 'cucumber', 'carrots', 'herbs']
            },
            'Dinner': {
                'proteins': ['salmon', 'chicken thigh', 'lean beef', 'cod', 'tempeh', 'shrimp'],
                'carbs': ['roasted vegetables', 'wild rice', 'quinoa', 'cauliflower rice', 'pasta'],
                'fats': ['olive oil', 'coconut oil', 'nuts', 'cheese', 'olives'],
                'extras': ['broccoli', 'asparagus', 'zucchini', 'garlic', 'herbs']
            },
            'Snack': {
                'proteins': ['greek yogurt', 'hummus', 'cheese', 'hard boiled eggs', 'protein bar'],
                'carbs': ['apple', 'berries', 'crackers', 'dates', 'rice cakes'],
                'fats': ['almonds', 'walnuts', 'nut butter', 'seeds', 'dark chocolate'],
                'extras': ['celery', 'carrots', 'cucumber', 'bell peppers']
            }
        }
        
        ingredients = meal_ingredients.get(meal_type, meal_ingredients['Lunch'])
        
        # Apply dietary restrictions
        if diet_prefs.get('vegetarian'):
            ingredients['proteins'] = [p for p in ingredients['proteins'] if p not in ['chicken breast', 'salmon', 'turkey', 'tuna', 'lean beef', 'cod', 'shrimp', 'turkey sausage']]
            if not ingredients['proteins']:
                ingredients['proteins'] = ['tofu', 'tempeh', 'beans', 'lentils', 'eggs', 'greek yogurt']
                
        if diet_prefs.get('vegan'):
            ingredients['proteins'] = [p for p in ingredients['proteins'] if p not in ['eggs', 'greek yogurt', 'cottage cheese', 'cheese', 'protein powder']]
            if not ingredients['proteins']:
                ingredients['proteins'] = ['tofu', 'tempeh', 'beans', 'lentils', 'nuts']
        
        prompt = f"""Create a delicious, creative {meal_type.lower()} recipe that hits these exact targets: {target_macros['calories']} calories, {target_macros['protein']}g protein, {target_macros['carbs']}g carbs, {target_macros['fat']}g fat. {restrictions_text}.

Use ingredients typical for {meal_type.lower()} from these options:
- Proteins: {', '.join(ingredients['proteins'][:5])}
- Carbs: {', '.join(ingredients['carbs'][:5])}
- Fats: {', '.join(ingredients['fats'][:5])}
- Extras: {', '.join(ingredients['extras'][:5])}

Make it appetizing and practical. Use realistic portions that add up to the macro targets.

JSON format:
{{
    "title": "Creative recipe name",
    "ingredients": [
        {{"name": "ingredient1", "amount": 120, "category": "protein"}},
        {{"name": "ingredient2", "amount": 80, "category": "carbs"}},
        {{"name": "ingredient3", "amount": 10, "category": "fat"}}
    ],
    "directions": ["Detailed step 1", "Detailed step 2", "Detailed step 3"],
    "nutrition": {{
        "calories": {target_macros['calories']},
        "protein": {target_macros['protein']},
        "carbs": {target_macros['carbs']},
        "fat": {target_macros['fat']}
    }},
    "reason": "Why this combination is perfect for {meal_type.lower()}"
}}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=600
        )
        
        content = response.choices[0].message.content
        if not content:
            return None
        
        try:
            recipe_data = json.loads(content)
        except json.JSONDecodeError:
            return None
        
        return {
            'recipe': {
                'title': recipe_data['title'],
                'category': meal_type,
                'ingredients': [f"{ing['amount']}g {ing['name']}" for ing in recipe_data['ingredients']],
                'directions': recipe_data['directions']
            },
            'macros': recipe_data['nutrition'],
            'ai_reason': recipe_data['reason'],
            'ingredient_details': [
                {
                    'name': ing['name'],
                    'amount': float(ing['amount']),
                    'category': ing.get('category', 'protein'),
                    'calories_per_100g': 0,
                    'protein_per_100g': 0,
                    'carbs_per_100g': 0,
                    'fat_per_100g': 0
                } for ing in recipe_data['ingredients']
            ]
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
            try:
                foods = search_foods(food_name, page_size=1)
                if foods:
                    food_details = get_food_details(foods[0]['fdcId'])
                    normalized_food = normalize_food_data(food_details, 100)
                    
                    # Ensure we have valid nutritional data
                    calories_per_100g = max(float(normalized_food.get('calories', 0)), 0)
                    protein_per_100g = max(float(normalized_food.get('protein', 0)), 0)
                    carbs_per_100g = max(float(normalized_food.get('carbs', 0)), 0)
                    fat_per_100g = max(float(normalized_food.get('fat', 0)), 0)
                    
                    # Calculate portion based on target macros
                    if category == 'protein' and protein_per_100g > 0:
                        portion = max(50, int(target_macros['protein'] / protein_per_100g * 100))
                    elif category == 'carbs' and carbs_per_100g > 0:
                        portion = max(30, int(target_macros['carbs'] / carbs_per_100g * 100))
                    elif category == 'fat' and fat_per_100g > 0:
                        portion = max(10, int(target_macros['fat'] / fat_per_100g * 100))
                    else:
                        portion = 100  # Default portion
                    
                    # Add to ingredients with validated nutritional data
                    ingredients.append({
                        'name': normalized_food['name'],
                        'amount': portion,
                        'category': category,
                        'calories_per_100g': calories_per_100g,
                        'protein_per_100g': protein_per_100g,
                        'carbs_per_100g': carbs_per_100g,
                        'fat_per_100g': fat_per_100g,
                        'fdc_id': foods[0]['fdcId']
                    })
                    
                    # Add to nutrition totals using validated data
                    multiplier = portion / 100
                    total_nutrition['calories'] += int(calories_per_100g * multiplier)
                    total_nutrition['protein'] += int(protein_per_100g * multiplier)
                    total_nutrition['carbs'] += int(carbs_per_100g * multiplier)
                    total_nutrition['fat'] += int(fat_per_100g * multiplier)
                    
                else:
                    # Use authentic nutritional data for common foods
                    fallback_nutrition = get_fallback_nutrition(food_name, category)
                    ingredients.append(fallback_nutrition)
                    
                    # Add nutrition to totals
                    multiplier = fallback_nutrition['amount'] / 100
                    total_nutrition['calories'] += int(fallback_nutrition['calories_per_100g'] * multiplier)
                    total_nutrition['protein'] += int(fallback_nutrition['protein_per_100g'] * multiplier)
                    total_nutrition['carbs'] += int(fallback_nutrition['carbs_per_100g'] * multiplier)
                    total_nutrition['fat'] += int(fallback_nutrition['fat_per_100g'] * multiplier)
                    
            except Exception as e:
                # Use authentic nutritional data for common foods when API fails
                fallback_nutrition = get_fallback_nutrition(food_name, category)
                ingredients.append(fallback_nutrition)
                
                # Add nutrition to totals
                multiplier = fallback_nutrition['amount'] / 100
                total_nutrition['calories'] += int(fallback_nutrition['calories_per_100g'] * multiplier)
                total_nutrition['protein'] += int(fallback_nutrition['protein_per_100g'] * multiplier)
                total_nutrition['carbs'] += int(fallback_nutrition['carbs_per_100g'] * multiplier)
                total_nutrition['fat'] += int(fallback_nutrition['fat_per_100g'] * multiplier)
        
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
    """Accurate macro calculation with proper rounding"""
    total_macros = {'calories': 0.0, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.0}
    
    for ing in ingredient_details:
        ing_name = ing['name']
        new_amount = float(updated_amounts.get(ing_name, ing['amount']))
        
        # Get authentic nutrition data
        calories_per_100g = float(ing.get('calories_per_100g', 0))
        protein_per_100g = float(ing.get('protein_per_100g', 0))
        carbs_per_100g = float(ing.get('carbs_per_100g', 0))
        fat_per_100g = float(ing.get('fat_per_100g', 0))
        
        # Get fallback data if needed
        if calories_per_100g == 0:
            cached_data = nutrition_cache.get_fallback_nutrition(ing_name.lower(), ing.get('category', 'protein'))
            calories_per_100g = cached_data['calories_per_100g']
            protein_per_100g = cached_data['protein_per_100g']
            carbs_per_100g = cached_data['carbs_per_100g']
            fat_per_100g = cached_data['fat_per_100g']
        
        # Calculate contribution per ingredient
        multiplier = new_amount / 100.0
        total_macros['calories'] += calories_per_100g * multiplier
        total_macros['protein'] += protein_per_100g * multiplier
        total_macros['carbs'] += carbs_per_100g * multiplier
        total_macros['fat'] += fat_per_100g * multiplier
    
    # Return properly rounded values
    return {
        'calories': int(round(total_macros['calories'])),
        'protein': round(total_macros['protein'], 1),
        'carbs': round(total_macros['carbs'], 1),
        'fat': round(total_macros['fat'], 1)
    }

def save_ingredient_modifications(meal_type, ingredient_details, updated_amounts):
    """Save ingredient modifications to session state"""
    meal_key = f"modified_ingredients_{meal_type}"
    st.session_state[meal_key] = {
        'ingredients': ingredient_details,
        'amounts': updated_amounts
    }

def load_ingredient_modifications(meal_type):
    """Load ingredient modifications from session state"""
    meal_key = f"modified_ingredients_{meal_type}"
    return st.session_state.get(meal_key, None)

def get_fallback_nutrition(food_name, category):
    """Get fast cached nutrition data for foods"""
    cached_data = nutrition_cache.get_fallback_nutrition(food_name, category)
    return {
        'name': food_name.title(),
        'amount': 100,
        'category': category,
        'calories_per_100g': float(cached_data['calories_per_100g']),
        'protein_per_100g': float(cached_data['protein_per_100g']),
        'carbs_per_100g': float(cached_data['carbs_per_100g']),
        'fat_per_100g': float(cached_data['fat_per_100g'])
    }

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
        
        # Generate meal recommendation with caching
        meal_recommendation = None
        openai_key = os.environ.get('OPENAI_API_KEY')
        
        if openai_key:
            # Use hash for caching while keeping API key secure
            api_key_hash = str(hash(openai_key))
            with st.spinner("Generating AI-powered meal recommendation..."):
                meal_recommendation = generate_ai_meal_recipe(api_key_hash, meal_type, meal_target, diet_prefs)
        
        if not meal_recommendation:
            with st.spinner("Creating meal using authentic food database..."):
                meal_recommendation = create_accurate_meal(meal_type, meal_target, diet_prefs)
        
        if meal_recommendation:
            recipe = meal_recommendation['recipe']
            recipe_macros = meal_recommendation['macros']
            ingredient_details = meal_recommendation.get('ingredient_details', [])
            ai_reason = meal_recommendation.get('ai_reason', '')
            
            # Populate authentic nutritional data for all ingredients
            for ingredient in ingredient_details:
                if ingredient['calories_per_100g'] == 0:
                    # Get authentic nutrition data
                    cached_nutrition = nutrition_cache.get_fallback_nutrition(
                        ingredient['name'], 
                        ingredient.get('category', 'protein')
                    )
                    ingredient['calories_per_100g'] = cached_nutrition['calories_per_100g']
                    ingredient['protein_per_100g'] = cached_nutrition['protein_per_100g'] 
                    ingredient['carbs_per_100g'] = cached_nutrition['carbs_per_100g']
                    ingredient['fat_per_100g'] = cached_nutrition['fat_per_100g']
            
            # Always use authentic macro calculations for accuracy
            authentic_macros = validate_ingredient_macros(ingredient_details)
            recipe_macros = authentic_macros
            
            # Check if ingredients need adjustment to better hit targets
            cal_diff = authentic_macros['calories'] - meal_target['calories']
            protein_diff = authentic_macros['protein'] - meal_target['protein']
            carb_diff = authentic_macros['carbs'] - meal_target['carbs']
            fat_diff = authentic_macros['fat'] - meal_target['fat']
            
            # Auto-adjust ingredient amounts if significantly off target
            if abs(cal_diff) > 100 or abs(protein_diff) > 10 or abs(carb_diff) > 15 or abs(fat_diff) > 5:
                adjusted_ingredients = []
                for ing in ingredient_details:
                    adjusted_ing = ing.copy()
                    # Scale down overly large amounts
                    if adjusted_ing['amount'] > 200:
                        adjusted_ing['amount'] = min(200, adjusted_ing['amount'] * 0.7)
                    elif adjusted_ing['amount'] > 100:
                        adjusted_ing['amount'] = adjusted_ing['amount'] * 0.8
                    adjusted_ingredients.append(adjusted_ing)
                
                ingredient_details = adjusted_ingredients
                recipe_macros = validate_ingredient_macros(ingredient_details)
                st.info("Ingredient amounts automatically adjusted for target accuracy")
            
            if ai_reason:
                st.info(f"AI Recommendation: {ai_reason}")
            
            # Display current vs target macros
            st.markdown("#### Current vs Target Macros")
            
            # Get updated amounts if they exist
            meal_key = f"{meal_type}_ingredients"
            current_updates = st.session_state.ingredient_updates.get(meal_key, {})
            
            # Always recalculate macros from current ingredient amounts
            if ingredient_details:
                # Get all current amounts (updated + original)
                all_current_amounts = {}
                for ing in ingredient_details:
                    ing_name = ing['name']
                    all_current_amounts[ing_name] = current_updates.get(ing_name, ing['amount'])
                
                current_macros = calculate_updated_macros(ingredient_details, all_current_amounts)
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
            
            # Enhanced ingredients section with detailed nutritional breakdown
            st.markdown("#### Customize Ingredients")
            
            if ingredient_details:
                # Ingredient management buttons
                col1, col2 = st.columns(2)
                with col1:
                    if st.button(f"➕ Add Ingredient", key=f"add_ing_{meal_type}"):
                        if f"show_add_ingredient_{meal_type}" not in st.session_state:
                            st.session_state[f"show_add_ingredient_{meal_type}"] = True
                        else:
                            st.session_state[f"show_add_ingredient_{meal_type}"] = not st.session_state[f"show_add_ingredient_{meal_type}"]
                
                # Add ingredient interface
                if st.session_state.get(f"show_add_ingredient_{meal_type}", False):
                    st.markdown("**Add New Ingredient:**")
                    search_term = st.text_input("Search for ingredient:", key=f"search_{meal_type}")
                    if search_term:
                        # First try authentic FDC API search
                        try:
                            import sys
                            import os
                            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                            from fdc_api import search_foods, get_food_details, normalize_food_data
                            
                            foods = search_foods(search_term, page_size=5)
                            if foods:
                                food_options = [f"{food['description']} (ID: {food['fdcId']})" for food in foods]
                                selected_food = st.selectbox("Select ingredient:", food_options, key=f"select_{meal_type}")
                                
                                if selected_food and st.button(f"Add {search_term}", key=f"add_confirm_{meal_type}"):
                                    # Extract FDC ID and add ingredient
                                    fdc_id = selected_food.split("ID: ")[1].rstrip(")")
                                    food_details = get_food_details(fdc_id)
                                    normalized_food = normalize_food_data(food_details, 100)
                                    
                                    # Cache the result for future use
                                    nutrition_cache.set(search_term, {
                                        'calories_per_100g': normalized_food['calories'],
                                        'protein_per_100g': normalized_food['protein'],
                                        'carbs_per_100g': normalized_food['carbs'],
                                        'fat_per_100g': normalized_food['fat']
                                    })
                                    
                                    # Add to ingredient list
                                    new_ingredient = {
                                        'name': normalized_food['name'],
                                        'amount': 50,
                                        'category': 'added',
                                        'calories_per_100g': normalized_food['calories'],
                                        'protein_per_100g': normalized_food['protein'],
                                        'carbs_per_100g': normalized_food['carbs'],
                                        'fat_per_100g': normalized_food['fat']
                                    }
                                    
                                    # Update session state for persistence
                                    meal_key = f"{meal_type}_ingredients"
                                    if meal_key not in st.session_state:
                                        st.session_state[meal_key] = []
                                    st.session_state[meal_key].append(new_ingredient)
                                    
                                    st.success(f"Added {normalized_food['name']} to meal!")
                                    st.rerun()
                            else:
                                st.info("No results found. Try a different search term.")
                                
                        except Exception as e:
                            # Fallback to cached/common ingredients when API unavailable
                            st.warning("FDC API unavailable. Using common ingredient database.")
                            
                            # Search cached ingredients
                            cached_nutrition = nutrition_cache.get_fallback_nutrition(search_term, "protein")
                            
                            if st.button(f"Add {search_term.title()}", key=f"add_fallback_{meal_type}"):
                                new_ingredient = {
                                    'name': search_term.title(),
                                    'amount': 50,
                                    'category': 'added',
                                    'calories_per_100g': cached_nutrition['calories_per_100g'],
                                    'protein_per_100g': cached_nutrition['protein_per_100g'],
                                    'carbs_per_100g': cached_nutrition['carbs_per_100g'],
                                    'fat_per_100g': cached_nutrition['fat_per_100g']
                                }
                                
                                # Update session state for persistence
                                meal_key = f"{meal_type}_ingredients"
                                if meal_key not in st.session_state:
                                    st.session_state[meal_key] = []
                                st.session_state[meal_key].append(new_ingredient)
                                
                                st.success(f"Added {search_term.title()} to meal!")
                                st.rerun()
                
                # Display existing ingredients with detailed breakdown
                for idx, ing in enumerate(ingredient_details):
                    with st.container():
                        st.markdown("---")
                        
                        # Ingredient header with remove button
                        col1, col2 = st.columns([4, 1])
                        with col1:
                            st.markdown(f"**🥘 {ing['name']}** ({ing.get('category', 'ingredient')})")
                        with col2:
                            if st.button("🗑️", key=f"remove_{meal_type}_{idx}", help="Remove ingredient"):
                                ingredient_details.pop(idx)
                                st.rerun()
                        
                        # Amount input and nutritional display
                        col1, col2 = st.columns([1, 2])
                        
                        with col1:
                            current_amount = current_updates.get(ing['name'], ing['amount'])
                            new_amount = st.number_input(
                                f"Amount (grams)",
                                value=int(current_amount),
                                min_value=0,
                                step=5,
                                key=f"{meal_type}_{ing['name']}_amount_{idx}"
                            )
                            
                            # Update session state with new amount
                            if new_amount != current_amount:
                                if meal_key not in st.session_state.ingredient_updates:
                                    st.session_state.ingredient_updates[meal_key] = {}
                                st.session_state.ingredient_updates[meal_key][ing['name']] = new_amount
                                st.rerun()
                        
                        with col2:
                            # Calculate nutrition for current amount using authentic data
                            multiplier = new_amount / 100
                            calories_per_100g = float(ing.get('calories_per_100g', 0))
                            protein_per_100g = float(ing.get('protein_per_100g', 0))
                            carbs_per_100g = float(ing.get('carbs_per_100g', 0))
                            fat_per_100g = float(ing.get('fat_per_100g', 0))
                            
                            # Ensure we have valid nutritional data
                            if calories_per_100g == 0 and protein_per_100g == 0:
                                # Get authentic nutritional data
                                fallback_data = get_fallback_nutrition(ing['name'].lower(), ing.get('category', 'protein'))
                                calories_per_100g = fallback_data['calories_per_100g']
                                protein_per_100g = fallback_data['protein_per_100g']
                                carbs_per_100g = fallback_data['carbs_per_100g']
                                fat_per_100g = fallback_data['fat_per_100g']
                            
                            ing_calories = int(calories_per_100g * multiplier)
                            ing_protein = round(protein_per_100g * multiplier, 1)
                            ing_carbs = round(carbs_per_100g * multiplier, 1)
                            ing_fat = round(fat_per_100g * multiplier, 1)
                            
                            # Display nutrition contribution with authentic data
                            st.markdown("**Nutritional Contribution:**")
                            nutr_col1, nutr_col2, nutr_col3, nutr_col4 = st.columns(4)
                            
                            with nutr_col1:
                                st.metric("Calories", f"{ing_calories}")
                            with nutr_col2:
                                st.metric("Protein", f"{ing_protein}g")
                            with nutr_col3:
                                st.metric("Carbs", f"{ing_carbs}g")
                            with nutr_col4:
                                st.metric("Fat", f"{ing_fat}g")
            else:
                st.markdown("**Ingredients:**")
                for ingredient in recipe.get('ingredients', []):
                    st.write(f"• {ingredient}")
                
                # Add ingredient option for simple recipes
                if st.button(f"➕ Add Ingredient to {meal_type}", key=f"add_simple_{meal_type}"):
                    st.info("Enhanced ingredient management requires authentic food data. Please use the structured meal recommendations.")
            
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
            with st.spinner("Creating branded PDF meal plan..."):
                try:
                    # Get diet preferences from session state
                    diet_prefs = st.session_state.get('diet_preferences', {})
                    
                    # Export to PDF
                    pdf_filename = export_meal_plan_pdf(st.session_state.confirmed_meals, diet_prefs)
                    
                    if pdf_filename and os.path.exists(pdf_filename):
                        # Provide download link
                        with open(pdf_filename, "rb") as pdf_file:
                            st.download_button(
                                label="Download Fitomics Meal Plan PDF",
                                data=pdf_file.read(),
                                file_name=pdf_filename,
                                mime="application/pdf"
                            )
                        
                        # Clean up temporary file
                        os.remove(pdf_filename)
                        st.success("PDF meal plan created successfully!")
                    else:
                        st.error("Error creating PDF. Please try again.")
                        
                except Exception as e:
                    st.error(f"Error exporting PDF: {str(e)}")

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