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
tab1, tab2, tab3 = st.tabs(["Plan Your Meals", "Meal Library", "Grocery List"])

with tab1:
    st.header("Daily Meal Planning")
    
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
    
    # Create two columns for form inputs
    col1, col2 = st.columns(2)
    
    with col1:
        # Day of the week selection
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_of_week = st.selectbox("Day of the Week", days_of_week)
        
        # Day type selection
        day_types = ['Rest Day', 'Training Day - Light', 'Training Day - Moderate', 'Training Day - Intense']
        day_type = st.selectbox("Day Type", day_types)
        
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
                    st.markdown(f"**{meal['name']}** - *{meal.get('time', 'Time not specified')}*")
                    
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
                    
                    # Display foods (if any)
                    if 'foods' in meal and meal['foods']:
                        st.write("Foods:")
                        for food in meal['foods']:
                            st.write(f"- {food['name']}: {food['amount']} {food['unit']}")
                    else:
                        st.info("No foods assigned to this meal yet. You can add them in the Meal Library tab.")
                    
                    st.markdown("---")
            else:
                st.info("No meals have been planned yet. Click 'Generate Meal Plan' to distribute your nutrition targets.")
            
            if 'snacks' in plan and plan['snacks'] and len(plan['snacks']) > 0:
                st.subheader("Snacks")
                
                for i, snack in enumerate(plan['snacks']):
                    st.markdown(f"**{snack['name']}**")
                    
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
                        st.write("Foods:")
                        for food in snack['foods']:
                            st.write(f"- {food['name']}: {food['amount']} {food['unit']}")
                    else:
                        st.info("No foods assigned to this snack yet. You can add them in the Meal Library tab.")
                    
                    st.markdown("---")
        
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
    
    # Nutrition summary section if plans exist
    if st.session_state.meal_plans:
        st.header("Weekly Nutrition Overview")
        
        # Create a dataframe for the weekly overview
        weekly_data = []
        
        for day in days_of_week:
            if day in st.session_state.meal_plans:
                plan = st.session_state.meal_plans[day]
                
                # Check for training session for display
                training_status = "Rest Day"
                if 'training_sessions' in plan and plan['training_sessions'] and plan['training_sessions'][0] != "No Training":
                    if len(plan['training_sessions']) == 1:
                        training_status = "1 Session"
                    else:
                        training_status = f"{len(plan['training_sessions'])} Sessions"
                
                weekly_data.append({
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
                weekly_data.append({
                    "Day": day,
                    "Day Type": "Not Planned",
                    "Training": "",
                    "Meals": 0,
                    "Snacks": 0,
                    "Calories": 0,
                    "Protein (g)": 0,
                    "Carbs (g)": 0,
                    "Fat (g)": 0
                })
        
        weekly_df = pd.DataFrame(weekly_data)
        st.dataframe(weekly_df, use_container_width=True)
        
        # Calculate weekly totals and averages
        planned_days_df = weekly_df[weekly_df["Day Type"] != "Not Planned"]
        
        if not planned_days_df.empty:
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
                st.subheader("Weekly Totals")
                st.write(f"Total Calories: {weekly_calories} kcal")
                st.write(f"Total Protein: {weekly_protein} g")
                st.write(f"Total Carbs: {weekly_carbs} g")
                st.write(f"Total Fat: {weekly_fat} g")
            
            with col2:
                st.subheader("Daily Averages")
                st.write(f"Average Calories: {avg_calories:.1f} kcal")
                st.write(f"Average Protein: {avg_protein:.1f} g")
                st.write(f"Average Carbs: {avg_carbs:.1f} g")
                st.write(f"Average Fat: {avg_fat:.1f} g")

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