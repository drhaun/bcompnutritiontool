import streamlit as st
import pandas as pd
import numpy as np
import json
import os
import sys
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
    
    # For debugging - print weekly schedule
    if 'confirmed_weekly_schedule' in st.session_state:
        weekly_schedule = st.session_state.confirmed_weekly_schedule
        
        # Check if the day exists in the schedule
        day_data = weekly_schedule.get(day, {})
        
        # Check for resistance training
        if day_data.get('resistance_training', False):
            workout_info['has_workout'] = True
            workout_info['workout_type'] = 'Resistance'
            # Convert time to appropriate category
            time_str = day_data.get('resistance_time', '')
            if time_str:
                try:
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
                except Exception as e:
                    workout_info['workout_time'] = '9AM-3PM'  # Default fallback
                    pass
        
        # Check for cardio training
        elif day_data.get('cardio_training', False):
            workout_info['has_workout'] = True
            workout_info['workout_type'] = 'Cardio'
            # Convert time to appropriate category
            time_str = day_data.get('cardio_time', '')
            if time_str:
                try:
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
                except Exception as e:
                    workout_info['workout_time'] = '9AM-3PM'  # Default fallback
                    pass
                    
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
    # Extract target values
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

# Set page config
st.set_page_config(
    page_title="Fitomics - DIY Meal Planning",
    page_icon="🍽️",
    layout="wide"
)

# Streamlit UI
st.title("DIY Meal Planning")
st.markdown("Create optimized meals based on your workout schedule and nutrition targets.")

# Initialize session state variables
if 'meal_plan' not in st.session_state:
    st.session_state.meal_plan = {}

if 'selected_foods' not in st.session_state:
    st.session_state.selected_foods = []

# Check if user info is set
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

# Main UI
st.header("Design Meals for Your Weekly Schedule")

# Day selection
days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
selected_day = st.selectbox("Select Day:", days)

# Get workout info for the selected day
workout_info = get_day_workout_info(selected_day)

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

# Display nutrition targets if available
has_nutrition_targets = False
if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
    has_nutrition_targets = True
    if selected_day in st.session_state.day_specific_nutrition:
        targets = st.session_state.day_specific_nutrition[selected_day]
        
        # Display daily targets
        st.subheader(f"Daily Nutrition Targets for {selected_day}")
        target_cols = st.columns(4)
        with target_cols[0]:
            st.metric("Calories", f"{targets.get('target_calories', 0):.0f} kcal")
        with target_cols[1]:
            st.metric("Protein", f"{targets.get('protein', 0):.0f}g")
        with target_cols[2]:
            st.metric("Carbs", f"{targets.get('carbs', 0):.0f}g")
        with target_cols[3]:
            st.metric("Fat", f"{targets.get('fat', 0):.0f}g")
    else:
        st.warning("No nutrition targets set for this day. Please set them in the Weekly Schedule page.")
else:
    st.warning("⚠️ You haven't set up day-specific nutrition targets yet. For best results, go to 'Weekly Schedule and Nutrition' page first.")

# Plan meals for the day
st.header(f"Plan Meals for {selected_day}")

# Total meals input
total_meals = st.number_input("How many meals do you plan to have on this day?", 
                           min_value=1, max_value=6, value=3)

# Initialize meal plan for this day if needed
if selected_day not in st.session_state.meal_plan:
    st.session_state.meal_plan[selected_day] = {}

