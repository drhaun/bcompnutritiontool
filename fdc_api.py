import requests
import json
import os
import pandas as pd
from fuzzywuzzy import process
import streamlit as st

# USDA FoodData Central API
FDC_API_URL = "https://api.nal.usda.gov/fdc/v1"
FDC_SEARCH_URL = f"{FDC_API_URL}/foods/search"
FDC_FOOD_DETAILS_URL = f"{FDC_API_URL}/food"

# Cache directory
CACHE_DIR = "data/food_cache"
FAVORITES_FILE = "data/user_favorites.json"
RECIPE_FILE = "data/user_recipes.json"

# Ensure cache directory exists
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs("data", exist_ok=True)

def get_api_key():
    """Get the API key for FDC API from secrets or environment"""
    # Try to get from Streamlit secrets first
    try:
        return st.secrets["FDC_API_KEY"]
    except:
        # Then try environment variables
        return os.environ.get("FDC_API_KEY", "DEMO_KEY")  # Using DEMO_KEY as fallback

def search_foods(query, data_type="Foundation,SR Legacy,Survey (FNDDS),Branded", page_size=25):
    """
    Search for foods in FDC database
    
    Parameters:
    query (str): Search query
    data_type (str): Type of data to search (Foundation, SR Legacy, Survey, Branded)
    page_size (int): Number of results to return
    
    Returns:
    list: List of food items
    """
    # Check if we have cached results
    cache_file = os.path.join(CACHE_DIR, f"search_{query.replace(' ', '_')}.json")
    
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            return json.load(f)
    
    # If not in cache, fetch from API
    api_key = get_api_key()
    
    params = {
        "api_key": api_key,
        "query": query,
        "dataType": data_type,
        "pageSize": page_size,
        "sortBy": "dataType.keyword",
        "sortOrder": "asc"
    }
    
    try:
        response = requests.get(FDC_SEARCH_URL, params=params)
        response.raise_for_status()
        
        results = response.json().get('foods', [])
        
        # Cache results
        with open(cache_file, 'w') as f:
            json.dump(results, f)
        
        return results
    
    except requests.exceptions.RequestException as e:
        st.error(f"Error searching foods: {e}")
        return []

def get_food_details(fdc_id):
    """
    Get detailed information for a specific food
    
    Parameters:
    fdc_id (str): FDC ID of the food
    
    Returns:
    dict: Food details
    """
    # Check if we have cached results
    cache_file = os.path.join(CACHE_DIR, f"food_{fdc_id}.json")
    
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            return json.load(f)
    
    # If not in cache, fetch from API
    api_key = get_api_key()
    
    params = {
        "api_key": api_key
    }
    
    try:
        response = requests.get(f"{FDC_FOOD_DETAILS_URL}/{fdc_id}", params=params)
        response.raise_for_status()
        
        result = response.json()
        
        # Cache results
        with open(cache_file, 'w') as f:
            json.dump(result, f)
        
        return result
    
    except requests.exceptions.RequestException as e:
        st.error(f"Error getting food details: {e}")
        return {}

def extract_nutrients(food_details):
    """
    Extract key nutrients from food details
    
    Parameters:
    food_details (dict): Food details from get_food_details
    
    Returns:
    dict: Dictionary of nutrient values
    """
    nutrients = {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    }
    
    # Get food nutrients
    food_nutrients = food_details.get('foodNutrients', [])
    
    # Nutrient ID mappings (FDC nutrient IDs)
    nutrient_ids = {
        'calories': [1008, 2047, 2048],  # Energy (kcal)
        'protein': [1003, 2049],         # Protein
        'carbs': [1005, 2050],           # Carbohydrates
        'fat': [1004, 2051],             # Total Fat
        'fiber': [1079, 2052]            # Fiber
    }
    
    # Extract nutrient values
    for nutrient in food_nutrients:
        nutrient_id = nutrient.get('nutrient', {}).get('id')
        amount = nutrient.get('amount', 0)
        
        # Match to our simplified nutrients
        for key, ids in nutrient_ids.items():
            if nutrient_id in ids:
                nutrients[key] = amount
                break
    
    return nutrients

