import streamlit as st
import pandas as pd
import numpy as np
import sys
import os
from datetime import datetime

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils
from session_manager import add_session_controls, save_on_change

# Set page config
st.set_page_config(
    page_title="Fitomics - Nutrition Targets",
    page_icon="🎯",
    layout="wide"
)

# Load existing data
utils.load_data()

# Streamlit UI
st.title("🎯 Nutrition Targets")
st.markdown("Review and confirm your personalized nutrition targets based on your body composition goals, diet preferences, and weekly schedule.")

# Add session management controls
add_session_controls()

# Check if prerequisites are completed
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

if 'targets_set' not in st.session_state or not st.session_state.targets_set:
    st.warning("Please complete the Body Composition Goals page first!")
    st.stop()

if 'diet_preferences' not in st.session_state:
    st.warning("Please complete the Diet Preferences page first!")
    st.stop()

if 'confirmed_weekly_schedule' not in st.session_state:
    st.warning("Please complete the Weekly Schedule page first!")
    st.stop()

# Display current user summary
st.markdown("### Your Profile Summary")
profile_col1, profile_col2, profile_col3 = st.columns(3)

with profile_col1:
    st.markdown("**Personal Info**")
    st.write(f"Age: {st.session_state.user_info.get('age', 'N/A')}")
    st.write(f"Gender: {st.session_state.user_info.get('gender', 'N/A')}")
    st.write(f"Weight: {st.session_state.user_info.get('weight_lbs', 0):.1f} lbs")
    st.write(f"Height: {st.session_state.user_info.get('height_ft', 0)}'{st.session_state.user_info.get('height_in', 0)}\"")

with profile_col2:
    st.markdown("**Body Composition Goals**")
    st.write(f"Current BF%: {st.session_state.get('body_fat_pct', 0):.1f}%")
    st.write(f"Target BF%: {st.session_state.get('target_bf', 0):.1f}%")
    st.write(f"Goal: {st.session_state.get('goal_type', 'N/A')}")
    st.write(f"Timeline: {st.session_state.get('timeline_weeks', 0)} weeks")

with profile_col3:
    st.markdown("**Activity & Preferences**")
    st.write(f"Activity Level: {st.session_state.get('activity_level', 'N/A')}")
    
    # Calculate total eating occasions from weekly schedule
    total_eating_occasions = 0
    if 'confirmed_weekly_schedule' in st.session_state:
        # Get eating occasions from any day in the confirmed schedule
        sample_day = next(iter(st.session_state.confirmed_weekly_schedule.values()))
        meals = sample_day.get('meals', [])
        total_eating_occasions = len(meals)  # Total meals + snacks
    else:
        # Fallback to diet preferences
        total_eating_occasions = st.session_state.diet_preferences.get('meal_frequency', 3)
    
    st.write(f"Total Eating Occasions: {total_eating_occasions}")
    st.write(f"Cooking Time: {st.session_state.diet_preferences.get('cooking_time_preference', 'N/A')}")
    dietary_restrictions = st.session_state.diet_preferences.get('dietary_restrictions', [])
    if dietary_restrictions and 'None' not in dietary_restrictions:
        st.write(f"Restrictions: {', '.join(dietary_restrictions[:2])}")

st.markdown("---")

# Calculate and display nutrition targets
st.markdown("### Calculated Nutrition Targets")

# Get base nutrition calculations
gender = st.session_state.user_info.get('gender', 'Male')
weight_kg = st.session_state.user_info.get('weight_kg', 70)
height_cm = st.session_state.user_info.get('height_cm', 175)
age = st.session_state.user_info.get('age', 30)
activity_level = st.session_state.get('activity_level', 'Moderately active')

# Get goal type from goal_info (from body composition goals page)
goal_info = st.session_state.get('goal_info', {})
goal_type = goal_info.get('goal_type', 'maintain')

# Get weekly change parameters for accurate calorie calculation
# Check multiple possible sources for weekly change data
weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0)
if weekly_weight_pct == 0.0:
    # Try alternative session state keys
    weekly_weight_pct = st.session_state.get('weekly_weight_pct', 0.0)
    if weekly_weight_pct == 0.0:
        # Try from recommended rates
        recommended_rates = st.session_state.get('recommended_rates', {})
        if goal_type == 'lose_fat':
            weekly_weight_pct = recommended_rates.get('loss_rate', 0.005)  # 0.5% default
        elif goal_type == 'gain_muscle':
            weekly_weight_pct = recommended_rates.get('gain_rate', 0.0025)  # 0.25% default

weekly_weight_change_kg = abs(weekly_weight_pct * weight_kg)

# Calculate TDEE
tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, activity_level)

# Ensure we have a reasonable weekly change for non-maintenance goals
goal_type_lower = goal_type.lower().replace(' ', '_')  # Handle "Lose fat" vs "lose_fat"
if weekly_weight_change_kg == 0.0 and goal_type_lower != 'maintain':
    # Use default rates if no weekly change is set but goal is not maintenance
    if 'lose' in goal_type_lower or 'fat' in goal_type_lower:
        weekly_weight_change_kg = 0.5  # 0.5 kg per week default for fat loss
    elif 'gain' in goal_type_lower or 'muscle' in goal_type_lower:
        weekly_weight_change_kg = 0.25  # 0.25 kg per week default for muscle gain

target_calories = utils.calculate_target_calories(tdee, goal_type, weekly_weight_change_kg)



# Calculate macros
macros = utils.calculate_macros(target_calories, weight_kg, goal_type)

# Display calculated nutrition targets section
st.markdown("#### Calculated Nutrition Targets")

# Show both base and suggested targets
target_col1, target_col2 = st.columns(2)

with target_col1:
    st.markdown("**Base Daily Targets**")
    st.markdown("*From Body Composition Goals*")
    
    base_col1, base_col2, base_col3, base_col4 = st.columns(4)
    with base_col1:
        st.metric("Calories", f"{target_calories:,.0f}")
    with base_col2:
        st.metric("Protein", f"{macros['protein']:.0f}g")
    with base_col3:
        st.metric("Carbs", f"{macros['carbs']:.0f}g")
    with base_col4:
        st.metric("Fat", f"{macros['fat']:.0f}g")
    
    # Show macro percentages for base
    protein_pct = (macros['protein'] * 4 / target_calories) * 100
    carbs_pct = (macros['carbs'] * 4 / target_calories) * 100
    fat_pct = (macros['fat'] * 9 / target_calories) * 100
    st.markdown(f"**Macro Distribution:** Protein {protein_pct:.0f}% • Carbs {carbs_pct:.0f}% • Fat {fat_pct:.0f}%")

