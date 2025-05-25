import re
import pandas as pd
import os
import streamlit as st
import json

# Recipe database utilities for Fitomics
class RecipeDatabase:
    def __init__(self):
        self.recipes = []
        self.recipe_categories = {
            "breakfast": [],
            "lunch": [],
            "dinner": [],
            "snack": [],
            "smoothie": [],
            "dessert": [],
            "meal_prep": []
        }
        
        # Load recipes from data if available
        self.load_recipes()
    
    def load_recipes(self):
        """Load recipe database from saved file if it exists"""
        try:
            if os.path.exists('data/recipe_database.json'):
                with open('data/recipe_database.json', 'r') as f:
                    data = json.load(f)
                    self.recipes = data.get('recipes', [])
                    self.recipe_categories = data.get('categories', self.recipe_categories)
                return True
        except Exception as e:
            print(f"Error loading recipe database: {e}")
        return False
    
    def save_recipes(self):
        """Save recipe database to file"""
        try:
            os.makedirs('data', exist_ok=True)
            with open('data/recipe_database.json', 'w') as f:
                json.dump({
                    'recipes': self.recipes,
                    'categories': self.recipe_categories
                }, f)
            return True
        except Exception as e:
            print(f"Error saving recipe database: {e}")
        return False
    
    def parse_csv_recipes(self, csv_data):
        """Parse recipe data from CSV files"""
        try:
            df = pd.read_csv(csv_data)
            parsed_recipes = []
            
            for _, row in df.iterrows():
                title = row.get('Title', '')
                description = row.get('Description', '')
                
                if not title or not description:
                    continue
                
                # Parse ingredients and directions from description
                ingredients = self._extract_content(description, "Ingredients", ["Directions", "Instructions", "Method", "For the"])
                directions = self._extract_content(description, ["Directions", "Instructions", "Method"], ["Nutrition", "Notes"])
                
                # Determine recipe category
                category = self._determine_category(title, ingredients)
                
                # Calculate approximate macros
                macros = self._estimate_macros(title, ingredients)
                
                recipe = {
                    'id': row.get('Product ID [Non Editable]', ''),
                    'title': title,
                    'ingredients': ingredients,
                    'directions': directions,
                    'category': category,
                    'macros': macros
                }
                
                parsed_recipes.append(recipe)
            
            return parsed_recipes
        except Exception as e:
            print(f"Error parsing CSV recipes: {e}")
            return []
    
    def add_recipes(self, new_recipes):
        """Add recipes to database and categorize them"""
        existing_ids = [r.get('id') for r in self.recipes]
        
        for recipe in new_recipes:
            if recipe.get('id') not in existing_ids:
                self.recipes.append(recipe)
                
                # Add to appropriate category
                category = recipe.get('category', 'other')
                if category in self.recipe_categories:
                    self.recipe_categories[category].append(recipe)
        
        # Save updated database
        self.save_recipes()
    
    def search_recipes(self, query=None, category=None, macros=None):
        """Search for recipes by query, category, or macro requirements"""
        results = self.recipes.copy()
        
        if query:
            query = query.lower()
            results = [r for r in results if 
                      query in r.get('title', '').lower() or 
                      query in r.get('ingredients', '').lower()]
        
        if category and category != 'all':
            results = [r for r in results if r.get('category') == category]
        
        if macros:
            # Filter by minimum protein, maximum calories, etc.
            if 'min_protein' in macros:
                results = [r for r in results if r.get('macros', {}).get('protein', 0) >= macros['min_protein']]
            
            if 'max_calories' in macros:
                results = [r for r in results if r.get('macros', {}).get('calories', 1000) <= macros['max_calories']]
        
        return results
    
    def get_recipe_by_id(self, recipe_id):
        """Get a recipe by its ID"""
        for recipe in self.recipes:
            if recipe.get('id') == recipe_id:
                return recipe
        return None
    
    def get_recipes_by_category(self, category):
        """Get all recipes in a category"""
        if category in self.recipe_categories:
            return self.recipe_categories[category]
        return []
    
    def _extract_content(self, text, start_markers, end_markers=None):
        """Extract content between markers in the HTML description"""
        if not text:
            return ""
        
        # Clean up HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Make start_markers a list if it's not already
        if not isinstance(start_markers, list):
            start_markers = [start_markers]
        
        # Try each start marker
        content = ""
        for marker in start_markers:
            if marker in text:
                parts = text.split(marker, 1)
                if len(parts) > 1:
                    content = parts[1].strip()
                    break
        
        # Trim at end marker if provided
        if content and end_markers:
            if not isinstance(end_markers, list):
                end_markers = [end_markers]
            
            for marker in end_markers:
                if marker in content:
                    content = content.split(marker, 1)[0].strip()
        
        return content
    
    def _determine_category(self, title, ingredients):
        """Determine recipe category based on title and ingredients"""
        title_lower = title.lower()
        ingredients_lower = ingredients.lower()
        
        # Check for breakfast items
        if any(term in title_lower for term in ['breakfast', 'pancake', 'waffle', 'oat', 'muffin', 'toast', 'egg']):
            return 'breakfast'
        
        # Check for smoothies
        if any(term in title_lower for term in ['smoothie', 'shake', 'protein shake']):
            return 'smoothie'
        
        # Check for desserts
        if any(term in title_lower for term in ['cookie', 'dessert', 'chocolate', 'cake', 'sweet', 'crisp', 'bark']):
            return 'dessert'
        
        # Check for meal prep
        if 'meal prep' in title_lower:
            return 'meal_prep'
        
        # Check for lunch/dinner
        if any(term in title_lower for term in ['bowl', 'salad', 'sandwich', 'wrap', 'burger']):
            return 'lunch'
        
        if any(term in title_lower for term in ['chicken', 'beef', 'salmon', 'fish', 'steak', 'casserole', 'crockpot']):
            return 'dinner'
        
        # Default to snack if none of the above
        if any(term in title_lower for term in ['protein', 'bite', 'snack', 'dip']):
            return 'snack'
        
        # If still uncertain, check common dinner ingredients
        if any(term in ingredients_lower for term in ['chicken breast', 'ground beef', 'fish', 'pork', 'steak']):
            return 'dinner'
        
        # Default to lunch as fallback
        return 'lunch'
    
    def _estimate_macros(self, title, ingredients):
        """Roughly estimate macros based on ingredients mentioned"""
        # This is a very rough estimation and should be replaced with more accurate data
        # In a real application, you would use a nutrition API or database
        ingredients_lower = ingredients.lower()
        
        # Rough base values
        calories = 300
        protein = 15
        carbs = 30
        fat = 10
        
        # Adjust based on common ingredients
        if 'chicken' in ingredients_lower:
            protein += 25
            calories += 150
        if 'beef' in ingredients_lower or 'steak' in ingredients_lower:
            protein += 20
            fat += 15
            calories += 200
        if 'salmon' in ingredients_lower or 'fish' in ingredients_lower:
            protein += 22
            fat += 10
            calories += 180
        if 'rice' in ingredients_lower:
            carbs += 45
            calories += 200
        if 'sweet potato' in ingredients_lower:
            carbs += 30
            calories += 150
        if 'protein powder' in ingredients_lower:
            protein += 20
            calories += 100
        if 'oats' in ingredients_lower:
            carbs += 25
            calories += 150
        if 'avocado' in ingredients_lower:
            fat += 15
            calories += 150
        if 'cheese' in ingredients_lower:
            fat += 10
            protein += 7
            calories += 100
        if 'greek yogurt' in ingredients_lower:
            protein += 15
            calories += 100
        
        # Adjust for smoothies
        if 'smoothie' in title.lower():
            calories = max(250, calories - 50)
            
        # Adjust for desserts
        if any(term in title.lower() for term in ['cookie', 'dessert', 'chocolate', 'cake']):
            carbs += 20
            fat += 5
            calories += 150
        
        return {
            'calories': calories,
            'protein': protein,
            'carbs': carbs,
            'fat': fat
        }