def normalize_food_data(food_item, portion_size=100):
    """
    Normalize food data to standard format with nutrients per specified portion
    
    Parameters:
    food_item (dict): Food item from search or details
    portion_size (float): Size of portion in grams
    
    Returns:
    dict: Standardized food data
    """
    # If this is a search result, get the details
    if 'fdcId' in food_item and 'foodNutrients' not in food_item:
        food_details = get_food_details(food_item['fdcId'])
    else:
        food_details = food_item
    
    # Extract basic info
    food_name = food_details.get('description', 'Unknown Food')
    brand = food_details.get('brandName', '')
    if brand:
        food_name = f"{food_name} ({brand})"
    
    # Get nutrients
    nutrients = extract_nutrients(food_details)
    
    # Determine food category based on macronutrient ratio
    food_category = categorize_food(nutrients)
    
    # Create standardized food object
    return {
        'name': food_name,
        'fdcId': food_details.get('fdcId', ''),
        'calories': nutrients['calories'],
        'protein': nutrients['protein'],
        'carbs': nutrients['carbs'],
        'fat': nutrients['fat'],
        'fiber': nutrients['fiber'],
        'unit': f"{portion_size}g",
        'category': food_category,
        'source': 'USDA'
    }

def categorize_food(nutrients):
    """
    Categorize food based on macronutrient ratio
    
    Parameters:
    nutrients (dict): Nutrient values
    
    Returns:
    str: Category (protein, carb, fat, or balanced)
    """
    # Calculate total calories from macros
    protein_cals = nutrients['protein'] * 4
    carb_cals = nutrients['carbs'] * 4
    fat_cals = nutrients['fat'] * 9
    
    total_cals = protein_cals + carb_cals + fat_cals
    
    # Prevent division by zero
    if total_cals == 0:
        return 'balanced'
    
    # Calculate percentage of calories from each macro
    protein_pct = protein_cals / total_cals * 100
    carb_pct = carb_cals / total_cals * 100
    fat_pct = fat_cals / total_cals * 100
    
    # Categorize based on dominant macronutrient
    if protein_pct > 40 and protein_pct > carb_pct and protein_pct > fat_pct:
        return 'protein'
    elif carb_pct > 50 and carb_pct > protein_pct and carb_pct > fat_pct:
        return 'carb'
    elif fat_pct > 45 and fat_pct > protein_pct and fat_pct > carb_pct:
        return 'fat'
    
    # Check for high-fiber foods (vegetables)
    if nutrients['fiber'] > 2 and nutrients['calories'] < 50:
        return 'vegetable'
    
    # Check for fruits (mostly carbs, but not categorized as pure carb sources)
    if carb_pct > 70 and nutrients['fiber'] > 1.5 and fat_pct < 15:
        if nutrients['calories'] < 100:
            return 'fruit'
    
    return 'balanced'