with target_col2:
    st.markdown("**Suggested Daily Targets**")
    st.markdown("*Adjusted for Weekly Schedule*")
    
    # Calculate suggested targets - this will be populated after day-specific calculations below
    suggested_targets_placeholder = st.empty()

# Day-specific targets based on weekly schedule TDEE variations  
st.markdown("#### Day-Specific Nutrition Targets")
st.markdown("Your nutrition targets vary by day based on your personalized weekly schedule and activity levels:")

# Create DataFrame for day-specific targets using Weekly Schedule TDEE data
days_data = []
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Get day-specific TDEE values from Weekly Schedule
day_tdee_values = st.session_state.get('day_tdee_values', {})

for day in days_of_week:
    # Use TDEE from Weekly Schedule if available, otherwise use base TDEE
    if day in day_tdee_values:
        day_tdee = day_tdee_values[day]
    else:
        day_tdee = tdee  # Use base TDEE, not target_calories
    
    # Calculate day-specific target calories based on goal with weekly change
    # Use the same weekly change calculation as base targets
    day_weekly_change_kg = weekly_weight_change_kg
    goal_type_lower = goal_type.lower().replace(' ', '_')  # Handle "Lose fat" vs "lose_fat"
    
    if day_weekly_change_kg == 0.0 and goal_type_lower != 'maintain':
        if 'lose' in goal_type_lower or 'fat' in goal_type_lower:
            day_weekly_change_kg = 0.5 * 0.005 * weight_kg
        elif 'gain' in goal_type_lower or 'muscle' in goal_type_lower:
            day_weekly_change_kg = 0.5 * 0.0025 * weight_kg
    
    # Debug: Add explicit check for weekly change calculation
    if day_weekly_change_kg == 0.0 and goal_type_lower != 'maintain':
        # Use standard rates for fat loss or muscle gain
        if 'lose' in goal_type_lower or 'fat' in goal_type_lower:
            day_weekly_change_kg = 0.5  # 0.5 kg per week
        elif 'gain' in goal_type_lower or 'muscle' in goal_type_lower:
            day_weekly_change_kg = 0.25  # 0.25 kg per week
    
    day_target_calories = utils.calculate_target_calories(day_tdee, goal_type, day_weekly_change_kg)
    
    # Calculate day-specific macros based on target calories
    day_macros = utils.calculate_macros(day_target_calories, weight_kg, goal_type)
    
    days_data.append({
        "Day": day,
        "TDEE": f"{day_tdee:,.0f}",
        "Target Calories": f"{day_target_calories:,.0f}",
        "Protein": f"{day_macros['protein']:.0f}g",
        "Carbs": f"{day_macros['carbs']:.0f}g", 
        "Fat": f"{day_macros['fat']:.0f}g"
    })

# Store day-specific nutrition data in session state for suggested targets calculation
if 'day_specific_nutrition' not in st.session_state:
    st.session_state.day_specific_nutrition = {}

# Store the numerical values for calculations - use the same data as the table
for i, day in enumerate(days_of_week):
    # Use the same TDEE calculation as the table display
    if day in day_tdee_values:
        day_tdee = day_tdee_values[day]
    else:
        day_tdee = tdee  # Use base TDEE, not target_calories
    
    # Use the same weekly change calculation as the table
    day_weekly_change_kg = weekly_weight_change_kg
    goal_type_lower = goal_type.lower().replace(' ', '_')
    
    if day_weekly_change_kg == 0.0 and goal_type_lower != 'maintain':
        if 'lose' in goal_type_lower or 'fat' in goal_type_lower:
            day_weekly_change_kg = 0.5 * 0.005 * weight_kg
        elif 'gain' in goal_type_lower or 'muscle' in goal_type_lower:
            day_weekly_change_kg = 0.5 * 0.0025 * weight_kg
    
    if day_weekly_change_kg == 0.0 and goal_type_lower != 'maintain':
        if 'lose' in goal_type_lower or 'fat' in goal_type_lower:
            day_weekly_change_kg = 0.5
        elif 'gain' in goal_type_lower or 'muscle' in goal_type_lower:
            day_weekly_change_kg = 0.25
    
    day_target_calories = utils.calculate_target_calories(day_tdee, goal_type, day_weekly_change_kg)
    day_macros = utils.calculate_macros(day_target_calories, weight_kg, goal_type)
    
    st.session_state.day_specific_nutrition[day] = {
        'calories': day_target_calories,
        'protein': day_macros['protein'],
        'carbs': day_macros['carbs'],
        'fat': day_macros['fat']
    }

df = pd.DataFrame(days_data)
st.dataframe(df, use_container_width=True)

# Now populate the suggested targets section with calculated values
# Check if we have day-specific TDEE data (indicating Weekly Schedule is complete)
if st.session_state.get('day_tdee_values'):
    # Calculate averages directly from the table data we just calculated
    total_calories = sum(float(row['Target Calories'].replace(',', '')) for row in days_data)
    total_protein = sum(float(row['Protein'].replace('g', '')) for row in days_data)
    total_carbs = sum(float(row['Carbs'].replace('g', '')) for row in days_data)
    total_fat = sum(float(row['Fat'].replace('g', '')) for row in days_data)
    
    avg_calories = total_calories / len(days_data)
    avg_protein = total_protein / len(days_data)
    avg_carbs = total_carbs / len(days_data)
    avg_fat = total_fat / len(days_data)
    
    # Update the suggested targets placeholder
    with suggested_targets_placeholder.container():
        suggested_col1, suggested_col2, suggested_col3, suggested_col4 = st.columns(4)
        with suggested_col1:
            st.metric("Calories", f"{avg_calories:,.0f}")
        with suggested_col2:
            st.metric("Protein", f"{avg_protein:.0f}g")
        with suggested_col3:
            st.metric("Carbs", f"{avg_carbs:.0f}g")
        with suggested_col4:
            st.metric("Fat", f"{avg_fat:.0f}g")
        
        # Show macro percentages for suggested
        suggested_protein_pct = (avg_protein * 4 / avg_calories) * 100
        suggested_carbs_pct = (avg_carbs * 4 / avg_calories) * 100
        suggested_fat_pct = (avg_fat * 9 / avg_calories) * 100
        st.markdown(f"**Macro Distribution:** Protein {suggested_protein_pct:.0f}% • Carbs {suggested_carbs_pct:.0f}% • Fat {suggested_fat_pct:.0f}%")