# Initialize recipe database in session state
def get_recipe_database():
    if 'recipe_database' not in st.session_state:
        st.session_state.recipe_database = RecipeDatabase()
    return st.session_state.recipe_database


# Function to display a recipe card
def display_recipe_card(recipe, show_details=False):
    # Display recipe in a card format
    st.subheader(recipe.get('title', 'Recipe'))
    
    # Show macros in a horizontal layout
    macros = recipe.get('macros', {})
    macro_cols = st.columns(4)
    with macro_cols[0]:
        st.metric("Calories", f"{macros.get('calories', 0)} kcal")
    with macro_cols[1]:
        st.metric("Protein", f"{macros.get('protein', 0)}g")
    with macro_cols[2]:
        st.metric("Carbs", f"{macros.get('carbs', 0)}g")
    with macro_cols[3]:
        st.metric("Fat", f"{macros.get('fat', 0)}g")
    
    if show_details:
        # Display ingredients
        st.markdown("### Ingredients")
        ingredients = recipe.get('ingredients', '')
        if ingredients:
            # Clean up and format ingredients list
            ingredients_clean = re.sub(r'\s+', ' ', ingredients).strip()
            ingredients_list = [item.strip() for item in ingredients_clean.split(',') if item.strip()]
            for item in ingredients_list:
                st.markdown(f"- {item}")
        
        # Display directions
        st.markdown("### Directions")
        directions = recipe.get('directions', '')
        if directions:
            # Clean up and format directions
            directions_clean = re.sub(r'\s+', ' ', directions).strip()
            directions_list = [step.strip() for step in directions_clean.split('.') if step.strip()]
            for i, step in enumerate(directions_list):
                st.markdown(f"{i+1}. {step}")
    
    return True