# For each meal
for meal_num in range(1, total_meals + 1):
    # Get meal distribution for this meal
    meal_distribution = get_meal_distribution(selected_day, total_meals)
    meal_info = meal_distribution.get(meal_num, {'description': f'Meal {meal_num}', 'protein': 1/total_meals, 'carbs': 1/total_meals, 'fat': 1/total_meals})
    
    with st.expander(f"Meal {meal_num}: {meal_info['description']}", expanded=meal_num==1):
        # Display macro distribution info
        st.info(f"**Recommended distribution:** Protein: {meal_info['protein']*100:.0f}%, Carbs: {meal_info['carbs']*100:.0f}%, Fat: {meal_info['fat']*100:.0f}%")
        
        # Calculate meal-specific targets
        if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
            targets = st.session_state.day_specific_nutrition[selected_day]
            meal_targets = {
                'target_calories': targets.get('target_calories', 0) * meal_info['protein'],  # Using protein as proxy for calories
                'protein': targets.get('protein', 0) * meal_info['protein'],
                'carbs': targets.get('carbs', 0) * meal_info['carbs'],
                'fat': targets.get('fat', 0) * meal_info['fat']
            }
            
            # Display meal targets
            st.subheader("Meal-Specific Targets")
            meal_target_cols = st.columns(4)
            with meal_target_cols[0]:
                st.metric("Calories", f"{meal_targets['target_calories']:.0f} kcal")
            with meal_target_cols[1]:
                st.metric("Protein", f"{meal_targets['protein']:.0f}g")
            with meal_target_cols[2]:
                st.metric("Carbs", f"{meal_targets['carbs']:.0f}g")
            with meal_target_cols[3]:
                st.metric("Fat", f"{meal_targets['fat']:.0f}g")
        
        # Initialize food sources for this meal
        if meal_num not in st.session_state.meal_plan[selected_day]:
            st.session_state.meal_plan[selected_day][meal_num] = {
                'protein_sources': [],
                'carb_sources': [],
                'fat_sources': [],
                'vegetable_sources': [],
                'fruit_sources': []
            }
        
        meal_data = st.session_state.meal_plan[selected_day][meal_num]
        
        # Food source selection
        st.subheader("Select Food Sources")
        
        # Protein Sources
        with st.expander("Protein Sources (Select up to 2)", expanded=True):
            # Search for protein foods
            protein_search = st.text_input("Search for protein foods:", key=f"protein_search_{selected_day}_{meal_num}")
            
            if protein_search and st.button("Search", key=f"protein_search_btn_{selected_day}_{meal_num}"):
                with st.spinner("Searching USDA Food Database..."):
                    results = fdc_api.search_foods(protein_search)
                    
                    if results:
                        # Filter for protein-rich foods
                        protein_foods = []
                        for food in results:
                            normalized = fdc_api.normalize_food_data(food)
                            category = fdc_api.categorize_food(normalized)
                            if category == 'protein':
                                protein_foods.append(normalized)
                        
                        if protein_foods:
                            st.success(f"Found {len(protein_foods)} protein-rich foods.")
                            
                            # Display as table
                            protein_data = []
                            for i, food in enumerate(protein_foods[:10]):  # Limit to 10 results
                                protein_data.append({
                                    'Index': i + 1,
                                    'Food': food['name'],
                                    'Calories': f"{food['calories']:.0f} kcal",
                                    'Protein': f"{food['protein']:.1f}g",
                                    'Carbs': f"{food['carbs']:.1f}g",
                                    'Fat': f"{food['fat']:.1f}g"
                                })
                            
                            protein_df = pd.DataFrame(protein_data)
                            st.dataframe(protein_df, use_container_width=True)
                            
                            # Allow selecting
                            protein_selection = st.multiselect(
                                "Select protein sources (max 2):",
                                [food['name'] for food in protein_foods[:10]],
                                default=meal_data['protein_sources']
                            )
                            
                            # Limit to 2 selections
                            if len(protein_selection) > 2:
                                st.warning("Please select a maximum of 2 protein sources.")
                                protein_selection = protein_selection[:2]
                            
                            # Save selected protein sources
                            meal_data['protein_sources'] = protein_selection
                            
                            # Save selected foods to the meal
                            for food_name in protein_selection:
                                selected_food = next((food for food in protein_foods if food['name'] == food_name), None)
                                if selected_food and selected_food not in st.session_state.selected_foods:
                                    st.session_state.selected_foods.append(selected_food)
                        else:
                            st.warning("No protein-rich foods found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
            
            # Display currently selected protein sources
            if meal_data['protein_sources']:
                st.write("**Selected Protein Sources:**")
                for protein in meal_data['protein_sources']:
                    st.write(f"- {protein}")
            else:
                st.write("No protein sources selected yet.")
        
        # Carb Sources
        with st.expander("Carbohydrate Sources (Select up to 2)"):
            # Search for carb foods
            carb_search = st.text_input("Search for carbohydrate foods:", key=f"carb_search_{selected_day}_{meal_num}")
            
            if carb_search and st.button("Search", key=f"carb_search_btn_{selected_day}_{meal_num}"):
                with st.spinner("Searching USDA Food Database..."):
                    results = fdc_api.search_foods(carb_search)
                    
                    if results:
                        # Filter for carb-rich foods
                        carb_foods = []
                        for food in results:
                            normalized = fdc_api.normalize_food_data(food)
                            category = fdc_api.categorize_food(normalized)
                            if category == 'carb':
                                carb_foods.append(normalized)
                        
                        if carb_foods:
                            st.success(f"Found {len(carb_foods)} carb-rich foods.")
                            
                            # Display as table
                            carb_data = []
                            for i, food in enumerate(carb_foods[:10]):  # Limit to 10 results
                                carb_data.append({
                                    'Index': i + 1,
                                    'Food': food['name'],
                                    'Calories': f"{food['calories']:.0f} kcal",
                                    'Protein': f"{food['protein']:.1f}g",
                                    'Carbs': f"{food['carbs']:.1f}g",
                                    'Fat': f"{food['fat']:.1f}g"
                                })
                            
                            carb_df = pd.DataFrame(carb_data)
                            st.dataframe(carb_df, use_container_width=True)
                            
                            # Allow selecting
                            carb_selection = st.multiselect(
                                "Select carb sources (max 2):",
                                [food['name'] for food in carb_foods[:10]],
                                default=meal_data['carb_sources']
                            )
                            
                            # Limit to 2 selections
                            if len(carb_selection) > 2:
                                st.warning("Please select a maximum of 2 carb sources.")
                                carb_selection = carb_selection[:2]
                            
                            # Save selected carb sources
                            meal_data['carb_sources'] = carb_selection
                            
                            # Save selected foods to the meal
                            for food_name in carb_selection:
                                selected_food = next((food for food in carb_foods if food['name'] == food_name), None)
                                if selected_food and selected_food not in st.session_state.selected_foods:
                                    st.session_state.selected_foods.append(selected_food)
                        else:
                            st.warning("No carb-rich foods found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
            
            # Display currently selected carb sources
            if meal_data['carb_sources']:
                st.write("**Selected Carb Sources:**")
                for carb in meal_data['carb_sources']:
                    st.write(f"- {carb}")
            else:
                st.write("No carb sources selected yet.")
        
        # Fat Sources
        with st.expander("Fat Sources (Select up to 2)"):
            # Search for fat foods
            fat_search = st.text_input("Search for healthy fat foods:", key=f"fat_search_{selected_day}_{meal_num}")
            
            if fat_search and st.button("Search", key=f"fat_search_btn_{selected_day}_{meal_num}"):
                with st.spinner("Searching USDA Food Database..."):
                    results = fdc_api.search_foods(fat_search)
                    
                    if results:
                        # Filter for fat-rich foods
                        fat_foods = []
                        for food in results:
                            normalized = fdc_api.normalize_food_data(food)
                            category = fdc_api.categorize_food(normalized)
                            if category == 'fat':
                                fat_foods.append(normalized)
                        
                        if fat_foods:
                            st.success(f"Found {len(fat_foods)} fat-rich foods.")
                            
                            # Display as table
                            fat_data = []
                            for i, food in enumerate(fat_foods[:10]):  # Limit to 10 results
                                fat_data.append({
                                    'Index': i + 1,
                                    'Food': food['name'],
                                    'Calories': f"{food['calories']:.0f} kcal",
                                    'Protein': f"{food['protein']:.1f}g",
                                    'Carbs': f"{food['carbs']:.1f}g",
                                    'Fat': f"{food['fat']:.1f}g"
                                })
                            
                            fat_df = pd.DataFrame(fat_data)
                            st.dataframe(fat_df, use_container_width=True)
                            
                            # Allow selecting
                            fat_selection = st.multiselect(
                                "Select fat sources (max 2):",
                                [food['name'] for food in fat_foods[:10]],
                                default=meal_data['fat_sources']
                            )
                            
                            # Limit to 2 selections
                            if len(fat_selection) > 2:
                                st.warning("Please select a maximum of 2 fat sources.")
                                fat_selection = fat_selection[:2]
                            
                            # Save selected fat sources
                            meal_data['fat_sources'] = fat_selection
                            
                            # Save selected foods to the meal
                            for food_name in fat_selection:
                                selected_food = next((food for food in fat_foods if food['name'] == food_name), None)
                                if selected_food and selected_food not in st.session_state.selected_foods:
                                    st.session_state.selected_foods.append(selected_food)
                        else:
                            st.warning("No fat-rich foods found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
            
            # Display currently selected fat sources
            if meal_data['fat_sources']:
                st.write("**Selected Fat Sources:**")
                for fat in meal_data['fat_sources']:
                    st.write(f"- {fat}")
            else:
                st.write("No fat sources selected yet.")
        
        # Vegetable Sources
        with st.expander("Vegetable Sources (Select up to 2)"):
            # Search for vegetable foods
            veg_search = st.text_input("Search for vegetables:", key=f"veg_search_{selected_day}_{meal_num}")
            
            if veg_search and st.button("Search", key=f"veg_search_btn_{selected_day}_{meal_num}"):
                with st.spinner("Searching USDA Food Database..."):
                    results = fdc_api.search_foods(veg_search)
                    
                    if results:
                        # Display vegetables
                        veg_foods = []
                        for food in results:
                            normalized = fdc_api.normalize_food_data(food)
                            if "vegetable" in normalized['name'].lower() or any(veg in normalized['name'].lower() for veg in ["spinach", "kale", "broccoli", "lettuce", "carrot", "tomato", "cucumber", "pepper", "onion", "garlic"]):
                                veg_foods.append(normalized)
                        
                        if veg_foods:
                            st.success(f"Found {len(veg_foods)} vegetables.")
                            
                            # Display as table
                            veg_data = []
                            for i, food in enumerate(veg_foods[:10]):  # Limit to 10 results
                                veg_data.append({
                                    'Index': i + 1,
                                    'Food': food['name'],
                                    'Calories': f"{food['calories']:.0f} kcal",
                                    'Protein': f"{food['protein']:.1f}g",
                                    'Carbs': f"{food['carbs']:.1f}g",
                                    'Fat': f"{food['fat']:.1f}g"
                                })
                            
                            veg_df = pd.DataFrame(veg_data)
                            st.dataframe(veg_df, use_container_width=True)
                            
                            # Allow selecting
                            veg_selection = st.multiselect(
                                "Select vegetables (max 2):",
                                [food['name'] for food in veg_foods[:10]],
                                default=meal_data['vegetable_sources']
                            )
                            
                            # Limit to 2 selections
                            if len(veg_selection) > 2:
                                st.warning("Please select a maximum of 2 vegetables.")
                                veg_selection = veg_selection[:2]
                            
                            # Save selected vegetable sources
                            meal_data['vegetable_sources'] = veg_selection
                            
                            # Save selected foods to the meal
                            for food_name in veg_selection:
                                selected_food = next((food for food in veg_foods if food['name'] == food_name), None)
                                if selected_food and selected_food not in st.session_state.selected_foods:
                                    st.session_state.selected_foods.append(selected_food)
                        else:
                            st.warning("No vegetables found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
            
            # Display currently selected vegetable sources
            if meal_data['vegetable_sources']:
                st.write("**Selected Vegetables:**")
                for veg in meal_data['vegetable_sources']:
                    st.write(f"- {veg}")
            else:
                st.write("No vegetables selected yet.")
        
        # Fruit Sources
        with st.expander("Fruit Sources (Select up to 2)"):
            # Search for fruit foods
            fruit_search = st.text_input("Search for fruits:", key=f"fruit_search_{selected_day}_{meal_num}")
            
            if fruit_search and st.button("Search", key=f"fruit_search_btn_{selected_day}_{meal_num}"):
                with st.spinner("Searching USDA Food Database..."):
                    results = fdc_api.search_foods(fruit_search)
                    
                    if results:
                        # Display fruits
                        fruit_foods = []
                        for food in results:
                            normalized = fdc_api.normalize_food_data(food)
                            if "fruit" in normalized['name'].lower() or any(fruit in normalized['name'].lower() for fruit in ["apple", "banana", "orange", "berry", "blueberry", "strawberry", "grape", "melon", "pineapple", "mango"]):
                                fruit_foods.append(normalized)
                        
                        if fruit_foods:
                            st.success(f"Found {len(fruit_foods)} fruits.")
                            
                            # Display as table
                            fruit_data = []
                            for i, food in enumerate(fruit_foods[:10]):  # Limit to 10 results
                                fruit_data.append({
                                    'Index': i + 1,
                                    'Food': food['name'],
                                    'Calories': f"{food['calories']:.0f} kcal",
                                    'Protein': f"{food['protein']:.1f}g",
                                    'Carbs': f"{food['carbs']:.1f}g",
                                    'Fat': f"{food['fat']:.1f}g"
                                })
                            
                            fruit_df = pd.DataFrame(fruit_data)
                            st.dataframe(fruit_df, use_container_width=True)
                            
                            # Allow selecting
                            fruit_selection = st.multiselect(
                                "Select fruits (max 2):",
                                [food['name'] for food in fruit_foods[:10]],
                                default=meal_data['fruit_sources']
                            )
                            
                            # Limit to 2 selections
                            if len(fruit_selection) > 2:
                                st.warning("Please select a maximum of 2 fruits.")
                                fruit_selection = fruit_selection[:2]
                            
                            # Save selected fruit sources
                            meal_data['fruit_sources'] = fruit_selection
                            
                            # Save selected foods to the meal
                            for food_name in fruit_selection:
                                selected_food = next((food for food in fruit_foods if food['name'] == food_name), None)
                                if selected_food and selected_food not in st.session_state.selected_foods:
                                    st.session_state.selected_foods.append(selected_food)
                        else:
                            st.warning("No fruits found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
            
            # Display currently selected fruit sources
            if meal_data['fruit_sources']:
                st.write("**Selected Fruits:**")
                for fruit in meal_data['fruit_sources']:
                    st.write(f"- {fruit}")
            else:
                st.write("No fruits selected yet.")
        
        # Calculate and display meal nutrition
        st.subheader("Meal Nutrition Analysis")
        
        # Get all selected foods for this meal
        selected_food_names = (
            meal_data['protein_sources'] + 
            meal_data['carb_sources'] + 
            meal_data['fat_sources'] + 
            meal_data['vegetable_sources'] + 
            meal_data['fruit_sources']
        )
        
        meal_foods = [food for food in st.session_state.selected_foods if food['name'] in selected_food_names]
        
        if meal_foods:
            # If we have nutrition targets, calculate optimal portions
            if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
                targets = st.session_state.day_specific_nutrition[selected_day]
                meal_targets = {
                    'target_calories': targets.get('target_calories', 0) * meal_info['protein'],
                    'protein': targets.get('protein', 0) * meal_info['protein'],
                    'carbs': targets.get('carbs', 0) * meal_info['carbs'],
                    'fat': targets.get('fat', 0) * meal_info['fat']
                }
                
                # Calculate optimal portions
                optimal_portions = calculate_optimal_portions(meal_foods, meal_targets)
                
                # Display portion recommendations
                st.write("**Recommended Portions to Meet Targets:**")
                
                # Create table of recommended portions and nutrition
                portion_data = []
                meal_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                
                for food in meal_foods:
                    portion = optimal_portions.get(food['name'], 100)
                    
                    # Calculate nutrition for this portion
                    calories = food['calories'] * portion / 100
                    protein = food['protein'] * portion / 100
                    carbs = food['carbs'] * portion / 100
                    fat = food['fat'] * portion / 100
                    
                    # Add to meal total
                    meal_nutrition['calories'] += calories
                    meal_nutrition['protein'] += protein
                    meal_nutrition['carbs'] += carbs
                    meal_nutrition['fat'] += fat
                    
                    # Add to table
                    portion_data.append({
                        'Food': food['name'],
                        'Portion': f"{portion:.0f}g",
                        'Calories': f"{calories:.0f} kcal",
                        'Protein': f"{protein:.1f}g",
                        'Carbs': f"{carbs:.1f}g",
                        'Fat': f"{fat:.1f}g"
                    })
                
                # Display portion table
                portion_df = pd.DataFrame(portion_data)
                st.dataframe(portion_df, use_container_width=True)
                
                # Display meal total nutrition
                st.write("**Meal Total Nutrition:**")
                meal_cols = st.columns(4)
                
                with meal_cols[0]:
                    cal_pct = 0
                    if meal_targets['target_calories'] > 0:
                        cal_pct = (meal_nutrition['calories'] / meal_targets['target_calories']) * 100
                    st.metric("Calories", f"{meal_nutrition['calories']:.0f} kcal", f"{cal_pct:.0f}% of target")
                
                with meal_cols[1]:
                    pro_pct = 0
                    if meal_targets['protein'] > 0:
                        pro_pct = (meal_nutrition['protein'] / meal_targets['protein']) * 100
                    st.metric("Protein", f"{meal_nutrition['protein']:.1f}g", f"{pro_pct:.0f}% of target")
                
                with meal_cols[2]:
                    carb_pct = 0
                    if meal_targets['carbs'] > 0:
                        carb_pct = (meal_nutrition['carbs'] / meal_targets['carbs']) * 100
                    st.metric("Carbs", f"{meal_nutrition['carbs']:.1f}g", f"{carb_pct:.0f}% of target")
                
                with meal_cols[3]:
                    fat_pct = 0
                    if meal_targets['fat'] > 0:
                        fat_pct = (meal_nutrition['fat'] / meal_targets['fat']) * 100
                    st.metric("Fat", f"{meal_nutrition['fat']:.1f}g", f"{fat_pct:.0f}% of target")
                
                # Calculate macronutrient percentages
                if meal_nutrition['calories'] > 0:
                    protein_pct = (meal_nutrition['protein'] * 4 / meal_nutrition['calories']) * 100
                    carbs_pct = (meal_nutrition['carbs'] * 4 / meal_nutrition['calories']) * 100
                    fat_pct = (meal_nutrition['fat'] * 9 / meal_nutrition['calories']) * 100
                    
                    st.write("**Macronutrient Breakdown:**")
                    macro_cols = st.columns(3)
                    
                    with macro_cols[0]:
                        st.metric("Protein", f"{protein_pct:.0f}%")
                    
                    with macro_cols[1]:
                        st.metric("Carbs", f"{carbs_pct:.0f}%")
                    
                    with macro_cols[2]:
                        st.metric("Fat", f"{fat_pct:.0f}%")
            else:
                st.warning("Set up day-specific nutrition targets to get portion recommendations.")
        else:
            st.warning("Select food sources to analyze meal nutrition.")

# Daily Summary
st.header("Daily Meal Plan Summary")

if selected_day in st.session_state.meal_plan and st.session_state.meal_plan[selected_day]:
    # Calculate total nutrition for the day
    day_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
    
    # Display meals
    st.write(f"**{selected_day}'s Meal Plan:**")
    
    for meal_num in sorted(st.session_state.meal_plan[selected_day].keys()):
        meal_data = st.session_state.meal_plan[selected_day][meal_num]
        
        # Get meal distribution info
        meal_distribution = get_meal_distribution(selected_day, total_meals)
        meal_info = meal_distribution.get(meal_num, {'description': f'Meal {meal_num}'})
        
        # Get foods for this meal
        selected_food_names = (
            meal_data['protein_sources'] + 
            meal_data['carb_sources'] + 
            meal_data['fat_sources'] + 
            meal_data['vegetable_sources'] + 
            meal_data['fruit_sources']
        )
        
        meal_foods = [food for food in st.session_state.selected_foods if food['name'] in selected_food_names]
        
        if meal_foods:
            st.write(f"**Meal {meal_num}: {meal_info.get('description', '')}**")
            
            # Calculate nutrition if targets are available
            if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
                targets = st.session_state.day_specific_nutrition[selected_day]
                meal_targets = {
                    'target_calories': targets.get('target_calories', 0) * meal_info.get('protein', 1/total_meals),
                    'protein': targets.get('protein', 0) * meal_info.get('protein', 1/total_meals),
                    'carbs': targets.get('carbs', 0) * meal_info.get('carbs', 1/total_meals),
                    'fat': targets.get('fat', 0) * meal_info.get('fat', 1/total_meals)
                }
                
                # Calculate optimal portions
                optimal_portions = calculate_optimal_portions(meal_foods, meal_targets)
                
                # Calculate meal nutrition
                meal_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                
                for food in meal_foods:
                    portion = optimal_portions.get(food['name'], 100)
                    
                    # Calculate nutrition for this portion
                    meal_nutrition['calories'] += food['calories'] * portion / 100
                    meal_nutrition['protein'] += food['protein'] * portion / 100
                    meal_nutrition['carbs'] += food['carbs'] * portion / 100
                    meal_nutrition['fat'] += food['fat'] * portion / 100
                
                # Add to day total
                day_nutrition['calories'] += meal_nutrition['calories']
                day_nutrition['protein'] += meal_nutrition['protein']
                day_nutrition['carbs'] += meal_nutrition['carbs']
                day_nutrition['fat'] += meal_nutrition['fat']
                
                # Display meal sources and nutrition
                st.write(f"**Calories:** {meal_nutrition['calories']:.0f} kcal | **Protein:** {meal_nutrition['protein']:.1f}g | **Carbs:** {meal_nutrition['carbs']:.1f}g | **Fat:** {meal_nutrition['fat']:.1f}g")
            
            # List food sources
            if meal_data['protein_sources']:
                st.write(f"**Protein:** {', '.join(meal_data['protein_sources'])}")
            if meal_data['carb_sources']:
                st.write(f"**Carbs:** {', '.join(meal_data['carb_sources'])}")
            if meal_data['fat_sources']:
                st.write(f"**Fats:** {', '.join(meal_data['fat_sources'])}")
            if meal_data['vegetable_sources']:
                st.write(f"**Vegetables:** {', '.join(meal_data['vegetable_sources'])}")
            if meal_data['fruit_sources']:
                st.write(f"**Fruits:** {', '.join(meal_data['fruit_sources'])}")
            
            st.write("---")
    
    # Display day nutrition totals
    if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
        targets = st.session_state.day_specific_nutrition[selected_day]
        
        st.subheader("Daily Nutrition Totals")
        total_cols = st.columns(4)
        
        with total_cols[0]:
            cal_pct = 0
            if targets.get('target_calories', 0) > 0:
                cal_pct = (day_nutrition['calories'] / targets['target_calories']) * 100
            st.metric("Calories", f"{day_nutrition['calories']:.0f} kcal", f"{cal_pct:.0f}% of target")
        
        with total_cols[1]:
            pro_pct = 0
            if targets.get('protein', 0) > 0:
                pro_pct = (day_nutrition['protein'] / targets['protein']) * 100
            st.metric("Protein", f"{day_nutrition['protein']:.1f}g", f"{pro_pct:.0f}% of target")
        
        with total_cols[2]:
            carb_pct = 0
            if targets.get('carbs', 0) > 0:
                carb_pct = (day_nutrition['carbs'] / targets['carbs']) * 100
            st.metric("Carbs", f"{day_nutrition['carbs']:.1f}g", f"{carb_pct:.0f}% of target")
        
        with total_cols[3]:
            fat_pct = 0
            if targets.get('fat', 0) > 0:
                fat_pct = (day_nutrition['fat'] / targets['fat']) * 100
            st.metric("Fat", f"{day_nutrition['fat']:.1f}g", f"{fat_pct:.0f}% of target")
        
        # Calculate macronutrient percentages
        if day_nutrition['calories'] > 0:
            protein_pct = (day_nutrition['protein'] * 4 / day_nutrition['calories']) * 100
            carbs_pct = (day_nutrition['carbs'] * 4 / day_nutrition['calories']) * 100
            fat_pct = (day_nutrition['fat'] * 9 / day_nutrition['calories']) * 100
            
            st.write("**Macronutrient Breakdown:**")
            macro_cols = st.columns(3)
            
            with macro_cols[0]:
                st.metric("Protein", f"{protein_pct:.0f}%")
            
            with macro_cols[1]:
                st.metric("Carbs", f"{carbs_pct:.0f}%")
            
            with macro_cols[2]:
                st.metric("Fat", f"{fat_pct:.0f}%")
else:
    st.info("No meals planned for this day yet.")

# Save meal plan button
if st.button("Save Meal Plan"):
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Save meal plan to file
    try:
        # Convert selected foods to JSON-serializable format
        serializable_meal_plan = {}
        
        for day, meals in st.session_state.meal_plan.items():
            serializable_meal_plan[day] = {}
            for meal_num, meal_data in meals.items():
                serializable_meal_plan[day][meal_num] = meal_data
        
        with open('data/meal_plan.json', 'w') as f:
            json.dump(serializable_meal_plan, f)
        
        st.success("Meal plan saved successfully!")
    except Exception as e:
        st.error(f"Error saving meal plan: {e}")