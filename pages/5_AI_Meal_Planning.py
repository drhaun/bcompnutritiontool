import streamlit as st
import pandas as pd
import json
import sys
import os
import random
import math
from datetime import datetime, date, timedelta
from openai import OpenAI
from fpdf import FPDF
from collections import defaultdict

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

def calculate_recipe_macros_from_ingredients(recipe, ingredient_adjustments):
    """Calculate macros based on individual ingredient adjustments"""
    # Comprehensive nutritional database per gram
    ingredient_nutrition = {
        # Proteins
        'egg whites': {'calories': 0.52, 'protein': 0.109, 'carbs': 0.007, 'fat': 0.002},
        'egg white': {'calories': 0.52, 'protein': 0.109, 'carbs': 0.007, 'fat': 0.002},
        'eggs': {'calories': 1.55, 'protein': 0.13, 'carbs': 0.011, 'fat': 0.11},
        'egg': {'calories': 1.55, 'protein': 0.13, 'carbs': 0.011, 'fat': 0.11},
        'chocolate protein powder': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        'protein powder': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        'vanilla protein': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        'whey protein': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        
        # Carbohydrates
        'banana': {'calories': 0.89, 'protein': 0.011, 'carbs': 0.228, 'fat': 0.003},
        'bananas': {'calories': 0.89, 'protein': 0.011, 'carbs': 0.228, 'fat': 0.003},
        'oats': {'calories': 3.89, 'protein': 0.17, 'carbs': 0.66, 'fat': 0.07},
        'oat': {'calories': 3.89, 'protein': 0.17, 'carbs': 0.66, 'fat': 0.07},
        'rolled oats': {'calories': 3.89, 'protein': 0.17, 'carbs': 0.66, 'fat': 0.07},
        'rice': {'calories': 1.3, 'protein': 0.027, 'carbs': 0.28, 'fat': 0.003},
        'white rice': {'calories': 1.3, 'protein': 0.027, 'carbs': 0.28, 'fat': 0.003},
        'brown rice': {'calories': 1.12, 'protein': 0.026, 'carbs': 0.23, 'fat': 0.009},
        'sweet potato': {'calories': 0.86, 'protein': 0.02, 'carbs': 0.20, 'fat': 0.001},
        'potato': {'calories': 0.77, 'protein': 0.02, 'carbs': 0.17, 'fat': 0.001},
        
        # Fats
        'olive oil': {'calories': 8.84, 'protein': 0.0, 'carbs': 0.0, 'fat': 1.0},
        'coconut oil': {'calories': 8.62, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.99},
        'butter': {'calories': 7.17, 'protein': 0.009, 'carbs': 0.006, 'fat': 0.81},
        'almond butter': {'calories': 6.14, 'protein': 0.21, 'carbs': 0.19, 'fat': 0.56},
        'peanut butter': {'calories': 5.88, 'protein': 0.25, 'carbs': 0.20, 'fat': 0.50},
        'almonds': {'calories': 5.79, 'protein': 0.21, 'carbs': 0.22, 'fat': 0.50},
        'walnuts': {'calories': 6.54, 'protein': 0.15, 'carbs': 0.14, 'fat': 0.65},
        'avocado': {'calories': 1.6, 'protein': 0.02, 'carbs': 0.085, 'fat': 0.147},
        
        # Dairy
        'milk': {'calories': 0.42, 'protein': 0.034, 'carbs': 0.05, 'fat': 0.01},
        'greek yogurt': {'calories': 0.59, 'protein': 0.10, 'carbs': 0.036, 'fat': 0.004},
        'cottage cheese': {'calories': 0.98, 'protein': 0.11, 'carbs': 0.036, 'fat': 0.043},
        'cheese': {'calories': 4.02, 'protein': 0.25, 'carbs': 0.013, 'fat': 0.333},
        
        # Common additions
        'baking soda': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
        'baking powder': {'calories': 0.53, 'protein': 0, 'carbs': 0.13, 'fat': 0},
        'vanilla': {'calories': 2.88, 'protein': 0, 'carbs': 0.13, 'fat': 0},
        'cinnamon': {'calories': 2.47, 'protein': 0.04, 'carbs': 0.81, 'fat': 0.01},
        'salt': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
        'honey': {'calories': 3.04, 'protein': 0.003, 'carbs': 0.824, 'fat': 0},
        'maple syrup': {'calories': 2.60, 'protein': 0.004, 'carbs': 0.677, 'fat': 0.006}
    }
    
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    for ingredient, multiplier in ingredient_adjustments.items():
        if multiplier <= 0:
            continue
            
        ingredient_lower = ingredient.lower().strip()
        
        # Extract quantity and unit
        import re
        estimated_grams = 0
        
        # Parse quantities with units
        if 'scoop' in ingredient_lower and 'protein' in ingredient_lower:
            estimated_grams = 30 * multiplier
        elif 'tbsp' in ingredient_lower or 'tablespoon' in ingredient_lower:
            if any(oil in ingredient_lower for oil in ['oil', 'butter']):
                estimated_grams = 14 * multiplier
            else:
                estimated_grams = 15 * multiplier
        elif 'tsp' in ingredient_lower or 'teaspoon' in ingredient_lower:
            estimated_grams = 4 * multiplier
        elif 'cup' in ingredient_lower:
            if 'oat' in ingredient_lower:
                estimated_grams = 80 * multiplier
            elif 'milk' in ingredient_lower:
                estimated_grams = 240 * multiplier
            else:
                estimated_grams = 150 * multiplier
        elif 'medium' in ingredient_lower and 'banana' in ingredient_lower:
            estimated_grams = 115 * multiplier
        elif 'large' in ingredient_lower and 'banana' in ingredient_lower:
            estimated_grams = 135 * multiplier
        elif 'small' in ingredient_lower and 'banana' in ingredient_lower:
            estimated_grams = 90 * multiplier
        elif 'g' in ingredient_lower:
            gram_match = re.search(r'(\d+)\s*g', ingredient_lower)
            if gram_match:
                estimated_grams = int(gram_match.group(1)) * multiplier
        elif any(char.isdigit() for char in ingredient):
            numbers = re.findall(r'\d+', ingredient)
            if numbers:
                num = int(numbers[0])
                if num > 500:
                    estimated_grams = num * 0.5 * multiplier
                else:
                    estimated_grams = num * multiplier
        
        # Default estimates if no quantity found
        if estimated_grams == 0:
            if any(word in ingredient_lower for word in ['protein', 'powder']):
                estimated_grams = 30 * multiplier
            elif any(word in ingredient_lower for word in ['oil', 'butter']):
                estimated_grams = 10 * multiplier
            elif 'banana' in ingredient_lower:
                estimated_grams = 115 * multiplier
            elif 'egg' in ingredient_lower:
                estimated_grams = 50 * multiplier
            else:
                estimated_grams = 50 * multiplier
        
        # Find matching ingredient and add nutrition
        for key, nutrition in ingredient_nutrition.items():
            if key in ingredient_lower:
                total_calories += nutrition['calories'] * estimated_grams
                total_protein += nutrition['protein'] * estimated_grams
                total_carbs += nutrition['carbs'] * estimated_grams
                total_fat += nutrition['fat'] * estimated_grams
                break
    
    return {
        'calories': max(1, int(total_calories)),
        'protein': max(0, int(total_protein)),
        'carbs': max(0, int(total_carbs)),
        'fat': max(0, int(total_fat))
    }