def get_user_favorites():
    """Get user favorite foods from saved file"""
    if os.path.exists(FAVORITES_FILE):
        try:
            with open(FAVORITES_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_user_favorites(favorites):
    """Save user favorite foods to file"""
    with open(FAVORITES_FILE, 'w') as f:
        json.dump(favorites, f)

def add_to_favorites(food_item):
    """Add a food item to user favorites"""
    favorites = get_user_favorites()
    
    # Check if already in favorites
    for fav in favorites:
        if fav.get('fdcId') == food_item.get('fdcId'):
            return  # Already in favorites
    
    favorites.append(food_item)
    save_user_favorites(favorites)

def remove_from_favorites(food_id):
    """Remove a food item from user favorites"""
    favorites = get_user_favorites()
    favorites = [f for f in favorites if f.get('fdcId') != food_id]
    save_user_favorites(favorites)

def get_user_recipes():
    """Get user recipes from saved file"""
    if os.path.exists(RECIPE_FILE):
        try:
            with open(RECIPE_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_user_recipes(recipes):
    """Save user recipes to file"""
    with open(RECIPE_FILE, 'w') as f:
        json.dump(recipes, f)

def add_recipe(recipe_name, foods, portions, meal_type="Any"):
    """
    Add a recipe to user recipes
    
    Parameters:
    recipe_name (str): Name of the recipe
    foods (list): List of food items
    portions (dict): Dictionary of food portions
    meal_type (str): Type of meal (Breakfast, Lunch, Dinner, Snack, Any)
    """
    recipes = get_user_recipes()
    
    # Create recipe object
    recipe = {
        'name': recipe_name,
        'foods': foods,
        'portions': portions,
        'meal_type': meal_type,
        # Calculate totals
        'total_calories': sum(f['calories'] * portions.get(f['name'], 0) / 100 for f in foods),
        'total_protein': sum(f['protein'] * portions.get(f['name'], 0) / 100 for f in foods),
        'total_carbs': sum(f['carbs'] * portions.get(f['name'], 0) / 100 for f in foods),
        'total_fat': sum(f['fat'] * portions.get(f['name'], 0) / 100 for f in foods),
        'total_fiber': sum(f['fiber'] * portions.get(f['name'], 0) / 100 for f in foods)
    }
    
    # Check if recipe with this name already exists
    for i, r in enumerate(recipes):
        if r['name'] == recipe_name:
            # Update existing recipe
            recipes[i] = recipe
            save_user_recipes(recipes)
            return
    
    # Add new recipe
    recipes.append(recipe)
    save_user_recipes(recipes)

def recommend_foods(target_macros, category=None, excluded_foods=None):
    """
    Recommend foods based on target macros
    
    Parameters:
    target_macros (dict): Target macronutrients
    category (str): Food category to filter by
    excluded_foods (list): List of food IDs to exclude
    
    Returns:
    list: Recommended foods
    """
    # Get user favorites first
    favorites = get_user_favorites()
    
    if excluded_foods is None:
        excluded_foods = []
    
    # Filter favorites by category if specified
    if category:
        filtered_favorites = [f for f in favorites if f.get('category') == category]
    else:
        filtered_favorites = favorites
    
    # Remove excluded foods
    filtered_favorites = [f for f in filtered_favorites if f.get('fdcId') not in excluded_foods]
    
    # Sort by best match to target macros
    if filtered_favorites:
        # Calculate a score based on how well the food matches the target macros
        scored_foods = []
        
        for food in filtered_favorites:
            # Calculate the percentage of target macros this food provides
            protein_score = min(food['protein'] / target_macros['protein'] * 100, 100) if target_macros['protein'] > 0 else 0
            carbs_score = min(food['carbs'] / target_macros['carbs'] * 100, 100) if target_macros['carbs'] > 0 else 0
            fat_score = min(food['fat'] / target_macros['fat'] * 100, 100) if target_macros['fat'] > 0 else 0
            
            # Calculate overall score
            overall_score = (protein_score + carbs_score + fat_score) / 3
            
            scored_foods.append((food, overall_score))
        
        # Sort by score, highest first
        scored_foods.sort(key=lambda x: x[1], reverse=True)
        
        # Return the top 5 foods
        return [food for food, _ in scored_foods[:5]]
    
    # If no favorites or matches, return empty list
    return []

def recommend_recipes(target_macros, meal_type=None):
    """
    Recommend recipes based on target macros
    
    Parameters:
    target_macros (dict): Target macronutrients
    meal_type (str): Type of meal (Breakfast, Lunch, Dinner, Snack)
    
    Returns:
    list: Recommended recipes
    """
    # Get user recipes
    recipes = get_user_recipes()
    
    # Filter by meal type if specified
    if meal_type and meal_type != "Any":
        filtered_recipes = [r for r in recipes if r.get('meal_type') == meal_type or r.get('meal_type') == "Any"]
    else:
        filtered_recipes = recipes
    
    # Sort by best match to target macros
    if filtered_recipes:
        # Calculate a score based on how well the recipe matches the target macros
        scored_recipes = []
        
        for recipe in filtered_recipes:
            # Calculate the percentage of target macros this recipe provides
            protein_score = min(recipe['total_protein'] / target_macros['protein'] * 100, 100) if target_macros['protein'] > 0 else 0
            carbs_score = min(recipe['total_carbs'] / target_macros['carbs'] * 100, 100) if target_macros['carbs'] > 0 else 0
            fat_score = min(recipe['total_fat'] / target_macros['fat'] * 100, 100) if target_macros['fat'] > 0 else 0
            
            # Calculate overall score
            overall_score = (protein_score + carbs_score + fat_score) / 3
            
            scored_recipes.append((recipe, overall_score))
        
        # Sort by score, highest first
        scored_recipes.sort(key=lambda x: x[1], reverse=True)
        
        # Return the top 3 recipes
        return [recipe for recipe, _ in scored_recipes[:3]]
    
    # If no recipes or matches, return empty list
    return []