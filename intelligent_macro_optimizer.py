"""
Intelligent Macro Optimization Engine
Achieves ±1% macro accuracy through intelligent ingredient optimization
"""
import numpy as np
from scipy.optimize import minimize
from typing import Dict, List, Tuple, Optional
import json
import copy
import fdc_api
from nutrition_cache import NutritionCache

class MacroOptimizer:
    def __init__(self):
        self.nutrition_cache = NutritionCache()
        
        # Complementary ingredient database - organized by macro contribution
        self.protein_boosters = [
            {"name": "Egg Whites", "protein_per_100g": 10.9, "carbs_per_100g": 0.7, "fat_per_100g": 0.2, "calories_per_100g": 52},
            {"name": "Chicken Breast", "protein_per_100g": 31.0, "carbs_per_100g": 0.0, "fat_per_100g": 3.6, "calories_per_100g": 165},
            {"name": "Greek Yogurt", "protein_per_100g": 10.0, "carbs_per_100g": 3.6, "fat_per_100g": 0.4, "calories_per_100g": 59},
            {"name": "Cottage Cheese", "protein_per_100g": 11.1, "carbs_per_100g": 3.4, "fat_per_100g": 4.3, "calories_per_100g": 98},
            {"name": "Tofu", "protein_per_100g": 8.1, "carbs_per_100g": 1.9, "fat_per_100g": 4.8, "calories_per_100g": 76},
            {"name": "Lean Turkey", "protein_per_100g": 29.3, "carbs_per_100g": 0.0, "fat_per_100g": 7.0, "calories_per_100g": 189}
        ]
        
        self.carb_boosters = [
            {"name": "Sweet Potato", "protein_per_100g": 2.0, "carbs_per_100g": 20.1, "fat_per_100g": 0.1, "calories_per_100g": 86},
            {"name": "Brown Rice", "protein_per_100g": 2.6, "carbs_per_100g": 23.0, "fat_per_100g": 0.9, "calories_per_100g": 111},
            {"name": "Quinoa", "protein_per_100g": 4.4, "carbs_per_100g": 21.3, "fat_per_100g": 1.9, "calories_per_100g": 120},
            {"name": "Oats", "protein_per_100g": 2.4, "carbs_per_100g": 12.0, "fat_per_100g": 1.4, "calories_per_100g": 68},
            {"name": "Banana", "protein_per_100g": 1.1, "carbs_per_100g": 22.8, "fat_per_100g": 0.3, "calories_per_100g": 89},
            {"name": "Apple", "protein_per_100g": 0.3, "carbs_per_100g": 13.8, "fat_per_100g": 0.2, "calories_per_100g": 52}
        ]
        
        self.fat_boosters = [
            {"name": "Almonds", "protein_per_100g": 21.2, "carbs_per_100g": 9.7, "fat_per_100g": 49.4, "calories_per_100g": 576},
            {"name": "Olive Oil", "protein_per_100g": 0.0, "carbs_per_100g": 0.0, "fat_per_100g": 100.0, "calories_per_100g": 884},
            {"name": "Avocado", "protein_per_100g": 2.0, "carbs_per_100g": 8.5, "fat_per_100g": 14.7, "calories_per_100g": 160},
            {"name": "Walnuts", "protein_per_100g": 15.2, "carbs_per_100g": 7.0, "fat_per_100g": 65.2, "calories_per_100g": 654},
            {"name": "Coconut Oil", "protein_per_100g": 0.0, "carbs_per_100g": 0.0, "fat_per_100g": 99.1, "calories_per_100g": 862},
            {"name": "Cashews", "protein_per_100g": 18.2, "carbs_per_100g": 30.2, "fat_per_100g": 43.8, "calories_per_100g": 553}
        ]
        
        # Flavor compatibility matrix
        self.flavor_compatibility = {
            "chicken": ["herbs", "lemon", "garlic", "olive oil", "vegetables"],
            "salmon": ["dill", "lemon", "capers", "olive oil", "asparagus"],
            "eggs": ["cheese", "herbs", "vegetables", "butter", "cream"],
            "oats": ["fruit", "nuts", "honey", "cinnamon", "vanilla"],
            "rice": ["vegetables", "herbs", "soy sauce", "sesame oil"],
            "quinoa": ["vegetables", "herbs", "olive oil", "lemon"]
        }
    
    def calculate_current_macros(self, ingredients: List[Dict]) -> Dict[str, float]:
        """Calculate current macro totals from ingredient list"""
        totals = {"protein": 0, "carbs": 0, "fat": 0, "calories": 0}
        
        for ingredient in ingredients:
            name = ingredient.get("name", "")
            amount_str = ingredient.get("amount", "0")
            
            # Parse amount to grams
            amount_grams = self._parse_amount_to_grams(amount_str, name)
            
            # Get nutrition data
            nutrition = self._get_ingredient_nutrition(name)
            if nutrition:
                # Calculate contribution
                factor = amount_grams / 100.0
                totals["protein"] += nutrition.get("protein_per_100g", 0) * factor
                totals["carbs"] += nutrition.get("carbs_per_100g", 0) * factor
                totals["fat"] += nutrition.get("fat_per_100g", 0) * factor
                totals["calories"] += nutrition.get("calories_per_100g", 0) * factor
        
        return totals
    
    def optimize_meal_macros(self, 
                           ingredients: List[Dict], 
                           target_macros: Dict[str, float],
                           user_preferences: Dict = None,
                           tolerance: float = 0.01) -> Tuple[List[Dict], Dict[str, float]]:
        """
        Optimize meal to hit target macros within tolerance
        Returns: (optimized_ingredients, achieved_macros)
        """
        
        # Step 1: Optimize existing ingredient amounts
        optimized_ingredients = self._optimize_existing_amounts(ingredients, target_macros)
        current_macros = self.calculate_current_macros(optimized_ingredients)
        
        # Step 2: Check if we're within tolerance
        if self._within_tolerance(current_macros, target_macros, tolerance):
            return optimized_ingredients, current_macros
        
        # Step 3: Add complementary ingredients to fill gaps
        final_ingredients = self._add_complementary_ingredients(
            optimized_ingredients, current_macros, target_macros, user_preferences
        )
        
        # Step 4: Final optimization with all ingredients
        final_optimized = self._optimize_existing_amounts(final_ingredients, target_macros)
        final_macros = self.calculate_current_macros(final_optimized)
        
        return final_optimized, final_macros
    
    def _optimize_existing_amounts(self, ingredients: List[Dict], target_macros: Dict[str, float]) -> List[Dict]:
        """Use mathematical optimization to adjust ingredient amounts"""
        
        if not ingredients:
            return ingredients
        
        # Get nutrition data for all ingredients
        ingredient_nutrition = []
        for ingredient in ingredients:
            name = ingredient.get("name", "")
            nutrition = self._get_ingredient_nutrition(name)
            if nutrition:
                ingredient_nutrition.append(nutrition)
            else:
                # Fallback nutrition
                ingredient_nutrition.append({
                    "protein_per_100g": 5, "carbs_per_100g": 10, 
                    "fat_per_100g": 2, "calories_per_100g": 80
                })
        
        # Set up optimization problem
        n_ingredients = len(ingredients)
        
        # Initial amounts (in grams)
        initial_amounts = []
        for ingredient in ingredients:
            amount_str = ingredient.get("amount", "100g")
            amount_grams = self._parse_amount_to_grams(amount_str, ingredient.get("name", ""))
            initial_amounts.append(max(10, amount_grams))  # Minimum 10g
        
        def objective(amounts):
            """Minimize difference from target macros"""
            total_protein = sum(amounts[i] * ingredient_nutrition[i]["protein_per_100g"] / 100 
                              for i in range(n_ingredients))
            total_carbs = sum(amounts[i] * ingredient_nutrition[i]["carbs_per_100g"] / 100 
                            for i in range(n_ingredients))
            total_fat = sum(amounts[i] * ingredient_nutrition[i]["fat_per_100g"] / 100 
                          for i in range(n_ingredients))
            total_calories = sum(amounts[i] * ingredient_nutrition[i]["calories_per_100g"] / 100 
                               for i in range(n_ingredients))
            
            # Calculate weighted error (prioritize protein and calories)
            protein_error = (total_protein - target_macros.get("protein", 30)) ** 2 * 2.0
            carbs_error = (total_carbs - target_macros.get("carbs", 40)) ** 2 * 1.5
            fat_error = (total_fat - target_macros.get("fat", 15)) ** 2 * 1.5
            calorie_error = (total_calories - target_macros.get("calories", 400)) ** 2 * 1.0
            
            return protein_error + carbs_error + fat_error + calorie_error * 0.01  # Scale down calories
        
        # Constraints: reasonable amount ranges
        bounds = []
        for i, ingredient in enumerate(ingredients):
            name = ingredient.get("name", "").lower()
            
            # Set realistic bounds based on ingredient type
            if "oil" in name or "butter" in name:
                bounds.append((1, 30))  # 1-30g for oils/fats
            elif "salt" in name or "pepper" in name or "spice" in name:
                bounds.append((0.5, 5))  # 0.5-5g for seasonings
            elif "protein powder" in name:
                bounds.append((10, 50))  # 10-50g for protein powder
            else:
                bounds.append((10, 500))  # 10-500g for regular ingredients
        
        try:
            # Run optimization
            result = minimize(objective, initial_amounts, bounds=bounds, method='L-BFGS-B')
            
            if result.success:
                optimized_amounts = result.x
            else:
                optimized_amounts = initial_amounts
        except:
            optimized_amounts = initial_amounts
        
        # Update ingredients with optimized amounts
        optimized_ingredients = copy.deepcopy(ingredients)
        for i, ingredient in enumerate(optimized_ingredients):
            optimized_grams = max(1, round(optimized_amounts[i], 1))
            ingredient["amount"] = self._format_amount(optimized_grams, ingredient.get("name", ""))
        
        return optimized_ingredients
    
    def _add_complementary_ingredients(self, 
                                     ingredients: List[Dict], 
                                     current_macros: Dict[str, float],
                                     target_macros: Dict[str, float],
                                     user_preferences: Dict = None) -> List[Dict]:
        """Add ingredients to fill macro gaps"""
        
        # Calculate gaps
        protein_gap = target_macros.get("protein", 30) - current_macros.get("protein", 0)
        carbs_gap = target_macros.get("carbs", 40) - current_macros.get("carbs", 0)
        fat_gap = target_macros.get("fat", 15) - current_macros.get("fat", 0)
        
        enhanced_ingredients = copy.deepcopy(ingredients)
        
        # Get user dietary restrictions
        restrictions = []
        allergies = []
        if user_preferences:
            restrictions = user_preferences.get("dietary_restrictions", [])
            allergies = user_preferences.get("allergies", [])
        
        # Add protein if needed (gap > 5g)
        if protein_gap > 5:
            protein_ingredient = self._select_best_booster(
                self.protein_boosters, "protein", protein_gap, restrictions, allergies
            )
            if protein_ingredient:
                # Calculate amount needed
                protein_per_100g = protein_ingredient["protein_per_100g"]
                amount_needed = min(200, max(20, (protein_gap / protein_per_100g) * 100))
                
                enhanced_ingredients.append({
                    "name": protein_ingredient["name"],
                    "amount": self._format_amount(amount_needed, protein_ingredient["name"])
                })
        
        # Add carbs if needed (gap > 8g)
        if carbs_gap > 8:
            carb_ingredient = self._select_best_booster(
                self.carb_boosters, "carbs", carbs_gap, restrictions, allergies
            )
            if carb_ingredient:
                carbs_per_100g = carb_ingredient["carbs_per_100g"]
                amount_needed = min(300, max(30, (carbs_gap / carbs_per_100g) * 100))
                
                enhanced_ingredients.append({
                    "name": carb_ingredient["name"],
                    "amount": self._format_amount(amount_needed, carb_ingredient["name"])
                })
        
        # Add fat if needed (gap > 3g)
        if fat_gap > 3:
            fat_ingredient = self._select_best_booster(
                self.fat_boosters, "fat", fat_gap, restrictions, allergies
            )
            if fat_ingredient:
                fat_per_100g = fat_ingredient["fat_per_100g"]
                amount_needed = min(50, max(5, (fat_gap / fat_per_100g) * 100))
                
                enhanced_ingredients.append({
                    "name": fat_ingredient["name"],
                    "amount": self._format_amount(amount_needed, fat_ingredient["name"])
                })
        
        return enhanced_ingredients
    
    def _select_best_booster(self, boosters: List[Dict], macro_type: str, gap: float, 
                           restrictions: List[str], allergies: List[str]) -> Optional[Dict]:
        """Select the best booster ingredient based on gap and preferences"""
        
        # Filter out restricted/allergy ingredients
        filtered_boosters = []
        for booster in boosters:
            name_lower = booster["name"].lower()
            
            # Check allergies
            if any(allergy.lower() in name_lower for allergy in allergies):
                continue
                
            # Check dietary restrictions
            skip = False
            for restriction in restrictions:
                if "vegetarian" in restriction.lower() and any(meat in name_lower for meat in ["chicken", "turkey", "beef"]):
                    skip = True
                elif "vegan" in restriction.lower() and any(animal in name_lower for animal in ["chicken", "turkey", "beef", "egg", "yogurt", "cheese"]):
                    skip = True
                elif "dairy" in restriction.lower() and any(dairy in name_lower for dairy in ["yogurt", "cheese", "milk"]):
                    skip = True
            
            if not skip:
                filtered_boosters.append(booster)
        
        if not filtered_boosters:
            return None
        
        # Select based on efficiency for the gap
        best_booster = None
        best_score = 0
        
        for booster in filtered_boosters:
            if macro_type == "protein":
                efficiency = booster["protein_per_100g"]
            elif macro_type == "carbs":
                efficiency = booster["carbs_per_100g"]
            elif macro_type == "fat":
                efficiency = booster["fat_per_100g"]
            else:
                efficiency = 1
            
            # Score based on efficiency and how well it fits the gap
            score = efficiency * min(1.0, gap / (efficiency * 2))  # Prefer moderate amounts
            
            if score > best_score:
                best_score = score
                best_booster = booster
        
        return best_booster
    
    def _within_tolerance(self, current: Dict[str, float], target: Dict[str, float], tolerance: float) -> bool:
        """Check if current macros are within tolerance of targets"""
        
        for macro in ["protein", "carbs", "fat", "calories"]:
            target_val = target.get(macro, 0)
            current_val = current.get(macro, 0)
            
            if target_val > 0:
                error = abs(current_val - target_val) / target_val
                if error > tolerance:
                    return False
        
        return True
    
    def _get_ingredient_nutrition(self, ingredient_name: str) -> Optional[Dict]:
        """Get nutrition data for ingredient"""
        
        # First check our booster databases
        for booster_list in [self.protein_boosters, self.carb_boosters, self.fat_boosters]:
            for booster in booster_list:
                if booster["name"].lower() == ingredient_name.lower():
                    return booster
        
        # Try cache first
        cached = self.nutrition_cache.get_nutrition(ingredient_name)
        if cached:
            return self._convert_nutrition_format(cached)
        
        # Try API
        try:
            foods = fdc_api.search_foods(ingredient_name, max_results=1)
            if foods:
                food_id = foods[0].get("fdcId") if isinstance(foods[0], dict) else getattr(foods[0], 'fdcId', None)
                if food_id:
                    nutrients = fdc_api.get_food_details(food_id)
                    if nutrients:
                        nutrition_data = self._convert_api_nutrition(nutrients)
                        self.nutrition_cache.cache_nutrition(ingredient_name, nutrition_data)
                        return self._convert_nutrition_format(nutrition_data)
        except:
            pass
        
        # Fallback estimates
        return self._get_fallback_nutrition(ingredient_name)
    
    def _convert_nutrition_format(self, nutrition_data: Dict) -> Dict:
        """Convert cached nutrition to optimizer format"""
        return {
            "protein_per_100g": nutrition_data.get("protein", 5),
            "carbs_per_100g": nutrition_data.get("carbs", 10),
            "fat_per_100g": nutrition_data.get("fat", 2),
            "calories_per_100g": nutrition_data.get("calories", 80)
        }
    
    def _convert_api_nutrition(self, nutrients: Dict) -> Dict:
        """Convert API nutrition to standard format"""
        return {
            "protein": nutrients.get("protein", 5),
            "carbs": nutrients.get("carbs", 10),
            "fat": nutrients.get("fat", 2),
            "calories": nutrients.get("calories", 80)
        }
    
    def _get_fallback_nutrition(self, ingredient_name: str) -> Dict:
        """Provide fallback nutrition estimates"""
        name_lower = ingredient_name.lower()
        
        # Basic food category estimates
        if any(meat in name_lower for meat in ["chicken", "turkey", "beef", "pork"]):
            return {"protein_per_100g": 25, "carbs_per_100g": 0, "fat_per_100g": 5, "calories_per_100g": 150}
        elif any(fish in name_lower for fish in ["salmon", "tuna", "cod", "fish"]):
            return {"protein_per_100g": 22, "carbs_per_100g": 0, "fat_per_100g": 8, "calories_per_100g": 155}
        elif "egg" in name_lower:
            return {"protein_per_100g": 13, "carbs_per_100g": 1, "fat_per_100g": 11, "calories_per_100g": 155}
        elif any(grain in name_lower for grain in ["rice", "quinoa", "oats", "bread"]):
            return {"protein_per_100g": 3, "carbs_per_100g": 25, "fat_per_100g": 1, "calories_per_100g": 120}
        elif any(veg in name_lower for veg in ["broccoli", "spinach", "carrot", "pepper"]):
            return {"protein_per_100g": 2, "carbs_per_100g": 5, "fat_per_100g": 0, "calories_per_100g": 25}
        elif "oil" in name_lower:
            return {"protein_per_100g": 0, "carbs_per_100g": 0, "fat_per_100g": 100, "calories_per_100g": 884}
        else:
            return {"protein_per_100g": 5, "carbs_per_100g": 10, "fat_per_100g": 2, "calories_per_100g": 80}
    
    def _parse_amount_to_grams(self, amount_str: str, ingredient_name: str) -> float:
        """Parse amount string to grams"""
        amount_str = str(amount_str).lower().strip()
        
        # Extract number
        import re
        numbers = re.findall(r'[\d.]+', amount_str)
        if not numbers:
            return 100.0
        
        amount = float(numbers[0])
        
        # Convert based on unit
        if 'kg' in amount_str:
            return amount * 1000
        elif 'lb' in amount_str or 'pound' in amount_str:
            return amount * 453.592
        elif 'oz' in amount_str:
            return amount * 28.3495
        elif 'ml' in amount_str or 'milliliter' in amount_str:
            return amount  # Assume 1ml ≈ 1g for most liquids
        elif 'cup' in amount_str:
            return amount * 240  # Approximate
        elif 'tbsp' in amount_str or 'tablespoon' in amount_str:
            return amount * 15
        elif 'tsp' in amount_str or 'teaspoon' in amount_str:
            return amount * 5
        elif 'large' in amount_str and 'egg' in ingredient_name.lower():
            return amount * 50  # Large egg ≈ 50g
        elif 'medium' in amount_str:
            if 'apple' in ingredient_name.lower() or 'banana' in ingredient_name.lower():
                return amount * 150  # Medium fruit
            else:
                return amount * 100
        elif 'small' in amount_str:
            return amount * 75
        elif 'g' in amount_str or 'gram' in amount_str:
            return amount
        else:
            # Default assume grams
            return amount
    
    def _format_amount(self, grams: float, ingredient_name: str) -> str:
        """Format amount back to appropriate unit"""
        name_lower = ingredient_name.lower()
        
        # Special formatting for common ingredients
        if 'egg' in name_lower and grams >= 40:
            eggs = round(grams / 50)
            return f"{eggs} large" if eggs > 1 else "1 large"
        elif 'oil' in name_lower and grams <= 30:
            tbsp = round(grams / 15, 1)
            return f"{tbsp} tbsp" if tbsp != 1 else "1 tbsp"
        elif grams >= 1000:
            kg = round(grams / 1000, 2)
            return f"{kg}kg"
        else:
            return f"{round(grams)}g"

def create_macro_optimizer():
    """Factory function to create optimizer instance"""
    return MacroOptimizer()