def calculate_recipe_macros(recipe, serving_multiplier=1.0):
    """Calculate accurate macros for a recipe with serving adjustment based on ingredients"""
    # Comprehensive nutritional database per gram
    ingredient_nutrition = {
        # Proteins
        'egg whites': {'calories': 0.52, 'protein': 0.109, 'carbs': 0.007, 'fat': 0.002},
        'egg white': {'calories': 0.52, 'protein': 0.109, 'carbs': 0.007, 'fat': 0.002},
        'eggs': {'calories': 1.55, 'protein': 0.13, 'carbs': 0.011, 'fat': 0.11},
        'egg': {'calories': 1.55, 'protein': 0.13, 'carbs': 0.011, 'fat': 0.11},
        'chocolate protein powder': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        'protein powder': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        'vanilla protein': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        'whey protein': {'calories': 3.8, 'protein': 0.75, 'carbs': 0.1, 'fat': 0.05},
        
        # Carbohydrates
        'banana': {'calories': 0.89, 'protein': 0.011, 'carbs': 0.228, 'fat': 0.003},
        'bananas': {'calories': 0.89, 'protein': 0.011, 'carbs': 0.228, 'fat': 0.003},
        'oats': {'calories': 3.89, 'protein': 0.17, 'carbs': 0.66, 'fat': 0.07},
        'oat': {'calories': 3.89, 'protein': 0.17, 'carbs': 0.66, 'fat': 0.07},
        'rolled oats': {'calories': 3.89, 'protein': 0.17, 'carbs': 0.66, 'fat': 0.07},
        'rice': {'calories': 1.3, 'protein': 0.027, 'carbs': 0.28, 'fat': 0.003},
        'white rice': {'calories': 1.3, 'protein': 0.027, 'carbs': 0.28, 'fat': 0.003},
        'brown rice': {'calories': 1.12, 'protein': 0.026, 'carbs': 0.23, 'fat': 0.009},
        'sweet potato': {'calories': 0.86, 'protein': 0.02, 'carbs': 0.20, 'fat': 0.001},
        'potato': {'calories': 0.77, 'protein': 0.02, 'carbs': 0.17, 'fat': 0.001},
        
        # Fats
        'olive oil': {'calories': 8.84, 'protein': 0.0, 'carbs': 0.0, 'fat': 1.0},
        'coconut oil': {'calories': 8.62, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.99},
        'butter': {'calories': 7.17, 'protein': 0.009, 'carbs': 0.006, 'fat': 0.81},
        'almond butter': {'calories': 6.14, 'protein': 0.21, 'carbs': 0.19, 'fat': 0.56},
        'peanut butter': {'calories': 5.88, 'protein': 0.25, 'carbs': 0.20, 'fat': 0.50},
        'almonds': {'calories': 5.79, 'protein': 0.21, 'carbs': 0.22, 'fat': 0.50},
        'walnuts': {'calories': 6.54, 'protein': 0.15, 'carbs': 0.14, 'fat': 0.65},
        'avocado': {'calories': 1.6, 'protein': 0.02, 'carbs': 0.085, 'fat': 0.147},
        
        # Dairy
        'milk': {'calories': 0.42, 'protein': 0.034, 'carbs': 0.05, 'fat': 0.01},
        'greek yogurt': {'calories': 0.59, 'protein': 0.10, 'carbs': 0.036, 'fat': 0.004},
        'cottage cheese': {'calories': 0.98, 'protein': 0.11, 'carbs': 0.036, 'fat': 0.043},
        'cheese': {'calories': 4.02, 'protein': 0.25, 'carbs': 0.013, 'fat': 0.333},
        
        # Common additions
        'baking soda': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
        'baking powder': {'calories': 0.53, 'protein': 0, 'carbs': 0.13, 'fat': 0},
        'vanilla': {'calories': 2.88, 'protein': 0, 'carbs': 0.13, 'fat': 0},
        'cinnamon': {'calories': 2.47, 'protein': 0.04, 'carbs': 0.81, 'fat': 0.01},
        'salt': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
        'honey': {'calories': 3.04, 'protein': 0.003, 'carbs': 0.824, 'fat': 0},
        'maple syrup': {'calories': 2.60, 'protein': 0.004, 'carbs': 0.677, 'fat': 0.006}
    }
    
    # Parse ingredients and calculate nutrition
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    if 'ingredients' in recipe and recipe['ingredients']:
        for ingredient in recipe['ingredients']:
            ingredient_lower = ingredient.lower().strip()
            
            # Extract quantity and unit
            import re
            
            # Common quantity patterns
            estimated_grams = 0
            
            # Parse quantities with units
            if 'scoop' in ingredient_lower and 'protein' in ingredient_lower:
                estimated_grams = 30  # Standard protein scoop
            elif 'tbsp' in ingredient_lower or 'tablespoon' in ingredient_lower:
                if any(oil in ingredient_lower for oil in ['oil', 'butter']):
                    estimated_grams = 14  # 1 tbsp oil/butter
                else:
                    estimated_grams = 15  # General tbsp
            elif 'tsp' in ingredient_lower or 'teaspoon' in ingredient_lower:
                estimated_grams = 4
            elif 'cup' in ingredient_lower:
                if 'oat' in ingredient_lower:
                    estimated_grams = 80  # 1 cup oats
                elif 'milk' in ingredient_lower:
                    estimated_grams = 240  # 1 cup milk
                else:
                    estimated_grams = 150  # General cup
            elif 'medium' in ingredient_lower and 'banana' in ingredient_lower:
                estimated_grams = 115  # Medium banana
            elif 'large' in ingredient_lower and 'banana' in ingredient_lower:
                estimated_grams = 135  # Large banana
            elif 'small' in ingredient_lower and 'banana' in ingredient_lower:
                estimated_grams = 90   # Small banana
            elif 'g' in ingredient_lower:
                # Extract grams directly
                gram_match = re.search(r'(\d+)\s*g', ingredient_lower)
                if gram_match:
                    estimated_grams = int(gram_match.group(1))
            elif any(char.isdigit() for char in ingredient):
                # Extract any number as estimate
                numbers = re.findall(r'\d+', ingredient)
                if numbers:
                    num = int(numbers[0])
                    if num > 500:  # Likely ml, convert estimate
                        estimated_grams = num * 0.5
                    else:
                        estimated_grams = num
            
            # If no quantity found, use reasonable defaults
            if estimated_grams == 0:
                if any(word in ingredient_lower for word in ['protein', 'powder']):
                    estimated_grams = 30
                elif any(word in ingredient_lower for word in ['oil', 'butter']):
                    estimated_grams = 10
                elif 'banana' in ingredient_lower:
                    estimated_grams = 115
                elif 'egg' in ingredient_lower:
                    estimated_grams = 50
                else:
                    estimated_grams = 50  # Default
            
            # Find matching ingredient and add nutrition
            for key, nutrition in ingredient_nutrition.items():
                if key in ingredient_lower:
                    total_calories += nutrition['calories'] * estimated_grams
                    total_protein += nutrition['protein'] * estimated_grams
                    total_carbs += nutrition['carbs'] * estimated_grams
                    total_fat += nutrition['fat'] * estimated_grams
                    break
    
    # Apply serving multiplier
    final_macros = {
        'calories': max(1, int(total_calories * serving_multiplier)),
        'protein': max(0, int(total_protein * serving_multiplier)),
        'carbs': max(0, int(total_carbs * serving_multiplier)),
        'fat': max(0, int(total_fat * serving_multiplier))
    }
    
    # If calculated values are too low, use reasonable minimums based on recipe type
    if final_macros['calories'] < 50:
        category = recipe.get('category', '').lower()
        if 'breakfast' in category:
            final_macros = {'calories': 320, 'protein': 18, 'carbs': 35, 'fat': 12}
        elif 'lunch' in category or 'dinner' in category:
            final_macros = {'calories': 420, 'protein': 32, 'carbs': 30, 'fat': 16}
        elif 'snack' in category:
            final_macros = {'calories': 180, 'protein': 8, 'carbs': 18, 'fat': 7}
        else:
            final_macros = {'calories': 350, 'protein': 22, 'carbs': 28, 'fat': 14}
    
    return final_macros

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
    """Use AI to intelligently find the best recipe matches with comprehensive dietary preferences"""
    try:
        # Prepare recipe data for AI analysis
        recipe_summaries = []
        for i, recipe in enumerate(recipes[:20]):  # Limit to avoid token limits
            macros = calculate_recipe_macros(recipe, 1.0)  # Use accurate macro calculation
            recipe_summaries.append({
                'index': i,
                'title': recipe.get('title', ''),
                'category': recipe.get('category', ''),
                'calories': macros.get('calories', 0),
                'protein': macros.get('protein', 0),
                'carbs': macros.get('carbs', 0),
                'fat': macros.get('fat', 0),
                'ingredients': recipe.get('ingredients', [])[:8]  # More ingredients for better analysis
            })
        
        # Build comprehensive dietary restrictions and preferences
        restrictions = []
        if diet_prefs.get('vegetarian'): restrictions.append('vegetarian')
        if diet_prefs.get('vegan'): restrictions.append('vegan')
        if diet_prefs.get('gluten_free'): restrictions.append('gluten-free')
        if diet_prefs.get('dairy_free'): restrictions.append('dairy-free')
        if diet_prefs.get('nut_free'): restrictions.append('nut-free')
        if diet_prefs.get('shellfish_free'): restrictions.append('shellfish-free')
        if diet_prefs.get('soy_free'): restrictions.append('soy-free')
        if diet_prefs.get('egg_free'): restrictions.append('egg-free')
        
        preferred_proteins = diet_prefs.get('preferred_proteins', [])
        preferred_carbs = diet_prefs.get('preferred_carbs', [])
        preferred_fats = diet_prefs.get('preferred_fats', [])
        disliked_foods = diet_prefs.get('disliked_foods', [])
        max_prep_time = diet_prefs.get('max_prep_time', '30 minutes')
        cooking_skill = diet_prefs.get('cooking_skill', 'Intermediate')
        budget_preference = diet_prefs.get('budget_preference', 'Moderate budget')
        
        prompt = f"""Analyze these Fitomics recipes for a {meal_type} meal targeting {target_macros['calories']} calories, {target_macros['protein']}g protein, {target_macros['carbs']}g carbs, {target_macros['fat']}g fat.

DIETARY REQUIREMENTS:
- Restrictions: {', '.join(restrictions) if restrictions else 'None'}
- Preferred proteins: {', '.join(preferred_proteins) if preferred_proteins else 'Any'}
- Preferred carbs: {', '.join(preferred_carbs) if preferred_carbs else 'Any'}
- Preferred fats: {', '.join(preferred_fats) if preferred_fats else 'Any'}
- Foods to avoid: {', '.join(disliked_foods) if disliked_foods else 'None'}
- Max prep time: {max_prep_time}
- Cooking skill: {cooking_skill}
- Budget preference: {budget_preference}

RECIPES: {json.dumps(recipe_summaries)}

Analyze and rank the top 3 recipes considering:
1. Macro alignment (protein and calories are most important)
2. Meal type appropriateness ({meal_type} should have suitable ingredients)
3. Dietary restrictions compliance (MUST avoid restricted foods)
4. Preferred ingredient matching (bonus for preferred proteins/carbs/fats)
5. Avoidance of disliked foods
6. Cooking complexity matching skill level
7. Budget-appropriate ingredients

Respond with JSON format: {{"recommendations": [{{"index": 0, "reason": "Brief explanation of why this recipe matches"}}, {{"index": 1, "reason": "Brief explanation"}}, {{"index": 2, "reason": "Brief explanation"}}]}}"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutrition expert analyzing Fitomics recipes for meal planning. Always respond with valid JSON format exactly as requested."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
            temperature=0.3
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
            recommendations = result.get('recommendations', [])
            
            # Convert AI recommendations to recipe objects
            ai_recipes = []
            for i, rec in enumerate(recommendations[:3]):
                index = rec.get('index')
                if index is not None and 0 <= index < len(recipes):
                    recipe = recipes[index]
                    ai_recipes.append({
                        'recipe': recipe,
                        'match_score': 1000 - i * 100,  # Higher score for higher rank
                        'macros': recipe.get('estimated_macros', {}),
                        'ai_reason': rec.get('reason', 'AI recommended for nutritional alignment'),
                        'ai_rank': i + 1
                    })
            
            return ai_recipes
            
        except (json.JSONDecodeError, KeyError) as json_error:
            print(f"AI JSON parsing failed: {json_error}")
            return []
        
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

def get_protein_sources(diet_prefs, meal_type='general'):
    """Get protein sources based on dietary preferences and meal type"""
    all_sources = {
        'Chicken Breast': {'protein': 31, 'calories_per_g': 1.65, 'meals': ['lunch', 'dinner']},
        'Lean Ground Turkey': {'protein': 29, 'calories_per_g': 1.89, 'meals': ['lunch', 'dinner']},
        'Salmon': {'protein': 25, 'calories_per_g': 2.08, 'meals': ['breakfast', 'lunch', 'dinner']},
        'Tuna': {'protein': 30, 'calories_per_g': 1.32, 'meals': ['lunch', 'dinner']},
        'Eggs': {'protein': 13, 'calories_per_g': 1.55, 'meals': ['breakfast', 'lunch']},
        'Greek Yogurt': {'protein': 10, 'calories_per_g': 0.59, 'meals': ['breakfast', 'snack']},
        'Cottage Cheese': {'protein': 11, 'calories_per_g': 0.98, 'meals': ['breakfast', 'snack']},
        'Protein Powder': {'protein': 25, 'calories_per_g': 4.0, 'meals': ['breakfast', 'snack']},
        'Tofu': {'protein': 8, 'calories_per_g': 0.76, 'meals': ['lunch', 'dinner']},
        'Tempeh': {'protein': 19, 'calories_per_g': 1.93, 'meals': ['lunch', 'dinner']},
        'Lentils': {'protein': 9, 'calories_per_g': 1.16, 'meals': ['lunch', 'dinner']},
        'Black Beans': {'protein': 9, 'calories_per_g': 1.32, 'meals': ['lunch', 'dinner']},
        'Quinoa': {'protein': 4.4, 'calories_per_g': 1.2, 'meals': ['breakfast', 'lunch', 'dinner']},
        'Smoked Salmon': {'protein': 25, 'calories_per_g': 1.42, 'meals': ['breakfast']},
        'Turkey Sausage': {'protein': 14, 'calories_per_g': 1.96, 'meals': ['breakfast']},
        'Nut Butter': {'protein': 8, 'calories_per_g': 6.0, 'meals': ['breakfast', 'snack']}
    }
    
    # Filter by meal type appropriateness
    if meal_type != 'general':
        sources = {k: v for k, v in all_sources.items() if meal_type in v['meals']}
    else:
        sources = all_sources
    
    # Apply dietary restrictions
    if diet_prefs.get('vegan'):
        vegan_sources = {k: v for k, v in sources.items() if k in ['Protein Powder', 'Tofu', 'Tempeh', 'Lentils', 'Black Beans', 'Quinoa', 'Nut Butter']}
        return vegan_sources
    elif diet_prefs.get('vegetarian'):
        vegetarian_sources = {k: v for k, v in sources.items() if k not in ['Chicken Breast', 'Lean Ground Turkey', 'Salmon', 'Tuna', 'Smoked Salmon', 'Turkey Sausage']}
        return vegetarian_sources
    
    return sources

def get_carb_sources(diet_prefs, meal_type='general'):
    """Get carbohydrate sources based on dietary preferences and meal type"""
    all_sources = {
        'Oats': {'carbs': 66, 'calories_per_g': 3.89, 'meals': ['breakfast']},
        'Banana': {'carbs': 23, 'calories_per_g': 0.89, 'meals': ['breakfast', 'snack']},
        'Berries': {'carbs': 12, 'calories_per_g': 0.57, 'meals': ['breakfast', 'snack']},
        'Whole Grain Toast': {'carbs': 49, 'calories_per_g': 2.47, 'meals': ['breakfast']},
        'English Muffin': {'carbs': 46, 'calories_per_g': 2.34, 'meals': ['breakfast']},
        'White Rice': {'carbs': 28, 'calories_per_g': 1.3, 'meals': ['lunch', 'dinner']},
        'Brown Rice': {'carbs': 23, 'calories_per_g': 1.12, 'meals': ['lunch', 'dinner']},
        'Quinoa': {'carbs': 22, 'calories_per_g': 1.2, 'meals': ['breakfast', 'lunch', 'dinner']},
        'Sweet Potato': {'carbs': 20, 'calories_per_g': 0.86, 'meals': ['lunch', 'dinner']},
        'Regular Potato': {'carbs': 17, 'calories_per_g': 0.77, 'meals': ['lunch', 'dinner']},
        'Whole Wheat Pasta': {'carbs': 31, 'calories_per_g': 1.31, 'meals': ['lunch', 'dinner']},
        'Apple': {'carbs': 14, 'calories_per_g': 0.52, 'meals': ['snack']},
        'Dates': {'carbs': 75, 'calories_per_g': 2.77, 'meals': ['snack']},
        'Rice Cakes': {'carbs': 82, 'calories_per_g': 3.87, 'meals': ['snack']}
    }
    
    # Filter by meal type appropriateness
    if meal_type != 'general':
        sources = {k: v for k, v in all_sources.items() if meal_type in v['meals']}
    else:
        sources = all_sources
    
    if diet_prefs.get('gluten_free'):
        gluten_free_sources = {k: v for k, v in sources.items() if k not in ['Whole Grain Toast', 'English Muffin', 'Whole Wheat Pasta']}
        return gluten_free_sources
    
    return sources

def get_fat_sources(diet_prefs, meal_type='general'):
    """Get fat sources based on dietary preferences and meal type"""
    all_sources = {
        'Butter': {'fat': 81, 'calories_per_g': 7.17, 'meals': ['breakfast']},
        'Coconut Oil': {'fat': 100, 'calories_per_g': 8.62, 'meals': ['breakfast']},
        'Nut Butter': {'fat': 50, 'calories_per_g': 5.88, 'meals': ['breakfast', 'snack']},
        'Almond Butter': {'fat': 56, 'calories_per_g': 6.14, 'meals': ['breakfast', 'snack']},
        'Avocado': {'fat': 15, 'calories_per_g': 1.6, 'meals': ['breakfast', 'lunch']},
        'Olive Oil': {'fat': 100, 'calories_per_g': 9.0, 'meals': ['lunch', 'dinner']},
        'Almonds': {'fat': 50, 'calories_per_g': 5.79, 'meals': ['snack']},
        'Walnuts': {'fat': 65, 'calories_per_g': 6.54, 'meals': ['snack']},
        'Chia Seeds': {'fat': 31, 'calories_per_g': 4.86, 'meals': ['breakfast', 'snack']},
        'Flax Seeds': {'fat': 42, 'calories_per_g': 5.34, 'meals': ['breakfast']},
        'Tahini': {'fat': 60, 'calories_per_g': 5.95, 'meals': ['lunch', 'dinner']},
        'Cheese': {'fat': 33, 'calories_per_g': 4.02, 'meals': ['breakfast', 'lunch', 'snack']}
    }
    
    # Filter by meal type appropriateness
    if meal_type != 'general':
        sources = {k: v for k, v in all_sources.items() if meal_type in v['meals']}
    else:
        sources = all_sources
    
    # Apply dietary restrictions
    if diet_prefs.get('vegan'):
        vegan_sources = {k: v for k, v in sources.items() if k not in ['Butter', 'Cheese']}
        return vegan_sources
    elif diet_prefs.get('vegetarian'):
        # All sources are suitable for vegetarians
        return sources
    
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

def calculate_intelligent_meal_distribution(total_calories, total_protein, total_carbs, total_fat, 
                                          num_meals, num_snacks, is_training_day=False, workout_time=None, 
                                          meal_times=None, wake_time=None, sleep_time=None):
    """Calculate intelligent meal distribution based on training status, timing, and circadian optimization"""
    
    # Enhanced workout timing parsing
    workout_period = None
    if workout_time:
        if "Early Morning" in workout_time or "6-8 AM" in workout_time:
            workout_period = "early_morning"
        elif "Morning" in workout_time or "8-10 AM" in workout_time:
            workout_period = "morning"
        elif "Lunch" in workout_time or "11 AM-1 PM" in workout_time:
            workout_period = "lunch"
        elif "Afternoon" in workout_time or "2-5 PM" in workout_time:
            workout_period = "afternoon"
        elif "Evening" in workout_time or "6-8 PM" in workout_time:
            workout_period = "evening"
    
    # Define base distributions with enhanced timing considerations
    if num_meals == 2:  # 2 main meals
        if is_training_day and workout_period:
            if workout_period in ['early_morning', 'morning']:
                # Pre-workout fuel, post-workout recovery
                meal_distributions = {
                    'breakfast': {'calories': 0.45, 'protein': 0.4, 'carbs': 0.55, 'fat': 0.3},
                    'dinner': {'calories': 0.55, 'protein': 0.6, 'carbs': 0.45, 'fat': 0.7}
                }
            elif workout_period == 'lunch':
                # Balanced morning, post-workout evening
                meal_distributions = {
                    'breakfast': {'calories': 0.4, 'protein': 0.4, 'carbs': 0.5, 'fat': 0.35},
                    'dinner': {'calories': 0.6, 'protein': 0.6, 'carbs': 0.5, 'fat': 0.65}
                }
            else:  # afternoon/evening workout
                # Fuel throughout day, post-workout dinner
                meal_distributions = {
                    'breakfast': {'calories': 0.35, 'protein': 0.35, 'carbs': 0.4, 'fat': 0.4},
                    'dinner': {'calories': 0.65, 'protein': 0.65, 'carbs': 0.6, 'fat': 0.6}
                }
        else:
            # Standard distribution with circadian consideration
            meal_distributions = {
                'breakfast': {'calories': 0.4, 'protein': 0.4, 'carbs': 0.45, 'fat': 0.35},
                'dinner': {'calories': 0.6, 'protein': 0.6, 'carbs': 0.55, 'fat': 0.65}
            }
    elif num_meals == 3:  # 3 main meals
        if is_training_day and workout_period:
            if workout_period in ['early_morning', 'morning']:
                # Pre-workout breakfast, recovery lunch, lighter dinner
                meal_distributions = {
                    'breakfast': {'calories': 0.4, 'protein': 0.35, 'carbs': 0.5, 'fat': 0.25},
                    'lunch': {'calories': 0.35, 'protein': 0.4, 'carbs': 0.3, 'fat': 0.4},
                    'dinner': {'calories': 0.25, 'protein': 0.25, 'carbs': 0.2, 'fat': 0.35}
                }
            elif workout_period == 'lunch':
                # Light breakfast, workout lunch, balanced dinner
                meal_distributions = {
                    'breakfast': {'calories': 0.25, 'protein': 0.25, 'carbs': 0.3, 'fat': 0.3},
                    'lunch': {'calories': 0.45, 'protein': 0.4, 'carbs': 0.5, 'fat': 0.3},
                    'dinner': {'calories': 0.3, 'protein': 0.35, 'carbs': 0.2, 'fat': 0.4}
                }
            elif workout_period == 'afternoon':
                # Balanced breakfast/lunch, post-workout dinner
                meal_distributions = {
                    'breakfast': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.35, 'fat': 0.3},
                    'lunch': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.35, 'fat': 0.3},
                    'dinner': {'calories': 0.4, 'protein': 0.4, 'carbs': 0.3, 'fat': 0.4}
                }
            else:  # evening workout
                # Standard day, pre/post workout dinner
                meal_distributions = {
                    'breakfast': {'calories': 0.25, 'protein': 0.25, 'carbs': 0.3, 'fat': 0.3},
                    'lunch': {'calories': 0.35, 'protein': 0.35, 'carbs': 0.35, 'fat': 0.35},
                    'dinner': {'calories': 0.4, 'protein': 0.4, 'carbs': 0.35, 'fat': 0.35}
                }
        else:
            # Optimized for natural circadian rhythm
            meal_distributions = {
                'breakfast': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.4, 'fat': 0.3},
                'lunch': {'calories': 0.35, 'protein': 0.35, 'carbs': 0.35, 'fat': 0.3},
                'dinner': {'calories': 0.35, 'protein': 0.35, 'carbs': 0.25, 'fat': 0.4}
            }
    else:  # 4 main meals - frequent feeding
        if is_training_day and workout_period:
            if workout_period in ['early_morning', 'morning']:
                meal_distributions = {
                    'breakfast': {'calories': 0.25, 'protein': 0.25, 'carbs': 0.3, 'fat': 0.2},
                    'lunch': {'calories': 0.3, 'protein': 0.35, 'carbs': 0.3, 'fat': 0.3},
                    'dinner': {'calories': 0.25, 'protein': 0.25, 'carbs': 0.25, 'fat': 0.3},
                    'evening_meal': {'calories': 0.2, 'protein': 0.15, 'carbs': 0.15, 'fat': 0.2}
                }
            else:
                meal_distributions = {
                    'breakfast': {'calories': 0.2, 'protein': 0.25, 'carbs': 0.25, 'fat': 0.2},
                    'lunch': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.35, 'fat': 0.25},
                    'dinner': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.25, 'fat': 0.35},
                    'evening_meal': {'calories': 0.2, 'protein': 0.15, 'carbs': 0.15, 'fat': 0.2}
                }
        else:
            meal_distributions = {
                'breakfast': {'calories': 0.2, 'protein': 0.25, 'carbs': 0.25, 'fat': 0.2},
                'lunch': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.35, 'fat': 0.25},
                'dinner': {'calories': 0.3, 'protein': 0.3, 'carbs': 0.25, 'fat': 0.35},
                'evening_meal': {'calories': 0.2, 'protein': 0.15, 'carbs': 0.15, 'fat': 0.2}
            }
    
    # Apply timing-based adjustments if meal times are provided
    if meal_times and wake_time and sleep_time:
        # Calculate circadian adjustments
        wake_datetime = datetime.combine(datetime.today(), wake_time)
        sleep_datetime = datetime.combine(datetime.today(), sleep_time)
        if sleep_datetime < wake_datetime:
            sleep_datetime += timedelta(days=1)
        
        hours_awake = (sleep_datetime - wake_datetime).seconds / 3600
        
        # Adjust distributions based on meal timing
        for meal_name, meal_time in meal_times.items():
            if meal_name in meal_distributions:
                meal_datetime = datetime.combine(datetime.today(), meal_time)
                if meal_datetime < wake_datetime:
                    meal_datetime += timedelta(days=1)
                
                hours_since_wake = (meal_datetime - wake_datetime).seconds / 3600
                time_ratio = hours_since_wake / hours_awake
                
                # Early meals: higher carbs, moderate fat
                # Later meals: lower carbs, higher fat (better for sleep)
                carb_factor = max(0.7, 1.3 - time_ratio)
                fat_factor = min(1.4, 0.7 + time_ratio)
                
                meal_distributions[meal_name]['carbs'] *= carb_factor
                meal_distributions[meal_name]['fat'] *= fat_factor
    
    # Add snacks distribution
    snack_calories_per = 0.1 if num_snacks > 0 else 0
    snack_protein_per = 0.08 if num_snacks > 0 else 0
    snack_carbs_per = 0.1 if num_snacks > 0 else 0
    snack_fat_per = 0.05 if num_snacks > 0 else 0
    
    # Adjust main meals to account for snacks
    if num_snacks > 0:
        total_snack_allocation = {
            'calories': snack_calories_per * num_snacks,
            'protein': snack_protein_per * num_snacks,
            'carbs': snack_carbs_per * num_snacks,
            'fat': snack_fat_per * num_snacks
        }
        
        # Reduce main meals proportionally
        for meal in meal_distributions:
            for macro in ['calories', 'protein', 'carbs', 'fat']:
                meal_distributions[meal][macro] *= (1 - total_snack_allocation[macro])
        
        # Add snacks
        for i in range(num_snacks):
            meal_distributions[f'snack'] = {
                'calories': snack_calories_per,
                'protein': snack_protein_per,
                'carbs': snack_carbs_per,
                'fat': snack_fat_per
            }
    
    # Convert to actual values
    meal_targets = {}
    for meal, ratios in meal_distributions.items():
        meal_targets[meal] = {
            'calories': int(total_calories * ratios['calories']),
            'protein': int(total_protein * ratios['protein']),
            'carbs': int(total_carbs * ratios['carbs']),
            'fat': int(total_fat * ratios['fat'])
        }
    
    return meal_targets

def generate_grocery_list(meal_plans):
    """Generate a consolidated grocery list from meal plans"""
    grocery_items = defaultdict(float)
    
    for day, meals in meal_plans.items():
        for meal_type, meal_data in meals.items():
            if 'selected_recipe' in meal_data:
                recipe = meal_data['selected_recipe']
                serving_multiplier = meal_data.get('serving_multiplier', 1.0)
                
                if 'ingredients' in recipe:
                    for ingredient in recipe['ingredients']:
                        # Simple ingredient parsing - could be enhanced
                        grocery_items[ingredient] += serving_multiplier
            
            if 'custom_foods' in meal_data:
                for food_item, amount in meal_data['custom_foods'].items():
                    grocery_items[food_item] += amount
    
    return dict(grocery_items)

def create_meal_plan_pdf(meal_plans, nutrition_targets, diet_prefs):
    """Create a branded PDF with meal plans, recipes, and grocery list"""
    pdf = FPDF()
    pdf.add_page()
    
    # Header with Fitomics branding
    pdf.set_font('Arial', 'B', 20)
    pdf.cell(0, 10, 'FITOMICS MEAL PLAN', 0, 1, 'C')
    pdf.set_font('Arial', '', 12)
    pdf.cell(0, 10, f'Generated on {datetime.now().strftime("%B %d, %Y")}', 0, 1, 'C')
    pdf.ln(10)
    
    # Nutrition summary
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'NUTRITION TARGETS', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.cell(0, 8, f'Daily Calories: {nutrition_targets.get("target_calories", 0)} kcal', 0, 1)
    pdf.cell(0, 8, f'Protein: {nutrition_targets.get("protein", 0)}g', 0, 1)
    pdf.cell(0, 8, f'Carbohydrates: {nutrition_targets.get("carbs", 0)}g', 0, 1)
    pdf.cell(0, 8, f'Fat: {nutrition_targets.get("fat", 0)}g', 0, 1)
    pdf.ln(10)
    
    # Dietary preferences
    if any(diet_prefs.values()):
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'DIETARY PREFERENCES', 0, 1)
        pdf.set_font('Arial', '', 12)
        for pref, enabled in diet_prefs.items():
            if enabled:
                pdf.cell(0, 8, f'✓ {pref.replace("_", " ").title()}', 0, 1)
        pdf.ln(10)
    
    # Meal plans
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'MEAL PLAN', 0, 1)
    
    for day, meals in meal_plans.items():
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, day.upper(), 0, 1)
        
        for meal_type, meal_data in meals.items():
            pdf.set_font('Arial', 'B', 11)
            pdf.cell(0, 8, f'{meal_type.title()}:', 0, 1)
            pdf.set_font('Arial', '', 10)
            
            if 'selected_recipe' in meal_data:
                recipe = meal_data['selected_recipe']
                pdf.cell(0, 6, f'  Recipe: {recipe.get("title", "Untitled")}', 0, 1)
                
                # Add ingredients if available
                if 'ingredients' in recipe and len(recipe['ingredients']) > 0:
                    pdf.cell(0, 6, f'  Ingredients: {", ".join(recipe["ingredients"][:3])}...', 0, 1)
            
            if 'custom_foods' in meal_data:
                pdf.cell(0, 6, f'  Custom: {", ".join(meal_data["custom_foods"].keys())}', 0, 1)
            
            pdf.ln(2)
        pdf.ln(5)
    
    # Grocery list
    grocery_list = generate_grocery_list(meal_plans)
    if grocery_list:
        pdf.add_page()
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'GROCERY LIST', 0, 1)
        pdf.set_font('Arial', '', 12)
        
        for item, quantity in sorted(grocery_list.items()):
            pdf.cell(0, 8, f'□ {item}', 0, 1)
    
    # Footer
    pdf.ln(20)
    pdf.set_font('Arial', 'I', 10)
    pdf.cell(0, 10, 'Generated by Fitomics Body Composition Planner', 0, 1, 'C')
    
    return pdf

def ai_generate_meal_insights(meal_type, target_macros, diet_prefs, openai_client):
    """Generate AI insights for meal planning"""
    try:
        diet_restrictions = []
        if diet_prefs.get('vegetarian'):
            diet_restrictions.append('vegetarian')
        if diet_prefs.get('vegan'):
            diet_restrictions.append('vegan')
        if diet_prefs.get('gluten_free'):
            diet_restrictions.append('gluten-free')
        
        prompt = f"""Provide brief meal planning insights for a {meal_type} targeting {target_macros['calories']} calories, {target_macros['protein']}g protein, {target_macros['carbs']}g carbs, {target_macros['fat']}g fat.

