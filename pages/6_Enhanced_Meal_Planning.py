import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
import os
import sys
from datetime import datetime, timedelta

# Import custom FDC API module
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import fdc_api

# Set page config
st.set_page_config(
    page_title="Enhanced Meal Planning",
    page_icon="🍽️",
    layout="wide"
)

# Streamlit UI
st.title("🍽️ Enhanced Meal & Grocery Planning")
st.markdown("Create, manage, and plan your meals using the USDA FoodData Central database for accurate nutrition information.")

# Initialize session state variables for this page if needed
if 'meal_plans' not in st.session_state:
    st.session_state.meal_plans = {}

if 'selected_foods' not in st.session_state:
    st.session_state.selected_foods = []

if 'serving_adjustments' not in st.session_state:
    st.session_state.serving_adjustments = {}

if 'food_search_results' not in st.session_state:
    st.session_state.food_search_results = []

if 'selected_recipe' not in st.session_state:
    st.session_state.selected_recipe = None

# Check if user info is set
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

# Check if nutrition plan is set
if 'nutrition_plan' not in st.session_state or not st.session_state.nutrition_plan:
    st.warning("Please create your Nutrition Plan first!")
    st.stop()

# Function to get default nutrition values based on stored nutrition plan
def get_default_nutrition_values():
    if 'nutrition_plan' in st.session_state:
        return {
            'calories': st.session_state.nutrition_plan.get('target_calories', 0),
            'protein': st.session_state.nutrition_plan.get('target_protein', 0),
            'carbs': st.session_state.nutrition_plan.get('target_carbs', 0),
            'fat': st.session_state.nutrition_plan.get('target_fat', 0),
            'fiber': 30, # Default fiber recommendation
        }
    return {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 30,
    }