else:
    # Show completion message if no day-specific data
    with suggested_targets_placeholder.container():
        st.info("Complete Weekly Schedule to see suggested targets")

st.info("💡 **How your targets are calculated:**\n\n"
        "**Base Daily Targets** - Initial targets based on your body composition goals (shown above)\n\n"
        "**Suggested Targets** - Adjusted targets that account for your Weekly Schedule activity levels\n\n"
        "**TDEE (Total Daily Energy Expenditure)** - Total calories you burn each day including all activities")

# Meal and Snack Breakdown from Weekly Schedule
st.markdown("#### Meal & Snack Structure")
st.markdown("Based on your Weekly Schedule preferences:")

# Get meal structure from Weekly Schedule
confirmed_schedule = st.session_state.get('confirmed_weekly_schedule', {})
meal_contexts_detailed = st.session_state.get('meal_contexts_detailed', {})

# Debug information - show in sidebar (remove for production)
# with st.sidebar:
#     st.markdown("### Debug Info")
#     st.write(f"Confirmed schedule keys: {list(confirmed_schedule.keys())}")
#     st.write(f"Meal contexts keys: {list(meal_contexts_detailed.keys())}")
#     if meal_contexts_detailed:
#         st.write("Sample meal context:")
#         first_key = list(meal_contexts_detailed.keys())[0]
#         st.json(meal_contexts_detailed[first_key])