Dietary restrictions: {', '.join(diet_restrictions) if diet_restrictions else 'None'}

Provide 3 specific, actionable tips for this meal type and nutrition targets. Focus on food combinations, timing, and optimization strategies.

Respond with JSON: {{"insights": ["tip 1", "tip 2", "tip 3"]}}"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutrition expert providing meal planning insights. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=500,
            temperature=0.4
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get('insights', [])
        
    except Exception as e:
        print(f"AI insights generation failed: {e}")
        return []

def find_best_recipes_for_meal(recipes, meal_type, target_macros, diet_prefs):
    """Main function to find best recipes, with AI enhancement if available"""
    openai_client = get_openai_client()
    
    if openai_client:
        try:
            return ai_analyze_recipes_for_meal(recipes, meal_type, target_macros, diet_prefs, openai_client)
        except Exception as e:
            print(f"AI analysis failed, using fallback: {e}")
            return find_best_recipes_for_meal_fallback(recipes, meal_type, target_macros, diet_prefs)
    else:
        return find_best_recipes_for_meal_fallback(recipes, meal_type, target_macros, diet_prefs)

# Header
st.title("🤖 AI Meal Planner")
st.markdown("*Intelligent meal planning using authentic Fitomics recipes*")

# Initialize default values for standalone use
if 'diet_preferences' not in st.session_state:
    st.session_state.diet_preferences = {
        'vegetarian': False,
        'vegan': False,
        'gluten_free': False,
        'dairy_free': False,
        'nut_free': False
    }