# Function to load the sample recipes
def load_sample_recipes():
    db = get_recipe_database()
    
    # Check if we already have recipes
    if len(db.recipes) > 0:
        return True
    
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Create sample recipes data
    sample_recipes = [
        {
            'id': 'sample1',
            'title': 'Almond Joy Overnight Oats',
            'ingredients': '1/3 cup oats, 1/4 cup unsweetened almond milk, 1/3 cup coconut Greek yogurt, 1 scoop chocolate protein powder, 1/2 tbsp shredded coconut, 1 tbsp dark chocolate chips, 1/2 tsp cocoa powder',
            'directions': 'Mix all ingredients in a jar. Refrigerate overnight. Enjoy in the morning.',
            'category': 'breakfast',
            'macros': {'calories': 350, 'protein': 25, 'carbs': 40, 'fat': 10}
        },
        {
            'id': 'sample2',
            'title': 'Greek Turkey Burgers',
            'ingredients': '24 oz ground turkey, 1/2 cup reduced-fat feta cheese, 4 tsp minced garlic, 1 tsp dried oregano, 1/2 tsp salt, 1/2 tsp black pepper',
            'directions': 'Mix all ingredients. Form into patties. Grill until internal temperature reaches 165°F.',
            'category': 'dinner',
            'macros': {'calories': 300, 'protein': 35, 'carbs': 5, 'fat': 15}
        },
        {
            'id': 'sample3',
            'title': 'Berry Blast Smoothie',
            'ingredients': '1/2 banana, 1/2 cup frozen mixed berries, 1/2 cup spinach, 1/2 cup plain Greek yogurt, 1 scoop vanilla protein powder, 1/2 cup unsweetened almond milk, 1/2 cup ice',
            'directions': 'Blend all ingredients until smooth. Add more liquid if needed.',
            'category': 'smoothie',
            'macros': {'calories': 250, 'protein': 25, 'carbs': 30, 'fat': 5}
        }
    ]
    
    # Add recipes to the database
    db.add_recipes(sample_recipes)
    
    return True