# Function to calculate total macros from foods and portions
def calculate_total_macros(foods, portions):
    """Calculate total macros from a list of foods and their portions"""
    total_cals = sum(food['calories'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_protein = sum(food['protein'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_carbs = sum(food['carbs'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_fat = sum(food['fat'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_fiber = sum(food.get('fiber', 0) * portions.get(food['name'], 0) / 100 for food in foods)
    
    return {
        'calories': round(total_cals),
        'protein': round(total_protein),
        'carbs': round(total_carbs),
        'fat': round(total_fat),
        'fiber': round(total_fiber)
    }

# Helper function to calculate portion sizes
def calculate_portion_sizes(meal_macros, selected_foods, serving_adjustments=None):
    """
    Calculate the optimal portion sizes for selected foods to meet meal macros.
    
    Parameters:
    meal_macros: Dict with keys 'protein', 'carbs', 'fat', 'calories'
    selected_foods: List of food dictionaries
    serving_adjustments: Dict with food names as keys and adjustment factors as values
    
    Returns:
    Dict with food names as keys and portion sizes as values
    """
    if not selected_foods:
        return {}
    
    if serving_adjustments is None:
        serving_adjustments = {food['name']: 1.0 for food in selected_foods}
    
    # Define target macros
    target_protein = meal_macros['protein']
    target_carbs = meal_macros['carbs']
    target_fat = meal_macros['fat']
    
    # Initialize portions
    portions = {}
    
    # Group foods by primary category
    protein_foods = [f for f in selected_foods if f.get('category') == 'protein']
    carb_foods = [f for f in selected_foods if f.get('category') == 'carb']
    fat_foods = [f for f in selected_foods if f.get('category') == 'fat']
    vegetable_foods = [f for f in selected_foods if f.get('category') == 'vegetable']
    fruit_foods = [f for f in selected_foods if f.get('category') == 'fruit']
    other_foods = [f for f in selected_foods if f.get('category') not in ['protein', 'carb', 'fat', 'vegetable', 'fruit']]
    
    # Function to calculate total macros for a list of foods with given portions
    def calculate_macros(foods, portions):
        total_p = sum(food['protein'] * portions.get(food['name'], 0) / 100 for food in foods)
        total_c = sum(food['carbs'] * portions.get(food['name'], 0) / 100 for food in foods)
        total_f = sum(food['fat'] * portions.get(food['name'], 0) / 100 for food in foods)
        return total_p, total_c, total_f
    
    # Calculate portions based on the primary macronutrient in each food category
    # Handle protein foods first
    if protein_foods:
        protein_per_food = target_protein / len(protein_foods)
        for food in protein_foods:
            if food['protein'] > 0:
                # Calculate portion to get protein_per_food grams of protein
                portion = (protein_per_food * 100) / food['protein']
                # Apply user adjustment
                portion *= serving_adjustments.get(food['name'], 1.0)
                portions[food['name']] = round(portion)
    
    # Handle carb foods
    remaining_carbs = target_carbs
    if protein_foods:
        _, carbs_from_protein, _ = calculate_macros(protein_foods, portions)
        remaining_carbs -= carbs_from_protein
    
    if carb_foods and remaining_carbs > 0:
        carbs_per_food = remaining_carbs / len(carb_foods)
        for food in carb_foods:
            if food['carbs'] > 0:
                # Calculate portion to get carbs_per_food grams of carbs
                portion = (carbs_per_food * 100) / food['carbs']
                # Apply user adjustment
                portion *= serving_adjustments.get(food['name'], 1.0)
                portions[food['name']] = round(portion)
    
    # Handle fat foods
    remaining_fat = target_fat
    if protein_foods or carb_foods:
        _, _, fat_from_others = calculate_macros(protein_foods + carb_foods, portions)
        remaining_fat -= fat_from_others
    
    if fat_foods and remaining_fat > 0:
        fat_per_food = remaining_fat / len(fat_foods)
        for food in fat_foods:
            if food['fat'] > 0:
                # Calculate portion to get fat_per_food grams of fat
                portion = (fat_per_food * 100) / food['fat']
                # Apply user adjustment
                portion *= serving_adjustments.get(food['name'], 1.0)
                portions[food['name']] = round(portion)
    
    # Handle vegetables with default 100g portions
    for food in vegetable_foods:
        portion = 100  # Default 100g for vegetables
        portion *= serving_adjustments.get(food['name'], 1.0)
        portions[food['name']] = round(portion)
    
    # Handle fruits with default 100g portions
    for food in fruit_foods:
        portion = 100  # Default 100g for fruits
        portion *= serving_adjustments.get(food['name'], 1.0)
        portions[food['name']] = round(portion)
    
    # Handle other foods (balanced) - distribute evenly
    for food in other_foods:
        # Default portion for other foods (50g)
        portion = 50
        # Apply user adjustment
        portion *= serving_adjustments.get(food['name'], 1.0)
        portions[food['name']] = round(portion)
    
    return portions

# Function to save meal plans
def save_meal_plans():
    try:
        # Save to CSV
        if st.session_state.meal_plans:
            meal_plans_data = []
            
            for day, plan in st.session_state.meal_plans.items():
                # Convert training sessions to JSON
                training_sessions_json = json.dumps(plan.get('training_sessions', []))
                
                # Convert meal and snack data to JSON
                meals_json = json.dumps(plan.get('meals', []))
                snacks_json = json.dumps(plan.get('snacks', []))
                
                meal_plans_data.append({
                    'day_of_week': day,
                    'day_type': plan['day_type'],
                    'training_sessions': training_sessions_json,
                    'num_meals': plan['num_meals'],
                    'num_snacks': plan['num_snacks'],
                    'calories': plan['nutrition']['calories'],
                    'protein': plan['nutrition']['protein'],
                    'carbs': plan['nutrition']['carbs'],
                    'fat': plan['nutrition']['fat'],
                    'fiber': plan['nutrition']['fiber'],
                    'meals': meals_json,
                    'snacks': snacks_json,
                    'grocery_list': json.dumps(plan.get('grocery_list', []))
                })
            
            meal_plans_df = pd.DataFrame(meal_plans_data)
            
            # Create data directory if it doesn't exist
            os.makedirs('./data', exist_ok=True)
            
            # Save to data folder
            meal_plans_df.to_csv('./data/meal_plans.csv', index=False)
            
    except Exception as e:
        st.error(f"Error saving meal plans: {e}")

# Function to load meal plans
def load_meal_plans():
    try:
        if os.path.exists('./data/meal_plans.csv'):
            meal_plans_df = pd.read_csv('./data/meal_plans.csv')
            
            if not meal_plans_df.empty:
                st.session_state.meal_plans = {}
                
                for _, row in meal_plans_df.iterrows():
                    day = row['day_of_week']
                    
                    # Parse training sessions from JSON
                    training_sessions = []
                    if 'training_sessions' in row:
                        try:
                            training_sessions = json.loads(str(row['training_sessions']))
                        except:
                            training_sessions = []
                    
                    # Parse meals from JSON
                    meals = []
                    if 'meals' in row:
                        try:
                            meals = json.loads(str(row['meals']))
                        except:
                            meals = []
                    
                    # Parse snacks from JSON
                    snacks = []
                    if 'snacks' in row:
                        try:
                            snacks = json.loads(str(row['snacks']))
                        except:
                            snacks = []
                    
                    # Parse grocery list from JSON
                    grocery_list = []
                    if 'grocery_list' in row:
                        try:
                            grocery_list = json.loads(str(row['grocery_list']))
                        except:
                            grocery_list = []
                    
                    # Create meal plan object
                    st.session_state.meal_plans[day] = {
                        'day_type': row['day_type'],
                        'training_sessions': training_sessions,
                        'num_meals': row['num_meals'],
                        'num_snacks': row['num_snacks'],
                        'nutrition': {
                            'calories': row['calories'],
                            'protein': row['protein'],
                            'carbs': row['carbs'],
                            'fat': row['fat'],
                            'fiber': row['fiber'],
                        },
                        'meals': meals,
                        'snacks': snacks,
                        'grocery_list': grocery_list
                    }
    except Exception as e:
        st.error(f"Error loading meal plans: {e}")

# Function to calculate meal distribution
def calculate_meal_distribution(total_nutrition, num_meals, num_snacks, training_sessions, meal_times):
    """
    Calculate distribution of nutrition across meals and snacks,
    taking into account training session timing.
    
    Parameters:
    - total_nutrition: Dict with keys 'calories', 'protein', etc.
    - num_meals: Number of main meals
    - num_snacks: Number of snacks
    - training_sessions: List of training session time ranges
    - meal_times: List of meal times
    
    Returns:
    - meals: List of meal objects with distributed nutrition
    - snacks: List of snack objects with distributed nutrition
    """
    # Default distribution if no training sessions
    meal_distribution = {
        'calories': [0.3, 0.4, 0.3] if num_meals == 3 else [0.25, 0.25, 0.25, 0.25],
        'protein': [0.3, 0.4, 0.3] if num_meals == 3 else [0.25, 0.25, 0.25, 0.25],
        'carbs': [0.3, 0.4, 0.3] if num_meals == 3 else [0.25, 0.25, 0.25, 0.25],
        'fat': [0.3, 0.35, 0.35] if num_meals == 3 else [0.25, 0.25, 0.25, 0.25],
        'fiber': [0.3, 0.4, 0.3] if num_meals == 3 else [0.25, 0.25, 0.25, 0.25]
    }
    
    snack_distribution = {
        'calories': [1.0/num_snacks] * num_snacks if num_snacks > 0 else [],
        'protein': [1.0/num_snacks] * num_snacks if num_snacks > 0 else [],
        'carbs': [1.0/num_snacks] * num_snacks if num_snacks > 0 else [],
        'fat': [1.0/num_snacks] * num_snacks if num_snacks > 0 else [],
        'fiber': [1.0/num_snacks] * num_snacks if num_snacks > 0 else []
    }
    
    # Adjust distribution if there are training sessions
    if training_sessions and len(training_sessions) > 0:
        # For simplicity, we'll focus on the first training session
        # In a more advanced system, we would handle multiple sessions more carefully
        primary_session = training_sessions[0]
        
        # Determine which meal is closest to pre-workout
        # In a real implementation, you would parse times and calculate actual proximity
        if primary_session != "No Training":
            # Give more carbs to pre-workout meal and more protein to post-workout meal
            # This is a simplified approach
            if num_meals >= 3:
                # Assume meal 1 is breakfast, meal 2 is lunch, meal 3 is dinner
                if "AM" in primary_session:
                    # Morning workout - more carbs in first meal, more protein in second
                    meal_distribution['carbs'] = [0.4, 0.3, 0.3] if num_meals == 3 else [0.4, 0.3, 0.2, 0.1]
                    meal_distribution['protein'] = [0.25, 0.4, 0.35] if num_meals == 3 else [0.2, 0.4, 0.25, 0.15]
                elif "PM" in primary_session and "7:00 PM" not in primary_session:
                    # Afternoon workout - more carbs in second meal, more protein in third
                    meal_distribution['carbs'] = [0.3, 0.4, 0.3] if num_meals == 3 else [0.2, 0.4, 0.3, 0.1]
                    meal_distribution['protein'] = [0.25, 0.3, 0.45] if num_meals == 3 else [0.2, 0.25, 0.4, 0.15]
                else:
                    # Evening workout - more carbs in third meal
                    meal_distribution['carbs'] = [0.3, 0.3, 0.4] if num_meals == 3 else [0.2, 0.3, 0.4, 0.1]
                    meal_distribution['protein'] = [0.3, 0.3, 0.4] if num_meals == 3 else [0.25, 0.25, 0.35, 0.15]
    
    # Allocate portion of nutrition to snacks (20% total)
    snack_portion = 0.2 if num_snacks > 0 else 0
    meal_portion = 1.0 - snack_portion
    
    # Create meal objects with distributed nutrition
    meals = []
    for i in range(num_meals):
        if i < len(meal_distribution['calories']):
            meal_calories = int(total_nutrition['calories'] * meal_portion * meal_distribution['calories'][i])
            meal_protein = int(total_nutrition['protein'] * meal_portion * meal_distribution['protein'][i])
            meal_carbs = int(total_nutrition['carbs'] * meal_portion * meal_distribution['carbs'][i])
            meal_fat = int(total_nutrition['fat'] * meal_portion * meal_distribution['fat'][i])
            meal_fiber = int(total_nutrition['fiber'] * meal_portion * meal_distribution['fiber'][i])
        else:
            # Equal distribution for any additional meals
            meal_calories = int(total_nutrition['calories'] * meal_portion / num_meals)
            meal_protein = int(total_nutrition['protein'] * meal_portion / num_meals)
            meal_carbs = int(total_nutrition['carbs'] * meal_portion / num_meals)
            meal_fat = int(total_nutrition['fat'] * meal_portion / num_meals)
            meal_fiber = int(total_nutrition['fiber'] * meal_portion / num_meals)
        
        meal = {
            "name": f"Meal {i+1}",
            "time": meal_times[i] if i < len(meal_times) else "Not specified",
            "calories": meal_calories,
            "protein": meal_protein,
            "carbs": meal_carbs,
            "fat": meal_fat,
            "fiber": meal_fiber,
            "foods": []
        }
        meals.append(meal)
    
    # Create snack objects with distributed nutrition
    snacks = []
    for i in range(num_snacks):
        if i < len(snack_distribution['calories']):
            snack_calories = int(total_nutrition['calories'] * snack_portion * snack_distribution['calories'][i])
            snack_protein = int(total_nutrition['protein'] * snack_portion * snack_distribution['protein'][i])
            snack_carbs = int(total_nutrition['carbs'] * snack_portion * snack_distribution['carbs'][i])
            snack_fat = int(total_nutrition['fat'] * snack_portion * snack_distribution['fat'][i])
            snack_fiber = int(total_nutrition['fiber'] * snack_portion * snack_distribution['fiber'][i])
        else:
            # Equal distribution for any additional snacks
            snack_calories = int(total_nutrition['calories'] * snack_portion / num_snacks)
            snack_protein = int(total_nutrition['protein'] * snack_portion / num_snacks)
            snack_carbs = int(total_nutrition['carbs'] * snack_portion / num_snacks)
            snack_fat = int(total_nutrition['fat'] * snack_portion / num_snacks)
            snack_fiber = int(total_nutrition['fiber'] * snack_portion / num_snacks)
        
        snack = {
            "name": f"Snack {i+1}",
            "calories": snack_calories,
            "protein": snack_protein,
            "carbs": snack_carbs,
            "fat": snack_fat,
            "fiber": snack_fiber,
            "foods": []
        }
        snacks.append(snack)
    
    return meals, snacks

# Define available time slots for reference
time_slots = [
    "5:00 AM - 6:00 AM", 
    "6:00 AM - 7:00 AM", 
    "7:00 AM - 8:00 AM", 
    "8:00 AM - 9:00 AM", 
    "9:00 AM - 10:00 AM", 
    "10:00 AM - 11:00 AM", 
    "11:00 AM - 12:00 PM", 
    "12:00 PM - 1:00 PM", 
    "1:00 PM - 2:00 PM", 
    "2:00 PM - 3:00 PM", 
    "3:00 PM - 4:00 PM", 
    "4:00 PM - 5:00 PM", 
    "5:00 PM - 6:00 PM", 
    "6:00 PM - 7:00 PM", 
    "7:00 PM - 8:00 PM",
    "8:00 PM - 9:00 PM",
    "9:00 PM - 10:00 PM",
    "10:00 PM - 11:00 PM"
]

days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
day_types = ['Rest Day', 'Training Day - Light', 'Training Day - Moderate', 'Training Day - Intense']

# Function to search for foods
def food_search_ui():
    """UI for food search and selection"""
    st.subheader("Food Search")
    
    search_col1, search_col2 = st.columns([3, 1])
    
    with search_col1:
        search_query = st.text_input("Search for foods:", placeholder="Enter food name (e.g. chicken breast, brown rice, avocado)")
    
    with search_col2:
        search_button = st.button("Search", use_container_width=True)
    
    # If search button is clicked
    if search_button and search_query:
        with st.spinner("Searching for foods..."):
            # Call the FDC API to search for foods
            results = fdc_api.search_foods(search_query)
            
            if results:
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
        food_idx = st.number_input("Select food by index:", min_value=1, max_value=len(st.session_state.food_search_results[:20]), value=1) - 1
        
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
                    if st.button("Add to Favorites"):
                        fdc_api.add_to_favorites(normalized_food)
                        st.success(f"Added {normalized_food['name']} to favorites!")
                    
                    # Return the normalized food data
                    return normalized_food
    
    # Return None if no food was selected
    return None

# Function to display favorites
def favorites_ui():
    """UI for displaying and selecting favorite foods"""
    st.subheader("My Favorite Foods")
    
    # Get user favorites
    favorites = fdc_api.get_user_favorites()
    
    if not favorites:
        st.info("You haven't added any favorite foods yet. Use the search to find and add foods to your favorites.")
        return None
    
    # Display favorites in a table
    table_data = []
    
    for i, food in enumerate(favorites):
        table_data.append({
            'Index': i + 1,
            'Food Name': food['name'],
            'Category': food['category'].capitalize(),
            'Calories': f"{food['calories']:.0f}",
            'Protein': f"{food['protein']:.1f}g",
            'Carbs': f"{food['carbs']:.1f}g",
            'Fat': f"{food['fat']:.1f}g"
        })
    
    # Convert to DataFrame and display
    favorites_df = pd.DataFrame(table_data)
    st.dataframe(favorites_df, use_container_width=True)
    
    # Food selection
    food_idx = st.number_input("Select food by index:", min_value=1, max_value=len(favorites), value=1, key="favorites_idx") - 1
    
    if food_idx >= 0 and food_idx < len(favorites):
        selected_food = favorites[food_idx]
        
        # Display nutrients
        st.subheader(f"Selected: {selected_food['name']}")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Button to remove from favorites
            if st.button("Remove from Favorites"):
                fdc_api.remove_from_favorites(selected_food.get('fdcId', ''))
                st.success(f"Removed {selected_food['name']} from favorites!")
                st.rerun()
        
        # Return the selected food
        return selected_food
    
    return None

# Function to display recipes
def recipes_ui():
    """UI for displaying and selecting recipes"""
    st.subheader("My Saved Recipes")
    
    # Get user recipes
    recipes = fdc_api.get_user_recipes()
    
    if not recipes:
        st.info("You haven't created any recipes yet. Use the meal planner to create and save recipes.")
        return None
    
    # Display recipes in a table
    table_data = []
    
    for i, recipe in enumerate(recipes):
        table_data.append({
            'Index': i + 1,
            'Recipe Name': recipe['name'],
            'Meal Type': recipe['meal_type'],
            'Calories': f"{recipe['total_calories']:.0f}",
            'Protein': f"{recipe['total_protein']:.1f}g",
            'Carbs': f"{recipe['total_carbs']:.1f}g",
            'Fat': f"{recipe['total_fat']:.1f}g"
        })
    
    # Convert to DataFrame and display
    recipes_df = pd.DataFrame(table_data)
    st.dataframe(recipes_df, use_container_width=True)
    
    # Recipe selection
    recipe_idx = st.number_input("Select recipe by index:", min_value=1, max_value=len(recipes), value=1, key="recipes_idx") - 1
    
    if recipe_idx >= 0 and recipe_idx < len(recipes):
        selected_recipe = recipes[recipe_idx]
        
        # Display recipe details
        st.subheader(f"Selected: {selected_recipe['name']}")
        
        # Display ingredients
        st.write("**Ingredients:**")
        ingredients_data = []
        
        for food in selected_recipe['foods']:
            # Get portion size
            portion = selected_recipe['portions'].get(food['name'], 0)
            
            ingredients_data.append({
                'Food': food['name'],
                'Amount': f"{portion}g",
                'Calories': f"{food['calories'] * portion / 100:.0f}",
                'Protein': f"{food['protein'] * portion / 100:.1f}g",
                'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                'Fat': f"{food['fat'] * portion / 100:.1f}g"
            })
        
        # Convert to DataFrame and display
        ingredients_df = pd.DataFrame(ingredients_data)
        st.dataframe(ingredients_df, use_container_width=True)
        
        # Return the selected recipe
        return selected_recipe
    
    return None

# Function to create a recipe
def create_recipe_ui(foods=None, portions=None):
    """UI for creating a recipe"""
    st.subheader("Create Recipe")
    
    if foods is None or portions is None or not foods:
        st.warning("Please select foods for your meal before creating a recipe.")
        return
    
    # Recipe name
    recipe_name = st.text_input("Recipe Name:", placeholder="E.g., High Protein Breakfast, Post-Workout Meal")
    
    # Meal type
    meal_type = st.selectbox("Meal Type:", ["Breakfast", "Lunch", "Dinner", "Snack", "Any"])
    
    # Calculate total macros
    total_macros = calculate_total_macros(foods, portions)
    
    # Display total macros
    st.subheader("Recipe Nutrition")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Calories", f"{total_macros['calories']} kcal")
    
    with col2:
        st.metric("Protein", f"{total_macros['protein']}g")
    
    with col3:
        st.metric("Carbs", f"{total_macros['carbs']}g")
    
    with col4:
        st.metric("Fat", f"{total_macros['fat']}g")
    
    with col5:
        st.metric("Fiber", f"{total_macros['fiber']}g")
    
    # Save recipe button
    if st.button("Save Recipe") and recipe_name:
        fdc_api.add_recipe(recipe_name, foods, portions, meal_type)
        st.success(f"Recipe '{recipe_name}' saved successfully!")

# Function to display food recommendations
def food_recommendations_ui(target_macros, meal_type="Any"):
    """UI for displaying food recommendations"""
    st.subheader("Recommended Foods")
    
    # Get recommendations for each category
    protein_recs = fdc_api.recommend_foods(target_macros, category="protein")
    carb_recs = fdc_api.recommend_foods(target_macros, category="carb")
    fat_recs = fdc_api.recommend_foods(target_macros, category="fat")
    
    # Display recommendations
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.write("**Protein Sources**")
        if protein_recs:
            for food in protein_recs:
                if st.button(f"Add {food['name']}", key=f"add_protein_{food['fdcId']}"):
                    return food
        else:
            st.info("No protein recommendations available. Add more favorites to get personalized recommendations.")
    
    with col2:
        st.write("**Carb Sources**")
        if carb_recs:
            for food in carb_recs:
                if st.button(f"Add {food['name']}", key=f"add_carb_{food['fdcId']}"):
                    return food
        else:
            st.info("No carb recommendations available. Add more favorites to get personalized recommendations.")
    
    with col3:
        st.write("**Fat Sources**")
        if fat_recs:
            for food in fat_recs:
                if st.button(f"Add {food['name']}", key=f"add_fat_{food['fdcId']}"):
                    return food
        else:
            st.info("No fat recommendations available. Add more favorites to get personalized recommendations.")
    
    # Recipe recommendations
    st.subheader("Recommended Recipes")
    recipe_recs = fdc_api.recommend_recipes(target_macros, meal_type)
    
    if recipe_recs:
        for recipe in recipe_recs:
            col1, col2, col3, col4, col5 = st.columns([3, 1, 1, 1, 1])
            
            with col1:
                st.write(f"**{recipe['name']}**")
            
            with col2:
                st.write(f"Calories: {recipe['total_calories']:.0f}")
            
            with col3:
                st.write(f"Protein: {recipe['total_protein']:.1f}g")
            
            with col4:
                st.write(f"Carbs: {recipe['total_carbs']:.1f}g")
            
            with col5:
                st.write(f"Fat: {recipe['total_fat']:.1f}g")
            
            if st.button(f"Use Recipe", key=f"use_recipe_{recipe['name']}"):
                return recipe
    else:
        st.info("No recipe recommendations available. Create and save recipes to get personalized recommendations.")
    
    return None

# Ensure data is loaded
load_meal_plans()

# Create two tabs for meal planning and grocery list
planner_tab, grocery_tab, favorites_tab = st.tabs(["Meal Planner", "Grocery List", "Favorites & Recipes"])

# Meal Planner Tab
with planner_tab:
    # Create a layout with two main sections - Weekly overview and Day plan
    st.header("Weekly Meal Planning")
    
    # Initialize weekly data for display
    weekly_summary = []
    for day in days_of_week:
        if day in st.session_state.meal_plans:
            plan = st.session_state.meal_plans[day]
            
            # Check for training session for display
            training_status = "Rest Day"
            if 'training_sessions' in plan and plan['training_sessions'] and plan['training_sessions'][0] != "No Training":
                training_session_times = [s for s in plan['training_sessions'] if s != "No Training"]
                if len(training_session_times) == 1:
                    training_status = f"{training_session_times[0]}"
                else:
                    training_status = f"{len(training_session_times)} Sessions"
            
            weekly_summary.append({
                "Day": day,
                "Day Type": plan['day_type'],
                "Training": training_status,
                "Meals": plan['num_meals'],
                "Snacks": plan.get('num_snacks', 0),
                "Calories": plan['nutrition']['calories'],
                "Protein (g)": plan['nutrition']['protein'],
                "Carbs (g)": plan['nutrition']['carbs'],
                "Fat (g)": plan['nutrition']['fat']
            })
        else:
            weekly_summary.append({
                "Day": day,
                "Day Type": "Not Planned",
                "Training": "-",
                "Meals": 0,
                "Snacks": 0,
                "Calories": 0,
                "Protein (g)": 0,
                "Carbs (g)": 0,
                "Fat (g)": 0
            })
    
    weekly_df = pd.DataFrame(weekly_summary)
    
    # Calculate weekly totals
    planned_days_df = weekly_df[weekly_df["Day Type"] != "Not Planned"]
    weekly_calories = planned_days_df["Calories"].sum() if not planned_days_df.empty else 0
    weekly_protein = planned_days_df["Protein (g)"].sum() if not planned_days_df.empty else 0
    weekly_carbs = planned_days_df["Carbs (g)"].sum() if not planned_days_df.empty else 0
    weekly_fat = planned_days_df["Fat (g)"].sum() if not planned_days_df.empty else 0
    
    # Weekly overview in a table
    st.subheader("Weekly Overview")
    st.dataframe(weekly_df, use_container_width=True)
    
    # Weekly macronutrient summary
    if not planned_days_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Create a summary bar chart for weekly macros
            weekly_protein_cals = weekly_protein * 4
            weekly_carb_cals = weekly_carbs * 4
            weekly_fat_cals = weekly_fat * 9
            weekly_total_cals = weekly_protein_cals + weekly_carb_cals + weekly_fat_cals
            
            if weekly_total_cals > 0:
                protein_pct = (weekly_protein_cals / weekly_total_cals) * 100
                carb_pct = (weekly_carb_cals / weekly_total_cals) * 100
                fat_pct = (weekly_fat_cals / weekly_total_cals) * 100
                
                fig, ax = plt.subplots(figsize=(10, 2))
                ax.barh(['Weekly Macros'], [protein_pct], color='#ff9999', label=f'Protein: {protein_pct:.1f}%')
                ax.barh(['Weekly Macros'], [carb_pct], left=[protein_pct], color='#99ff99', label=f'Carbs: {carb_pct:.1f}%')
                ax.barh(['Weekly Macros'], [fat_pct], left=[protein_pct + carb_pct], color='#9999ff', label=f'Fat: {fat_pct:.1f}%')
                
                ax.set_xlim(0, 100)
                ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.2), ncol=3)
                ax.set_xticks([])
                ax.set_yticks([])
                
                for spine in ax.spines.values():
                    spine.set_visible(False)
                
                st.pyplot(fig)
        
        with col2:
            # Weekly totals
            st.write("**Weekly Nutrition Totals**")
            st.write(f"Calories: {weekly_calories:,.0f} kcal")
            st.write(f"Protein: {weekly_protein:,.0f} g")
            st.write(f"Carbs: {weekly_carbs:,.0f} g")
            st.write(f"Fat: {weekly_fat:,.0f} g")
            
            # Daily averages
            st.write("**Daily Averages**")
            avg_days = len(planned_days_df)
            st.write(f"Calories: {weekly_calories/avg_days:.0f} kcal")
            st.write(f"Protein: {weekly_protein/avg_days:.0f} g")
            st.write(f"Carbs: {weekly_carbs/avg_days:.0f} g")
            st.write(f"Fat: {weekly_fat/avg_days:.0f} g")
    
    # Copy plans between days
    st.subheader("Copy Plan Between Days")
    
    copy_col1, copy_col2 = st.columns(2)
    
    with copy_col1:
        if any(day in st.session_state.meal_plans for day in days_of_week):
            copy_from_day = st.selectbox(
                "Copy from day", 
                [day for day in days_of_week if day in st.session_state.meal_plans],
                index=0
            )
        else:
            st.info("Create at least one day's plan first")
            copy_from_day = None
    
    with copy_col2:
        if copy_from_day:
            copy_to_days = st.multiselect(
                "Copy to days", 
                [day for day in days_of_week if day != copy_from_day],
                default=[]
            )
    
    if copy_from_day and copy_to_days and st.button("Copy Plan"):
        # Get the plan to copy
        plan_to_copy = st.session_state.meal_plans[copy_from_day]
        
        # Copy the plan to selected days
        for day in copy_to_days:
            st.session_state.meal_plans[day] = plan_to_copy.copy()
        
        # Save to file
        save_meal_plans()
        
        st.success(f"Plan copied from {copy_from_day} to {', '.join(copy_to_days)}")
        st.rerun()
    
    # Create tabs for each day of week
    st.subheader("Daily Plan Editor")
    day_tabs = st.tabs(days_of_week)
    
    # For each day tab
    for i, day in enumerate(days_of_week):
        with day_tabs[i]:
            # Check if day is planned or not
            if day in st.session_state.meal_plans:
                # We have a plan for this day - show it and allow editing
                plan = st.session_state.meal_plans[day]
                
                # Split into two columns - planning and summary
                plan_col, summary_col = st.columns([3, 1])
                
                with plan_col:
                    # PLAN SECTION - Show current plan with option to edit
                    st.subheader(f"{day} - {plan['day_type']}")
                    
                    # Training sessions information
                    if 'training_sessions' in plan and plan['training_sessions'] and plan['training_sessions'][0] != "No Training":
                        st.write("**Training Sessions:**")
                        for session in plan['training_sessions']:
                            if session != "No Training":
                                st.write(f"- {session}")
                    else:
                        st.write("**Rest Day - No Training**")
                    
                    # Display meals and allow editing in place
                    if 'meals' in plan and plan['meals']:
                        st.write("**Meals:**")
                        
                        for meal_idx, meal in enumerate(plan['meals']):
                            meal_expander = st.expander(f"{meal['name']} - {meal.get('time', 'Time not specified')}")
                            
                            with meal_expander:
                                # Show meal targets
                                st.write(f"**Targets:** {meal['calories']} kcal | {meal['protein']}g protein | {meal['carbs']}g carbs | {meal['fat']}g fat")
                                
                                # Food selection integrated here
                                # Check if we're editing this meal
                                is_editing = st.session_state.get('editing_meal') == (day, meal_idx)
                                
                                if is_editing or not meal.get('foods', []):
                                    # We're in edit mode or no foods yet - show food selection UI
                                    st.write("### Select Foods")
                                    
                                    # Food selection tabs - Search, Favorites, Recommendations
                                    food_tabs = st.tabs(["Search", "Favorites", "Recommendations"])
                                    
                                    with food_tabs[0]:
                                        # Search tab
                                        selected_search_food = food_search_ui()
                                        
                                        if selected_search_food:
                                            # Check if this food is already selected
                                            if selected_search_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                                st.session_state.selected_foods.append(selected_search_food)
                                                # Initialize serving adjustment
                                                st.session_state.serving_adjustments[selected_search_food['name']] = 1.0
                                                st.success(f"Added {selected_search_food['name']} to meal!")
                                    
                                    with food_tabs[1]:
                                        # Favorites tab
                                        selected_favorite = favorites_ui()
                                        
                                        if selected_favorite:
                                            # Check if this food is already selected
                                            if selected_favorite['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                                st.session_state.selected_foods.append(selected_favorite)
                                                # Initialize serving adjustment
                                                st.session_state.serving_adjustments[selected_favorite['name']] = 1.0
                                                st.success(f"Added {selected_favorite['name']} to meal!")
                                    
                                    with food_tabs[2]:
                                        # Recommendations tab
                                        recommended_item = food_recommendations_ui(meal, "Meal")
                                        
                                        if isinstance(recommended_item, dict) and 'foods' in recommended_item:
                                            # This is a recipe
                                            st.session_state.selected_recipe = recommended_item
                                            st.success(f"Selected recipe: {recommended_item['name']}")
                                            st.rerun()
                                        elif recommended_item:
                                            # This is a food
                                            # Check if this food is already selected
                                            if recommended_item['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                                st.session_state.selected_foods.append(recommended_item)
                                                # Initialize serving adjustment
                                                st.session_state.serving_adjustments[recommended_item['name']] = 1.0
                                                st.success(f"Added {recommended_item['name']} to meal!")
                                    
                                    # If a recipe was selected, use its foods
                                    if st.session_state.selected_recipe:
                                        st.subheader(f"Using Recipe: {st.session_state.selected_recipe['name']}")
                                        
                                        # Get the foods and portions from the recipe
                                        recipe_foods = st.session_state.selected_recipe['foods']
                                        recipe_portions = st.session_state.selected_recipe['portions']
                                        
                                        # Display the recipe contents
                                        recipe_foods_df = pd.DataFrame([
                                            {
                                                'Food': f['name'],
                                                'Amount': f"{recipe_portions.get(f['name'], 0)}g",
                                                'Calories': f"{f['calories'] * recipe_portions.get(f['name'], 0) / 100:.0f} kcal",
                                                'Protein': f"{f['protein'] * recipe_portions.get(f['name'], 0) / 100:.1f}g",
                                                'Carbs': f"{f['carbs'] * recipe_portions.get(f['name'], 0) / 100:.1f}g",
                                                'Fat': f"{f['fat'] * recipe_portions.get(f['name'], 0) / 100:.1f}g"
                                            }
                                            for f in recipe_foods
                                        ])
                                        
                                        st.dataframe(recipe_foods_df, use_container_width=True)
                                        
                                        # Button to use recipe
                                        if st.button("Use Recipe", key=f"use_recipe_{day}_{meal_idx}"):
                                            # Set the recipe foods as the selected foods
                                            st.session_state.selected_foods = recipe_foods
                                            
                                            # Set the recipe portions as the serving adjustments
                                            st.session_state.serving_adjustments = {}
                                            for food in recipe_foods:
                                                # Calculate the adjustment factor
                                                food_portion = recipe_portions.get(food['name'], 0)
                                                base_portion = 100
                                                adjustment = food_portion / base_portion
                                                st.session_state.serving_adjustments[food['name']] = adjustment
                                            
                                            # Clear the selected recipe
                                            st.session_state.selected_recipe = None
                                            
                                            st.success("Recipe applied to meal!")
                                        
                                        # Button to cancel using recipe
                                        if st.button("Cancel Recipe", key=f"cancel_recipe_{day}_{meal_idx}"):
                                            st.session_state.selected_recipe = None
                                            st.rerun()
                                    
                                    # Show selected foods
                                    if st.session_state.selected_foods:
                                        st.subheader("Selected Foods")
                                        
                                        # Display selected foods in a table
                                        selected_foods_data = []
                                        
                                        for food in st.session_state.selected_foods:
                                            selected_foods_data.append({
                                                'Food': food['name'],
                                                'Category': food['category'].capitalize(),
                                                'Calories': f"{food['calories']}",
                                                'Protein': f"{food['protein']}g",
                                                'Carbs': f"{food['carbs']}g",
                                                'Fat': f"{food['fat']}g"
                                            })
                                        
                                        selected_foods_df = pd.DataFrame(selected_foods_data)
                                        st.dataframe(selected_foods_df, use_container_width=True)
                                        
                                        # Button to remove all selected foods
                                        if st.button("Clear All Foods", key=f"clear_foods_{day}_{meal_idx}"):
                                            st.session_state.selected_foods = []
                                            st.session_state.serving_adjustments = {}
                                            st.success("All foods cleared!")
                                            st.rerun()
                                    
                                    # Adjust serving sizes
                                    if st.session_state.selected_foods:
                                        st.write("### Adjust Serving Sizes")
                                        
                                        # Create sliders for each food
                                        for food in st.session_state.selected_foods:
                                            # Get or initialize adjustment for this food
                                            if food["name"] not in st.session_state.serving_adjustments:
                                                st.session_state.serving_adjustments[food["name"]] = 1.0
                                            
                                            # Create slider
                                            adj_value = st.slider(
                                                f"Adjust {food['name']} portion", 
                                                min_value=0.25, 
                                                max_value=3.0, 
                                                value=st.session_state.serving_adjustments[food["name"]],
                                                step=0.25,
                                                format="%.2fx",
                                                key=f"slider_{day}_{meal_idx}_{food['name']}"
                                            )
                                            
                                            # Store the adjustment
                                            st.session_state.serving_adjustments[food["name"]] = adj_value
                                        
                                        # Calculate portions based on current adjustments
                                        serving_adjustments = st.session_state.serving_adjustments
                                        portions = calculate_portion_sizes(meal, st.session_state.selected_foods, serving_adjustments)
                                        
                                        # Show calculated portions in a table
                                        portion_data = []
                                        for food_name, amount in portions.items():
                                            food_obj = next((f for f in st.session_state.selected_foods if f["name"] == food_name), None)
                                            if food_obj:
                                                cals = food_obj['calories'] * amount / 100
                                                protein = food_obj['protein'] * amount / 100
                                                carbs = food_obj['carbs'] * amount / 100
                                                fat = food_obj['fat'] * amount / 100
                                                
                                                portion_data.append({
                                                    'Food': food_name,
                                                    'Amount': f"{amount}g",
                                                    'Calories': f"{cals:.0f}",
                                                    'Protein': f"{protein:.1f}g",
                                                    'Carbs': f"{carbs:.1f}g",
                                                    'Fat': f"{fat:.1f}g"
                                                })
                                        
                                        if portion_data:
                                            st.write("### Calculated Portions")
                                            st.dataframe(pd.DataFrame(portion_data), use_container_width=True)
                                            
                                            # Save as recipe button
                                            if st.button("Save as Recipe", key=f"save_recipe_{day}_{meal_idx}"):
                                                create_recipe_ui(st.session_state.selected_foods, portions)
                                        
                                        # Calculate and show total nutrition from these portions
                                        total_macros = calculate_total_macros(st.session_state.selected_foods, portions)
                                        
                                        st.write("### Meal Totals vs. Targets")
                                        
                                        # Show comparison 
                                        col1, col2, col3, col4 = st.columns(4)
                                        with col1:
                                            st.metric("Calories", f"{total_macros['calories']}", f"{total_macros['calories'] - meal['calories']}")
                                        with col2:
                                            st.metric("Protein", f"{total_macros['protein']}g", f"{total_macros['protein'] - meal['protein']}g")
                                        with col3:
                                            st.metric("Carbs", f"{total_macros['carbs']}g", f"{total_macros['carbs'] - meal['carbs']}g")
                                        with col4:
                                            st.metric("Fat", f"{total_macros['fat']}g", f"{total_macros['fat'] - meal['fat']}g")
                                        
                                        # Buttons for saving or canceling
                                        save_col, cancel_col = st.columns(2)
                                        
                                        with save_col:
                                            if st.button("Save Foods", key=f"save_foods_{day}_{meal_idx}"):
                                                # Convert to food objects with portions
                                                meal_foods = []
                                                for food_name, amount in portions.items():
                                                    food_obj = next((f for f in st.session_state.selected_foods if f["name"] == food_name), None)
                                                    if food_obj:
                                                        meal_foods.append({
                                                            'name': food_name,
                                                            'amount': amount,
                                                            'unit': 'g',
                                                            'protein': food_obj['protein'],
                                                            'carbs': food_obj['carbs'],
                                                            'fat': food_obj['fat'],
                                                            'calories': food_obj['calories'],
                                                            'fiber': food_obj.get('fiber', 0),
                                                            'fdcId': food_obj.get('fdcId', '')
                                                        })
                                                
                                                # Update the meal
                                                st.session_state.meal_plans[day]['meals'][meal_idx]['foods'] = meal_foods
                                                
                                                # Reset editing state and save
                                                st.session_state['editing_meal'] = None
                                                st.session_state.selected_foods = []
                                                st.session_state.serving_adjustments = {}
                                                
                                                save_meal_plans()
                                                st.success("Foods saved!")
                                                st.rerun()
                                        
                                        with cancel_col:
                                            if st.button("Cancel", key=f"cancel_foods_{day}_{meal_idx}"):
                                                # Reset editing state
                                                st.session_state['editing_meal'] = None
                                                st.session_state.selected_foods = []
                                                st.session_state.serving_adjustments = {}
                                                st.rerun()
                                    else:
                                        st.info("Select at least one food to continue.")
                                
                                else:
                                    # Display current foods
                                    st.write("### Current Foods")
                                    food_details = []
                                    
                                    for food_item in meal.get('foods', []):
                                        food_name = food_item['name']
                                        amount = food_item['amount']
                                        
                                        # Calculate macros based on the amount
                                        cals = food_item['calories'] * amount / 100
                                        protein = food_item['protein'] * amount / 100
                                        carbs = food_item['carbs'] * amount / 100
                                        fat = food_item['fat'] * amount / 100
                                        
                                        food_details.append({
                                            'Food': food_name,
                                            'Amount': f"{amount}g",
                                            'Calories': f"{cals:.0f}",
                                            'Protein': f"{protein:.1f}g",
                                            'Carbs': f"{carbs:.1f}g",
                                            'Fat': f"{fat:.1f}g"
                                        })
                                    
                                    if food_details:
                                        st.dataframe(pd.DataFrame(food_details), use_container_width=True)
                                    
                                    # Button to edit foods
                                    if st.button(f"Edit Foods", key=f"edit_{day}_{meal_idx}"):
                                        # Pre-load the selected foods from the meal
                                        st.session_state.selected_foods = []
                                        st.session_state.serving_adjustments = {}
                                        
                                        for food in meal.get('foods', []):
                                            # Try to find this food in our food database first
                                            if 'fdcId' in food and food['fdcId']:
                                                # Get food details from the API
                                                food_details = fdc_api.get_food_details(food['fdcId'])
                                                if food_details:
                                                    normalized_food = fdc_api.normalize_food_data(food_details)
                                                    st.session_state.selected_foods.append(normalized_food)
                                                    
                                                    # Calculate adjustment factor from portion
                                                    portion = food['amount']
                                                    adjustment = portion / 100
                                                    st.session_state.serving_adjustments[normalized_food['name']] = adjustment
                                            else:
                                                # Use the food data from the meal
                                                st.session_state.selected_foods.append({
                                                    'name': food['name'],
                                                    'calories': food['calories'],
                                                    'protein': food['protein'],
                                                    'carbs': food['carbs'],
                                                    'fat': food['fat'],
                                                    'fiber': food.get('fiber', 0),
                                                    'unit': 'g',
                                                    'category': fdc_api.categorize_food(food),
                                                    'fdcId': food.get('fdcId', '')
                                                })
                                                
                                                # Calculate adjustment factor from portion
                                                portion = food['amount']
                                                adjustment = portion / 100
                                                st.session_state.serving_adjustments[food['name']] = adjustment
                                        
                                        st.session_state['editing_meal'] = (day, meal_idx)
                                        st.rerun()
                    
                    # Display snacks with same edit pattern
                    if 'snacks' in plan and plan['snacks'] and len(plan['snacks']) > 0:
                        st.write("**Snacks:**")
                        
                        for snack_idx, snack in enumerate(plan['snacks']):
                            snack_expander = st.expander(f"{snack['name']}")
                            
                            with snack_expander:
                                # Show snack targets
                                st.write(f"**Targets:** {snack['calories']} kcal | {snack['protein']}g protein | {snack['carbs']}g carbs | {snack['fat']}g fat")
                                
                                # Similar food selection code as with meals
                                is_editing = st.session_state.get('editing_snack') == (day, snack_idx)
                                
                                if is_editing or not snack.get('foods', []):
                                    # We're in edit mode or no foods yet - show food selection UI
                                    st.write("### Select Foods")
                                    
                                    # Food selection tabs - Search, Favorites, Recommendations
                                    food_tabs = st.tabs(["Search", "Favorites", "Recommendations"])
                                    
                                    with food_tabs[0]:
                                        # Search tab
                                        selected_search_food = food_search_ui()
                                        
                                        if selected_search_food:
                                            # Check if this food is already selected
                                            if selected_search_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                                st.session_state.selected_foods.append(selected_search_food)
                                                # Initialize serving adjustment
                                                st.session_state.serving_adjustments[selected_search_food['name']] = 1.0
                                                st.success(f"Added {selected_search_food['name']} to snack!")
                                    
                                    with food_tabs[1]:
                                        # Favorites tab
                                        selected_favorite = favorites_ui()
                                        
                                        if selected_favorite:
                                            # Check if this food is already selected
                                            if selected_favorite['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                                st.session_state.selected_foods.append(selected_favorite)
                                                # Initialize serving adjustment
                                                st.session_state.serving_adjustments[selected_favorite['name']] = 1.0
                                                st.success(f"Added {selected_favorite['name']} to snack!")
                                    
                                    with food_tabs[2]:
                                        # Recommendations tab
                                        recommended_item = food_recommendations_ui(snack, "Snack")
                                        
                                        if isinstance(recommended_item, dict) and 'foods' in recommended_item:
                                            # This is a recipe
                                            st.session_state.selected_recipe = recommended_item
                                            st.success(f"Selected recipe: {recommended_item['name']}")
                                            st.rerun()
                                        elif recommended_item:
                                            # This is a food
                                            # Check if this food is already selected
                                            if recommended_item['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                                st.session_state.selected_foods.append(recommended_item)
                                                # Initialize serving adjustment
                                                st.session_state.serving_adjustments[recommended_item['name']] = 1.0
                                                st.success(f"Added {recommended_item['name']} to snack!")
                                    
                                    # If a recipe was selected, handle it
                                    if st.session_state.selected_recipe:
                                        # Same recipe handling as in meals section
                                        st.subheader(f"Using Recipe: {st.session_state.selected_recipe['name']}")
                                        
                                        # Get the foods and portions from the recipe
                                        recipe_foods = st.session_state.selected_recipe['foods']
                                        recipe_portions = st.session_state.selected_recipe['portions']
                                        
                                        # Display the recipe contents
                                        recipe_foods_df = pd.DataFrame([
                                            {
                                                'Food': f['name'],
                                                'Amount': f"{recipe_portions.get(f['name'], 0)}g",
                                                'Calories': f"{f['calories'] * recipe_portions.get(f['name'], 0) / 100:.0f} kcal",
                                                'Protein': f"{f['protein'] * recipe_portions.get(f['name'], 0) / 100:.1f}g",
                                                'Carbs': f"{f['carbs'] * recipe_portions.get(f['name'], 0) / 100:.1f}g",
                                                'Fat': f"{f['fat'] * recipe_portions.get(f['name'], 0) / 100:.1f}g"
                                            }
                                            for f in recipe_foods
                                        ])
                                        
                                        st.dataframe(recipe_foods_df, use_container_width=True)
                                        
                                        # Button to use recipe
                                        if st.button("Use Recipe", key=f"use_recipe_snack_{day}_{snack_idx}"):
                                            # Set the recipe foods as the selected foods
                                            st.session_state.selected_foods = recipe_foods
                                            
                                            # Set the recipe portions as the serving adjustments
                                            st.session_state.serving_adjustments = {}
                                            for food in recipe_foods:
                                                # Calculate the adjustment factor
                                                food_portion = recipe_portions.get(food['name'], 0)
                                                base_portion = 100
                                                adjustment = food_portion / base_portion
                                                st.session_state.serving_adjustments[food['name']] = adjustment
                                            
                                            # Clear the selected recipe
                                            st.session_state.selected_recipe = None
                                            
                                            st.success("Recipe applied to snack!")
                                        
                                        # Button to cancel using recipe
                                        if st.button("Cancel Recipe", key=f"cancel_recipe_snack_{day}_{snack_idx}"):
                                            st.session_state.selected_recipe = None
                                            st.rerun()
                                    
                                    # Show selected foods and serving adjustment UI (similar to meals section)
                                    if st.session_state.selected_foods:
                                        # Rest of the UI for selected foods and serving adjustment
                                        # (Similar to meals section)
                                        st.subheader("Selected Foods")
                                        
                                        # Display selected foods in a table
                                        selected_foods_data = []
                                        
                                        for food in st.session_state.selected_foods:
                                            selected_foods_data.append({
                                                'Food': food['name'],
                                                'Category': food['category'].capitalize(),
                                                'Calories': f"{food['calories']}",
                                                'Protein': f"{food['protein']}g",
                                                'Carbs': f"{food['carbs']}g",
                                                'Fat': f"{food['fat']}g"
                                            })
                                        
                                        selected_foods_df = pd.DataFrame(selected_foods_data)
                                        st.dataframe(selected_foods_df, use_container_width=True)
                                        
                                        # Button to remove all selected foods
                                        if st.button("Clear All Foods", key=f"clear_foods_snack_{day}_{snack_idx}"):
                                            st.session_state.selected_foods = []
                                            st.session_state.serving_adjustments = {}
                                            st.success("All foods cleared!")
                                            st.rerun()
                                    
                                    # Adjust serving sizes
                                    if st.session_state.selected_foods:
                                        st.write("### Adjust Serving Sizes")
                                        
                                        # Create sliders for each food
                                        for food in st.session_state.selected_foods:
                                            # Get or initialize adjustment for this food
                                            if food["name"] not in st.session_state.serving_adjustments:
                                                st.session_state.serving_adjustments[food["name"]] = 1.0
                                            
                                            # Create slider
                                            adj_value = st.slider(
                                                f"Adjust {food['name']} portion", 
                                                min_value=0.25, 
                                                max_value=3.0, 
                                                value=st.session_state.serving_adjustments[food["name"]],
                                                step=0.25,
                                                format="%.2fx",
                                                key=f"slider_snack_{day}_{snack_idx}_{food['name']}"
                                            )
                                            
                                            # Store the adjustment
                                            st.session_state.serving_adjustments[food["name"]] = adj_value
                                        
                                        # Calculate portions based on current adjustments
                                        serving_adjustments = st.session_state.serving_adjustments
                                        portions = calculate_portion_sizes(snack, st.session_state.selected_foods, serving_adjustments)
                                        
                                        # Show calculated portions in a table
                                        portion_data = []
                                        for food_name, amount in portions.items():
                                            food_obj = next((f for f in st.session_state.selected_foods if f["name"] == food_name), None)
                                            if food_obj:
                                                cals = food_obj['calories'] * amount / 100
                                                protein = food_obj['protein'] * amount / 100
                                                carbs = food_obj['carbs'] * amount / 100
                                                fat = food_obj['fat'] * amount / 100
                                                
                                                portion_data.append({
                                                    'Food': food_name,
                                                    'Amount': f"{amount}g",
                                                    'Calories': f"{cals:.0f}",
                                                    'Protein': f"{protein:.1f}g",
                                                    'Carbs': f"{carbs:.1f}g",
                                                    'Fat': f"{fat:.1f}g"
                                                })
                                        
                                        if portion_data:
                                            st.write("### Calculated Portions")
                                            st.dataframe(pd.DataFrame(portion_data), use_container_width=True)
                                            
                                            # Save as recipe button
                                            if st.button("Save as Recipe", key=f"save_recipe_snack_{day}_{snack_idx}"):
                                                create_recipe_ui(st.session_state.selected_foods, portions)
                                        
                                        # Calculate and show total nutrition from these portions
                                        total_macros = calculate_total_macros(st.session_state.selected_foods, portions)
                                        
                                        st.write("### Snack Totals vs. Targets")
                                        
                                        # Show comparison 
                                        col1, col2, col3, col4 = st.columns(4)
                                        with col1:
                                            st.metric("Calories", f"{total_macros['calories']}", f"{total_macros['calories'] - snack['calories']}")
                                        with col2:
                                            st.metric("Protein", f"{total_macros['protein']}g", f"{total_macros['protein'] - snack['protein']}g")
                                        with col3:
                                            st.metric("Carbs", f"{total_macros['carbs']}g", f"{total_macros['carbs'] - snack['carbs']}g")
                                        with col4:
                                            st.metric("Fat", f"{total_macros['fat']}g", f"{total_macros['fat'] - snack['fat']}g")
                                        
                                        # Buttons for saving or canceling
                                        save_col, cancel_col = st.columns(2)
                                        
                                        with save_col:
                                            if st.button("Save Foods", key=f"save_foods_snack_{day}_{snack_idx}"):
                                                # Convert to food objects with portions
                                                snack_foods = []
                                                for food_name, amount in portions.items():
                                                    food_obj = next((f for f in st.session_state.selected_foods if f["name"] == food_name), None)
                                                    if food_obj:
                                                        snack_foods.append({
                                                            'name': food_name,
                                                            'amount': amount,
                                                            'unit': 'g',
                                                            'protein': food_obj['protein'],
                                                            'carbs': food_obj['carbs'],
                                                            'fat': food_obj['fat'],
                                                            'calories': food_obj['calories'],
                                                            'fiber': food_obj.get('fiber', 0),
                                                            'fdcId': food_obj.get('fdcId', '')
                                                        })
                                                
                                                # Update the snack
                                                st.session_state.meal_plans[day]['snacks'][snack_idx]['foods'] = snack_foods
                                                
                                                # Reset editing state and save
                                                st.session_state['editing_snack'] = None
                                                st.session_state.selected_foods = []
                                                st.session_state.serving_adjustments = {}
                                                
                                                save_meal_plans()
                                                st.success("Foods saved!")
                                                st.rerun()
                                        
                                        with cancel_col:
                                            if st.button("Cancel", key=f"cancel_foods_snack_{day}_{snack_idx}"):
                                                # Reset editing state
                                                st.session_state['editing_snack'] = None
                                                st.session_state.selected_foods = []
                                                st.session_state.serving_adjustments = {}
                                                st.rerun()
                                    else:
                                        st.info("Select at least one food to continue.")
                                
                                else:
                                    # Display current foods
                                    st.write("### Current Foods")
                                    food_details = []
                                    
                                    for food_item in snack.get('foods', []):
                                        food_name = food_item['name']
                                        amount = food_item['amount']
                                        
                                        # Calculate macros based on the amount
                                        cals = food_item['calories'] * amount / 100
                                        protein = food_item['protein'] * amount / 100
                                        carbs = food_item['carbs'] * amount / 100
                                        fat = food_item['fat'] * amount / 100
                                        
                                        food_details.append({
                                            'Food': food_name,
                                            'Amount': f"{amount}g",
                                            'Calories': f"{cals:.0f}",
                                            'Protein': f"{protein:.1f}g",
                                            'Carbs': f"{carbs:.1f}g",
                                            'Fat': f"{fat:.1f}g"
                                        })
                                    
                                    if food_details:
                                        st.dataframe(pd.DataFrame(food_details), use_container_width=True)
                                    
                                    # Button to edit foods
                                    if st.button(f"Edit Foods", key=f"edit_snack_{day}_{snack_idx}"):
                                        # Pre-load the selected foods from the snack (similar to meals section)
                                        st.session_state.selected_foods = []
                                        st.session_state.serving_adjustments = {}
                                        
                                        for food in snack.get('foods', []):
                                            # Try to find this food in our food database first
                                            if 'fdcId' in food and food['fdcId']:
                                                # Get food details from the API
                                                food_details = fdc_api.get_food_details(food['fdcId'])
                                                if food_details:
                                                    normalized_food = fdc_api.normalize_food_data(food_details)
                                                    st.session_state.selected_foods.append(normalized_food)
                                                    
                                                    # Calculate adjustment factor from portion
                                                    portion = food['amount']
                                                    adjustment = portion / 100
                                                    st.session_state.serving_adjustments[normalized_food['name']] = adjustment
                                            else:
                                                # Use the food data from the snack
                                                st.session_state.selected_foods.append({
                                                    'name': food['name'],
                                                    'calories': food['calories'],
                                                    'protein': food['protein'],
                                                    'carbs': food['carbs'],
                                                    'fat': food['fat'],
                                                    'fiber': food.get('fiber', 0),
                                                    'unit': 'g',
                                                    'category': fdc_api.categorize_food(food),
                                                    'fdcId': food.get('fdcId', '')
                                                })
                                                
                                                # Calculate adjustment factor from portion
                                                portion = food['amount']
                                                adjustment = portion / 100
                                                st.session_state.serving_adjustments[food['name']] = adjustment
                                        
                                        st.session_state['editing_snack'] = (day, snack_idx)
                                        st.rerun()
                
                with summary_col:
                    # SUMMARY SECTION - Show nutritional targets and stats
                    st.subheader("Daily Targets")
                    st.write(f"Calories: {plan['nutrition']['calories']}")
                    st.write(f"Protein: {plan['nutrition']['protein']}g")
                    st.write(f"Carbs: {plan['nutrition']['carbs']}g")
                    st.write(f"Fat: {plan['nutrition']['fat']}g")
                    st.write(f"Fiber: {plan['nutrition']['fiber']}g")
                    
                    # Show macronutrient breakdown as percentages
                    protein_cals = plan['nutrition']['protein'] * 4
                    carb_cals = plan['nutrition']['carbs'] * 4
                    fat_cals = plan['nutrition']['fat'] * 9
                    total_cals = protein_cals + carb_cals + fat_cals
                    
                    if total_cals > 0:
                        protein_pct = (protein_cals / total_cals) * 100
                        carb_pct = (carb_cals / total_cals) * 100
                        fat_pct = (fat_cals / total_cals) * 100
                        
                        # Create donut chart for macros
                        fig, ax = plt.subplots(figsize=(4, 4))
                        ax.pie([protein_pct, carb_pct, fat_pct], 
                              labels=['P', 'C', 'F'],
                              colors=['#ff9999', '#99ff99', '#9999ff'],
                              autopct='%1.1f%%',
                              startangle=90,
                              wedgeprops=dict(width=0.5))
                        ax.axis('equal')
                        st.pyplot(fig)
                    
                    # Button to edit day plan
                    if st.button("Edit Day Plan", key=f"edit_plan_{day}"):
                        st.session_state['active_editing_day'] = day
                        st.rerun()
                    
                    # Weekly progress comparison
                    if planned_days_df is not None and not planned_days_df.empty:
                        st.write("### Weekly Progress")
                        st.write(f"Days planned: {len(planned_days_df)}/7")
                        
                        # How does this day compare to the weekly average?
                        avg_calories = planned_days_df["Calories"].mean()
                        avg_protein = planned_days_df["Protein (g)"].mean()
                        avg_carbs = planned_days_df["Carbs (g)"].mean()
                        avg_fat = planned_days_df["Fat (g)"].mean()
                        
                        # Compare this day to weekly average
                        st.write("#### vs. Weekly Average")
                        
                        if abs(plan['nutrition']['calories'] - avg_calories) > 50:
                            cal_diff = plan['nutrition']['calories'] - avg_calories
                            st.write(f"Calories: {cal_diff:+.0f} kcal")
                        
                        if abs(plan['nutrition']['protein'] - avg_protein) > 5:
                            protein_diff = plan['nutrition']['protein'] - avg_protein
                            st.write(f"Protein: {protein_diff:+.0f}g")
                        
                        if abs(plan['nutrition']['carbs'] - avg_carbs) > 10:
                            carbs_diff = plan['nutrition']['carbs'] - avg_carbs
                            st.write(f"Carbs: {carbs_diff:+.0f}g")
                        
                        if abs(plan['nutrition']['fat'] - avg_fat) > 5:
                            fat_diff = plan['nutrition']['fat'] - avg_fat
                            st.write(f"Fat: {fat_diff:+.0f}g")
            
            else:
                # No plan exists for this day - show create plan UI
                st.subheader(f"Create Plan for {day}")
                
                # Use two columns for the form
                col1, col2 = st.columns(2)
                
                with col1:
                    # Day type selection
                    day_type = st.selectbox(f"Day Type", day_types, key=f"create_day_type_{day}")
                    
                    # Training sessions
                    if day_type != 'Rest Day':
                        st.write("#### Training Sessions")
                        training_options = ["No Training"] + time_slots
                        
                        training_session1 = st.selectbox("Training Session 1", training_options, key=f"create_training1_{day}")
                        
                        show_session2 = st.checkbox("Add second training session", key=f"create_add_session2_{day}")
                        if show_session2:
                            training_session2 = st.selectbox("Training Session 2", training_options, key=f"create_training2_{day}")
                        else:
                            training_session2 = "No Training"
                        
                        show_session3 = st.checkbox("Add third training session", key=f"create_add_session3_{day}")
                        if show_session3 and show_session2:
                            training_session3 = st.selectbox("Training Session 3", training_options, key=f"create_training3_{day}")
                        else:
                            training_session3 = "No Training"
                        
                        training_sessions = [session for session in [training_session1, training_session2, training_session3] 
                                          if session != "No Training"]
                        
                        if not training_sessions:
                            training_sessions = ["No Training"]
                    else:
                        training_sessions = ["No Training"]
                    
                    # Meal structure
                    st.write("#### Meal Structure")
                    num_meals = st.slider("Number of Main Meals", min_value=2, max_value=6, value=3, step=1, key=f"create_meals_{day}")
                    num_snacks = st.slider("Number of Snacks", min_value=0, max_value=4, value=2, step=1, key=f"create_snacks_{day}")
                    
                    # Meal times
                    st.write("#### Approximate Meal Times")
                    meal_times = []
                    for i in range(num_meals):
                        default_idx = 0
                        if i == 0:
                            default_idx = 2  # Default breakfast at 7-8am
                        elif i == 1:
                            default_idx = 6  # Default lunch at 12-1pm
                        elif i == 2:
                            default_idx = 13  # Default dinner at 6-7pm
                        
                        meal_times.append(st.selectbox(f"Meal {i+1} Time", time_slots, index=default_idx, key=f"create_meal_time_{day}_{i}"))
                
                with col2:
                    # Nutrition targets
                    st.write("#### Nutrition Targets")
                    
                    # Get default values and adjust based on day type
                    default_values = get_default_nutrition_values()
                    
                    if day_type == 'Rest Day':
                        calorie_adjustment = -200
                        carb_adjustment = -30
                    elif day_type == 'Training Day - Light':
                        calorie_adjustment = 0
                        carb_adjustment = 0
                    elif day_type == 'Training Day - Moderate':
                        calorie_adjustment = 200
                        carb_adjustment = 20
                    elif day_type == 'Training Day - Intense':
                        calorie_adjustment = 400
                        carb_adjustment = 50
                    else:
                        calorie_adjustment = 0
                        carb_adjustment = 0
                    
                    # Nutrition inputs
                    target_calories = st.number_input(
                        "Daily Calorie Target", 
                        min_value=1000, 
                        max_value=5000, 
                        value=int(default_values['calories'] + calorie_adjustment),
                        key=f"create_calories_{day}"
                    )
                    
                    target_protein = st.number_input(
                        "Protein Target (g)", 
                        min_value=50, 
                        max_value=400, 
                        value=int(default_values['protein']),
                        key=f"create_protein_{day}"
                    )
                    
                    target_carbs = st.number_input(
                        "Carbohydrate Target (g)", 
                        min_value=50, 
                        max_value=600, 
                        value=int(default_values['carbs'] + carb_adjustment),
                        key=f"create_carbs_{day}"
                    )
                    
                    target_fat = st.number_input(
                        "Fat Target (g)", 
                        min_value=20, 
                        max_value=200, 
                        value=int(default_values['fat']),
                        key=f"create_fat_{day}"
                    )
                    
                    target_fiber = st.number_input(
                        "Fiber Target (g)", 
                        min_value=10, 
                        max_value=50, 
                        value=default_values['fiber'],
                        key=f"create_fiber_{day}"
                    )
                    
                    # Show macronutrient breakdown
                    st.write("#### Macronutrient Breakdown")
                    
                    # Calculate percentages
                    protein_calories = target_protein * 4
                    carb_calories = target_carbs * 4
                    fat_calories = target_fat * 9
                    total_calories_from_macros = protein_calories + carb_calories + fat_calories
                    
                    if total_calories_from_macros > 0:
                        protein_pct = (protein_calories / total_calories_from_macros) * 100
                        carb_pct = (carb_calories / total_calories_from_macros) * 100
                        fat_pct = (fat_calories / total_calories_from_macros) * 100
                        
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
                
                # Button to generate the plan
                if st.button(f"Generate Plan for {day}"):
                    nutrition = {
                        'calories': target_calories,
                        'protein': target_protein,
                        'carbs': target_carbs,
                        'fat': target_fat,
                        'fiber': target_fiber
                    }
                    
                    # Calculate meal and snack distribution
                    meals, snacks = calculate_meal_distribution(nutrition, num_meals, num_snacks, training_sessions, meal_times)
                    
                    # Create the meal plan
                    meal_plan = {
                        'day_type': day_type,
                        'training_sessions': training_sessions,
                        'num_meals': num_meals,
                        'num_snacks': num_snacks,
                        'nutrition': nutrition,
                        'meals': meals,
                        'snacks': snacks,
                        'grocery_list': []
                    }
                    
                    # Save to session state
                    st.session_state.meal_plans[day] = meal_plan
                    
                    # Save to file
                    save_meal_plans()
                    
                    st.success(f"Plan for {day} has been generated!")
                    st.rerun()

# Grocery list tab
with grocery_tab:
    st.header("Grocery List")
    
    if st.session_state.meal_plans:
        # Create a combined list of all foods needed across all days
        all_foods_needed = {}
        
        for day, plan in st.session_state.meal_plans.items():
            # Get foods from meals
            if 'meals' in plan:
                for meal in plan['meals']:
                    if 'foods' in meal:
                        for food in meal['foods']:
                            food_name = food['name']
                            amount = food['amount']
                            
                            if food_name in all_foods_needed:
                                all_foods_needed[food_name] += amount
                            else:
                                all_foods_needed[food_name] = amount
            
            # Get foods from snacks
            if 'snacks' in plan:
                for snack in plan['snacks']:
                    if 'foods' in snack:
                        for food in snack['foods']:
                            food_name = food['name']
                            amount = food['amount']
                            
                            if food_name in all_foods_needed:
                                all_foods_needed[food_name] += amount
                            else:
                                all_foods_needed[food_name] = amount
        
        if all_foods_needed:
            # Organize by food category
            categorized_foods = {}
            
            for food_name, amount in all_foods_needed.items():
                # Find the food in our database
                food_info = next((f for f in st.session_state.meal_plans[day]['meals'][0]['foods'] 
                                 if 'name' in f and f['name'] == food_name), None)
                
                if not food_info:
                    # Try to find in snacks if not found in meals
                    for day, plan in st.session_state.meal_plans.items():
                        if 'snacks' in plan:
                            for snack in plan['snacks']:
                                if 'foods' in snack:
                                    food_info = next((f for f in snack['foods'] 
                                                     if 'name' in f and f['name'] == food_name), None)
                                    if food_info:
                                        break
                
                # Determine category
                if food_info:
                    if 'category' in food_info:
                        category = food_info['category'].capitalize()
                    else:
                        # Try to determine category from macro profile
                        category = fdc_api.categorize_food(food_info).capitalize()
                else:
                    category = "Other"
                
                if category not in categorized_foods:
                    categorized_foods[category] = []
                
                categorized_foods[category].append({
                    'name': food_name,
                    'amount': amount,
                    'unit': 'g'
                })
            
            # Display the grocery list by category
            for category, foods in categorized_foods.items():
                st.subheader(category)
                
                # Create a table for this category
                grocery_data = []
                
                for food in foods:
                    grocery_data.append({
                        'Food': food['name'],
                        'Amount': f"{food['amount']} {food['unit']}",
                        'For Week': True
                    })
                
                # Create a DataFrame and display it
                grocery_df = pd.DataFrame(grocery_data)
                st.dataframe(grocery_df, use_container_width=True)
            
            # Option to export grocery list
            st.write("---")
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("Export Grocery List as CSV"):
                    # Create a DataFrame with all grocery items
                    all_grocery_data = []
                    
                    for category, foods in categorized_foods.items():
                        for food in foods:
                            all_grocery_data.append({
                                'Category': category,
                                'Food': food['name'],
                                'Amount': food['amount'],
                                'Unit': food['unit']
                            })
                    
                    grocery_df = pd.DataFrame(all_grocery_data)
                    
                    # Export to CSV
                    grocery_df.to_csv('./data/grocery_list.csv', index=False)
                    
                    st.success("Grocery list exported to data/grocery_list.csv!")
            
            with col2:
                if st.button("Print-Friendly Version"):
                    # Create a print-friendly version
                    st.markdown("### Grocery List")
                    
                    for category, foods in categorized_foods.items():
                        st.markdown(f"**{category}**")
                        
                        for food in foods:
                            st.markdown(f"- {food['name']}: {food['amount']} {food['unit']}")
                        
                        st.markdown("")
        else:
            st.info("No foods have been added to any meals yet. Go to Food Selection to add foods to your meals.")
    else:
        st.info("No meal plans have been created yet. Use the 'Meal Planner' tab to create your first meal plan.")

# Favorites and Recipes tab
with favorites_tab:
    # Create subtabs for favorites and recipes
    fav_subtabs = st.tabs(["My Favorite Foods", "My Recipes"])
    
    # Favorites subtab
    with fav_subtabs[0]:
        st.header("Favorite Foods")
        st.markdown("Track your favorite foods for quick selection when planning meals.")
        
        # Get user favorites
        favorites = fdc_api.get_user_favorites()
        
        if not favorites:
            st.info("You haven't added any favorite foods yet. Use the food search in the meal planner to find and add foods to your favorites.")
        else:
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
                
                for food in foods:
                    table_data.append({
                        'Food': food['name'],
                        'Calories': f"{food['calories']:.0f}",
                        'Protein': f"{food['protein']:.1f}g",
                        'Carbs': f"{food['carbs']:.1f}g",
                        'Fat': f"{food['fat']:.1f}g",
                        'Fiber': f"{food.get('fiber', 0):.1f}g"
                    })
                
                # Create a DataFrame and display it
                favorites_df = pd.DataFrame(table_data)
                st.dataframe(favorites_df, use_container_width=True)
            
            # Option to search and add more foods
            st.subheader("Add More Foods")
            
            # Use the food search UI
            selected_food = food_search_ui()
            
            if selected_food:
                if st.button("Add to Favorites", key="add_fav_btn"):
                    fdc_api.add_to_favorites(selected_food)
                    st.success(f"Added {selected_food['name']} to favorites!")
                    st.rerun()
    
    # Recipes subtab
    with fav_subtabs[1]:
        st.header("My Recipes")
        st.markdown("Create and manage your own recipes for easy meal planning.")
        
        # Get user recipes
        recipes = fdc_api.get_user_recipes()
        
        if not recipes:
            st.info("You haven't created any recipes yet. Use the meal planner to create and save recipes.")
        else:
            # Group recipes by meal type
            meal_types = {"Breakfast": [], "Lunch": [], "Dinner": [], "Snack": [], "Any": []}
            
            for recipe in recipes:
                meal_type = recipe.get('meal_type', 'Any')
                meal_types[meal_type].append(recipe)
            
            # Display recipes by meal type
            for meal_type, type_recipes in meal_types.items():
                if type_recipes:
                    st.subheader(meal_type)
                    
                    for recipe in type_recipes:
                        with st.expander(f"{recipe['name']} ({recipe['total_calories']:.0f} kcal)"):
                            # Display recipe details
                            col1, col2, col3, col4 = st.columns(4)
                            
                            with col1:
                                st.metric("Calories", f"{recipe['total_calories']:.0f}")
                            
                            with col2:
                                st.metric("Protein", f"{recipe['total_protein']:.1f}g")
                            
                            with col3:
                                st.metric("Carbs", f"{recipe['total_carbs']:.1f}g")
                            
                            with col4:
                                st.metric("Fat", f"{recipe['total_fat']:.1f}g")
                            
                            # Display ingredients
                            st.subheader("Ingredients")
                            
                            ingredients_data = []
                            
                            for food in recipe['foods']:
                                portion = recipe['portions'].get(food['name'], 0)
                                
                                ingredients_data.append({
                                    'Food': food['name'],
                                    'Amount': f"{portion}g",
                                    'Calories': f"{food['calories'] * portion / 100:.0f}",
                                    'Protein': f"{food['protein'] * portion / 100:.1f}g",
                                    'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                                    'Fat': f"{food['fat'] * portion / 100:.1f}g"
                                })
                            
                            # Create a DataFrame and display it
                            ingredients_df = pd.DataFrame(ingredients_data)
                            st.dataframe(ingredients_df, use_container_width=True)
            
            # Option to create a new recipe from scratch
            st.subheader("Create New Recipe")
            
            if st.button("Start New Recipe"):
                st.session_state.creating_new_recipe = True
                st.session_state.recipe_foods = []
                st.session_state.recipe_portions = {}
                st.rerun()
            
            # If creating a new recipe
            if st.session_state.get('creating_new_recipe', False):
                # Recipe creation UI
                st.write("#### Add Foods to Recipe")
                
                # Tabs for food search and favorites
                food_tabs = st.tabs(["Search", "Favorites"])
                
                with food_tabs[0]:
                    selected_search_food = food_search_ui()
                    
                    if selected_search_food:
                        # Button to add to recipe
                        if st.button("Add to Recipe", key="add_recipe_search"):
                            # Check if this food is already selected
                            if selected_search_food['name'] not in [f['name'] for f in st.session_state.recipe_foods]:
                                st.session_state.recipe_foods.append(selected_search_food)
                                # Initialize portion
                                st.session_state.recipe_portions[selected_search_food['name']] = 100  # Default 100g
                                st.success(f"Added {selected_search_food['name']} to recipe!")
                                st.rerun()
                
                with food_tabs[1]:
                    selected_favorite = favorites_ui()
                    
                    if selected_favorite:
                        # Button to add to recipe
                        if st.button("Add to Recipe", key="add_recipe_favorite"):
                            # Check if this food is already selected
                            if selected_favorite['name'] not in [f['name'] for f in st.session_state.recipe_foods]:
                                st.session_state.recipe_foods.append(selected_favorite)
                                # Initialize portion
                                st.session_state.recipe_portions[selected_favorite['name']] = 100  # Default 100g
                                st.success(f"Added {selected_favorite['name']} to recipe!")
                                st.rerun()
                
                # Display selected foods and adjust portions
                if st.session_state.recipe_foods:
                    st.write("#### Adjust Portions")
                    
                    # Create sliders for each food
                    for food in st.session_state.recipe_foods:
                        # Slider for portion
                        portion = st.slider(
                            f"{food['name']} (g)", 
                            min_value=10, 
                            max_value=500, 
                            value=st.session_state.recipe_portions[food['name']],
                            step=10,
                            key=f"recipe_portion_{food['name']}"
                        )
                        
                        # Update portion
                        st.session_state.recipe_portions[food['name']] = portion
                    
                    # Calculate total nutrition
                    total_macros = calculate_total_macros(st.session_state.recipe_foods, st.session_state.recipe_portions)
                    
                    # Display total nutrition
                    st.write("#### Recipe Nutrition")
                    
                    col1, col2, col3, col4, col5 = st.columns(5)
                    
                    with col1:
                        st.metric("Calories", f"{total_macros['calories']} kcal")
                    
                    with col2:
                        st.metric("Protein", f"{total_macros['protein']}g")
                    
                    with col3:
                        st.metric("Carbs", f"{total_macros['carbs']}g")
                    
                    with col4:
                        st.metric("Fat", f"{total_macros['fat']}g")
                    
                    with col5:
                        st.metric("Fiber", f"{total_macros['fiber']}g")
                    
                    # Recipe name
                    recipe_name = st.text_input("Recipe Name:", placeholder="E.g., High Protein Breakfast, Post-Workout Meal")
                    
                    # Meal type
                    meal_type = st.selectbox("Meal Type:", ["Breakfast", "Lunch", "Dinner", "Snack", "Any"])
                    
                    # Save recipe button
                    save_col, cancel_col = st.columns(2)
                    
                    with save_col:
                        if st.button("Save Recipe") and recipe_name:
                            fdc_api.add_recipe(recipe_name, st.session_state.recipe_foods, st.session_state.recipe_portions, meal_type)
                            st.success(f"Recipe '{recipe_name}' saved successfully!")
                            
                            # Clear recipe creation state
                            st.session_state.creating_new_recipe = False
                            st.session_state.recipe_foods = []
                            st.session_state.recipe_portions = {}
                            
                            st.rerun()
                    
                    with cancel_col:
                        if st.button("Cancel"):
                            # Clear recipe creation state
                            st.session_state.creating_new_recipe = False
                            st.session_state.recipe_foods = []
                            st.session_state.recipe_portions = {}
                            
                            st.rerun()

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")