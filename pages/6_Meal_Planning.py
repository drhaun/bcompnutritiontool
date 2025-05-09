import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import utils
import json
import os

# Set page config
st.set_page_config(
    page_title="Meal Planning Tool",
    page_icon="🍽️",
    layout="wide"
)

# Streamlit UI
st.title("🍽️ Meal & Grocery Planning")

# Initialize session state variables for this page if needed
if 'meal_plans' not in st.session_state:
    st.session_state.meal_plans = {}

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
                            training_sessions = json.loads(row['training_sessions'])
                        except:
                            training_sessions = []
                    
                    # Parse meals from JSON
                    meals = []
                    if 'meals' in row:
                        try:
                            meals = json.loads(row['meals'])
                        except:
                            meals = []
                    
                    # Parse snacks from JSON
                    snacks = []
                    if 'snacks' in row:
                        try:
                            snacks = json.loads(row['snacks'])
                        except:
                            snacks = []
                    
                    # Parse grocery list from JSON
                    grocery_list = []
                    if 'grocery_list' in row:
                        try:
                            grocery_list = json.loads(row['grocery_list'])
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

# Function to calculate nutrition distribution for meals and snacks
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

# Try to load meal plans
load_meal_plans()

# Create tabs for different sections
tab1, tab2, tab3, tab4 = st.tabs(["Weekly Overview", "Plan Your Day", "Food Selection", "Grocery List"])

# Common food database
food_categories = {
    "Protein Sources": [
        {"name": "Chicken Breast", "protein": 31, "carbs": 0, "fat": 3.6, "calories": 165, "fiber": 0, "unit": "100g", "category": "protein"},
        {"name": "Lean Ground Beef", "protein": 26, "carbs": 0, "fat": 15, "calories": 250, "fiber": 0, "unit": "100g", "category": "protein"},
        {"name": "Salmon", "protein": 25, "carbs": 0, "fat": 13, "calories": 208, "fiber": 0, "unit": "100g", "category": "protein"},
        {"name": "Egg Whites", "protein": 11, "carbs": 0.7, "fat": 0.2, "calories": 52, "fiber": 0, "unit": "100g", "category": "protein"},
        {"name": "Greek Yogurt", "protein": 10, "carbs": 3.6, "fat": 0.4, "calories": 59, "fiber": 0, "unit": "100g", "category": "protein"},
        {"name": "Tofu", "protein": 8, "carbs": 1.9, "fat": 4.8, "calories": 76, "fiber": 0.3, "unit": "100g", "category": "protein"},
        {"name": "Whey Protein", "protein": 80, "carbs": 10, "fat": 3.5, "calories": 400, "fiber": 0, "unit": "100g", "category": "protein"},
        {"name": "Tuna", "protein": 30, "carbs": 0, "fat": 1, "calories": 130, "fiber": 0, "unit": "100g", "category": "protein"},
    ],
    "Carbohydrate Sources": [
        {"name": "Brown Rice", "protein": 2.6, "carbs": 23, "fat": 0.9, "calories": 112, "fiber": 1.8, "unit": "100g", "category": "carb"},
        {"name": "Sweet Potato", "protein": 1.6, "carbs": 20, "fat": 0.1, "calories": 86, "fiber": 3, "unit": "100g", "category": "carb"},
        {"name": "Oatmeal", "protein": 13, "carbs": 68, "fat": 6.9, "calories": 389, "fiber": 10, "unit": "100g", "category": "carb"},
        {"name": "Quinoa", "protein": 4.4, "carbs": 21, "fat": 1.9, "calories": 120, "fiber": 2.8, "unit": "100g", "category": "carb"},
        {"name": "Whole Wheat Bread", "protein": 13, "carbs": 43, "fat": 3.3, "calories": 247, "fiber": 7, "unit": "100g", "category": "carb"},
        {"name": "White Rice", "protein": 2.7, "carbs": 28, "fat": 0.3, "calories": 130, "fiber": 0.4, "unit": "100g", "category": "carb"},
        {"name": "Banana", "protein": 1.1, "carbs": 23, "fat": 0.3, "calories": 89, "fiber": 2.6, "unit": "100g", "category": "carb"},
        {"name": "Apple", "protein": 0.3, "carbs": 14, "fat": 0.2, "calories": 52, "fiber": 2.4, "unit": "100g", "category": "carb"},
    ],
    "Fat Sources": [
        {"name": "Avocado", "protein": 2, "carbs": 8.5, "fat": 15, "calories": 160, "fiber": 6.7, "unit": "100g", "category": "fat"},
        {"name": "Olive Oil", "protein": 0, "carbs": 0, "fat": 14, "calories": 119, "fiber": 0, "unit": "tbsp", "category": "fat"},
        {"name": "Almonds", "protein": 21, "carbs": 22, "fat": 49, "calories": 579, "fiber": 12.5, "unit": "100g", "category": "fat"},
        {"name": "Peanut Butter", "protein": 25, "carbs": 20, "fat": 50, "calories": 588, "fiber": 6, "unit": "100g", "category": "fat"},
        {"name": "Coconut Oil", "protein": 0, "carbs": 0, "fat": 14, "calories": 121, "fiber": 0, "unit": "tbsp", "category": "fat"},
        {"name": "Flaxseed", "protein": 18, "carbs": 29, "fat": 42, "calories": 534, "fiber": 27, "unit": "100g", "category": "fat"},
        {"name": "Chia Seeds", "protein": 17, "carbs": 42, "fat": 31, "calories": 486, "fiber": 34, "unit": "100g", "category": "fat"},
    ],
    "Vegetables": [
        {"name": "Broccoli", "protein": 2.8, "carbs": 7, "fat": 0.4, "calories": 34, "fiber": 2.6, "unit": "100g", "category": "vegetable"},
        {"name": "Spinach", "protein": 2.9, "carbs": 3.6, "fat": 0.4, "calories": 23, "fiber": 2.2, "unit": "100g", "category": "vegetable"},
        {"name": "Bell Peppers", "protein": 1, "carbs": 6, "fat": 0.3, "calories": 31, "fiber": 2.1, "unit": "100g", "category": "vegetable"},
        {"name": "Cauliflower", "protein": 1.9, "carbs": 5, "fat": 0.3, "calories": 25, "fiber": 2, "unit": "100g", "category": "vegetable"},
        {"name": "Carrots", "protein": 0.9, "carbs": 10, "fat": 0.2, "calories": 41, "fiber": 2.8, "unit": "100g", "category": "vegetable"},
        {"name": "Zucchini", "protein": 1.2, "carbs": 3.1, "fat": 0.3, "calories": 17, "fiber": 1, "unit": "100g", "category": "vegetable"},
    ],
    "Fruits": [
        {"name": "Berries", "protein": 0.7, "carbs": 14, "fat": 0.3, "calories": 57, "fiber": 2.4, "unit": "100g", "category": "fruit"},
        {"name": "Orange", "protein": 0.9, "carbs": 12, "fat": 0.1, "calories": 47, "fiber": 2.4, "unit": "100g", "category": "fruit"},
        {"name": "Pineapple", "protein": 0.5, "carbs": 13, "fat": 0.1, "calories": 50, "fiber": 1.4, "unit": "100g", "category": "fruit"},
        {"name": "Mango", "protein": 0.8, "carbs": 15, "fat": 0.4, "calories": 60, "fiber": 1.6, "unit": "100g", "category": "fruit"},
        {"name": "Grapes", "protein": 0.6, "carbs": 18, "fat": 0.3, "calories": 69, "fiber": 0.9, "unit": "100g", "category": "fruit"},
    ]
}

