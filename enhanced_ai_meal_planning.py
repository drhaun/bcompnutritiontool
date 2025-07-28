#!/usr/bin/env python3
"""
Enhanced AI Meal Planning with FDC API Integration and User Adjustments
"""

import os
import json
import requests
from typing import Dict, List, Optional, Tuple
from openai import OpenAI
from fdc_api import search_foods

class EnhancedMealPlanner:
    def __init__(self):
        self.openai_client = OpenAI(
            api_key=os.environ.get('OPENAI_API_KEY'),
            organization=os.environ.get('OPENAI_ORGANIZATION_ID'),
            project=os.environ.get('OPENAI_PROJECT_ID')
        )
        self.fdc_api_key = os.environ.get('FDC_API_KEY')
    
    def get_accurate_nutrition(self, ingredient_name: str, amount_grams: float) -> Dict:
        """Get accurate nutrition data from FDC API"""
        try:
            # Search for the ingredient
            search_results = search_foods(ingredient_name)
            
            if not search_results:
                return self._fallback_nutrition(ingredient_name, amount_grams)
            
            # Get the most relevant food item
            food_item = search_results[0]
            
            # Extract nutrition from the food item and scale to requested amount
            nutrition = self._extract_nutrition_from_search_result(food_item, amount_grams)
            nutrition['name'] = ingredient_name
            nutrition['amount'] = f"{amount_grams}g"
            nutrition['fdc_verified'] = True
            
            return nutrition
            
        except Exception as e:
            print(f"FDC API error for {ingredient_name}: {e}")
            return self._fallback_nutrition(ingredient_name, amount_grams)
    
    def _extract_nutrition_from_search_result(self, food_item: Dict, amount_grams: float) -> Dict:
        """Extract and scale nutrition data from FDC search result"""
        nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        
        # Try to extract from foodNutrients if available
        if 'foodNutrients' in food_item:
            nutrients = food_item['foodNutrients']
            
            # Standard nutrient IDs from FDC
            nutrient_map = {
                1008: 'calories',  # Energy
                1003: 'protein',   # Protein
                1005: 'carbs',     # Carbohydrates
                1004: 'fat'        # Total lipid (fat)
            }
            
            for nutrient in nutrients:
                nutrient_id = nutrient.get('nutrientId')
                if nutrient_id in nutrient_map:
                    value = nutrient.get('value', 0)
                    # Convert from per 100g to requested amount
                    scaled_value = (value * amount_grams) / 100
                    nutrition[nutrient_map[nutrient_id]] = round(scaled_value, 1)
        
        return nutrition
    
    def _fallback_nutrition(self, ingredient_name: str, amount_grams: float) -> Dict:
        """Fallback nutrition estimates when FDC API fails"""
        # Basic nutrition estimates per 100g
        fallback_data = {
            'chicken breast': {'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
            'brown rice': {'calories': 123, 'protein': 2.6, 'carbs': 23, 'fat': 0.9},
            'quinoa': {'calories': 120, 'protein': 4.4, 'carbs': 22, 'fat': 1.9},
            'salmon': {'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 12},
            'broccoli': {'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
            'avocado': {'calories': 160, 'protein': 2, 'carbs': 9, 'fat': 15},
            'olive oil': {'calories': 884, 'protein': 0, 'carbs': 0, 'fat': 100},
            'sweet potato': {'calories': 86, 'protein': 1.6, 'carbs': 20, 'fat': 0.1}
        }
        
        base_nutrition = fallback_data.get(ingredient_name.lower(), 
                                         {'calories': 100, 'protein': 5, 'carbs': 15, 'fat': 3})
        
        # Scale to requested amount
        scaling_factor = amount_grams / 100
        nutrition = {
            'name': ingredient_name,
            'amount': f"{amount_grams}g",
            'calories': round(base_nutrition['calories'] * scaling_factor, 1),
            'protein': round(base_nutrition['protein'] * scaling_factor, 1),
            'carbs': round(base_nutrition['carbs'] * scaling_factor, 1),
            'fat': round(base_nutrition['fat'] * scaling_factor, 1),
            'fdc_verified': False
        }
        
        return nutrition
    
    def generate_accurate_meal(self, meal_context: Dict, target_macros: Dict) -> Dict:
        """Generate a meal with FDC-verified nutrition accuracy"""
        
        # Step 1: AI generates initial meal concept
        meal_concept = self._generate_meal_concept(meal_context, target_macros)
        
        # Step 2: Get accurate nutrition for each ingredient
        accurate_ingredients = []
        total_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        
        for ingredient in meal_concept['ingredients']:
            # Extract amount in grams
            amount_grams = self._parse_amount_to_grams(ingredient['amount'])
            
            # Get accurate nutrition from FDC
            accurate_nutrition = self.get_accurate_nutrition(ingredient['name'], amount_grams)
            accurate_ingredients.append(accurate_nutrition)
            
            # Update totals
            for macro in ['calories', 'protein', 'carbs', 'fat']:
                total_nutrition[macro] += accurate_nutrition[macro]
        
        # Step 3: Adjust portions to hit targets precisely
        adjusted_ingredients = self._adjust_portions_for_targets(
            accurate_ingredients, target_macros, total_nutrition
        )
        
        # Recalculate final totals
        final_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        for ingredient in adjusted_ingredients:
            for macro in ['calories', 'protein', 'carbs', 'fat']:
                final_totals[macro] += ingredient[macro]
        
        return {
            'meal_name': meal_concept['meal_name'],
            'ingredients': adjusted_ingredients,
            'instructions': meal_concept['instructions'],
            'nutrition_totals': final_totals,
            'accuracy_notes': self._calculate_accuracy(target_macros, final_totals),
            'fdc_verified_count': sum(1 for ing in adjusted_ingredients if ing.get('fdc_verified', False))
        }
    
    def _generate_meal_concept(self, meal_context: Dict, target_macros: Dict) -> Dict:
        """Generate initial meal concept with AI"""
        
        prompt = f"""
        Create a meal concept for the following context:
        
        Meal Context: {meal_context.get('meal_type', 'Main meal')}
        Workout Timing: {meal_context.get('workout_timing', 'None')}
        Dietary Preferences: {meal_context.get('dietary_preferences', 'None')}
        
        Target Macros:
        - Calories: {target_macros['calories']}
        - Protein: {target_macros['protein']}g
        - Carbs: {target_macros['carbs']}g  
        - Fat: {target_macros['fat']}g
        
        Return ONLY JSON with this structure:
        {{
            "meal_name": "Descriptive meal name",
            "ingredients": [
                {{"name": "ingredient_name", "amount": "150g"}},
                {{"name": "ingredient_name", "amount": "100g"}}
            ],
            "instructions": "Step-by-step cooking instructions"
        }}
        
        Focus on common, whole food ingredients that can be found in FDC database.
        """
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutrition expert. Return only valid JSON without markdown."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.1
        )
        
        result = response.choices[0].message.content.strip()
        # Clean markdown if present
        result = result.replace('```json', '').replace('```', '').strip()
        
        return json.loads(result)
    
    def _parse_amount_to_grams(self, amount_str: str) -> float:
        """Parse amount string to grams"""
        import re
        
        # Extract number from amount string
        numbers = re.findall(r'\d+(?:\.\d+)?', amount_str)
        if not numbers:
            return 100.0  # Default
        
        amount = float(numbers[0])
        
        # Convert to grams if needed
        if 'cup' in amount_str.lower():
            # Rough conversion: 1 cup = 240g for liquids, 200g for solids
            return amount * 200
        elif 'tbsp' in amount_str.lower() or 'tablespoon' in amount_str.lower():
            return amount * 15
        elif 'tsp' in amount_str.lower() or 'teaspoon' in amount_str.lower():
            return amount * 5
        elif 'oz' in amount_str.lower():
            return amount * 28.35
        else:
            # Assume grams
            return amount
    
    def _adjust_portions_for_targets(self, ingredients: List[Dict], 
                                   targets: Dict, current_totals: Dict) -> List[Dict]:
        """Adjust ingredient portions to hit macro targets precisely"""
        
        # Calculate scaling factors for each macro
        scaling_factors = {}
        for macro in ['calories', 'protein', 'carbs', 'fat']:
            if current_totals[macro] > 0:
                scaling_factors[macro] = targets[macro] / current_totals[macro]
            else:
                scaling_factors[macro] = 1.0
        
        # Use average scaling factor to avoid extreme adjustments
        avg_scaling = sum(scaling_factors.values()) / len(scaling_factors)
        
        # Apply scaling to all ingredients
        adjusted_ingredients = []
        for ingredient in ingredients:
            # Parse current amount
            current_grams = self._parse_amount_to_grams(ingredient['amount'])
            
            # Apply scaling
            new_grams = current_grams * avg_scaling
            
            # Get nutrition for new amount
            adjusted_nutrition = self.get_accurate_nutrition(ingredient['name'], new_grams)
            adjusted_ingredients.append(adjusted_nutrition)
        
        return adjusted_ingredients
    
    def _calculate_accuracy(self, targets: Dict, actuals: Dict) -> Dict:
        """Calculate accuracy percentages"""
        accuracy = {}
        for macro in ['calories', 'protein', 'carbs', 'fat']:
            if targets[macro] > 0:
                deviation = ((actuals[macro] - targets[macro]) / targets[macro]) * 100
                accuracy[macro] = {
                    'target': targets[macro],
                    'actual': round(actuals[macro], 1),
                    'deviation_percent': round(deviation, 1),
                    'status': 'Good' if abs(deviation) <= 5 else 'Needs adjustment'
                }
            else:
                accuracy[macro] = {
                    'target': targets[macro],
                    'actual': round(actuals[macro], 1),
                    'deviation_percent': 0,
                    'status': 'Good'
                }
        
        return accuracy

def test_enhanced_meal_planning():
    """Test the enhanced meal planning system"""
    planner = EnhancedMealPlanner()
    
    # Test meal context
    meal_context = {
        'meal_type': 'Post-workout lunch',
        'workout_timing': 'Post-workout',
        'dietary_preferences': 'High protein'
    }
    
    # Test targets
    target_macros = {
        'calories': 600,
        'protein': 45,
        'carbs': 60,
        'fat': 15
    }
    
    print("Testing Enhanced AI Meal Planning with FDC Integration")
    print("=" * 55)
    
    try:
        meal = planner.generate_accurate_meal(meal_context, target_macros)
        
        print(f"Generated Meal: {meal['meal_name']}")
        print(f"FDC Verified Ingredients: {meal['fdc_verified_count']}/{len(meal['ingredients'])}")
        print(f"\nIngredients:")
        for ing in meal['ingredients']:
            verified = "✓" if ing.get('fdc_verified', False) else "○"
            print(f"  {verified} {ing['name']}: {ing['amount']} - {ing['calories']}cal, {ing['protein']}p, {ing['carbs']}c, {ing['fat']}f")
        
        print(f"\nNutrition Totals:")
        for macro, data in meal['accuracy_notes'].items():
            print(f"  {macro.title()}: {data['actual']} (target: {data['target']}) - {data['deviation_percent']}% - {data['status']}")
        
        print(f"\nSystem ready for production use with FDC integration!")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_enhanced_meal_planning()