if confirmed_schedule:
    # Get meal/snack counts from any day (they should be consistent)
    sample_day = next(iter(confirmed_schedule.values()))
    meals = sample_day.get('meals', [])
    meal_count = len([m for m in meals if m.get('type') == 'meal'])
    snack_count = len([m for m in meals if m.get('type') == 'snack'])
    
    structure_col1, structure_col2, structure_col3 = st.columns(3)
    
    with structure_col1:
        st.metric("Meals per Day", meal_count)
        
    with structure_col2:
        st.metric("Snacks per Day", snack_count)
        
    with structure_col3:
        st.metric("Total Eating Occasions", meal_count + snack_count)
    
    # Show meal contexts from Weekly Schedule
    if meal_contexts_detailed:
        st.markdown("**Your Meal Contexts:**")
        
        # Display meal contexts in a more readable format
        for meal_key, context in meal_contexts_detailed.items():
            if context.get('meal'):
                meal_name = context['meal']
                
                # Build context details
                context_details = []
                if context.get('prep_type'):
                    if context.get('prep_time'):
                        context_details.append(f"Prep: {context['prep_type']} ({context['prep_time']})")
                    else:
                        context_details.append(f"Prep: {context['prep_type']}")
                
                if context.get('location'):
                    locations = context['location']
                    if isinstance(locations, list):
                        context_details.append(f"Location: {', '.join(locations)}")
                    else:
                        context_details.append(f"Location: {locations}")
                
                if context.get('time_range'):
                    context_details.append(f"Time: {context['time_range']}")
                
                # Display the meal context
                if context_details:
                    st.write(f"**{meal_name}:** {' • '.join(context_details)}")
                else:
                    st.write(f"**{meal_name}:** No specific context set")
                
                # Show variations if noted
                if not context.get('consistency', True) and context.get('variations'):
                    st.write(f"  └ Variations: {context['variations']}")
    else:
        st.info("No meal contexts configured yet. Complete your Weekly Schedule to set meal preferences.")
    
    # Calculate rough calorie distribution based on suggested targets
    st.markdown("**Estimated Calorie Distribution:**")
    
    # Use suggested targets (average from day-specific nutrition) instead of base targets
    if st.session_state.get('day_specific_nutrition'):
        total_days = len(st.session_state.day_specific_nutrition)
        avg_suggested_calories = sum(day_data.get('calories', target_calories) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        distribution_calories = avg_suggested_calories
        st.info(f"Based on suggested targets (avg: {distribution_calories:,.0f} calories/day)")
    else:
        distribution_calories = target_calories
        st.info(f"Based on base targets ({distribution_calories:,.0f} calories/day)")
    
    # Simple distribution: meals get more calories than snacks
    if meal_count > 0 and snack_count >= 0:
        # Meals typically get 70-80% of calories, snacks get 20-30%
        meal_calorie_ratio = 0.75
        snack_calorie_ratio = 0.25
        
        if meal_count > 0:
            calories_per_meal = int((distribution_calories * meal_calorie_ratio) / meal_count)
            st.write(f"• **Each meal:** ~{calories_per_meal:,} calories")
        
        if snack_count > 0:
            calories_per_snack = int((distribution_calories * snack_calorie_ratio) / snack_count)
            st.write(f"• **Each snack:** ~{calories_per_snack:,} calories")
        
        st.caption("These are rough estimates. Actual meal plans will optimize distribution based on your meal contexts, timing, and preferences.")
    
else:
    st.info("Complete your Weekly Schedule to see your personalized meal and snack structure here.")

st.markdown("---")

# Target customization section
st.markdown("### Customize Your Targets (Optional)")
st.markdown("You can adjust these targets if needed, or use the suggested values.")

customize_targets = st.checkbox("I want to customize my nutrition targets")

if customize_targets:
    # Use suggested targets as default values if available
    if st.session_state.get('day_specific_nutrition'):
        total_days = len(st.session_state.day_specific_nutrition)
        default_calories = sum(day_data.get('calories', target_calories) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        default_protein = sum(day_data.get('protein', macros['protein']) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        default_carbs = sum(day_data.get('carbs', macros['carbs']) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        default_fat = sum(day_data.get('fat', macros['fat']) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        st.info("Default values based on your suggested targets (from Weekly Schedule)")
    else:
        default_calories = target_calories
        default_protein = macros['protein']
        default_carbs = macros['carbs']
        default_fat = macros['fat']
        st.info("Default values based on your base targets (from Body Composition Goals)")
    
    custom_col1, custom_col2 = st.columns(2)
    
    with custom_col1:
        custom_calories = st.number_input(
            "Daily Calories",
            min_value=1200,
            max_value=5000,
            value=int(default_calories),
            step=50,
            help="Adjust based on your specific needs or preferences"
        )
        
        custom_protein = st.number_input(
            "Protein (g)",
            min_value=50,
            max_value=300,
            value=int(default_protein),
            step=5,
            help="Higher protein supports muscle building and satiety"
        )
    
    with custom_col2:
        custom_carbs = st.number_input(
            "Carbohydrates (g)",
            min_value=50,
            max_value=500,
            value=int(default_carbs),
            step=10,
            help="Carbs fuel your workouts and daily activities"
        )
        
        custom_fat = st.number_input(
            "Fat (g)",
            min_value=30,
            max_value=200,
            value=int(default_fat),
            step=5,
            help="Healthy fats support hormone production and satiety"
        )
    
    # Validate custom targets
    custom_total_calories = (custom_protein * 4) + (custom_carbs * 4) + (custom_fat * 9)
    calories_diff = abs(custom_total_calories - custom_calories)
    
    if calories_diff > 100:
        st.warning(f"Your macro calories ({custom_total_calories:.0f}) don't match your target calories ({custom_calories}). Difference: {calories_diff:.0f} calories.")
    
    # Update targets if customized
    final_calories = custom_calories
    final_protein = custom_protein
    final_carbs = custom_carbs
    final_fat = custom_fat
else:
    # Use suggested targets as default if available, otherwise base targets
    if st.session_state.get('day_specific_nutrition'):
        total_days = len(st.session_state.day_specific_nutrition)
        final_calories = sum(day_data.get('calories', target_calories) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        final_protein = sum(day_data.get('protein', macros['protein']) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        final_carbs = sum(day_data.get('carbs', macros['carbs']) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
        final_fat = sum(day_data.get('fat', macros['fat']) for day_data in st.session_state.day_specific_nutrition.values()) / total_days
    else:
        final_calories = target_calories
        final_protein = macros['protein']
        final_carbs = macros['carbs']
        final_fat = macros['fat']

st.markdown("---")

# Day-specific meal customization
st.markdown("### Day-Specific Meal Customization")
st.markdown("Customize meal count and timing for each day based on your training schedule and preferences.")

# Initialize day-specific meal settings if not exists
if 'day_specific_meals' not in st.session_state:
    st.session_state.day_specific_meals = {}

days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Day selector for customization
customize_day = st.selectbox("Select day to customize meals:", days_of_week, key="meal_customize_day")

# Get day's schedule info
day_schedule = st.session_state.confirmed_weekly_schedule.get(customize_day, {})
day_workouts = day_schedule.get('workouts', [])

# Get accurate TDEE for this day - use actual TDEE values from weekly schedule
if 'day_tdee_values' in st.session_state and customize_day in st.session_state.day_tdee_values:
    day_tdee = st.session_state.day_tdee_values[customize_day]
    is_suggested = True
elif customize_day in st.session_state.day_specific_nutrition:
    # Fallback to day-specific nutrition data
    day_tdee = st.session_state.day_specific_nutrition[customize_day].get('calories', target_calories)
    is_suggested = True
else:
    # Final fallback to base TDEE calculation
    day_tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, activity_level)
    is_suggested = False

# Display day info
st.markdown(f"**{customize_day} Schedule:**")
if day_workouts:
    workout_info = ", ".join([f"{w.get('name', 'Workout')} ({w.get('intensity', 'Moderate')})" for w in day_workouts])
    st.write(f"🏋️ Workouts: {workout_info}")
else:
    st.write("🏋️ Rest Day")

# Display accurate TDEE with context
if is_suggested:
    st.write(f"🔥 **Estimated TDEE: {day_tdee:.0f} calories** (from suggested targets)")
else:
    st.write(f"🔥 **Estimated TDEE: {day_tdee:.0f} calories** (from base targets)")

# Get default meal/snack settings from Weekly Schedule (takes priority) or Diet Preferences
confirmed_schedule = st.session_state.get('confirmed_weekly_schedule', {})
if confirmed_schedule:
    # Get meal/snack counts from Weekly Schedule first
    sample_day = next(iter(confirmed_schedule.values()))
    meals = sample_day.get('meals', [])
    default_meal_count = len([m for m in meals if m.get('type') == 'meal'])
    default_snack_count = len([m for m in meals if m.get('type') == 'snack'])
elif 'diet_preferences' in st.session_state and 'meal_frequency' in st.session_state.diet_preferences:
    default_meal_count = st.session_state.diet_preferences['meal_frequency']
    default_snack_count = 0  # Default to no snacks from diet preferences
else:
    default_meal_count = 3
    default_snack_count = 0
    st.warning("Weekly Schedule and Diet preferences not found. Using defaults.")

# Get existing settings for this day or use defaults
day_meal_settings = st.session_state.day_specific_meals.get(customize_day, {
    'meal_count': default_meal_count,
    'snack_count': default_snack_count,
    'use_custom_timing': False,
    'meal_times': []
})

# Get existing snack settings for this day
day_snack_settings = day_meal_settings.get('snack_count', default_snack_count)

meal_col1, meal_col2, meal_col3 = st.columns(3)

with meal_col1:
    # Meal count for this day
    day_meal_count = st.number_input(
        f"Number of meals on {customize_day}",
        min_value=2,
        max_value=8,
        value=day_meal_settings['meal_count'],
        key=f"meal_count_{customize_day}",
        help="Adjust based on your schedule and preferences for this day"
    )

with meal_col2:
    # Snack count for this day
    day_snack_count = st.number_input(
        f"Number of snacks on {customize_day}",
        min_value=0,
        max_value=4,
        value=day_snack_settings,
        key=f"snack_count_{customize_day}",
        help="Add snacks between meals for this day"
    )

with meal_col3:
    # Custom timing option
    use_custom_timing = st.checkbox(
        f"Custom meal/snack timing for {customize_day}",
        value=day_meal_settings['use_custom_timing'],
        key=f"custom_timing_{customize_day}",
        help="Set specific meal and snack times for this day"
    )

# Default meal time suggestions based on count
default_meal_times = {
    2: ["08:00", "18:00"],
    3: ["07:00", "12:00", "18:00"],
    4: ["07:00", "10:00", "13:00", "18:00"],
    5: ["07:00", "10:00", "13:00", "16:00", "19:00"],
    6: ["07:00", "10:00", "12:00", "15:00", "17:00", "20:00"],
    7: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "20:00"],
    8: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"]
}

meal_times = default_meal_times.get(day_meal_count, ["07:00", "12:00", "18:00"])

if use_custom_timing:
    st.markdown(f"**Set meal and snack times for {customize_day}:**")
    custom_times = []
    
    # Create combined schedule of meals and snacks
    total_eating_occasions = day_meal_count + day_snack_count
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Meals:**")
        for i in range(day_meal_count):
            default_time = meal_times[i] if i < len(meal_times) else "12:00"
            if i < len(day_meal_settings.get('meal_times', [])):
                default_time = day_meal_settings['meal_times'][i]
                
            meal_time = st.time_input(
                f"Meal {i+1} time",
                value=pd.to_datetime(default_time).time(),
                key=f"meal_time_{customize_day}_{i}"
            )
            if meal_time:
                custom_times.append(meal_time.strftime("%H:%M"))
    
    with col2:
        st.markdown("**Snacks:**")
        snack_times = []
        for i in range(day_snack_count):
            # Default snack times between meals
            if i == 0 and day_meal_count >= 2:
                default_snack_time = "10:00"  # Mid-morning
            elif i == 1 and day_meal_count >= 3:
                default_snack_time = "15:00"  # Afternoon
            elif i == 2:
                default_snack_time = "20:00"  # Evening
            else:
                default_snack_time = "16:00"  # Default afternoon
                
            snack_time = st.time_input(
                f"Snack {i+1} time",
                value=pd.to_datetime(default_snack_time).time(),
                key=f"snack_time_{customize_day}_{i}"
            )
            if snack_time:
                snack_times.append(snack_time.strftime("%H:%M"))
        
        # Store snack times in session state
        st.session_state.day_specific_meals[customize_day]['snack_times'] = snack_times
    
    meal_times = custom_times

# Update day-specific settings
st.session_state.day_specific_meals[customize_day] = {
    'meal_count': day_meal_count,
    'snack_count': day_snack_count,
    'use_custom_timing': use_custom_timing,
    'meal_times': meal_times
}

# Additional energy summary (already shown above)
st.markdown(f"**{customize_day} Energy Summary:**")
if customize_day in st.session_state.day_specific_nutrition:
    suggested_calories = st.session_state.day_specific_nutrition[customize_day].get('calories', final_calories)
    st.write(f"**Suggested Target:** {suggested_calories:,.0f} calories (based on your weekly schedule)")
    st.write(f"**Base Target:** {final_calories:,.0f} calories (from body composition goals)")
else:
    st.write(f"**Using Base Target:** {final_calories:,.0f} calories")

# Show meal schedule preview for this day
st.markdown(f"**{customize_day} Eating Schedule Preview:**")
meal_names = ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Dinner", "Evening", "Late Evening", "Night"]

# Combine meals and snacks for preview
eating_schedule = []
for i, meal_time in enumerate(meal_times):
    meal_name = meal_names[i] if i < len(meal_names) else f"Meal {i+1}"
    eating_schedule.append((meal_time, f"🍽️ {meal_name}"))

# Add snacks if they exist
if day_snack_count > 0:
    snack_times = st.session_state.day_specific_meals[customize_day].get('snack_times', [])
    for i, snack_time in enumerate(snack_times):
        eating_schedule.append((snack_time, f"🍎 Snack {i+1}"))

# Sort by time
eating_schedule.sort(key=lambda x: x[0])

# Display schedule
schedule_display = []
for time, description in eating_schedule:
    schedule_display.append(f"{time} - {description}")

if schedule_display:
    st.write(" • ".join(schedule_display))
else:
    st.write("No eating schedule set for this day.")

if st.button(f"Apply to All Similar Days", key=f"apply_similar_{customize_day}"):
    # Apply to days with similar workout patterns
    similar_days = []
    current_workout_count = len(day_workouts)
    
    for day in days_of_week:
        if day != customize_day:
            day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
            if len(day_data.get('workouts', [])) == current_workout_count:
                similar_days.append(day)
                # Include snack settings in the copy
                day_settings = {
                    'meal_count': day_meal_count,
                    'snack_count': day_snack_count,
                    'use_custom_timing': use_custom_timing,
                    'meal_times': meal_times
                }
                # Copy snack times if they exist
                if 'snack_times' in st.session_state.day_specific_meals[customize_day]:
                    day_settings['snack_times'] = st.session_state.day_specific_meals[customize_day]['snack_times']
                
                st.session_state.day_specific_meals[day] = day_settings
    
    if similar_days:
        st.success(f"Applied meal and snack settings to similar days: {', '.join(similar_days)}")
    else:
        st.info("No similar days found to apply settings to.")

st.markdown("---")

# Meal distribution preview
st.markdown("### Overall Meal Distribution Preview")
st.markdown("Based on your suggested targets and day-specific customizations:")

# Show weekly meal distribution summary
weekly_meal_summary = []
for day in days_of_week:
    # Get default meal count from diet preferences
    if 'diet_preferences' in st.session_state and 'meal_frequency' in st.session_state.diet_preferences:
        default_meal_freq = st.session_state.diet_preferences['meal_frequency']
    else:
        default_meal_freq = 3
    
    day_settings = st.session_state.day_specific_meals.get(day, {
        'meal_count': default_meal_freq,
        'meal_times': []
    })
    
    meal_count = day_settings['meal_count']
    meal_times = day_settings.get('meal_times', [])
    
    if meal_times:
        times_display = ", ".join(meal_times)
    else:
        # Use default times
        default_times = default_meal_times.get(meal_count, ["07:00", "12:00", "18:00"])
        times_display = ", ".join(default_times)
    
    weekly_meal_summary.append({
        "Day": day,
        "Meals": meal_count,
        "Times": times_display
    })

weekly_df = pd.DataFrame(weekly_meal_summary)
st.dataframe(weekly_df, use_container_width=True)

# Example meal distribution for the selected day
selected_day_settings = st.session_state.day_specific_meals.get(customize_day, {
    'meal_count': default_meal_count
})

example_meal_count = selected_day_settings['meal_count']

# Create meal distribution based on meal count
def get_meal_distribution(meal_count):
    if meal_count == 2:
        return ["Breakfast", "Dinner"], [0.4, 0.6]
    elif meal_count == 3:
        return ["Breakfast", "Lunch", "Dinner"], [0.25, 0.35, 0.4]
    elif meal_count == 4:
        return ["Breakfast", "Lunch", "Dinner", "Snack"], [0.25, 0.3, 0.35, 0.1]
    elif meal_count == 5:
        return ["Breakfast", "Mid-Morning", "Lunch", "Dinner", "Evening Snack"], [0.25, 0.1, 0.3, 0.25, 0.1]
    elif meal_count == 6:
        return ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Dinner", "Evening"], [0.2, 0.1, 0.25, 0.15, 0.25, 0.05]
    elif meal_count == 7:
        return ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Pre-Dinner", "Dinner", "Evening"], [0.2, 0.08, 0.22, 0.12, 0.08, 0.25, 0.05]
    else:  # 8 meals
        return ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Pre-Dinner", "Dinner", "Evening", "Night"], [0.18, 0.07, 0.2, 0.1, 0.07, 0.23, 0.1, 0.05]

meal_names, meal_percentages = get_meal_distribution(example_meal_count)

# Advanced per-meal and snack macro customization
selected_day_meal_count = selected_day_settings.get('meal_count', default_meal_count)
selected_day_snack_count = selected_day_settings.get('snack_count', default_snack_count)
total_eating_occasions = selected_day_meal_count + selected_day_snack_count

st.markdown("### Per-Meal & Snack Macro Customization")
st.markdown(f"Customize individual eating occasion targets for **{customize_day}** ({selected_day_meal_count} meals + {selected_day_snack_count} snacks = {total_eating_occasions} total):")

# Initialize per-meal customization state
if 'per_meal_macros' not in st.session_state:
    st.session_state.per_meal_macros = {}

if customize_day not in st.session_state.per_meal_macros:
    # Initialize with default distribution including meals and snacks
    default_eating_occasions = []
    
    # Get suggested targets for this day (if available) or use base targets
    if customize_day in st.session_state.day_specific_nutrition:
        suggested_nutrition = st.session_state.day_specific_nutrition[customize_day]
        suggested_calories = suggested_nutrition.get('calories', final_calories)
        suggested_protein = suggested_nutrition.get('protein', final_protein)
        suggested_carbs = suggested_nutrition.get('carbs', final_carbs)
        suggested_fat = suggested_nutrition.get('fat', final_fat)
    else:
        suggested_calories = final_calories
        suggested_protein = final_protein
        suggested_carbs = final_carbs
        suggested_fat = final_fat
    
    # Add meals
    meal_names = ["Breakfast", "Lunch", "Dinner", "Mid-Morning", "Afternoon", "Evening", "Pre-Dinner", "Night"]
    meal_percentage = 0.75  # 75% of calories go to meals
    snack_percentage = 0.25  # 25% of calories go to snacks
    
    for i in range(selected_day_meal_count):
        meal_name = meal_names[i] if i < len(meal_names) else f"Meal {i+1}"
        individual_meal_pct = meal_percentage / selected_day_meal_count
        
        default_eating_occasions.append({
            "name": meal_name,
            "type": "meal",
            "calories": suggested_calories * individual_meal_pct,
            "protein": suggested_protein * individual_meal_pct,
            "carbs": suggested_carbs * individual_meal_pct,
            "fat": suggested_fat * individual_meal_pct,
            "time": selected_day_settings.get('meal_times', ["07:00", "12:00", "18:00"])[i] if i < len(selected_day_settings.get('meal_times', [])) else ["07:00", "12:00", "18:00", "16:00", "19:00"][i] if i < 5 else "12:00"
        })
    
    # Add snacks
    snack_names = ["Mid-Morning Snack", "Afternoon Snack", "Evening Snack", "Pre-Workout Snack", "Post-Workout Snack"]
    for i in range(selected_day_snack_count):
        snack_name = snack_names[i] if i < len(snack_names) else f"Snack {i+1}"
        individual_snack_pct = snack_percentage / selected_day_snack_count if selected_day_snack_count > 0 else 0
        
        default_eating_occasions.append({
            "name": snack_name,
            "type": "snack",
            "calories": suggested_calories * individual_snack_pct,
            "protein": suggested_protein * individual_snack_pct,
            "carbs": suggested_carbs * individual_snack_pct,
            "fat": suggested_fat * individual_snack_pct,
            "time": selected_day_settings.get('snack_times', ["10:00", "15:00", "20:00"])[i] if i < len(selected_day_settings.get('snack_times', [])) else ["10:00", "15:00", "20:00", "21:00"][i] if i < 4 else "15:00"
        })
    
    st.session_state.per_meal_macros[customize_day] = default_eating_occasions

# Daily budget display using suggested targets
st.markdown("#### Daily Macro Budget")
budget_col1, budget_col2, budget_col3, budget_col4 = st.columns(4)

# Get suggested targets for this day
if customize_day in st.session_state.day_specific_nutrition:
    suggested_nutrition = st.session_state.day_specific_nutrition[customize_day]
    display_calories = suggested_nutrition.get('calories', final_calories)
    display_protein = suggested_nutrition.get('protein', final_protein)
    display_carbs = suggested_nutrition.get('carbs', final_carbs)
    display_fat = suggested_nutrition.get('fat', final_fat)
    st.info(f"**Suggested targets for {customize_day}** (based on your Weekly Schedule)")
else:
    display_calories = final_calories
    display_protein = final_protein
    display_carbs = final_carbs
    display_fat = final_fat
    st.info(f"**Base targets for {customize_day}** (from Body Composition Goals)")

with budget_col1:
    st.metric("Target Calories", f"{display_calories:.0f}")
with budget_col2:
    st.metric("Target Protein", f"{display_protein:.0f}g")
with budget_col3:
    st.metric("Target Carbs", f"{display_carbs:.0f}g")
with budget_col4:
    st.metric("Target Fat", f"{display_fat:.0f}g")

# Calculate current totals from customized meals
current_day_meals = st.session_state.per_meal_macros[customize_day]
total_calories = sum([meal["calories"] for meal in current_day_meals])
total_protein = sum([meal["protein"] for meal in current_day_meals])
total_carbs = sum([meal["carbs"] for meal in current_day_meals])
total_fat = sum([meal["fat"] for meal in current_day_meals])

# Show current vs target - use suggested targets if available
st.markdown("#### Current Meal Plan vs Targets")
current_col1, current_col2, current_col3, current_col4, current_col5 = st.columns(5)

# Use suggested targets for comparison if available
if customize_day in st.session_state.day_specific_nutrition:
    target_nutrition = st.session_state.day_specific_nutrition[customize_day]
    target_calories = target_nutrition.get('calories', final_calories)
    target_protein = target_nutrition.get('protein', final_protein)
    target_carbs = target_nutrition.get('carbs', final_carbs)
    target_fat = target_nutrition.get('fat', final_fat)
else:
    target_calories = final_calories
    target_protein = final_protein
    target_carbs = final_carbs
    target_fat = final_fat

with current_col1:
    cal_diff = total_calories - target_calories
    st.metric("Current Calories", f"{total_calories:.0f}", delta=f"{cal_diff:+.0f}")
with current_col2:
    protein_diff = total_protein - target_protein
    st.metric("Current Protein", f"{total_protein:.0f}g", delta=f"{protein_diff:+.0f}g")
with current_col3:
    carbs_diff = total_carbs - target_carbs
    st.metric("Current Carbs", f"{total_carbs:.0f}g", delta=f"{carbs_diff:+.0f}g")
with current_col4:
    fat_diff = total_fat - target_fat
    st.metric("Current Fat", f"{total_fat:.0f}g", delta=f"{fat_diff:+.0f}g")
with current_col5:
    # Auto-balance button
    if st.button("⚖️ Auto-Balance Remaining Macros", help="Redistribute remaining macros across all meals and snacks"):
        # Calculate differences using correct targets
        cal_remaining = target_calories - total_calories
        protein_remaining = target_protein - total_protein
        carbs_remaining = target_carbs - total_carbs
        fat_remaining = target_fat - total_fat
        
        # Distribute remaining macros proportionally
        num_eating_occasions = len(current_day_meals)
        if num_eating_occasions > 0:
            for meal in current_day_meals:
                meal["calories"] += cal_remaining / num_eating_occasions
                meal["protein"] += protein_remaining / num_eating_occasions
                meal["carbs"] += carbs_remaining / num_eating_occasions
                meal["fat"] += fat_remaining / num_eating_occasions
            
            st.success("Macros auto-balanced across all meals and snacks!")
            st.rerun()

# Per-meal and snack customization interface
st.markdown("#### Individual Meal & Snack Customization")

for i, eating_occasion in enumerate(current_day_meals):
    # Use appropriate icon based on type
    icon = "🍽️" if eating_occasion.get('type', 'meal') == 'meal' else "🍎"
    occasion_type = eating_occasion.get('type', 'meal').title()
    
    with st.expander(f"{icon} {eating_occasion['name']} ({occasion_type}) - {eating_occasion['time']}", expanded=False):
        meal_col1, meal_col2 = st.columns(2)
        
        with meal_col1:
            # Timing
            occasion_time = st.time_input(
                f"{occasion_type} Time",
                value=pd.to_datetime(eating_occasion['time']).time(),
                key=f"occasion_time_custom_{customize_day}_{i}"
            )
            
            # Calories
            occasion_calories = st.number_input(
                "Calories",
                min_value=50,
                max_value=int(display_calories),
                value=int(eating_occasion['calories']),
                step=25,
                key=f"occasion_cal_{customize_day}_{i}"
            )
            
            # Protein
            occasion_protein = st.number_input(
                "Protein (g)",
                min_value=5,
                max_value=int(display_protein),
                value=int(eating_occasion['protein']),
                step=2,
                key=f"occasion_protein_{customize_day}_{i}"
            )
        
        with meal_col2:
            # Show percentage of daily total using suggested targets
            cal_pct = (occasion_calories / display_calories) * 100 if display_calories > 0 else 0
            protein_pct = (occasion_protein / display_protein) * 100 if display_protein > 0 else 0
            
            st.markdown(f"**% of Daily Target:**")
            st.write(f"Calories: {cal_pct:.1f}%")
            st.write(f"Protein: {protein_pct:.1f}%")
            
            # Carbs
            occasion_carbs = st.number_input(
                "Carbs (g)",
                min_value=5,
                max_value=int(display_carbs),
                value=int(eating_occasion['carbs']),
                step=5,
                key=f"occasion_carbs_{customize_day}_{i}"
            )
            
            # Fat
            occasion_fat = st.number_input(
                "Fat (g)",
                min_value=2,
                max_value=int(display_fat),
                value=int(eating_occasion['fat']),
                step=2,
                key=f"occasion_fat_{customize_day}_{i}"
            )
        
        # Update eating occasion in session state
        try:
            if occasion_time is not None and hasattr(occasion_time, 'strftime'):
                time_str = occasion_time.strftime("%H:%M")
            elif occasion_time is not None:
                time_str = str(occasion_time)
            else:
                time_str = "12:00"
        except:
            time_str = "12:00"
            
        st.session_state.per_meal_macros[customize_day][i] = {
            "name": eating_occasion['name'],
            "type": eating_occasion.get('type', 'meal'),
            "time": time_str,
            "calories": occasion_calories,
            "protein": occasion_protein,
            "carbs": occasion_carbs,
            "fat": occasion_fat
        }
        
        # Quick adjustment buttons
        quick_col1, quick_col2, quick_col3 = st.columns(3)
        
        with quick_col1:
            if st.button(f"Reset to Default", key=f"reset_{customize_day}_{i}"):
                # Reset to default percentage distribution
                meal_names, meal_percentages = get_meal_distribution(example_meal_count)
                percentage = meal_percentages[i] if i < len(meal_percentages) else 0.2
                st.session_state.per_meal_macros[customize_day][i].update({
                    "calories": final_calories * percentage,
                    "protein": final_protein * percentage,
                    "carbs": final_carbs * percentage,
                    "fat": final_fat * percentage
                })
                st.rerun()
        
        with quick_col2:
            if st.button(f"Make High Protein", key=f"high_protein_{customize_day}_{i}"):
                # Increase protein, adjust other macros
                current_cal = st.session_state.per_meal_macros[customize_day][i]["calories"]
                new_protein = min(current_cal * 0.4 / 4, final_protein * 0.8)  # 40% calories from protein, max 80% of daily
                remaining_cal = current_cal - (new_protein * 4)
                new_carbs = remaining_cal * 0.4 / 4  # 40% of remaining from carbs
                new_fat = remaining_cal * 0.6 / 9    # 60% of remaining from fat
                
                st.session_state.per_meal_macros[customize_day][i].update({
                    "protein": new_protein,
                    "carbs": new_carbs,
                    "fat": new_fat
                })
                st.rerun()
        
        with quick_col3:
            if st.button(f"Make Pre-Workout", key=f"pre_workout_{customize_day}_{i}"):
                # Higher carbs, moderate protein, lower fat
                current_cal = st.session_state.per_meal_macros[customize_day][i]["calories"]
                new_carbs = current_cal * 0.6 / 4    # 60% from carbs
                new_protein = current_cal * 0.25 / 4  # 25% from protein
                new_fat = current_cal * 0.15 / 9      # 15% from fat
                
                st.session_state.per_meal_macros[customize_day][i].update({
                    "protein": new_protein,
                    "carbs": new_carbs,
                    "fat": new_fat
                })
                st.rerun()

# Auto-balance button
if st.button(f"Auto-Balance Remaining Macros", key=f"auto_balance_{customize_day}"):
    # Redistribute any remaining macros proportionally
    remaining_cal = final_calories - total_calories
    remaining_protein = final_protein - total_protein
    remaining_carbs = final_carbs - total_carbs
    remaining_fat = final_fat - total_fat
    
    if abs(remaining_cal) > 10:  # Only if there's a significant difference
        for i, meal in enumerate(st.session_state.per_meal_macros[customize_day]):
            meal_proportion = meal["calories"] / total_calories if total_calories > 0 else 1/len(st.session_state.per_meal_macros[customize_day])
            
            st.session_state.per_meal_macros[customize_day][i]["calories"] += remaining_cal * meal_proportion
            st.session_state.per_meal_macros[customize_day][i]["protein"] += remaining_protein * meal_proportion
            st.session_state.per_meal_macros[customize_day][i]["carbs"] += remaining_carbs * meal_proportion
            st.session_state.per_meal_macros[customize_day][i]["fat"] += remaining_fat * meal_proportion
        
        st.success("Macros automatically balanced across meals!")
        st.rerun()

# Display updated meal plan summary
st.markdown("#### Updated Meal Plan Summary")
updated_meal_data = []
for meal in current_day_meals:
    updated_meal_data.append({
        "Meal": f"{meal['name']} ({meal['time']})",
        "Calories": f"{meal['calories']:.0f}",
        "Protein": f"{meal['protein']:.0f}g",
        "Carbs": f"{meal['carbs']:.0f}g",
        "Fat": f"{meal['fat']:.0f}g"
    })

updated_df = pd.DataFrame(updated_meal_data)
st.dataframe(updated_df, use_container_width=True)

st.markdown("---")

# Confirmation section
st.markdown("### Confirm Your Nutrition Targets")

# Store final targets in session state including per-meal customizations
st.session_state.final_nutrition_targets = {
    'calories': final_calories,
    'protein': final_protein,
    'carbs': final_carbs,
    'fat': final_fat,
    'meal_distribution': updated_meal_data,
    'customized': customize_targets,
    'day_specific_meals': st.session_state.day_specific_meals,
    'weekly_meal_summary': weekly_meal_summary,
    'per_meal_macros': st.session_state.get('per_meal_macros', {})
}

confirm_col1, confirm_col2 = st.columns(2)

with confirm_col1:
    if st.button("✅ Confirm These Targets", type="primary", use_container_width=True):
        st.session_state.nutrition_targets_confirmed = True
        st.success("Nutrition targets confirmed! You can now proceed to meal planning.")
        
        # Save targets to file
        targets_file = 'data/nutrition_targets.json'
        os.makedirs('data', exist_ok=True)
        import json
        try:
            with open(targets_file, 'w') as f:
                json.dump(st.session_state.final_nutrition_targets, f, indent=2)
        except Exception as e:
            st.error(f"Error saving targets: {e}")

with confirm_col2:
    if st.button("🔄 Recalculate Targets", use_container_width=True):
        # Clear customization and recalculate
        st.rerun()

# Navigation guidance
if st.session_state.get('nutrition_targets_confirmed', False):
    st.markdown("---")
    st.markdown("### Next Steps")
    st.success("Your nutrition targets are confirmed! Choose your meal planning approach:")
    
    nav_col1, nav_col2 = st.columns(2)
    
    with nav_col1:
        st.markdown("""
        **🤖 AI Meal Planning**
        - Get personalized meal recommendations
        - Automatic recipe generation
        - Considers all your preferences
        - Perfect for busy schedules
        """)
    
    with nav_col2:
        st.markdown("""
        **🛠️ DIY Meal Planning**
        - Build meals manually
        - Full control over ingredients
        - Use food database search
        - Great for specific dietary needs
        """)
    
    st.markdown("Navigate using the sidebar to begin meal planning!")
else:
    st.info("Please confirm your nutrition targets above to proceed to meal planning.")