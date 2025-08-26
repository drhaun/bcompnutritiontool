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
from common_foods_database import (
    get_all_foods, 
    get_food_by_category,
    calculate_nutrition_for_amount, 
    search_foods,
    get_foods_by_macro_profile
)
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
    # Extract target values - fix key names for calories
    target_calories = target_macros.get('calories', target_macros.get('target_calories', 0))
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

# Get food options from the database
def get_food_options():
    """Get food options from local database"""
    all_foods = get_all_foods()
    proteins = get_food_by_category("proteins")
    carbs = get_food_by_category("carbs")
    fats = get_food_by_category("fats")
    
    # Convert to list format needed by optimizer
    protein_sources = [{"name": name, **nutrition} for name, nutrition in proteins.items()]
    carb_sources = [{"name": name, **nutrition} for name, nutrition in carbs.items()]
    fat_sources = [{"name": name, **nutrition} for name, nutrition in fats.items()]
    
    return protein_sources, carb_sources, fat_sources

# Get food lists from database
COMMON_PROTEIN_SOURCES, COMMON_CARB_SOURCES, COMMON_FAT_SOURCES = get_food_options()

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
            st.metric("Calories", f"{targets.get('calories', 0):.0f} kcal")
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

# Temporary variable to track all nutrition for the day
daily_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}

