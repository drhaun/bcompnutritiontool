"""
Simplified Intelligent Macro Optimizer
Works with existing Fitomics codebase using FDC database
"""
import copy
import json
import os
from typing import Dict, List, Tuple, Optional
from fdc_database_loader import fdc_db

class SimpleMacroOptimizer:
    def __init__(self):
        # Use FDC database for authentic nutrition data
        self.fdc_loader = fdc_db
        
        # Backup built-in nutrition database for reliability
        self.nutrition_db = {
            # Proteins
            "chicken breast": {"protein": 31.0, "carbs": 0.0, "fat": 3.6, "calories": 165},
            "salmon": {"protein": 25.4, "carbs": 0.0, "fat": 12.3, "calories": 208},
            "egg whites": {"protein": 10.9, "carbs": 0.7, "fat": 0.2, "calories": 52},
            "greek yogurt": {"protein": 10.0, "carbs": 3.6, "fat": 0.4, "calories": 59},
            "cottage cheese": {"protein": 11.1, "carbs": 3.4, "fat": 4.3, "calories": 98},
            "tofu": {"protein": 8.1, "carbs": 1.9, "fat": 4.8, "calories": 76},
            "lean turkey": {"protein": 29.3, "carbs": 0.0, "fat": 7.0, "calories": 189},
            "lean beef": {"protein": 26.1, "carbs": 0.0, "fat": 9.3, "calories": 192},
            
            # Carbs
            "sweet potato": {"protein": 2.0, "carbs": 20.1, "fat": 0.1, "calories": 86},
            "brown rice": {"protein": 2.6, "carbs": 23.0, "fat": 0.9, "calories": 111},
            "quinoa": {"protein": 4.4, "carbs": 21.3, "fat": 1.9, "calories": 120},
            "oats": {"protein": 2.4, "carbs": 12.0, "fat": 1.4, "calories": 68},
            "banana": {"protein": 1.1, "carbs": 22.8, "fat": 0.3, "calories": 89},
            "apple": {"protein": 0.3, "carbs": 13.8, "fat": 0.2, "calories": 52},
            "white rice": {"protein": 2.7, "carbs": 28.2, "fat": 0.3, "calories": 130},
            "bread": {"protein": 8.1, "carbs": 43.3, "fat": 3.2, "calories": 265},
            
            # Fats
            "almonds": {"protein": 21.2, "carbs": 9.7, "fat": 49.4, "calories": 576},
            "olive oil": {"protein": 0.0, "carbs": 0.0, "fat": 100.0, "calories": 884},
            "avocado": {"protein": 2.0, "carbs": 8.5, "fat": 14.7, "calories": 160},
            "walnuts": {"protein": 15.2, "carbs": 7.0, "fat": 65.2, "calories": 654},
            "coconut oil": {"protein": 0.0, "carbs": 0.0, "fat": 99.1, "calories": 862},
            "cashews": {"protein": 18.2, "carbs": 30.2, "fat": 43.8, "calories": 553},
            "peanut butter": {"protein": 25.8, "carbs": 20.0, "fat": 50.4, "calories": 588},
            
            # Vegetables
            "broccoli": {"protein": 2.8, "carbs": 6.6, "fat": 0.4, "calories": 34},
            "spinach": {"protein": 2.9, "carbs": 3.6, "fat": 0.4, "calories": 23},
            "carrots": {"protein": 0.9, "carbs": 9.6, "fat": 0.2, "calories": 41},
            "bell pepper": {"protein": 1.0, "carbs": 7.3, "fat": 0.3, "calories": 31},
            "zucchini": {"protein": 1.2, "carbs": 3.1, "fat": 0.3, "calories": 17},
            "asparagus": {"protein": 2.2, "carbs": 3.9, "fat": 0.1, "calories": 20},
        }
        
        # Complementary ingredients organized by macro type
        self.protein_boosters = [
            "egg whites", "chicken breast", "greek yogurt", "cottage cheese", "lean turkey"
        ]
        
        self.carb_boosters = [
            "sweet potato", "brown rice", "quinoa", "oats", "banana", "apple"
        ]
        
        self.fat_boosters = [
            "almonds", "olive oil", "avocado", "walnuts", "peanut butter"
        ]
    
    def parse_amount_to_grams(self, amount_str: str, ingredient_name: str = "") -> float:
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
        elif 'ml' in amount_str:
            return amount  # Assume 1ml ≈ 1g
        elif 'cup' in amount_str:
            return amount * 240
        elif 'tbsp' in amount_str or 'tablespoon' in amount_str:
            return amount * 15
        elif 'tsp' in amount_str or 'teaspoon' in amount_str:
            return amount * 5
        elif 'large' in amount_str and 'egg' in ingredient_name.lower():
            return amount * 50
        elif 'medium' in amount_str:
            return amount * 150
        elif 'small' in amount_str:
            return amount * 75
        elif 'g' in amount_str or 'gram' in amount_str:
            return amount
        else:
            return amount  # Default assume grams
    
    def get_nutrition_per_100g(self, ingredient_name: str) -> Dict[str, float]:
        """Get nutrition data per 100g for ingredient"""
        name_clean = ingredient_name.lower().strip()
        
        # Try FDC database first for authentic data
        fdc_nutrition = self.fdc_loader.get_nutrition(name_clean)
        if fdc_nutrition:
            # Convert FDC format to our format
            return {
                "protein": fdc_nutrition.get("protein", 0),
                "carbs": fdc_nutrition.get("carbs", 0),
                "fat": fdc_nutrition.get("fat", 0),
                "calories": fdc_nutrition.get("calories", 0)
            }
        
        # Fallback to built-in database
        if name_clean in self.nutrition_db:
            return self.nutrition_db[name_clean]
        
        # Fuzzy matching for common ingredients
        for db_name, nutrition in self.nutrition_db.items():
            if any(word in name_clean for word in db_name.split()) and len(db_name.split()) > 1:
                return nutrition
        
        # Final fallback estimates based on ingredient type
        if any(meat in name_clean for meat in ["chicken", "turkey", "beef", "pork"]):
            return {"protein": 25, "carbs": 0, "fat": 5, "calories": 150}
        elif any(fish in name_clean for fish in ["salmon", "tuna", "cod", "fish"]):
            return {"protein": 22, "carbs": 0, "fat": 8, "calories": 155}
        elif "egg" in name_clean:
            return {"protein": 13, "carbs": 1, "fat": 11, "calories": 155}
        elif any(grain in name_clean for grain in ["rice", "quinoa", "oats", "bread"]):
            return {"protein": 3, "carbs": 25, "fat": 1, "calories": 120}
        elif any(veg in name_clean for veg in ["broccoli", "spinach", "carrot", "pepper"]):
            return {"protein": 2, "carbs": 5, "fat": 0, "calories": 25}
        elif "oil" in name_clean:
            return {"protein": 0, "carbs": 0, "fat": 100, "calories": 884}
        else:
            return {"protein": 5, "carbs": 10, "fat": 2, "calories": 80}
    
    def calculate_current_macros(self, ingredients: List[Dict]) -> Dict[str, float]:
        """Calculate current macro totals"""
        totals = {"protein": 0, "carbs": 0, "fat": 0, "calories": 0}
        
        for ingredient in ingredients:
            name = ingredient.get("name", "")
            amount_str = ingredient.get("amount", "100g")
            
            # Parse amount to grams
            amount_grams = self.parse_amount_to_grams(amount_str, name)
            
            # Get nutrition per 100g
            nutrition_per_100g = self.get_nutrition_per_100g(name)
            
            # Calculate contribution
            factor = amount_grams / 100.0
            totals["protein"] += nutrition_per_100g["protein"] * factor
            totals["carbs"] += nutrition_per_100g["carbs"] * factor
            totals["fat"] += nutrition_per_100g["fat"] * factor
            totals["calories"] += nutrition_per_100g["calories"] * factor
        
        return totals
    
    def optimize_meal_macros(self, 
                           ingredients: List[Dict], 
                           target_macros: Dict[str, float],
                           user_preferences: Dict = None) -> Tuple[List[Dict], Dict[str, float]]:
        """
        Optimize meal to hit target macros precisely
        Returns: (optimized_ingredients, achieved_macros)
        """
        
        # Step 1: Calculate current state
        current_macros = self.calculate_current_macros(ingredients)
        
        # Step 2: Calculate gaps
        protein_gap = target_macros.get("protein", 30) - current_macros.get("protein", 0)
        carbs_gap = target_macros.get("carbs", 40) - current_macros.get("carbs", 0)
        fat_gap = target_macros.get("fat", 15) - current_macros.get("fat", 0)
        calories_gap = target_macros.get("calories", 400) - current_macros.get("calories", 0)
        
        # Step 3: Start with original ingredients
        optimized_ingredients = copy.deepcopy(ingredients)
        
        # Step 4: Smart ingredient addition with precision targeting
        dietary_restrictions = user_preferences.get("dietary_restrictions", []) if user_preferences else []
        allergies = user_preferences.get("allergies", []) if user_preferences else []
        
        # Only add ingredients if gaps are significant and achievable
        ingredients_added = 0
        max_additions = 2  # Limit additions to maintain meal coherence
        
        # Prioritize the biggest gaps first
        gaps = [
            (abs(protein_gap), "protein", protein_gap, self.protein_boosters),
            (abs(carbs_gap), "carbs", carbs_gap, self.carb_boosters), 
            (abs(fat_gap), "fat", fat_gap, self.fat_boosters)
        ]
        gaps.sort(reverse=True)  # Start with biggest gap
        
        for gap_size, macro_type, gap_value, boosters in gaps:
            if ingredients_added >= max_additions:
                break
                
            # Only add if gap is significant (>10% of target) and positive
            target_value = target_macros.get(macro_type, 30)
            if gap_value > target_value * 0.1 and gap_value > 0:
                
                ingredient = self._select_best_ingredient(
                    boosters, macro_type, gap_value, dietary_restrictions, allergies
                )
                
                if ingredient:
                    nutrition = self.get_nutrition_per_100g(ingredient)
                    macro_per_100g = nutrition.get(macro_type, 0)
                    
                    if macro_per_100g > 0:
                        # Calculate precise amount needed for this gap
                        amount_needed = min(150, max(10, (gap_value / macro_per_100g) * 100))
                        
                        optimized_ingredients.append({
                            "name": ingredient.title(),
                            "amount": self._format_amount(amount_needed, ingredient)
                        })
                        ingredients_added += 1
        
        # Step 5: Precise portion optimization
        optimized_ingredients = self._precise_portion_optimization(optimized_ingredients, target_macros)
        
        # Calculate final macros
        final_macros = self.calculate_current_macros(optimized_ingredients)
        
        return optimized_ingredients, final_macros
    
    def _select_best_ingredient(self, candidates: List[str], macro_type: str, gap: float,
                              restrictions: List[str], allergies: List[str]) -> Optional[str]:
        """Select best ingredient to fill macro gap"""
        
        # Filter out restricted ingredients
        filtered_candidates = []
        for candidate in candidates:
            skip = False
            
            # Check allergies
            for allergy in allergies:
                if allergy.lower() in candidate.lower():
                    skip = True
                    break
            
            # Check dietary restrictions
            for restriction in restrictions:
                if "vegetarian" in restriction.lower():
                    if any(meat in candidate for meat in ["chicken", "turkey", "beef"]):
                        skip = True
                elif "vegan" in restriction.lower():
                    if any(animal in candidate for animal in ["chicken", "turkey", "beef", "egg", "yogurt", "cheese"]):
                        skip = True
                elif "dairy" in restriction.lower():
                    if any(dairy in candidate for dairy in ["yogurt", "cheese", "milk"]):
                        skip = True
            
            if not skip:
                filtered_candidates.append(candidate)
        
        if not filtered_candidates:
            return None
        
        # Select based on efficiency for the gap
        best_candidate = None
        best_score = 0
        
        for candidate in filtered_candidates:
            nutrition = self.get_nutrition_per_100g(candidate)
            efficiency = nutrition.get(macro_type, 0)
            
            # Score based on efficiency and gap fit
            score = efficiency * min(1.0, gap / (efficiency * 2))
            
            if score > best_score:
                best_score = score
                best_candidate = candidate
        
        return best_candidate
    
    def _precise_portion_optimization(self, ingredients: List[Dict], target_macros: Dict[str, float]) -> List[Dict]:
        """Precise mathematical optimization of ingredient portions"""
        
        # Multiple optimization passes for precision
        for iteration in range(3):
            current_macros = self.calculate_current_macros(ingredients)
            
            # Calculate errors
            calories_error = (current_macros.get("calories", 0) - target_macros.get("calories", 400)) / target_macros.get("calories", 400)
            protein_error = (current_macros.get("protein", 0) - target_macros.get("protein", 30)) / target_macros.get("protein", 30)
            carbs_error = (current_macros.get("carbs", 0) - target_macros.get("carbs", 40)) / target_macros.get("carbs", 40)
            fat_error = (current_macros.get("fat", 0) - target_macros.get("fat", 15)) / target_macros.get("fat", 15)
            
            # If within ±5% tolerance, we're done
            max_error = max(abs(calories_error), abs(protein_error), abs(carbs_error), abs(fat_error))
            if max_error < 0.05:
                break
            
            # Apply targeted adjustments
            if abs(calories_error) > 0.02:  # 2% tolerance for calories
                # Scale all ingredients by calorie adjustment
                scale_factor = 1 - (calories_error * 0.5)  # Conservative adjustment
                scale_factor = max(0.5, min(1.5, scale_factor))  # Safety bounds
                
                for ingredient in ingredients:
                    amount_str = ingredient.get("amount", "100g")
                    amount_grams = self.parse_amount_to_grams(amount_str, ingredient.get("name", ""))
                    new_amount_grams = amount_grams * scale_factor
                    ingredient["amount"] = self._format_amount(new_amount_grams, ingredient.get("name", ""))
            
            else:
                # Fine-tune individual macro contributors
                if abs(protein_error) > 0.02:
                    self._adjust_macro_contributors(ingredients, "protein", protein_error)
                if abs(carbs_error) > 0.02:
                    self._adjust_macro_contributors(ingredients, "carbs", carbs_error)
                if abs(fat_error) > 0.02:
                    self._adjust_macro_contributors(ingredients, "fat", fat_error)
        
        return ingredients
    
    def _adjust_macro_contributors(self, ingredients: List[Dict], macro_type: str, error: float):
        """Adjust ingredients that contribute most to a specific macro"""
        
        # Find ingredients that contribute significantly to this macro
        contributors = []
        for ingredient in ingredients:
            name = ingredient.get("name", "")
            amount_str = ingredient.get("amount", "100g")
            amount_grams = self.parse_amount_to_grams(amount_str, name)
            nutrition = self.get_nutrition_per_100g(name)
            
            macro_contribution = nutrition.get(macro_type, 0) * (amount_grams / 100)
            if macro_contribution > 1:  # Significant contributor
                contributors.append((ingredient, macro_contribution))
        
        if contributors:
            # Sort by contribution and adjust top contributors
            contributors.sort(key=lambda x: x[1], reverse=True)
            
            # Adjust top 2 contributors
            for i, (ingredient, contribution) in enumerate(contributors[:2]):
                if i == 0:
                    # Primary contributor gets larger adjustment
                    adjustment_factor = 1 - (error * 0.3)
                else:
                    # Secondary contributor gets smaller adjustment
                    adjustment_factor = 1 - (error * 0.15)
                
                adjustment_factor = max(0.3, min(2.0, adjustment_factor))  # Safety bounds
                
                amount_str = ingredient.get("amount", "100g")
                amount_grams = self.parse_amount_to_grams(amount_str, ingredient.get("name", ""))
                new_amount_grams = amount_grams * adjustment_factor
                ingredient["amount"] = self._format_amount(new_amount_grams, ingredient.get("name", ""))
    
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

def create_simple_optimizer():
    """Factory function to create simple optimizer"""
    return SimpleMacroOptimizer()