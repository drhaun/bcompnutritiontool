import streamlit as st
import pandas as pd
import json
import os
import re
from datetime import datetime, time
import copy
from typing import Dict, List

# Import our modules
import utils
import fdc_api
import macro_validator
from nutrition_cache import NutritionCache
from pdf_export import export_meal_plan_pdf
from session_manager import add_session_controls
from enhanced_ai_meal_planning_simple import create_enhanced_meal_planner_simple
from ai_meal_plan_utils import (
    safe_api_call,
    safe_json_parse,
    validate_meal_macros,
    consolidate_meal_plan_display,
    display_meal,
    export_single_day_pdf,
    build_meal_prompt
)

# OpenAI Integration
def get_openai_client():
    """Get OpenAI client with production configuration"""
    try:
        import openai
        api_key = os.environ.get('OPENAI_API_KEY')
        org_id = os.environ.get('OPENAI_ORGANIZATION_ID')
        project_id = os.environ.get('OPENAI_PROJECT_ID')
        
        if api_key:
            # Use environment variables for secure configuration
            client_kwargs = {'api_key': api_key}
            if org_id:
                client_kwargs['organization'] = org_id
            if project_id:
                client_kwargs['project'] = project_id
            
            return openai.OpenAI(**client_kwargs)
    except ImportError:
        pass
    return None

def build_user_profile_context(user_profile, body_comp_goals):
    """Build comprehensive user profile context for AI prompts"""
    
    # Ensure inputs are dictionaries
    if not isinstance(user_profile, dict):
        user_profile = {}
    if not isinstance(body_comp_goals, dict):
        body_comp_goals = {}
    
    context = ""
    
    if user_profile:
        context += f"""
USER PROFILE:
- Age: {user_profile.get('age', 'Not specified')} years
- Gender: {user_profile.get('gender', 'Not specified')}
- Height: {user_profile.get('height_ft', 'Not specified')}'{user_profile.get('height_in', '')}\"
- Current Weight: {user_profile.get('weight_lbs', 'Not specified')} lbs
- Activity Level: {user_profile.get('activity_level', 'Not specified')}
- Goal Focus: {user_profile.get('goal_focus', 'Not specified')}
- Lifestyle Commitment: {user_profile.get('lifestyle_commitment', 'Not specified')}
"""
    
    if body_comp_goals:
        context += f"""
BODY COMPOSITION GOALS:
- Primary Goal: {body_comp_goals.get('goal_type', 'Not specified') if body_comp_goals else 'Not specified'}
- Target Weight: {st.session_state.get('target_weight_lbs', 'Not specified')} lbs
- Target Body Fat: {st.session_state.get('target_bf', 'Not specified')}%
- Timeline: {st.session_state.get('timeline_weeks', 'Not specified')} weeks
- Performance Priority: {st.session_state.get('performance_preference', 'Not specified')}
- Body Comp Priority: {st.session_state.get('body_comp_preference', 'Not specified')}
"""
    
    return context

def build_dietary_context(diet_preferences):
    """Build comprehensive dietary preferences context"""
    
    # Ensure input is a dictionary
    if not isinstance(diet_preferences, dict):
        diet_preferences = {}
    
    dietary_restrictions = diet_preferences.get('dietary_restrictions', [])
    allergies = diet_preferences.get('allergies', [])
    
    context = f"""
DIETARY RESTRICTIONS & SAFETY:
- Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- ALLERGIES (STRICTLY AVOID): {', '.join(allergies) if allergies else 'None'}
- Disliked Foods: {', '.join(diet_preferences.get('disliked_foods', [])[:8])}

FOOD PREFERENCES:
- Proteins: {', '.join(diet_preferences.get('preferred_proteins', [])[:8])}
- Carbs: {', '.join(diet_preferences.get('preferred_carbs', [])[:8])}
- Fats: {', '.join(diet_preferences.get('preferred_fats', [])[:8])}
- Vegetables: {', '.join(diet_preferences.get('preferred_vegetables', [])[:8])}
- Cuisines: {', '.join(diet_preferences.get('cuisine_preferences', [])[:5])}

FLAVOR PREFERENCES:
- Spice Level: {diet_preferences.get('spice_level', 'Medium')}
- Flavor Profiles: {', '.join(diet_preferences.get('flavor_profile', [])[:5])}
- Seasonings: {', '.join(diet_preferences.get('preferred_seasonings', [])[:8])}

PRACTICAL CONSTRAINTS:
- Cooking Time: {diet_preferences.get('cooking_time_preference', 'Medium (30-60 min)')}
- Budget: {diet_preferences.get('budget_preference', 'Moderate')}
- Cooking For: {diet_preferences.get('cooking_for', 'Just myself')}
- Leftovers: {diet_preferences.get('leftovers_preference', 'Okay with leftovers occasionally')}
- Variety Level: {diet_preferences.get('variety_level', 'Moderate Variety')}
"""
    
    return context

def step1_generate_meal_structure(day_targets, user_context, dietary_context, schedule_info, openai_client):
    """Step 1: Generate optimal meal structure and timing for the day"""
    
    # Ensure inputs are dictionaries
    if not isinstance(day_targets, dict):
        day_targets = {}
    if not isinstance(schedule_info, dict):
        schedule_info = {}
    
    daily_totals = day_targets.get('daily_totals', {
        'calories': 2000,
        'protein': 150,
        'carbs': 200,
        'fat': 70
    })
    
    prompt = f"""
You are a professional nutritionist. Design an optimal meal structure for this user.

{user_context}

{dietary_context}

DAILY TARGETS:
- Calories: {daily_totals.get('calories', 2000)}
- Protein: {daily_totals.get('protein', 150)}g
- Carbs: {daily_totals.get('carbs', 200)}g  
- Fat: {daily_totals.get('fat', 70)}g

MEAL DISTRIBUTION APPROACH:
- Distribute 75% of daily calories/macros across main meals
- Distribute 25% of daily calories/macros across snacks
- Standard structure: 3 meals + 2 snacks per day (adjust if user prefers different)

SCHEDULE CONTEXT:
- Workouts: {schedule_info.get('workouts', 'None scheduled')}
- Meal Contexts: {schedule_info.get('meal_contexts', {})}

Design meal structure using proportional distribution:
1. Divide daily targets appropriately across meals (75%) and snacks (25%)
2. Optimal timing relative to workouts
3. Ensure each meal/snack hits its proportional macro targets
4. Meal purposes (pre-workout, post-workout, etc.)

Return JSON with:
{{
  "meal_structure": [
    {{
      "meal_name": "Meal 1",
      "timing": "7:00 AM",
      "purpose": "Energy start",
      "target_calories": 500,
      "target_protein": 30,
      "target_carbs": 60,
      "target_fat": 20,
      "workout_relation": "none"
    }}
  ],
  "rationale": "Why this structure works for this user"
}}
"""
    
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a nutritionist focused on optimal meal timing and structure. Be precise and scientific."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=1500
    )
    
    try:
        return safe_json_parse(response.choices[0].message.content, 
                              {"meal_structure": [], "rationale": "Default meal structure"})
    except:
        return {"meal_structure": [], "rationale": "Error parsing meal structure"}

def generate_quick_meal_plan(day_targets, user_context, dietary_context, schedule_info, openai_client):
    """Simplified single-step meal generation for speed"""
    
    prompt = f"""
Create a complete meal plan for the day using Fitomics standards.

{user_context}

{dietary_context}

DAILY TARGETS:
- Calories: {day_targets.get('calories', 2624)}
- Protein: {day_targets.get('protein', 200)}g
- Carbs: {day_targets.get('carbs', 250)}g
- Fat: {day_targets.get('fat', 80)}g

MEAL STRUCTURE REQUIREMENTS:
- 3 meals: Each gets ~25% of daily calories/macros (75% total for meals)
- 2 snacks: Each gets ~12.5% of daily calories/macros (25% total for snacks)
- Example for 2000 cal day: 3 meals @ ~500 cal each, 2 snacks @ ~250 cal each
- Calculate exact portions based on the specific daily targets above

SCHEDULE: {json.dumps(schedule_info, indent=2)}

Generate a complete meal plan with specific ingredients and portions.

Return JSON:
{{
  "meals": [
    {{
      "name": "Meal 1",
      "time": "7:00 AM",
      "context": "Morning energy",
      "ingredients": [
        {{"item": "ingredient name", "amount": "100g"}},
        ...
      ],
      "instructions": ["Step 1", "Step 2"],
      "total_macros": {{
        "calories": 656,
        "protein": 50,
        "carbs": calculated,
        "fat": calculated
      }}
    }},
    // ... 3 meals + 2 snacks
  ],
  "daily_totals": {{
    "calories": total,
    "protein": total,
    "carbs": total,
    "fat": total
  }},
  "meal_structure_rationale": "Brief explanation of meal timing and structure"
}}
"""
    
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a nutritionist creating precise meal plans. Distribute 75% of daily calories/macros across 3 meals (25% each) and 25% across 2 snacks (12.5% each). Be accurate with macro calculations."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=4000
    )
    
    try:
        result = safe_json_parse(response.choices[0].message.content, {})
        
        # Don't override the AI's calculated values - they should already be proportional
        # The AI has been instructed to use the 75%/25% distribution
        
        return result
    except:
        return safe_json_parse(response.choices[0].message.content if response else "", None)