# Initialize day_specific_nutrition if not exists
if 'day_specific_nutrition' not in st.session_state:
    st.session_state.day_specific_nutrition = {}

# Mode Selection Toggle
st.subheader("🔧 Planning Mode")

# Initialize mode in session state
if 'meal_planner_mode' not in st.session_state:
    st.session_state.meal_planner_mode = 'standalone'

# Mode toggle
mode_options = ['Standalone Mode', 'Sync Profile Mode']
selected_mode = st.radio(
    "Choose your planning approach:",
    mode_options,
    index=0 if st.session_state.meal_planner_mode == 'standalone' else 1,
    horizontal=True,
    help="Standalone: Complete manual setup | Sync Profile: Use data from previous steps"
)

# Update session state
st.session_state.meal_planner_mode = 'standalone' if selected_mode == 'Standalone Mode' else 'sync'

if st.session_state.meal_planner_mode == 'standalone':
    st.info("🎯 **Standalone Mode:** Complete customization with manual input for nutrition targets and dietary preferences.")
    standalone_mode = True
else:
    st.info("🔗 **Sync Profile Mode:** Automatically use your data from Body Composition Planning, Diet Preferences, and Weekly Schedule.")
    standalone_mode = False
    col1, col2 = st.columns([3, 1])
    with col2:
        if st.button("🔄 Sync All Data", use_container_width=True):
            # Sync nutrition targets from weekly schedule
            if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
                first_day_data = list(st.session_state.day_specific_nutrition.values())[0]
                st.session_state.standalone_protein = first_day_data.get('protein', 150)
                st.session_state.standalone_carbs = first_day_data.get('carbs', 200)
                st.session_state.standalone_fat = first_day_data.get('fat', 70)
                st.success("Nutrition targets synced from Weekly Schedule!")
            
            # Sync dietary preferences
            if 'diet_preferences' in st.session_state:
                st.success("Dietary preferences synced!")
            else:
                st.warning("No dietary preferences found. Please configure in Diet Preferences page first.")

