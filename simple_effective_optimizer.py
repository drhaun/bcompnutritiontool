"""
Simple, Effective Meal Optimizer - Actually works
Focus: Make small, smart improvements that users can see
"""
from typing import Dict, List, Tuple
from fdc_database_loader import fdc_db
import copy

class SimpleEffectiveOptimizer:
    def __init__(self):
        self.fdc_loader = fdc_db
    
    def optimize_meal_smart(self, ingredients: List[Dict], targets: Dict[str, float]) -> Tuple[List[Dict], Dict[str, float]]:
        """
        Smart optimization that actually improves meals
        """
        
        # Calculate current state
        current_macros = self._calculate_macros(ingredients)
        
        # Only optimize if there's a meaningful gap (>10% off target)
        needs_optimization = False
        for macro in ["protein", "carbs", "fat", "calories"]:
            target = targets.get(macro, 0)
            current = current_macros.get(macro, 0)
            if target > 0:
                error = abs(current - target) / target
                if error > 0.1:  # 10% threshold
                    needs_optimization = True
                    break
        
        if not needs_optimization:
            return ingredients, current_macros
        
        # Simple but effective optimization approach
        optimized = self._smart_portion_adjustment(ingredients, current_macros, targets)
        final_macros = self._calculate_macros(optimized)
        
        return optimized, final_macros
    
    def _calculate_macros(self, ingredients: List[Dict]) -> Dict[str, float]:
        """Calculate nutrition totals using FDC database"""
        totals = {"protein": 0, "carbs": 0, "fat": 0, "calories": 0}
        
        for ingredient in ingredients:
            name = ingredient.get("name", "").lower()
            amount_str = ingredient.get("amount", "100g")
            
            # Parse amount
            amount_grams = self._parse_amount(amount_str)
            
            # Get FDC nutrition
            nutrition = self.fdc_loader.get_nutrition(name)
            if nutrition:
                factor = amount_grams / 100.0
                totals["protein"] += nutrition.get("protein", 0) * factor
                totals["carbs"] += nutrition.get("carbs", 0) * factor
                totals["fat"] += nutrition.get("fat", 0) * factor
                totals["calories"] += nutrition.get("calories", 0) * factor
        
        return totals
    
    def _smart_portion_adjustment(self, ingredients: List[Dict], current: Dict[str, float], 
                                targets: Dict[str, float]) -> List[Dict]:
        """
        Make smart, targeted portion adjustments
        """
        result = copy.deepcopy(ingredients)
        
        # Calculate which direction we need to go
        current_calories = current.get("calories", 0)
        target_calories = targets.get("calories", current_calories)
        
        if current_calories <= 0:
            return result
        
        # Calculate adjustment factor - but limit it to reasonable range
        adjustment_factor = target_calories / current_calories
        
        # Limit adjustment to ±30% maximum (prevents dramatic changes)
        adjustment_factor = max(0.7, min(1.3, adjustment_factor))
        
        # Apply adjustment to all ingredients
        for ingredient in result:
            amount_str = ingredient.get("amount", "100g")
            amount_grams = self._parse_amount(amount_str)
            
            # Apply the adjustment
            new_amount_grams = amount_grams * adjustment_factor
            
            # Format back to appropriate unit
            ingredient["amount"] = self._format_amount(new_amount_grams, ingredient.get("name", ""))
        
        return result
    
    def _parse_amount(self, amount_str: str) -> float:
        """Parse amount string to grams"""
        import re
        amount_str = str(amount_str).lower().strip()
        
        # Extract number
        numbers = re.findall(r'[\d.]+', amount_str)
        if not numbers:
            return 100.0
        
        amount = float(numbers[0])
        
        # Convert to grams
        if 'kg' in amount_str:
            return amount * 1000
        elif 'tbsp' in amount_str:
            return amount * 15
        elif 'tsp' in amount_str:
            return amount * 5
        elif 'cup' in amount_str:
            return amount * 240
        elif 'large' in amount_str:
            return amount * 50  # Large egg
        elif 'ml' in amount_str:
            return amount  # Assume 1ml ≈ 1g
        else:
            return amount  # Default to grams
    
    def _format_amount(self, grams: float, ingredient_name: str = "") -> str:
        """Format amount back to appropriate unit"""
        name_lower = ingredient_name.lower()
        
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

def create_simple_effective_optimizer():
    """Factory function"""
    return SimpleEffectiveOptimizer()