import pandas as pd
import numpy as np
import streamlit as st
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import os

# Basic formulas for calculating TDEE (Total Daily Energy Expenditure)
def calculate_bmr(gender, weight_kg, height_cm, age):
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
    if gender == "Male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:  # Female
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

def get_activity_multiplier(activity_level):
    """Return activity multiplier based on activity level"""
    multipliers = {
        # Original activity levels
        "Sedentary (office job, <2 hours exercise per week)": 1.2,
        "Lightly Active (light exercise 2-3 times per week)": 1.375,
        "Moderately Active (moderate exercise 3-5 times per week)": 1.55,
        "Very Active (hard exercise 6-7 times per week)": 1.725,
        "Extremely Active (very hard exercise, physical job or training twice a day)": 1.9,
        
        # New activity levels
        "Sedentary (0-5k steps/day)": 1.2,
        "Light Active (5-10k steps/day)": 1.375,
        "Active (10-15k steps/day)": 1.55,
        "Labor Intensive (>15k steps/day)": 1.725
    }
    return multipliers.get(activity_level, 1.2)

def calculate_tdee(gender, weight_kg, height_cm, age, activity_level, workouts_per_week=0, workout_calories=0):
    """
    Calculate Total Daily Energy Expenditure
    
    Parameters:
    gender (str): "Male" or "Female"
    weight_kg (float): Weight in kilograms
    height_cm (float): Height in centimeters
    age (int): Age in years
    activity_level (str): Activity level descriptor
    workouts_per_week (int, optional): Number of workouts per week
    workout_calories (int, optional): Average calories burned per workout
    
    Returns:
    float: TDEE in calories
    """
    bmr = calculate_bmr(gender, weight_kg, height_cm, age)
    activity_multiplier = get_activity_multiplier(activity_level)
    
    # Calculate base TDEE from BMR and activity level
    base_tdee = bmr * activity_multiplier
    
    # Add workout calories if provided
    if workouts_per_week and workout_calories:
        daily_workout_calories = (workouts_per_week * workout_calories) / 7
        return base_tdee + daily_workout_calories
    
    return base_tdee

def calculate_target_calories(tdee, goal_type, weekly_change_kg=0.5):
    """Calculate target calories based on goal"""
    # 1 kg of body weight is approximately 7700 kcal
    daily_calorie_adjustment = (weekly_change_kg * 7700) / 7
    
    if goal_type == "lose_fat":
        return tdee - daily_calorie_adjustment
    elif goal_type == "gain_muscle":
        return tdee + daily_calorie_adjustment
    else:  # maintain
        return tdee

def calculate_macros(target_calories, body_weight_kg, goal_type):
    """Calculate macronutrient targets based on goal and body weight"""
    if goal_type == "lose_fat":
        # Higher protein for fat loss
        protein_g = 2.2 * body_weight_kg  # 2.2g per kg bodyweight
        fat_g = 0.8 * body_weight_kg  # 0.8g per kg bodyweight
        # Remaining calories from carbs
        protein_calories = protein_g * 4
        fat_calories = fat_g * 9
        carb_calories = target_calories - protein_calories - fat_calories
        carb_g = carb_calories / 4
        
    elif goal_type == "gain_muscle":
        # High protein and carbs for muscle gain
        protein_g = 2.0 * body_weight_kg  # 2.0g per kg bodyweight
        fat_g = 0.8 * body_weight_kg  # 0.8g per kg bodyweight
        # Remaining calories from carbs
        protein_calories = protein_g * 4
        fat_calories = fat_g * 9
        carb_calories = target_calories - protein_calories - fat_calories
        carb_g = carb_calories / 4
        
    else:  # maintain
        # Balanced macros for maintenance
        protein_g = 1.8 * body_weight_kg  # 1.8g per kg bodyweight
        fat_g = 1.0 * body_weight_kg  # 1.0g per kg bodyweight
        # Remaining calories from carbs
        protein_calories = protein_g * 4
        fat_calories = fat_g * 9
        carb_calories = target_calories - protein_calories - fat_calories
        carb_g = carb_calories / 4
    
    # Ensure carbs don't go negative (can happen with very low calorie targets)
    carb_g = max(carb_g, 50)  # Minimum 50g carbs
    
    return {
        'protein': round(protein_g),
        'carbs': round(carb_g),
        'fat': round(fat_g)
    }

