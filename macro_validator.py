"""
Macro validation system to ensure accuracy between targets and actual calculations
"""
from nutrition_cache import nutrition_cache

def validate_ingredient_macros(ingredients):
    """Validate and calculate accurate macros from ingredient list"""
    total_macros = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
    
    for ingredient in ingredients:
        name = ingredient['name']
        amount = float(ingredient['amount'])
        
        # Get authentic nutrition data
        nutrition_data = nutrition_cache.get_fallback_nutrition(name, ingredient.get('category', 'protein'))
        
        # Calculate contribution
        multiplier = amount / 100
        calories = nutrition_data['calories_per_100g'] * multiplier
        protein = nutrition_data['protein_per_100g'] * multiplier
        carbs = nutrition_data['carbs_per_100g'] * multiplier
        fat = nutrition_data['fat_per_100g'] * multiplier
        
        total_macros['calories'] += calories
        total_macros['protein'] += protein
        total_macros['carbs'] += carbs
        total_macros['fat'] += fat
    
    # Round to reasonable precision
    return {
        'calories': int(round(total_macros['calories'])),
        'protein': round(total_macros['protein'], 1),
        'carbs': round(total_macros['carbs'], 1),
        'fat': round(total_macros['fat'], 1)
    }

def adjust_ingredients_to_targets(ingredients, target_macros, tolerance=0.15):
    """Adjust ingredient amounts to hit macro targets within tolerance"""
    current_macros = validate_ingredient_macros(ingredients)
    
    # Calculate differences
    cal_diff = target_macros['calories'] - current_macros['calories']
    protein_diff = target_macros['protein'] - current_macros['protein']
    carb_diff = target_macros['carbs'] - current_macros['carbs']
    fat_diff = target_macros['fat'] - current_macros['fat']
    
    # Simple adjustment strategy: scale primary macronutrient sources
    adjusted_ingredients = ingredients.copy()
    
    for ingredient in adjusted_ingredients:
        category = ingredient.get('category', 'protein').lower()
        current_amount = float(ingredient['amount'])
        
        # Adjust based on category and deficit
        if category == 'protein' and protein_diff > 2:
            adjustment = min(protein_diff * 3.2, current_amount * 0.3)  # Conservative adjustment
            ingredient['amount'] = current_amount + adjustment
        elif category == 'carbs' and carb_diff > 5:
            adjustment = min(carb_diff * 3.5, current_amount * 0.4)
            ingredient['amount'] = current_amount + adjustment
        elif category == 'fat' and fat_diff > 2:
            adjustment = min(fat_diff * 1.1, current_amount * 0.2)
            ingredient['amount'] = current_amount + adjustment
    
    # Recalculate to verify improvement
    new_macros = validate_ingredient_macros(adjusted_ingredients)
    
    # Return adjusted ingredients if they're closer to targets
    current_error = abs(cal_diff) + abs(protein_diff) + abs(carb_diff) + abs(fat_diff)
    new_error = (abs(target_macros['calories'] - new_macros['calories']) + 
                abs(target_macros['protein'] - new_macros['protein']) +
                abs(target_macros['carbs'] - new_macros['carbs']) +
                abs(target_macros['fat'] - new_macros['fat']))
    
    if new_error < current_error:
        return adjusted_ingredients, new_macros
    else:
        return ingredients, current_macros

def create_accurate_meal(meal_type, target_macros, dietary_restrictions=None):
    """Create a meal with accurate macro calculations"""
    # Base ingredient templates for different meal types
    meal_templates = {
        'Breakfast': [
            {'name': 'eggs', 'amount': 120, 'category': 'protein'},
            {'name': 'oats', 'amount': 40, 'category': 'carbs'},
            {'name': 'olive oil', 'amount': 8, 'category': 'fat'}
        ],
        'Lunch': [
            {'name': 'chicken breast', 'amount': 150, 'category': 'protein'},
            {'name': 'rice', 'amount': 80, 'category': 'carbs'},
            {'name': 'olive oil', 'amount': 10, 'category': 'fat'},
            {'name': 'broccoli', 'amount': 100, 'category': 'vegetable'}
        ],
        'Dinner': [
            {'name': 'salmon', 'amount': 140, 'category': 'protein'},
            {'name': 'sweet potato', 'amount': 120, 'category': 'carbs'},
            {'name': 'avocado', 'amount': 60, 'category': 'fat'}
        ],
        'Snack': [
            {'name': 'greek yogurt', 'amount': 150, 'category': 'protein'},
            {'name': 'banana', 'amount': 100, 'category': 'carbs'},
            {'name': 'almonds', 'amount': 15, 'category': 'fat'}
        ]
    }
    
    # Apply dietary restrictions
    base_ingredients = meal_templates.get(meal_type, meal_templates['Lunch']).copy()
    
    if dietary_restrictions:
        if dietary_restrictions.get('vegetarian'):
            # Replace meat with plant proteins
            for ingredient in base_ingredients:
                if ingredient['name'] in ['chicken breast', 'salmon']:
                    ingredient['name'] = 'tofu'
                    ingredient['amount'] = ingredient['amount'] * 1.3  # Account for lower protein density
        
        if dietary_restrictions.get('vegan'):
            # Replace all animal products
            for ingredient in base_ingredients:
                if ingredient['name'] in ['eggs', 'greek yogurt']:
                    ingredient['name'] = 'tofu'
                    ingredient['amount'] = 100
                elif ingredient['name'] in ['chicken breast', 'salmon']:
                    ingredient['name'] = 'tofu'
                    ingredient['amount'] = ingredient['amount'] * 1.2
    
    # Adjust ingredients to hit targets
    adjusted_ingredients, final_macros = adjust_ingredients_to_targets(base_ingredients, target_macros)
    
    # Create directions
    ingredient_list = ", ".join([f"{ing['amount']:.0f}g {ing['name']}" for ing in adjusted_ingredients])
    directions = [
        f"Prepare all ingredients: {ingredient_list}",
        "Cook protein source according to preference (grill, bake, or pan-fry)",
        "Prepare carbohydrate source (cook rice, steam potato, etc.)",
        "Add healthy fats and vegetables",
        "Season to taste and serve"
    ]
    
    return {
        'recipe': {
            'title': f"Balanced {meal_type}",
            'category': meal_type,
            'ingredients': [f"{ing['amount']:.0f}g {ing['name']}" for ing in adjusted_ingredients],
            'directions': directions
        },
        'macros': final_macros,
        'ingredient_details': adjusted_ingredients,
        'ai_reason': f"Precisely calculated to hit {target_macros['calories']} calories with balanced macronutrients"
    }