# Load recipes
recipes = load_fitomics_recipes()
if not recipes:
    st.error("Unable to load recipe database. Please refresh the page.")
    st.stop()

# Standalone Configuration Section
if standalone_mode:
    st.subheader("🎯 Meal Plan Configuration")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Daily Nutrition Targets**")
        
        # Use session state to store macro values for auto-calculation
        if 'standalone_protein' not in st.session_state:
            st.session_state.standalone_protein = 150
        if 'standalone_carbs' not in st.session_state:
            st.session_state.standalone_carbs = 200
        if 'standalone_fat' not in st.session_state:
            st.session_state.standalone_fat = 70
        
        manual_protein = st.number_input(
            "Target Protein (g)", 
            min_value=50, 
            max_value=300, 
            value=st.session_state.standalone_protein, 
            step=5,
            key="protein_input"
        )
        
        manual_carbs = st.number_input(
            "Target Carbs (g)", 
            min_value=50, 
            max_value=500, 
            value=st.session_state.standalone_carbs, 
            step=10,
            key="carbs_input"
        )
        
        manual_fat = st.number_input(
            "Target Fat (g)", 
            min_value=30, 
            max_value=200, 
            value=st.session_state.standalone_fat, 
            step=5,
            key="fat_input"
        )
        
        # Auto-calculate calories based on macros
        calculated_calories = (manual_protein * 4) + (manual_carbs * 4) + (manual_fat * 9)
        
        # Display calculated calories (read-only)
        st.markdown("**Calculated Calories**")
        st.markdown(f"**{calculated_calories} kcal** *(4×{manual_protein}g protein + 4×{manual_carbs}g carbs + 9×{manual_fat}g fat)*")
        
        # Update session state
        st.session_state.standalone_protein = manual_protein
        st.session_state.standalone_carbs = manual_carbs
        st.session_state.standalone_fat = manual_fat
        
        manual_calories = calculated_calories
    
    with col2:
        st.markdown("**Daily Schedule & Timing**")
        
        # Basic schedule settings
        wake_time = st.time_input("Wake Time", value=datetime.strptime("07:00", "%H:%M").time())
        sleep_time = st.time_input("Sleep Time", value=datetime.strptime("23:00", "%H:%M").time())
        
        is_training_day = st.checkbox("Training Day", value=False, help="Adjusts meal timing and macro distribution around workouts")
        
        if is_training_day:
            workout_time_options = ["Early Morning (6-8 AM)", "Morning (8-10 AM)", "Lunch (11 AM-1 PM)", "Afternoon (2-5 PM)", "Evening (6-8 PM)"]
            workout_time = st.selectbox("Workout Time", workout_time_options, index=2)
        else:
            workout_time = None
        
        st.markdown("**Meal Structure**")
        num_meals = st.selectbox("Number of main meals", [2, 3, 4], index=1)
        num_snacks = st.selectbox("Number of snacks", [0, 1, 2, 3], index=1)
        
        # Optional meal timing customization
        with st.expander("⏰ Customize Meal Times (Optional)"):
            st.markdown("Set approximate meal times for better macro distribution:")
            
            meal_times = {}
            if num_meals >= 1:
                meal_times['breakfast'] = st.time_input("Breakfast", value=datetime.strptime("08:00", "%H:%M").time())
            if num_meals >= 2:
                meal_times['lunch'] = st.time_input("Lunch", value=datetime.strptime("12:30", "%H:%M").time())
            if num_meals >= 3:
                meal_times['dinner'] = st.time_input("Dinner", value=datetime.strptime("18:30", "%H:%M").time())
            if num_meals >= 4:
                meal_times['evening_meal'] = st.time_input("Evening Meal", value=datetime.strptime("21:00", "%H:%M").time())
            
            if num_snacks > 0:
                snack_times = []
                for i in range(num_snacks):
                    default_time = "10:00" if i == 0 else "15:30" if i == 1 else "20:00"
                    snack_time = st.time_input(f"Snack {i+1}", value=datetime.strptime(default_time, "%H:%M").time())
                    snack_times.append(snack_time)
        
        st.markdown("**Basic Dietary Preferences**")
        vegetarian = st.checkbox("Vegetarian", value=st.session_state.diet_preferences.get('vegetarian', False))
        vegan = st.checkbox("Vegan", value=st.session_state.diet_preferences.get('vegan', False))
        gluten_free = st.checkbox("Gluten-Free", value=st.session_state.diet_preferences.get('gluten_free', False))
        dairy_free = st.checkbox("Dairy-Free", value=st.session_state.diet_preferences.get('dairy_free', False))
    
    # Enhanced dietary preferences section for standalone mode
    st.subheader("🍽️ Advanced Meal Planning Preferences")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("**Food Allergies & Restrictions**")
        nut_free = st.checkbox("Nut-Free", value=st.session_state.diet_preferences.get('nut_free', False))
        shellfish_free = st.checkbox("Shellfish-Free", value=False)
        soy_free = st.checkbox("Soy-Free", value=False)
        egg_free = st.checkbox("Egg-Free", value=False)
        
        st.markdown("**Cooking Preferences**")
        max_prep_time = st.selectbox("Max Prep Time", ["15 minutes", "30 minutes", "45 minutes", "60+ minutes"], index=1)
        cooking_skill = st.selectbox("Cooking Skill Level", ["Beginner", "Intermediate", "Advanced"], index=1)
    
    with col2:
        st.markdown("**Preferred Ingredients**")
        preferred_proteins = st.multiselect(
            "Favorite Proteins",
            ["Chicken", "Turkey", "Beef", "Fish", "Salmon", "Eggs", "Greek Yogurt", "Protein Powder", "Tofu", "Tempeh", "Lentils", "Beans"],
            default=["Chicken", "Eggs", "Greek Yogurt"]
        )
        
        preferred_carbs = st.multiselect(
            "Favorite Carbs",
            ["Rice", "Oats", "Quinoa", "Sweet Potato", "Pasta", "Bread", "Fruits", "Vegetables"],
            default=["Rice", "Oats", "Sweet Potato"]
        )
        
        preferred_fats = st.multiselect(
            "Favorite Fats",
            ["Olive Oil", "Avocado", "Nuts", "Seeds", "Nut Butter", "Coconut Oil", "Butter"],
            default=["Olive Oil", "Avocado", "Nuts"]
        )
    
    with col3:
        st.markdown("**Meal Planning Style**")
        meal_variety = st.selectbox("Meal Variety Preference", ["High variety (different each day)", "Moderate variety", "Consistent (similar meals)"], index=1)
        
        budget_preference = st.selectbox("Budget Priority", ["Budget-friendly", "Moderate budget", "Premium ingredients"], index=1)
        
        convenience_preference = st.selectbox("Convenience Priority", ["Maximum convenience", "Balanced", "Fresh cooking preferred"], index=1)
        
        st.markdown("**Disliked Foods**")
        disliked_foods = st.text_area(
            "Foods to avoid (comma-separated)",
            placeholder="e.g., mushrooms, cilantro, spicy foods",
            help="List any foods you want to avoid in your meal plan"
        )
    
    st.markdown("---")
    
    # Configuration confirmation button
    config_confirmed = st.button("✅ Confirm Meal Plan Configuration", type="primary", use_container_width=True)
    
    if not config_confirmed:
        st.info("👆 Please confirm your meal plan configuration above to proceed with target calculation.")
        st.stop()
    
    # Update comprehensive diet preferences
    diet_prefs = {
        'vegetarian': vegetarian,
        'vegan': vegan,
        'gluten_free': gluten_free,
        'dairy_free': dairy_free,
        'nut_free': nut_free,
        'shellfish_free': shellfish_free,
        'soy_free': soy_free,
        'egg_free': egg_free,
        'preferred_proteins': preferred_proteins,
        'preferred_carbs': preferred_carbs,
        'preferred_fats': preferred_fats,
        'max_prep_time': max_prep_time,
        'cooking_skill': cooking_skill,
        'meal_variety': meal_variety,
        'budget_preference': budget_preference,
        'convenience_preference': convenience_preference,
        'disliked_foods': [food.strip() for food in disliked_foods.split(',') if food.strip()] if disliked_foods else []
    }
    
    # Create meal structure for standalone mode
    meal_types = []
    if num_meals >= 1:
        meal_types.append('breakfast')
    if num_meals >= 2:
        meal_types.append('lunch')
    if num_meals >= 3:
        meal_types.append('dinner')
    if num_meals >= 4:
        meal_types.append('evening_meal')
    
    # Add snacks
    for i in range(num_snacks):
        meal_types.append('snack')
    
    # Calculate intelligent meal distribution with timing considerations
    meal_targets = calculate_intelligent_meal_distribution(
        manual_calories, manual_protein, manual_carbs, manual_fat,
        num_meals, num_snacks, is_training_day, workout_time,
        meal_times if 'meal_times' in locals() else None,
        wake_time, sleep_time
    )
    
    # Create nutrition targets
    day_nutrition = {
        'target_calories': manual_calories,
        'protein': manual_protein,
        'carbs': manual_carbs,
        'fat': manual_fat,
        'meal_targets': meal_targets
    }
    
    selected_day = "Custom Meal Plan"
    
    # Display targets
    st.markdown(f"### Nutrition Targets for {selected_day}")
    target_cols = st.columns(4)
    
    with target_cols[0]:
        st.metric("Calories", f"{manual_calories}")
    with target_cols[1]:
        st.metric("Protein", f"{manual_protein}g")
    with target_cols[2]:
        st.metric("Carbs", f"{manual_carbs}g")
    with target_cols[3]:
        st.metric("Fat", f"{manual_fat}g")
    
    # Show intelligent meal distribution with timing context
    if is_training_day:
        st.info(f"🏋️ Training day distribution optimized for {workout_time} workout")
    
    st.markdown("### Per-Meal Targets with Timing Context")
    
    # Calculate timing context for each meal
    wake_datetime = datetime.combine(datetime.today(), wake_time)
    sleep_datetime = datetime.combine(datetime.today(), sleep_time)
    if sleep_datetime < wake_datetime:
        sleep_datetime += timedelta(days=1)
    
    # Show meal targets with timing context
    st.markdown("**Intelligent meal distribution with timing considerations:**")
    
    for meal_name, targets in meal_targets.items():
        with st.expander(f"📍 {meal_name.title().replace('_', ' ')} - {targets['calories']} cal | {targets['protein']}g protein | {targets['carbs']}g carbs | {targets['fat']}g fat"):
            # Show timing context
            timing_context = []
            
            # Check if meal time is defined
            meal_time_key = meal_name if meal_name in ['breakfast', 'lunch', 'dinner', 'evening_meal'] else None
            if meal_time_key and 'meal_times' in locals() and meal_times.get(meal_time_key):
                meal_time = meal_times[meal_time_key]
                meal_datetime = datetime.combine(datetime.today(), meal_time)
                if meal_datetime < wake_datetime:
                    meal_datetime += timedelta(days=1)
                
                hours_since_wake = (meal_datetime - wake_datetime).seconds / 3600
                hours_until_sleep = (sleep_datetime - meal_datetime).seconds / 3600
                
                timing_context.append(f"⏰ Scheduled for {meal_time.strftime('%I:%M %p')}")
                timing_context.append(f"📈 {hours_since_wake:.1f} hours after wake time")
                timing_context.append(f"😴 {hours_until_sleep:.1f} hours before sleep")
                
                # Training context
                if is_training_day and workout_time:
                    workout_relation = "around workout time"
                    if "Morning" in workout_time and meal_name == 'breakfast':
                        workout_relation = "pre-workout fuel"
                    elif "Lunch" in workout_time and meal_name == 'lunch':
                        workout_relation = "workout meal"
                    elif ("Afternoon" in workout_time or "Evening" in workout_time) and meal_name == 'dinner':
                        workout_relation = "post-workout recovery"
                    timing_context.append(f"🏋️ {workout_relation}")
            else:
                # Default timing descriptions
                if meal_name == 'breakfast':
                    timing_context.append("🌅 Morning energy and metabolism boost")
                elif meal_name == 'lunch':
                    timing_context.append("☀️ Midday fuel and productivity support")
                elif meal_name == 'dinner':
                    timing_context.append("🌆 Evening nutrition and recovery")
                elif meal_name == 'evening_meal':
                    timing_context.append("🌙 Light evening meal before sleep")
                elif 'snack' in meal_name:
                    timing_context.append("🍎 Strategic snack for sustained energy")
            
            # Circadian optimization notes
            if 'hours_since_wake' in locals() and hours_since_wake < 4:
                timing_context.append("🔥 Higher carbs for morning energy")
            elif 'hours_until_sleep' in locals() and hours_until_sleep < 4:
                timing_context.append("🧈 Higher fats to support sleep quality")
            
            for context in timing_context:
                st.markdown(f"  {context}")
    
    st.markdown("---")
    
    # Nutrition targets confirmation
    targets_confirmed = st.button("✅ Confirm Nutrition Targets", type="primary", use_container_width=True)
    
    if not targets_confirmed:
        st.info("👆 Please confirm your nutrition targets above to proceed with AI meal planning.")
        st.stop()
    
    adjusted_meal_targets = {}
    for meal_type in meal_types:
        if meal_type in meal_targets:
            target = meal_targets[meal_type]
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                meal_calories = st.number_input(
                    f"{meal_type.title()} Cal", 
                    min_value=50, 
                    max_value=1500, 
                    value=target['calories'],
                    key=f"meal_cal_{meal_type}"
                )
            with col2:
                meal_protein = st.number_input(
                    f"{meal_type.title()} Protein", 
                    min_value=5, 
                    max_value=100, 
                    value=target['protein'],
                    key=f"meal_protein_{meal_type}"
                )
            with col3:
                meal_carbs = st.number_input(
                    f"{meal_type.title()} Carbs", 
                    min_value=5, 
                    max_value=150, 
                    value=target['carbs'],
                    key=f"meal_carbs_{meal_type}"
                )
            with col4:
                meal_fat = st.number_input(
                    f"{meal_type.title()} Fat", 
                    min_value=2, 
                    max_value=80, 
                    value=target['fat'],
                    key=f"meal_fat_{meal_type}"
                )
            
            adjusted_meal_targets[meal_type] = {
                'calories': meal_calories,
                'protein': meal_protein,
                'carbs': meal_carbs,
                'fat': meal_fat
            }
    
    # Update meal targets with user adjustments
    day_nutrition['meal_targets'] = adjusted_meal_targets
    
    # Show daily total vs targets
    total_from_meals = {
        'calories': sum(target['calories'] for target in adjusted_meal_targets.values()),
        'protein': sum(target['protein'] for target in adjusted_meal_targets.values()),
        'carbs': sum(target['carbs'] for target in adjusted_meal_targets.values()),
        'fat': sum(target['fat'] for target in adjusted_meal_targets.values())
    }
    
    st.markdown("### Daily Total Check")
    check_cols = st.columns(4)
    
    with check_cols[0]:
        cal_diff = total_from_meals['calories'] - manual_calories
        color = "🟢" if abs(cal_diff) <= 50 else "🟡" if abs(cal_diff) <= 100 else "🔴"
        st.write(f"{color} {total_from_meals['calories']}/{manual_calories} cal ({cal_diff:+d})")
    
    with check_cols[1]:
        protein_diff = total_from_meals['protein'] - manual_protein
        color = "🟢" if abs(protein_diff) <= 10 else "🟡" if abs(protein_diff) <= 20 else "🔴"
        st.write(f"{color} {total_from_meals['protein']}/{manual_protein}g protein ({protein_diff:+d}g)")
    
    with check_cols[2]:
        carb_diff = total_from_meals['carbs'] - manual_carbs
        color = "🟢" if abs(carb_diff) <= 20 else "🟡" if abs(carb_diff) <= 40 else "🔴"
        st.write(f"{color} {total_from_meals['carbs']}/{manual_carbs}g carbs ({carb_diff:+d}g)")
    
    with check_cols[3]:
        fat_diff = total_from_meals['fat'] - manual_fat
        color = "🟢" if abs(fat_diff) <= 10 else "🟡" if abs(fat_diff) <= 20 else "🔴"
        st.write(f"{color} {total_from_meals['fat']}/{manual_fat}g fat ({fat_diff:+d}g)")
    