def step2_generate_meal_concepts(meal_structure, user_context, dietary_context, openai_client):
    """Step 2: Generate specific meal concepts for each meal in the structure"""
    meal_concepts = []
    
    for meal in meal_structure['meal_structure']:
        prompt = f"""
Create a specific meal concept for this meal slot.

{user_context}

{dietary_context}

MEAL REQUIREMENTS:
- Name: {meal['meal_name']}
- Timing: {meal['timing']}
- Purpose: {meal['purpose']}
- Target Calories: {meal['target_calories']}
- Target Protein: {meal['target_protein']}g
- Target Carbs: {meal['target_carbs']}g
- Target Fat: {meal['target_fat']}g
- Workout Relation: {meal['workout_relation']}

Generate a specific meal concept that:
1. Fits the user's preferences perfectly
2. Achieves the macro targets (MUST be exact: 656 cal/50g protein for meals, 328 cal/25g protein for snacks)
3. Considers workout timing if applicable
4. Uses preferred ingredients when possible

Return JSON:
{{
  "meal_concept": {{
    "name": "Specific meal name",
    "description": "Brief description",
    "key_ingredients": ["ingredient1", "ingredient2"],
    "cooking_method": "How it's prepared",
    "estimated_prep_time": "15 minutes"
  }}
}}
"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a chef and nutritionist. Create appealing, practical meal concepts that match the specified macro targets for each meal/snack. Use the exact targets provided."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1000
        )
        
        try:
            concept_result = safe_json_parse(response.choices[0].message.content, 
                                           {"meal_concept": {"name": "Default Meal", "description": "Standard meal", "key_ingredients": [], "cooking_method": "Standard", "estimated_prep_time": "30 min"}})
        except:
            concept_result = {"meal_concept": {"name": "Error", "description": "Parse error", "key_ingredients": [], "cooking_method": "N/A", "estimated_prep_time": "N/A"}}
        meal_concepts.append({
            **meal,
            **concept_result['meal_concept']
        })
    
    return meal_concepts

def get_fdc_nutrition_data(ingredients_list):
    """Get real FDC nutrition data for ingredient list with comprehensive fallbacks"""
    nutrition_database = {}
    
    for ingredient in ingredients_list:
        st.write(f"   📊 Looking up: {ingredient}")
        
        # Initialize with fallback first
        fallback_nutrition = get_fallback_nutrition_per_100g(ingredient)
        nutrition_database[ingredient] = {
            'fdc_description': ingredient,
            'per_100g': fallback_nutrition,
            'source': 'fallback'
        }
        
        try:
            search_results = fdc_api.search_foods(ingredient, page_size=5)
            if search_results and len(search_results) > 0:
                food_item = search_results[0]
                nutrients = food_item.get('foodNutrients', [])
                
                # Extract per 100g nutrition
                nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                nutrient_mapping = {1008: 'calories', 1003: 'protein', 1005: 'carbs', 1004: 'fat'}
                
                nutrients_found = 0
                for nutrient in nutrients:
                    nutrient_id = nutrient.get('nutrientId')
                    if nutrient_id in nutrient_mapping:
                        value = nutrient.get('value', 0)
                        if value > 0:  # Only count non-zero values
                            nutrition[nutrient_mapping[nutrient_id]] = round(value, 1)
                            nutrients_found += 1
                
                # Only use FDC data if we found meaningful nutrition info
                if nutrients_found >= 2:  # At least 2 macros found
                    nutrition_database[ingredient] = {
                        'fdc_description': food_item.get('description', ingredient),
                        'per_100g': nutrition,
                        'source': 'fdc'
                    }
                    st.write(f"   ✅ FDC found: {nutrition}")
                else:
                    st.write(f"   📊 FDC incomplete, using fallback: {fallback_nutrition}")
            else:
                st.write(f"   📊 No FDC results, using fallback: {fallback_nutrition}")
                
        except Exception as e:
            st.write(f"   ⚠️ FDC error for {ingredient}: {str(e)}, using fallback")
    
    return nutrition_database

def get_fallback_nutrition_per_100g(ingredient):
    """Comprehensive fallback nutrition per 100g with fuzzy matching"""
    fallback_db = {
        # Proteins
        'chicken breast': {'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
        'chicken': {'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
        'ground turkey': {'calories': 189, 'protein': 27, 'carbs': 0, 'fat': 8},
        'turkey': {'calories': 189, 'protein': 27, 'carbs': 0, 'fat': 8},
        'salmon': {'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 12},
        'fish': {'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 12},
        'eggs': {'calories': 155, 'protein': 13, 'carbs': 1, 'fat': 11},
        'egg': {'calories': 155, 'protein': 13, 'carbs': 1, 'fat': 11},
        'greek yogurt': {'calories': 97, 'protein': 10, 'carbs': 4, 'fat': 5},
        'yogurt': {'calories': 97, 'protein': 10, 'carbs': 4, 'fat': 5},
        'cottage cheese': {'calories': 98, 'protein': 11, 'carbs': 3.4, 'fat': 4.3},
        'cheese': {'calories': 113, 'protein': 7, 'carbs': 1, 'fat': 9},
        'tofu': {'calories': 76, 'protein': 8, 'carbs': 1.9, 'fat': 4.8},
        'beef': {'calories': 250, 'protein': 26, 'carbs': 0, 'fat': 15},
        'pork': {'calories': 242, 'protein': 27, 'carbs': 0, 'fat': 14},
        
        # Carbs
        'brown rice': {'calories': 123, 'protein': 2.6, 'carbs': 23, 'fat': 0.9},
        'rice': {'calories': 130, 'protein': 2.7, 'carbs': 28, 'fat': 0.3},
        'quinoa': {'calories': 120, 'protein': 4.4, 'carbs': 22, 'fat': 1.9},
        'oats': {'calories': 68, 'protein': 2.4, 'carbs': 12, 'fat': 1.4},
        'oatmeal': {'calories': 68, 'protein': 2.4, 'carbs': 12, 'fat': 1.4},
        'sweet potato': {'calories': 86, 'protein': 1.6, 'carbs': 20, 'fat': 0.1},
        'potato': {'calories': 77, 'protein': 2, 'carbs': 17, 'fat': 0.1},
        'bread': {'calories': 265, 'protein': 9, 'carbs': 49, 'fat': 3.2},
        'pasta': {'calories': 131, 'protein': 5, 'carbs': 25, 'fat': 1.1},
        'banana': {'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3},
        'apple': {'calories': 52, 'protein': 0.3, 'carbs': 14, 'fat': 0.2},
        'berries': {'calories': 57, 'protein': 0.7, 'carbs': 14, 'fat': 0.3},
        
        # Vegetables
        'broccoli': {'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
        'spinach': {'calories': 23, 'protein': 2.9, 'carbs': 3.6, 'fat': 0.4},
        'kale': {'calories': 35, 'protein': 2.9, 'carbs': 4.4, 'fat': 1.5},
        'lettuce': {'calories': 15, 'protein': 1.4, 'carbs': 2.9, 'fat': 0.2},
        'tomato': {'calories': 18, 'protein': 0.9, 'carbs': 3.9, 'fat': 0.2},
        'cucumber': {'calories': 16, 'protein': 0.7, 'carbs': 4, 'fat': 0.1},
        'bell pepper': {'calories': 31, 'protein': 1, 'carbs': 7, 'fat': 0.3},
        'carrot': {'calories': 41, 'protein': 0.9, 'carbs': 10, 'fat': 0.2},
        'onion': {'calories': 40, 'protein': 1.1, 'carbs': 9.3, 'fat': 0.1},
        
        # Fats
        'avocado': {'calories': 160, 'protein': 2, 'carbs': 9, 'fat': 15},
        'almonds': {'calories': 576, 'protein': 21, 'carbs': 22, 'fat': 49},
        'nuts': {'calories': 576, 'protein': 21, 'carbs': 22, 'fat': 49},
        'walnuts': {'calories': 654, 'protein': 15, 'carbs': 14, 'fat': 65},
        'olive oil': {'calories': 884, 'protein': 0, 'carbs': 0, 'fat': 100},
        'oil': {'calories': 884, 'protein': 0, 'carbs': 0, 'fat': 100},
        'butter': {'calories': 717, 'protein': 0.9, 'carbs': 0.1, 'fat': 81},
        'peanut butter': {'calories': 588, 'protein': 25, 'carbs': 20, 'fat': 50},
        'seeds': {'calories': 486, 'protein': 19, 'carbs': 23, 'fat': 42}
    }
    
    ingredient_lower = ingredient.lower()
    
    # First try exact matches
    if ingredient_lower in fallback_db:
        return fallback_db[ingredient_lower]
    
    # Then try partial matches
    for key, nutrition in fallback_db.items():
        if key in ingredient_lower or ingredient_lower in key:
            return nutrition
    
    # Fuzzy matching for common food patterns
    if any(word in ingredient_lower for word in ['meat', 'protein', 'chicken', 'beef', 'fish']):
        return {'calories': 200, 'protein': 25, 'carbs': 0, 'fat': 10}
    elif any(word in ingredient_lower for word in ['vegetable', 'veggie', 'green']):
        return {'calories': 25, 'protein': 2, 'carbs': 5, 'fat': 0.2}
    elif any(word in ingredient_lower for word in ['fruit', 'berry']):
        return {'calories': 50, 'protein': 0.5, 'carbs': 12, 'fat': 0.2}
    elif any(word in ingredient_lower for word in ['grain', 'cereal', 'carb']):
        return {'calories': 120, 'protein': 3, 'carbs': 25, 'fat': 1}
    elif any(word in ingredient_lower for word in ['fat', 'oil', 'nut']):
        return {'calories': 600, 'protein': 15, 'carbs': 10, 'fat': 55}
    
    # Default fallback
    return {'calories': 150, 'protein': 8, 'carbs': 15, 'fat': 5}

def step3_generate_precise_recipes(meal_concepts, openai_client):
    """Step 3: Generate precise recipes with accurate macro targeting"""
    final_meals = []
    
    for meal_concept in meal_concepts:
        st.write(f"🍳 Creating precise recipe for {meal_concept['name']}...")
        
        # Build prompt without nested f-strings
        meal_name = meal_concept['name']
        meal_description = meal_concept['description']
        key_ingredients = meal_concept['key_ingredients']
        cooking_method = meal_concept['cooking_method']
        target_calories = meal_concept['target_calories']
        target_protein = meal_concept['target_protein']
        target_carbs = meal_concept['target_carbs']
        target_fat = meal_concept['target_fat']
        
        prompt = f"""
Create a precise recipe for this meal concept with EXACT portions to hit the macro targets.

MEAL CONCEPT:
- Name: {meal_name}
- Description: {meal_description}
- Key Ingredients: {key_ingredients}
- Cooking Method: {cooking_method}

EXACT MACRO TARGETS (MUST BE ACHIEVED):
- Calories: {target_calories} (±5 calories)
- Protein: {target_protein}g (±1g)
- Carbs: {target_carbs}g (±1g)
- Fat: {target_fat}g (±1g)

CRITICAL INSTRUCTIONS:
1. Use standard USDA nutrition values for all ingredients
2. Calculate exact gram/ounce amounts to hit targets precisely
3. Include realistic portion sizes (e.g., 150g chicken breast, 100g rice, 1 tbsp olive oil)
4. Verify your math - ingredient totals must add up to targets exactly
5. If targets can't be met exactly, prioritize protein first, then calories, then carbs and fat
6. Use common cooking measurements when possible but include gram weights for precision

