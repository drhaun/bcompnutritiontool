import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
import os
import sys
import io
from datetime import datetime, timedelta
from scipy.optimize import minimize

# Import custom modules
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import fdc_api
from recipe_database import get_recipe_database, display_recipe_card, load_sample_recipes

# Training-based macro distribution coefficients
def get_training_based_coefficients():
    """
    Get macro distribution coefficients based on training time and number of meals
    Returns a dictionary with training time, meal count, and meal positions as keys
    """
    # Create DataFrame from the coefficients data
    coefficients_data = []
    
    # REST DAY coefficients - equal distribution across meals
    for meal_count in range(1, 7):
        for meal_num in range(1, meal_count + 1):
            meal_pct = 1.0 / meal_count
            coefficients_data.append({
                'training_time': 'REST DAY',
                'total_meals': meal_count,
                'meal_number': meal_num,
                'meal_description': f'MEAL {meal_num}',
                'protein': meal_pct,
                'carbs': meal_pct,
                'fat': meal_pct,
                'fiber': meal_pct,
                'sodium': meal_pct,
                'water': meal_pct
            })
    
    # Training-based coefficients for BEFORE 9AM
    before_9am = [
        # 1 meal
        {'total_meals': 1, 'meal_number': 1, 'meal_description': 'ONLY MEAL', 
         'protein': 1.0, 'carbs': 1.0, 'fat': 1.0, 'fiber': 1.0, 'sodium': 1.0, 'water': 1.0},
        
        # 2 meals
        {'total_meals': 2, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.4, 'carbs': 0.3, 'fat': 0.1, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        {'total_meals': 2, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.6, 'carbs': 0.7, 'fat': 0.9, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        
        # 3 meals
        {'total_meals': 3, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.25, 'carbs': 0.4, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.35, 'carbs': 0.4, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 3, 'meal_description': 'MEAL 3', 
         'protein': 0.4, 'carbs': 0.2, 'fat': 0.9, 'fiber': 0.8, 'sodium': 0.33, 'water': 0.33},
        
        # 4 meals
        {'total_meals': 4, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.2, 'carbs': 0.3, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.25},
        {'total_meals': 4, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.3, 'carbs': 0.4, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.25},
        {'total_meals': 4, 'meal_number': 3, 'meal_description': 'MEAL 3', 
         'protein': 0.2, 'carbs': 0.2, 'fat': 0.4, 'fiber': 0.3, 'sodium': 0.16, 'water': 0.25},
        {'total_meals': 4, 'meal_number': 4, 'meal_description': 'MEAL 4', 
         'protein': 0.3, 'carbs': 0.1, 'fat': 0.5, 'fiber': 0.5, 'sodium': 0.16, 'water': 0.25},
        
        # 5 meals
        {'total_meals': 5, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.15, 'carbs': 0.25, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.3, 'water': 0.2},
        {'total_meals': 5, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.25, 'carbs': 0.35, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.3, 'water': 0.2},
        {'total_meals': 5, 'meal_number': 3, 'meal_description': 'MEAL 3', 
         'protein': 0.15, 'carbs': 0.2, 'fat': 0.2, 'fiber': 0.2, 'sodium': 0.2, 'water': 0.2},
        {'total_meals': 5, 'meal_number': 4, 'meal_description': 'MEAL 4', 
         'protein': 0.15, 'carbs': 0.1, 'fat': 0.3, 'fiber': 0.3, 'sodium': 0.1, 'water': 0.2},
        {'total_meals': 5, 'meal_number': 5, 'meal_description': 'MEAL 5', 
         'protein': 0.3, 'carbs': 0.1, 'fat': 0.3, 'fiber': 0.3, 'sodium': 0.1, 'water': 0.2},
        
        # 6 meals
        {'total_meals': 6, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.15, 'carbs': 0.2, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.3, 'water': 0.165},
        {'total_meals': 6, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.2, 'carbs': 0.3, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.3, 'water': 0.165},
        {'total_meals': 6, 'meal_number': 3, 'meal_description': 'MEAL 3', 
         'protein': 0.15, 'carbs': 0.2, 'fat': 0.15, 'fiber': 0.1, 'sodium': 0.1, 'water': 0.165},
        {'total_meals': 6, 'meal_number': 4, 'meal_description': 'MEAL 4', 
         'protein': 0.15, 'carbs': 0.1, 'fat': 0.2, 'fiber': 0.2, 'sodium': 0.1, 'water': 0.165},
        {'total_meals': 6, 'meal_number': 5, 'meal_description': 'MEAL 5', 
         'protein': 0.15, 'carbs': 0.1, 'fat': 0.2, 'fiber': 0.2, 'sodium': 0.1, 'water': 0.165},
        {'total_meals': 6, 'meal_number': 6, 'meal_description': 'MEAL 6', 
         'protein': 0.2, 'carbs': 0.1, 'fat': 0.35, 'fiber': 0.3, 'sodium': 0.1, 'water': 0.165}
    ]
    
    # Add training time to each entry
    for entry in before_9am:
        entry['training_time'] = 'BEFORE 9AM'
        coefficients_data.append(entry)
    
    # 9AM-3PM training coefficients
    mid_morning = [
        # 1 meal
        {'total_meals': 1, 'meal_number': 1, 'meal_description': 'ONLY MEAL', 
         'protein': 1.0, 'carbs': 1.0, 'fat': 1.0, 'fiber': 1.0, 'sodium': 1.0, 'water': 1.0},
        
        # 2 meals
        {'total_meals': 2, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.5, 'carbs': 0.5, 'fat': 0.3, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        {'total_meals': 2, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.5, 'carbs': 0.5, 'fat': 0.7, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        
        # 3 meals
        {'total_meals': 3, 'meal_number': 1, 'meal_description': 'MEAL 1', 
         'protein': 0.3, 'carbs': 0.2, 'fat': 0.5, 'fiber': 0.8, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 2, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.3, 'carbs': 0.3, 'fat': 0.1, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 3, 'meal_description': 'POST-TRAINING', 
         'protein': 0.4, 'carbs': 0.5, 'fat': 0.4, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33},
        
        # 4 meals
        {'total_meals': 4, 'meal_number': 1, 'meal_description': 'MEAL 1', 
         'protein': 0.2, 'carbs': 0.2, 'fat': 0.4, 'fiber': 0.4, 'sodium': 0.16, 'water': 0.25},
        {'total_meals': 4, 'meal_number': 2, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.2, 'carbs': 0.25, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.25},
        {'total_meals': 4, 'meal_number': 3, 'meal_description': 'POST-TRAINING', 
         'protein': 0.3, 'carbs': 0.4, 'fat': 0.1, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.25},
        {'total_meals': 4, 'meal_number': 4, 'meal_description': 'MEAL 4', 
         'protein': 0.3, 'carbs': 0.15, 'fat': 0.45, 'fiber': 0.4, 'sodium': 0.16, 'water': 0.25}
    ]
    
    # Add training time to each entry
    for entry in mid_morning:
        entry['training_time'] = '9AM-3PM'
        coefficients_data.append(entry)
    
    # 3PM-6PM training coefficients
    afternoon = [
        # 1 meal
        {'total_meals': 1, 'meal_number': 1, 'meal_description': 'ONLY MEAL', 
         'protein': 1.0, 'carbs': 1.0, 'fat': 1.0, 'fiber': 1.0, 'sodium': 1.0, 'water': 1.0},
        
        # 2 meals
        {'total_meals': 2, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.5, 'carbs': 0.4, 'fat': 0.6, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        {'total_meals': 2, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.5, 'carbs': 0.6, 'fat': 0.4, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        
        # 3 meals
        {'total_meals': 3, 'meal_number': 1, 'meal_description': 'MEAL 1', 
         'protein': 0.35, 'carbs': 0.3, 'fat': 0.35, 'fiber': 0.8, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 2, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.3, 'carbs': 0.3, 'fat': 0.1, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 3, 'meal_description': 'POST-TRAINING', 
         'protein': 0.35, 'carbs': 0.4, 'fat': 0.55, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33}
    ]
    
    # Add training time to each entry
    for entry in afternoon:
        entry['training_time'] = '3PM-6PM'
        coefficients_data.append(entry)
    
    # AFTER 6PM training coefficients
    evening = [
        # 1 meal
        {'total_meals': 1, 'meal_number': 1, 'meal_description': 'ONLY MEAL', 
         'protein': 1.0, 'carbs': 1.0, 'fat': 1.0, 'fiber': 1.0, 'sodium': 1.0, 'water': 1.0},
        
        # 2 meals
        {'total_meals': 2, 'meal_number': 1, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.5, 'carbs': 0.3, 'fat': 0.2, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        {'total_meals': 2, 'meal_number': 2, 'meal_description': 'POST-TRAINING', 
         'protein': 0.5, 'carbs': 0.7, 'fat': 0.8, 'fiber': 0.5, 'sodium': 0.5, 'water': 0.5},
        
        # 3 meals
        {'total_meals': 3, 'meal_number': 1, 'meal_description': 'MEAL 1', 
         'protein': 0.3, 'carbs': 0.2, 'fat': 0.85, 'fiber': 0.8, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 2, 'meal_description': 'PRE-TRAINING', 
         'protein': 0.3, 'carbs': 0.3, 'fat': 0.05, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33},
        {'total_meals': 3, 'meal_number': 3, 'meal_description': 'POST-TRAINING', 
         'protein': 0.4, 'carbs': 0.5, 'fat': 0.1, 'fiber': 0.1, 'sodium': 0.33, 'water': 0.33}
    ]
    
    # Add training time to each entry
    for entry in evening:
        entry['training_time'] = 'AFTER 6PM'
        coefficients_data.append(entry)
    
    # Convert to DataFrame for easier filtering
    df = pd.DataFrame(coefficients_data)
    
    # Create a lookup dictionary for easy access
    coefficient_dict = {}
    for _, row in df.iterrows():
        training_time = row['training_time']
        total_meals = row['total_meals']
        meal_number = row['meal_number']
        
        if training_time not in coefficient_dict:
            coefficient_dict[training_time] = {}
        
        if total_meals not in coefficient_dict[training_time]:
            coefficient_dict[training_time][total_meals] = {}
        
        coefficient_dict[training_time][total_meals][meal_number] = {
            'description': row['meal_description'],
            'protein': row['protein'],
            'carbs': row['carbs'],
            'fat': row['fat'],
            'fiber': row['fiber'],
            'sodium': row['sodium'],
            'water': row['water']
        }
    
    return coefficient_dict

# Function to get workout info for a specific day
def get_day_workout_info(day):
    """Get workout information for a specific day"""
    workout_info = {
        'has_workout': False,
        'workout_time': None,
        'workout_type': None
    }
    
    # Check if weekly schedule exists
    if 'confirmed_weekly_schedule' not in st.session_state:
        return workout_info
    
    day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
    
    # Check for resistance training
    if day_data.get('resistance_training', False):
        workout_info['has_workout'] = True
        workout_info['workout_type'] = 'Resistance'
        # Convert time to appropriate category
        time_str = day_data.get('resistance_time', '')
        if time_str:
            time_obj = datetime.strptime(time_str, "%H:%M").time()
            hour = time_obj.hour
            
            if hour < 9:
                workout_info['workout_time'] = 'BEFORE 9AM'
            elif hour < 15:
                workout_info['workout_time'] = '9AM-3PM'
            elif hour < 18:
                workout_info['workout_time'] = '3PM-6PM'
            else:
                workout_info['workout_time'] = 'AFTER 6PM'
    
    # Check for cardio training
    elif day_data.get('cardio_training', False):
        workout_info['has_workout'] = True
        workout_info['workout_type'] = 'Cardio'
        # Convert time to appropriate category
        time_str = day_data.get('cardio_time', '')
        if time_str:
            time_obj = datetime.strptime(time_str, "%H:%M").time()
            hour = time_obj.hour
            
            if hour < 9:
                workout_info['workout_time'] = 'BEFORE 9AM'
            elif hour < 15:
                workout_info['workout_time'] = '9AM-3PM'
            elif hour < 18:
                workout_info['workout_time'] = '3PM-6PM'
            else:
                workout_info['workout_time'] = 'AFTER 6PM'
    
    return workout_info

# Function to get recommended meal distribution based on workout time
def get_meal_distribution(day, total_meals):
    """
    Get recommended meal distribution based on workout timing
    
    Parameters:
    day (str): Day of the week
    total_meals (int): Total number of meals for the day
    
    Returns:
    dict: Dictionary with meal numbers as keys and distribution coefficients as values
    """
    # Get training-based coefficients
    coefficients = get_training_based_coefficients()
    
    # Get workout info for the day
    workout_info = get_day_workout_info(day)
    
    # Default to REST DAY if no workout or if total_meals out of range
    training_time = 'REST DAY'
    if workout_info['has_workout'] and workout_info['workout_time']:
        training_time = workout_info['workout_time']
    
    # Limit total_meals to what we have coefficients for
    if total_meals < 1:
        total_meals = 1
    elif total_meals > 6:
        total_meals = 6
    
    # Get coefficients for this training time and meal count
    try:
        day_coefficients = coefficients[training_time][total_meals]
        return day_coefficients
    except KeyError:
        # Fallback to REST DAY if the specific combination isn't available
        return coefficients['REST DAY'][total_meals]

# Set page config
st.set_page_config(
    page_title="Fitomics - DIY Meal & Recipe Planner",
    page_icon="🍽️",
    layout="wide"
)

# Streamlit UI
st.title("DIY Meal & Recipe Planner")
st.markdown("Create, manage, and plan your meals using the USDA FoodData Central database for accurate nutrition information.")

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

# Function to import recipes from provided CSV files
def import_recipe_csv_files():
    """Import recipes from the provided CSV files"""
    recipe_db = get_recipe_database()
    
    # Check if we already have a decent number of recipes
    if len(recipe_db.recipes) > 10:
        return True
        
    # Try to import recipes from the CSV files in attached_assets
    csv_files = [
        "attached_assets/products_May-25_10-19-19AM.csv",
        "attached_assets/products_May-25_10-19-44AM.csv",
        "attached_assets/products_May-25_10-20-08AM.csv"
    ]
    
    imported_count = 0
    for csv_file in csv_files:
        try:
            if os.path.exists(csv_file):
                with open(csv_file, 'r') as f:
                    new_recipes = recipe_db.parse_csv_recipes(f)
                    if new_recipes:
                        recipe_db.add_recipes(new_recipes)
                        imported_count += len(new_recipes)
        except Exception as e:
            print(f"Error importing recipes from {csv_file}: {e}")
    
    if imported_count > 0:
        st.success(f"Successfully imported {imported_count} recipes from CSV files!")
        return True
    
    # If no recipes were imported, load sample recipes as fallback
    load_sample_recipes()
    return False

# Load recipes from CSV files or fallback to sample recipes
import_recipe_csv_files()

# Function to handle recipe file uploads
def recipe_browser_ui(section_key="recipes"):
    """UI for browsing and managing recipes"""
    st.header("Recipe Browser")
    
    # Get recipe database
    recipe_db = get_recipe_database()
    
    # Upload recipes from CSV
    upload_expander = st.expander("Upload Recipes", expanded=False)
    with upload_expander:
        st.write("Upload a CSV file containing recipe data. The file should have Title and Description columns.")
        uploaded_file = st.file_uploader("Choose a CSV file", type="csv", key=f"recipe_upload_{section_key}")
        
        if uploaded_file is not None:
            # Read file
            csv_data = io.StringIO(uploaded_file.getvalue().decode("utf-8"))
            
            # Parse recipes
            new_recipes = recipe_db.parse_csv_recipes(csv_data)
            
            # Add recipes to database
            if new_recipes:
                recipe_db.add_recipes(new_recipes)
                st.success(f"Successfully imported {len(new_recipes)} recipes!")
            else:
                st.error("No valid recipes found in the file.")
    
    # Recipe search and filter
    st.subheader("Find Recipes")
    
    # Create two columns for search and filter
    col1, col2 = st.columns(2)
    
    with col1:
        search_query = st.text_input("Search recipes:", 
                                   key=f"recipe_search_{section_key}",
                                   placeholder="Enter recipe name or ingredient")
    
    with col2:
        # Get all available categories
        categories = list(recipe_db.recipe_categories.keys())
        categories.insert(0, "all")
        
        selected_category = st.selectbox(
            "Filter by category:",
            options=[c.replace('_', ' ').capitalize() for c in categories],
            key=f"recipe_category_{section_key}"
        )
        # Convert display category back to category key
        filter_category = selected_category.lower().replace(' ', '_') if selected_category != "All" else None
    
    # Search for recipes
    search_results = recipe_db.search_recipes(query=search_query, category=filter_category)
    
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
                        
                        # Show ingredients snippet
                        ingredients = recipe.get('ingredients', '')
                        if len(ingredients) > 100:
                            ingredients = ingredients[:97] + "..."
                        st.write(f"Ingredients: {ingredients}")
                        
                        # View details button
                        if st.button("View Details", key=f"view_{recipe.get('id')}_{i+j}"):
                            st.session_state.selected_recipe = recipe.get('id')
    else:
        st.info("No matching recipes found. Try a different search or upload recipes.")
    
    # Show selected recipe details
    if 'selected_recipe' in st.session_state and st.session_state.selected_recipe:
        st.markdown("---")
        st.subheader("Recipe Details")
        
        # Get recipe
        recipe = recipe_db.get_recipe_by_id(st.session_state.selected_recipe)
        
        if recipe:
            # Display recipe details
            display_recipe_card(recipe, show_details=True)
            
            # Add to meal button
            if st.button("Add to Selected Foods", key=f"add_recipe_foods_{section_key}"):
                # Convert recipe to food items
                macros = recipe.get('macros', {})
                food_item = {
                    'name': recipe.get('title', 'Recipe'),
                    'fdcId': f"recipe_{recipe.get('id')}",
                    'category': recipe.get('category', 'other'),
                    'calories': macros.get('calories', 0),
                    'protein': macros.get('protein', 0),
                    'carbs': macros.get('carbs', 0),
                    'fat': macros.get('fat', 0),
                    'fiber': 0,
                    'isRecipe': True
                }
                
                # Add to selected foods
                if food_item['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                    st.session_state.selected_foods.append(food_item)
                    st.success(f"Added {food_item['name']} to selected foods!")
                else:
                    st.warning(f"{food_item['name']} is already in your selected foods.")
            
            # Close details button
            if st.button("Close Details", key=f"close_details_{section_key}"):
                st.session_state.selected_recipe = None
                st.rerun()

# Food Search UI
def food_search_ui(section_key="main_search"):
    """UI for searching foods in FDC database"""
    st.header("Food Search")
    
    # Add food category filter
    food_categories = ["All Foods", "Protein Sources", "Carb Sources", "Fat Sources", "Vegetables", "Fruits"]
    selected_category = st.selectbox(
        "Filter by food category:",
        food_categories,
        key=f"category_filter_{section_key}"
    )
    
    # Search form
    col1, col2 = st.columns([3, 1])
    
    with col1:
        search_query = st.text_input(
            "Search for foods:", 
            key=f"search_query_{section_key}",
            placeholder="Enter food name (e.g., chicken breast, brown rice, avocado)"
        )
        
        # Add category-specific search suggestions
        if selected_category == "Protein Sources":
            st.info("Try searching for: chicken breast, tuna, ground beef, tofu, eggs, Greek yogurt, lentils, cottage cheese")
        elif selected_category == "Carb Sources":
            st.info("Try searching for: brown rice, quinoa, sweet potato, oats, pasta, bread, beans, corn")
        elif selected_category == "Fat Sources":
            st.info("Try searching for: avocado, olive oil, nuts, seeds, nut butter, cheese, coconut")
        elif selected_category == "Vegetables":
            st.info("Try searching for: broccoli, spinach, kale, carrots, bell peppers, tomatoes, zucchini")
        elif selected_category == "Fruits":
            st.info("Try searching for: apple, banana, berries, orange, mango, pineapple, grapes")
    
    with col2:
        search_button = st.button("Search", key=f"search_button_{section_key}")
    
    # If search button is clicked, perform search
    if search_button and search_query:
        with st.spinner("Searching for foods..."):
            # Call the FDC API to search for foods
            results = fdc_api.search_foods(search_query)
            
            if results:
                # Filter results by category if a specific category is selected
                if selected_category != "All Foods":
                    filtered_results = []
                    for food in results:
                        # Get detailed nutritional information
                        try:
                            food_details = fdc_api.get_food_details(food.get('fdcId', ''))
                            nutrients = fdc_api.extract_nutrients(food_details)
                            food_category = fdc_api.categorize_food(nutrients)
                            
                            # Categorize based on macronutrient ratio and keywords
                            if selected_category == "Protein Sources" and (food_category == "protein" or 
                                any(keyword in food.get('description', '').lower() for keyword in ["chicken", "beef", "fish", "turkey", "tofu", "egg", "yogurt", "protein", "whey", "cottage cheese", "tuna", "salmon", "lentil", "bean"])):
                                filtered_results.append(food)
                            elif selected_category == "Carb Sources" and (food_category == "carb" or 
                                any(keyword in food.get('description', '').lower() for keyword in ["rice", "pasta", "bread", "potato", "oat", "cereal", "grain", "wheat", "quinoa", "corn", "barley"])):
                                filtered_results.append(food)
                            elif selected_category == "Fat Sources" and (food_category == "fat" or 
                                any(keyword in food.get('description', '').lower() for keyword in ["oil", "butter", "nut", "seed", "avocado", "olive", "coconut", "cheese"])):
                                filtered_results.append(food)
                            elif selected_category == "Vegetables" and any(keyword in food.get('description', '').lower() for keyword in ["vegetable", "broccoli", "spinach", "kale", "lettuce", "carrot", "tomato", "cucumber", "pepper", "onion", "zucchini", "celery"]):
                                filtered_results.append(food)
                            elif selected_category == "Fruits" and any(keyword in food.get('description', '').lower() for keyword in ["fruit", "apple", "banana", "orange", "berry", "pear", "grape", "mango", "pineapple", "melon", "peach", "plum"]):
                                filtered_results.append(food)
                        except:
                            # If there's an error getting details, skip categorization
                            pass
                    
                    st.session_state.food_search_results = filtered_results
                    st.success(f"Found {len(filtered_results)} {selected_category.lower()} for '{search_query}'")
                else:
                    st.session_state.food_search_results = results
                    st.success(f"Found {len(results)} results for '{search_query}'")
            else:
                st.warning(f"No results found for '{search_query}'")
    
    # If there are search results, display them
    if st.session_state.food_search_results:
        # Display the search results in a table
        st.subheader("Search Results")
        
        # Create a table of search results
        table_data = []
        
        for i, result in enumerate(st.session_state.food_search_results[:20]):  # Limit to 20 results
            # Get basic info
            food_name = result.get('description', 'Unknown Food')
            brand = result.get('brandName', '')
            data_type = result.get('dataType', '')
            fdc_id = result.get('fdcId', '')
            
            if brand:
                display_name = f"{food_name} ({brand})"
            else:
                display_name = food_name
            
            table_data.append({
                'Index': i + 1,
                'Food Name': display_name,
                'Type': data_type,
                'FDC ID': fdc_id
            })
        
        # Convert to DataFrame and display
        results_df = pd.DataFrame(table_data)
        st.dataframe(results_df, use_container_width=True)
        
        # Food details and selection
        food_idx = st.number_input(
            "Select food by index:", 
            min_value=1, 
            max_value=len(st.session_state.food_search_results[:20]), 
            value=1, 
            key=f"food_idx_{section_key}"
        ) - 1
        
        if food_idx >= 0 and food_idx < len(st.session_state.food_search_results[:20]):
            selected_food = st.session_state.food_search_results[food_idx]
            
            # Get detailed info
            with st.spinner("Loading food details..."):
                food_details = fdc_api.get_food_details(selected_food['fdcId'])
                
                if food_details:
                    # Normalize the food data
                    normalized_food = fdc_api.normalize_food_data(food_details)
                    
                    # Display nutrients
                    st.subheader(f"Nutrients for {normalized_food['name']} (per 100g)")
                    
                    col1, col2, col3, col4, col5 = st.columns(5)
                    
                    with col1:
                        st.metric("Calories", f"{normalized_food['calories']:.0f} kcal")
                    
                    with col2:
                        st.metric("Protein", f"{normalized_food['protein']:.1f}g")
                    
                    with col3:
                        st.metric("Carbs", f"{normalized_food['carbs']:.1f}g")
                    
                    with col4:
                        st.metric("Fat", f"{normalized_food['fat']:.1f}g")
                    
                    with col5:
                        st.metric("Fiber", f"{normalized_food['fiber']:.1f}g")
                    
                    # Display macronutrient breakdown as percentages
                    st.subheader("Macronutrient Breakdown")
                    
                    # Calculate calories from macros
                    protein_cals = normalized_food['protein'] * 4
                    carb_cals = normalized_food['carbs'] * 4
                    fat_cals = normalized_food['fat'] * 9
                    total_cals = protein_cals + carb_cals + fat_cals
                    
                    if total_cals > 0:
                        protein_pct = (protein_cals / total_cals) * 100
                        carb_pct = (carb_cals / total_cals) * 100
                        fat_pct = (fat_cals / total_cals) * 100
                        
                        # Display as a bar chart
                        fig, ax = plt.subplots(figsize=(8, 2))
                        ax.barh(['Macros'], [protein_pct], color='#ff9999', label=f'Protein: {protein_pct:.1f}%')
                        ax.barh(['Macros'], [carb_pct], left=[protein_pct], color='#99ff99', label=f'Carbs: {carb_pct:.1f}%')
                        ax.barh(['Macros'], [fat_pct], left=[protein_pct + carb_pct], color='#9999ff', label=f'Fat: {fat_pct:.1f}%')
                        
                        ax.set_xlim(0, 100)
                        ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.2), ncol=3)
                        ax.set_xticks([])
                        ax.set_yticks([])
                        
                        for spine in ax.spines.values():
                            spine.set_visible(False)
                        
                        st.pyplot(fig)
                    
                    # Add to favorites button
                    fav_col1, fav_col2 = st.columns(2)
                    
                    with fav_col1:
                        if st.button("Add to Favorites", key=f"add_fav_{section_key}"):
                            fdc_api.add_to_favorites(normalized_food)
                            st.success(f"Added {normalized_food['name']} to favorites!")
                    
                    with fav_col2:
                        if st.button("Add to Selected Foods", key=f"add_selected_{section_key}"):
                            # Check if already in selected foods
                            if normalized_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                st.session_state.selected_foods.append(normalized_food)
                                st.success(f"Added {normalized_food['name']} to selected foods!")
                            else:
                                st.warning(f"{normalized_food['name']} is already in your selected foods.")
                    
                    return normalized_food
    
    return None

# Function to display favorites
def favorites_ui(section_key="favorites"):
    st.header("My Favorite Foods")
    
    # Get user favorites
    favorites = fdc_api.get_user_favorites()
    
    if not favorites:
        st.info("You haven't added any favorite foods yet. Use the search to find and add foods to your favorites.")
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
                'Calories': f"{food['calories']:.0f}",
                'Protein': f"{food['protein']:.1f}g",
                'Carbs': f"{food['carbs']:.1f}g",
                'Fat': f"{food['fat']:.1f}g",
                'Fiber': f"{food.get('fiber', 0):.1f}g"
            })
        
        # Create a DataFrame and display it
        favorites_df = pd.DataFrame(table_data)
        st.dataframe(favorites_df, use_container_width=True)
    
    # Food selection
    food_idx = st.number_input(
        "Select food by index:", 
        min_value=1, 
        max_value=len(favorites), 
        value=1, 
        key=f"fav_idx_{section_key}"
    ) - 1
    
    if food_idx >= 0 and food_idx < len(favorites):
        selected_food = favorites[food_idx]
        
        # Display nutrients
        st.subheader(f"Selected: {selected_food['name']}")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Button to remove from favorites
            if st.button("Remove from Favorites", key=f"remove_fav_{section_key}"):
                fdc_api.remove_from_favorites(selected_food.get('fdcId', ''))
                st.success(f"Removed {selected_food['name']} from favorites!")
                st.rerun()
        
        with col2:
            if st.button("Add to Selected Foods", key=f"add_selected_fav_{section_key}"):
                # Check if already in selected foods
                if selected_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                    st.session_state.selected_foods.append(selected_food)
                    st.success(f"Added {selected_food['name']} to selected foods!")
                else:
                    st.warning(f"{selected_food['name']} is already in your selected foods.")
        
        return selected_food
    
    return None

# Function to display selected foods
def selected_foods_ui(section_key="selected"):
    st.header("Selected Foods")
    
    if not st.session_state.selected_foods:
        st.info("No foods selected yet. Use the search or favorites to add foods.")
        return
    
    # Display selected foods in a table
    table_data = []
    
    for i, food in enumerate(st.session_state.selected_foods):
        table_data.append({
            'Index': i + 1,
            'Food Name': food['name'],
            'Category': food.get('category', 'Unknown').capitalize(),
            'Calories': f"{food['calories']:.0f}",
            'Protein': f"{food['protein']:.1f}g",
            'Carbs': f"{food['carbs']:.1f}g",
            'Fat': f"{food['fat']:.1f}g"
        })
    
    # Create a DataFrame and display it
    selected_df = pd.DataFrame(table_data)
    st.dataframe(selected_df, use_container_width=True)
    
    # Total nutrition
    total_calories = sum(food['calories'] for food in st.session_state.selected_foods)
    total_protein = sum(food['protein'] for food in st.session_state.selected_foods)
    total_carbs = sum(food['carbs'] for food in st.session_state.selected_foods)
    total_fat = sum(food['fat'] for food in st.session_state.selected_foods)
    
    st.subheader("Total Nutrition (per 100g)")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Calories", f"{total_calories:.0f} kcal")
    
    with col2:
        st.metric("Protein", f"{total_protein:.1f}g")
    
    with col3:
        st.metric("Carbs", f"{total_carbs:.1f}g")
    
    with col4:
        st.metric("Fat", f"{total_fat:.1f}g")
    
    # Calculate percentages for pie chart
    protein_cals = total_protein * 4
    carb_cals = total_carbs * 4
    fat_cals = total_fat * 9
    total_cals = protein_cals + carb_cals + fat_cals
    
    if total_cals > 0:
        protein_pct = (protein_cals / total_cals) * 100
        carb_pct = (carb_cals / total_cals) * 100
        fat_pct = (fat_cals / total_cals) * 100
        
        # Create pie chart
        fig, ax = plt.subplots(figsize=(6, 6))
        ax.pie([protein_pct, carb_pct, fat_pct], 
              labels=['Protein', 'Carbs', 'Fat'],
              colors=['#ff9999', '#99ff99', '#9999ff'],
              autopct='%1.1f%%',
              startangle=90)
        ax.axis('equal')
        st.pyplot(fig)
    
    # Button to clear all selected foods
    if st.button("Clear All Foods", key=f"clear_foods_{section_key}"):
        st.session_state.selected_foods = []
        st.success("All foods cleared!")
        st.rerun()
    
    # Button to remove a food
    food_to_remove = st.number_input(
        "Select food to remove by index:", 
        min_value=1, 
        max_value=len(st.session_state.selected_foods), 
        value=1, 
        key=f"remove_idx_{section_key}"
    ) - 1
    
    if st.button("Remove Selected Food", key=f"remove_food_{section_key}"):
        if 0 <= food_to_remove < len(st.session_state.selected_foods):
            food_name = st.session_state.selected_foods[food_to_remove]['name']
            st.session_state.selected_foods.pop(food_to_remove)
            st.success(f"Removed {food_name} from selected foods!")
            st.rerun()

# Function to calculate optimal portion sizes
def calculate_optimal_portions(selected_foods, target_macros):
    """
    Calculate optimal portion sizes for selected foods to meet target macros
    
    Parameters:
    - selected_foods: List of food dictionaries
    - target_macros: Dict with keys 'calories', 'protein', 'carbs', 'fat'
    
    Returns:
    - Dict with food names as keys and portion sizes as values
    """
    # If no foods selected or no targets, return default portions
    if not selected_foods or not target_macros:
        return {food['name']: 100 for food in selected_foods}
    
    # Extract target macros
    target_calories = target_macros.get('target_calories', 0)
    target_protein = target_macros.get('protein', 0)
    target_carbs = target_macros.get('carbs', 0) 
    target_fat = target_macros.get('fat', 0)
    
    # If no targets set, return default portions
    if target_calories == 0 and target_protein == 0 and target_carbs == 0 and target_fat == 0:
        return {food['name']: 100 for food in selected_foods}
    
    # Create arrays of nutrient values per 100g
    calories_per_100g = np.array([food['calories'] for food in selected_foods])
    protein_per_100g = np.array([food['protein'] for food in selected_foods])
    carbs_per_100g = np.array([food['carbs'] for food in selected_foods])
    fat_per_100g = np.array([food['fat'] for food in selected_foods])
    
    # Define the objective function to minimize
    def objective(portions):
        # Calculate total nutrients with current portions
        total_cals = np.sum(calories_per_100g * portions / 100)
        total_protein = np.sum(protein_per_100g * portions / 100)
        total_carbs = np.sum(carbs_per_100g * portions / 100)
        total_fat = np.sum(fat_per_100g * portions / 100)
        
        # Calculate the error (difference from targets)
        cal_error = ((total_cals - target_calories) / max(1, target_calories)) ** 2 if target_calories > 0 else 0
        protein_error = ((total_protein - target_protein) / max(1, target_protein)) ** 2 if target_protein > 0 else 0
        carbs_error = ((total_carbs - target_carbs) / max(1, target_carbs)) ** 2 if target_carbs > 0 else 0
        fat_error = ((total_fat - target_fat) / max(1, target_fat)) ** 2 if target_fat > 0 else 0
        
        # Weight the errors (prioritize protein, then calories, then carbs/fat)
        return protein_error * 1.5 + cal_error * 1.0 + carbs_error * 0.8 + fat_error * 0.8
    
    # Initial guess: all portions at 100g
    initial_portions = np.array([100] * len(selected_foods))
    
    # Constraint: portions must be positive (at least 10g per food)
    bounds = [(10, 500) for _ in selected_foods]
    
    # Solve the optimization problem
    try:
        result = minimize(objective, initial_portions, method='SLSQP', bounds=bounds)
        optimal_portions = result.x
        
        # Create a dictionary of food name to portion
        return {food['name']: round(portion) for food, portion in zip(selected_foods, optimal_portions)}
    except:
        # If optimization fails, return default portions
        return {food['name']: 100 for food in selected_foods}

# Function to create a recipe
def create_recipe_ui(section_key="recipe"):
    """UI for creating a recipe from selected foods"""
    st.header("Create Recipe")
    
    if not st.session_state.selected_foods:
        st.warning("Please add foods to your selection before creating a recipe.")
        return
    
    # Recipe form
    recipe_name = st.text_input("Recipe Name:", key=f"recipe_name_{section_key}", 
                               placeholder="E.g., High Protein Breakfast, Post-Workout Meal")
    
    meal_type = st.selectbox("Meal Type:", 
                            ["Breakfast", "Lunch", "Dinner", "Snack", "Any"], 
                            key=f"meal_type_{section_key}")
    
    # Target nutrients - Get from day-specific nutrition if available
    has_targets = False
    target_macros = {}
    
    # Check if we have day-specific targets
    if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        selected_day = st.selectbox("Select day for targets:", days, key=f"target_day_{section_key}")
        
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
    auto_calculate = st.checkbox("Auto-calculate portion sizes to match targets", value=has_targets, key=f"auto_calc_{section_key}")
    
    # Meal percent - what percent of daily targets should this recipe account for
    meal_percent = 100
    optimal_portions = {food['name']: 100 for food in st.session_state.selected_foods}
    
    if has_targets and auto_calculate:
        # Options for meal number and meal timing
        col1, col2 = st.columns(2)
        with col1:
            # Which meal number is this (1, 2, 3, etc.)
            meal_number = st.number_input("Meal Number:", min_value=1, max_value=6, value=1, 
                                        help="Which meal of the day is this (1st, 2nd, etc.)",
                                        key=f"meal_num_{section_key}")
        
        with col2:
            # Total planned meals for the day
            total_meals = st.number_input("Total Meals for Day:", min_value=1, max_value=6, 
                                        value=3, 
                                        help="How many total meals do you plan to have on this day?",
                                        key=f"total_meals_{section_key}")
        
        # Get workout info for the selected day
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
                                   min_value=10, max_value=100, value=33, key=f"meal_pct_{section_key}")
            
            # Adjust target macros based on percentage
            adjusted_targets = {
                'target_calories': target_macros.get('target_calories', 0) * meal_percent / 100,
                'protein': target_macros.get('protein', 0) * meal_percent / 100,
                'carbs': target_macros.get('carbs', 0) * meal_percent / 100,
                'fat': target_macros.get('fat', 0) * meal_percent / 100
            }
        
        # Calculate optimal portions
        optimal_portions = calculate_optimal_portions(st.session_state.selected_foods, adjusted_targets)
        
        st.success(f"Portions auto-calculated to meet {meal_percent}% of daily targets")
    
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
                key=f"portion_{i}_{section_key}"
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
    
    # Calculate macros percentages for visualization
    protein_cals = total_nutrition['protein'] * 4
    carb_cals = total_nutrition['carbs'] * 4
    fat_cals = total_nutrition['fat'] * 9
    total_cals = protein_cals + carb_cals + fat_cals
    
    if total_cals > 0:
        protein_pct = (protein_cals / total_cals) * 100
        carb_pct = (carb_cals / total_cals) * 100
        fat_pct = (fat_cals / total_cals) * 100
        
        # Create pie chart
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.pie([protein_pct, carb_pct, fat_pct], 
              labels=['Protein', 'Carbs', 'Fat'],
              colors=['#ff9999', '#99ff99', '#9999ff'],
              autopct='%1.1f%%',
              startangle=90)
        ax.axis('equal')
        st.pyplot(fig)
    
    # Save recipe button
    if st.button("Save Recipe", key=f"save_recipe_{section_key}") and recipe_name:
        # Add recipe to recipes
        fdc_api.add_recipe(recipe_name, st.session_state.selected_foods, portions, meal_type)
        st.success(f"Recipe '{recipe_name}' saved successfully!")
        
        # Clear selected foods
        if st.button("Clear Selected Foods", key=f"clear_after_save_{section_key}"):
            st.session_state.selected_foods = []
            st.rerun()

# Function to manage recipes
def recipes_ui(section_key="recipes"):
    """UI for managing saved recipes"""
    st.header("My Recipes")
    
    # Get user recipes
    recipes = fdc_api.get_user_recipes()
    
    if not recipes:
        st.info("You haven't created any recipes yet. Use the 'Create Recipe' tab to create and save recipes.")
        return
    
    # Display recipes in a table
    table_data = []
    
    for i, recipe in enumerate(recipes):
        table_data.append({
            'Index': i + 1,
            'Recipe Name': recipe['name'],
            'Meal Type': recipe['meal_type'],
            'Calories': f"{recipe.get('total_calories', 0):.0f}",
            'Protein': f"{recipe.get('total_protein', 0):.1f}g",
            'Carbs': f"{recipe.get('total_carbs', 0):.1f}g",
            'Fat': f"{recipe.get('total_fat', 0):.1f}g"
        })
    
    # Convert to DataFrame and display
    recipes_df = pd.DataFrame(table_data)
    st.dataframe(recipes_df, use_container_width=True)
    
    # Recipe selection
    recipe_idx = st.number_input(
        "Select recipe by index:", 
        min_value=1, 
        max_value=len(recipes), 
        value=1, 
        key=f"recipe_idx_{section_key}"
    ) - 1
    
    if recipe_idx >= 0 and recipe_idx < len(recipes):
        selected_recipe = recipes[recipe_idx]
        
        # Display recipe details
        st.subheader(f"Selected: {selected_recipe['name']}")
        st.write(f"Meal Type: {selected_recipe['meal_type']}")
        
        # Display ingredients
        st.write("**Ingredients:**")
        ingredients_data = []
        
        for food in selected_recipe.get('foods', []):
            # Get portion size
            portion = selected_recipe.get('portions', {}).get(food['name'], 100)
            
            ingredients_data.append({
                'Food': food['name'],
                'Portion': f"{portion}g",
                'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                'Protein': f"{food['protein'] * portion / 100:.1f}g",
                'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                'Fat': f"{food['fat'] * portion / 100:.1f}g"
            })
        
        # Convert to DataFrame and display
        ingredients_df = pd.DataFrame(ingredients_data)
        st.dataframe(ingredients_df, use_container_width=True)
        
        # Action buttons for the recipe
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Delete Recipe", key=f"delete_recipe_{section_key}"):
                # Remove the recipe from the recipes list
                recipes.pop(recipe_idx)
                fdc_api.save_user_recipes(recipes)
                st.success(f"Recipe '{selected_recipe['name']}' deleted successfully!")
                st.rerun()
        
        with col2:
            if st.button("Add to Meal Plan", key=f"add_to_meal_{section_key}"):
                st.session_state.add_recipe_to_meal = selected_recipe
                st.info("Recipe added. Go to 'Meal Planning' tab to add it to a specific meal.")
        
        with col3:
            if st.button("Load Recipe Foods", key=f"load_recipe_{section_key}"):
                # Add all foods from the recipe to selected foods
                for food in selected_recipe.get('foods', []):
                    if food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                        st.session_state.selected_foods.append(food)
                
                st.success(f"Added foods from '{selected_recipe['name']}' to selected foods!")
                st.rerun()

# Function for meal planning by day
def meal_planning_ui(section_key="meal_plan"):
    """UI for planning meals by day"""
    st.header("Weekly Meal Planning")
    
    # Initialize weekly meal plan in session state if not exists
    if 'weekly_meal_plan' not in st.session_state:
        st.session_state.weekly_meal_plan = {
            day: {
                'meals': [],
                'total_nutrition': {
                    'calories': 0,
                    'protein': 0,
                    'carbs': 0,
                    'fat': 0,
                    'fiber': 0
                }
            }
            for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }
    
    # Check if day-specific nutrition targets exist from Weekly Schedule page
    has_nutrition_targets = False
    if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
        has_nutrition_targets = True
        st.success("📊 Great! You've set up day-specific nutrition targets in the Weekly Schedule. These will be used to guide your meal planning.")
    else:
        st.warning("⚠️ You haven't set up day-specific nutrition targets yet. For best results, go to 'Weekly Schedule and Nutrition' page first to set your targets for each day.")
    
    # Day selection
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    selected_day = st.selectbox("Select Day:", days, key=f"day_select_{section_key}")
    
    # Get workout info for the selected day
    workout_info = get_day_workout_info(selected_day)
    
    # Store workout information in session state for this page
    if 'current_workout_info' not in st.session_state:
        st.session_state.current_workout_info = {}
    
    st.session_state.current_workout_info = workout_info
    
    # Display workout information if available
    if workout_info['has_workout']:
        workout_type = workout_info['workout_type']
        workout_time = workout_info['workout_time']
        st.info(f"🏋️ {workout_type} training scheduled for {selected_day} ({workout_time}). Meal macros will be optimized around your workout time.")
        
        # Show training-based distribution table
        st.subheader("Training-Based Macro Distribution")
        st.write("The table below shows the recommended macro distribution for each meal based on your workout timing:")
        
        # Get coefficients for different meal counts
        training_time = workout_info['workout_time']
        coefficient_data = []
        
        # Get distribution for 2-5 meals
        for meal_count in range(2, 6):
            meal_distribution = get_meal_distribution(selected_day, meal_count)
            
            for meal_num in range(1, meal_count + 1):
                if meal_num in meal_distribution:
                    meal_info = meal_distribution[meal_num]
                    coefficient_data.append({
                        "Total Meals": meal_count,
                        "Meal #": meal_num,
                        "Description": meal_info['description'],
                        "Protein %": f"{meal_info['protein']*100:.0f}%",
                        "Carbs %": f"{meal_info['carbs']*100:.0f}%",
                        "Fat %": f"{meal_info['fat']*100:.0f}%"
                    })
        
        # Display coefficient table
        if coefficient_data:
            coeff_df = pd.DataFrame(coefficient_data)
            st.dataframe(coeff_df, use_container_width=True)
    else:
        st.info("🍽️ No workout scheduled for this day. Macros will be distributed evenly across meals.")
    
    # Display current plan and nutrition targets for the selected day
    st.subheader(f"Meal Plan for {selected_day}")
    
    # Get meals for the day
    day_plan = st.session_state.weekly_meal_plan[selected_day]
    meals = day_plan.get('meals', [])
    
    # Display nutrition targets if available
    if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
        targets = st.session_state.day_specific_nutrition[selected_day]
        
        # Create columns for target display
        target_cols = st.columns(4)
        with target_cols[0]:
            st.metric("Target Calories", f"{targets.get('target_calories', 0)} kcal")
        with target_cols[1]:
            st.metric("Target Protein", f"{targets.get('protein', 0)}g")
        with target_cols[2]:
            st.metric("Target Carbs", f"{targets.get('carbs', 0)}g")
        with target_cols[3]:
            st.metric("Target Fat", f"{targets.get('fat', 0)}g")
            
        # Calculate and display current totals and remaining targets
        total_calories = day_plan['total_nutrition']['calories']
        total_protein = day_plan['total_nutrition']['protein']
        total_carbs = day_plan['total_nutrition']['carbs']
        total_fat = day_plan['total_nutrition']['fat']
        
        remaining_calories = targets.get('target_calories', 0) - total_calories
        remaining_protein = targets.get('protein', 0) - total_protein
        remaining_carbs = targets.get('carbs', 0) - total_carbs
        remaining_fat = targets.get('fat', 0) - total_fat
        
        st.subheader("Nutrition Progress")
        progress_cols = st.columns(4)
        with progress_cols[0]:
            st.metric("Calories", f"{int(total_calories)} kcal", f"{int(remaining_calories)} remaining")
            cal_progress = min(100, (total_calories / targets.get('target_calories', 1)) * 100)
            st.progress(cal_progress / 100)
        with progress_cols[1]:
            st.metric("Protein", f"{total_protein:.1f}g", f"{remaining_protein:.1f}g remaining")
            protein_progress = min(100, (total_protein / targets.get('protein', 1)) * 100)
            st.progress(protein_progress / 100)
        with progress_cols[2]:
            st.metric("Carbs", f"{total_carbs:.1f}g", f"{remaining_carbs:.1f}g remaining")
            carbs_progress = min(100, (total_carbs / targets.get('carbs', 1)) * 100)
            st.progress(carbs_progress / 100)
        with progress_cols[3]:
            st.metric("Fat", f"{total_fat:.1f}g", f"{remaining_fat:.1f}g remaining")
            fat_progress = min(100, (total_fat / targets.get('fat', 1)) * 100)
            st.progress(fat_progress / 100)
    
    if not meals:
        st.info(f"No meals planned for {selected_day} yet. Add meals below.")
    else:
        # Display meals
        for i, meal in enumerate(meals):
            st.write(f"**Meal {i+1}: {meal.get('name', 'Unnamed Meal')}**")
            
            # Display meal details
            meal_data = []
            
            for food in meal.get('foods', []):
                portion = meal.get('portions', {}).get(food['name'], 100)
                
                meal_data.append({
                    'Food': food['name'],
                    'Portion': f"{portion}g",
                    'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                    'Protein': f"{food['protein'] * portion / 100:.1f}g",
                    'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                    'Fat': f"{food['fat'] * portion / 100:.1f}g"
                })
            
            if meal_data:
                meal_df = pd.DataFrame(meal_data)
                st.dataframe(meal_df, use_container_width=True)
                
                # Remove meal button
                if st.button("Remove Meal", key=f"remove_meal_{selected_day}_{i}"):
                    # Remove meal from the plan
                    meals.pop(i)
                    
                    # Recalculate total nutrition for the day
                    day_plan['total_nutrition'] = {
                        'calories': 0,
                        'protein': 0,
                        'carbs': 0,
                        'fat': 0,
                        'fiber': 0
                    }
                    
                    for m in meals:
                        for food in m.get('foods', []):
                            portion = m.get('portions', {}).get(food['name'], 100)
                            
                            day_plan['total_nutrition']['calories'] += food['calories'] * portion / 100
                            day_plan['total_nutrition']['protein'] += food['protein'] * portion / 100
                            day_plan['total_nutrition']['carbs'] += food['carbs'] * portion / 100
                            day_plan['total_nutrition']['fat'] += food['fat'] * portion / 100
                            day_plan['total_nutrition']['fiber'] += food.get('fiber', 0) * portion / 100
                    
                    st.success(f"Removed Meal {i+1} from {selected_day}.")
                    st.rerun()
    
    # Display total nutrition for the day
    st.subheader("Daily Nutrition Totals")
    
    total_nutrition = day_plan.get('total_nutrition', {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    })
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Calories", f"{total_nutrition.get('calories', 0):.0f} kcal")
    
    with col2:
        st.metric("Protein", f"{total_nutrition.get('protein', 0):.1f}g")
    
    with col3:
        st.metric("Carbs", f"{total_nutrition.get('carbs', 0):.1f}g")
    
    with col4:
        st.metric("Fat", f"{total_nutrition.get('fat', 0):.1f}g")
    
    with col5:
        st.metric("Fiber", f"{total_nutrition.get('fiber', 0):.1f}g")
    
    # Add new meal section
    st.subheader("Add New Meal")
    
    meal_name = st.text_input("Meal Name:", key=f"new_meal_name_{selected_day}", 
                            placeholder="E.g., Breakfast, Lunch, Dinner, Snack")
    
    # Check if there are selected foods or a recipe to add
    if st.session_state.selected_foods:
        st.write("**Selected Foods:**")
        
        selected_foods_data = []
        portions = {}
        
        for i, food in enumerate(st.session_state.selected_foods):
            col1, col2 = st.columns([3, 1])
            
            with col1:
                st.write(f"{food['name']}")
            
            with col2:
                portion = st.number_input(
                    f"Portion (g):", 
                    min_value=0, 
                    value=100,
                    key=f"meal_portion_{selected_day}_{i}"
                )
                portions[food['name']] = portion
            
            selected_foods_data.append({
                'Food': food['name'],
                'Portion': f"{portion}g",
                'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                'Protein': f"{food['protein'] * portion / 100:.1f}g",
                'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                'Fat': f"{food['fat'] * portion / 100:.1f}g"
            })
        
        if selected_foods_data:
            selected_df = pd.DataFrame(selected_foods_data)
            st.dataframe(selected_df, use_container_width=True)
            
            # Add options for meal number and meal timing
            col1, col2 = st.columns(2)
            with col1:
                # Which meal number is this (1, 2, 3, etc.)
                meal_number = st.number_input("Meal Number:", min_value=1, max_value=6, value=len(meals) + 1, 
                                            help="Which meal of the day is this (1st, 2nd, etc.)")
            
            with col2:
                # Total planned meals for the day
                total_meals = st.number_input("Total Meals for Day:", min_value=1, max_value=6, 
                                            value=max(len(meals) + 1, meal_number),
                                            help="How many total meals do you plan to have on this day?")
            
            # Get meal distribution based on workout timing
            meal_distribution = get_meal_distribution(selected_day, total_meals)
            
            # Display meal distribution if available
            if meal_number in meal_distribution:
                meal_info = meal_distribution[meal_number]
                
                # Display meal description and distribution info
                st.info(f"**Meal {meal_number} ({meal_info['description']})** - Recommended distribution: "
                       f"Protein: {meal_info['protein']*100:.0f}%, "
                       f"Carbs: {meal_info['carbs']*100:.0f}%, "
                       f"Fat: {meal_info['fat']*100:.0f}%")
            
            # Add options for auto-calculating portions
            optimize_col1, optimize_col2 = st.columns(2)
            
            with optimize_col1:
                if st.button("Calculate Optimal Portions", key=f"optimize_portions_{selected_day}"):
                    # Get day's targets
                    if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
                        targets = st.session_state.day_specific_nutrition[selected_day]
                        
                        # Apply meal-specific distribution if available
                        if meal_number in meal_distribution:
                            meal_info = meal_distribution[meal_number]
                            adjusted_targets = {
                                'target_calories': targets.get('target_calories', 0) * meal_info['protein'],  # Using protein as calorie proxy
                                'protein': targets.get('protein', 0) * meal_info['protein'],
                                'carbs': targets.get('carbs', 0) * meal_info['carbs'],
                                'fat': targets.get('fat', 0) * meal_info['fat']
                            }
                        else:
                            # Default to even distribution if no specific info
                            adjusted_targets = {
                                'target_calories': targets.get('target_calories', 0) / total_meals,
                                'protein': targets.get('protein', 0) / total_meals,
                                'carbs': targets.get('carbs', 0) / total_meals,
                                'fat': targets.get('fat', 0) / total_meals
                            }
                        
                        # Calculate optimal portions
                        optimal_portions = calculate_optimal_portions(st.session_state.selected_foods, adjusted_targets)
                        
                        # Update portions
                        for food_name, portion in optimal_portions.items():
                            portions[food_name] = portion
                        
                        st.success(f"Portions optimized for Meal {meal_number} based on training time and macro distribution!")
                        st.rerun()
            
            with optimize_col2:
                if st.button("Add to Meal Plan", key=f"add_to_plan_{selected_day}") and meal_name:
                    # Create a new meal
                    new_meal = {
                        'name': meal_name,
                        'foods': st.session_state.selected_foods.copy(),
                        'portions': portions.copy(),
                        'meal_number': meal_number,
                        'total_meals': total_meals
                    }
                    
                    # Add to the day's meal plan
                    meals.append(new_meal)
                    
                    # Update total nutrition for the day
                    for food in new_meal['foods']:
                        portion = new_meal['portions'].get(food['name'], 100)
                        
                        day_plan['total_nutrition']['calories'] += food['calories'] * portion / 100
                        day_plan['total_nutrition']['protein'] += food['protein'] * portion / 100
                        day_plan['total_nutrition']['carbs'] += food['carbs'] * portion / 100
                        day_plan['total_nutrition']['fat'] += food['fat'] * portion / 100
                        day_plan['total_nutrition']['fiber'] += food.get('fiber', 0) * portion / 100
                    
                    st.success(f"Added {meal_name} to {selected_day}'s meal plan!")
                    
                    # Clear selected foods
                    if st.button("Clear Selected Foods", key=f"clear_after_add_{selected_day}"):
                        st.session_state.selected_foods = []
                        st.rerun()
        else:
            st.info("No foods selected. Use the 'Food Search' or 'My Favorites' tabs to select foods for this meal.")

# Function for grocery list generation
def grocery_list_ui(section_key="grocery"):
    """UI for generating grocery lists from meal plans"""
    st.header("Grocery List Generator")
    
    # Option to select days to include
    st.subheader("Select Days to Include")
    
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    selected_days = []
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.checkbox("Monday", key=f"day_mon_{section_key}", value=True):
            selected_days.append('Monday')
        if st.checkbox("Tuesday", key=f"day_tue_{section_key}", value=True):
            selected_days.append('Tuesday')
        if st.checkbox("Wednesday", key=f"day_wed_{section_key}", value=True):
            selected_days.append('Wednesday')
        if st.checkbox("Thursday", key=f"day_thu_{section_key}", value=True):
            selected_days.append('Thursday')
    
    with col2:
        if st.checkbox("Friday", key=f"day_fri_{section_key}", value=True):
            selected_days.append('Friday')
        if st.checkbox("Saturday", key=f"day_sat_{section_key}", value=True):
            selected_days.append('Saturday')
        if st.checkbox("Sunday", key=f"day_sun_{section_key}", value=True):
            selected_days.append('Sunday')
    
    # Generate grocery list button
    if st.button("Generate Grocery List", key=f"gen_grocery_{section_key}"):
        if not selected_days:
            st.warning("Please select at least one day to include in the grocery list.")
        else:
            # Collect all foods from selected days
            all_foods = {}
            
            for day in selected_days:
                day_plan = st.session_state.weekly_meal_plan.get(day, {})
                meals = day_plan.get('meals', [])
                
                for meal in meals:
                    for food in meal.get('foods', []):
                        food_name = food['name']
                        portion = meal.get('portions', {}).get(food_name, 100)
                        
                        if food_name in all_foods:
                            all_foods[food_name]['portion'] += portion
                        else:
                            all_foods[food_name] = {
                                'food': food,
                                'portion': portion
                            }
            
            if not all_foods:
                st.warning("No foods found in the selected days. Please add meals to your plan first.")
            else:
                # Categorize foods
                categorized_foods = {
                    'Protein': [],
                    'Carbs': [],
                    'Fats': [],
                    'Fruits & Vegetables': [],
                    'Dairy': [],
                    'Other': []
                }
                
                for food_name, food_info in all_foods.items():
                    food = food_info['food']
                    portion = food_info['portion']
                    
                    # Determine category based on food properties
                    category = food.get('category', '').lower()
                    
                    if category in ['protein', 'high protein']:
                        categorized_foods['Protein'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['carb', 'carbohydrate', 'high carb']:
                        categorized_foods['Carbs'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['fat', 'high fat']:
                        categorized_foods['Fats'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['fruit', 'vegetable', 'produce']:
                        categorized_foods['Fruits & Vegetables'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['dairy', 'milk']:
                        categorized_foods['Dairy'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    else:
                        categorized_foods['Other'].append({
                            'name': food_name,
                            'portion': portion
                        })
                
                # Display grocery list by category
                st.subheader("Grocery List")
                
                grocery_text = "# Grocery List\n\n"
                
                for category, foods in categorized_foods.items():
                    if foods:
                        st.write(f"**{category}**")
                        grocery_text += f"## {category}\n\n"
                        
                        for food in foods:
                            st.write(f"- {food['name']}: {food['portion']:.0f}g")
                            grocery_text += f"- {food['name']}: {food['portion']:.0f}g\n"
                        
                        grocery_text += "\n"
                
                # Option to print/export
                st.write("---")
                st.subheader("Export Options")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button("Print Grocery List", key=f"print_grocery_{section_key}"):
                        st.code(grocery_text, language="markdown")
                        st.info("Copy the text above to print or save your grocery list.")
                
                with col2:
                    if st.download_button(
                        label="Download Grocery List",
                        data=grocery_text,
                        file_name="grocery_list.md",
                        mime="text/markdown",
                        key=f"download_grocery_{section_key}"
                    ):
                        st.success("Grocery list downloaded successfully!")

# Main layout with tabs
tab0, tab1, tab2, tab3, tab4, tab5, tab8, tab6, tab7 = st.tabs([
    "Simplified Meal Builder",
    "Food Search", 
    "My Favorites", 
    "Selected Foods", 
    "Create Recipe", 
    "My Recipes", 
    "Recipe Browser",
    "Meal Planning",
    "Grocery List"
])

with tab0:
    # New simplified meal builder
    st.header("Simplified Meal Builder")
    st.write("Quickly build a meal by selecting foods from each category. Serving sizes will adjust automatically to meet your targets.")
    
    # Get day's nutrition targets
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    selected_day = st.selectbox("Select day for nutrition targets:", days_of_week, key="simple_day_select")
    
    # Show daily targets if available
    has_targets = False
    target_macros = {}
    
    if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
        if selected_day in st.session_state.day_specific_nutrition:
            has_targets = True
            target_macros = st.session_state.day_specific_nutrition[selected_day]
            
            # Show the target macros
            st.subheader("Daily Nutrition Targets")
            target_cols = st.columns(4)
            with target_cols[0]:
                st.metric("Calories", f"{target_macros.get('target_calories', 0)} kcal")
            with target_cols[1]:
                st.metric("Protein", f"{target_macros.get('protein', 0)}g")
            with target_cols[2]:
                st.metric("Carbs", f"{target_macros.get('carbs', 0)}g")
            with target_cols[3]:
                st.metric("Fat", f"{target_macros.get('fat', 0)}g")
    
    if not has_targets:
        st.warning("Please set up your day-specific nutrition targets in the Weekly Schedule and Nutrition page first.")
        
        # Allow user to continue with default targets
        default_calories = 2000
        default_protein = 150
        default_carbs = 200
        default_fat = 65
        
        st.subheader("Use Default Targets")
        target_cols = st.columns(4)
        with target_cols[0]:
            default_calories = st.number_input("Calories (kcal)", value=default_calories, min_value=0, step=50)
        with target_cols[1]:
            default_protein = st.number_input("Protein (g)", value=default_protein, min_value=0, step=5)
        with target_cols[2]:
            default_carbs = st.number_input("Carbs (g)", value=default_carbs, min_value=0, step=5)
        with target_cols[3]:
            default_fat = st.number_input("Fat (g)", value=default_fat, min_value=0, step=5)
        
        target_macros = {
            'target_calories': default_calories,
            'protein': default_protein,
            'carbs': default_carbs,
            'fat': default_fat
        }
    
    # Meal percentage slider
    meal_percent = st.slider("What percentage of daily targets is this meal?", 
                          min_value=10, max_value=100, value=33, key="simple_meal_pct")
    
    # Adjust target macros based on percentage
    meal_targets = {
        'target_calories': target_macros.get('target_calories', 0) * meal_percent / 100,
        'protein': target_macros.get('protein', 0) * meal_percent / 100,
        'carbs': target_macros.get('carbs', 0) * meal_percent / 100,
        'fat': target_macros.get('fat', 0) * meal_percent / 100
    }
    
    # Show meal targets
    st.subheader(f"Meal Targets ({meal_percent}% of daily)")
    meal_cols = st.columns(4)
    with meal_cols[0]:
        st.metric("Calories", f"{int(meal_targets['target_calories'])} kcal")
    with meal_cols[1]:
        st.metric("Protein", f"{int(meal_targets['protein'])}g")
    with meal_cols[2]:
        st.metric("Carbs", f"{int(meal_targets['carbs'])}g")
    with meal_cols[3]:
        st.metric("Fat", f"{int(meal_targets['fat'])}g")
    
    # Initialize session state for simple meal builder
    if 'simple_selected_foods' not in st.session_state:
        st.session_state.simple_selected_foods = []
    
    # Dictionary to map food categories to display names
    category_display = {
        'protein': 'Protein Sources',
        'carb': 'Carbohydrate Sources',
        'fat': 'Fat Sources',
        'vegetable': 'Vegetables',
        'fruit': 'Fruits'
    }
    
    # Get all favorites for easier selection
    all_favorites = fdc_api.get_user_favorites()
    categorized_favorites = {}
    
    # Categorize favorites
    for food in all_favorites:
        category = food.get('category', 'other').lower()
        if category not in categorized_favorites:
            categorized_favorites[category] = []
        categorized_favorites[category].append(food)
    
    # Add a search button if user has no favorites in a category
    search_expander = st.expander("Search for Foods", expanded=False)
    with search_expander:
        st.write("Search for foods to add to your favorites, then select them in the meal builder.")
        
        search_query = st.text_input("Search for foods:", key="simple_search_query", 
                                    placeholder="Enter food name (e.g., chicken breast, brown rice, avocado)")
        
        search_category = st.selectbox(
            "Filter by category:",
            list(category_display.values()),
            key="simple_search_category"
        )
        
        if st.button("Search", key="simple_search_button"):
            if search_query:
                with st.spinner("Searching for foods..."):
                    # Call the FDC API to search for foods
                    results = fdc_api.search_foods(search_query)
                    
                    if results:
                        st.success(f"Found {len(results)} results for '{search_query}'")
                        
                        # Display up to 5 results
                        for i, result in enumerate(results[:5]):
                            if i > 0:
                                st.markdown("---")
                            
                            food_name = result.get('description', 'Unknown Food')
                            brand = result.get('brandName', '')
                            
                            if brand:
                                display_name = f"{food_name} ({brand})"
                            else:
                                display_name = food_name
                            
                            st.subheader(f"{i+1}. {display_name}")
                            
                            # Get detailed info
                            try:
                                food_details = fdc_api.get_food_details(result['fdcId'])
                                
                                if food_details:
                                    # Normalize the food data
                                    normalized_food = fdc_api.normalize_food_data(food_details)
                                    
                                    # Display nutrients
                                    cols = st.columns(5)
                                    with cols[0]:
                                        st.metric("Calories", f"{normalized_food['calories']:.0f} kcal")
                                    with cols[1]:
                                        st.metric("Protein", f"{normalized_food['protein']:.1f}g")
                                    with cols[2]:
                                        st.metric("Carbs", f"{normalized_food['carbs']:.1f}g")
                                    with cols[3]:
                                        st.metric("Fat", f"{normalized_food['fat']:.1f}g")
                                    with cols[4]:
                                        st.metric("Fiber", f"{normalized_food.get('fiber', 0):.1f}g")
                                    
                                    # Add to favorites button
                                    if st.button("Add to Favorites", key=f"add_fav_simple_{i}"):
                                        fdc_api.add_to_favorites(normalized_food)
                                        st.success(f"Added {normalized_food['name']} to favorites!")
                            except:
                                st.error(f"Error loading details for {display_name}")
                    else:
                        st.warning(f"No results found for '{search_query}'")
    
    # Create selection sections for each food category
    st.subheader("Select Foods by Category")
    
    # Function to display category selection
    def category_selection(category, display_name):
        st.write(f"### {display_name}")
        
        # Get favorites for this category
        category_favorites = categorized_favorites.get(category, [])
        
        if not category_favorites:
            st.info(f"No favorite {display_name.lower()} found. Please add some using the search above.")
            return
        
        # Create two columns for food selection
        select_cols = st.columns(2)
        
        # Allow selecting up to 2 foods per category
        for i in range(2):
            with select_cols[i]:
                # Create a selectbox with favorites from this category
                food_options = ["None"] + [food['name'] for food in category_favorites]
                food_key = f"select_{category}_{i}"
                
                # Get previous selection if exists
                prev_selection = st.session_state.get(food_key, "None")
                
                selected_food_name = st.selectbox(
                    f"Select {display_name} #{i+1}",
                    options=food_options,
                    index=food_options.index(prev_selection) if prev_selection in food_options else 0,
                    key=food_key
                )
                
                # If a food was selected, add/update it in the selected foods
                if selected_food_name != "None":
                    # Find the food object from favorites
                    selected_food = next((food for food in category_favorites if food['name'] == selected_food_name), None)
                    
                    if selected_food:
                        # Check if this food is already in the selected foods list
                        existing_food = next((f for f in st.session_state.simple_selected_foods if f['name'] == selected_food_name), None)
                        
                        if not existing_food:
                            st.session_state.simple_selected_foods.append(selected_food)
                else:
                    # If "None" is selected, remove this food from selection if it was previously there
                    if prev_selection != "None":
                        st.session_state.simple_selected_foods = [
                            f for f in st.session_state.simple_selected_foods 
                            if f['name'] != prev_selection
                        ]
    
    # Display category selection for each category
    for category, display_name in category_display.items():
        category_selection(category, display_name)
    
    # If foods are selected, calculate optimal portions and show nutrition
    if st.session_state.simple_selected_foods:
        st.markdown("---")
        st.subheader("Selected Foods and Portions")
        
        # Calculate optimal portions based on meal targets
        optimal_portions = calculate_optimal_portions(st.session_state.simple_selected_foods, meal_targets)
        
        # Show selected foods with adjustable portions
        total_nutrition = {
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0
        }
        
        updated_portions = {}
        
        for food in st.session_state.simple_selected_foods:
            food_cols = st.columns([2, 1, 1])
            
            with food_cols[0]:
                st.write(f"**{food['name']}** ({food.get('category', 'Unknown').capitalize()})")
            
            with food_cols[1]:
                # Use the optimal portion as default
                default_portion = int(optimal_portions.get(food['name'], 100))
                portion_key = f"portion_{food['name']}"
                
                portion = st.number_input(
                    f"Portion (g):",
                    min_value=0,
                    max_value=500,
                    value=default_portion,
                    step=5,
                    key=portion_key
                )
                
                updated_portions[food['name']] = portion
            
            with food_cols[2]:
                # Calculate nutrition for this food with the portion
                food_cals = food['calories'] * portion / 100
                food_protein = food['protein'] * portion / 100
                food_carbs = food['carbs'] * portion / 100
                food_fat = food['fat'] * portion / 100
                
                # Add to total nutrition
                total_nutrition['calories'] += food_cals
                total_nutrition['protein'] += food_protein
                total_nutrition['carbs'] += food_carbs
                total_nutrition['fat'] += food_fat
                
                st.write(f"{food_cals:.0f} kcal | {food_protein:.1f}g P | {food_carbs:.1f}g C | {food_fat:.1f}g F")
        
        # Show total nutrition
        st.markdown("---")
        st.subheader("Meal Nutrition Totals")
        
        # Create columns for the total nutrition display
        total_cols = st.columns(4)
        
        with total_cols[0]:
            st.metric("Calories", 
                     f"{total_nutrition['calories']:.0f} / {meal_targets['target_calories']:.0f} kcal",
                     f"{total_nutrition['calories'] - meal_targets['target_calories']:.0f}")
            
            # Progress bar
            calories_pct = min(100, total_nutrition['calories'] / meal_targets['target_calories'] * 100) if meal_targets['target_calories'] > 0 else 0
            st.progress(calories_pct / 100)
        
        with total_cols[1]:
            st.metric("Protein", 
                     f"{total_nutrition['protein']:.1f} / {meal_targets['protein']:.1f}g",
                     f"{total_nutrition['protein'] - meal_targets['protein']:.1f}g")
            
            # Progress bar
            protein_pct = min(100, total_nutrition['protein'] / meal_targets['protein'] * 100) if meal_targets['protein'] > 0 else 0
            st.progress(protein_pct / 100)
        
        with total_cols[2]:
            st.metric("Carbs", 
                     f"{total_nutrition['carbs']:.1f} / {meal_targets['carbs']:.1f}g",
                     f"{total_nutrition['carbs'] - meal_targets['carbs']:.1f}g")
            
            # Progress bar
            carbs_pct = min(100, total_nutrition['carbs'] / meal_targets['carbs'] * 100) if meal_targets['carbs'] > 0 else 0
            st.progress(carbs_pct / 100)
        
        with total_cols[3]:
            st.metric("Fat", 
                     f"{total_nutrition['fat']:.1f} / {meal_targets['fat']:.1f}g",
                     f"{total_nutrition['fat'] - meal_targets['fat']:.1f}g")
            
            # Progress bar
            fat_pct = min(100, total_nutrition['fat'] / meal_targets['fat'] * 100) if meal_targets['fat'] > 0 else 0
            st.progress(fat_pct / 100)
        
        # Macronutrient ratio visualization
        if total_nutrition['calories'] > 0:
            st.subheader("Macronutrient Ratio")
            
            # Calculate percentages
            protein_cal_pct = (total_nutrition['protein'] * 4 / total_nutrition['calories']) * 100
            carbs_cal_pct = (total_nutrition['carbs'] * 4 / total_nutrition['calories']) * 100
            fat_cal_pct = (total_nutrition['fat'] * 9 / total_nutrition['calories']) * 100
            
            # Create visualization
            fig, ax = plt.subplots(figsize=(10, 1))
            ax.barh(['Macros'], [protein_cal_pct], color='#ff9999', label=f'Protein: {protein_cal_pct:.1f}%')
            ax.barh(['Macros'], [carbs_cal_pct], left=[protein_cal_pct], color='#99ff99', label=f'Carbs: {carbs_cal_pct:.1f}%')
            ax.barh(['Macros'], [fat_cal_pct], left=[protein_cal_pct + carbs_cal_pct], color='#9999ff', label=f'Fat: {fat_cal_pct:.1f}%')
            
            ax.set_xlim(0, 100)
            ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.2), ncol=3)
            ax.set_xticks([])
            ax.set_yticks([])
            
            for spine in ax.spines.values():
                spine.set_visible(False)
            
            st.pyplot(fig)
        
        # Option to save as a recipe
        st.markdown("---")
        st.subheader("Save Meal as Recipe")
        recipe_name = st.text_input("Recipe Name:", key="simple_recipe_name", 
                                  placeholder="E.g., High Protein Breakfast, Post-Workout Meal")
        
        meal_type = st.selectbox("Meal Type:", 
                               ["Breakfast", "Lunch", "Dinner", "Snack", "Any"], 
                               key="simple_meal_type")
        
        if st.button("Save Recipe", key="save_simple_recipe"):
            if recipe_name:
                # Save the recipe
                fdc_api.add_recipe(recipe_name, st.session_state.simple_selected_foods, updated_portions, meal_type)
                st.success(f"Recipe '{recipe_name}' saved successfully!")
            else:
                st.error("Please enter a recipe name.")
    
    else:
        st.info("Select foods from the categories above to build your meal.")

with tab1:
    food_search_ui("main")

with tab2:
    favorites_ui("main")

with tab3:
    selected_foods_ui("main")

with tab4:
    create_recipe_ui("main")

with tab5:
    recipes_ui("main")

with tab8:
    recipe_browser_ui("main")

with tab6:
    meal_planning_ui("main")

with tab7:
    grocery_list_ui("main")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")