def calculate_weekly_adjustment(actual_data, goal_info, nutrition_plan):
    """
    Calculate suggested adjustments based on actual progress compared to goals
    
    Parameters:
    actual_data (DataFrame): Daily tracking data
    goal_info (dict): User's goals
    nutrition_plan (dict): Current nutrition plan
    
    Returns:
    dict: Suggested adjustments for calories and macros
    """
    if len(actual_data) < 7:
        return {
            'message': "Not enough data for adjustment (need at least 7 days)",
            'calorie_adjustment': 0,
            'protein_adjustment': 0,
            'carbs_adjustment': 0,
            'fat_adjustment': 0
        }
    
    # Get the last 7 days of data
    recent_data = actual_data.sort_values('date', ascending=False).head(7)
    
    # Calculate average actual values
    avg_weight = recent_data['weight_kg'].mean()
    avg_calories = recent_data['calories'].mean()
    avg_protein = recent_data['protein'].mean()
    avg_carbs = recent_data['carbs'].mean()
    avg_fat = recent_data['fat'].mean()
    
    # Calculate expected weekly weight change
    start_weight = actual_data.sort_values('date').iloc[0]['weight_kg']
    days_elapsed = (pd.to_datetime(actual_data['date'].max()) - 
                    pd.to_datetime(actual_data['date'].min())).days
    
    if days_elapsed < 7:
        days_elapsed = 7  # Minimum to avoid division by zero
    
    weeks_elapsed = days_elapsed / 7
    actual_weekly_change = (avg_weight - start_weight) / weeks_elapsed
    
    # Expected weekly change based on goal
    goal_type = goal_info['goal_type']
    timeline_weeks = goal_info['timeline_weeks']
    target_weight = goal_info['target_weight_kg']
    
    if goal_type == "lose_fat":
        expected_weekly_change = (target_weight - start_weight) / timeline_weeks
        # This should be negative for weight loss
    elif goal_type == "gain_muscle":
        expected_weekly_change = (target_weight - start_weight) / timeline_weeks
        # This should be positive for weight gain
    else:  # maintain
        expected_weekly_change = 0
    
    # Calculate the difference between actual and expected change
    weekly_difference = actual_weekly_change - expected_weekly_change
    
    # Calculate calorie adjustment (1kg ≈ 7700 calories)
    # If losing weight too quickly or gaining too slowly, add calories
    # If losing weight too slowly or gaining too quickly, reduce calories
    calorie_adjustment = -weekly_difference * 7700 / 7  # Daily adjustment
    
    # Adjust only if the difference is significant (>0.1kg per week)
    if abs(weekly_difference) < 0.1:
        return {
            'message': "On track! No adjustment needed.",
            'calorie_adjustment': 0,
            'protein_adjustment': 0,
            'carbs_adjustment': 0,
            'fat_adjustment': 0
        }
    
    # Calculate macro adjustments
    if goal_type == "lose_fat":
        # For fat loss, primarily adjust carbs and fat
        protein_adjustment = 0  # Maintain protein
        fat_adjustment = calorie_adjustment * 0.3 / 9  # 30% from fat
        carb_adjustment = calorie_adjustment * 0.7 / 4  # 70% from carbs
    elif goal_type == "gain_muscle":
        # For muscle gain, emphasize carbs more
        protein_adjustment = calorie_adjustment * 0.2 / 4  # 20% from protein
        fat_adjustment = calorie_adjustment * 0.2 / 9  # 20% from fat
        carb_adjustment = calorie_adjustment * 0.6 / 4  # 60% from carbs
    else:  # maintain
        # Balanced adjustment
        protein_adjustment = calorie_adjustment * 0.25 / 4  # 25% from protein
        fat_adjustment = calorie_adjustment * 0.25 / 9  # 25% from fat
        carb_adjustment = calorie_adjustment * 0.5 / 4  # 50% from carbs
    
    message = ""
    if calorie_adjustment > 0:
        message = f"Increase daily calories by {abs(calorie_adjustment):.0f} kcal to stay on track."
    elif calorie_adjustment < 0:
        message = f"Decrease daily calories by {abs(calorie_adjustment):.0f} kcal to stay on track."
    
    return {
        'message': message,
        'calorie_adjustment': round(calorie_adjustment),
        'protein_adjustment': round(protein_adjustment),
        'carbs_adjustment': round(carb_adjustment),
        'fat_adjustment': round(fat_adjustment)
    }

