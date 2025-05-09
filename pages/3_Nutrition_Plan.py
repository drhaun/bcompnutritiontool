import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import sys
import os
import matplotlib.pyplot as plt

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Nutrition Plan",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Check if user has completed the initial setup and goals
if not st.session_state.user_info['gender'] or not st.session_state.goal_info.get('goal_type'):
    st.warning("Please complete the Initial Setup and Body Composition Goals first!")
    st.stop()

st.title("Nutrition Plan")
st.markdown("Based on your goals, here's your personalized nutrition plan.")

# Calculate TDEE and nutrition targets if not already set
if not st.session_state.nutrition_plan.get('target_calories'):
    # Get user information
    gender = st.session_state.user_info['gender']
    weight_kg = st.session_state.user_info['weight_kg']
    height_cm = st.session_state.user_info['height_cm']
    age = st.session_state.user_info['age']
    activity_level = st.session_state.user_info['activity_level']
    workouts_per_week = st.session_state.user_info.get('workouts_per_week', 0)
    workout_calories = st.session_state.user_info.get('workout_calories', 0)
    
    # Get goal information
    goal_type = st.session_state.goal_info['goal_type']
    target_weight = st.session_state.goal_info['target_weight_kg']
    timeline_weeks = st.session_state.goal_info['timeline_weeks']
    
    # Calculate weekly change rate
    weekly_change = (target_weight - weight_kg) / timeline_weeks
    
    # Calculate TDEE with workout calories
    tdee = utils.calculate_tdee(
        gender, 
        weight_kg, 
        height_cm, 
        age, 
        activity_level, 
        workouts_per_week, 
        workout_calories
    )
    
    # Calculate target calories based on goal
    target_calories = utils.calculate_target_calories(tdee, goal_type, abs(weekly_change))
    
    # Calculate macros
    macros = utils.calculate_macros(target_calories, weight_kg, goal_type)
    
    # Set nutrition plan
    st.session_state.nutrition_plan = {
        'tdee': round(tdee),
        'target_calories': round(target_calories),
        'target_protein': macros['protein'],
        'target_carbs': macros['carbs'],
        'target_fat': macros['fat'],
        'weekly_adjustments': []
    }
    
    # Save data
    utils.save_data()

# Display current nutrition plan
st.subheader("Your Nutrition Targets")

# Show TDEE and target calories with explanation
col1, col2 = st.columns(2)
with col1:
    st.metric("Total Daily Energy Expenditure (TDEE)", f"{st.session_state.nutrition_plan.get('tdee', 0)} kcal", 
              help="This is an estimate of how many calories you burn daily based on your body stats and activity level.")
with col2:
    calorie_deficit = st.session_state.nutrition_plan.get('tdee', 0) - st.session_state.nutrition_plan['target_calories']
    calorie_surplus = st.session_state.nutrition_plan['target_calories'] - st.session_state.nutrition_plan.get('tdee', 0)
    
    if st.session_state.goal_info['goal_type'] == "lose_fat":
        delta = f"-{abs(calorie_deficit)} kcal (deficit)"
    elif st.session_state.goal_info['goal_type'] == "gain_muscle":
        delta = f"+{calorie_surplus} kcal (surplus)"
    else:
        delta = "Maintenance"
        
    st.metric("Daily Calorie Target", f"{st.session_state.nutrition_plan['target_calories']} kcal", delta)

# Show macronutrient breakdown
st.subheader("Macronutrient Breakdown")

col1, col2, col3 = st.columns(3)
with col1:
    protein_per_lb = round(st.session_state.nutrition_plan['target_protein'] / (st.session_state.user_info['weight_kg'] * 2.20462), 2)
    st.metric("Protein", f"{st.session_state.nutrition_plan['target_protein']} g", f"{protein_per_lb} g/lb bodyweight")
with col2:
    st.metric("Carbohydrates", f"{st.session_state.nutrition_plan['target_carbs']} g")
with col3:
    st.metric("Fat", f"{st.session_state.nutrition_plan['target_fat']} g")

