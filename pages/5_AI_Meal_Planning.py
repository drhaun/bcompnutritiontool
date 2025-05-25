import streamlit as st
import pandas as pd
import json
import sys
import os
from fdc_api import search_foods, get_food_details, extract_nutrients, normalize_food_data
import random

# Import recipe database functionality
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
from recipe_database import get_recipe_database, display_recipe_card, load_sample_recipes

st.set_page_config(page_title="AI-Supported Meal & Recipe Planner", layout="wide")

# Apply Fitomics branding
st.markdown(
    """
    <style>
    .main {
        background-color: #f5f5f7;
    }
    .stApp header {
        background-color: #0e0e52;
    }
    h1, h2, h3 {
        color: #0e0e52;
    }
    .stButton>button {
        background-color: #0e0e52;
        color: white;
    }
    .stProgress .st-bo {
        background-color: #0e0e52;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# Display Fitomics title with logo
col1, col2 = st.columns([1, 5])
with col1:
    st.image("images/fitomics-logo.png", width=80)
with col2:
    st.title("AI-Supported Meal & Recipe Planner")

# Initialize session state
if 'food_database' not in st.session_state:
    st.session_state.food_database = []
    
if 'meal_plan' not in st.session_state:
    st.session_state.meal_plan = {
        'breakfast': [],
        'lunch': [],
        'dinner': [],
        'snacks': []
    }
    
# Initialize user preferences if not present
if 'food_preferences' not in st.session_state:
    st.session_state.food_preferences = {
        'liked_foods': [],
        'disliked_foods': [],
        'cuisine_preferences': [],
        'dietary_restrictions': []
    }
    
# Import recipes from our recipe database
def import_recipes_to_ai_planner():
    """Import recipes from recipe database to AI meal planner"""
    recipe_db = get_recipe_database()
    
    # Check if we already have recipes
    if len(recipe_db.recipes) == 0:
        # Try to import from CSV files if recipes don't exist
        csv_files = [
            "attached_assets/products_May-25_10-19-19AM.csv",
            "attached_assets/products_May-25_10-19-44AM.csv",
            "attached_assets/products_May-25_10-20-08AM.csv"
        ]
        
        for csv_file in csv_files:
            try:
                if os.path.exists(csv_file):
                    with open(csv_file, 'r') as f:
                        new_recipes = recipe_db.parse_csv_recipes(f)
                        if new_recipes:
                            recipe_db.add_recipes(new_recipes)
            except Exception as e:
                print(f"Error importing recipes from {csv_file}: {e}")
    
    return recipe_db.recipes

# Load recipes for use in the AI Meal Planner
recipe_collection = import_recipes_to_ai_planner()
    
# Initialize custom macro variables to prevent errors
if 'custom_protein' not in st.session_state:
    st.session_state.custom_protein = 150
    
if 'custom_carbs' not in st.session_state:
    st.session_state.custom_carbs = 200
    
if 'custom_fat' not in st.session_state:
    st.session_state.custom_fat = 70
else:
    # Ensure all required meal types exist in the meal plan
    required_meal_types = ['breakfast', 'lunch', 'dinner', 'snacks']
    for meal_type in required_meal_types:
        if meal_type not in st.session_state.meal_plan:
            st.session_state.meal_plan[meal_type] = []
    
if 'search_results' not in st.session_state:
    st.session_state.search_results = []

# Function to calculate meal nutrition
def calculate_meal_nutrition(meal_items):
    total = {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    }
    
    for item in meal_items:
        if 'portion' in item and item['portion']:
            portion_multiplier = item['portion'] / 100  # Assuming standard 100g portion
            total['calories'] += item['nutrients'].get('calories', 0) * portion_multiplier
            total['protein'] += item['nutrients'].get('protein', 0) * portion_multiplier
            total['carbs'] += item['nutrients'].get('carbs', 0) * portion_multiplier
            total['fat'] += item['nutrients'].get('fat', 0) * portion_multiplier
            total['fiber'] += item['nutrients'].get('fiber', 0) * portion_multiplier
    
    return total

# Function to calculate daily nutrition totals
def calculate_daily_nutrition():
    daily_total = {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    }
    
    for meal_type, items in st.session_state.meal_plan.items():
        meal_nutrition = calculate_meal_nutrition(items)
        for nutrient in daily_total:
            daily_total[nutrient] += meal_nutrition[nutrient]
            
    return daily_total

# Add a food item to a meal
def add_to_meal(food_item, meal_type, portion=100):
    # Create a copy of the food item with the portion information
    meal_item = food_item.copy()
    meal_item['portion'] = portion
    
    # Ensure the meal type exists in the meal plan
    meal_type = meal_type.lower()  # Case insensitive
    if meal_type not in st.session_state.meal_plan:
        st.session_state.meal_plan[meal_type] = []
    
    # Add to the meal plan
    st.session_state.meal_plan[meal_type].append(meal_item)
    st.success(f"Added {food_item['description']} to {meal_type}")

# Remove a food item from a meal
def remove_from_meal(meal_type, index):
    del st.session_state.meal_plan[meal_type][index]
    st.rerun()

# Update portion size for a food item
def update_portion(meal_type, index, new_portion):
    st.session_state.meal_plan[meal_type][index]['portion'] = new_portion

# Main app layout
st.sidebar.header("Nutrition Targets")

# Create tabs for manual entry vs. day-specific targets
target_tabs = st.sidebar.tabs(["Manual Entry", "Use Day Targets"])

with target_tabs[0]:
    # Get nutrition targets from session state if available
    if 'target_calories' in st.session_state:
        default_calories = st.session_state.target_calories
        default_protein = st.session_state.custom_protein
        default_carbs = st.session_state.custom_carbs
        default_fat = st.session_state.custom_fat
    else:
        default_calories = 2000
        default_protein = 150
        default_carbs = 200
        default_fat = 70

    # Allow user to set nutrition targets manually
    target_calories = st.number_input("Target Calories", 1200, 5000, default_calories)
    target_protein = st.number_input("Target Protein (g)", 50, 300, default_protein)
    target_carbs = st.number_input("Target Carbs (g)", 50, 500, default_carbs)
    target_fat = st.number_input("Target Fat (g)", 20, 200, default_fat)
    
    # Save to session state
    st.session_state.target_calories = target_calories
    st.session_state.custom_protein = target_protein
    st.session_state.custom_carbs = target_carbs
    st.session_state.custom_fat = target_fat

with target_tabs[1]:
    # Check if day-specific nutrition targets exist
    has_day_targets = False
    selected_day = None
    
    if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
        has_day_targets = True
        
        # Let user select a day
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        selected_day = st.selectbox("Select Day:", days, key="day_target_select")
        
        if selected_day in st.session_state.day_specific_nutrition:
            day_targets = st.session_state.day_specific_nutrition[selected_day]
            
            # Display the day's targets
            st.success(f"Using {selected_day}'s nutrition targets")
            
            # Show the target macros
            target_cols = st.columns(4)
            with target_cols[0]:
                st.metric("Target Calories", f"{day_targets.get('target_calories', 0)} kcal")
                target_calories = day_targets.get('target_calories', 2000)
            with target_cols[1]:
                st.metric("Target Protein", f"{day_targets.get('protein', 0)}g")
                target_protein = day_targets.get('protein', 150)
            with target_cols[2]:
                st.metric("Target Carbs", f"{day_targets.get('carbs', 0)}g")
                target_carbs = day_targets.get('carbs', 200)
            with target_cols[3]:
                st.metric("Target Fat", f"{day_targets.get('fat', 0)}g")
                target_fat = day_targets.get('fat', 70)
                
            # Save to session state
            st.session_state.target_calories = target_calories
            st.session_state.custom_protein = target_protein
            st.session_state.custom_carbs = target_carbs
            st.session_state.custom_fat = target_fat
        else:
            st.warning(f"No nutrition targets found for {selected_day}. Please set them in the Weekly Schedule and Nutrition page.")
    else:
        st.info("Day-specific nutrition targets not found. Please set them in the Weekly Schedule and Nutrition page first.")

# Add user preference section to sidebar
st.sidebar.header("Food Preferences")
with st.sidebar.expander("Set Your Food Preferences", expanded=False):
    # Foods you like
    liked_foods = st.text_area(
        "Foods You Like",
        value=", ".join(st.session_state.food_preferences['liked_foods']),
        help="Enter foods you enjoy, separated by commas"
    )
    
    # Foods you dislike
    disliked_foods = st.text_area(
        "Foods You Dislike",
        value=", ".join(st.session_state.food_preferences['disliked_foods']),
        help="Enter foods you want to avoid, separated by commas"
    )
    
    # Cuisine preferences
    cuisine_options = ["American", "Italian", "Mexican", "Asian", "Mediterranean", "Indian", "Middle Eastern", "French"]
    selected_cuisines = st.multiselect(
        "Preferred Cuisines",
        options=cuisine_options,
        default=st.session_state.food_preferences['cuisine_preferences']
    )
    
    # Dietary restrictions
    diet_options = ["None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Low-Carb", "Low-Fat"]
    selected_diet = st.selectbox(
        "Dietary Restrictions",
        options=diet_options,
        index=0 if not st.session_state.food_preferences['dietary_restrictions'] else 
             diet_options.index(st.session_state.food_preferences['dietary_restrictions'][0])
    )
    
    # Save button
    if st.button("Save Preferences"):
        st.session_state.food_preferences['liked_foods'] = [food.strip() for food in liked_foods.split(",") if food.strip()]
        st.session_state.food_preferences['disliked_foods'] = [food.strip() for food in disliked_foods.split(",") if food.strip()]
        st.session_state.food_preferences['cuisine_preferences'] = selected_cuisines
        st.session_state.food_preferences['dietary_restrictions'] = [selected_diet] if selected_diet != "None" else []
        st.success("Preferences saved! Your meal recommendations will now be personalized.")
        
    st.info("These preferences will be used to make smarter meal recommendations tailored to your tastes.")

# Food search section
st.header("Food Search")
search_col1, search_col2 = st.columns([3, 1])

with search_col1:
    search_query = st.text_input("Search for foods:", placeholder="e.g. chicken breast, apple, rice")

with search_col2:
    search_button = st.button("Search", type="primary")
    
    # Categories dropdown for filtering results
    food_categories = ["All", "Protein-Rich", "Carb-Rich", "Fat-Rich", "Vegetables", "Fruits", "Dairy", "Grains"]
    selected_category = st.selectbox("Filter by category", food_categories)

# Process search when button is clicked
if search_button and search_query:
    with st.spinner("Searching for foods..."):
        # In a full implementation, this would call the FDC API
        # For now, generate sample results based on common foods
        common_foods = {
            "chicken breast": {"protein": 31, "carbs": 0, "fat": 3.6, "calories": 165, "fiber": 0, "category": "Protein-Rich"},
            "salmon": {"protein": 25, "carbs": 0, "fat": 13, "calories": 206, "fiber": 0, "category": "Protein-Rich"},
            "ground beef": {"protein": 26, "carbs": 0, "fat": 15, "calories": 250, "fiber": 0, "category": "Protein-Rich"},
            "rice": {"protein": 2.7, "carbs": 28, "fat": 0.3, "calories": 130, "fiber": 0.4, "category": "Carb-Rich"},
            "sweet potato": {"protein": 1.6, "carbs": 20, "fat": 0.1, "calories": 86, "fiber": 3, "category": "Carb-Rich"},
            "oats": {"protein": 13, "carbs": 68, "fat": 6.9, "calories": 389, "fiber": 10, "category": "Carb-Rich"},
            "olive oil": {"protein": 0, "carbs": 0, "fat": 100, "calories": 884, "fiber": 0, "category": "Fat-Rich"},
            "avocado": {"protein": 2, "carbs": 9, "fat": 15, "calories": 160, "fiber": 7, "category": "Fat-Rich"},
            "almonds": {"protein": 21, "carbs": 22, "fat": 49, "calories": 576, "fiber": 12.5, "category": "Fat-Rich"},
            "broccoli": {"protein": 2.8, "carbs": 7, "fat": 0.4, "calories": 34, "fiber": 2.6, "category": "Vegetables"},
            "spinach": {"protein": 2.9, "carbs": 3.6, "fat": 0.4, "calories": 23, "fiber": 2.2, "category": "Vegetables"},
            "apple": {"protein": 0.3, "carbs": 14, "fat": 0.2, "calories": 52, "fiber": 2.4, "category": "Fruits"},
            "banana": {"protein": 1.1, "carbs": 22.8, "fat": 0.3, "calories": 89, "fiber": 2.6, "category": "Fruits"},
            "bread": {"protein": 9, "carbs": 49, "fat": 3.2, "calories": 265, "fiber": 2.7, "category": "Grains"},
            "egg": {"protein": 13, "carbs": 1, "fat": 11, "calories": 155, "fiber": 0, "category": "Protein-Rich"},
            "milk": {"protein": 3.4, "carbs": 5, "fat": 3.6, "calories": 65, "fiber": 0, "category": "Dairy"},
            "yogurt": {"protein": 10, "carbs": 3.6, "fat": 0.4, "calories": 59, "fiber": 0, "category": "Dairy"},
            "cheese": {"protein": 25, "carbs": 1.3, "fat": 33, "calories": 402, "fiber": 0, "category": "Dairy"},
            "pasta": {"protein": 5, "carbs": 25, "fat": 1.1, "calories": 131, "fiber": 1.8, "category": "Grains"},
            "quinoa": {"protein": 4.4, "carbs": 21, "fat": 1.9, "calories": 120, "fiber": 2.8, "category": "Grains"}
        }
        
        # Filter foods based on search query
        results = []
        for food_name, food_data in common_foods.items():
            if search_query.lower() in food_name.lower():
                food_id = f"food_{random.randint(10000, 99999)}"  # Generate a random ID
                food_item = {
                    "fdc_id": food_id,
                    "description": food_name.title(),
                    "category": food_data["category"],
                    "nutrients": {
                        "protein": food_data["protein"],
                        "carbs": food_data["carbs"],
                        "fat": food_data["fat"],
                        "calories": food_data["calories"],
                        "fiber": food_data["fiber"]
                    }
                }
                results.append(food_item)
                
        # Add some similar items to provide more results
        if not results:
            for food_name, food_data in common_foods.items():
                food_id = f"food_{random.randint(10000, 99999)}"
                food_item = {
                    "fdc_id": food_id,
                    "description": food_name.title(),
                    "category": food_data["category"],
                    "nutrients": {
                        "protein": food_data["protein"],
                        "carbs": food_data["carbs"],
                        "fat": food_data["fat"],
                        "calories": food_data["calories"],
                        "fiber": food_data["fiber"]
                    }
                }
                results.append(food_item)
                if len(results) >= 5:  # Limit to 5 random suggestions
                    break
                
        st.session_state.search_results = results

# Display search results
if st.session_state.search_results:
    st.subheader("Search Results")
    
    # Filter results by category if needed
    filtered_results = st.session_state.search_results
    if selected_category != "All":
        filtered_results = [item for item in st.session_state.search_results if item.get('category') == selected_category]
    
    if not filtered_results:
        st.info("No foods found in this category. Try a different category or search term.")
    
    # Create grid layout for search results
    result_cols = st.columns(3)
    for i, food_item in enumerate(filtered_results):
        with result_cols[i % 3]:
            st.markdown(f"##### {food_item['description']}")
            st.markdown(f"**Nutrition per 100g:**")
            st.markdown(f"Calories: {food_item['nutrients']['calories']} kcal")
            st.markdown(f"Protein: {food_item['nutrients']['protein']}g | Carbs: {food_item['nutrients']['carbs']}g | Fat: {food_item['nutrients']['fat']}g")
            
            # Add to meal buttons
            meal_cols = st.columns(2)
            portion = st.number_input(f"Portion (g)", min_value=10, max_value=1000, value=100, step=10, key=f"portion_{food_item['fdc_id']}")
            
            # Dropdown for meal selection
            meal_options = ["Breakfast", "Lunch", "Dinner", "Snacks"]
            selected_meal = st.selectbox("Add to", meal_options, key=f"meal_{food_item['fdc_id']}")
            
            # Add to meal button
            if st.button("Add to meal", key=f"add_{food_item['fdc_id']}"):
                add_to_meal(food_item, selected_meal.lower(), portion)
            
            st.markdown("---")

# Display meal plan
st.header("Your Meal Plan")

# Use tabs for different meals
tab1, tab6, tab2, tab3, tab4, tab5 = st.tabs(["Overview", "Recipe Browser", "Breakfast", "Lunch", "Dinner", "Snacks"])

# Recipe Browser tab
with tab6:
    # Create recipe browser interface
    st.header("Recipe Browser")
    
    # Get recipe database
    recipe_db = get_recipe_database()
    
    # Recipe search and filter
    col1, col2 = st.columns(2)
    
    with col1:
        recipe_search = st.text_input("Search recipes:", 
                           key="recipe_search_ai",
                           placeholder="Enter recipe name or ingredient")
    
    with col2:
        # Get all available categories
        categories = list(recipe_db.recipe_categories.keys())
        categories.insert(0, "all")
        
        selected_category = st.selectbox(
            "Filter by category:",
            options=[c.replace('_', ' ').capitalize() for c in categories],
            key="recipe_category_ai"
        )
        # Convert display category back to category key
        filter_category = selected_category.lower().replace(' ', '_') if selected_category.lower() != "all" else None
    
    # Search for recipes
    search_results = recipe_db.search_recipes(query=recipe_search, category=filter_category)
    
    if search_results:
        st.success(f"Found {len(search_results)} matching recipes.")
        
        # Display recipes in a grid
        num_cols = 2  # Number of columns in the grid
        for i in range(0, len(search_results), num_cols):
            # Create a row of columns
            cols = st.columns(num_cols)
            
            # Fill each column with a recipe
            for j in range(num_cols):
                if i + j < len(search_results):
                    recipe = search_results[i + j]
                    with cols[j]:
                        st.markdown(f"### {recipe.get('title')}")
                        
                        # Show macros
                        macros = recipe.get('macros', {})
                        st.write(f"Calories: {macros.get('calories', 0)} | Protein: {macros.get('protein', 0)}g")
                        
                        # Show category
                        category = recipe.get('category', 'other')
                        st.write(f"Category: {category.replace('_', ' ').capitalize()}")
                        
                        # View details button
                        if st.button("View Details", key=f"view_recipe_{recipe.get('id')}_{i+j}"):
                            st.session_state.selected_recipe_ai = recipe.get('id')
    else:
        st.info("No matching recipes found. Try a different search or category.")
    
    # Show selected recipe details
    if 'selected_recipe_ai' in st.session_state and st.session_state.selected_recipe_ai:
        st.markdown("---")
        st.subheader("Recipe Details")
        
        # Get recipe
        recipe = recipe_db.get_recipe_by_id(st.session_state.selected_recipe_ai)
        
        if recipe:
            # Display recipe details
            display_recipe_card(recipe, show_details=True)
            
            # Add to meal section
            st.subheader("Add to Meal Plan")
            
            meal_col1, meal_col2 = st.columns(2)
            
            with meal_col1:
                # Select meal
                meal_options = ["Breakfast", "Lunch", "Dinner", "Snacks"]
                meal_choice = st.selectbox(
                    "Add to which meal?", 
                    meal_options,
                    key=f"meal_choice_recipe"
                )
            
            with meal_col2:
                # Portion size
                portion = st.number_input(
                    "Portion size (serving):",
                    min_value=1,
                    max_value=5,
                    value=1,
                    step=1,
                    key=f"recipe_portion"
                )
            
            # Add to meal button
            if st.button("Add to Meal Plan", key=f"add_recipe_to_meal"):
                # Convert recipe to food item format
                macros = recipe.get('macros', {})
                recipe_as_food = {
                    'description': recipe.get('title', 'Recipe'),
                    'fdcId': f"recipe_{recipe.get('id')}",
                    'brandName': 'Fitomics Recipe',
                    'isRecipe': True,
                    'nutrients': {
                        'calories': macros.get('calories', 0),
                        'protein': macros.get('protein', 0),
                        'carbs': macros.get('carbs', 0),
                        'fat': macros.get('fat', 0),
                        'fiber': macros.get('fiber', 0)
                    }
                }
                
                # Add to meal plan (portion is in servings, convert to grams)
                add_to_meal(recipe_as_food, meal_choice.lower(), portion * 100)
                st.success(f"Added {recipe.get('title')} to {meal_choice}")
                
                # Clear selected recipe
                st.session_state.selected_recipe_ai = None
                st.rerun()
            
            # Close details button
            if st.button("Close Details", key=f"close_recipe_details"):
                st.session_state.selected_recipe_ai = None
                st.rerun()

# Overview tab - display daily nutrition totals and progress toward goals
with tab1:
    daily_nutrition = calculate_daily_nutrition()
    
    st.subheader("Daily Nutrition Totals")
    
    # Calculate percentages of targets
    cal_pct = min(100, round((daily_nutrition['calories'] / target_calories) * 100))
    protein_pct = min(100, round((daily_nutrition['protein'] / target_protein) * 100))
    carbs_pct = min(100, round((daily_nutrition['carbs'] / target_carbs) * 100))
    fat_pct = min(100, round((daily_nutrition['fat'] / target_fat) * 100))
    
    # Display progress bars
    st.markdown("### Calories")
    st.markdown(f"**{int(daily_nutrition['calories'])} / {target_calories} kcal** ({cal_pct}%)")
    st.progress(cal_pct / 100)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("### Protein")
        st.markdown(f"**{int(daily_nutrition['protein'])} / {target_protein} g** ({protein_pct}%)")
        st.progress(protein_pct / 100)
    
    with col2:
        st.markdown("### Carbs")
        st.markdown(f"**{int(daily_nutrition['carbs'])} / {target_carbs} g** ({carbs_pct}%)")
        st.progress(carbs_pct / 100)
    
    with col3:
        st.markdown("### Fat")
        st.markdown(f"**{int(daily_nutrition['fat'])} / {target_fat} g** ({fat_pct}%)")
        st.progress(fat_pct / 100)
    
    # Display fiber (no specific target)
    st.markdown(f"**Fiber:** {int(daily_nutrition['fiber'])} g")
    
    # Meal distribution chart
    st.subheader("Meal Distribution")
    
    meal_data = {}
    for meal_type in st.session_state.meal_plan:
        meal_data[meal_type] = calculate_meal_nutrition(st.session_state.meal_plan[meal_type])
    
    # Create a DataFrame for the meal distribution
    meal_df = pd.DataFrame({
        'Meal': list(meal_data.keys()),
        'Calories': [meal_data[meal]['calories'] for meal in meal_data],
        'Protein (g)': [meal_data[meal]['protein'] for meal in meal_data],
        'Carbs (g)': [meal_data[meal]['carbs'] for meal in meal_data],
        'Fat (g)': [meal_data[meal]['fat'] for meal in meal_data]
    })
    
    st.dataframe(meal_df, hide_index=True, use_container_width=True)

# Individual meal tabs
def render_meal_tab(meal_type):
    st.subheader(f"{meal_type.title()} Items")
    
    if not st.session_state.meal_plan[meal_type.lower()]:
        st.info(f"No foods added to {meal_type} yet. Search for foods and add them to your meal plan.")
    else:
        # Calculate meal nutrition
        meal_nutrition = calculate_meal_nutrition(st.session_state.meal_plan[meal_type.lower()])
        
        # Display meal nutrition summary
        st.markdown(f"**Total Nutrition:** {int(meal_nutrition['calories'])} kcal, " + 
                  f"{int(meal_nutrition['protein'])}g protein, " + 
                  f"{int(meal_nutrition['carbs'])}g carbs, " + 
                  f"{int(meal_nutrition['fat'])}g fat, " +
                  f"{int(meal_nutrition['fiber'])}g fiber")
        
        st.markdown("---")
        
        # List meal items with option to edit/remove
        for i, item in enumerate(st.session_state.meal_plan[meal_type.lower()]):
            col1, col2, col3 = st.columns([3, 2, 1])
            
            with col1:
                st.markdown(f"**{item['description']}**")
                
                # Display nutrition for this item based on portion
                portion = item['portion']
                portion_factor = portion / 100  # Calculate relative to 100g
                
                cal = item['nutrients']['calories'] * portion_factor
                protein = item['nutrients']['protein'] * portion_factor
                carbs = item['nutrients']['carbs'] * portion_factor
                fat = item['nutrients']['fat'] * portion_factor
                
                st.markdown(f"{int(cal)} kcal, {int(protein)}g protein, {int(carbs)}g carbs, {int(fat)}g fat")
            
            with col2:
                # Portion size adjuster
                new_portion = st.number_input(
                    "Portion (g)", 
                    min_value=10, 
                    max_value=1000, 
                    value=int(item['portion']), 
                    step=10,
                    key=f"{meal_type}_{i}_portion"
                )
                
                if new_portion != item['portion']:
                    update_portion(meal_type.lower(), i, new_portion)
                    st.rerun()
            
            with col3:
                # Remove button
                if st.button("Remove", key=f"remove_{meal_type}_{i}"):
                    remove_from_meal(meal_type.lower(), i)
            
            st.markdown("---")

# Render each meal tab
with tab2:
    render_meal_tab("breakfast")

with tab3:
    render_meal_tab("lunch")

with tab4:
    render_meal_tab("dinner")

with tab5:
    render_meal_tab("snacks")

# Recipe Generator
st.header("Recipe Generator")

# Create expander to save space
with st.expander("Generate recipe based on your macronutrient needs", expanded=False):
    # Calculate remaining macros needed for the day
    daily_nutrition = calculate_daily_nutrition()
    remaining_cals = max(0, target_calories - daily_nutrition['calories'])
    remaining_protein = max(0, target_protein - daily_nutrition['protein'])
    remaining_carbs = max(0, target_carbs - daily_nutrition['carbs'])
    remaining_fat = max(0, target_fat - daily_nutrition['fat'])
    
    st.subheader("Remaining Nutrition for Today")
    st.markdown(f"Based on your current meal plan, you still need:")
    st.markdown(f"**Calories:** {int(remaining_cals)} kcal")
    st.markdown(f"**Protein:** {int(remaining_protein)}g")
    st.markdown(f"**Carbs:** {int(remaining_carbs)}g")
    st.markdown(f"**Fat:** {int(remaining_fat)}g")
    
    st.markdown("---")
    
    # Options for recipe generation
    recipe_cols = st.columns(2)
    
    with recipe_cols[0]:
        recipe_type = st.radio(
            "Recipe Type", 
            ["Meal", "Snack"],
            index=0
        )
        
        cuisine_type = st.selectbox(
            "Cuisine", 
            ["Any", "American", "Italian", "Mexican", "Asian", "Mediterranean", "Indian"]
        )
        
    with recipe_cols[1]:
        # Adjust recipe target macros with sliders
        st.markdown("### Recipe Target Macros")
        st.markdown("Adjust what percentage of your remaining macros this recipe should provide:")
        
        macro_pct = st.slider("Percentage of remaining macros", 10, 100, 50)
        
        target_recipe_cals = int(remaining_cals * (macro_pct / 100))
        target_recipe_protein = int(remaining_protein * (macro_pct / 100))
        target_recipe_carbs = int(remaining_carbs * (macro_pct / 100))
        target_recipe_fat = int(remaining_fat * (macro_pct / 100))
        
        st.markdown(f"Recipe will aim for: **{target_recipe_cals} kcal**, " + 
                   f"**{target_recipe_protein}g protein**, " + 
                   f"**{target_recipe_carbs}g carbs**, " + 
                   f"**{target_recipe_fat}g fat**")
    
    # Use saved preferences instead of separate checkboxes
    st.markdown("### Dietary Preferences")
    
    # Show current preferences
    pref_cols = st.columns(2)
    
    with pref_cols[0]:
        st.markdown("#### Current Preferences:")
        
        # Display liked foods
        if st.session_state.food_preferences['liked_foods']:
            st.markdown("**Foods you like:**")
            for food in st.session_state.food_preferences['liked_foods']:
                st.markdown(f"- {food}")
        else:
            st.markdown("**Foods you like:** None specified")
            
        # Display cuisine preferences
        if st.session_state.food_preferences['cuisine_preferences']:
            st.markdown("**Preferred cuisines:**")
            for cuisine in st.session_state.food_preferences['cuisine_preferences']:
                st.markdown(f"- {cuisine}")
        else:
            st.markdown("**Preferred cuisines:** None specified")
    
    with pref_cols[1]:
        # Display disliked foods
        if st.session_state.food_preferences['disliked_foods']:
            st.markdown("**Foods to avoid:**")
            for food in st.session_state.food_preferences['disliked_foods']:
                st.markdown(f"- {food}")
        else:
            st.markdown("**Foods to avoid:** None specified")
            
        # Display dietary restrictions
        if st.session_state.food_preferences['dietary_restrictions']:
            st.markdown("**Dietary restriction:**")
            for restriction in st.session_state.food_preferences['dietary_restrictions']:
                st.markdown(f"- {restriction}")
        else:
            st.markdown("**Dietary restriction:** None specified")
    
    st.markdown("*To update preferences, use the Food Preferences section in the sidebar.*")
    st.markdown("---")
    
    # Additional recipe customization options
    recipe_cols = st.columns(2)
    
    with recipe_cols[0]:
        meal_time = st.selectbox(
            "Meal Time", 
            ["Breakfast", "Lunch", "Dinner", "Snack"],
            index=0
        )
        
        # Default to preferred cuisines if available, otherwise show all options
        cuisine_options = ["Any"]
        if st.session_state.food_preferences['cuisine_preferences']:
            cuisine_options.extend(st.session_state.food_preferences['cuisine_preferences'])
        else:
            cuisine_options.extend(["American", "Italian", "Mexican", "Asian", "Mediterranean", "Indian", "Middle Eastern"])
        
        cuisine_type = st.selectbox("Cuisine", cuisine_options)
        
    with recipe_cols[1]:
        special_request = st.text_area(
            "Special Recipe Request (optional)",
            placeholder="E.g., 'quick and easy', 'meal prep friendly', 'high protein', etc."
        )
    
    # Generate recipe button
    if st.button("Generate Recipe", type="primary"):
        with st.spinner("Creating your personalized recipe..."):
            # In a full implementation, this would use an AI model with preferences
            # For now, show sample data with preference-based adjustments
            
            st.success("Recipe Generated Based on Your Preferences!")
            
            # Create a recipe name that reflects preferences
            recipe_name = "Personalized Recipe"
            
            # Incorporate cuisine type
            cuisine_prefix = ""
            if cuisine_type != "Any":
                cuisine_prefix = f"{cuisine_type} "
            
            # Incorporate dietary restrictions
            diet_suffix = ""
            if st.session_state.food_preferences['dietary_restrictions']:
                diet_suffix = f" ({st.session_state.food_preferences['dietary_restrictions'][0]})"
            
            # Create a more personalized recipe name
            if meal_time == "Breakfast":
                if cuisine_type == "Mediterranean":
                    recipe_name = f"{cuisine_prefix}Egg & Vegetable Scramble{diet_suffix}"
                elif cuisine_type == "Mexican":
                    recipe_name = f"{cuisine_prefix}Breakfast Burrito Bowl{diet_suffix}"
                else:
                    recipe_name = f"{cuisine_prefix}Protein Breakfast Bowl{diet_suffix}"
            elif meal_time == "Lunch":
                if cuisine_type == "Mediterranean":
                    recipe_name = f"{cuisine_prefix}Chicken & Vegetable Bowl{diet_suffix}"
                elif cuisine_type == "Mexican":
                    recipe_name = f"{cuisine_prefix}Bean & Rice Bowl{diet_suffix}"
                else:
                    recipe_name = f"{cuisine_prefix}Power Lunch Bowl{diet_suffix}"
            elif meal_time == "Dinner":
                if cuisine_type == "Mediterranean":
                    recipe_name = f"{cuisine_prefix}Herb-Roasted Protein & Vegetables{diet_suffix}"
                elif cuisine_type == "Mexican":
                    recipe_name = f"{cuisine_prefix}Fajita Bowl{diet_suffix}"
                else:
                    recipe_name = f"{cuisine_prefix}Balanced Dinner Plate{diet_suffix}"
            else:  # Snack
                recipe_name = f"{cuisine_prefix}Protein-Packed Snack Mix{diet_suffix}"
                
            st.subheader(recipe_name)
            
            # Create ingredients list based on preferences
            st.markdown("#### Ingredients:")
            
            # Default ingredients
            ingredients = []
            
            # Add protein based on preferences and dietary restrictions
            protein_options = []
            is_vegetarian = any(r == "Vegetarian" or r == "Vegan" for r in st.session_state.food_preferences['dietary_restrictions'])
            is_vegan = any(r == "Vegan" for r in st.session_state.food_preferences['dietary_restrictions'])
            
            if is_vegan:
                protein_options = ["tofu", "tempeh", "beans", "lentils", "chickpeas", "quinoa"]
            elif is_vegetarian:
                protein_options = ["tofu", "tempeh", "beans", "lentils", "chickpeas", "eggs", "greek yogurt", "cottage cheese"]
            else:
                protein_options = ["chicken breast", "salmon", "ground turkey", "lean beef", "eggs"]
            
            # Filter protein options based on liked and disliked foods
            filtered_proteins = protein_options.copy()
            
            # Remove disliked proteins
            if st.session_state.food_preferences['disliked_foods']:
                filtered_proteins = [p for p in filtered_proteins 
                                  if not any(d.lower() in p.lower() for d in st.session_state.food_preferences['disliked_foods'])]
            
            # Find preferred proteins
            preferred_proteins = []
            if st.session_state.food_preferences['liked_foods']:
                preferred_proteins = [p for p in filtered_proteins 
                                    if any(l.lower() in p.lower() for l in st.session_state.food_preferences['liked_foods'])]
            
            # Select the protein
            if preferred_proteins:
                selected_protein = preferred_proteins[0]
            elif filtered_proteins:
                selected_protein = filtered_proteins[0]
            else:
                selected_protein = protein_options[0]
            
            # Add the protein to ingredients
            if meal_time in ["Breakfast", "Lunch", "Dinner"]:
                ingredients.append(f"4 oz {selected_protein}")
            else:
                ingredients.append(f"2 oz {selected_protein}")
            
            # Add carbs based on preferences
            carb_options = ["brown rice", "quinoa", "sweet potato", "whole grain bread", "oats"]
            
            # Filter carb options
            filtered_carbs = carb_options.copy()
            
            # Remove disliked carbs
            if st.session_state.food_preferences['disliked_foods']:
                filtered_carbs = [c for c in filtered_carbs 
                               if not any(d.lower() in c.lower() for d in st.session_state.food_preferences['disliked_foods'])]
            
            # Find preferred carbs
            preferred_carbs = []
            if st.session_state.food_preferences['liked_foods']:
                preferred_carbs = [c for c in filtered_carbs 
                                 if any(l.lower() in c.lower() for l in st.session_state.food_preferences['liked_foods'])]
            
            # Select the carb
            if preferred_carbs:
                selected_carb = preferred_carbs[0]
            elif filtered_carbs:
                selected_carb = filtered_carbs[0]
            else:
                selected_carb = carb_options[0]
            
            if meal_time in ["Breakfast", "Lunch", "Dinner"]:
                ingredients.append(f"1/2 cup {selected_carb}")
            
            # Add vegetables
            vegetable_options = ["broccoli", "spinach", "kale", "bell peppers", "zucchini", "carrots", "mixed vegetables"]
            
            # Filter vegetable options
            filtered_veggies = vegetable_options.copy()
            
            # Remove disliked vegetables
            if st.session_state.food_preferences['disliked_foods']:
                filtered_veggies = [v for v in filtered_veggies 
                                 if not any(d.lower() in v.lower() for d in st.session_state.food_preferences['disliked_foods'])]
            
            # Find preferred vegetables
            preferred_veggies = []
            if st.session_state.food_preferences['liked_foods']:
                preferred_veggies = [v for v in filtered_veggies 
                                   if any(l.lower() in v.lower() for l in st.session_state.food_preferences['liked_foods'])]
            
            # Select the vegetable
            if preferred_veggies:
                selected_veggie = preferred_veggies[0]
            elif filtered_veggies:
                selected_veggie = filtered_veggies[0]
            else:
                selected_veggie = "mixed vegetables"
                
            ingredients.append(f"1 cup {selected_veggie}")
            
            # Add fat source
            fat_options = ["olive oil", "avocado", "nuts", "seeds"]
            
            # Select fat based on preferences
            selected_fat = "olive oil"  # Default
            
            if st.session_state.food_preferences['liked_foods']:
                for fat in fat_options:
                    if any(fat.lower() in l.lower() for l in st.session_state.food_preferences['liked_foods']):
                        selected_fat = fat
                        break
            
            ingredients.append(f"1 tbsp {selected_fat}")
            
            # Add seasoning based on cuisine
            if cuisine_type == "Mediterranean":
                ingredients.append("1 tsp oregano, lemon juice, salt and pepper")
            elif cuisine_type == "Mexican":
                ingredients.append("1 tsp cumin, chili powder, lime juice, salt and pepper")
            elif cuisine_type == "Asian":
                ingredients.append("1 tsp ginger, garlic, soy sauce, sesame oil")
            else:
                ingredients.append("Herbs and spices to taste")
            
            # Display ingredients
            for ingredient in ingredients:
                st.markdown(f"- {ingredient}")
                
            # Sample recipe instructions based on meal type
            st.markdown("#### Instructions:")
            
            if meal_time == "Breakfast":
                st.markdown("1. Heat a non-stick pan over medium heat.")
                st.markdown(f"2. Cook {selected_protein} until done.")
                st.markdown(f"3. Add {selected_veggie} and sauté until tender.")
                st.markdown("4. Season with herbs and spices.")
                st.markdown(f"5. Serve with a side of {selected_carb}.")
            elif meal_time in ["Lunch", "Dinner"]:
                st.markdown(f"1. Cook {selected_carb} according to package instructions.")
                st.markdown(f"2. Season and cook {selected_protein}.")
                st.markdown(f"3. Sauté the {selected_veggie} with {selected_fat}.")
                st.markdown("4. Combine all ingredients in a bowl.")
                st.markdown("5. Add seasonings and mix well.")
            else:  # Snack
                st.markdown("1. Combine all ingredients in a container.")
                st.markdown("2. Portion into small containers for easy grab-and-go snacks.")
                st.markdown("3. Store in the refrigerator for up to 3 days.")
            
            # Recipe nutrition (matching target macros)
            st.markdown("#### Nutrition Information:")
            st.markdown(f"**Calories:** {target_recipe_cals} kcal")
            st.markdown(f"**Protein:** {target_recipe_protein}g")
            st.markdown(f"**Carbs:** {target_recipe_carbs}g")
            st.markdown(f"**Fat:** {target_recipe_fat}g")
            
            high_carb_recipes = [
                {
                    "name": "Pasta with Lean Turkey Meat Sauce",
                    "ingredients": [
                        {"name": "Whole Wheat Pasta", "amount": "100g dry", "protein": 13, "carbs": 71, "fat": 2, "calories": 350},
                        {"name": "Ground Turkey (93% lean)", "amount": "100g", "protein": 22, "carbs": 0, "fat": 7, "calories": 150},
                        {"name": "Tomato Sauce", "amount": "100g", "protein": 1.5, "carbs": 8, "fat": 0.5, "calories": 45},
                        {"name": "Onion", "amount": "50g", "protein": 0.5, "carbs": 5, "fat": 0, "calories": 20},
                        {"name": "Garlic", "amount": "3 cloves", "protein": 0.5, "carbs": 3, "fat": 0, "calories": 15},
                    ],
                    "instructions": [
                        "1. Cook pasta according to package instructions.",
                        "2. In a pan, sauté diced onion and minced garlic until fragrant.",
                        "3. Add ground turkey and cook until browned.",
                        "4. Add tomato sauce and simmer for 10 minutes.",
                        "5. Combine pasta with sauce and serve."
                    ],
                    "macros": {"protein": 37.5, "carbs": 87, "fat": 9.5, "calories": 580}
                },
                {
                    "name": "Sweet Potato & Black Bean Bowl",
                    "ingredients": [
                        {"name": "Sweet Potato", "amount": "200g", "protein": 3.2, "carbs": 40, "fat": 0.2, "calories": 172},
                        {"name": "Black Beans", "amount": "100g cooked", "protein": 8.9, "carbs": 23.7, "fat": 0.5, "calories": 132},
                        {"name": "Quinoa", "amount": "100g cooked", "protein": 4.4, "carbs": 21.3, "fat": 1.9, "calories": 120},
                        {"name": "Avocado", "amount": "50g (1/3 medium)", "protein": 1, "carbs": 4.5, "fat": 7.5, "calories": 80},
                    ],
                    "instructions": [
                        "1. Dice sweet potatoes and roast at 400°F (200°C) for 25-30 minutes until tender.",
                        "2. Combine cooked quinoa and black beans.",
                        "3. Add roasted sweet potatoes.",
                        "4. Top with diced avocado and season with lime juice, cilantro, and spices."
                    ],
                    "macros": {"protein": 17.5, "carbs": 89.5, "fat": 10.1, "calories": 504}
                }
            ]
            
            balanced_recipes = [
                {
                    "name": "Salmon Rice Bowl",
                    "ingredients": [
                        {"name": "Salmon Fillet", "amount": "120g", "protein": 30, "carbs": 0, "fat": 15.6, "calories": 265},
                        {"name": "Brown Rice", "amount": "150g cooked", "protein": 3.9, "carbs": 34.5, "fat": 1.3, "calories": 168},
                        {"name": "Broccoli", "amount": "100g", "protein": 2.8, "carbs": 7, "fat": 0.4, "calories": 34},
                        {"name": "Avocado", "amount": "50g (1/3 medium)", "protein": 1, "carbs": 4.5, "fat": 7.5, "calories": 80},
                    ],
                    "instructions": [
                        "1. Season salmon with salt, pepper, and lemon juice.",
                        "2. Bake salmon at 375°F (190°C) for 12-15 minutes.",
                        "3. Steam broccoli until tender-crisp.",
                        "4. Serve salmon over cooked brown rice with broccoli on the side.",
                        "5. Top with sliced avocado and additional seasonings as desired."
                    ],
                    "macros": {"protein": 37.7, "carbs": 46, "fat": 24.8, "calories": 547}
                },
                {
                    "name": "Mediterranean Chicken Wrap",
                    "ingredients": [
                        {"name": "Chicken Breast", "amount": "100g", "protein": 31, "carbs": 0, "fat": 3.6, "calories": 165},
                        {"name": "Whole Wheat Wrap", "amount": "1 large", "protein": 5, "carbs": 32, "fat": 5, "calories": 190},
                        {"name": "Hummus", "amount": "30g", "protein": 3.8, "carbs": 6, "fat": 5, "calories": 84},
                        {"name": "Mixed Greens", "amount": "50g", "protein": 0.7, "carbs": 1.5, "fat": 0.1, "calories": 8},
                        {"name": "Feta Cheese", "amount": "30g", "protein": 4, "carbs": 1.2, "fat": 6, "calories": 75},
                    ],
                    "instructions": [
                        "1. Grill or bake chicken breast with Mediterranean herbs and spices.",
                        "2. Warm the whole wheat wrap briefly.",
                        "3. Spread hummus on the wrap.",
                        "4. Add sliced chicken, mixed greens, and crumbled feta cheese.",
                        "5. Roll up, slice in half, and serve."
                    ],
                    "macros": {"protein": 44.5, "carbs": 40.7, "fat": 19.7, "calories": 522}
                }
            ]
            
            high_fat_recipes = [
                {
                    "name": "Keto Avocado Salad with Grilled Chicken",
                    "ingredients": [
                        {"name": "Chicken Thigh (skin-on)", "amount": "150g", "protein": 28.5, "carbs": 0, "fat": 15, "calories": 255},
                        {"name": "Avocado", "amount": "150g (1 medium)", "protein": 3, "carbs": 13.5, "fat": 22.5, "calories": 240},
                        {"name": "Mixed Greens", "amount": "100g", "protein": 1.5, "carbs": 3, "fat": 0.2, "calories": 17},
                        {"name": "Olive Oil", "amount": "15g (1 tbsp)", "protein": 0, "carbs": 0, "fat": 14, "calories": 120},
                        {"name": "Pine Nuts", "amount": "15g", "protein": 2.3, "carbs": 1.3, "fat": 9.6, "calories": 99},
                    ],
                    "instructions": [
                        "1. Season chicken thighs with salt, pepper, and herbs.",
                        "2. Grill or bake chicken until internal temperature reaches 165°F (74°C).",
                        "3. Arrange mixed greens on a plate.",
                        "4. Add sliced avocado and chicken.",
                        "5. Drizzle with olive oil, sprinkle with pine nuts, and season to taste."
                    ],
                    "macros": {"protein": 35.3, "carbs": 17.8, "fat": 61.3, "calories": 731}
                },
                {
                    "name": "Almond Flour Pancakes with Berries",
                    "ingredients": [
                        {"name": "Almond Flour", "amount": "60g", "protein": 12, "carbs": 9, "fat": 36, "calories": 420},
                        {"name": "Eggs", "amount": "2 large", "protein": 12, "carbs": 1.2, "fat": 10, "calories": 140},
                        {"name": "Berries", "amount": "50g", "protein": 0.3, "carbs": 7, "fat": 0.1, "calories": 28},
                        {"name": "Butter", "amount": "15g (1 tbsp)", "protein": 0.1, "carbs": 0, "fat": 12, "calories": 108},
                    ],
                    "instructions": [
                        "1. Mix almond flour, eggs, and a pinch of salt to create a batter.",
                        "2. Heat butter in a pan over medium heat.",
                        "3. Pour small circles of batter to form pancakes.",
                        "4. Cook until bubbles form, then flip and cook other side.",
                        "5. Serve topped with fresh berries."
                    ],
                    "macros": {"protein": 24.4, "carbs": 17.2, "fat": 58.1, "calories": 696}
                }
            ]
            
            # Determine which recipe list to use based on macronutrient needs
            if target_recipe_protein > target_recipe_carbs and target_recipe_protein > target_recipe_fat * 9 / 4:
                recipe_list = high_protein_recipes
                recipe_focus = "high protein"
            elif target_recipe_carbs > target_recipe_protein and target_recipe_carbs > target_recipe_fat * 9 / 4:
                recipe_list = high_carb_recipes
                recipe_focus = "high carb"
            elif target_recipe_fat * 9 > target_recipe_protein * 4 and target_recipe_fat * 9 > target_recipe_carbs * 4:
                recipe_list = high_fat_recipes
                recipe_focus = "high fat"
            else:
                recipe_list = balanced_recipes
                recipe_focus = "balanced"
            
            # Filter recipes based on dietary preferences
            filtered_recipes = recipe_list
            
            # Choose a recipe from the filtered list
            if filtered_recipes:
                generated_recipe = random.choice(filtered_recipes)
                
                # Display the recipe
                st.success(f"Generated a {recipe_focus} recipe for you!")
                
                st.subheader(generated_recipe["name"])
                
                # Display recipe macros
                recipe_macros = generated_recipe["macros"]
                st.markdown(f"**Total Macros:** {recipe_macros['calories']} kcal, " + 
                           f"{recipe_macros['protein']}g protein, " + 
                           f"{recipe_macros['carbs']}g carbs, " + 
                           f"{recipe_macros['fat']}g fat")
                
                # Display ingredients
                st.markdown("### Ingredients")
                for ingredient in generated_recipe["ingredients"]:
                    st.markdown(f"- {ingredient['name']}: **{ingredient['amount']}** " + 
                               f"({ingredient['protein']}g protein, {ingredient['carbs']}g carbs, {ingredient['fat']}g fat, {ingredient['calories']} kcal)")
                
                # Display instructions
                st.markdown("### Instructions")
                for instruction in generated_recipe["instructions"]:
                    st.markdown(instruction)
                
                # Option to add to meal plan
                meal_options = ["Breakfast", "Lunch", "Dinner", "Snacks"]
                selected_meal = st.selectbox("Add this recipe to your meal plan?", ["Select meal..."] + meal_options)
                
                if selected_meal != "Select meal...":
                    if st.button("Add to meal plan"):
                        # Create a food item from the recipe
                        recipe_item = {
                            "fdc_id": f"recipe_{random.randint(10000, 99999)}",
                            "description": generated_recipe["name"] + " (Recipe)",
                            "category": "Recipe",
                            "nutrients": {
                                "protein": recipe_macros["protein"],
                                "carbs": recipe_macros["carbs"],
                                "fat": recipe_macros["fat"],
                                "calories": recipe_macros["calories"],
                                "fiber": 0  # This would be calculated in a real implementation
                            }
                        }
                        
                        # Add to meal plan
                        add_to_meal(recipe_item, selected_meal.lower(), 1)  # Portion is 1 since this is a complete recipe
                        
                        # Show ingredient list for shopping
                        st.info("Recipe added to your meal plan! Be sure to add these ingredients to your shopping list.")
            else:
                st.warning("No suitable recipes found with your criteria. Try adjusting your dietary preferences.")

# Save and load meal plans
st.header("Save/Load Meal Plan")

save_load_cols = st.columns(2)

with save_load_cols[0]:
    meal_plan_name = st.text_input("Meal Plan Name", "My Meal Plan")
    if st.button("Save Meal Plan"):
        # In a real implementation, this would save to a file or database
        st.success(f"Meal plan '{meal_plan_name}' saved!")

with save_load_cols[1]:
    # In a real implementation, this would load from a file or database
    saved_plans = ["My Meal Plan", "Low Carb Plan", "High Protein Plan"]
    selected_plan = st.selectbox("Load Saved Plan", saved_plans)
    if st.button("Load Plan"):
        st.success(f"Meal plan '{selected_plan}' loaded!")

# Add disclaimer
st.markdown("---")
st.caption("Note: This meal planner provides nutritional information for reference purposes only. Always consult with a healthcare professional before making significant changes to your diet.")