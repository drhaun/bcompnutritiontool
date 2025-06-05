"""
Nutrition data cache for fast ingredient lookups
"""
import json
import os
from typing import Dict, Optional

class NutritionCache:
    def __init__(self):
        self.cache_file = "data/nutrition_cache.json"
        self.cache = self._load_cache()
        
    def _load_cache(self) -> Dict:
        """Load nutrition cache from file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return {}
    
    def _save_cache(self):
        """Save cache to file"""
        try:
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            with open(self.cache_file, 'w') as f:
                json.dump(self.cache, f, indent=2)
        except Exception:
            pass
    
    def get(self, food_name: str) -> Optional[Dict]:
        """Get nutrition data from cache"""
        return self.cache.get(food_name.lower())
    
    def set(self, food_name: str, nutrition_data: Dict):
        """Store nutrition data in cache"""
        self.cache[food_name.lower()] = nutrition_data
        self._save_cache()
    
    def get_fallback_nutrition(self, food_name: str, category: str = "protein") -> Dict:
        """Get fallback nutrition data for common foods"""
        fallback_db = {
            # Proteins (per 100g, USDA verified)
            "chicken breast": {"calories_per_100g": 165, "protein_per_100g": 31, "carbs_per_100g": 0, "fat_per_100g": 3.6},
            "salmon": {"calories_per_100g": 208, "protein_per_100g": 25.4, "carbs_per_100g": 0, "fat_per_100g": 12.4},
            "ground beef": {"calories_per_100g": 250, "protein_per_100g": 26, "carbs_per_100g": 0, "fat_per_100g": 15},
            "eggs": {"calories_per_100g": 155, "protein_per_100g": 13, "carbs_per_100g": 1.1, "fat_per_100g": 11},
            "tofu": {"calories_per_100g": 76, "protein_per_100g": 8, "carbs_per_100g": 1.9, "fat_per_100g": 4.8},
            "greek yogurt": {"calories_per_100g": 59, "protein_per_100g": 10, "carbs_per_100g": 3.6, "fat_per_100g": 0.4},
            "cottage cheese": {"calories_per_100g": 98, "protein_per_100g": 11, "carbs_per_100g": 3.4, "fat_per_100g": 4.3},
            "tuna": {"calories_per_100g": 132, "protein_per_100g": 28, "carbs_per_100g": 0, "fat_per_100g": 1.3},
            "cod": {"calories_per_100g": 82, "protein_per_100g": 18, "carbs_per_100g": 0, "fat_per_100g": 0.7},
            "lean beef": {"calories_per_100g": 158, "protein_per_100g": 26, "carbs_per_100g": 0, "fat_per_100g": 5.4},
            "tempeh": {"calories_per_100g": 190, "protein_per_100g": 19, "carbs_per_100g": 9, "fat_per_100g": 11},
            "hummus": {"calories_per_100g": 166, "protein_per_100g": 8, "carbs_per_100g": 14.3, "fat_per_100g": 9.6},
            "hard boiled eggs": {"calories_per_100g": 155, "protein_per_100g": 13, "carbs_per_100g": 1.1, "fat_per_100g": 11},
            "protein bar": {"calories_per_100g": 400, "protein_per_100g": 25, "carbs_per_100g": 40, "fat_per_100g": 15},
            "turkey": {"calories_per_100g": 135, "protein_per_100g": 30, "carbs_per_100g": 0, "fat_per_100g": 1},
            "chicken thigh": {"calories_per_100g": 209, "protein_per_100g": 26, "carbs_per_100g": 0, "fat_per_100g": 10.9},
            "shrimp": {"calories_per_100g": 99, "protein_per_100g": 18, "carbs_per_100g": 0.2, "fat_per_100g": 1.4},
            
            # Carbohydrates (per 100g, cooked where applicable)
            "rice": {"calories_per_100g": 130, "protein_per_100g": 2.7, "carbs_per_100g": 28, "fat_per_100g": 0.3},
            "brown rice": {"calories_per_100g": 111, "protein_per_100g": 2.6, "carbs_per_100g": 23, "fat_per_100g": 0.9},
            "wild rice": {"calories_per_100g": 101, "protein_per_100g": 4, "carbs_per_100g": 21.3, "fat_per_100g": 0.3},
            "quinoa": {"calories_per_100g": 120, "protein_per_100g": 4.4, "carbs_per_100g": 22, "fat_per_100g": 1.9},
            "oatmeal": {"calories_per_100g": 68, "protein_per_100g": 2.4, "carbs_per_100g": 12, "fat_per_100g": 1.4},
            "oats": {"calories_per_100g": 389, "protein_per_100g": 16.9, "carbs_per_100g": 66.3, "fat_per_100g": 6.9},
            "sweet potato": {"calories_per_100g": 86, "protein_per_100g": 1.6, "carbs_per_100g": 20.1, "fat_per_100g": 0.1},
            "whole grain toast": {"calories_per_100g": 247, "protein_per_100g": 13, "carbs_per_100g": 41, "fat_per_100g": 4.2},
            "pasta": {"calories_per_100g": 131, "protein_per_100g": 5, "carbs_per_100g": 25, "fat_per_100g": 1.1},
            "cauliflower rice": {"calories_per_100g": 25, "protein_per_100g": 1.9, "carbs_per_100g": 5, "fat_per_100g": 0.3},
            "roasted vegetables": {"calories_per_100g": 35, "protein_per_100g": 1.5, "carbs_per_100g": 7, "fat_per_100g": 0.3},
            "lentils": {"calories_per_100g": 116, "protein_per_100g": 9, "carbs_per_100g": 20, "fat_per_100g": 0.4},
            "beans": {"calories_per_100g": 127, "protein_per_100g": 8.7, "carbs_per_100g": 23, "fat_per_100g": 0.5},
            
            # Fats (per 100g)
            "olive oil": {"calories_per_100g": 884, "protein_per_100g": 0, "carbs_per_100g": 0, "fat_per_100g": 100},
            "coconut oil": {"calories_per_100g": 862, "protein_per_100g": 0, "carbs_per_100g": 0, "fat_per_100g": 100},
            "sesame oil": {"calories_per_100g": 884, "protein_per_100g": 0, "carbs_per_100g": 0, "fat_per_100g": 100},
            "avocado": {"calories_per_100g": 160, "protein_per_100g": 2, "carbs_per_100g": 8.5, "fat_per_100g": 14.7},
            "nuts": {"calories_per_100g": 607, "protein_per_100g": 20.2, "carbs_per_100g": 21.7, "fat_per_100g": 50.6},
            "almonds": {"calories_per_100g": 579, "protein_per_100g": 21.2, "carbs_per_100g": 21.6, "fat_per_100g": 49.9},
            "walnuts": {"calories_per_100g": 654, "protein_per_100g": 15.2, "carbs_per_100g": 13.7, "fat_per_100g": 65.2},
            "nut butter": {"calories_per_100g": 588, "protein_per_100g": 25, "carbs_per_100g": 20, "fat_per_100g": 50},
            "tahini": {"calories_per_100g": 595, "protein_per_100g": 17, "carbs_per_100g": 21, "fat_per_100g": 54},
            "cheese": {"calories_per_100g": 402, "protein_per_100g": 25, "carbs_per_100g": 1.3, "fat_per_100g": 33},
            "chia seeds": {"calories_per_100g": 486, "protein_per_100g": 17, "carbs_per_100g": 42, "fat_per_100g": 31},
            "hemp seeds": {"calories_per_100g": 553, "protein_per_100g": 31, "carbs_per_100g": 8.7, "fat_per_100g": 49},
            "dark chocolate": {"calories_per_100g": 546, "protein_per_100g": 7.9, "carbs_per_100g": 61, "fat_per_100g": 31},
            "olives": {"calories_per_100g": 115, "protein_per_100g": 0.8, "carbs_per_100g": 6, "fat_per_100g": 10.7},
            
            # Fruits (per 100g, fresh)
            "banana": {"calories_per_100g": 89, "protein_per_100g": 1.1, "carbs_per_100g": 22.8, "fat_per_100g": 0.3},
            "apple": {"calories_per_100g": 52, "protein_per_100g": 0.3, "carbs_per_100g": 13.8, "fat_per_100g": 0.2},
            "berries": {"calories_per_100g": 57, "protein_per_100g": 0.7, "carbs_per_100g": 14.5, "fat_per_100g": 0.3},
            "orange": {"calories_per_100g": 47, "protein_per_100g": 0.9, "carbs_per_100g": 11.8, "fat_per_100g": 0.1},
            "dates": {"calories_per_100g": 277, "protein_per_100g": 1.8, "carbs_per_100g": 75, "fat_per_100g": 0.2},
            "crackers": {"calories_per_100g": 428, "protein_per_100g": 9, "carbs_per_100g": 71, "fat_per_100g": 12},
            "rice cakes": {"calories_per_100g": 387, "protein_per_100g": 8.2, "carbs_per_100g": 81, "fat_per_100g": 2.8},
            
            # Vegetables (per 100g, raw unless specified)
            "broccoli": {"calories_per_100g": 34, "protein_per_100g": 2.8, "carbs_per_100g": 7, "fat_per_100g": 0.4},
            "spinach": {"calories_per_100g": 23, "protein_per_100g": 2.9, "carbs_per_100g": 3.6, "fat_per_100g": 0.4},
            "carrots": {"calories_per_100g": 41, "protein_per_100g": 0.9, "carbs_per_100g": 9.6, "fat_per_100g": 0.2},
            "bell peppers": {"calories_per_100g": 31, "protein_per_100g": 1, "carbs_per_100g": 7, "fat_per_100g": 0.3},
            "mixed greens": {"calories_per_100g": 15, "protein_per_100g": 1.4, "carbs_per_100g": 2.9, "fat_per_100g": 0.2},
            "cucumber": {"calories_per_100g": 16, "protein_per_100g": 0.7, "carbs_per_100g": 4, "fat_per_100g": 0.1},
            "asparagus": {"calories_per_100g": 20, "protein_per_100g": 2.2, "carbs_per_100g": 3.9, "fat_per_100g": 0.1},
            "zucchini": {"calories_per_100g": 17, "protein_per_100g": 1.2, "carbs_per_100g": 3.1, "fat_per_100g": 0.3},
            "mushrooms": {"calories_per_100g": 22, "protein_per_100g": 3.1, "carbs_per_100g": 3.3, "fat_per_100g": 0.3},
            "tomatoes": {"calories_per_100g": 18, "protein_per_100g": 0.9, "carbs_per_100g": 3.9, "fat_per_100g": 0.2},
            "celery": {"calories_per_100g": 16, "protein_per_100g": 0.7, "carbs_per_100g": 3, "fat_per_100g": 0.2}
        }
        
        # Check cache first
        cached = self.get(food_name)
        if cached:
            return cached
            
        # Check fallback database
        for key, data in fallback_db.items():
            if key in food_name.lower() or food_name.lower() in key:
                self.set(food_name, data)
                return data
        
        # Default based on category
        defaults = {
            "protein": {"calories_per_100g": 165, "protein_per_100g": 25, "carbs_per_100g": 0, "fat_per_100g": 5},
            "carb": {"calories_per_100g": 130, "protein_per_100g": 3, "carbs_per_100g": 28, "fat_per_100g": 1},
            "fat": {"calories_per_100g": 400, "protein_per_100g": 2, "carbs_per_100g": 5, "fat_per_100g": 40},
            "vegetable": {"calories_per_100g": 25, "protein_per_100g": 2, "carbs_per_100g": 5, "fat_per_100g": 0.2}
        }
        
        return defaults.get(category, defaults["protein"])

# Global cache instance
nutrition_cache = NutritionCache()