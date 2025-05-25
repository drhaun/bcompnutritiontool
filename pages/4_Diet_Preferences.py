import streamlit as st
import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime, timedelta

# Import custom modules
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import fdc_api
from recipe_database import get_recipe_database, display_recipe_card, load_sample_recipes

# Set page config
st.set_page_config(
    page_title="Fitomics - Diet Preferences",
    page_icon="🍏",
    layout="wide"
)

# Streamlit UI
st.title("Diet Preferences")
st.markdown("Build your personalized diet profile by selecting your favorite foods, creating recipes, and setting meal preferences.")

# Initialize session state variables for this page if needed
if 'food_search_results' not in st.session_state:
    st.session_state.food_search_results = []

if 'favorite_foods' not in st.session_state:
    st.session_state.favorite_foods = []

if 'selected_foods' not in st.session_state:
    st.session_state.selected_foods = []

# Check if user info is set
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

# Create tabs for the different sections
tabs = st.tabs(["Food Search", "My Favorites", "Selected Foods", "Create Recipe", "My Recipes", "Recipe Browser", "Diet Profile"])

# Function to search for foods
def food_search_ui():
    """UI for searching foods in FDC database"""
    
    # Search form
    st.subheader("Search for Foods")
    
    # Create two columns for search input and filters
    col1, col2 = st.columns([3, 1])
    
    with col1:
        search_query = st.text_input("Search Food Database:", placeholder="e.g., chicken breast, apple, olive oil")
    
    with col2:
        data_type = st.selectbox(
            "Filter by type:",
            ["All", "Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"],
            index=0
        )
    
    # Convert "All" to the correct format for the API
    if data_type == "All":
        data_type = "Foundation,SR Legacy,Survey (FNDDS),Branded"
    
    # Search button
    if st.button("Search", key="search_button"):
        if search_query:
            with st.spinner("Searching USDA Food Database..."):
                results = fdc_api.search_foods(search_query, data_type=data_type)
                
                if results:
                    st.session_state.food_search_results = results
                    st.success(f"Found {len(results)} results.")
                else:
                    st.warning("No results found. Try a different search term or filter.")
        else:
            st.warning("Please enter a search term.")
    
    # Display search results
    if st.session_state.food_search_results:
        st.subheader("Search Results")
        
        # Create a table of search results
        table_data = []
        
        for i, food in enumerate(st.session_state.food_search_results):
            # Extract basic information
            food_name = food.get('description', food.get('lowercaseDescription', 'Unknown'))
            brand = food.get('brandOwner', 'USDA')
            category = food.get('foodCategory', {}).get('description', 'Other')
            
            table_data.append({
                'Index': i + 1,
                'Food Name': food_name,
                'Brand': brand,
                'Category': category
            })
        
        # Display as dataframe
        df = pd.DataFrame(table_data)
        st.dataframe(df, use_container_width=True)
        
        # Allow selecting a food item
        selected_index = st.number_input("Select food item #:", 
                                      min_value=1, 
                                      max_value=len(st.session_state.food_search_results),
                                      key="selected_food_index")
        
        # Display details for selected food
        if st.button("View Details", key="view_food_details"):
            selected_food = st.session_state.food_search_results[selected_index - 1]
            
            # Get detailed food information
            food_details = fdc_api.get_food_details(selected_food['fdcId'])
            
            if food_details:
                st.subheader(f"Details for {food_details.get('description', 'Selected Food')}")
                
                # Basic info
                st.write(f"**Brand:** {food_details.get('brandOwner', 'USDA')}")
                st.write(f"**Category:** {food_details.get('foodCategory', {}).get('description', 'Not specified')}")
                
                # Get nutrient information
                nutrients = fdc_api.extract_nutrients(food_details)
                
                # Normalize to 100g for consistent display
                normalized_food = fdc_api.normalize_food_data(food_details)
                
                # Macronutrient breakdown
                st.write("### Nutrition Information (per 100g)")
                
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("Calories", f"{normalized_food.get('calories', 0):.0f} kcal")
                
                with col2:
                    st.metric("Protein", f"{normalized_food.get('protein', 0):.1f}g")
                
                with col3:
                    st.metric("Carbs", f"{normalized_food.get('carbs', 0):.1f}g")
                
                with col4:
                    st.metric("Fat", f"{normalized_food.get('fat', 0):.1f}g")
                
                # More details
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write("**Additional Nutrients:**")
                    st.write(f"- Fiber: {normalized_food.get('fiber', 0):.1f}g")
                    st.write(f"- Sugar: {normalized_food.get('sugar', 0):.1f}g")
                    st.write(f"- Sodium: {normalized_food.get('sodium', 0):.0f}mg")
                
                with col2:
                    # Calculate macronutrient percentages
                    total_calories = normalized_food.get('calories', 0)
                    if total_calories > 0:
                        protein_pct = (normalized_food.get('protein', 0) * 4 / total_calories) * 100
                        carbs_pct = (normalized_food.get('carbs', 0) * 4 / total_calories) * 100
                        fat_pct = (normalized_food.get('fat', 0) * 9 / total_calories) * 100
                        
                        st.write("**Macronutrient Breakdown:**")
                        st.write(f"- Protein: {protein_pct:.0f}% of calories")
                        st.write(f"- Carbs: {carbs_pct:.0f}% of calories")
                        st.write(f"- Fat: {fat_pct:.0f}% of calories")
                
                # Categorize the food
                category = fdc_api.categorize_food(normalized_food)
                st.write(f"**Primary Macronutrient:** {category.capitalize()}")
                
                # Add action buttons
                fav_col1, fav_col2 = st.columns(2)
                
                with fav_col1:
                    if st.button("Add to Favorites"):
                        fdc_api.add_to_favorites(normalized_food)
                        st.success(f"Added {normalized_food['name']} to favorites!")
                
                with fav_col2:
                    if st.button("Add to Selected Foods"):
                        # Check if already in selected foods
                        if normalized_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                            st.session_state.selected_foods.append(normalized_food)
                            st.success(f"Added {normalized_food['name']} to selected foods!")
                        else:
                            st.warning(f"{normalized_food['name']} is already in your selected foods.")
                
                return normalized_food

