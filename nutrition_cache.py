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
            # Proteins
            "chicken breast": {"calories_per_100g": 165, "protein_per_100g": 31, "carbs_per_100g": 0, "fat_per_100g": 3.6},
            "salmon": {"calories_per_100g": 208, "protein_per_100g": 25.4, "carbs_per_100g": 0, "fat_per_100g": 12.4},
            "ground beef": {"calories_per_100g": 250, "protein_per_100g": 26, "carbs_per_100g": 0, "fat_per_100g": 15},
            "eggs": {"calories_per_100g": 155, "protein_per_100g": 13, "carbs_per_100g": 1.1, "fat_per_100g": 11},
            "tofu": {"calories_per_100g": 76, "protein_per_100g": 8, "carbs_per_100g": 1.9, "fat_per_100g": 4.8},
            
            # Carbs
            "rice": {"calories_per_100g": 130, "protein_per_100g": 2.7, "carbs_per_100g": 28, "fat_per_100g": 0.3},
            "quinoa": {"calories_per_100g": 120, "protein_per_100g": 4.4, "carbs_per_100g": 22, "fat_per_100g": 1.9},
            "oats": {"calories_per_100g": 389, "protein_per_100g": 16.9, "carbs_per_100g": 66.3, "fat_per_100g": 6.9},
            "sweet potato": {"calories_per_100g": 86, "protein_per_100g": 1.6, "carbs_per_100g": 20.1, "fat_per_100g": 0.1},
            "bread": {"calories_per_100g": 265, "protein_per_100g": 9, "carbs_per_100g": 49, "fat_per_100g": 3.2},
            
            # Fats
            "olive oil": {"calories_per_100g": 884, "protein_per_100g": 0, "carbs_per_100g": 0, "fat_per_100g": 100},
            "avocado": {"calories_per_100g": 160, "protein_per_100g": 2, "carbs_per_100g": 8.5, "fat_per_100g": 14.7},
            "nuts": {"calories_per_100g": 607, "protein_per_100g": 20.2, "carbs_per_100g": 21.7, "fat_per_100g": 50.6},
            "cheese": {"calories_per_100g": 113, "protein_per_100g": 7, "carbs_per_100g": 1, "fat_per_100g": 9},
            
            # Vegetables
            "broccoli": {"calories_per_100g": 34, "protein_per_100g": 2.8, "carbs_per_100g": 7, "fat_per_100g": 0.4},
            "spinach": {"calories_per_100g": 23, "protein_per_100g": 2.9, "carbs_per_100g": 3.6, "fat_per_100g": 0.4},
            "carrots": {"calories_per_100g": 41, "protein_per_100g": 0.9, "carbs_per_100g": 9.6, "fat_per_100g": 0.2},
            
            # Fruits
            "banana": {"calories_per_100g": 89, "protein_per_100g": 1.1, "carbs_per_100g": 22.8, "fat_per_100g": 0.3},
            "apple": {"calories_per_100g": 52, "protein_per_100g": 0.3, "carbs_per_100g": 13.8, "fat_per_100g": 0.2},
            "orange": {"calories_per_100g": 47, "protein_per_100g": 0.9, "carbs_per_100g": 11.8, "fat_per_100g": 0.1},
            "orange juice": {"calories_per_100g": 45, "protein_per_100g": 0.7, "carbs_per_100g": 10.4, "fat_per_100g": 0.2}
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