def plot_weight_trend(data, goal_info, use_pounds=True):
    """
    Create a plot showing weight trend against target
    
    Parameters:
    data (DataFrame): Daily tracking data
    goal_info (dict): User's goals
    use_pounds (bool): If True, display weight in pounds, otherwise kg
    
    Returns:
    matplotlib.figure.Figure: Weight trend plot
    """
    if data.empty or 'date' not in data.columns:
        return None
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Convert date column to datetime if it's not already
    data = data.copy()  # Make a copy to avoid modifying original
    data['date'] = pd.to_datetime(data['date'])
    
    # Ensure weight_lbs exists if needed (for backward compatibility)
    if use_pounds and 'weight_lbs' not in data.columns:
        data['weight_lbs'] = data['weight_kg'] * 2.20462
    
    # Sort by date
    plot_data = data.sort_values('date')
    
    # Determine which weight column to use
    weight_col = 'weight_lbs' if use_pounds else 'weight_kg'
    weight_unit = 'lbs' if use_pounds else 'kg'
    
    # Plot actual weight data
    ax.plot(plot_data['date'], plot_data[weight_col], 'o-', label='Actual Weight')
    
    # If goal info is available, plot projected weight line
    start_date_str = goal_info.get('start_date')
    target_weight_kg = goal_info.get('target_weight_kg')
    target_weight_lbs = goal_info.get('target_weight_lbs')
    timeline_weeks = goal_info.get('timeline_weeks')
    
    if start_date_str and timeline_weeks:
        # Get target weight in the correct unit
        if use_pounds:
            target_weight = target_weight_lbs if target_weight_lbs else (target_weight_kg * 2.20462 if target_weight_kg else None)
        else:
            target_weight = target_weight_kg if target_weight_kg else (target_weight_lbs / 2.20462 if target_weight_lbs else None)
        
        if target_weight:
            start_date = pd.to_datetime(start_date_str)
            
            # Get starting weight from data that is after start date
            plot_data_after_start = plot_data[plot_data['date'] >= start_date]
            if not plot_data_after_start.empty:
                start_weight = plot_data_after_start[weight_col].iloc[0]
            else:
                # Fall back to current weight in user_info
                if use_pounds:
                    start_weight = goal_info.get('weight_lbs', plot_data[weight_col].iloc[0] if not plot_data.empty else 0)
                else:
                    start_weight = goal_info.get('weight_kg', plot_data[weight_col].iloc[0] if not plot_data.empty else 0)
            
            end_date = start_date + timedelta(days=timeline_weeks * 7)
            
            # Create projected weight line
            date_range = pd.date_range(start=start_date, end=end_date, freq='D')
            weight_diff = target_weight - start_weight
            daily_change = weight_diff / len(date_range)
            projected_weights = [start_weight + (i * daily_change) for i in range(len(date_range))]
            
            # Plot projected weight
            ax.plot(date_range, projected_weights, '--', label='Target Trajectory', color='green')
            
            # Plot target point
            ax.plot(end_date, target_weight, 'D', label='Goal', color='green', markersize=8)
    
    ax.set_xlabel('Date')
    ax.set_ylabel(f'Weight ({weight_unit})')
    ax.set_title('Weight Trend vs. Target')
    ax.grid(True, linestyle='--', alpha=0.7)
    ax.legend()
    
    # Beautify the plot
    plt.tight_layout()
    
    return fig