# Calculate macronutrient ratios and display as pie chart
protein_calories = st.session_state.nutrition_plan['target_protein'] * 4
carb_calories = st.session_state.nutrition_plan['target_carbs'] * 4
fat_calories = st.session_state.nutrition_plan['target_fat'] * 9
total_calories = protein_calories + carb_calories + fat_calories

# Initialize variables with defaults to avoid unbound errors
protein_pct = 0
carb_pct = 0
fat_pct = 0

# Protect against division by zero or NaN values
if total_calories > 0:
    # Calculate percentages
    protein_pct = protein_calories / total_calories * 100
    carb_pct = carb_calories / total_calories * 100
    fat_pct = fat_calories / total_calories * 100

    # Create pie chart
    fig, ax = plt.subplots(figsize=(6, 6))
    labels = [f'Protein ({protein_pct:.0f}%)', f'Carbs ({carb_pct:.0f}%)', f'Fat ({fat_pct:.0f}%)']
    sizes = [protein_pct, carb_pct, fat_pct]
    colors = ['#ff9999', '#66b3ff', '#99ff99']

    # Simplified pie chart without shadow and explode to avoid errors
    ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
else:
    # Create a placeholder chart if no valid macros are set
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.text(0.5, 0.5, 'No valid macronutrient data', 
           horizontalalignment='center', verticalalignment='center', fontsize=12)
    ax.axis('off')
ax.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
plt.title("Macronutrient Ratio")

# Display in Streamlit
col1, col2 = st.columns([2, 3])
with col1:
    st.pyplot(fig)
with col2:
    if total_calories > 0:
        st.markdown(f"""
        ### Macros Explained
        
        Your daily targets break down as:
        - **Protein: {st.session_state.nutrition_plan['target_protein']} g** ({protein_pct:.0f}% of calories)
        - **Carbs: {st.session_state.nutrition_plan['target_carbs']} g** ({carb_pct:.0f}% of calories)
        - **Fat: {st.session_state.nutrition_plan['target_fat']} g** ({fat_pct:.0f}% of calories)
        
        This plan is optimized for your {st.session_state.goal_info['goal_type'].replace('_', ' ')} goal.
        
        - Protein supports muscle retention/growth ({protein_per_lb} g/lb of bodyweight)
        - Carbs provide energy for workouts and recovery
        - Fat supports hormone production and overall health
        """)
    else:
        st.markdown("""
        ### Macros Explained
        
        Please update your nutrition plan with valid macronutrient values.
        """)

# Manual Adjustment Form
st.subheader("Adjust Your Plan (Optional)")
st.markdown("If you'd like to customize your nutrition targets, you can make adjustments below.")

with st.form("nutrition_adjustment_form"):
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        calories = st.number_input(
            "Daily Calories",
            min_value=1000,
            max_value=10000,
            value=st.session_state.nutrition_plan['target_calories'],
            step=50
        )
    
    with col2:
        protein = st.number_input(
            "Protein (g)",
            min_value=50,
            max_value=500,
            value=st.session_state.nutrition_plan['target_protein'],
            step=5
        )
    
    with col3:
        carbs = st.number_input(
            "Carbohydrates (g)",
            min_value=20,
            max_value=1000,
            value=st.session_state.nutrition_plan['target_carbs'],
            step=5
        )
    
    with col4:
        fat = st.number_input(
            "Fat (g)",
            min_value=20,
            max_value=500,
            value=st.session_state.nutrition_plan['target_fat'],
            step=5
        )
    
    # Check if macros add up to target calories
    calculated_calories = (protein * 4) + (carbs * 4) + (fat * 9)
    calorie_diff = abs(calculated_calories - calories)
    
    if calorie_diff > 50:
        st.warning(f"Your macronutrient selections add up to {calculated_calories} calories, which is {calorie_diff} calories different from your target. Consider adjusting your macros.")
    
    submit_button = st.form_submit_button("Update Nutrition Plan")
    
    if submit_button:
        # Update session state
        st.session_state.nutrition_plan['target_calories'] = calories
        st.session_state.nutrition_plan['target_protein'] = protein
        st.session_state.nutrition_plan['target_carbs'] = carbs
        st.session_state.nutrition_plan['target_fat'] = fat
        
        # Save data
        utils.save_data()
        
        st.success("Nutrition plan updated!")
        st.rerun()  # Rerun to update the display

