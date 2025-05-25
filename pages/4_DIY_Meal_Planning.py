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

# Function to get workout info for a specific day
def get_day_workout_info(day):
    """Get workout information for a specific day"""
    workout_info = {
        'has_workout': False,
        'workout_time': None,
        'workout_type': None
    }
    
    # Check if weekly schedule exists
    if 'confirmed_weekly_schedule' in st.session_state:
        weekly_schedule = st.session_state.confirmed_weekly_schedule
        
        # Check if the day exists in the schedule
        day_data = weekly_schedule.get(day, {})
        
        # The schedule structure has workouts as a list under each day
        if 'workouts' in day_data and len(day_data['workouts']) > 0:
            for workout in day_data['workouts']:
                workout_name = workout.get('name', '')
                
                # Found a workout
                workout_info['has_workout'] = True
                
                # Determine workout type
                if 'Resistance' in workout_name or 'Weight' in workout_name or 'Strength' in workout_name:
                    workout_info['workout_type'] = 'Resistance'
                else:
                    workout_info['workout_type'] = 'Cardio'
                
                # Get time and convert to category
                time_str = workout.get('start_time', '')
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
                
                # We found at least one workout, no need to check others
                break
                    
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
    # Get workout info for the day
    workout_info = get_day_workout_info(day)
    
    # Default to REST DAY if no workout
    training_time = 'REST DAY'
    if workout_info['has_workout'] and workout_info['workout_time']:
        training_time = workout_info['workout_time']
    
    # Create an even distribution for rest days
    if training_time == 'REST DAY':
        meal_distribution = {}
        for meal_num in range(1, total_meals + 1):
            meal_distribution[meal_num] = {
                'description': f'Meal {meal_num}',
                'protein': 1.0 / total_meals,
                'carbs': 1.0 / total_meals,
                'fat': 1.0 / total_meals
            }
        return meal_distribution
    
    # For BEFORE 9AM workouts
    if training_time == 'BEFORE 9AM':
        meal_distribution = {}
        for meal_num in range(1, total_meals + 1):
            if total_meals == 1:
                meal_distribution[meal_num] = {
                    'description': 'All-in-one Meal',
                    'protein': 1.0,
                    'carbs': 1.0, 
                    'fat': 1.0
                }
            elif meal_num == 1:
                meal_distribution[meal_num] = {
                    'description': 'Pre-Workout',
                    'protein': 0.3,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            elif meal_num == 2:
                meal_distribution[meal_num] = {
                    'description': 'Post-Workout',
                    'protein': 0.4,
                    'carbs': 0.4,
                    'fat': 0.2
                }
            else:
                meal_distribution[meal_num] = {
                    'description': f'Meal {meal_num}',
                    'protein': 0.3 / (total_meals - 2),
                    'carbs': 0.2 / (total_meals - 2),
                    'fat': 0.7 / (total_meals - 2)
                }
        return meal_distribution
    
    # For 9AM-3PM workouts
    if training_time == '9AM-3PM':
        meal_distribution = {}
        for meal_num in range(1, total_meals + 1):
            if total_meals == 1:
                meal_distribution[meal_num] = {
                    'description': 'All-in-one Meal',
                    'protein': 1.0,
                    'carbs': 1.0, 
                    'fat': 1.0
                }
            elif meal_num == total_meals // 2:
                meal_distribution[meal_num] = {
                    'description': 'Pre-Workout',
                    'protein': 0.3,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            elif meal_num == total_meals // 2 + 1:
                meal_distribution[meal_num] = {
                    'description': 'Post-Workout',
                    'protein': 0.4,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            else:
                meal_distribution[meal_num] = {
                    'description': f'Meal {meal_num}',
                    'protein': 0.3 / (total_meals - 2),
                    'carbs': 0.2 / (total_meals - 2),
                    'fat': 0.8 / (total_meals - 2)
                }
        return meal_distribution
    
    # For 3PM-6PM workouts
    if training_time == '3PM-6PM':
        meal_distribution = {}
        for meal_num in range(1, total_meals + 1):
            if total_meals == 1:
                meal_distribution[meal_num] = {
                    'description': 'All-in-one Meal',
                    'protein': 1.0,
                    'carbs': 1.0, 
                    'fat': 1.0
                }
            elif meal_num == total_meals - 1:
                meal_distribution[meal_num] = {
                    'description': 'Pre-Workout',
                    'protein': 0.3,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            elif meal_num == total_meals:
                meal_distribution[meal_num] = {
                    'description': 'Post-Workout',
                    'protein': 0.4,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            else:
                meal_distribution[meal_num] = {
                    'description': f'Meal {meal_num}',
                    'protein': 0.3 / (total_meals - 2),
                    'carbs': 0.2 / (total_meals - 2),
                    'fat': 0.8 / (total_meals - 2)
                }
        return meal_distribution
    
    # For AFTER 6PM workouts
    if training_time == 'AFTER 6PM':
        meal_distribution = {}
        for meal_num in range(1, total_meals + 1):
            if total_meals == 1:
                meal_distribution[meal_num] = {
                    'description': 'All-in-one Meal',
                    'protein': 1.0,
                    'carbs': 1.0, 
                    'fat': 1.0
                }
            elif meal_num == total_meals - 1:
                meal_distribution[meal_num] = {
                    'description': 'Pre-Workout',
                    'protein': 0.3,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            elif meal_num == total_meals:
                meal_distribution[meal_num] = {
                    'description': 'Post-Workout',
                    'protein': 0.4,
                    'carbs': 0.4,
                    'fat': 0.1
                }
            else:
                meal_distribution[meal_num] = {
                    'description': f'Meal {meal_num}',
                    'protein': 0.3 / (total_meals - 2),
                    'carbs': 0.2 / (total_meals - 2),
                    'fat': 0.8 / (total_meals - 2)
                }
        return meal_distribution
    
    # Fallback to even distribution
    meal_distribution = {}
    for meal_num in range(1, total_meals + 1):
        meal_distribution[meal_num] = {
            'description': f'Meal {meal_num}',
            'protein': 1.0 / total_meals,
            'carbs': 1.0 / total_meals,
            'fat': 1.0 / total_meals
        }
    return meal_distribution

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

# Common food options for each category
COMMON_PROTEIN_SOURCES = [
    {"name": "Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
    {"name": "Turkey Breast", "calories": 135, "protein": 30, "carbs": 0, "fat": 1},
    {"name": "Salmon", "calories": 208, "protein": 20, "carbs": 0, "fat": 13},
    {"name": "Lean Beef", "calories": 250, "protein": 26, "carbs": 0, "fat": 17},
    {"name": "Tuna", "calories": 130, "protein": 29, "carbs": 0, "fat": 1},
    {"name": "Egg Whites", "calories": 52, "protein": 11, "carbs": 0.7, "fat": 0.2},
    {"name": "Whole Eggs", "calories": 143, "protein": 12.6, "carbs": 0.7, "fat": 9.5},
    {"name": "Greek Yogurt", "calories": 100, "protein": 17, "carbs": 6, "fat": 0.5},
    {"name": "Cottage Cheese", "calories": 98, "protein": 11, "carbs": 3.4, "fat": 4.3},
    {"name": "Tofu", "calories": 144, "protein": 17, "carbs": 2.8, "fat": 8.6},
    {"name": "Tempeh", "calories": 195, "protein": 20, "carbs": 7.6, "fat": 11.4},
    {"name": "Whey Protein", "calories": 120, "protein": 25, "carbs": 3, "fat": 2},
    {"name": "Plant Protein", "calories": 120, "protein": 24, "carbs": 5, "fat": 2}
]

COMMON_CARB_SOURCES = [
    {"name": "White Rice", "calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3},
    {"name": "Brown Rice", "calories": 112, "protein": 2.6, "carbs": 22.9, "fat": 0.9},
    {"name": "Sweet Potato", "calories": 86, "protein": 1.6, "carbs": 20.1, "fat": 0.1},
    {"name": "White Potato", "calories": 77, "protein": 2, "carbs": 17, "fat": 0.1},
    {"name": "Oats", "calories": 389, "protein": 16.9, "carbs": 66.3, "fat": 6.9},
    {"name": "Quinoa", "calories": 120, "protein": 4.4, "carbs": 21.3, "fat": 1.9},
    {"name": "Whole Wheat Bread", "calories": 247, "protein": 13, "carbs": 41, "fat": 3.4},
    {"name": "Whole Wheat Pasta", "calories": 174, "protein": 7.5, "carbs": 37, "fat": 0.8},
    {"name": "Beans", "calories": 341, "protein": 21, "carbs": 62, "fat": 1.2},
    {"name": "Lentils", "calories": 116, "protein": 9, "carbs": 20, "fat": 0.4},
    {"name": "Banana", "calories": 89, "protein": 1.1, "carbs": 22.8, "fat": 0.3},
    {"name": "Rice Cakes", "calories": 35, "protein": 0.7, "carbs": 7.3, "fat": 0.3}
]

COMMON_FAT_SOURCES = [
    {"name": "Avocado", "calories": 160, "protein": 2, "carbs": 8.5, "fat": 14.7},
    {"name": "Olive Oil", "calories": 884, "protein": 0, "carbs": 0, "fat": 100},
    {"name": "Coconut Oil", "calories": 862, "protein": 0, "carbs": 0, "fat": 100},
    {"name": "Almonds", "calories": 576, "protein": 21, "carbs": 22, "fat": 49},
    {"name": "Walnuts", "calories": 654, "protein": 15, "carbs": 14, "fat": 65},
    {"name": "Chia Seeds", "calories": 486, "protein": 17, "carbs": 42, "fat": 31},
    {"name": "Flax Seeds", "calories": 534, "protein": 18, "carbs": 29, "fat": 42},
    {"name": "Nut Butter", "calories": 588, "protein": 25, "carbs": 20, "fat": 50},
    {"name": "Cheese", "calories": 402, "protein": 25, "carbs": 1.3, "fat": 33},
    {"name": "Full Fat Yogurt", "calories": 61, "protein": 3.5, "carbs": 4.7, "fat": 3.3}
]

COMMON_VEGETABLE_SOURCES = [
    {"name": "Broccoli", "calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4},
    {"name": "Spinach", "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4},
    {"name": "Kale", "calories": 49, "protein": 4.3, "carbs": 8.8, "fat": 0.9},
    {"name": "Bell Peppers", "calories": 20, "protein": 0.9, "carbs": 4.6, "fat": 0.2},
    {"name": "Carrots", "calories": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2},
    {"name": "Cauliflower", "calories": 25, "protein": 1.9, "carbs": 5, "fat": 0.3},
    {"name": "Zucchini", "calories": 17, "protein": 1.2, "carbs": 3.1, "fat": 0.3},
    {"name": "Asparagus", "calories": 20, "protein": 2.2, "carbs": 3.9, "fat": 0.2},
    {"name": "Tomatoes", "calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2},
    {"name": "Mixed Greens", "calories": 17, "protein": 1.2, "carbs": 3.3, "fat": 0.2}
]

COMMON_FRUIT_SOURCES = [
    {"name": "Apple", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2},
    {"name": "Banana", "calories": 89, "protein": 1.1, "carbs": 22.8, "fat": 0.3},
    {"name": "Blueberries", "calories": 57, "protein": 0.7, "carbs": 14.5, "fat": 0.3},
    {"name": "Strawberries", "calories": 32, "protein": 0.7, "carbs": 7.7, "fat": 0.3},
    {"name": "Orange", "calories": 47, "protein": 0.9, "carbs": 11.8, "fat": 0.1},
    {"name": "Grapefruit", "calories": 32, "protein": 0.6, "carbs": 8, "fat": 0.1},
    {"name": "Grapes", "calories": 67, "protein": 0.6, "carbs": 17.2, "fat": 0.4},
    {"name": "Pineapple", "calories": 50, "protein": 0.5, "carbs": 13.1, "fat": 0.1},
    {"name": "Mango", "calories": 60, "protein": 0.8, "carbs": 15, "fat": 0.4},
    {"name": "Kiwi", "calories": 61, "protein": 1.1, "carbs": 14.7, "fat": 0.5}
]

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
    st.info(f"🏋️ {workout_type} training scheduled for {selected_day} ({workout_time}).")
    
    # Show training-based nutrition guidelines
    st.subheader("Workout-Based Nutrition Timing Guidelines")
    
    # Training timing explanation
    st.markdown("""
    ### Nutrient Timing Strategy
    Based on your workout timing, here's how to optimize your meal distribution:
    
    **General Principles:**
    - **Protein:** Distribute relatively evenly throughout the day, with slight increases post-workout and before bed
    - **Carbohydrates:** Higher around training times, lower further from training
    - **Fats:** Lower around training times, higher further from training
    """)
    
    # Specific recommendations based on workout time
    if workout_time == 'BEFORE 9AM':
        st.markdown("""
        **For your MORNING workout:**
        - **Pre-Workout Meal:** Low fat (10%), moderate protein (25-30%), higher carbs (60-65%)
        - **Post-Workout Meal:** Low fat (10-15%), high protein (35-40%), high carbs (45-55%)
        - **Later Meals:** Higher fat (30-40%), moderate protein (25-30%), lower carbs (30-35%)
        """)
    elif workout_time == '9AM-3PM':
        st.markdown("""
        **For your MIDDAY workout:**
        - **Early Morning Meal:** Moderate fat (20-25%), moderate protein (25-30%), moderate carbs (45-50%)
        - **Pre-Workout Meal:** Low fat (10%), moderate protein (30%), higher carbs (60%)
        - **Post-Workout Meal:** Low fat (10-15%), high protein (35-40%), high carbs (45-55%)
        - **Evening Meals:** Higher fat (30-40%), moderate protein (25-30%), lower carbs (30-35%)
        """)
    elif workout_time == '3PM-6PM':
        st.markdown("""
        **For your AFTERNOON workout:**
        - **Morning Meals:** Moderate fat (25-30%), moderate protein (25-30%), moderate carbs (40-45%)
        - **Pre-Workout Meal:** Low fat (10%), moderate protein (30%), higher carbs (60%)
        - **Post-Workout/Dinner:** Low fat (15%), high protein (35%), high carbs (50%)
        """)
    else:  # AFTER 6PM
        st.markdown("""
        **For your EVENING workout:**
        - **Morning/Afternoon Meals:** Moderate fat (25-30%), moderate protein (25-30%), moderate carbs (40-45%)
        - **Pre-Workout Meal:** Low fat (10%), moderate protein (30%), higher carbs (60%)
        - **Post-Workout/Night Meal:** Low fat (10%), high protein (40%), high carbs (50%)
        """)
else:
    st.info("🍽️ No workout scheduled for this day. Consider distributing macros evenly across meals, with slightly higher protein at breakfast and dinner.")

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
    
    # Create a section for this meal
    st.subheader(f"Meal {meal_num}: {meal_info['description']}")
    
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
        st.write("**Meal-Specific Targets:**")
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
    
    # Create columns for selecting food categories
    st.write("### Select Food Sources")
    food_category_tabs = st.tabs(["Protein", "Carbs", "Fats", "Vegetables", "Fruits"])
    
    # Protein sources tab
    with food_category_tabs[0]:
        st.subheader("Protein Sources")
        
        # Display pre-populated common protein sources with checkboxes
        protein_cols = st.columns(3)
        
        # Track selected proteins
        selected_proteins = []
        
        # Create checkboxes for common protein sources
        for i, protein in enumerate(COMMON_PROTEIN_SOURCES):
            col_idx = i % 3
            with protein_cols[col_idx]:
                protein_name = protein["name"]
                is_selected = st.checkbox(
                    f"{protein_name} ({protein['protein']}g P, {protein['carbs']}g C, {protein['fat']}g F)", 
                    value=protein_name in meal_data['protein_sources'],
                    key=f"protein_{selected_day}_{meal_num}_{i}"
                )
                
                if is_selected:
                    selected_proteins.append(protein_name)
                    # Add to selected foods if not already there
                    if not any(food['name'] == protein_name for food in st.session_state.selected_foods):
                        st.session_state.selected_foods.append(protein)
        
        # Update meal data with selected proteins
        meal_data['protein_sources'] = selected_proteins
    
    # Carb sources tab
    with food_category_tabs[1]:
        st.subheader("Carbohydrate Sources")
        
        # Display pre-populated common carb sources with checkboxes
        carb_cols = st.columns(3)
        
        # Track selected carbs
        selected_carbs = []
        
        # Create checkboxes for common carb sources
        for i, carb in enumerate(COMMON_CARB_SOURCES):
            col_idx = i % 3
            with carb_cols[col_idx]:
                carb_name = carb["name"]
                is_selected = st.checkbox(
                    f"{carb_name} ({carb['protein']}g P, {carb['carbs']}g C, {carb['fat']}g F)", 
                    value=carb_name in meal_data['carb_sources'],
                    key=f"carb_{selected_day}_{meal_num}_{i}"
                )
                
                if is_selected:
                    selected_carbs.append(carb_name)
                    # Add to selected foods if not already there
                    if not any(food['name'] == carb_name for food in st.session_state.selected_foods):
                        st.session_state.selected_foods.append(carb)
        
        # Update meal data with selected carbs
        meal_data['carb_sources'] = selected_carbs
    
    # Fat sources tab
    with food_category_tabs[2]:
        st.subheader("Fat Sources")
        
        # Display pre-populated common fat sources with checkboxes
        fat_cols = st.columns(3)
        
        # Track selected fats
        selected_fats = []
        
        # Create checkboxes for common fat sources
        for i, fat in enumerate(COMMON_FAT_SOURCES):
            col_idx = i % 3
            with fat_cols[col_idx]:
                fat_name = fat["name"]
                is_selected = st.checkbox(
                    f"{fat_name} ({fat['protein']}g P, {fat['carbs']}g C, {fat['fat']}g F)", 
                    value=fat_name in meal_data['fat_sources'],
                    key=f"fat_{selected_day}_{meal_num}_{i}"
                )
                
                if is_selected:
                    selected_fats.append(fat_name)
                    # Add to selected foods if not already there
                    if not any(food['name'] == fat_name for food in st.session_state.selected_foods):
                        st.session_state.selected_foods.append(fat)
        
        # Update meal data with selected fats
        meal_data['fat_sources'] = selected_fats
    
    # Vegetable sources tab
    with food_category_tabs[3]:
        st.subheader("Vegetables")
        
        # Display pre-populated common vegetable sources with checkboxes
        veg_cols = st.columns(3)
        
        # Track selected vegetables
        selected_veggies = []
        
        # Create checkboxes for common vegetable sources
        for i, veg in enumerate(COMMON_VEGETABLE_SOURCES):
            col_idx = i % 3
            with veg_cols[col_idx]:
                veg_name = veg["name"]
                is_selected = st.checkbox(
                    f"{veg_name} ({veg['protein']}g P, {veg['carbs']}g C, {veg['fat']}g F)", 
                    value=veg_name in meal_data['vegetable_sources'],
                    key=f"veg_{selected_day}_{meal_num}_{i}"
                )
                
                if is_selected:
                    selected_veggies.append(veg_name)
                    # Add to selected foods if not already there
                    if not any(food['name'] == veg_name for food in st.session_state.selected_foods):
                        st.session_state.selected_foods.append(veg)
        
        # Update meal data with selected vegetables
        meal_data['vegetable_sources'] = selected_veggies
    
    # Fruit sources tab
    with food_category_tabs[4]:
        st.subheader("Fruits")
        
        # Display pre-populated common fruit sources with checkboxes
        fruit_cols = st.columns(3)
        
        # Track selected fruits
        selected_fruits = []
        
        # Create checkboxes for common fruit sources
        for i, fruit in enumerate(COMMON_FRUIT_SOURCES):
            col_idx = i % 3
            with fruit_cols[col_idx]:
                fruit_name = fruit["name"]
                is_selected = st.checkbox(
                    f"{fruit_name} ({fruit['protein']}g P, {fruit['carbs']}g C, {fruit['fat']}g F)", 
                    value=fruit_name in meal_data['fruit_sources'],
                    key=f"fruit_{selected_day}_{meal_num}_{i}"
                )
                
                if is_selected:
                    selected_fruits.append(fruit_name)
                    # Add to selected foods if not already there
                    if not any(food['name'] == fruit_name for food in st.session_state.selected_foods):
                        st.session_state.selected_foods.append(fruit)
        
        # Update meal data with selected fruits
        meal_data['fruit_sources'] = selected_fruits
    
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
            
            # Store portions in session state if not already there
            portion_key = f"portions_{selected_day}_{meal_num}"
            if portion_key not in st.session_state:
                st.session_state[portion_key] = {food['name']: optimal_portions.get(food['name'], 100) for food in meal_foods}
            
            st.write("**Adjust Portion Sizes:**")
            st.write("Drag the sliders to adjust portion sizes and see how it affects your macro budget.")
            
            # Create table of adjustable portions and nutrition
            portion_data = []
            meal_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            
            # Create columns for each food item to display with sliders
            food_cols = st.columns(2)
            
            for i, food in enumerate(meal_foods):
                col_idx = i % 2
                with food_cols[col_idx]:
                    # Default to the optimal portion
                    if food['name'] not in st.session_state[portion_key]:
                        st.session_state[portion_key][food['name']] = optimal_portions.get(food['name'], 100)
                    
                    # Create a slider for adjusting portion
                    portion = st.slider(
                        f"{food['name']} (g)",
                        min_value=10,
                        max_value=500,
                        value=int(st.session_state[portion_key][food['name']]),
                        key=f"portion_slider_{selected_day}_{meal_num}_{i}"
                    )
                    
                    # Update session state with new portion
                    st.session_state[portion_key][food['name']] = portion
                    
                    # Calculate nutrition for this portion
                    calories = food['calories'] * portion / 100
                    protein = food['protein'] * portion / 100
                    carbs = food['carbs'] * portion / 100
                    fat = food['fat'] * portion / 100
                    
                    # Display nutrition info
                    st.write(f"**Nutrients:** {calories:.0f} kcal | {protein:.1f}g P | {carbs:.1f}g C | {fat:.1f}g F")
                
                # Calculate nutrition for this portion (for overall totals)
                calories = food['calories'] * portion / 100
                protein = food['protein'] * portion / 100
                carbs = food['carbs'] * portion / 100
                fat = food['fat'] * portion / 100
                
                # Add to meal total
                meal_nutrition['calories'] += calories
                meal_nutrition['protein'] += protein
                meal_nutrition['carbs'] += carbs
                meal_nutrition['fat'] += fat
                
                # Add to table for summary
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
            
            # Show remaining macro budget for the day
            st.write("**Remaining Daily Macro Budget:**")
            remaining_cols = st.columns(4)
            
            # Calculate remaining macros
            remaining_calories = targets.get('target_calories', 0) - meal_nutrition['calories']
            remaining_protein = targets.get('protein', 0) - meal_nutrition['protein']
            remaining_carbs = targets.get('carbs', 0) - meal_nutrition['carbs']
            remaining_fat = targets.get('fat', 0) - meal_nutrition['fat']
            
            with remaining_cols[0]:
                st.metric("Calories", f"{remaining_calories:.0f} kcal")
            with remaining_cols[1]:
                st.metric("Protein", f"{remaining_protein:.1f}g")
            with remaining_cols[2]:
                st.metric("Carbs", f"{remaining_carbs:.1f}g")
            with remaining_cols[3]:
                st.metric("Fat", f"{remaining_fat:.1f}g")
            
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