# For each meal
for meal_num in range(1, total_meals + 1):
    # Get meal distribution for this meal
    meal_distribution = get_meal_distribution(selected_day, total_meals)
    meal_info = meal_distribution.get(meal_num, {'description': f'Meal {meal_num}', 'protein': 1/total_meals, 'carbs': 1/total_meals, 'fat': 1/total_meals})
    
    # Create a section for this meal
    st.subheader(f"Meal {meal_num}: {meal_info['description']}")
    
    # Calculate meal-specific targets first to show both percentages and grams
    if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
        targets = st.session_state.day_specific_nutrition[selected_day]
        meal_targets = {
            'calories': targets.get('calories', 0) / total_meals,  # Equal calorie distribution
            'protein': targets.get('protein', 0) * meal_info['protein'],
            'carbs': targets.get('carbs', 0) * meal_info['carbs'],
            'fat': targets.get('fat', 0) * meal_info['fat']
        }
        
        # Display comprehensive meal distribution with both percentages and gram targets
        st.info(f"""**Recommended distribution:** Protein: {meal_info['protein']*100:.0f}% ({meal_targets['protein']:.0f}g), 
Carbs: {meal_info['carbs']*100:.0f}% ({meal_targets['carbs']:.0f}g), 
Fat: {meal_info['fat']*100:.0f}% ({meal_targets['fat']:.0f}g)""")
        
        # Display meal targets
        st.write("**Meal-Specific Targets:**")
        meal_target_cols = st.columns(4)
        with meal_target_cols[0]:
            st.metric("Calories", f"{meal_targets['calories']:.0f} kcal")
        with meal_target_cols[1]:
            st.metric("Protein", f"{meal_targets['protein']:.0f}g")
        with meal_target_cols[2]:
            st.metric("Carbs", f"{meal_targets['carbs']:.0f}g")
        with meal_target_cols[3]:
            st.metric("Fat", f"{meal_targets['fat']:.0f}g")
    else:
        # Show just percentages if no nutrition targets are set
        st.info(f"**Recommended distribution:** Protein: {meal_info['protein']*100:.0f}%, Carbs: {meal_info['carbs']*100:.0f}%, Fat: {meal_info['fat']*100:.0f}%")
    
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
        protein_tab_selection = st.radio(
            "Protein Source Selection",
            ["Common Protein Foods", "Search USDA Database"],
            key=f"protein_source_selection_{selected_day}_{meal_num}"
        )
        
        # Track selected proteins
        selected_proteins = list(meal_data['protein_sources'])
        
        if protein_tab_selection == "Common Protein Foods":
            # Display pre-populated common protein sources with checkboxes
            protein_cols = st.columns(3)
            
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
                    
                    if is_selected and protein_name not in selected_proteins:
                        selected_proteins.append(protein_name)
                        # Add to selected foods if not already there
                        if not any(food['name'] == protein_name for food in st.session_state.selected_foods):
                            st.session_state.selected_foods.append(protein)
                    elif not is_selected and protein_name in selected_proteins:
                        selected_proteins.remove(protein_name)
        else:
            # Search for protein foods from USDA database
            st.subheader("Search USDA Database for Protein Sources")
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
                            
                            # Allow selecting from search results
                            search_protein_selection = st.multiselect(
                                "Select protein sources from search results:",
                                [food['name'] for food in protein_foods[:10]],
                                default=[name for name in meal_data['protein_sources'] if name in [food['name'] for food in protein_foods[:10]]]
                            )
                            
                            # Add selected proteins from search
                            for protein_name in search_protein_selection:
                                if protein_name not in selected_proteins:
                                    selected_proteins.append(protein_name)
                                    # Add to selected foods if not already there
                                    selected_food = next((food for food in protein_foods if food['name'] == protein_name), None)
                                    if selected_food and not any(food['name'] == protein_name for food in st.session_state.selected_foods):
                                        st.session_state.selected_foods.append(selected_food)
                            
                            # Remove unselected proteins
                            for protein_name in list(selected_proteins):
                                if protein_name in [food['name'] for food in protein_foods[:10]] and protein_name not in search_protein_selection:
                                    selected_proteins.remove(protein_name)
                        else:
                            st.warning("No protein-rich foods found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
        
        # Update meal data with selected proteins
        meal_data['protein_sources'] = selected_proteins
        
        # Display currently selected protein sources
        if selected_proteins:
            st.write("**Selected Protein Sources:**")
            for protein in selected_proteins:
                st.write(f"- {protein}")
        else:
            st.write("No protein sources selected yet.")
    
    # Carb sources tab
    with food_category_tabs[1]:
        carb_tab_selection = st.radio(
            "Carbohydrate Source Selection",
            ["Common Carb Foods", "Search USDA Database"],
            key=f"carb_source_selection_{selected_day}_{meal_num}"
        )
        
        # Track selected carbs
        selected_carbs = list(meal_data['carb_sources'])
        
        if carb_tab_selection == "Common Carb Foods":
            # Display pre-populated common carb sources with checkboxes
            carb_cols = st.columns(3)
            
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
                    
                    if is_selected and carb_name not in selected_carbs:
                        selected_carbs.append(carb_name)
                        # Add to selected foods if not already there
                        if not any(food['name'] == carb_name for food in st.session_state.selected_foods):
                            st.session_state.selected_foods.append(carb)
                    elif not is_selected and carb_name in selected_carbs:
                        selected_carbs.remove(carb_name)
        else:
            # Search for carb foods from USDA database
            st.subheader("Search USDA Database for Carbohydrate Sources")
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
                            
                            # Allow selecting from search results
                            search_carb_selection = st.multiselect(
                                "Select carbohydrate sources from search results:",
                                [food['name'] for food in carb_foods[:10]],
                                default=[name for name in meal_data['carb_sources'] if name in [food['name'] for food in carb_foods[:10]]]
                            )
                            
                            # Add selected carbs from search
                            for carb_name in search_carb_selection:
                                if carb_name not in selected_carbs:
                                    selected_carbs.append(carb_name)
                                    # Add to selected foods if not already there
                                    selected_food = next((food for food in carb_foods if food['name'] == carb_name), None)
                                    if selected_food and not any(food['name'] == carb_name for food in st.session_state.selected_foods):
                                        st.session_state.selected_foods.append(selected_food)
                            
                            # Remove unselected carbs
                            for carb_name in list(selected_carbs):
                                if carb_name in [food['name'] for food in carb_foods[:10]] and carb_name not in search_carb_selection:
                                    selected_carbs.remove(carb_name)
                        else:
                            st.warning("No carb-rich foods found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
        
        # Update meal data with selected carbs
        meal_data['carb_sources'] = selected_carbs
        
        # Display currently selected carb sources
        if selected_carbs:
            st.write("**Selected Carbohydrate Sources:**")
            for carb in selected_carbs:
                st.write(f"- {carb}")
        else:
            st.write("No carbohydrate sources selected yet.")
    
    # Fat sources tab
    with food_category_tabs[2]:
        fat_tab_selection = st.radio(
            "Fat Source Selection",
            ["Common Fat Foods", "Search USDA Database"],
            key=f"fat_source_selection_{selected_day}_{meal_num}"
        )
        
        # Track selected fats
        selected_fats = list(meal_data['fat_sources'])
        
        if fat_tab_selection == "Common Fat Foods":
            # Display pre-populated common fat sources with checkboxes
            fat_cols = st.columns(3)
            
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
                    
                    if is_selected and fat_name not in selected_fats:
                        selected_fats.append(fat_name)
                        # Add to selected foods if not already there
                        if not any(food['name'] == fat_name for food in st.session_state.selected_foods):
                            st.session_state.selected_foods.append(fat)
                    elif not is_selected and fat_name in selected_fats:
                        selected_fats.remove(fat_name)
        else:
            # Search for fat foods from USDA database
            st.subheader("Search USDA Database for Fat Sources")
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
                            
                            # Allow selecting from search results
                            search_fat_selection = st.multiselect(
                                "Select fat sources from search results:",
                                [food['name'] for food in fat_foods[:10]],
                                default=[name for name in meal_data['fat_sources'] if name in [food['name'] for food in fat_foods[:10]]]
                            )
                            
                            # Add selected fats from search
                            for fat_name in search_fat_selection:
                                if fat_name not in selected_fats:
                                    selected_fats.append(fat_name)
                                    # Add to selected foods if not already there
                                    selected_food = next((food for food in fat_foods if food['name'] == fat_name), None)
                                    if selected_food and not any(food['name'] == fat_name for food in st.session_state.selected_foods):
                                        st.session_state.selected_foods.append(selected_food)
                            
                            # Remove unselected fats
                            for fat_name in list(selected_fats):
                                if fat_name in [food['name'] for food in fat_foods[:10]] and fat_name not in search_fat_selection:
                                    selected_fats.remove(fat_name)
                        else:
                            st.warning("No fat-rich foods found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
        
        # Update meal data with selected fats
        meal_data['fat_sources'] = selected_fats
        
        # Display currently selected fat sources
        if selected_fats:
            st.write("**Selected Fat Sources:**")
            for fat in selected_fats:
                st.write(f"- {fat}")
        else:
            st.write("No fat sources selected yet.")
    
    # Vegetable sources tab
    with food_category_tabs[3]:
        veg_tab_selection = st.radio(
            "Vegetable Source Selection",
            ["Common Vegetables", "Search USDA Database"],
            key=f"veg_source_selection_{selected_day}_{meal_num}"
        )
        
        # Track selected vegetables
        selected_veggies = list(meal_data['vegetable_sources'])
        
        if veg_tab_selection == "Common Vegetables":
            # Display pre-populated common vegetable sources with checkboxes
            veg_cols = st.columns(3)
            
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
                    
                    if is_selected and veg_name not in selected_veggies:
                        selected_veggies.append(veg_name)
                        # Add to selected foods if not already there
                        if not any(food['name'] == veg_name for food in st.session_state.selected_foods):
                            st.session_state.selected_foods.append(veg)
                    elif not is_selected and veg_name in selected_veggies:
                        selected_veggies.remove(veg_name)
        else:
            # Search for vegetable foods from USDA database
            st.subheader("Search USDA Database for Vegetables")
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
                            
                            # Allow selecting from search results
                            search_veg_selection = st.multiselect(
                                "Select vegetables from search results:",
                                [food['name'] for food in veg_foods[:10]],
                                default=[name for name in meal_data['vegetable_sources'] if name in [food['name'] for food in veg_foods[:10]]]
                            )
                            
                            # Add selected vegetables from search
                            for veg_name in search_veg_selection:
                                if veg_name not in selected_veggies:
                                    selected_veggies.append(veg_name)
                                    # Add to selected foods if not already there
                                    selected_food = next((food for food in veg_foods if food['name'] == veg_name), None)
                                    if selected_food and not any(food['name'] == veg_name for food in st.session_state.selected_foods):
                                        st.session_state.selected_foods.append(selected_food)
                            
                            # Remove unselected vegetables
                            for veg_name in list(selected_veggies):
                                if veg_name in [food['name'] for food in veg_foods[:10]] and veg_name not in search_veg_selection:
                                    selected_veggies.remove(veg_name)
                        else:
                            st.warning("No vegetables found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
        
        # Update meal data with selected vegetables
        meal_data['vegetable_sources'] = selected_veggies
        
        # Display currently selected vegetable sources
        if selected_veggies:
            st.write("**Selected Vegetables:**")
            for veg in selected_veggies:
                st.write(f"- {veg}")
        else:
            st.write("No vegetables selected yet.")
    
    # Fruit sources tab
    with food_category_tabs[4]:
        fruit_tab_selection = st.radio(
            "Fruit Source Selection",
            ["Common Fruits", "Search USDA Database"],
            key=f"fruit_source_selection_{selected_day}_{meal_num}"
        )
        
        # Track selected fruits
        selected_fruits = list(meal_data['fruit_sources'])
        
        if fruit_tab_selection == "Common Fruits":
            # Display pre-populated common fruit sources with checkboxes
            fruit_cols = st.columns(3)
            
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
                    
                    if is_selected and fruit_name not in selected_fruits:
                        selected_fruits.append(fruit_name)
                        # Add to selected foods if not already there
                        if not any(food['name'] == fruit_name for food in st.session_state.selected_foods):
                            st.session_state.selected_foods.append(fruit)
                    elif not is_selected and fruit_name in selected_fruits:
                        selected_fruits.remove(fruit_name)
        else:
            # Search for fruit foods from USDA database
            st.subheader("Search USDA Database for Fruits")
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
                            
                            # Allow selecting from search results
                            search_fruit_selection = st.multiselect(
                                "Select fruits from search results:",
                                [food['name'] for food in fruit_foods[:10]],
                                default=[name for name in meal_data['fruit_sources'] if name in [food['name'] for food in fruit_foods[:10]]]
                            )
                            
                            # Add selected fruits from search
                            for fruit_name in search_fruit_selection:
                                if fruit_name not in selected_fruits:
                                    selected_fruits.append(fruit_name)
                                    # Add to selected foods if not already there
                                    selected_food = next((food for food in fruit_foods if food['name'] == fruit_name), None)
                                    if selected_food and not any(food['name'] == fruit_name for food in st.session_state.selected_foods):
                                        st.session_state.selected_foods.append(selected_food)
                            
                            # Remove unselected fruits
                            for fruit_name in list(selected_fruits):
                                if fruit_name in [food['name'] for food in fruit_foods[:10]] and fruit_name not in search_fruit_selection:
                                    selected_fruits.remove(fruit_name)
                        else:
                            st.warning("No fruits found. Try a different search term.")
                    else:
                        st.warning("No results found. Try a different search term.")
        
        # Update meal data with selected fruits
        meal_data['fruit_sources'] = selected_fruits
        
        # Display currently selected fruit sources
        if selected_fruits:
            st.write("**Selected Fruits:**")
            for fruit in selected_fruits:
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
                'calories': targets.get('calories', 0) * meal_info['protein'],
                'protein': targets.get('protein', 0) * meal_info['protein'],
                'carbs': targets.get('carbs', 0) * meal_info['carbs'],
                'fat': targets.get('fat', 0) * meal_info['fat']
            }
            
            # Store portions in session state if not already there
            portion_key = f"portions_{selected_day}_{meal_num}"
            if portion_key not in st.session_state:
                # Calculate optimal portions
                optimal_portions = calculate_optimal_portions(meal_foods, meal_targets)
                st.session_state[portion_key] = {food['name']: optimal_portions.get(food['name'], 100) for food in meal_foods}
            else:
                # Update with any new foods
                for food in meal_foods:
                    if food['name'] not in st.session_state[portion_key]:
                        # Calculate optimal for just this food
                        food_portion = calculate_optimal_portions([food], meal_targets).get(food['name'], 100)
                        st.session_state[portion_key][food['name']] = food_portion
                
                # Remove any foods no longer selected
                for food_name in list(st.session_state[portion_key].keys()):
                    if food_name not in [food['name'] for food in meal_foods]:
                        del st.session_state[portion_key][food_name]
            
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
                if meal_targets['calories'] > 0:
                    cal_pct = (meal_nutrition['calories'] / meal_targets['calories']) * 100
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
            
            # Add to daily nutrition totals
            daily_nutrition['calories'] += meal_nutrition['calories']
            daily_nutrition['protein'] += meal_nutrition['protein']
            daily_nutrition['carbs'] += meal_nutrition['carbs']
            daily_nutrition['fat'] += meal_nutrition['fat']
            
            # Calculate remaining macros for this meal
            remaining_calories = targets.get('calories', 0) - daily_nutrition['calories']
            remaining_protein = targets.get('protein', 0) - daily_nutrition['protein']
            remaining_carbs = targets.get('carbs', 0) - daily_nutrition['carbs']
            remaining_fat = targets.get('fat', 0) - daily_nutrition['fat']
            
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
                    'calories': targets.get('calories', 0) * meal_info.get('protein', 1/total_meals),
                    'protein': targets.get('protein', 0) * meal_info.get('protein', 1/total_meals),
                    'carbs': targets.get('carbs', 0) * meal_info.get('carbs', 1/total_meals),
                    'fat': targets.get('fat', 0) * meal_info.get('fat', 1/total_meals)
                }
                
                # Calculate meal nutrition using stored portions
                meal_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
                portion_key = f"portions_{selected_day}_{meal_num}"
                
                for food in meal_foods:
                    # Get the portion from session state or use default
                    portion = 100
                    if portion_key in st.session_state and food['name'] in st.session_state[portion_key]:
                        portion = st.session_state[portion_key][food['name']]
                    
                    # Calculate nutrition for this portion
                    meal_nutrition['calories'] += food['calories'] * portion / 100
                    meal_nutrition['protein'] += food['protein'] * portion / 100
                    meal_nutrition['carbs'] += food['carbs'] * portion / 100
                    meal_nutrition['fat'] += food['fat'] * portion / 100
                
                # Display meal nutrition
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
            if targets.get('calories', 0) > 0:
                cal_pct = (daily_nutrition['calories'] / targets['calories']) * 100
            st.metric("Calories", f"{daily_nutrition['calories']:.0f} kcal", f"{cal_pct:.0f}% of target")
        
        with total_cols[1]:
            pro_pct = 0
            if targets.get('protein', 0) > 0:
                pro_pct = (daily_nutrition['protein'] / targets['protein']) * 100
            st.metric("Protein", f"{daily_nutrition['protein']:.1f}g", f"{pro_pct:.0f}% of target")
        
        with total_cols[2]:
            carb_pct = 0
            if targets.get('carbs', 0) > 0:
                carb_pct = (daily_nutrition['carbs'] / targets['carbs']) * 100
            st.metric("Carbs", f"{daily_nutrition['carbs']:.1f}g", f"{carb_pct:.0f}% of target")
        
        with total_cols[3]:
            fat_pct = 0
            if targets.get('fat', 0) > 0:
                fat_pct = (daily_nutrition['fat'] / targets['fat']) * 100
            st.metric("Fat", f"{daily_nutrition['fat']:.1f}g", f"{fat_pct:.0f}% of target")
        
        # Calculate macronutrient percentages
        if daily_nutrition['calories'] > 0:
            protein_pct = (daily_nutrition['protein'] * 4 / daily_nutrition['calories']) * 100
            carbs_pct = (daily_nutrition['carbs'] * 4 / daily_nutrition['calories']) * 100
            fat_pct = (daily_nutrition['fat'] * 9 / daily_nutrition['calories']) * 100
            
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