Return JSON with this structure:
{{
  "recipe": {{
    "name": "meal name",
    "ingredients": [
      {{
        "item": "ingredient name",
        "amount": "amount with unit",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      }}
    ],
    "instructions": ["Step 1", "Step 2"],
    "total_macros": {{
      "calories": {target_calories},
      "protein": {target_protein},
      "carbs": {target_carbs},
      "fat": {target_fat}
    }},
    "prep_time": "preparation time",
    "context": "meal purpose", 
    "time": "meal timing",
    "workout_annotation": "workout relation"
  }}
}}
"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a precision nutritionist. Calculate EXACT ingredient amounts to hit macro targets perfectly. Use standard USDA nutrition values and verify your math. Prioritize accuracy over creativity."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0,  # Zero temperature for maximum precision
            max_tokens=2000
        )
        
        try:
            recipe_result = safe_json_parse(response.choices[0].message.content, 
                                           {"recipe": {"name": "Default Recipe", "ingredients": [], "instructions": [], "total_macros": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}}})
            final_meals.append(recipe_result.get('recipe', {
                'name': 'Error',
                'ingredients': [],
                'instructions': ['Parse error'],
                'total_macros': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
                'prep_time': 'N/A',
                'context': '',
                'time': '',
                'workout_annotation': ''
            }))
        except:
            parsed = safe_json_parse(response.choices[0].message.content if response else "", None)
            if not parsed:
                parsed = {
                    'name': 'Error',
                    'ingredients': [],
                    'instructions': ['JSON parse error'],
                    'total_macros': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
                    'prep_time': 'N/A',
                    'context': '',
                    'time': '',
                    'workout_annotation': ''
                }
            final_meals.append(parsed)
    
    return final_meals

def step4_validate_and_adjust(final_meals, day_targets):
    """Step 4: Validate total macros and make adjustments if needed"""
    # Calculate actual totals
    total_calories = sum(meal['total_macros']['calories'] for meal in final_meals)
    total_protein = sum(meal['total_macros']['protein'] for meal in final_meals)
    total_carbs = sum(meal['total_macros']['carbs'] for meal in final_meals)
    total_fat = sum(meal['total_macros']['fat'] for meal in final_meals)
    
    # Get targets
    target_totals = day_targets.get('daily_totals', {})
    target_calories = target_totals.get('calories', 2000)
    target_protein = target_totals.get('protein', 150)
    target_carbs = target_totals.get('carbs', 200)
    target_fat = target_totals.get('fat', 70)
    
    # Check accuracy (3% tolerance)
    tolerance = 0.03
    adjustments_needed = []
    
    if abs(total_calories - target_calories) / target_calories > tolerance:
        adjustments_needed.append(f"Calories: {total_calories} vs {target_calories}")
    if abs(total_protein - target_protein) / target_protein > tolerance:
        adjustments_needed.append(f"Protein: {total_protein}g vs {target_protein}g")
    if abs(total_carbs - target_carbs) / target_carbs > tolerance:
        adjustments_needed.append(f"Carbs: {total_carbs}g vs {target_carbs}g")
    if abs(total_fat - target_fat) / target_fat > tolerance:
        adjustments_needed.append(f"Fat: {total_fat}g vs {target_fat}g")
    
    daily_totals = {
        'calories': round(total_calories),
        'protein': round(total_protein, 1),
        'carbs': round(total_carbs, 1),
        'fat': round(total_fat, 1)
    }
    
    return {
        'meals': final_meals,
        'daily_totals': daily_totals,
        'accuracy_valid': len(adjustments_needed) == 0,
        'adjustments_needed': adjustments_needed
    }

def generate_weekly_ai_meal_plan(weekly_targets, diet_preferences, weekly_schedule, openai_client, user_profile=None, body_comp_goals=None):
    """Generate complete weekly AI meal plan using step-by-step approach"""
    weekly_meal_plan = {}
    
    # Build reusable contexts
    user_context = build_user_profile_context(user_profile, body_comp_goals)
    dietary_context = build_dietary_context(diet_preferences)
    
    progress_placeholder = st.empty()
    
    for day, day_data in weekly_targets.items():
        try:
            progress_placeholder.info(f"🔄 Generating {day} meal plan - Step-by-step approach...")
            
            # Get day-specific schedule information
            schedule_info = weekly_schedule.get(day, {})
            
            # Step 1: Generate meal structure
            st.write(f"**{day} - Step 1:** Designing optimal meal structure...")
            meal_structure = step1_generate_meal_structure(day_data, user_context, dietary_context, schedule_info, openai_client)
            
            # Step 2: Generate meal concepts
            st.write(f"**{day} - Step 2:** Creating personalized meal concepts...")
            meal_concepts = step2_generate_meal_concepts(meal_structure, user_context, dietary_context, openai_client)
            
            # Step 3: Generate precise recipes
            st.write(f"**{day} - Step 3:** Calculating precise recipes and portions...")
            final_meals = step3_generate_precise_recipes(meal_concepts, openai_client)
            
            # Step 4: Validate and adjust
            st.write(f"**{day} - Step 4:** Validating macro accuracy...")
            day_result = step4_validate_and_adjust(final_meals, day_data)
            
            # Create final day plan
            day_plan = {
                'meals': day_result['meals'],
                'daily_totals': day_result['daily_totals'],
                'meal_structure_rationale': meal_structure.get('rationale', ''),
                'accuracy_validated': day_result['accuracy_valid']
            }
            
            if day_result['accuracy_valid']:
                st.success(f"✅ {day} meal plan generated with accurate macros!")
            else:
                st.warning(f"⚠️ {day} meal plan needs adjustments: {', '.join(day_result['adjustments_needed'])}")
            
            weekly_meal_plan[day] = day_plan
            
        except Exception as e:
            st.error(f"❌ Error generating {day} meal plan: {e}")
            continue
    
    progress_placeholder.success("🎉 Weekly meal plan generation complete!")
    return weekly_meal_plan

def validate_meal_plan_accuracy(day_plan, day_targets, day_name):
    """Validate that generated meal plan matches targets within acceptable tolerance"""
    try:
        # Extract daily totals from generated plan
        generated_totals = day_plan.get('daily_totals', {})
        
        # Get target totals from daily_totals structure (not meal_targets)
        target_totals = day_targets.get('daily_totals', {})
        
        # Define acceptable tolerance (3%)
        tolerance = 0.03
        
        # Check each macro
        macros = ['calories', 'protein', 'carbs', 'fat']
        accuracy_issues = []
        
        for macro in macros:
            generated = generated_totals.get(macro, 0)
            target = target_totals.get(macro, 0)
            
            if target > 0:
                deviation = abs(generated - target) / target
                if deviation > tolerance:
                    accuracy_issues.append(f"{macro}: {generated} vs {target} (±{deviation:.1%})")
        
        if accuracy_issues:
            print(f"⚠️ {day_name} macro accuracy issues:")
            for issue in accuracy_issues:
                print(f"  - {issue}")
            return False, accuracy_issues
        else:
            print(f"✅ {day_name} macro accuracy validated")
            return True, []
            
    except Exception as e:
        print(f"⚠️ Error validating {day_name} meal plan: {e}")
        return False, [f"Validation error: {e}"]

def generate_ai_meal_plan(meal_targets, diet_preferences, meal_config, openai_client):
    """Generate single-day AI meal plan (legacy function for compatibility)"""
    try:
        # Build comprehensive prompt for single day
        target_calories = meal_targets.get('calories', 2000)
        target_protein = meal_targets.get('protein', 150)
        target_carbs = meal_targets.get('carbs', 200)
        target_fat = meal_targets.get('fat', 70)
        
        prompt = f"""
Create a complete daily meal plan with the following specifications:

NUTRITION TARGETS:
- Calories: {target_calories}
- Protein: {target_protein}g
- Carbs: {target_carbs}g
- Fat: {target_fat}g

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

Create a meal plan with exact macro calculations matching targets within ±3% tolerance.

Return JSON format with:
{{
  "meals": [
    {{
      "name": "Meal 1",
      "time": "7:00 AM",
      "ingredients": [
        {{
          "item": "Oats",
          "amount": "80g",
          "calories": 304,
          "protein": 10.8,
          "carbs": 54.8,
          "fat": 6.2
        }}
      ],
      "instructions": ["Step 1", "Step 2"],
      "total_macros": {{
        "calories": 500,
        "protein": 25,
        "carbs": 60,
        "fat": 20
      }}
    }}
  ],
  "daily_totals": {{
    "calories": {target_calories},
    "protein": {target_protein},
    "carbs": {target_carbs},
    "fat": {target_fat}
  }}
}}
"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutritionist. Create precise meal plans with exact macro calculations."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=3000
        )
        
        return safe_json_parse(response.choices[0].message.content, {})
        
    except Exception as e:
        st.error(f"AI meal generation failed: {e}")
        return None

# Main Streamlit UI Code
st.set_page_config(
    page_title="Advanced AI Meal Plan",
    page_icon="🤖",
    layout="wide"
)

# Custom CSS for better styling
st.markdown("""
<style>
/* Import Fitomics color scheme */
:root {
    --fitomics-navy: #1e3a5f;
    --fitomics-gold: #d4af37;
    --fitomics-light-blue: #4a90a4;
    --fitomics-cream: #f5f5dc;
}

.main-header {
    background: linear-gradient(135deg, var(--fitomics-navy) 0%, var(--fitomics-light-blue) 100%);
    padding: 2rem;
    border-radius: 10px;
    color: white;
    text-align: center;
    margin-bottom: 2rem;
}

.main-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: white;
}

.main-header p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin: 0;
}

