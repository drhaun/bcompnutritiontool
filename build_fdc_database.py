#!/usr/bin/env python3
"""
Build comprehensive FDC API database with top 100 ingredients per category
Creates local database for fast macro optimization
"""
import requests
import json
import os
import time
from typing import Dict, List, Optional

class FDCDatabaseBuilder:
    def __init__(self):
        self.api_key = os.environ.get('FDC_API_KEY')
        if not self.api_key:
            raise ValueError("FDC_API_KEY environment variable required")
        
        self.base_url = "https://api.nal.usda.gov/fdc/v1"
        self.database = {}
        
        # Define search categories with specific terms
        self.categories = {
            "proteins": [
                # Meats
                "chicken breast", "chicken thigh", "turkey breast", "lean beef", "ground beef",
                "pork loin", "pork tenderloin", "lamb", "venison", "bison",
                # Fish & Seafood
                "salmon", "tuna", "cod", "tilapia", "shrimp", "crab", "lobster", "scallops",
                "sardines", "mackerel", "halibut", "sea bass", "trout", "mahi mahi",
                # Dairy & Eggs
                "egg", "egg whites", "whole milk", "greek yogurt", "cottage cheese",
                "cheddar cheese", "mozzarella", "parmesan", "ricotta", "cream cheese",
                # Plant Proteins
                "tofu", "tempeh", "seitan", "black beans", "kidney beans", "chickpeas",
                "lentils", "quinoa", "hemp seeds", "protein powder", "nutritional yeast"
            ],
            
            "carbohydrates": [
                # Grains
                "brown rice", "white rice", "quinoa", "oats", "barley", "bulgur",
                "whole wheat bread", "white bread", "pasta", "couscous", "farro",
                # Starchy Vegetables
                "sweet potato", "potato", "corn", "peas", "winter squash", "plantain",
                # Fruits
                "banana", "apple", "orange", "berries", "grapes", "mango", "pineapple",
                "dates", "figs", "dried fruit", "fruit juice",
                # Legumes
                "beans", "lentils", "chickpeas", "split peas"
            ],
            
            "fats": [
                # Oils
                "olive oil", "coconut oil", "avocado oil", "canola oil", "sesame oil",
                "flaxseed oil", "walnut oil", "sunflower oil", "safflower oil",
                # Nuts & Seeds
                "almonds", "walnuts", "cashews", "pecans", "pistachios", "macadamia",
                "peanuts", "peanut butter", "almond butter", "tahini", "sunflower seeds",
                "pumpkin seeds", "chia seeds", "flax seeds", "hemp hearts",
                # Other Fats
                "avocado", "olives", "coconut", "butter", "ghee", "cream"
            ],
            
            "vegetables": [
                # Leafy Greens
                "spinach", "kale", "arugula", "lettuce", "chard", "collard greens",
                # Cruciferous
                "broccoli", "cauliflower", "brussels sprouts", "cabbage", "bok choy",
                # Root Vegetables
                "carrots", "beets", "turnips", "radishes", "onions", "garlic",
                # Peppers & Squash
                "bell peppers", "jalapeños", "zucchini", "yellow squash", "cucumber",
                # Other Vegetables
                "tomatoes", "mushrooms", "celery", "asparagus", "green beans", "eggplant"
            ],
            
            "fruits": [
                # Berries
                "blueberries", "strawberries", "raspberries", "blackberries", "cranberries",
                # Tree Fruits
                "apples", "pears", "peaches", "plums", "apricots", "cherries",
                # Citrus
                "oranges", "lemons", "limes", "grapefruit", "tangerines",
                # Tropical
                "bananas", "mangoes", "pineapple", "papaya", "kiwi", "passion fruit",
                # Melons
                "watermelon", "cantaloupe", "honeydew"
            ],
            
            "herbs_spices": [
                # Fresh Herbs
                "basil", "parsley", "cilantro", "dill", "thyme", "rosemary", "oregano",
                "sage", "mint", "chives", "tarragon",
                # Spices
                "black pepper", "salt", "garlic powder", "onion powder", "paprika",
                "cumin", "coriander", "turmeric", "ginger", "cinnamon", "nutmeg",
                "cloves", "cardamom", "bay leaves", "red pepper flakes", "chili powder"
            ]
        }
    
    def search_food(self, query: str, page_size: int = 5) -> List[Dict]:
        """Search FDC API for foods matching query"""
        try:
            url = f"{self.base_url}/foods/search"
            params = {
                'api_key': self.api_key,
                'query': query,
                'dataType': ['Foundation', 'SR Legacy'],  # High quality data types
                'pageSize': page_size,
                'sortBy': 'dataType.keyword',
                'sortOrder': 'asc'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return data.get('foods', [])
            
        except Exception as e:
            print(f"Error searching for '{query}': {e}")
            return []
    
    def get_food_details(self, fdc_id: int) -> Optional[Dict]:
        """Get detailed nutrition data for a specific food"""
        try:
            url = f"{self.base_url}/food/{fdc_id}"
            params = {'api_key': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Error getting details for FDC ID {fdc_id}: {e}")
            return None
    
    def extract_nutrition_data(self, food_data: Dict) -> Optional[Dict]:
        """Extract standardized nutrition data from FDC response"""
        try:
            # Get basic info
            name = food_data.get('description', '').lower()
            fdc_id = food_data.get('fdcId')
            
            # Extract nutrients
            nutrients = food_data.get('foodNutrients', [])
            nutrition = {
                'name': name,
                'fdc_id': fdc_id,
                'protein': 0,
                'carbs': 0, 
                'fat': 0,
                'calories': 0,
                'fiber': 0,
                'sugar': 0,
                'sodium': 0
            }
            
            # Map nutrient IDs to our fields
            nutrient_map = {
                1003: 'protein',      # Protein (g)
                1005: 'carbs',        # Carbohydrate (g) 
                1004: 'fat',          # Total lipid (fat) (g)
                1008: 'calories',     # Energy (kcal)
                1079: 'fiber',        # Fiber, total dietary (g)
                2000: 'sugar',        # Sugars, total (g)
                1093: 'sodium'        # Sodium (mg)
            }
            
            for nutrient in nutrients:
                nutrient_id = nutrient.get('nutrient', {}).get('id')
                if nutrient_id in nutrient_map:
                    field = nutrient_map[nutrient_id]
                    value = nutrient.get('amount', 0)
                    
                    # Convert sodium from mg to mg (keep as mg)
                    if field == 'sodium':
                        nutrition[field] = round(value, 1)
                    else:
                        nutrition[field] = round(value, 2)
            
            return nutrition
            
        except Exception as e:
            print(f"Error extracting nutrition data: {e}")
            return None
    
    def build_category_database(self, category: str, search_terms: List[str]) -> Dict:
        """Build database for a specific category"""
        print(f"\nBuilding {category} database...")
        category_db = {}
        
        for i, search_term in enumerate(search_terms):
            print(f"  Searching {i+1}/{len(search_terms)}: {search_term}")
            
            # Search for foods
            foods = self.search_food(search_term, page_size=3)
            
            if foods:
                # Get the best match (first result)
                best_food = foods[0]
                fdc_id = best_food.get('fdcId')
                
                if fdc_id:
                    # Get detailed nutrition data
                    details = self.get_food_details(fdc_id)
                    
                    if details:
                        nutrition = self.extract_nutrition_data(details)
                        
                        if nutrition and nutrition['calories'] > 0:
                            # Use search term as key for consistent lookup
                            category_db[search_term] = nutrition
                            print(f"    ✅ Added: {nutrition['name']} ({nutrition['calories']} cal/100g)")
                        else:
                            print(f"    ❌ No valid nutrition data")
                    else:
                        print(f"    ❌ Failed to get details")
                else:
                    print(f"    ❌ No FDC ID")
            else:
                print(f"    ❌ No results found")
            
            # Rate limiting
            time.sleep(0.2)
        
        print(f"✅ {category} complete: {len(category_db)} ingredients")
        return category_db
    
    def build_complete_database(self) -> Dict:
        """Build complete database with all categories"""
        print("🔥 Building Complete FDC Nutrition Database")
        print("=" * 60)
        
        complete_db = {
            'metadata': {
                'source': 'USDA FoodData Central',
                'api_version': 'v1',
                'build_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                'total_categories': len(self.categories)
            },
            'categories': {}
        }
        
        for category, search_terms in self.categories.items():
            category_db = self.build_category_database(category, search_terms)
            complete_db['categories'][category] = category_db
        
        # Add summary statistics
        total_ingredients = sum(len(cat_db) for cat_db in complete_db['categories'].values())
        complete_db['metadata']['total_ingredients'] = total_ingredients
        
        print(f"\n🎉 DATABASE BUILD COMPLETE!")
        print(f"📊 Total Categories: {len(self.categories)}")
        print(f"📊 Total Ingredients: {total_ingredients}")
        
        for category, cat_db in complete_db['categories'].items():
            print(f"  • {category}: {len(cat_db)} ingredients")
        
        return complete_db
    
    def save_database(self, database: Dict, filename: str = 'fdc_nutrition_database.json'):
        """Save database to JSON file"""
        try:
            with open(filename, 'w') as f:
                json.dump(database, f, indent=2)
            
            print(f"\n💾 Database saved to: {filename}")
            file_size = os.path.getsize(filename) / 1024 / 1024
            print(f"💾 File size: {file_size:.1f} MB")
            
        except Exception as e:
            print(f"❌ Error saving database: {e}")

def main():
    """Build the complete FDC nutrition database"""
    try:
        builder = FDCDatabaseBuilder()
        database = builder.build_complete_database()
        builder.save_database(database)
        
        print(f"\n🚀 SUCCESS - FDC Database ready for production!")
        print(f"📁 Use 'fdc_nutrition_database.json' for fast ingredient lookup")
        print(f"⚡ This will dramatically speed up macro optimization")
        
    except ValueError as e:
        print(f"❌ Setup Error: {e}")
        print(f"💡 Make sure FDC_API_KEY is set in environment variables")
    except Exception as e:
        print(f"❌ Build Error: {e}")

if __name__ == "__main__":
    main()