# Function to display favorites
def favorites_ui():
    """UI for managing favorite foods"""
    st.subheader("My Favorite Foods")
    
    # Get user favorites
    favorites = fdc_api.get_user_favorites()
    
    if not favorites:
        st.info("You haven't added any favorite foods yet. Use the Food Search tab to find and add foods to your favorites.")
        return None
    
    # Group favorites by category
    categorized_favorites = {}
    
    for food in favorites:
        category = food.get('category', 'other').capitalize()
        
        if category not in categorized_favorites:
            categorized_favorites[category] = []
        
        categorized_favorites[category].append(food)
    
    # Display favorites by category
    for category, foods in categorized_favorites.items():
        st.subheader(category)
        
        # Create a table of foods
        table_data = []
        
        for i, food in enumerate(foods):
            table_data.append({
                'Index': i + 1,
                'Food Name': food['name'],
                'Calories': f"{food['calories']:.0f} kcal",
                'Protein': f"{food['protein']:.1f}g",
                'Carbs': f"{food['carbs']:.1f}g",
                'Fat': f"{food['fat']:.1f}g"
            })
        
        # Display as dataframe
        df = pd.DataFrame(table_data)
        st.dataframe(df, use_container_width=True)
        
        # Allow selecting a food item
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            selected_index = st.number_input(f"Select {category} food item #:", 
                                          min_value=1, 
                                          max_value=len(foods),
                                          key=f"selected_favorite_{category}")
        
        # Display action buttons
        with col2:
            if st.button("Remove from Favorites", key=f"remove_fav_{category}"):
                food_to_remove = foods[selected_index - 1]
                fdc_api.remove_from_favorites(food_to_remove['fdcId'])
                st.success(f"Removed {food_to_remove['name']} from favorites!")
                st.rerun()
        
        with col3:
            if st.button("Add to Selected Foods", key=f"add_selected_{category}"):
                food_to_add = foods[selected_index - 1]
                # Check if already in selected foods
                if food_to_add['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                    st.session_state.selected_foods.append(food_to_add)
                    st.success(f"Added {food_to_add['name']} to selected foods!")
                else:
                    st.warning(f"{food_to_add['name']} is already in your selected foods.")

# Function to display selected foods
def selected_foods_ui():
    """UI for managing selected foods"""
    st.subheader("Selected Foods")
    
    if not st.session_state.selected_foods:
        st.info("You haven't selected any foods yet. Use the Food Search or My Favorites tabs to select foods.")
        return
    
    # Display selected foods
    table_data = []
    
    for i, food in enumerate(st.session_state.selected_foods):
        table_data.append({
            'Index': i + 1,
            'Food Name': food['name'],
            'Calories': f"{food['calories']:.0f} kcal",
            'Protein': f"{food['protein']:.1f}g",
            'Carbs': f"{food['carbs']:.1f}g",
            'Fat': f"{food['fat']:.1f}g"
        })
    
    # Display as dataframe
    df = pd.DataFrame(table_data)
    st.dataframe(df, use_container_width=True)
    
    # Action buttons
    col1, col2 = st.columns(2)
    
    with col1:
        selected_index = st.number_input("Select food item to remove:", 
                                      min_value=1, 
                                      max_value=len(st.session_state.selected_foods),
                                      key="selected_remove_index")
    
    with col2:
        if st.button("Remove Selected Food"):
            food_to_remove = st.session_state.selected_foods[selected_index - 1]
            st.session_state.selected_foods.pop(selected_index - 1)
            st.success(f"Removed {food_to_remove['name']} from selected foods.")
            st.rerun()
    
    # Clear all button
    if st.button("Clear All Selected Foods"):
        st.session_state.selected_foods = []
        st.success("Cleared all selected foods.")
        st.rerun()

# Function to create a recipe
def create_recipe_ui():
    """UI for creating a recipe from selected foods"""
    st.header("Create Recipe")
    
    if not st.session_state.selected_foods:
        st.warning("Please add foods to your selection before creating a recipe.")
        return
    
    # Recipe form
    recipe_name = st.text_input("Recipe Name:", 
                               placeholder="E.g., High Protein Breakfast, Post-Workout Meal")
    
    meal_type = st.selectbox("Meal Type:", 
                            ["Breakfast", "Lunch", "Dinner", "Snack", "Any"])
    
    # Target nutrients - Get from day-specific nutrition if available
    has_targets = False
    target_macros = {}
    
    # Check if we have day-specific targets
    if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        selected_day = st.selectbox("Select day for targets:", days)
        
        if selected_day in st.session_state.day_specific_nutrition:
            has_targets = True
            target_macros = st.session_state.day_specific_nutrition[selected_day]
            
            # Show the target macros
            st.subheader("Nutrition Targets")
            target_cols = st.columns(4)
            with target_cols[0]:
                st.metric("Target Calories", f"{target_macros.get('target_calories', 0)} kcal")
            with target_cols[1]:
                st.metric("Target Protein", f"{target_macros.get('protein', 0)}g")
            with target_cols[2]:
                st.metric("Target Carbs", f"{target_macros.get('carbs', 0)}g")
            with target_cols[3]:
                st.metric("Target Fat", f"{target_macros.get('fat', 0)}g")
    
    # Option for auto-calculated portions
    auto_calculate = st.checkbox("Auto-calculate portion sizes to match targets", value=has_targets)
    
    # Meal percent - what percent of daily targets should this recipe account for
    meal_percent = 100
    optimal_portions = {food['name']: 100 for food in st.session_state.selected_foods}
    
    if has_targets and auto_calculate:
        # Options for meal number and meal timing
        col1, col2 = st.columns(2)
        with col1:
            # Which meal number is this (1, 2, 3, etc.)
            meal_number = st.number_input("Meal Number:", min_value=1, max_value=6, value=1, 
                                        help="Which meal of the day is this (1st, 2nd, etc.)")
        
        with col2:
            # Total planned meals for the day
            total_meals = st.number_input("Total Meals for Day:", min_value=1, max_value=6, 
                                        value=3, 
                                        help="How many total meals do you plan to have on this day?")
        
        # Get workout info for the selected day
        from pages.D4_DIY_Meal_Planning import get_day_workout_info, get_meal_distribution
        workout_info = get_day_workout_info(selected_day)
        
        # Use training-based distribution if we have a workout scheduled
        if workout_info['has_workout']:
            workout_type = workout_info['workout_type']
            workout_time = workout_info['workout_time']
            
            # Get meal distribution based on workout timing
            meal_distribution = get_meal_distribution(selected_day, total_meals)
            
            if meal_number in meal_distribution:
                meal_info = meal_distribution[meal_number]
                
                # Display meal description and distribution info
                st.info(f"**Meal {meal_number} ({meal_info['description']})** - Recommended distribution: "
                       f"Protein: {meal_info['protein']*100:.0f}%, "
                       f"Carbs: {meal_info['carbs']*100:.0f}%, "
                       f"Fat: {meal_info['fat']*100:.0f}%")
                
                # Use training-based percentages
                adjusted_targets = {
                    'target_calories': target_macros.get('target_calories', 0) * meal_info['protein'],  # Using protein as calorie proxy
                    'protein': target_macros.get('protein', 0) * meal_info['protein'],
                    'carbs': target_macros.get('carbs', 0) * meal_info['carbs'],
                    'fat': target_macros.get('fat', 0) * meal_info['fat']
                }
                
                # Show adjusted targets
                st.subheader("Training-Based Meal Targets")
                target_cols = st.columns(4)
                with target_cols[0]:
                    st.metric("Calories", f"{adjusted_targets['target_calories']:.0f} kcal")
                with target_cols[1]:
                    st.metric("Protein", f"{adjusted_targets['protein']:.0f}g")
                with target_cols[2]:
                    st.metric("Carbs", f"{adjusted_targets['carbs']:.0f}g")
                with target_cols[3]:
                    st.metric("Fat", f"{adjusted_targets['fat']:.0f}g")
            else:
                meal_percent = 100 / total_meals
                # Default to even distribution if no specific info
                adjusted_targets = {
                    'target_calories': target_macros.get('target_calories', 0) / total_meals,
                    'protein': target_macros.get('protein', 0) / total_meals,
                    'carbs': target_macros.get('carbs', 0) / total_meals,
                    'fat': target_macros.get('fat', 0) / total_meals
                }
                st.info(f"Using even distribution across {total_meals} meals ({meal_percent:.0f}% per meal)")
        else:
            # Allow user to adjust percentage of daily targets for non-workout days
            meal_percent = st.slider("Percentage of daily targets for this meal:", 
                                   min_value=10, max_value=100, value=33)
            
            # Adjust target macros based on percentage
            adjusted_targets = {
                'target_calories': target_macros.get('target_calories', 0) * meal_percent / 100,
                'protein': target_macros.get('protein', 0) * meal_percent / 100,
                'carbs': target_macros.get('carbs', 0) * meal_percent / 100,
                'fat': target_macros.get('fat', 0) * meal_percent / 100
            }
        
        # Calculate optimal portions
        from pages.D4_DIY_Meal_Planning import calculate_optimal_portions
        optimal_portions = calculate_optimal_portions(st.session_state.selected_foods, adjusted_targets)
    
    # Portion size inputs
    st.subheader("Adjust Portion Sizes")
    
    # Calculate total nutrition
    total_nutrition = {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    }
    
    portions = {}
    
    for i, food in enumerate(st.session_state.selected_foods):
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            st.write(f"**{food['name']}**")
        
        with col2:
            # Use the optimal portion as default if available
            default_portion = int(optimal_portions.get(food['name'], 100))
            
            portion = st.number_input(
                f"Portion (g):", 
                min_value=0, 
                value=default_portion,
                key=f"portion_{i}"
            )
            portions[food['name']] = portion
        
        with col3:
            # Show detailed nutrition for this portion
            st.write(f"Cal: {food['calories'] * portion / 100:.0f} kcal")
            st.write(f"P: {food['protein'] * portion / 100:.1f}g")
            st.write(f"C: {food['carbs'] * portion / 100:.1f}g")
            st.write(f"F: {food['fat'] * portion / 100:.1f}g")
        
        # Update total nutrition
        total_nutrition['calories'] += food['calories'] * portion / 100
        total_nutrition['protein'] += food['protein'] * portion / 100
        total_nutrition['carbs'] += food['carbs'] * portion / 100
        total_nutrition['fat'] += food['fat'] * portion / 100
        total_nutrition['fiber'] += food.get('fiber', 0) * portion / 100
    
    # Display total nutrition
    st.subheader("Recipe Nutrition")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Calories", f"{total_nutrition['calories']:.0f} kcal")
    
    with col2:
        st.metric("Protein", f"{total_nutrition['protein']:.1f}g")
    
    with col3:
        st.metric("Carbs", f"{total_nutrition['carbs']:.1f}g")
    
    with col4:
        st.metric("Fat", f"{total_nutrition['fat']:.1f}g")
    
    with col5:
        st.metric("Fiber", f"{total_nutrition['fiber']:.1f}g")
    
    # Calculate macronutrient percentages
    if total_nutrition['calories'] > 0:
        protein_pct = (total_nutrition['protein'] * 4 / total_nutrition['calories']) * 100
        carbs_pct = (total_nutrition['carbs'] * 4 / total_nutrition['calories']) * 100
        fat_pct = (total_nutrition['fat'] * 9 / total_nutrition['calories']) * 100
        
        st.write("**Macronutrient Breakdown:**")
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Protein", f"{protein_pct:.0f}%")
        
        with col2:
            st.metric("Carbs", f"{carbs_pct:.0f}%")
        
        with col3:
            st.metric("Fat", f"{fat_pct:.0f}%")
    
    # Save recipe button
    if st.button("Save Recipe") and recipe_name:
        fdc_api.add_recipe(recipe_name, st.session_state.selected_foods, portions, meal_type)
        st.success(f"Recipe '{recipe_name}' saved successfully!")
        
        # Option to clear selected foods
        if st.button("Clear Selected Foods"):
            st.session_state.selected_foods = []
            st.rerun()

# Function to browse recipes
def recipe_browser_ui():
    """UI for browsing and managing recipes"""
    st.header("Recipe Browser")
    
    # Get recipes from database
    recipes = fdc_api.get_user_recipes()
    
    if not recipes:
        st.info("You haven't created any recipes yet. Use the Create Recipe tab to create your first recipe.")
        
        # Option to import sample recipes
        if st.button("Import Sample Recipes"):
            load_sample_recipes()
            st.success("Sample recipes imported!")
            st.rerun()
        
        return
    
    # Display recipes
    for recipe in recipes:
        with st.expander(f"{recipe['name']} ({recipe.get('meal_type', 'Any')})"):
            # Recipe details
            st.write(f"**Meal Type:** {recipe.get('meal_type', 'Any')}")
            
            # Calculate total nutrition
            total_nutrition = {
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fat': 0,
                'fiber': 0
            }
            
            # Table of ingredients
            table_data = []
            
            for food in recipe.get('foods', []):
                portion = recipe.get('portions', {}).get(food['name'], 100)
                
                table_data.append({
                    'Food': food['name'],
                    'Portion': f"{portion}g",
                    'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                    'Protein': f"{food['protein'] * portion / 100:.1f}g",
                    'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                    'Fat': f"{food['fat'] * portion / 100:.1f}g"
                })
                
                # Update total nutrition
                total_nutrition['calories'] += food['calories'] * portion / 100
                total_nutrition['protein'] += food['protein'] * portion / 100
                total_nutrition['carbs'] += food['carbs'] * portion / 100
                total_nutrition['fat'] += food['fat'] * portion / 100
                total_nutrition['fiber'] += food.get('fiber', 0) * portion / 100
            
            # Display ingredients
            st.subheader("Ingredients")
            ingredients_df = pd.DataFrame(table_data)
            st.dataframe(ingredients_df, use_container_width=True)
            
            # Display nutrition
            st.subheader("Nutrition")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Calories", f"{total_nutrition['calories']:.0f} kcal")
            
            with col2:
                st.metric("Protein", f"{total_nutrition['protein']:.1f}g")
            
            with col3:
                st.metric("Carbs", f"{total_nutrition['carbs']:.1f}g")
            
            with col4:
                st.metric("Fat", f"{total_nutrition['fat']:.1f}g")
            
            # Calculate macronutrient percentages
            if total_nutrition['calories'] > 0:
                protein_pct = (total_nutrition['protein'] * 4 / total_nutrition['calories']) * 100
                carbs_pct = (total_nutrition['carbs'] * 4 / total_nutrition['calories']) * 100
                fat_pct = (total_nutrition['fat'] * 9 / total_nutrition['calories']) * 100
                
                st.write("**Macronutrient Breakdown:**")
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.metric("Protein", f"{protein_pct:.0f}%")
                
                with col2:
                    st.metric("Carbs", f"{carbs_pct:.0f}%")
                
                with col3:
                    st.metric("Fat", f"{fat_pct:.0f}%")
            
            # Action buttons
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("Add to Selected Foods", key=f"add_selected_{recipe['name']}"):
                    for food in recipe.get('foods', []):
                        if food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                            st.session_state.selected_foods.append(food)
                    
                    st.success(f"Added foods from '{recipe['name']}' to selected foods!")
                    st.rerun()
            
            with col2:
                if st.button("Delete Recipe", key=f"delete_{recipe['name']}"):
                    recipes.remove(recipe)
                    fdc_api.save_user_recipes(recipes)
                    st.success(f"Recipe '{recipe['name']}' deleted.")
                    st.rerun()

# Function for Diet Profile
def diet_profile_ui():
    """UI for setting diet preferences"""
    st.header("Diet Profile")
    
    # Initialize diet profile if not exists
    if 'diet_profile' not in st.session_state:
        st.session_state.diet_profile = {
            'food_preferences': [],
            'cuisine_preferences': [],
            'dietary_restrictions': [],
            'disliked_foods': [],
            'allergies': []
        }
    
    # Cuisine preferences
    st.subheader("Cuisine Preferences")
    cuisines = ["American", "Mexican", "Italian", "Asian", "Mediterranean", "Indian", "French", "Middle Eastern", "Japanese", "Chinese", "Thai", "Greek", "Spanish", "Korean", "Vietnamese"]
    selected_cuisines = st.multiselect("Select your preferred cuisines:", cuisines, default=st.session_state.diet_profile.get('cuisine_preferences', []))
    st.session_state.diet_profile['cuisine_preferences'] = selected_cuisines
    
    # Dietary restrictions
    st.subheader("Dietary Restrictions")
    restrictions = ["None", "Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-FODMAP", "Low-Sodium"]
    selected_restrictions = st.multiselect("Select your dietary restrictions:", restrictions, default=st.session_state.diet_profile.get('dietary_restrictions', []))
    st.session_state.diet_profile['dietary_restrictions'] = selected_restrictions
    
    # Food preferences
    st.subheader("Food Preferences")
    
    # Protein preferences
    st.write("**Preferred Protein Sources:**")
    protein_sources = ["Chicken", "Turkey", "Beef", "Pork", "Fish", "Tofu", "Tempeh", "Eggs", "Greek Yogurt", "Cottage Cheese", "Whey Protein", "Plant Protein", "Beans", "Lentils"]
    selected_proteins = st.multiselect("Select your preferred protein sources:", protein_sources, default=st.session_state.diet_profile.get('preferred_proteins', []))
    st.session_state.diet_profile['preferred_proteins'] = selected_proteins
    
    # Carb preferences
    st.write("**Preferred Carbohydrate Sources:**")
    carb_sources = ["Rice", "Potatoes", "Sweet Potatoes", "Quinoa", "Oats", "Pasta", "Bread", "Tortillas", "Fruits", "Cereal", "Corn", "Beans"]
    selected_carbs = st.multiselect("Select your preferred carbohydrate sources:", carb_sources, default=st.session_state.diet_profile.get('preferred_carbs', []))
    st.session_state.diet_profile['preferred_carbs'] = selected_carbs
    
    # Fat preferences
    st.write("**Preferred Fat Sources:**")
    fat_sources = ["Olive Oil", "Coconut Oil", "Avocado", "Nuts", "Seeds", "Nut Butters", "Cheese", "Butter", "Ghee", "Full-Fat Yogurt", "Fatty Fish", "Eggs"]
    selected_fats = st.multiselect("Select your preferred fat sources:", fat_sources, default=st.session_state.diet_profile.get('preferred_fats', []))
    st.session_state.diet_profile['preferred_fats'] = selected_fats
    
    # Disliked foods
    st.subheader("Disliked Foods")
    disliked_foods = st.text_area("Enter foods you dislike (one per line):", value="\n".join(st.session_state.diet_profile.get('disliked_foods', [])))
    st.session_state.diet_profile['disliked_foods'] = [food.strip() for food in disliked_foods.split("\n") if food.strip()]
    
    # Allergies
    st.subheader("Allergies")
    allergies = st.text_area("Enter any food allergies (one per line):", value="\n".join(st.session_state.diet_profile.get('allergies', [])))
    st.session_state.diet_profile['allergies'] = [allergy.strip() for allergy in allergies.split("\n") if allergy.strip()]
    
    # Save button
    if st.button("Save Diet Profile"):
        # Save to a file
        try:
            with open('data/diet_profile.json', 'w') as f:
                json.dump(st.session_state.diet_profile, f)
            st.success("Diet profile saved successfully!")
        except Exception as e:
            st.error(f"Error saving diet profile: {e}")
            # Create directory if it doesn't exist
            os.makedirs('data', exist_ok=True)
            with open('data/diet_profile.json', 'w') as f:
                json.dump(st.session_state.diet_profile, f)
            st.success("Diet profile saved successfully!")

# Display the appropriate tab based on selection
with tabs[0]:
    food_search_ui()

with tabs[1]:
    favorites_ui()

with tabs[2]:
    selected_foods_ui()

with tabs[3]:
    create_recipe_ui()

with tabs[4]:
    st.header("My Recipes")
    recipe_browser_ui()

with tabs[5]:
    st.header("Recipe Browser")
    # Import recipe database functionality
    recipe_db = get_recipe_database()
    
    # Allow searching by category
    categories = ["All"] + list(set(recipe["category"] for recipe in recipe_db.recipes))
    selected_category = st.selectbox("Filter by category:", categories)
    
    # Search box
    search_query = st.text_input("Search recipes:", placeholder="Enter recipe name or ingredient")
    
    # Filter recipes
    filtered_recipes = []
    
    for recipe in recipe_db.recipes:
        # Filter by category
        if selected_category != "All" and recipe.get("category") != selected_category:
            continue
        
        # Filter by search query
        if search_query and search_query.lower() not in recipe.get("title", "").lower():
            continue
        
        filtered_recipes.append(recipe)
    
    # Display filtered recipes
    if filtered_recipes:
        st.success(f"Found {len(filtered_recipes)} recipes.")
        
        # Display in a grid
        cols = st.columns(3)
        
        for i, recipe in enumerate(filtered_recipes):
            with cols[i % 3]:
                display_recipe_card(recipe)
    else:
        st.info("No recipes found matching your criteria.")

with tabs[6]:
    diet_profile_ui()