# Create a flat list of foods with their details
all_foods = []
for category, foods in food_categories.items():
    all_foods.extend(foods)

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
    protein_foods = [f for f in selected_foods if f['category'] == 'protein']
    carb_foods = [f for f in selected_foods if f['category'] == 'carb']
    fat_foods = [f for f in selected_foods if f['category'] == 'fat']
    other_foods = [f for f in selected_foods if f['category'] not in ['protein', 'carb', 'fat']]
    
    # Function to calculate total macros for a list of foods with given portions
    def calculate_macros(foods, portions):
        total_p = sum(food['protein'] * portions.get(food['name'], 0) / 100 for food in foods)
        total_c = sum(food['carbs'] * portions.get(food['name'], 0) / 100 for food in foods)
        total_f = sum(food['fat'] * portions.get(food['name'], 0) / 100 for food in foods)
        return total_p, total_c, total_f
    
    # Calculate portions based on the primary macronutrient in each food category
    # This is a simplified approach that will prioritize meeting the primary macro targets
    
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
    
    # Handle other foods (vegetables, fruits) - distribute evenly
    if other_foods:
        for food in other_foods:
            # Default portion for vegetables and fruits (100g)
            portion = 100
            # Apply user adjustment
            portion *= serving_adjustments.get(food['name'], 1.0)
            portions[food['name']] = round(portion)
    
    return portions