# Meal Plan Guidance
st.subheader("Meal Planning Guidance")

# Calculate meal distribution based on 3-5 meals per day
meal_examples = []

# 3 Meals
meals_3 = [
    {
        'name': 'Breakfast (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    },
    {
        'name': 'Lunch (40%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.4),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.4),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.4),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.4),
    },
    {
        'name': 'Dinner (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    }
]

# 5 Meals
meals_5 = [
    {
        'name': 'Breakfast (20%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.2),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.2),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.2),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.2),
    },
    {
        'name': 'Mid-Morning Snack (15%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.15),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.15),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.15),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.15),
    },
    {
        'name': 'Lunch (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    },
    {
        'name': 'Afternoon Snack (15%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.15),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.15),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.15),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.15),
    },
    {
        'name': 'Dinner (20%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.2),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.2),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.2),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.2),
    }
]

# 4 Meals with pre/post workout focus
meals_4_workout = [
    {
        'name': 'Breakfast (25%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.25),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.25),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.25),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    },
    {
        'name': 'Pre-Workout Meal (20%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.2),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.2),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),  # Higher carbs pre-workout
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.15),
    },
    {
        'name': 'Post-Workout Meal (25%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.25),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),  # Higher protein post-workout
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),  # Higher carbs post-workout
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.15),
    },
    {
        'name': 'Dinner (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.25),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.15),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.4),  # Higher fat at dinner
    }
]

tab1, tab2, tab3 = st.tabs(["3 Meal Plan", "5 Meal Plan", "4 Meal Workout Plan"])

with tab1:
    st.table(pd.DataFrame(meals_3))

with tab2:
    st.table(pd.DataFrame(meals_5))

with tab3:
    st.table(pd.DataFrame(meals_4_workout))
    st.info("This plan is designed with higher carbs before workouts and higher protein after workouts to optimize training performance and recovery.")

# Food suggestions based on the goal
st.subheader("Food Suggestions")

# Consider body composition and performance preferences
body_comp_preference = st.session_state.user_info.get('body_comp_preference', '')
performance_preference = st.session_state.user_info.get('performance_preference', '')
goal_type = st.session_state.goal_info['goal_type']

# Tailor recommendations based on preferences
performance_focused = "maximally support my performance" in performance_preference.lower() if performance_preference else False

if goal_type == "lose_fat":
    muscle_retention_focused = "don't want to lose any muscle" in body_comp_preference.lower() if body_comp_preference else False
    
    st.markdown(f"""
    **Recommended Foods for Fat Loss:**
    
    *Protein Sources:*
    - Lean meats (chicken breast, turkey, lean beef)
    - Fish (tuna, salmon, tilapia)
    - Egg whites or whole eggs
    - Low-fat dairy (Greek yogurt, cottage cheese)
    - Plant-based options (tofu, tempeh, seitan)
    
    *Carbohydrates:*
    - Whole grains (brown rice, quinoa, oats)
    - Starchy vegetables (sweet potatoes, squash)
    - Fruits (berries, apples, oranges)
    - Beans and legumes
    
    *Fats:*
    - Avocados
    - Nuts and seeds (in moderation)
    - Olive oil (limited quantities)
    - Fatty fish (salmon, mackerel)
    
    *Vegetables:*
    - Focus on high-volume, low-calorie options like leafy greens, broccoli, cauliflower, zucchini, bell peppers
    - Aim for at least 3-5 servings per day
    
    *Tips:*
    - Focus on high-protein, high-fiber foods to increase satiety
    - Limit added sugars and processed foods
    - Prioritize water and zero-calorie beverages
    """)
    
    # Additional recommendations based on preferences
    if muscle_retention_focused:
        st.info("""
        **For Muscle Retention During Fat Loss:**
        - Ensure you hit your protein target daily (this is priority #1)
        - Distribute protein intake evenly throughout the day
        - Consider 25-30g of protein before bed (casein or cottage cheese)
        - Maintain resistance training intensity even in a calorie deficit
        - Include essential amino acids around workouts
        """)
    
    if performance_focused:
        st.info("""
        **For Optimizing Performance During Fat Loss:**
        - Prioritize carbohydrates before and after training sessions
        - Consider a more moderate deficit on heavy training days
        - Use a carb cycling approach (higher carbs on training days)
        - Focus on nutrient timing - place most carbs around workouts
        - Stay well-hydrated and consider electrolyte supplementation
        """)
elif goal_type == "gain_muscle":
    avoid_fat_gain = "do not want to gain any body fat" in body_comp_preference.lower() if body_comp_preference else False
    
    st.markdown(f"""
    **Recommended Foods for Muscle Gain:**
    
    *Protein Sources:*
    - Lean and fatty meats (chicken, beef, pork)
    - Fish and seafood
    - Whole eggs
    - Dairy (Greek yogurt, cottage cheese, milk)
    - Plant-based options (tofu, tempeh, seitan, protein powder)
    
    *Carbohydrates:*
    - Whole grains (rice, pasta, bread, oats)
    - Starchy vegetables (potatoes, sweet potatoes)
    - Fruits (bananas, apples, berries)
    - Legumes and beans
    
    *Fats:*
    - Avocados
    - Nuts and nut butters
    - Olive oil and other healthy oils
    - Fatty fish
    - Full-fat dairy
    
    *Vegetables:*
    - Include a variety of vegetables for micronutrients
    - Dark leafy greens, broccoli, bell peppers, etc.
    
    *Tips:*
    - Eat more calorie-dense foods if struggling to meet calorie targets
    - Consider liquid calories (smoothies, shakes) to increase intake
    - Time protein intake around workouts
    - Focus on nutrient-dense whole foods
    """)
    
    # Additional recommendations based on preferences
    if avoid_fat_gain:
        st.info("""
        **For Minimizing Fat Gain During Muscle Building:**
        - Keep your calorie surplus modest (200-300 calories above maintenance)
        - Focus on nutrient timing (higher carbs around workouts)
        - Consider carb cycling (higher carbs on training days)
        - Track your measurements and adjust calories if fat gain is noted
        - Maintain higher protein intake (helps with satiety and thermogenesis)
        """)
    
    if performance_focused:
        st.info("""
        **For Optimizing Performance During Muscle Building:**
        - Prioritize carbohydrates throughout the day, especially around workouts
        - Consider intra-workout carbohydrates for longer training sessions
        - Ensure adequate recovery time between intense training sessions
        - Focus on post-workout nutrition (protein + carbs) within 1-2 hours
        - Stay well-hydrated and consider creatine supplementation
        """)
else:  # maintain
    st.markdown("""
    **Recommended Foods for Maintenance:**
    
    *Protein Sources:*
    - Balance of lean and fatty meats
    - Fish and seafood
    - Eggs
    - Dairy products
    - Plant-based proteins
    
    *Carbohydrates:*
    - Whole grains
    - Starchy vegetables
    - Fruits
    - Legumes and beans
    
    *Fats:*
    - Avocados
    - Nuts and seeds
    - Olive oil and other healthy oils
    - Fatty fish
    
    *Vegetables:*
    - Aim for variety and different colors
    - Include both starchy and non-starchy options
    
    *Tips:*
    - Focus on whole, unprocessed foods
    - Maintain a balance of all macronutrients
    - Practice portion control
    - Listen to hunger and fullness cues
    """)
    
    if performance_focused:
        st.info("""
        **For Optimizing Performance During Maintenance:**
        - Match your energy intake to your daily expenditure
        - Consider periodizing your nutrition with training cycles
        - Adjust calories on training vs. non-training days
        - Focus on nutrient timing for optimal performance
        - Ensure adequate micronutrient intake for recovery
        """)

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Daily Monitoring](/Daily_Monitoring)")