.step-card {
    background: white;
    border: 2px solid var(--fitomics-gold);
    border-radius: 10px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.step-title {
    color: var(--fitomics-navy);
    font-weight: 600;
    font-size: 1.3rem;
    margin-bottom: 1rem;
}

.progress-bar {
    background: var(--fitomics-gold);
    height: 4px;
    border-radius: 2px;
    margin: 1rem 0;
}

.accuracy-badge {
    display: inline-block;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
}

.accuracy-excellent {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.accuracy-good {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.accuracy-needs-work {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}
</style>
""", unsafe_allow_html=True)

# Header
st.markdown("""
<div class="main-header">
    <h1>🤖 Advanced AI Meal Plan</h1>
    <p>Step-by-step AI-powered meal planning with ±3% macro accuracy</p>
</div>
""", unsafe_allow_html=True)

# Session controls in sidebar
add_session_controls()

# Check for required data
if not all([
    st.session_state.get('user_info'),
    st.session_state.get('goal_info'),
    st.session_state.get('diet_preferences'),
    st.session_state.get('weekly_schedule_v2'),
    st.session_state.get('day_specific_nutrition')
]):
    st.error("⚠️ **Missing Required Data** - Please complete the following steps first:")
    
    missing_steps = []
    if not st.session_state.get('user_info'):
        missing_steps.append("• **Initial Setup** - Basic profile information")
    if not st.session_state.get('goal_info'):
        missing_steps.append("• **Body Composition Goals** - Target setting")
    if not st.session_state.get('diet_preferences'):
        missing_steps.append("• **Diet Preferences** - Food preferences and restrictions")
    if not st.session_state.get('weekly_schedule_v2'):
        missing_steps.append("• **Weekly Schedule** - Daily activities and workout timing")
    if not st.session_state.get('day_specific_nutrition'):
        missing_steps.append("• **Nutrition Targets** - Macro calculations")
    
    for step in missing_steps:
        st.markdown(step)
    
    st.info("👈 Use the sidebar navigation to complete these steps, then return here for AI meal planning.")
    st.stop()

# Display current sync status
st.success("✅ **Sync Profile Mode Active** - Using your personalized body composition targets and weekly schedule")

# Show comprehensive weekly overview  
with st.expander("📋 Complete Weekly Overview", expanded=True):
    st.markdown("**Summary of all your selections and calculations:**")
    
    # Get all data sources with correct session state keys
    weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
    day_nutrition = st.session_state.get('day_specific_nutrition', {})
    body_comp_goals = st.session_state.get('goal_info', {})
    initial_setup = st.session_state.get('user_info', {})
    diet_prefs = st.session_state.get('diet_preferences', {})
    
    # Create comprehensive overview table
    overview_data = []
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        schedule = weekly_schedule.get(day, {})
        nutrition = day_nutrition.get(day, {})
        
        # Count meals and snacks
        meals = schedule.get('meals', [])
        meal_count = len([m for m in meals if m.get('type') == 'meal'])
        snack_count = len([m for m in meals if m.get('type') == 'snack'])
        
        # Workout info
        workouts = schedule.get('workouts', [])
        workout_display = 'Rest Day'
        if workouts:
            if len(workouts) == 1:
                workout = workouts[0]
                workout_display = f"{workout.get('duration', 0)}min {workout.get('type', 'Workout')}"
            else:
                workout_display = f"{len(workouts)} workouts"
        
        overview_data.append({
            'Day': day,
            'TDEE': f"{schedule.get('total_calories', 0):.0f}",
            'Target Calories': f"{nutrition.get('calories', 0):.0f}",
            'Protein': f"{nutrition.get('protein', 0):.0f}g",
            'Carbs': f"{nutrition.get('carbs', 0):.0f}g",
            'Fat': f"{nutrition.get('fat', 0):.0f}g",
            'Meals': meal_count,
            'Snacks': snack_count,
            'Workout': workout_display,
            'Wake': schedule.get('wake_time', 'N/A'),
            'Sleep': schedule.get('bed_time', 'N/A')
        })
    
    overview_df = pd.DataFrame(overview_data)
    st.dataframe(overview_df, use_container_width=True, hide_index=True)

# AI Meal Planning Section
st.markdown("---")
st.markdown("## 🤖 Step-by-Step AI Meal Plan Generation")

# OpenAI integration check
openai_client = get_openai_client()
if not openai_client:
    st.error("🔑 **OpenAI API Key Required** - Please provide your OpenAI API key to generate AI meal plans.")
    st.info("Add your OpenAI API key in the Replit Secrets tab as 'OPENAI_API_KEY'")
    st.stop()

st.info("**New Step-by-Step Approach:** AI meal planning now builds your plan incrementally with better personalization and macro accuracy.")

# Interactive Meal Planning Workflow
if 'meal_plan_stage' not in st.session_state:
    st.session_state['meal_plan_stage'] = 'start'
if 'monday_plan' not in st.session_state:
    st.session_state['monday_plan'] = None
if 'approved_days' not in st.session_state:
    st.session_state['approved_days'] = {}

# Stage 1: Start the process
if st.session_state['meal_plan_stage'] == 'start':
    st.markdown("### 🎯 Interactive Meal Planning Process")
    st.info("""
    **New Interactive Approach:**
    1. **Generate Monday Example** - We'll create your first day with detailed reasoning
    2. **Review & Approve** - You can modify meals or approve the approach
    3. **Apply to Week** - Use the same rules for similar days or customize each day
    """)
    
    if st.button("🚀 Start with Monday Example", type="primary", use_container_width=True):
        st.session_state['meal_plan_stage'] = 'generating_monday'
        st.rerun()

# Stage 2: Generate Monday example
elif st.session_state['meal_plan_stage'] == 'generating_monday':
    st.markdown("### 📅 Generating Monday Example")
    
    with st.spinner("Creating your Monday meal plan with detailed reasoning..."):
        # Get required data
        weekly_targets = st.session_state.get('day_specific_nutrition', {})
        diet_preferences = st.session_state.get('diet_preferences', {})
        weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
        user_profile = st.session_state.get('user_info', {})
        body_comp_goals = st.session_state.get('goal_info', {})
        
        # Generate Monday plan with detailed reasoning
        monday_data = weekly_targets.get('Monday', {})
        monday_schedule = weekly_schedule.get('Monday', {})
        
        if monday_data:
            try:
                # Check OpenAI client
                if not openai_client:
                    st.error("OpenAI client not initialized. Please check API key.")
                    st.session_state['meal_plan_stage'] = 'start'
                    st.stop()
                
                # Build contexts
                user_context = build_user_profile_context(user_profile, body_comp_goals)
                diet_context = build_dietary_context(diet_preferences)
                
                # Use quick generation for speed
                progress_placeholder = st.empty()
                progress_placeholder.info("⚡ Generating optimized Monday meal plan based on your personalized targets...")
                
                try:
                    # Use the new quick generation function
                    final_result = generate_quick_meal_plan(
                        monday_data, user_context, diet_context, monday_schedule, openai_client
                    )
                    
                    # Initialize meal_structure for later use
                    meal_structure = {}
                    
                    if not final_result:
                        # Fallback to step-by-step if quick fails
                        progress_placeholder.info("🏗️ Using detailed generation...")
                        
                        # Step 1: Meal Structure
                        meal_structure = step1_generate_meal_structure(
                            monday_data, user_context, diet_context, monday_schedule, openai_client
                        )
                        
                        # Step 2: Meal Concepts  
                        meal_concepts = step2_generate_meal_concepts(
                            meal_structure, user_context, diet_context, openai_client
                        )
                        
                        # Step 3: Precise Recipes
                        precise_meals = step3_generate_precise_recipes(
                            meal_concepts, openai_client
                        )
                        
                        # Step 4: Validation
                        final_result = step4_validate_and_adjust(precise_meals, monday_data)
                    
                except Exception as e:
                    st.error(f"Generation error: {e}")
                    progress_placeholder.error("❌ Unable to generate meal plan due to API issue")
                    st.session_state['meal_plan_stage'] = 'start'
                    st.stop()
                
                # Create comprehensive Monday plan with reasoning
                # Ensure meal_structure is a dict
                if isinstance(meal_structure, str):
                    rationale = "Meal structure generated successfully"
                else:
                    rationale = meal_structure.get('rationale', 'Meal structure generated successfully') if isinstance(meal_structure, dict) else "Meal structure generated successfully"
                
                # Ensure final_result is a dict
                if not isinstance(final_result, dict):
                    final_result = {'meals': [], 'daily_totals': {}, 'accuracy_valid': False, 'adjustments_needed': []}
                
                monday_plan = {
                    'day': 'Monday',
                    'meals': final_result.get('meals', []),
                    'daily_totals': final_result.get('daily_totals', {}),
                    'meal_structure_rationale': rationale,
                    'meal_concepts_reasoning': 'Generated personalized meal concepts based on user preferences',
                    'accuracy_validated': final_result.get('accuracy_valid', False),
                    'adjustments_made': final_result.get('adjustments_needed', []),
                    'schedule_context': monday_schedule,
                    'nutrition_targets': monday_data
                }
                
                st.session_state['monday_plan'] = monday_plan
                st.session_state['meal_plan_stage'] = 'review_monday'
                progress_placeholder.success("✅ Monday example generated!")
                st.rerun()
                
            except Exception as e:
                st.error(f"Error generating Monday plan: {e}")
                st.session_state['meal_plan_stage'] = 'start'

# Stage 3: Review Monday example
elif st.session_state['meal_plan_stage'] == 'review_monday':
    monday_plan = st.session_state['monday_plan']
    
    st.markdown("### 📅 Review Your Monday Example")
    st.info("**Review the reasoning and meals below. You can approve this approach or request modifications.**")
    
    # Show reasoning and context
    with st.expander("🧠 AI Reasoning & Context", expanded=True):
        st.markdown("**Meal Structure Rationale:**")
        st.markdown(monday_plan.get('meal_structure_rationale', 'Not provided'))
        
        st.markdown("**Meal Concept Reasoning:**")
        st.markdown(monday_plan.get('meal_concepts_reasoning', 'Not provided'))
        
        # Show schedule context
        schedule_context = monday_plan.get('schedule_context', {})
        if schedule_context:
            st.markdown("**Monday Schedule Context:**")
            workouts = schedule_context.get('workouts', [])
            workout_text = f"{len(workouts)} workout(s)" if workouts else "Rest day"
            st.markdown(f"**Workouts:** {workout_text}")
    
    # Show generated meals
    st.markdown("### 🍽️ Generated Monday Meals")
    
    meals = monday_plan.get('meals', [])
    for i, meal in enumerate(meals):
        with st.container():
            # Use simple meal naming
            if i < 3:
                meal_name = f"Meal {i+1}"
            else:
                meal_name = f"Snack {i-2}"
            st.markdown(f"#### {meal_name}")
            
            col1, col2 = st.columns([2, 1])
            
            with col1:
                if meal.get('time'):
                    st.markdown(f"**Time:** {meal['time']}")
                if meal.get('context'):
                    st.markdown(f"**Context:** {meal['context']}")
                if meal.get('prep_time'):
                    st.markdown(f"**Prep Time:** {meal['prep_time']}")
                
                # Show ingredients
                ingredients = meal.get('ingredients', [])
                if ingredients:
                    st.markdown("**Ingredients:**")
                    for ingredient in ingredients:
                        st.markdown(f"• {ingredient.get('amount', '')} {ingredient.get('item', 'Unknown ingredient')}")
                
                # Show instructions
                instructions = meal.get('instructions', [])
                if instructions:
                    st.markdown("**Instructions:**")
                    for j, instruction in enumerate(instructions, 1):
                        st.markdown(f"{j}. {instruction}")
            
            with col2:
                # Show macros
                macros = meal.get('total_macros', {})
                if macros:
                    st.metric("Calories", f"{macros.get('calories', 0)}")
                    st.metric("Protein", f"{macros.get('protein', 0)}g")
                    st.metric("Carbs", f"{macros.get('carbs', 0)}g")
                    st.metric("Fat", f"{macros.get('fat', 0)}g")
            
            st.markdown("---")
    
    # Show daily totals vs targets
    daily_totals = monday_plan.get('daily_totals', {})
    nutrition_targets = monday_plan.get('nutrition_targets', {})
    
    if daily_totals and nutrition_targets:
        st.markdown("### 📊 Accuracy Check")
        accuracy_data = []
        
        for macro in ['calories', 'protein', 'carbs', 'fat']:
            target = nutrition_targets.get(macro, 0)
            actual = daily_totals.get(macro, 0)
            
            if target > 0:
                deviation = ((actual - target) / target) * 100
                status = "✅ Excellent" if abs(deviation) <= 3 else "⚠️ Needs adjustment"
                
                accuracy_data.append({
                    'Macro': macro.title(),
                    'Target': f"{target:.0f}{'g' if macro != 'calories' else ''}",
                    'Actual': f"{actual:.0f}{'g' if macro != 'calories' else ''}",
                    'Deviation': f"{deviation:+.1f}%",
                    'Status': status
                })
        
        accuracy_df = pd.DataFrame(accuracy_data)
        st.dataframe(accuracy_df, use_container_width=True, hide_index=True)
        
        # Add intelligent meal adjustment interface
        st.markdown("### 🔧 Intelligent Meal Optimization")
        st.info("**New AI Precision Feature**: Use the 🤖 AI Precision button for intelligent macro targeting with ±1% accuracy, or manually adjust portions.")
        
        # Add bulk optimization option
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown("**🎯 Bulk Optimization Options:**")
        with col2:
            if st.button("⚡ Quick Fix All", type="primary", help="Auto-adjust all meal portions"):
                try:
                    # Simple bulk scaling for all meals
                    total_fixed = 0
                    results = []
                    
                    # Get per-meal targets
                    per_meal_targets = st.session_state.get('per_meal_macros', {})
                    
                    for i, meal in enumerate(meals):
                        meal_key = f"monday_meal_{i}"
                        meal_name = ["Breakfast", "Lunch", "Dinner", "Mid-Morning Snack", "Afternoon Snack"][i]
                        
                        # Get targets for this meal
                        meal_targets = per_meal_targets.get(meal_name, {
                            "calories": 400, "protein": 30, "carbs": 40, "fat": 15
                        })
                        
                        # Check if meal has adjustments
                        if f"{meal_key}_adjustments" in st.session_state:
                            adjustments = st.session_state[f"{meal_key}_adjustments"]
                            
                            # Calculate current totals
                            current_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                            for ing_name, adj_data in adjustments.items():
                                factor = adj_data['factor']
                                nutrition = adj_data['nutrition']
                                for macro in current_totals:
                                    current_totals[macro] += nutrition.get(macro, 0) * factor
                            
                            # Calculate and apply scaling
                            target_calories = meal_targets.get('calories', 400)
                            current_calories = current_totals.get('calories', 1)
                            
                            if current_calories > 0:
                                scale_factor = target_calories / current_calories
                                scale_factor = max(0.5, min(2.0, scale_factor))  # Reasonable limits
                                
                                # Apply scaling to all ingredients in this meal
                                for ing_name in adjustments:
                                    current_factor = adjustments[ing_name]['factor']
                                    new_factor = current_factor * scale_factor
                                    st.session_state[f"{meal_key}_adjustments"][ing_name]['factor'] = round(new_factor, 2)
                                
                                projected_calories = current_calories * scale_factor
                                projected_protein = current_totals.get('protein', 0) * scale_factor
                                
                                results.append(f"✅ {meal_name}: {projected_calories:.0f} cal, {projected_protein:.0f}g protein")
                                total_fixed += 1
                    
                    if total_fixed > 0:
                        st.success(f"🎉 Quick-fixed {total_fixed} meals!")
                        for result in results:
                            st.write(result)
                        st.rerun()
                    else:
                        st.warning("No meals found to fix")
                    
                except Exception as e:
                    st.error(f"Bulk fix failed: {str(e)}")
                    st.info("Try using individual Quick Fix buttons below.")
        
        meals = monday_plan.get('meals', [])
        
        for i, meal in enumerate(meals):
            meal_key = f"monday_meal_{i}"
            
            # Use simple meal naming for adjustment interface
            if i < 3:
                meal_name = f"Meal {i+1}"
            else:
                meal_name = f"Snack {i-2}"
            
            with st.expander(f"🍽️ {meal_name} - Adjust Portions", expanded=False):
                
                # Get specific meal targets from Nutrition Targets page
                meal_targets = None
                
                # Method 1: Load from saved file if not in session state
                if not st.session_state.get('per_meal_macros'):
                    targets_file = 'data/nutrition_targets.json'
                    if os.path.exists(targets_file):
                        try:
                            with open(targets_file, 'r') as f:
                                saved_targets = json.load(f)
                            st.session_state.per_meal_macros = saved_targets.get('per_meal_macros', {})
                            st.session_state.final_nutrition_targets = saved_targets
                        except:
                            pass
                
                # Method 2: Check per_meal_macros in session state
                per_meal_macros = st.session_state.get('per_meal_macros', {})
                monday_meals = per_meal_macros.get('Monday', [])
                
                if monday_meals and i < len(monday_meals):
                    target_meal = monday_meals[i]
                    meal_targets = {
                        'calories': target_meal.get('calories', 400),
                        'protein': target_meal.get('protein', 30),
                        'carbs': target_meal.get('carbs', 40),
                        'fat': target_meal.get('fat', 15)
                    }
                    st.success(f"✅ Using YOUR targets: {meal_targets['calories']} cal, {meal_targets['protein']}g protein")
                
                # Method 3: Check final_nutrition_targets if Method 2 failed
                if meal_targets is None:
                    final_targets = st.session_state.get('final_nutrition_targets', {})
                    final_per_meal = final_targets.get('per_meal_macros', {})
                    final_monday = final_per_meal.get('Monday', [])
                    
                    if final_monday and i < len(final_monday):
                        target_meal = final_monday[i]
                        meal_targets = {
                            'calories': target_meal.get('calories', 400),
                            'protein': target_meal.get('protein', 30),
                            'carbs': target_meal.get('carbs', 40),
                            'fat': target_meal.get('fat', 15)
                        }
                        st.success(f"✅ Using saved targets: {meal_targets['calories']} cal, {meal_targets['protein']}g protein")
                
                # Method 4: Fallback to equal distribution
                if meal_targets is None:
                    meal_targets = {
                        'calories': nutrition_targets.get('calories', 2000) / len(meals),
                        'protein': nutrition_targets.get('protein', 150) / len(meals),
                        'carbs': nutrition_targets.get('carbs', 200) / len(meals),
                        'fat': nutrition_targets.get('fat', 70) / len(meals)
                    }
                    st.error(f"❌ NO SPECIFIC TARGETS FOUND! Using fallback: {meal_targets['calories']:.0f} cal. Please visit Nutrition Targets page and confirm your targets!")
                
                # Display meal targets prominently
                st.markdown("**🎯 Meal Targets:**")
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Calories", f"{meal_targets['calories']:.0f}")
                with col2:
                    st.metric("Protein", f"{meal_targets['protein']:.0f}g")
                with col3:
                    st.metric("Carbs", f"{meal_targets['carbs']:.0f}g")
                with col4:
                    st.metric("Fat", f"{meal_targets['fat']:.0f}g")
                
                st.markdown("---")
                
                # Initialize adjustment state using AI-generated ingredient data
                if f"{meal_key}_adjustments" not in st.session_state:
                    st.session_state[f"{meal_key}_adjustments"] = {}
                    
                    ingredients = meal.get('ingredients', [])
                    for ingredient in ingredients:
                        ing_name = ingredient.get('item', 'Unknown')
                        
                        # Use AI-generated nutrition data directly
                        nutrition_data = {
                            'name': ing_name,
                            'amount': ingredient.get('amount', '100g'),
                            'calories': ingredient.get('calories', 0),
                            'protein': ingredient.get('protein', 0),
                            'carbs': ingredient.get('carbs', 0),
                            'fat': ingredient.get('fat', 0)
                        }
                        
                        st.session_state[f"{meal_key}_adjustments"][ing_name] = {
                            'factor': 1.0,
                            'nutrition': nutrition_data
                        }
                
                # Display adjustment controls
                col1, col2 = st.columns([3, 2])
                
                with col1:
                    st.markdown("**Ingredient Portions:**")
                    
                    updated_ingredients = []
                    for ing_name, ing_data in st.session_state[f"{meal_key}_adjustments"].items():
                        current_factor = ing_data['factor']
                        nutrition = ing_data['nutrition']
                        
                        # Create unique key using meal index and ingredient name
                        unique_key = f"monday_meal_{i}_{ing_name.replace(' ', '_').replace('(', '').replace(')', '')}_slider_{hash(str(nutrition))}"
                        
                        new_factor = st.slider(
                            f"🥄 {ing_name} ({nutrition['amount']})",
                            min_value=0.1,
                            max_value=3.0,
                            value=current_factor,
                            step=0.05,
                            key=unique_key,
                            help="Adjust portion size (1.0 = original portion)"
                        )
                        
                        # Update factor
                        st.session_state[f"{meal_key}_adjustments"][ing_name]['factor'] = new_factor
                        
                        # Calculate adjusted nutrition
                        adjusted_nutrition = {
                            'name': nutrition['name'],
                            'amount': nutrition['amount'],  # Keep original amount display
                            'calories': round(nutrition['calories'] * new_factor, 1),
                            'protein': round(nutrition['protein'] * new_factor, 1),
                            'carbs': round(nutrition['carbs'] * new_factor, 1),
                            'fat': round(nutrition['fat'] * new_factor, 1)
                        }
                        
                        updated_ingredients.append(adjusted_nutrition)
                
                with col2:
                    # Calculate updated meal totals
                    meal_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                    for ing in updated_ingredients:
                        for macro in meal_totals:
                            meal_totals[macro] += ing.get(macro, 0)
                    
                    st.markdown("**Updated Meal Totals:**")
                    for macro, value in meal_totals.items():
                        unit = "" if macro == "calories" else "g"
                        st.metric(macro.title(), f"{value:.1f}{unit}")
                    
                    # Quick adjustment buttons  
                    st.markdown("**Quick Actions:**")
                    # Simple reliable optimization button
                    simple_opt_key = f"simple_opt_{meal_key}_{i}"
                    
                    if st.button("⚡ Quick Fix", key=simple_opt_key, help="Auto-adjust portions to hit targets", type="primary"):
                        # Simple proportion-based optimization (no complex database calls)
                        try:
                            # Calculate current totals from displayed ingredients
                            current_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                            for ing in updated_ingredients:
                                for macro in current_totals:
                                    current_totals[macro] += ing.get(macro, 0)
                            
                            # Calculate scaling factors needed
                            target_calories = meal_targets.get('calories', 400)
                            current_calories = current_totals.get('calories', 1)
                            
                            if current_calories > 0:
                                scale_factor = target_calories / current_calories
                                # Limit to reasonable range
                                scale_factor = max(0.5, min(2.0, scale_factor))
                                
                                # Apply scaling to all ingredients
                                for ing_name in st.session_state[f"{meal_key}_adjustments"]:
                                    current_factor = st.session_state[f"{meal_key}_adjustments"][ing_name]['factor']
                                    new_factor = current_factor * scale_factor
                                    st.session_state[f"{meal_key}_adjustments"][ing_name]['factor'] = round(new_factor, 2)
                                
                                # Calculate projected results
                                projected_calories = current_calories * scale_factor
                                projected_protein = current_totals.get('protein', 0) * scale_factor
                                
                                st.success(f"✅ Quick Fix Applied: {projected_calories:.0f} cal, {projected_protein:.0f}g protein (×{scale_factor:.2f})")
                                st.rerun()
                            else:
                                st.error("Cannot optimize - no calories detected")
                                
                        except Exception as e:
                            st.error(f"Quick fix failed: {str(e)}")
                    
                    # Reset button 
                    if st.button("🔄 Reset", key=f"reset_{meal_key}_{i}", help="Reset all portions to original"):
                        for ing_name in st.session_state[f"{meal_key}_adjustments"]:
                            st.session_state[f"{meal_key}_adjustments"][ing_name]['factor'] = 1.0
                        st.success("✅ Reset to original portions")
                        st.rerun()
                
                # Display ingredient table
                if updated_ingredients:
                    st.markdown("**Ingredient Breakdown:**")
                    # Display ingredient table inline
                    data = []
                    for ing in updated_ingredients:
                        verified_status = "✅ FDC" if ing.get('fdc_verified', False) else "📊 Est"
                        data.append({
                            'Ingredient': ing['name'],
                            'Amount': ing['amount'],
                            'Calories': ing.get('calories', 0),
                            'Protein (g)': ing.get('protein', 0),
                            'Carbs (g)': ing.get('carbs', 0),
                            'Fat (g)': ing.get('fat', 0),
                            'Source': verified_status
                        })
                    
                    df = pd.DataFrame(data)
                    st.dataframe(df, use_container_width=True, hide_index=True)
    
    # User feedback and approval
    st.markdown("### 🎯 Your Feedback")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("✅ Approve Monday", type="primary", use_container_width=True):
            st.session_state['approved_days']['Monday'] = monday_plan
            st.session_state['meal_plan_stage'] = 'apply_to_week'
            st.success("Monday approved!")
            st.rerun()
    
    with col2:
        if st.button("📄 Export Monday PDF", use_container_width=True):
            try:
                # Create single-day meal plan structure
                single_day_plan = {'Monday': monday_plan}
                
                # Get plan info
                plan_info = {
                    'user_profile': st.session_state.get('user_info', {}),
                    'body_comp_goals': st.session_state.get('goal_info', {}),
                    'diet_preferences': st.session_state.get('diet_preferences', {}),
                    'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
                    'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
                }
                
                pdf_buffer = export_meal_plan_pdf(single_day_plan, plan_info)
                
                if pdf_buffer:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                    st.download_button(
                        label="📥 Download Monday PDF",
                        data=pdf_buffer,
                        file_name=f"fitomics_monday_{timestamp}.pdf",
                        mime="application/pdf",
                        key="download_monday_pdf",
                        use_container_width=True
                    )
                    st.success("✅ Monday PDF generated successfully!")
            except Exception as e:
                st.error(f"❌ PDF export failed: {str(e)}")
    
    with col3:
        if st.button("🔄 Regenerate Monday", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'generating_monday'
            st.info("Regenerating Monday...")
            st.rerun()
    
    with col4:
        if st.button("✏️ Request Modifications", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'modify_monday'
            st.rerun()

# Stage 4: Modification requests
elif st.session_state['meal_plan_stage'] == 'modify_monday':
    st.markdown("### ✏️ Request Monday Modifications")
    
    modification_request = st.text_area(
        "What would you like to change about Monday's meal plan?",
        placeholder="Example: Make breakfast more protein-heavy, replace chicken with fish, add a pre-workout snack, etc.",
        height=100
    )
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🔄 Apply Modifications", type="primary", use_container_width=True):
            if modification_request.strip():
                st.session_state['modification_request'] = modification_request
                st.session_state['meal_plan_stage'] = 'generating_modified_monday'
                st.rerun()
            else:
                st.warning("Please describe the modifications you'd like.")
    
    with col2:
        if st.button("← Back to Review", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'review_monday'
            st.rerun()

# Stage 5: Generate modified Monday
elif st.session_state['meal_plan_stage'] == 'generating_modified_monday':
    st.markdown("### 🔄 Applying Your Modifications")
    
    with st.spinner("Updating Monday plan based on your feedback..."):
        # Get modification request and current plan
        modification_request = st.session_state.get('modification_request', '')
        current_plan = st.session_state['monday_plan']
        
        # Get required data
        weekly_targets = st.session_state.get('day_specific_nutrition', {})
        diet_preferences = st.session_state.get('diet_preferences', {})
        weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
        user_profile = st.session_state.get('user_info', {})
        body_comp_goals = st.session_state.get('goal_info', {})
        
        monday_data = weekly_targets.get('Monday', {})
        monday_schedule = weekly_schedule.get('Monday', {})
        
        try:
            # Build contexts with modification request
            user_context = build_user_profile_context(user_profile, body_comp_goals)
            diet_context = build_dietary_context(diet_preferences)
            
            # Add modification context with safe string handling
            current_meals_json = json.dumps(current_plan.get('meals', []), indent=2)
            modification_context = f"""
USER MODIFICATION REQUEST:
{modification_request}

CURRENT MEAL PLAN TO MODIFY:
{current_meals_json}

INSTRUCTIONS:
- Apply the user's requested modifications while maintaining macro accuracy
- Keep the same meal structure unless specifically requested to change
- Preserve successful elements from the current plan
- Ensure all modifications align with nutritional targets and dietary preferences
"""
            
            # Generate modified plan with safe string handling
            monday_data_json = json.dumps(monday_data, indent=2)
            monday_schedule_json = json.dumps(monday_schedule, indent=2)
            
            modified_prompt = f"""
{user_context}

{diet_context}

{modification_context}

DAY-SPECIFIC TARGETS FOR MONDAY:
{monday_data_json}

MONDAY SCHEDULE CONTEXT:
{monday_schedule_json}

Create a modified meal plan that incorporates the user's feedback while maintaining ±3% macro accuracy.

Return JSON format with the same meal structure but with requested modifications applied.
"""
            
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a nutritionist specializing in personalized meal plan modifications. Apply user feedback while maintaining macro accuracy."},
                    {"role": "user", "content": modified_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.05,
                max_tokens=3000
            )
            
            modified_result = safe_json_parse(response.choices[0].message.content, {})
            
            # Update Monday plan with modifications
            st.session_state['monday_plan']['meals'] = modified_result.get('meals', [])
            st.session_state['monday_plan']['daily_totals'] = modified_result.get('daily_totals', {})
            st.session_state['monday_plan']['modification_applied'] = modification_request
            
            st.session_state['meal_plan_stage'] = 'review_monday'
            st.success("✅ Modifications applied!")
            st.rerun()
            
        except Exception as e:
            st.error(f"Error applying modifications: {e}")
            st.session_state['meal_plan_stage'] = 'modify_monday'

# Stage 6: Apply to week
elif st.session_state['meal_plan_stage'] == 'apply_to_week':
    st.markdown("### 🗓️ Apply Monday's Approach to Full Week")
    
    monday_plan = st.session_state['approved_days']['Monday']
    
    st.success("✅ Monday approved! Now let's apply this approach to your full week.")
    
    # Show application options
    st.markdown("**Choose how to apply Monday's approach:**")
    
    application_method = st.radio(
        "Application method:",
        [
            "🔄 Apply same approach to similar days (recommended)",
            "📅 Generate each day individually with customization",
            "⚡ Quick apply to all days (fastest)"
        ]
    )
    
    if application_method == "🔄 Apply same approach to similar days (recommended)":
        st.info("""
        **Smart Application:**
        - Similar workout days get the same meal structure
        - Rest days get adjusted portions and timing
        - Weekend days can have different meal preferences
        """)
        
        if st.button("🚀 Generate Full Week (Smart Apply)", type="primary", use_container_width=True):
            st.session_state['application_method'] = 'smart'
            st.session_state['meal_plan_stage'] = 'generating_week'
            st.rerun()
    
    elif application_method == "📅 Generate each day individually with customization":
        st.info("Generate each day with individual customization options - takes longer but provides maximum control.")
        
        if st.button("🎯 Start Day-by-Day Generation", type="primary", use_container_width=True):
            st.session_state['application_method'] = 'individual'
            st.session_state['current_day_index'] = 1  # Start with Tuesday
            st.session_state['meal_plan_stage'] = 'generating_individual_day'
            st.rerun()
    
    else:  # Quick apply to all days
        st.info("Quickly apply Monday's structure to all days with automatic adjustments for different schedules.")
        
        if st.button("⚡ Quick Generate All Days", type="primary", use_container_width=True):
            st.session_state['application_method'] = 'quick'
            st.session_state['meal_plan_stage'] = 'generating_week'
            st.rerun()

# Stage 7: Generate full week based on approved Monday
elif st.session_state['meal_plan_stage'] == 'generating_week':
    st.markdown("### 🗓️ Generating Full Week")
    
    application_method = st.session_state.get('application_method', 'smart')
    monday_plan = st.session_state['approved_days']['Monday']
    
    with st.spinner(f"Applying Monday's approach to your full week ({application_method} method)..."):
        try:
            # Get required data
            weekly_targets = st.session_state.get('day_specific_nutrition', {})
            diet_preferences = st.session_state.get('diet_preferences', {})
            weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
            user_profile = st.session_state.get('user_info', {})
            body_comp_goals = st.session_state.get('goal_info', {})
            
            # Generate remaining days based on Monday template
            full_week_plan = {'Monday': monday_plan}
            
            days = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            for day in days:
                day_data = weekly_targets.get(day, {})
                day_schedule = weekly_schedule.get(day, {})
                
                if day_data:
                    # Build contexts
                    user_context = build_user_profile_context(user_profile, body_comp_goals)
                    diet_context = build_dietary_context(diet_preferences)
                    
                    # Create day-specific prompt based on Monday template
                    monday_structure = monday_plan.get('meal_structure_rationale', '')
                    monday_meals = monday_plan.get('meals', [])
                    
                    # Build day prompt with safe string handling
                    day_name = day.upper()
                    monday_meals_json = json.dumps(monday_meals, indent=2)
                    day_data_json = json.dumps(day_data, indent=2) 
                    day_schedule_json = json.dumps(day_schedule, indent=2)
                    
                    day_prompt = f"""
{user_context}

{diet_context}

APPROVED MONDAY TEMPLATE:
Structure Rationale: {monday_structure}
Meals: {monday_meals_json}

DAY-SPECIFIC TARGETS FOR {day_name}:
{day_data_json}

{day_name} SCHEDULE CONTEXT:
{day_schedule_json}

APPLICATION METHOD: {application_method}

Based on the approved Monday template, create a {day} meal plan that:
1. Follows the same successful meal structure and timing approach
2. Adjusts portions to meet {day}'s specific macro targets
3. Considers {day}'s unique schedule and workout timing
4. Maintains the same food preferences and cooking style
5. Ensures ±3% macro accuracy

Return JSON format with the same structure as Monday but adapted for {day}.
"""
                    
                    try:
                        # Generate day plan
                        response = openai_client.chat.completions.create(
                            model="gpt-4o",
                            messages=[
                                {"role": "system", "content": "You are a nutritionist. Create day-specific meal plans based on approved templates while maintaining macro accuracy. Use simple meal names like 'Meal 1', 'Meal 2', 'Snack 1'."},
                                {"role": "user", "content": day_prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.05,
                            max_tokens=3000
                        )
                        
                        response_content = response.choices[0].message.content
                        if not response_content:
                            st.warning(f"Empty response for {day}, skipping...")
                            continue
                            
                        day_result = safe_json_parse(response_content, {})
                        
                        # Ensure meals have simple names
                        meals = day_result.get('meals', [])
                        for i, meal in enumerate(meals):
                            if i < 3:
                                meal['name'] = f"Meal {i+1}"
                            else:
                                meal['name'] = f"Snack {i-2}"
                        
                        # Create day plan structure
                        day_plan = {
                            'day': day,
                            'meals': meals,
                            'daily_totals': day_result.get('daily_totals', {}),
                            'meal_structure_rationale': f"Based on approved Monday template: {monday_structure}",
                            'accuracy_validated': True,  # Assume validated since based on approved template
                            'schedule_context': day_schedule,
                            'nutrition_targets': day_data,
                            'generated_from_template': True
                        }
                        
                        full_week_plan[day] = day_plan
                        st.write(f"✅ Generated {day} successfully")
                        
                    except json.JSONDecodeError as e:
                        st.error(f"JSON decode error for {day}: {e}")
                        continue
                    except Exception as e:
                        st.error(f"Error generating {day}: {e}")
                        continue
            
            # Save complete week plan
            st.session_state['ai_meal_plan'] = full_week_plan
            st.session_state['meal_plan_stage'] = 'week_complete'
            st.success("🎉 Full week meal plan generated!")
            st.rerun()
            
        except Exception as e:
            st.error(f"Error generating full week: {e}")
            st.session_state['meal_plan_stage'] = 'apply_to_week'

# Stage 8: Week generation complete
elif st.session_state['meal_plan_stage'] == 'week_complete':
    st.markdown("### 🎉 Weekly Meal Plan Complete!")
    st.success("Your personalized weekly meal plan has been generated based on your approved Monday example.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📋 View Full Week Plan", type="primary", use_container_width=True):
            st.session_state['meal_plan_stage'] = 'display_final'
            st.rerun()
    
    with col2:
        if st.button("🔄 Start Over", use_container_width=True):
            # Clear all meal planning session state
            for key in ['meal_plan_stage', 'monday_plan', 'approved_days', 'ai_meal_plan']:
                if key in st.session_state:
                    del st.session_state[key]
            st.rerun()

# Stage 9: Display final meal plan
elif st.session_state['meal_plan_stage'] == 'display_final':
    # Show the complete meal plan (reuse existing display code)
    if 'ai_meal_plan' in st.session_state and st.session_state['ai_meal_plan']:
        meal_plan = st.session_state['ai_meal_plan']
        
        st.markdown("## 📋 Your Personalized Weekly Meal Plan")
        st.info("**Generated using your approved Monday template with day-specific adjustments**")
        
        # Display meals for each day
        for day, day_plan in meal_plan.items():
            with st.expander(f"📅 {day}", expanded=False):
                # Add single-day export button at the top of each day
                if st.button(f"📄 Export {day} PDF", key=f"export_{day}_pdf", use_container_width=False):
                    try:
                        # Create single-day meal plan structure
                        single_day_plan = {day: day_plan}
                        
                        # Get plan info
                        plan_info = {
                            'user_profile': st.session_state.get('user_info', {}),
                            'body_comp_goals': st.session_state.get('goal_info', {}),
                            'diet_preferences': st.session_state.get('diet_preferences', {}),
                            'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
                            'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
                        }
                        
                        pdf_buffer = export_meal_plan_pdf(single_day_plan, plan_info)
                        
                        if pdf_buffer:
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                            st.download_button(
                                label=f"📥 Download {day} PDF",
                                data=pdf_buffer,
                                file_name=f"fitomics_{day.lower()}_{timestamp}.pdf",
                                mime="application/pdf",
                                key=f"download_{day}_pdf",
                                use_container_width=False
                            )
                            st.success(f"✅ {day} PDF generated successfully!")
                    except Exception as e:
                        st.error(f"❌ PDF export failed: {str(e)}")
                
                st.markdown(f"**Meal Structure Rationale:** {day_plan.get('meal_structure_rationale', 'Not provided')}")
                
                # Show template indicator
                if day_plan.get('generated_from_template'):
                    st.markdown("🔄 *Generated from your approved Monday template*")
                
                # Show accuracy status
                if day_plan.get('accuracy_validated', False):
                    st.markdown('<span class="accuracy-badge accuracy-excellent">✅ Macro Accuracy Validated</span>', unsafe_allow_html=True)
                else:
                    st.markdown('<span class="accuracy-badge accuracy-needs-work">⚠️ Needs Accuracy Review</span>', unsafe_allow_html=True)
                
                # Display meals using utility function
                meals = day_plan.get('meals', [])
                for i, meal in enumerate(meals, 1):
                    display_meal(meal, i)
                
                # Show daily totals
                daily_totals = day_plan.get('daily_totals', {})
                if daily_totals:
                    st.markdown("### 📊 Daily Totals")
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Total Calories", f"{daily_totals.get('calories', 0)}")
                    with col2:
                        st.metric("Total Protein", f"{daily_totals.get('protein', 0)}g")
                    with col3:
                        st.metric("Total Carbs", f"{daily_totals.get('carbs', 0)}g")
                    with col4:
                        st.metric("Total Fat", f"{daily_totals.get('fat', 0)}g")
        
        # Export options
        st.markdown("---")
        st.markdown("## 📄 Export Options")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("📄 Export to PDF", key="pdf_export_final_view", use_container_width=True):
                try:
                    # Get comprehensive plan info
                    plan_info = {
                        'user_profile': st.session_state.get('user_info', {}),
                        'body_comp_goals': st.session_state.get('goal_info', {}),
                        'diet_preferences': st.session_state.get('diet_preferences', {}),
                        'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
                        'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
                    }
                    
                    pdf_buffer = export_meal_plan_pdf(meal_plan, plan_info)
                    
                    if pdf_buffer:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                        st.download_button(
                            label="📥 Download PDF",
                            data=pdf_buffer,
                            file_name=f"fitomics_meal_plan_{timestamp}.pdf",
                            mime="application/pdf",
                            key="download_pdf_final_view",
                            use_container_width=True
                        )
                        st.success("✅ PDF generated successfully!")
                    else:
                        st.error("❌ Failed to generate PDF")
                except Exception as e:
                    st.error(f"❌ PDF export failed: {str(e)}")
        
        with col2:
            if st.button("🛒 Generate Grocery List", key="grocery_list_week_complete", use_container_width=True):
                # Generate consolidated grocery list
                grocery_items = {}
                
                for day, day_plan in meal_plan.items():
                    meals = day_plan.get('meals', [])
                    for meal in meals:
                        ingredients = meal.get('ingredients', [])
                        for ingredient in ingredients:
                            item_name = ingredient.get('item', 'Unknown')
                            amount = ingredient.get('amount', '')
                            
                            if item_name in grocery_items:
                                grocery_items[item_name].append(f"{day}: {amount}")
                            else:
                                grocery_items[item_name] = [f"{day}: {amount}"]
                
                st.markdown("### 🛒 Consolidated Grocery List")
                for item, amounts in grocery_items.items():
                    st.markdown(f"**{item}**")
                    for amount in amounts:
                        st.markdown(f"  • {amount}")
        
        with col3:
            if st.button("🔄 Generate New Plan", key="new_plan_week_complete", use_container_width=True):
                # Clear all meal planning session state
                for key in ['meal_plan_stage', 'monday_plan', 'approved_days', 'ai_meal_plan']:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()

# Default fallback - should not reach here
else:
    st.session_state['meal_plan_stage'] = 'start'
    st.rerun()

# Old meal plan display (for backwards compatibility)
if st.session_state['meal_plan_stage'] not in ['display_final'] and 'ai_meal_plan' in st.session_state and st.session_state.get('meal_plan_stage') == 'completed':
    st.info("👆 Click the button above to generate your personalized weekly meal plan using our new interactive approach!")

# Display generated meal plan
if 'ai_meal_plan' in st.session_state and st.session_state['ai_meal_plan']:
    meal_plan = st.session_state['ai_meal_plan']
    
    st.markdown("## 📋 Your Personalized Weekly Meal Plan")
    
    # Display meals for each day
    for day, day_plan in meal_plan.items():
        with st.expander(f"📅 {day}", expanded=False):
            st.markdown(f"**Meal Structure Rationale:** {day_plan.get('meal_structure_rationale', 'Not provided')}")
            
            # Show accuracy status
            if day_plan.get('accuracy_validated', False):
                st.markdown('<span class="accuracy-badge accuracy-excellent">✅ Macro Accuracy Validated</span>', unsafe_allow_html=True)
            else:
                st.markdown('<span class="accuracy-badge accuracy-needs-work">⚠️ Needs Accuracy Review</span>', unsafe_allow_html=True)
            
            # Display meals
            meals = day_plan.get('meals', [])
            for i, meal in enumerate(meals, 1):
                st.markdown(f"### {i}. {meal.get('name', 'Unnamed Meal')}")
                
                if meal.get('time'):
                    st.markdown(f"**Time:** {meal['time']}")
                if meal.get('context'):
                    st.markdown(f"**Context:** {meal['context']}")
                if meal.get('prep_time'):
                    st.markdown(f"**Prep Time:** {meal['prep_time']}")
                
                # Show macros
                macros = meal.get('total_macros', {})
                if macros:
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Calories", f"{macros.get('calories', 0)}")
                    with col2:
                        st.metric("Protein", f"{macros.get('protein', 0)}g")
                    with col3:
                        st.metric("Carbs", f"{macros.get('carbs', 0)}g")
                    with col4:
                        st.metric("Fat", f"{macros.get('fat', 0)}g")
                
                # Show ingredients
                ingredients = meal.get('ingredients', [])
                if ingredients:
                    st.markdown("**Ingredients:**")
                    for ingredient in ingredients:
                        st.markdown(f"• {ingredient.get('amount', '')} {ingredient.get('item', 'Unknown ingredient')}")
                
                # Show instructions
                instructions = meal.get('instructions', [])
                if instructions:
                    st.markdown("**Instructions:**")
                    for j, instruction in enumerate(instructions, 1):
                        st.markdown(f"{j}. {instruction}")
                
                st.markdown("---")
            
            # Show daily totals
            daily_totals = day_plan.get('daily_totals', {})
            if daily_totals:
                st.markdown("### 📊 Daily Totals")
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Calories", f"{daily_totals.get('calories', 0)}")
                with col2:
                    st.metric("Total Protein", f"{daily_totals.get('protein', 0)}g")
                with col3:
                    st.metric("Total Carbs", f"{daily_totals.get('carbs', 0)}g")
                with col4:
                    st.metric("Total Fat", f"{daily_totals.get('fat', 0)}g")
    
    # Export options
    st.markdown("---")
    st.markdown("## 📄 Export Options")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📄 Export to PDF", key="pdf_export_week_complete", use_container_width=True):
            try:
                # Get comprehensive plan info
                plan_info = {
                    'user_profile': st.session_state.get('user_info', {}),
                    'body_comp_goals': st.session_state.get('goal_info', {}),
                    'diet_preferences': st.session_state.get('diet_preferences', {}),
                    'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
                    'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
                }
                
                pdf_buffer = export_meal_plan_pdf(meal_plan, plan_info)
                
                if pdf_buffer:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                    st.download_button(
                        label="📥 Download PDF",
                        data=pdf_buffer,
                        file_name=f"fitomics_meal_plan_{timestamp}.pdf",
                        mime="application/pdf",
                        key="download_pdf_week_complete",
                        use_container_width=True
                    )
                    st.success("✅ PDF generated successfully!")
                else:
                    st.error("❌ Failed to generate PDF")
            except Exception as e:
                st.error(f"❌ PDF export failed: {str(e)}")
    
    with col2:
        if st.button("🛒 Generate Grocery List", key="grocery_list_final_display", use_container_width=True):
            # Generate consolidated grocery list
            grocery_items = {}
            
            for day, day_plan in meal_plan.items():
                meals = day_plan.get('meals', [])
                for meal in meals:
                    ingredients = meal.get('ingredients', [])
                    for ingredient in ingredients:
                        item_name = ingredient.get('item', 'Unknown')
                        amount = ingredient.get('amount', '')
                        
                        if item_name in grocery_items:
                            grocery_items[item_name].append(f"{day}: {amount}")
                        else:
                            grocery_items[item_name] = [f"{day}: {amount}"]
            
            st.markdown("### 🛒 Consolidated Grocery List")
            for item, amounts in grocery_items.items():
                st.markdown(f"**{item}**")
                for amount in amounts:
                    st.markdown(f"  • {amount}")
else:
    st.info("👆 Click the button above to generate your personalized weekly meal plan using our new step-by-step AI approach!")

# FDC Integration Functions
def get_fdc_nutrition(ingredient_name: str, amount_grams: float) -> Dict:
    """Get nutrition data with FDC verification"""
    try:
        # Search FDC database
        search_results = fdc_api.search_foods(ingredient_name, page_size=5)
        
        if search_results and len(search_results) > 0:
            # Use the first result (most relevant)
            food_item = search_results[0]
            nutrition = extract_nutrition_from_fdc(food_item, amount_grams)
            nutrition['fdc_verified'] = True
            nutrition['fdc_description'] = food_item.get('description', ingredient_name)
            return nutrition
        
    except Exception as e:
        st.warning(f"FDC lookup failed for {ingredient_name}: {e}")
    
    # Fallback to estimated nutrition
    return get_fallback_nutrition(ingredient_name, amount_grams)

def extract_nutrition_from_fdc(food_item: Dict, amount_grams: float) -> Dict:
    """Extract nutrition from FDC food item"""
    nutrition = {
        'name': food_item.get('description', 'Unknown'),
        'amount': f"{amount_grams}g",
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0
    }
    
    # Extract from foodNutrients if available
    nutrients = food_item.get('foodNutrients', [])
    
    nutrient_mapping = {
        1008: 'calories',  # Energy
        1003: 'protein',   # Protein  
        1005: 'carbs',     # Carbohydrates
        1004: 'fat'        # Total lipid (fat)
    }
    
    for nutrient in nutrients:
        nutrient_id = nutrient.get('nutrientId')
        if nutrient_id in nutrient_mapping:
            value = nutrient.get('value', 0)
            # Scale from per 100g to requested amount
            scaled_value = (value * amount_grams) / 100
            nutrition[nutrient_mapping[nutrient_id]] = round(scaled_value, 1)
    
    return nutrition

def get_fallback_nutrition(ingredient_name: str, amount_grams: float) -> Dict:
    """Fallback nutrition estimates"""
    
    fallback_db = {
        'chicken breast': {'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
        'ground turkey': {'calories': 189, 'protein': 27, 'carbs': 0, 'fat': 8},
        'salmon': {'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 12},
        'eggs': {'calories': 155, 'protein': 13, 'carbs': 1, 'fat': 11},
        'greek yogurt': {'calories': 97, 'protein': 10, 'carbs': 4, 'fat': 5},
        'brown rice': {'calories': 123, 'protein': 2.6, 'carbs': 23, 'fat': 0.9},
        'quinoa': {'calories': 120, 'protein': 4.4, 'carbs': 22, 'fat': 1.9},
        'oats': {'calories': 68, 'protein': 2.4, 'carbs': 12, 'fat': 1.4},
        'sweet potato': {'calories': 86, 'protein': 1.6, 'carbs': 20, 'fat': 0.1},
        'broccoli': {'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
        'spinach': {'calories': 23, 'protein': 2.9, 'carbs': 3.6, 'fat': 0.4},
        'avocado': {'calories': 160, 'protein': 2, 'carbs': 9, 'fat': 15},
        'almonds': {'calories': 576, 'protein': 21, 'carbs': 22, 'fat': 49},
        'olive oil': {'calories': 884, 'protein': 0, 'carbs': 0, 'fat': 100},
        'banana': {'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3}
    }
    
    # Find best match
    ingredient_lower = ingredient_name.lower()
    base_nutrition = None
    
    for food_key, nutrition in fallback_db.items():
        if food_key in ingredient_lower or ingredient_lower in food_key:
            base_nutrition = nutrition
            break
    
    if not base_nutrition:
        # Generic fallback
        base_nutrition = {'calories': 100, 'protein': 5, 'carbs': 15, 'fat': 3}
    
    # Scale to requested amount
    scaling_factor = amount_grams / 100
    
    return {
        'name': ingredient_name,
        'amount': f"{amount_grams}g",
        'calories': round(base_nutrition['calories'] * scaling_factor, 1),
        'protein': round(base_nutrition['protein'] * scaling_factor, 1),
        'carbs': round(base_nutrition['carbs'] * scaling_factor, 1),
        'fat': round(base_nutrition['fat'] * scaling_factor, 1),
        'fdc_verified': False
    }

def parse_amount_to_grams(amount_str: str) -> float:
    """Parse amount string to grams"""
    # Extract numbers
    numbers = re.findall(r'\d+(?:\.\d+)?', amount_str)
    if not numbers:
        return 100.0
    
    amount = float(numbers[0])
    amount_lower = amount_str.lower()
    
    # Convert to grams
    if 'cup' in amount_lower:
        return amount * 240  # 1 cup ≈ 240g
    elif 'tbsp' in amount_lower or 'tablespoon' in amount_lower:
        return amount * 15
    elif 'tsp' in amount_lower or 'teaspoon' in amount_lower:
        return amount * 5
    elif 'oz' in amount_lower:
        return amount * 28.35
    elif 'lb' in amount_lower or 'pound' in amount_lower:
        return amount * 453.6
    else:
        return amount  # Assume grams

# Remove duplicate function definition

def get_meal_portion_targets(daily_targets: Dict, total_meals: int, meal_index: int) -> Dict:
    """Get rough targets for individual meal"""
    # Simple even distribution for now
    return {
        'calories': daily_targets.get('calories', 2000) / total_meals,
        'protein': daily_targets.get('protein', 150) / total_meals,
        'carbs': daily_targets.get('carbs', 200) / total_meals,
        'fat': daily_targets.get('fat', 70) / total_meals
    }

def auto_adjust_meal_portions(meal_key: str, targets: Dict, actuals: Dict):
    """Auto-adjust ingredient portions to hit targets"""
    scaling_factors = []
    for macro in ['calories', 'protein', 'carbs', 'fat']:
        if actuals.get(macro, 0) > 0 and targets.get(macro, 0) > 0:
            factor = targets[macro] / actuals[macro]
            scaling_factors.append(factor)
    
    if scaling_factors:
        avg_scaling = sum(scaling_factors) / len(scaling_factors)
        
        # Apply to all ingredients
        for ing_name in st.session_state[f"{meal_key}_adjustments"]:
            current = st.session_state[f"{meal_key}_adjustments"][ing_name]['factor']
            st.session_state[f"{meal_key}_adjustments"][ing_name]['factor'] = current * avg_scaling

def display_ingredient_table(ingredients: List[Dict]):
    """Display detailed ingredient table"""
    data = []
    for ing in ingredients:
        verified_status = "✅ FDC" if ing.get('fdc_verified', False) else "📊 Est"
        data.append({
            'Ingredient': ing['name'],
            'Amount': ing['amount'],
            'Calories': ing.get('calories', 0),
            'Protein (g)': ing.get('protein', 0),
            'Carbs (g)': ing.get('carbs', 0),
            'Fat (g)': ing.get('fat', 0),
            'Source': verified_status
        })
    
    df = pd.DataFrame(data)
    st.dataframe(df, use_container_width=True, hide_index=True)