else:
    # Use existing day-specific nutrition
    diet_prefs = st.session_state.diet_preferences
    
    # Day-based meal planning interface
    st.subheader("📅 Weekly Meal Plan")
    
    # Day selector
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    selected_day = st.selectbox("Select day to plan meals:", days_of_week)
    
    # Get nutrition targets for selected day
    day_nutrition = st.session_state.day_specific_nutrition.get(selected_day, {})
    
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
    
    # Default meal types for regular mode
    meal_types = ['breakfast', 'lunch', 'dinner', 'snack']

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
        
        # Add AI insights for meal planning
        openai_client = get_openai_client()
        if openai_client:
            with st.expander("🧠 AI Meal Planning Insights", expanded=False):
                insights = ai_generate_meal_insights(meal_type, meal_target, diet_prefs, openai_client)
                if insights:
                    st.markdown("**AI-Powered Tips for Your Meal:**")
                    for i, insight in enumerate(insights, 1):
                        st.write(f"{i}. {insight}")
                else:
                    st.info("AI insights temporarily unavailable")
        
        # Find recommended recipes
        recommended_recipes = find_best_recipes_for_meal(recipes, meal_type, meal_target, diet_prefs)
        
        if recommended_recipes:
            # Check if recipes came from AI analysis
            ai_powered = any(rec.get('ai_reason') for rec in recommended_recipes)
            
            if ai_powered:
                st.markdown("#### 🤖 AI-Powered Recipe Recommendations")
                st.success("These recipes were intelligently selected by AI based on your nutrition targets and dietary preferences.")
            else:
                st.markdown("#### Recommended Recipes")
                st.info("Using nutritional matching algorithm to find suitable recipes.")
            
            # Display recipe options
            for j, rec_data in enumerate(recommended_recipes):
                recipe = rec_data['recipe']
                recipe_macros = rec_data['macros']
                ai_reason = rec_data.get('ai_reason', '')
                ai_rank = rec_data.get('ai_rank', j+1)
                
                # Enhanced title with AI ranking
                title_prefix = f"🥇 AI Top Choice" if ai_rank == 1 else f"#{ai_rank} AI Pick" if ai_reason else f"Option {j+1}"
                
                with st.expander(f"{title_prefix}: {recipe.get('title', 'Untitled Recipe')}", expanded=(j==0)):
                    if ai_reason:
                        st.markdown(f"**🤖 AI Analysis:** {ai_reason}")
                        st.markdown("---")
                    
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
            
            # Get food components based on dietary preferences and meal type
            protein_sources = get_protein_sources(diet_prefs, meal_type)
            carb_sources = get_carb_sources(diet_prefs, meal_type)
            fat_sources = get_fat_sources(diet_prefs, meal_type)
            vegetable_sources = get_vegetable_sources(diet_prefs)
            
            # Check if we have appropriate food sources for this meal type
            if not protein_sources and not carb_sources and not fat_sources:
                st.warning(f"No suitable food components found for {meal_type} with your dietary preferences. Try adjusting your restrictions or check other meal types.")
            else:
                with st.expander("Build Custom Meal", expanded=True):
                    # Show meal-specific guidance
                    if meal_type == 'breakfast':
                        st.info("Building a healthy breakfast with protein, carbs, and healthy fats to start your day.")
                    elif meal_type == 'lunch':
                        st.info("Creating a balanced lunch to fuel your afternoon activities.")
                    elif meal_type == 'dinner':
                        st.info("Designing a satisfying dinner to support recovery and evening goals.")
                    elif meal_type == 'snack':
                        st.info("Selecting snack components to bridge meals and support your targets.")
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        if protein_sources:
                            selected_protein = st.selectbox(
                                f"Choose {meal_type} protein source:",
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
                        else:
                            st.write("No suitable protein sources for this meal type and dietary preferences.")
                            selected_protein = "None"
                            protein_amount = 0
                        
                        if carb_sources:
                            selected_carb = st.selectbox(
                                f"Choose {meal_type} carb source:",
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
                        else:
                            st.write("No suitable carb sources for this meal type and dietary preferences.")
                            selected_carb = "None"
                            carb_amount = 0
                    
                    with col2:
                        if fat_sources:
                            selected_fat = st.selectbox(
                                f"Choose {meal_type} fat source:",
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
                        else:
                            st.write("No suitable fat sources for this meal type and dietary preferences.")
                            selected_fat = "None"
                            fat_amount = 0
                        
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
if st.session_state.meal_plans.get(selected_day, {}) and any(meal_data.get('recipes', []) for meal_data in st.session_state.meal_plans[selected_day].values()):
    st.markdown("---")
    st.markdown("### Export Options")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📋 Generate Grocery List", type="secondary"):
            grocery_list = generate_grocery_list({selected_day: st.session_state.meal_plans[selected_day]})
            if grocery_list:
                st.markdown("**Grocery List:**")
                for item in sorted(grocery_list.keys()):
                    st.write(f"• {item}")
            else:
                st.info("No ingredients found in meal plan")
    
    with col2:
        if st.button("📄 Export PDF Meal Plan", type="primary"):
            try:
                pdf = create_meal_plan_pdf(
                    {selected_day: st.session_state.meal_plans[selected_day]}, 
                    day_nutrition, 
                    diet_prefs
                )
                
                # Save PDF to bytes
                pdf_output = pdf.output(dest='S')
                if isinstance(pdf_output, str):
                    pdf_output = pdf_output.encode('latin-1')
                
                st.download_button(
                    label="Download PDF",
                    data=pdf_output,
                    file_name=f"fitomics_meal_plan_{selected_day.lower().replace(' ', '_')}.pdf",
                    mime="application/pdf"
                )
                st.success("PDF meal plan generated successfully!")
                
            except Exception as e:
                st.error(f"Error generating PDF: {str(e)}")

# Multi-day planning for standalone mode
if standalone_mode:
    st.markdown("---")
    st.subheader("📅 Multi-Day Planning")
    
    if st.button("🔄 Apply This Plan to Multiple Days"):
        selected_days = st.multiselect(
            "Select days to copy this meal plan to:",
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            default=[]
        )
        
        if selected_days and st.button("Copy Meal Plan"):
            for day in selected_days:
                if day not in st.session_state.meal_plans:
                    st.session_state.meal_plans[day] = {}
                for meal_type in meal_types:
                    if meal_type not in st.session_state.meal_plans[day]:
                        st.session_state.meal_plans[day][meal_type] = {'recipes': []}
                    
                    # Copy current day's meal plan
                    current_recipes = st.session_state.meal_plans[selected_day][meal_type]['recipes']
                    st.session_state.meal_plans[day][meal_type]['recipes'] = current_recipes.copy()
            
            st.success(f"Meal plan copied to {len(selected_days)} days!")
            st.rerun()
    
    # Weekly summary for standalone mode
    if len(st.session_state.meal_plans) > 1:
        st.markdown("### Weekly Summary")
        
        weekly_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        planned_days = 0
        
        for day, meals in st.session_state.meal_plans.items():
            if any(meal_data.get('recipes', []) for meal_data in meals.values()):
                planned_days += 1
                for meal_type, meal_data in meals.items():
                    for recipe_entry in meal_data.get('recipes', []):
                        macros = recipe_entry['adjusted_macros']
                        for macro in weekly_totals:
                            weekly_totals[macro] += macros[macro]
        
        if planned_days > 0:
            avg_daily = {macro: total / planned_days for macro, total in weekly_totals.items()}
            
            st.write(f"**{planned_days} days planned**")
            
            weekly_cols = st.columns(4)
            with weekly_cols[0]:
                st.metric("Avg Daily Calories", f"{avg_daily['calories']:.0f}")
            with weekly_cols[1]:
                st.metric("Avg Daily Protein", f"{avg_daily['protein']:.0f}g")
            with weekly_cols[2]:
                st.metric("Avg Daily Carbs", f"{avg_daily['carbs']:.0f}g")
            with weekly_cols[3]:
                st.metric("Avg Daily Fat", f"{avg_daily['fat']:.0f}g")
            
            # Export full week
            if st.button("📄 Export Full Week PDF", type="primary"):
                try:
                    pdf = create_meal_plan_pdf(st.session_state.meal_plans, day_nutrition, diet_prefs)
                    pdf_output = pdf.output(dest='S')
                    if isinstance(pdf_output, str):
                        pdf_output = pdf_output.encode('latin-1')
                    
                    st.download_button(
                        label="Download Weekly PDF",
                        data=pdf_output,
                        file_name="fitomics_weekly_meal_plan.pdf",
                        mime="application/pdf"
                    )
                    st.success("Weekly meal plan PDF generated!")
                    
                except Exception as e:
                    st.error(f"Error generating weekly PDF: {str(e)}")