def plot_macro_adherence(data, nutrition_plan):
    """Create plots showing adherence to macro targets"""
    if data.empty:
        return None
    
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # Convert date column to datetime if it's not already
    data['date'] = pd.to_datetime(data['date'])
    
    # Sort by date
    plot_data = data.sort_values('date')
    
    # Plot calories
    axes[0, 0].plot(plot_data['date'], plot_data['calories'], 'o-', color='blue')
    if nutrition_plan['target_calories']:
        axes[0, 0].axhline(y=nutrition_plan['target_calories'], color='r', linestyle='--', label='Target')
    axes[0, 0].set_title('Daily Calories')
    axes[0, 0].set_ylabel('Calories (kcal)')
    axes[0, 0].grid(True, linestyle='--', alpha=0.7)
    
    # Plot protein
    axes[0, 1].plot(plot_data['date'], plot_data['protein'], 'o-', color='red')
    if nutrition_plan['target_protein']:
        axes[0, 1].axhline(y=nutrition_plan['target_protein'], color='r', linestyle='--', label='Target')
    axes[0, 1].set_title('Daily Protein')
    axes[0, 1].set_ylabel('Protein (g)')
    axes[0, 1].grid(True, linestyle='--', alpha=0.7)
    
    # Plot carbs
    axes[1, 0].plot(plot_data['date'], plot_data['carbs'], 'o-', color='green')
    if nutrition_plan['target_carbs']:
        axes[1, 0].axhline(y=nutrition_plan['target_carbs'], color='r', linestyle='--', label='Target')
    axes[1, 0].set_title('Daily Carbs')
    axes[1, 0].set_ylabel('Carbs (g)')
    axes[1, 0].set_xlabel('Date')
    axes[1, 0].grid(True, linestyle='--', alpha=0.7)
    
    # Plot fat
    axes[1, 1].plot(plot_data['date'], plot_data['fat'], 'o-', color='orange')
    if nutrition_plan['target_fat']:
        axes[1, 1].axhline(y=nutrition_plan['target_fat'], color='r', linestyle='--', label='Target')
    axes[1, 1].set_title('Daily Fat')
    axes[1, 1].set_ylabel('Fat (g)')
    axes[1, 1].set_xlabel('Date')
    axes[1, 1].grid(True, linestyle='--', alpha=0.7)
    
    # Add legends
    for ax in axes.flatten():
        ax.legend()
    
    plt.tight_layout()
    
    return fig

def save_data():
    """Save session state data to CSV files"""
    # Save user info
    pd.DataFrame([st.session_state.user_info]).to_csv('data/user_info.csv', index=False)
    
    # Save goal info
    pd.DataFrame([st.session_state.goal_info]).to_csv('data/goal_info.csv', index=False)
    
    # Save nutrition plan
    # First, extract the weekly_adjustments into a separate dataframe
    adjustments_df = pd.DataFrame(st.session_state.nutrition_plan.get('weekly_adjustments', []))
    if not adjustments_df.empty:
        adjustments_df.to_csv('data/weekly_adjustments.csv', index=False)
    
    # Save main nutrition plan without the weekly_adjustments list
    nutrition_plan_copy = st.session_state.nutrition_plan.copy()
    if 'weekly_adjustments' in nutrition_plan_copy:
        del nutrition_plan_copy['weekly_adjustments']
    pd.DataFrame([nutrition_plan_copy]).to_csv('data/nutrition_plan.csv', index=False)
    
    # Save daily records
    st.session_state.daily_records.to_csv('data/daily_records.csv', index=False)

def load_data():
    """Load data from CSV files into session state"""
    try:
        # Load user info
        if os.path.exists('data/user_info.csv'):
            user_info_df = pd.read_csv('data/user_info.csv')
            if not user_info_df.empty:
                st.session_state.user_info = user_info_df.iloc[0].to_dict()
        
        # Load goal info
        if os.path.exists('data/goal_info.csv'):
            goal_info_df = pd.read_csv('data/goal_info.csv')
            if not goal_info_df.empty:
                st.session_state.goal_info = goal_info_df.iloc[0].to_dict()
        
        # Load nutrition plan
        if os.path.exists('data/nutrition_plan.csv'):
            nutrition_plan_df = pd.read_csv('data/nutrition_plan.csv')
            if not nutrition_plan_df.empty:
                st.session_state.nutrition_plan = nutrition_plan_df.iloc[0].to_dict()
        
        # Load weekly adjustments
        if os.path.exists('data/weekly_adjustments.csv'):
            adjustments_df = pd.read_csv('data/weekly_adjustments.csv')
            st.session_state.nutrition_plan['weekly_adjustments'] = adjustments_df.to_dict('records')
        
        # Load daily records
        if os.path.exists('data/daily_records.csv'):
            st.session_state.daily_records = pd.read_csv('data/daily_records.csv')
    
    except Exception as e:
        st.error(f"Error loading data: {e}")
