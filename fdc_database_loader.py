"""
FDC Database Loader - Fast nutrition lookup using local database
"""
import json
import os
from typing import Dict, Optional, List
from fuzzywuzzy import fuzz

class FDCDatabaseLoader:
    def __init__(self, database_file: str = 'fdc_nutrition_database.json'):
        self.database_file = database_file
        self.database = {}
        self.ingredient_index = {}  # Fast lookup index
        self.load_database()
    
    def load_database(self):
        """Load the FDC nutrition database"""
        if not os.path.exists(self.database_file):
            print(f"❌ Database file not found: {self.database_file}")
            print(f"💡 Run 'python build_fdc_database.py' to create it")
            return
        
        try:
            with open(self.database_file, 'r') as f:
                self.database = json.load(f)
            
            # Build fast lookup index
            self._build_ingredient_index()
            
            total_ingredients = self.database.get('metadata', {}).get('total_ingredients', 0)
            print(f"✅ FDC Database loaded: {total_ingredients} ingredients")
            
        except Exception as e:
            print(f"❌ Error loading database: {e}")
    
    def _build_ingredient_index(self):
        """Build index for fast ingredient lookup"""
        self.ingredient_index = {}
        
        for category, ingredients in self.database.get('categories', {}).items():
            for search_term, nutrition_data in ingredients.items():
                # Add search term
                self.ingredient_index[search_term.lower()] = nutrition_data
                
                # Add actual food name from FDC
                food_name = nutrition_data.get('name', '').lower()
                if food_name and food_name != search_term.lower():
                    self.ingredient_index[food_name] = nutrition_data
                
                # Add common variations
                variations = self._generate_name_variations(search_term)
                for variation in variations:
                    if variation not in self.ingredient_index:
                        self.ingredient_index[variation] = nutrition_data
    
    def _generate_name_variations(self, name: str) -> List[str]:
        """Generate common name variations for better matching"""
        variations = []
        name_lower = name.lower().strip()
        
        # Remove common words
        common_removals = ['fresh', 'raw', 'cooked', 'lean', 'organic', 'whole']
        for word in common_removals:
            if word in name_lower:
                variations.append(name_lower.replace(word, '').strip())
        
        # Plural/singular variations
        if name_lower.endswith('s'):
            variations.append(name_lower[:-1])  # Remove 's'
        else:
            variations.append(name_lower + 's')  # Add 's'
        
        # Common synonyms
        synonyms = {
            'chicken breast': ['chicken', 'poultry'],
            'sweet potato': ['yam', 'sweet potatoes'],
            'brown rice': ['rice'],
            'olive oil': ['oil'],
            'greek yogurt': ['yogurt', 'yoghurt']
        }
        
        if name_lower in synonyms:
            variations.extend(synonyms[name_lower])
        
        return [v for v in variations if v and len(v) > 2]
    
    def get_nutrition(self, ingredient_name: str) -> Optional[Dict]:
        """Get nutrition data for ingredient with fuzzy matching"""
        ingredient_clean = ingredient_name.lower().strip()
        
        # Direct lookup first
        if ingredient_clean in self.ingredient_index:
            return self.ingredient_index[ingredient_clean]
        
        # Fuzzy matching if direct lookup fails
        best_match = None
        best_score = 0
        
        for indexed_name, nutrition_data in self.ingredient_index.items():
            # Calculate similarity score
            score = fuzz.ratio(ingredient_clean, indexed_name)
            
            # Also check partial matching
            partial_score = fuzz.partial_ratio(ingredient_clean, indexed_name)
            final_score = max(score, partial_score)
            
            if final_score > best_score and final_score >= 70:  # 70% similarity threshold
                best_score = final_score
                best_match = nutrition_data
        
        if best_match:
            print(f"🔍 Fuzzy matched '{ingredient_name}' (score: {best_score}%)")
            return best_match
        
        return None
    
    def search_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Get ingredients from a specific category"""
        category_data = self.database.get('categories', {}).get(category, {})
        
        results = []
        for search_term, nutrition_data in list(category_data.items())[:limit]:
            results.append({
                'search_term': search_term,
                'name': nutrition_data.get('name', search_term),
                'nutrition': nutrition_data
            })
        
        return results
    
    def get_protein_sources(self, limit: int = 20) -> List[Dict]:
        """Get top protein sources"""
        proteins = self.search_by_category('proteins', limit)
        
        # Sort by protein content per 100g
        proteins.sort(key=lambda x: x['nutrition'].get('protein', 0), reverse=True)
        
        return proteins
    
    def get_carb_sources(self, limit: int = 20) -> List[Dict]:
        """Get top carbohydrate sources"""
        carbs = self.search_by_category('carbohydrates', limit)
        
        # Sort by carb content per 100g
        carbs.sort(key=lambda x: x['nutrition'].get('carbs', 0), reverse=True)
        
        return carbs
    
    def get_fat_sources(self, limit: int = 20) -> List[Dict]:
        """Get top fat sources"""
        fats = self.search_by_category('fats', limit)
        
        # Sort by fat content per 100g
        fats.sort(key=lambda x: x['nutrition'].get('fat', 0), reverse=True)
        
        return fats
    
    def get_database_stats(self) -> Dict:
        """Get database statistics"""
        if not self.database:
            return {}
        
        metadata = self.database.get('metadata', {})
        categories = self.database.get('categories', {})
        
        stats = {
            'metadata': metadata,
            'category_counts': {cat: len(ingredients) for cat, ingredients in categories.items()},
            'total_indexed': len(self.ingredient_index),
            'available_categories': list(categories.keys())
        }
        
        return stats

# Global instance for easy import
fdc_db = FDCDatabaseLoader()

def get_fdc_nutrition(ingredient_name: str) -> Optional[Dict]:
    """Quick function to get nutrition data"""
    return fdc_db.get_nutrition(ingredient_name)

def test_database():
    """Test the database functionality"""
    print("🧪 Testing FDC Database")
    print("=" * 40)
    
    # Test direct lookups
    test_ingredients = [
        "chicken breast",
        "salmon", 
        "sweet potato",
        "broccoli",
        "olive oil",
        "almonds"
    ]
    
    for ingredient in test_ingredients:
        nutrition = get_fdc_nutrition(ingredient)
        if nutrition:
            print(f"✅ {ingredient}: {nutrition['protein']:.1f}p {nutrition['carbs']:.1f}c {nutrition['fat']:.1f}f")
        else:
            print(f"❌ {ingredient}: Not found")
    
    # Test fuzzy matching
    print("\n🔍 Testing fuzzy matching:")
    fuzzy_tests = [
        "chicken",
        "sweet potatoes", 
        "olive",
        "almond"
    ]
    
    for ingredient in fuzzy_tests:
        nutrition = get_fdc_nutrition(ingredient)
        if nutrition:
            print(f"✅ '{ingredient}' → {nutrition['name']}")
        else:
            print(f"❌ '{ingredient}': No match")
    
    # Database stats
    stats = fdc_db.get_database_stats()
    print(f"\n📊 Database Stats:")
    print(f"  Total ingredients: {stats.get('total_indexed', 0)}")
    print(f"  Categories: {', '.join(stats.get('available_categories', []))}")

if __name__ == "__main__":
    test_database()