# Function to calculate total macros from foods and portions
def calculate_total_macros(foods, portions):
    """Calculate total macros from a list of foods and their portions"""
    total_cals = sum(food['calories'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_protein = sum(food['protein'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_carbs = sum(food['carbs'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_fat = sum(food['fat'] * portions.get(food['name'], 0) / 100 for food in foods)
    total_fiber = sum(food['fiber'] * portions.get(food['name'], 0) / 100 for food in foods)
    
    return {
        'calories': round(total_cals),
        'protein': round(total_protein),
        'carbs': round(total_carbs),
        'fat': round(total_fat),
        'fiber': round(total_fiber)
    }

# Weekly overview tab
with tab1:
    st.header("Weekly Meal Plan Overview")
    
    # Create a weekly overview in a tabular format
    if st.session_state.meal_plans:
        # Create tabs for each view
        overview_type = st.radio("View", ["Summary", "Detailed"], horizontal=True)
        
        if overview_type == "Summary":
            # Create a table with basic info for each day
            weekly_summary = []
            
            for day in days_of_week:
                if day in st.session_state.meal_plans:
                    plan = st.session_state.meal_plans[day]
                    
                    # Check for training sessions for display
                    training_status = "Rest Day"
                    if 'training_sessions' in plan and plan['training_sessions'] and plan['training_sessions'][0] != "No Training":
                        if len(plan['training_sessions']) == 1:
                            training_status = f"Training: {plan['training_sessions'][0]}"
                        else:
                            training_session_times = [s for s in plan['training_sessions'] if s != "No Training"]
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
            st.dataframe(weekly_df, use_container_width=True)
            
            # Add button to copy a day's plan to other days
            st.subheader("Copy Plan Between Days")
            
            col1, col2 = st.columns(2)
            
            with col1:
                copy_from_day = st.selectbox("Copy from day", days_of_week, 
                                            index=[i for i, day in enumerate(days_of_week) if day in st.session_state.meal_plans][0] 
                                            if any(day in st.session_state.meal_plans for day in days_of_week) else 0)
            
            if copy_from_day in st.session_state.meal_plans:
                with col2:
                    copy_to_days = st.multiselect("Copy to days", 
                                                [day for day in days_of_week if day != copy_from_day],
                                                default=[])
                
                if st.button("Copy Plan") and copy_to_days:
                    # Get the plan to copy
                    plan_to_copy = st.session_state.meal_plans[copy_from_day]
                    
                    # Copy the plan to selected days
                    for day in copy_to_days:
                        st.session_state.meal_plans[day] = plan_to_copy.copy()
                    
                    # Save to file
                    save_meal_plans()
                    
                    st.success(f"Plan copied from {copy_from_day} to {', '.join(copy_to_days)}")
                    st.rerun()
            else:
                st.info(f"No meal plan exists for {copy_from_day} yet.")
            
            # Calculate weekly totals and averages
            planned_days_df = weekly_df[weekly_df["Day Type"] != "Not Planned"]
            
            if not planned_days_df.empty:
                st.subheader("Weekly Summary")
                
                weekly_calories = planned_days_df["Calories"].sum()
                weekly_protein = planned_days_df["Protein (g)"].sum()
                weekly_carbs = planned_days_df["Carbs (g)"].sum()
                weekly_fat = planned_days_df["Fat (g)"].sum()
                
                avg_calories = planned_days_df["Calories"].mean()
                avg_protein = planned_days_df["Protein (g)"].mean()
                avg_carbs = planned_days_df["Carbs (g)"].mean()
                avg_fat = planned_days_df["Fat (g)"].mean()
                
                # Display weekly summary
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write("**Weekly Totals**")
                    st.write(f"Total Calories: {weekly_calories:,.0f} kcal")
                    st.write(f"Total Protein: {weekly_protein:,.0f} g")
                    st.write(f"Total Carbs: {weekly_carbs:,.0f} g")
                    st.write(f"Total Fat: {weekly_fat:,.0f} g")
                
                with col2:
                    st.write("**Daily Averages**")
                    st.write(f"Average Calories: {avg_calories:.1f} kcal")
                    st.write(f"Average Protein: {avg_protein:.1f} g")
                    st.write(f"Average Carbs: {avg_carbs:.1f} g")
                    st.write(f"Average Fat: {avg_fat:.1f} g")
                
                # Create weekly macro distribution chart
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
        
        else:  # Detailed view
            # Create a tab for each day of the week
            day_tabs = st.tabs(days_of_week)
            
            for i, day in enumerate(days_of_week):
                with day_tabs[i]:
                    if day in st.session_state.meal_plans:
                        plan = st.session_state.meal_plans[day]
                        
                        col1, col2 = st.columns([3, 1])
                        
                        with col1:
                            st.subheader(f"{day} - {plan['day_type']}")
                            
                            # Display training info
                            if 'training_sessions' in plan and plan['training_sessions'] and plan['training_sessions'][0] != "No Training":
                                st.write("**Training Sessions:**")
                                for session in plan['training_sessions']:
                                    if session != "No Training":
                                        st.write(f"- {session}")
                            else:
                                st.write("**Rest Day - No Training**")
                            
                            # Display meal info
                            if 'meals' in plan and plan['meals']:
                                st.write("**Meals:**")
                                
                                for meal in plan['meals']:
                                    st.markdown(f"*{meal['name']}* - {meal.get('time', 'Time not specified')}")
                                    st.write(f"Calories: {meal['calories']} | Protein: {meal['protein']}g | Carbs: {meal['carbs']}g | Fat: {meal['fat']}g")
                                    
                                    # Display foods if any
                                    if 'foods' in meal and meal['foods']:
                                        food_list = []
                                        for food in meal['foods']:
                                            food_list.append(f"{food['name']}: {food['amount']} {food['unit']}")
                                        
                                        st.markdown("• " + " • ".join(food_list))
                            
                            # Display snack info
                            if 'snacks' in plan and plan['snacks'] and len(plan['snacks']) > 0:
                                st.write("**Snacks:**")
                                
                                for snack in plan['snacks']:
                                    st.markdown(f"*{snack['name']}*")
                                    st.write(f"Calories: {snack['calories']} | Protein: {snack['protein']}g | Carbs: {snack['carbs']}g | Fat: {snack['fat']}g")
                                    
                                    # Display foods if any
                                    if 'foods' in snack and snack['foods']:
                                        food_list = []
                                        for food in snack['foods']:
                                            food_list.append(f"{food['name']}: {food['amount']} {food['unit']}")
                                        
                                        st.markdown("• " + " • ".join(food_list))
                        
                        with col2:
                            st.write("**Daily Targets**")
                            st.write(f"Calories: {plan['nutrition']['calories']}")
                            st.write(f"Protein: {plan['nutrition']['protein']}g")
                            st.write(f"Carbs: {plan['nutrition']['carbs']}g")
                            st.write(f"Fat: {plan['nutrition']['fat']}g")
                            st.write(f"Fiber: {plan['nutrition']['fiber']}g")
                            
                            # Calculate macronutrient percentages
                            protein_cals = plan['nutrition']['protein'] * 4
                            carb_cals = plan['nutrition']['carbs'] * 4
                            fat_cals = plan['nutrition']['fat'] * 9
                            total_cals = protein_cals + carb_cals + fat_cals
                            
                            if total_cals > 0:
                                protein_pct = (protein_cals / total_cals) * 100
                                carb_pct = (carb_cals / total_cals) * 100
                                fat_pct = (fat_cals / total_cals) * 100
                                
                                # Create a small pie chart for macros
                                fig, ax = plt.subplots(figsize=(4, 4))
                                ax.pie([protein_pct, carb_pct, fat_pct], 
                                      labels=['P', 'C', 'F'],
                                      colors=['#ff9999', '#99ff99', '#9999ff'],
                                      autopct='%1.1f%%',
                                      startangle=90)
                                ax.axis('equal')
                                st.pyplot(fig)
                    else:
                        st.info(f"No meal plan has been created for {day} yet.")
                        if st.button(f"Create plan for {day}", key=f"create_{day}"):
                            # Switch to the Plan Your Day tab with this day selected
                            st.session_state.selected_day = day
                            st.rerun()
    else:
        st.info("No meal plans have been created yet. Use the 'Plan Your Day' tab to create your first meal plan.")

# Plan for individual day
with tab2:
    st.header("Daily Meal Planning")
    
    # Create two columns for form inputs
    col1, col2 = st.columns(2)
    
    with col1:
        # Day of the week selection
        day_of_week = st.selectbox("Day of the Week", days_of_week, 
                                   key="daily_day_selection",
                                   index=days_of_week.index(st.session_state.get("selected_day", days_of_week[0])))
        
        # Day type selection
        day_type = st.selectbox("Day Type", day_types,
                               index=0 if day_of_week not in st.session_state.meal_plans 
                               else day_types.index(st.session_state.meal_plans[day_of_week]['day_type']))
        
        # Training time ranges (up to 3)
        if day_type != 'Rest Day':
            st.subheader("Training Sessions")
            training_options = ["No Training"] + time_slots
            
            training_session1 = st.selectbox("Training Session 1", 
                                            training_options,
                                            index=0 if day_of_week not in st.session_state.meal_plans 
                                            else training_options.index(st.session_state.meal_plans[day_of_week].get('training_sessions', ["No Training"])[0]) 
                                            if st.session_state.meal_plans.get(day_of_week, {}).get('training_sessions', ["No Training"])[0] in training_options else 0)
            
            show_session2 = st.checkbox("Add second training session", 
                                        value=day_of_week in st.session_state.meal_plans and 
                                        len(st.session_state.meal_plans[day_of_week].get('training_sessions', [])) > 1 and
                                        st.session_state.meal_plans[day_of_week]['training_sessions'][1] != "No Training")
            
            if show_session2:
                training_session2 = st.selectbox("Training Session 2", 
                                                training_options,
                                                index=0 if day_of_week not in st.session_state.meal_plans or len(st.session_state.meal_plans[day_of_week].get('training_sessions', [])) < 2
                                                else training_options.index(st.session_state.meal_plans[day_of_week]['training_sessions'][1])
                                                if st.session_state.meal_plans.get(day_of_week, {}).get('training_sessions', ["No Training", "No Training"])[1] in training_options else 0)
            else:
                training_session2 = "No Training"
            
            show_session3 = st.checkbox("Add third training session", 
                                        value=day_of_week in st.session_state.meal_plans and 
                                        len(st.session_state.meal_plans[day_of_week].get('training_sessions', [])) > 2 and
                                        st.session_state.meal_plans[day_of_week]['training_sessions'][2] != "No Training")
            
            if show_session3 and show_session2:
                training_session3 = st.selectbox("Training Session 3", 
                                                training_options,
                                                index=0 if day_of_week not in st.session_state.meal_plans or len(st.session_state.meal_plans[day_of_week].get('training_sessions', [])) < 3
                                                else training_options.index(st.session_state.meal_plans[day_of_week]['training_sessions'][2])
                                                if st.session_state.meal_plans.get(day_of_week, {}).get('training_sessions', ["No Training", "No Training", "No Training"])[2] in training_options else 0)
            else:
                training_session3 = "No Training"
            
            # Compile training sessions
            training_sessions = [session for session in [training_session1, training_session2, training_session3] 
                               if session != "No Training"]
            
            if not training_sessions:
                training_sessions = ["No Training"]
        else:
            training_sessions = ["No Training"]
        
        # Number of preferred meals and snacks
        st.subheader("Meal Structure")
        num_meals = st.slider("Number of Main Meals", 
                              min_value=2, 
                              max_value=6, 
                              value=st.session_state.meal_plans.get(day_of_week, {}).get('num_meals', 3),
                              step=1)
        
        num_snacks = st.slider("Number of Snacks", 
                              min_value=0, 
                              max_value=4, 
                              value=st.session_state.meal_plans.get(day_of_week, {}).get('num_snacks', 2),
                              step=1)
        
        # Meal times - based on number of meals
        st.subheader("Approximate Meal Times")
        meal_times = []
        for i in range(num_meals):
            default_idx = 0
            if i == 0:
                default_idx = 2  # Default breakfast at 7-8am
            elif i == 1:
                default_idx = 6  # Default lunch at 12-1pm
            elif i == 2:
                default_idx = 13  # Default dinner at 6-7pm
            
            meal_times.append(st.selectbox(f"Meal {i+1} Time", time_slots, index=default_idx, key=f"meal_time_{day_of_week}_{i}"))
    
    with col2:
        st.subheader("Nutrition Targets")
        # Get default nutrition values based on the nutrition plan
        default_values = get_default_nutrition_values()
        
        # Adjust based on day type
        if day_type == 'Rest Day':
            calorie_adjustment = -200  # Decrease calories on rest days
            carb_adjustment = -30  # Lower carbs on rest days
        elif day_type == 'Training Day - Light':
            calorie_adjustment = 0
            carb_adjustment = 0
        elif day_type == 'Training Day - Moderate':
            calorie_adjustment = 200  # Increase calories on training days
            carb_adjustment = 20
        elif day_type == 'Training Day - Intense':
            calorie_adjustment = 400  # Further increase for intense training
            carb_adjustment = 50
        else:
            calorie_adjustment = 0
            carb_adjustment = 0
        
        # If we already have a plan for this day, use those values instead
        if day_of_week in st.session_state.meal_plans:
            existing_plan = st.session_state.meal_plans[day_of_week]
            default_calories = existing_plan['nutrition']['calories']
            default_protein = existing_plan['nutrition']['protein']
            default_carbs = existing_plan['nutrition']['carbs']
            default_fat = existing_plan['nutrition']['fat']
            default_fiber = existing_plan['nutrition']['fiber']
        else:
            default_calories = int(default_values['calories'] + calorie_adjustment)
            default_protein = int(default_values['protein'])
            default_carbs = int(default_values['carbs'] + carb_adjustment)
            default_fat = int(default_values['fat'])
            default_fiber = default_values['fiber']
        
        # Pre-fill nutrition targets based on nutritional plan
        target_calories = st.number_input(
            "Daily Calorie Target", 
            min_value=1000, 
            max_value=5000, 
            value=default_calories
        )
        
        target_protein = st.number_input(
            "Protein Target (g)", 
            min_value=50, 
            max_value=400, 
            value=default_protein
        )
        
        target_carbs = st.number_input(
            "Carbohydrate Target (g)", 
            min_value=50, 
            max_value=600, 
            value=default_carbs
        )
        
        target_fat = st.number_input(
            "Fat Target (g)", 
            min_value=20, 
            max_value=200, 
            value=default_fat
        )
        
        target_fiber = st.number_input(
            "Fiber Target (g)", 
            min_value=10, 
            max_value=50, 
            value=default_fiber
        )
        
        # Show macronutrient breakdown
        st.subheader("Macronutrient Breakdown")
        
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
            
            # Display specific values
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Protein", f"{protein_pct:.1f}%", f"{target_protein}g")
            with col2:
                st.metric("Carbs", f"{carb_pct:.1f}%", f"{target_carbs}g")
            with col3:
                st.metric("Fat", f"{fat_pct:.1f}%", f"{target_fat}g")
            
            # Check if macros add up to target calories
            if abs(total_calories_from_macros - target_calories) > 50:
                st.warning(f"Calories from macros ({total_calories_from_macros:.0f}) don't match target calories ({target_calories}). Consider adjusting your macronutrient targets.")
    
    # Button to save meal plan for selected day
    if st.button("Generate Meal Plan"):
        nutrition = {
            'calories': target_calories,
            'protein': target_protein,
            'carbs': target_carbs,
            'fat': target_fat,
            'fiber': target_fiber
        }
        
        # Calculate meal and snack distribution
        meals, snacks = calculate_meal_distribution(nutrition, num_meals, num_snacks, training_sessions, meal_times)
        
        # Create a structured object for the meal plan
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
        
        # Save the meal plan to the session state
        st.session_state.meal_plans[day_of_week] = meal_plan
        
        # Save to file
        save_meal_plans()
        
        st.success(f"Meal plan for {day_of_week} has been generated!")
        st.rerun()
    
    # Display meal and snack details if a plan exists for the selected day
    if day_of_week in st.session_state.meal_plans:
        plan = st.session_state.meal_plans[day_of_week]
        
        st.header(f"Meal Plan for {day_of_week}")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.subheader("Meals")
            
            if 'meals' in plan and plan['meals']:
                for i, meal in enumerate(plan['meals']):
                    with st.expander(f"{meal['name']} - {meal.get('time', 'Time not specified')}"):
                        # Display the nutritional targets
                        col_a, col_b, col_c, col_d = st.columns(4)
                        with col_a:
                            st.write(f"Calories: {meal['calories']}")
                        with col_b:
                            st.write(f"Protein: {meal['protein']}g")
                        with col_c:
                            st.write(f"Carbs: {meal['carbs']}g")
                        with col_d:
                            st.write(f"Fat: {meal['fat']}g")
                        
                        # Display foods (if any) and allow food selection
                        if 'foods' in meal and meal['foods']:
                            st.write("Foods in this meal:")
                            
                            # Create a detailed table of the foods
                            meal_foods = []
                            food_details = []
                            
                            for food_item in meal['foods']:
                                food_name = food_item['name']
                                amount = food_item['amount']
                                
                                # Find the food in our database
                                food_info = next((f for f in all_foods if f['name'] == food_name), None)
                                
                                if food_info:
                                    # Calculate macros based on the amount
                                    cals = food_info['calories'] * amount / 100
                                    protein = food_info['protein'] * amount / 100
                                    carbs = food_info['carbs'] * amount / 100
                                    fat = food_info['fat'] * amount / 100
                                    
                                    food_details.append({
                                        'Food': food_name,
                                        'Amount': f"{amount}g",
                                        'Calories': f"{cals:.0f}",
                                        'Protein': f"{protein:.1f}g",
                                        'Carbs': f"{carbs:.1f}g",
                                        'Fat': f"{fat:.1f}g"
                                    })
                            
                            # Display the foods in a table
                            if food_details:
                                st.dataframe(pd.DataFrame(food_details), use_container_width=True)
                            
                            # Allow editing of the food list
                            if st.button(f"Edit Foods for {meal['name']}", key=f"edit_foods_{day_of_week}_{i}"):
                                # Set state to edit this specific meal
                                st.session_state.editing_meal = (day_of_week, i)
                                st.rerun()
                        else:
                            # Allow adding foods to this meal
                            if st.button(f"Add Foods to {meal['name']}", key=f"add_foods_{day_of_week}_{i}"):
                                # Set state to edit this specific meal
                                st.session_state.editing_meal = (day_of_week, i)
                                st.rerun()
            else:
                st.info("No meals have been planned yet. Click 'Generate Meal Plan' to distribute your nutrition targets.")
            
            if 'snacks' in plan and plan['snacks'] and len(plan['snacks']) > 0:
                st.subheader("Snacks")
                
                for i, snack in enumerate(plan['snacks']):
                    with st.expander(f"{snack['name']}"):
                        # Display the nutritional targets
                        col_a, col_b, col_c, col_d = st.columns(4)
                        with col_a:
                            st.write(f"Calories: {snack['calories']}")
                        with col_b:
                            st.write(f"Protein: {snack['protein']}g")
                        with col_c:
                            st.write(f"Carbs: {snack['carbs']}g")
                        with col_d:
                            st.write(f"Fat: {snack['fat']}g")
                        
                        # Display foods (if any)
                        if 'foods' in snack and snack['foods']:
                            st.write("Foods in this snack:")
                            
                            # Create a detailed table of the foods
                            snack_foods = []
                            food_details = []
                            
                            for food_item in snack['foods']:
                                food_name = food_item['name']
                                amount = food_item['amount']
                                
                                # Find the food in our database
                                food_info = next((f for f in all_foods if f['name'] == food_name), None)
                                
                                if food_info:
                                    # Calculate macros based on the amount
                                    cals = food_info['calories'] * amount / 100
                                    protein = food_info['protein'] * amount / 100
                                    carbs = food_info['carbs'] * amount / 100
                                    fat = food_info['fat'] * amount / 100
                                    
                                    food_details.append({
                                        'Food': food_name,
                                        'Amount': f"{amount}g",
                                        'Calories': f"{cals:.0f}",
                                        'Protein': f"{protein:.1f}g",
                                        'Carbs': f"{carbs:.1f}g",
                                        'Fat': f"{fat:.1f}g"
                                    })
                            
                            # Display the foods in a table
                            if food_details:
                                st.dataframe(pd.DataFrame(food_details), use_container_width=True)
                            
                            # Allow editing of the food list
                            if st.button(f"Edit Foods for {snack['name']}", key=f"edit_snack_{day_of_week}_{i}"):
                                # Set state to edit this specific snack
                                st.session_state.editing_snack = (day_of_week, i)
                                st.rerun()
                        else:
                            # Allow adding foods to this snack
                            if st.button(f"Add Foods to {snack['name']}", key=f"add_snack_foods_{day_of_week}_{i}"):
                                # Set state to edit this specific snack
                                st.session_state.editing_snack = (day_of_week, i)
                                st.rerun()
        
        with col2:
            st.subheader("Training Schedule")
            if 'training_sessions' in plan and plan['training_sessions'] and plan['training_sessions'][0] != "No Training":
                for i, session in enumerate(plan['training_sessions']):
                    if session != "No Training":
                        st.write(f"Session {i+1}: {session}")
            else:
                st.write("Rest Day - No Training")
            
            st.subheader("Daily Nutritional Targets")
            st.write(f"Calories: {plan['nutrition']['calories']}")
            st.write(f"Protein: {plan['nutrition']['protein']}g")
            st.write(f"Carbs: {plan['nutrition']['carbs']}g")
            st.write(f"Fat: {plan['nutrition']['fat']}g")
            st.write(f"Fiber: {plan['nutrition']['fiber']}g")

# Food Selection tab - for editing meal contents
with tab3:
    st.header("Food Selection")
    
    # Check if we're editing a meal
    editing_meal = st.session_state.get('editing_meal', None)
    editing_snack = st.session_state.get('editing_snack', None)
    
    if editing_meal:
        day, meal_idx = editing_meal
        
        if day in st.session_state.meal_plans and 'meals' in st.session_state.meal_plans[day]:
            meals = st.session_state.meal_plans[day]['meals']
            
            if meal_idx < len(meals):
                meal = meals[meal_idx]
                
                st.subheader(f"Select Foods for {meal['name']} on {day}")
                st.write(f"Target: {meal['calories']} calories, {meal['protein']}g protein, {meal['carbs']}g carbs, {meal['fat']}g fat")
                
                # Food selection interface
                st.write("Select foods to include in this meal:")
                
                # Create tabs for food categories
                food_tabs = st.tabs(list(food_categories.keys()))
                
                # Track selected foods across all categories
                if 'selected_foods' not in st.session_state:
                    # Initialize with any existing foods in the meal
                    existing_food_names = [f['name'] for f in meal.get('foods', [])]
                    st.session_state.selected_foods = existing_food_names
                
                selected_foods_from_all_tabs = []
                
                # For storing user adjustments to serving sizes
                if 'serving_adjustments' not in st.session_state:
                    # Initialize with default values (1.0)
                    st.session_state.serving_adjustments = {}
                
                for i, (category, foods) in enumerate(food_categories.items()):
                    with food_tabs[i]:
                        st.subheader(f"{category}")
                        
                        # Display foods in this category with checkboxes
                        for j, food in enumerate(foods):
                            col1, col2 = st.columns([3, 1])
                            
                            with col1:
                                food_selected = st.checkbox(
                                    f"{food['name']} - {food['calories']} cal, P: {food['protein']}g, C: {food['carbs']}g, F: {food['fat']}g per {food['unit']}",
                                    value=food['name'] in st.session_state.selected_foods,
                                    key=f"food_{category}_{j}"
                                )
                                
                                if food_selected:
                                    selected_foods_from_all_tabs.append(food['name'])
                                    
                                    # If this food is newly selected, initialize its adjustment
                                    if food['name'] not in st.session_state.serving_adjustments:
                                        st.session_state.serving_adjustments[food['name']] = 1.0
                            
                            # If the food is selected, show a slider for adjusting the serving size
                            if food_selected:
                                with col2:
                                    serving_adj = st.slider(
                                        "Adjust",
                                        min_value=0.25,
                                        max_value=3.0,
                                        value=st.session_state.serving_adjustments.get(food['name'], 1.0),
                                        step=0.25,
                                        key=f"adj_{food['name']}",
                                        format="%.2fx"
                                    )
                                    
                                    # Update the serving adjustment
                                    st.session_state.serving_adjustments[food['name']] = serving_adj
                
                # Update the selected foods state
                st.session_state.selected_foods = selected_foods_from_all_tabs
                
                # Get the actual food objects for selected foods
                selected_food_objects = [f for f in all_foods if f['name'] in selected_foods_from_all_tabs]
                
                # Calculate portions
                if selected_food_objects:
                    # Calculate optimal portions
                    portions = calculate_portion_sizes(meal, selected_food_objects, st.session_state.serving_adjustments)
                    
                    # Convert to list of food objects with amounts
                    portioned_foods = []
                    for food_name, amount in portions.items():
                        food_obj = next((f for f in all_foods if f['name'] == food_name), None)
                        if food_obj:
                            portioned_foods.append({
                                'name': food_name,
                                'amount': amount,
                                'unit': food_obj['unit'],
                                'protein': food_obj['protein'] * amount / 100,
                                'carbs': food_obj['carbs'] * amount / 100,
                                'fat': food_obj['fat'] * amount / 100,
                                'calories': food_obj['calories'] * amount / 100,
                                'fiber': food_obj['fiber'] * amount / 100
                            })
                    
                    # Display the portioned foods and their macros
                    st.subheader("Food Distribution")
                    
                    # Create a dataframe with the portion information
                    portion_data = []
                    
                    for food in portioned_foods:
                        portion_data.append({
                            'Food': food['name'],
                            'Amount': f"{food['amount']}g",
                            'Calories': f"{food['calories']:.0f}",
                            'Protein': f"{food['protein']:.1f}g",
                            'Carbs': f"{food['carbs']:.1f}g",
                            'Fat': f"{food['fat']:.1f}g"
                        })
                    
                    st.dataframe(pd.DataFrame(portion_data), use_container_width=True)
                    
                    # Calculate total macros from the portions
                    total_macros = calculate_total_macros(selected_food_objects, portions)
                    
                    # Display the total macros vs. targets
                    st.subheader("Actual vs. Target Macros")
                    
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Calories", f"{total_macros['calories']}", f"{total_macros['calories'] - meal['calories']}")
                    
                    with col2:
                        st.metric("Protein", f"{total_macros['protein']}g", f"{total_macros['protein'] - meal['protein']}g")
                    
                    with col3:
                        st.metric("Carbs", f"{total_macros['carbs']}g", f"{total_macros['carbs'] - meal['carbs']}g")
                    
                    with col4:
                        st.metric("Fat", f"{total_macros['fat']}g", f"{total_macros['fat'] - meal['fat']}g")
                    
                    # Button to save the food selection
                    if st.button("Save Food Selection"):
                        # Convert portions to the format needed for the meal
                        meal_foods = []
                        for food_name, amount in portions.items():
                            food_obj = next((f for f in all_foods if f['name'] == food_name), None)
                            if food_obj:
                                meal_foods.append({
                                    'name': food_name,
                                    'amount': amount,
                                    'unit': 'g',
                                })
                        
                        # Update the meal with the selected foods
                        st.session_state.meal_plans[day]['meals'][meal_idx]['foods'] = meal_foods
                        
                        # Save to file
                        save_meal_plans()
                        
                        # Reset the editing state
                        st.session_state.editing_meal = None
                        st.session_state.selected_foods = []
                        st.session_state.serving_adjustments = {}
                        
                        st.success("Food selection saved!")
                        st.rerun()
                else:
                    st.info("Select foods from the categories above to include in this meal.")
                
                # Button to cancel editing
                if st.button("Cancel"):
                    # Reset the editing state
                    st.session_state.editing_meal = None
                    st.session_state.selected_foods = []
                    st.session_state.serving_adjustments = {}
                    st.rerun()
    
    elif editing_snack:
        day, snack_idx = editing_snack
        
        if day in st.session_state.meal_plans and 'snacks' in st.session_state.meal_plans[day]:
            snacks = st.session_state.meal_plans[day]['snacks']
            
            if snack_idx < len(snacks):
                snack = snacks[snack_idx]
                
                st.subheader(f"Select Foods for {snack['name']} on {day}")
                st.write(f"Target: {snack['calories']} calories, {snack['protein']}g protein, {snack['carbs']}g carbs, {snack['fat']}g fat")
                
                # Similar food selection interface as for meals
                st.write("Select foods to include in this snack:")
                
                # Create tabs for food categories
                food_tabs = st.tabs(list(food_categories.keys()))
                
                # Track selected foods across all categories
                if 'selected_foods' not in st.session_state:
                    # Initialize with any existing foods in the snack
                    existing_food_names = [f['name'] for f in snack.get('foods', [])]
                    st.session_state.selected_foods = existing_food_names
                
                selected_foods_from_all_tabs = []
                
                # For storing user adjustments to serving sizes
                if 'serving_adjustments' not in st.session_state:
                    # Initialize with default values (1.0)
                    st.session_state.serving_adjustments = {}
                
                for i, (category, foods) in enumerate(food_categories.items()):
                    with food_tabs[i]:
                        st.subheader(f"{category}")
                        
                        # Display foods in this category with checkboxes
                        for j, food in enumerate(foods):
                            col1, col2 = st.columns([3, 1])
                            
                            with col1:
                                food_selected = st.checkbox(
                                    f"{food['name']} - {food['calories']} cal, P: {food['protein']}g, C: {food['carbs']}g, F: {food['fat']}g per {food['unit']}",
                                    value=food['name'] in st.session_state.selected_foods,
                                    key=f"snack_food_{category}_{j}"
                                )
                                
                                if food_selected:
                                    selected_foods_from_all_tabs.append(food['name'])
                                    
                                    # If this food is newly selected, initialize its adjustment
                                    if food['name'] not in st.session_state.serving_adjustments:
                                        st.session_state.serving_adjustments[food['name']] = 1.0
                            
                            # If the food is selected, show a slider for adjusting the serving size
                            if food_selected:
                                with col2:
                                    serving_adj = st.slider(
                                        "Adjust",
                                        min_value=0.25,
                                        max_value=3.0,
                                        value=st.session_state.serving_adjustments.get(food['name'], 1.0),
                                        step=0.25,
                                        key=f"snack_adj_{food['name']}",
                                        format="%.2fx"
                                    )
                                    
                                    # Update the serving adjustment
                                    st.session_state.serving_adjustments[food['name']] = serving_adj
                
                # Update the selected foods state
                st.session_state.selected_foods = selected_foods_from_all_tabs
                
                # Get the actual food objects for selected foods
                selected_food_objects = [f for f in all_foods if f['name'] in selected_foods_from_all_tabs]
                
                # Calculate portions
                if selected_food_objects:
                    # Calculate optimal portions
                    portions = calculate_portion_sizes(snack, selected_food_objects, st.session_state.serving_adjustments)
                    
                    # Convert to list of food objects with amounts
                    portioned_foods = []
                    for food_name, amount in portions.items():
                        food_obj = next((f for f in all_foods if f['name'] == food_name), None)
                        if food_obj:
                            portioned_foods.append({
                                'name': food_name,
                                'amount': amount,
                                'unit': food_obj['unit'],
                                'protein': food_obj['protein'] * amount / 100,
                                'carbs': food_obj['carbs'] * amount / 100,
                                'fat': food_obj['fat'] * amount / 100,
                                'calories': food_obj['calories'] * amount / 100
                            })
                    
                    # Display the portioned foods and their macros
                    st.subheader("Food Distribution")
                    
                    # Create a dataframe with the portion information
                    portion_data = []
                    
                    for food in portioned_foods:
                        portion_data.append({
                            'Food': food['name'],
                            'Amount': f"{food['amount']}g",
                            'Calories': f"{food['calories']:.0f}",
                            'Protein': f"{food['protein']:.1f}g",
                            'Carbs': f"{food['carbs']:.1f}g",
                            'Fat': f"{food['fat']:.1f}g"
                        })
                    
                    st.dataframe(pd.DataFrame(portion_data), use_container_width=True)
                    
                    # Calculate total macros from the portions
                    total_macros = calculate_total_macros(selected_food_objects, portions)
                    
                    # Display the total macros vs. targets
                    st.subheader("Actual vs. Target Macros")
                    
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Calories", f"{total_macros['calories']}", f"{total_macros['calories'] - snack['calories']}")
                    
                    with col2:
                        st.metric("Protein", f"{total_macros['protein']}g", f"{total_macros['protein'] - snack['protein']}g")
                    
                    with col3:
                        st.metric("Carbs", f"{total_macros['carbs']}g", f"{total_macros['carbs'] - snack['carbs']}g")
                    
                    with col4:
                        st.metric("Fat", f"{total_macros['fat']}g", f"{total_macros['fat'] - snack['fat']}g")
                    
                    # Button to save the food selection
                    if st.button("Save Food Selection"):
                        # Convert portions to the format needed for the snack
                        snack_foods = []
                        for food_name, amount in portions.items():
                            food_obj = next((f for f in all_foods if f['name'] == food_name), None)
                            if food_obj:
                                snack_foods.append({
                                    'name': food_name,
                                    'amount': amount,
                                    'unit': 'g',
                                })
                        
                        # Update the snack with the selected foods
                        st.session_state.meal_plans[day]['snacks'][snack_idx]['foods'] = snack_foods
                        
                        # Save to file
                        save_meal_plans()
                        
                        # Reset the editing state
                        st.session_state.editing_snack = None
                        st.session_state.selected_foods = []
                        st.session_state.serving_adjustments = {}
                        
                        st.success("Food selection saved!")
                        st.rerun()
                else:
                    st.info("Select foods from the categories above to include in this snack.")
                
                # Button to cancel editing
                if st.button("Cancel"):
                    # Reset the editing state
                    st.session_state.editing_snack = None
                    st.session_state.selected_foods = []
                    st.session_state.serving_adjustments = {}
                    st.rerun()
    
    else:
        st.info("Select 'Add Foods' or 'Edit Foods' for a meal or snack in the 'Plan Your Day' tab to add or modify foods.")
        
        # Display the food database
        st.subheader("Food Database")
        st.write("Browse available foods by category:")
        
        # Create tabs for food categories
        food_tabs = st.tabs(list(food_categories.keys()))
        
        for i, (category, foods) in enumerate(food_categories.items()):
            with food_tabs[i]:
                # Create a dataframe for easier viewing
                food_df = pd.DataFrame(foods)[['name', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'unit']]
                food_df.columns = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)', 'Unit']
                
                st.dataframe(food_df, use_container_width=True)

# Grocery list tab
with tab4:
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
                food_info = next((f for f in all_foods if f['name'] == food_name), None)
                
                if food_info:
                    category = next((cat for cat, foods in food_categories.items() 
                                   if any(f['name'] == food_name for f in foods)), "Other")
                    
                    if category not in categorized_foods:
                        categorized_foods[category] = []
                    
                    categorized_foods[category].append({
                        'name': food_name,
                        'amount': amount,
                        'unit': food_info.get('unit', 'g')
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
            
            # Option to export grocery list (placeholder)
            st.write("---")
            if st.button("Export Grocery List"):
                st.success("Export feature coming soon!")
        else:
            st.info("No foods have been added to any meals yet. Go to Food Selection to add foods to your meals.")
    else:
        st.info("No meal plans have been created yet. Use the 'Plan Your Day' tab to create your first meal plan.")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")

with tab2:
    st.header("Meal Library & Food Selection")
    
    # Define common food categories and example foods
    food_categories = {
        "Protein Sources": [
            {"name": "Chicken Breast", "protein": 31, "carbs": 0, "fat": 3.6, "calories": 165, "unit": "100g"},
            {"name": "Lean Ground Beef", "protein": 26, "carbs": 0, "fat": 15, "calories": 250, "unit": "100g"},
            {"name": "Salmon", "protein": 25, "carbs": 0, "fat": 13, "calories": 208, "unit": "100g"},
            {"name": "Egg Whites", "protein": 11, "carbs": 0.7, "fat": 0.2, "calories": 52, "unit": "100g"},
            {"name": "Greek Yogurt", "protein": 10, "carbs": 3.6, "fat": 0.4, "calories": 59, "unit": "100g"},
            {"name": "Tofu", "protein": 8, "carbs": 1.9, "fat": 4.8, "calories": 76, "unit": "100g"},
        ],
        "Carbohydrate Sources": [
            {"name": "Brown Rice", "protein": 2.6, "carbs": 23, "fat": 0.9, "calories": 112, "unit": "100g"},
            {"name": "Sweet Potato", "protein": 1.6, "carbs": 20, "fat": 0.1, "calories": 86, "unit": "100g"},
            {"name": "Oatmeal", "protein": 13, "carbs": 68, "fat": 6.9, "calories": 389, "unit": "100g"},
            {"name": "Quinoa", "protein": 4.4, "carbs": 21, "fat": 1.9, "calories": 120, "unit": "100g"},
            {"name": "Whole Wheat Bread", "protein": 13, "carbs": 43, "fat": 3.3, "calories": 247, "unit": "100g"},
        ],
        "Fat Sources": [
            {"name": "Avocado", "protein": 2, "carbs": 8.5, "fat": 15, "calories": 160, "unit": "100g"},
            {"name": "Olive Oil", "protein": 0, "carbs": 0, "fat": 14, "calories": 119, "unit": "tbsp"},
            {"name": "Almonds", "protein": 21, "carbs": 22, "fat": 49, "calories": 579, "unit": "100g"},
            {"name": "Peanut Butter", "protein": 25, "carbs": 20, "fat": 50, "calories": 588, "unit": "100g"},
        ],
        "Fruits & Vegetables": [
            {"name": "Banana", "protein": 1.1, "carbs": 23, "fat": 0.3, "calories": 89, "unit": "100g"},
            {"name": "Broccoli", "protein": 2.8, "carbs": 7, "fat": 0.4, "calories": 34, "unit": "100g"},
            {"name": "Spinach", "protein": 2.9, "carbs": 3.6, "fat": 0.4, "calories": 23, "unit": "100g"},
            {"name": "Berries", "protein": 0.7, "carbs": 14, "fat": 0.3, "calories": 57, "unit": "100g"},
        ]
    }
    
    st.write("This feature will allow you to select foods for each meal and automatically calculate portion sizes to match your target macros.")
    
    # Create a tabs for each food category
    food_tabs = st.tabs(list(food_categories.keys()))
    
    for i, (category, foods) in enumerate(food_categories.items()):
        with food_tabs[i]:
            st.subheader(f"{category}")
            
            # Create a table of foods
            foods_df = pd.DataFrame(foods)
            st.dataframe(foods_df, use_container_width=True)
            
            st.write("Coming soon: Select foods to add to your meals and automatically calculate portion sizes.")
    
    st.subheader("Upcoming Features")
    st.info("This section will soon include:")
    st.markdown("""
    - Ability to add foods to specific meals or snacks
    - Automatic calculation of portion sizes to match your macro targets
    - Custom food creation
    - Recipe library with cronometer integration
    - Meal templates for quick planning
    """)

with tab3:
    st.header("Grocery List")
    
    st.write("This feature will help you generate grocery lists based on your meal plans.")
    
    # Show what's coming
    st.info("Coming soon! The grocery list feature will allow you to:")
    st.markdown("""
    - Automatically generate grocery lists based on your meal plans
    - Organize items by food category (produce, protein, etc.)
    - Check off items as you shop
    - Save favorite items for quick addition to your list
    - Export your grocery list to print or email
    """)

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")