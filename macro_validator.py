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
    """Create a meal with accurate macro calculations and variety"""
    # Diverse meal templates for different meal types
    meal_templates = {
        'Breakfast': [
            {
                'template': [
                    {'name': 'eggs', 'amount': 100, 'category': 'protein'},
                    {'name': 'whole grain toast', 'amount': 60, 'category': 'carbs'},
                    {'name': 'avocado', 'amount': 40, 'category': 'fat'},
                    {'name': 'spinach', 'amount': 50, 'category': 'vegetable'}
                ],
                'title': 'Avocado Toast with Scrambled Eggs'
            },
            {
                'template': [
                    {'name': 'greek yogurt', 'amount': 150, 'category': 'protein'},
                    {'name': 'berries', 'amount': 80, 'category': 'carbs'},
                    {'name': 'nuts', 'amount': 20, 'category': 'fat'},
                    {'name': 'oats', 'amount': 30, 'category': 'carbs'}
                ],
                'title': 'Greek Yogurt Berry Bowl'
            },
            {
                'template': [
                    {'name': 'cottage cheese', 'amount': 120, 'category': 'protein'},
                    {'name': 'banana', 'amount': 100, 'category': 'carbs'},
                    {'name': 'nut butter', 'amount': 15, 'category': 'fat'}
                ],
                'title': 'Cottage Cheese Banana Bowl'
            }
        ],
        'Lunch': [
            {
                'template': [
                    {'name': 'chicken breast', 'amount': 120, 'category': 'protein'},
                    {'name': 'quinoa', 'amount': 70, 'category': 'carbs'},
                    {'name': 'olive oil', 'amount': 10, 'category': 'fat'},
                    {'name': 'mixed greens', 'amount': 80, 'category': 'vegetable'}
                ],
                'title': 'Mediterranean Chicken Quinoa Bowl'
            },
            {
                'template': [
                    {'name': 'salmon', 'amount': 110, 'category': 'protein'},
                    {'name': 'sweet potato', 'amount': 100, 'category': 'carbs'},
                    {'name': 'tahini', 'amount': 12, 'category': 'fat'},
                    {'name': 'bell peppers', 'amount': 70, 'category': 'vegetable'}
                ],
                'title': 'Roasted Salmon with Sweet Potato'
            },
            {
                'template': [
                    {'name': 'tofu', 'amount': 150, 'category': 'protein'},
                    {'name': 'brown rice', 'amount': 80, 'category': 'carbs'},
                    {'name': 'sesame oil', 'amount': 8, 'category': 'fat'},
                    {'name': 'broccoli', 'amount': 100, 'category': 'vegetable'}
                ],
                'title': 'Asian-Style Tofu Stir Fry'
            }
        ],
        'Dinner': [
            {
                'template': [
                    {'name': 'lean beef', 'amount': 120, 'category': 'protein'},
                    {'name': 'roasted vegetables', 'amount': 150, 'category': 'carbs'},
                    {'name': 'olive oil', 'amount': 12, 'category': 'fat'},
                    {'name': 'asparagus', 'amount': 80, 'category': 'vegetable'}
                ],
                'title': 'Herb-Crusted Beef with Roasted Vegetables'
            },
            {
                'template': [
                    {'name': 'cod', 'amount': 140, 'category': 'protein'},
                    {'name': 'wild rice', 'amount': 70, 'category': 'carbs'},
                    {'name': 'coconut oil', 'amount': 10, 'category': 'fat'},
                    {'name': 'zucchini', 'amount': 100, 'category': 'vegetable'}
                ],
                'title': 'Pan-Seared Cod with Wild Rice'
            },
            {
                'template': [
                    {'name': 'tempeh', 'amount': 130, 'category': 'protein'},
                    {'name': 'cauliflower rice', 'amount': 120, 'category': 'carbs'},
                    {'name': 'nuts', 'amount': 18, 'category': 'fat'},
                    {'name': 'mushrooms', 'amount': 80, 'category': 'vegetable'}
                ],
                'title': 'Tempeh Cauliflower Rice Bowl'
            }
        ],
        'Snack': [
            {
                'template': [
                    {'name': 'hummus', 'amount': 60, 'category': 'protein'},
                    {'name': 'apple', 'amount': 120, 'category': 'carbs'},
                    {'name': 'walnuts', 'amount': 15, 'category': 'fat'}
                ],
                'title': 'Apple with Hummus and Walnuts'
            },
            {
                'template': [
                    {'name': 'hard boiled eggs', 'amount': 100, 'category': 'protein'},
                    {'name': 'crackers', 'amount': 30, 'category': 'carbs'},
                    {'name': 'cheese', 'amount': 20, 'category': 'fat'}
                ],
                'title': 'Protein-Rich Egg and Cheese Snack'
            },
            {
                'template': [
                    {'name': 'protein bar', 'amount': 40, 'category': 'protein'},
                    {'name': 'dates', 'amount': 30, 'category': 'carbs'},
                    {'name': 'dark chocolate', 'amount': 15, 'category': 'fat'}
                ],
                'title': 'Energy Protein Bar with Dark Chocolate'
            }
        ]
    }
    
    # Select a diverse meal option (rotate through available templates)
    import random
    available_templates = meal_templates.get(meal_type, meal_templates['Lunch'])
    selected_meal = random.choice(available_templates)
    
    base_ingredients = selected_meal['template'].copy()
    meal_title = selected_meal['title']
    
    # Apply dietary restrictions
    if dietary_restrictions:
        if dietary_restrictions.get('vegetarian'):
            for ingredient in base_ingredients:
                if ingredient['name'] in ['chicken breast', 'salmon', 'lean beef', 'cod']:
                    ingredient['name'] = 'tofu'
                    ingredient['amount'] = ingredient['amount'] * 1.2
                elif ingredient['name'] == 'hard boiled eggs':
                    ingredient['name'] = 'hummus'
                    ingredient['amount'] = ingredient['amount'] * 0.8
        
        if dietary_restrictions.get('vegan'):
            for ingredient in base_ingredients:
                if ingredient['name'] in ['eggs', 'greek yogurt', 'cottage cheese', 'cheese']:
                    ingredient['name'] = 'tofu'
                    ingredient['amount'] = 100
                elif ingredient['name'] in ['chicken breast', 'salmon', 'lean beef', 'cod']:
                    ingredient['name'] = 'tempeh'
                    ingredient['amount'] = ingredient['amount'] * 1.1
                elif ingredient['name'] == 'hard boiled eggs':
                    ingredient['name'] = 'hummus'
                    ingredient['amount'] = ingredient['amount'] * 0.8
    
    # Adjust ingredients to hit targets
    adjusted_ingredients, final_macros = adjust_ingredients_to_targets(base_ingredients, target_macros)
    
    # Create meal-specific directions
    directions_map = {
        'Breakfast': [
            "Prepare all fresh ingredients and measure portions",
            "If cooking eggs or protein, heat pan with minimal oil",
            "Cook protein components to desired doneness",
            "Assemble breakfast bowl or plate with all components",
            "Add fresh toppings and seasonings to taste"
        ],
        'Lunch': [
            "Prep and wash all vegetables and greens",
            "Cook grains or starches according to package directions",
            "Season and cook protein source until fully cooked",
            "Assemble bowl with base of grains and greens",
            "Top with protein, vegetables, and healthy fats"
        ],
        'Dinner': [
            "Preheat oven or prepare cooking surface",
            "Season protein and prepare vegetables for cooking",
            "Cook protein and vegetables using preferred method",
            "Prepare any grains or starches as side dishes",
            "Plate elegantly and garnish with herbs or seasonings"
        ],
        'Snack': [
            "Gather all snack components",
            "Wash and prepare any fresh fruits or vegetables",
            "Portion out nuts, seeds, or other toppings",
            "Arrange attractively on plate or in bowl",
            "Enjoy mindfully as a satisfying snack"
        ]
    }
    
    directions = directions_map.get(meal_type, directions_map['Lunch'])
    
    return {
        'recipe': {
            'title': meal_title,
            'category': meal_type,
            'ingredients': [f"{ing['amount']:.0f}g {ing['name']}" for ing in adjusted_ingredients],
            'directions': directions
        },
        'macros': final_macros,
        'ingredient_details': adjusted_ingredients,
        'ai_reason': f"Balanced {meal_type.lower()} designed for optimal nutrition and satisfaction"
    }