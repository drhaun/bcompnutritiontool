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
    
    # Ensure we have valid values and minimum calories
    if not target_calories or target_calories < 1200:
        target_calories = max(1200, target_calories if target_calories else 1200)
    
    # Convert kg to lbs for easier reference
    body_weight_lbs = body_weight_kg * 2.20462
    
    if goal_type == "lose_fat":
        # Higher protein for fat loss
        protein_g = 2.2 * body_weight_kg  # 2.2g per kg bodyweight (1.0g per lb)
        fat_g = 0.8 * body_weight_kg  # 0.8g per kg bodyweight (0.35g per lb)
    elif goal_type == "gain_muscle":
        # High protein and carbs for muscle gain
        protein_g = 2.0 * body_weight_kg  # 2.0g per kg bodyweight (0.9g per lb)
        fat_g = 0.8 * body_weight_kg  # 0.8g per kg bodyweight (0.35g per lb)
    else:  # maintain
        # Balanced macros for maintenance
        protein_g = 1.8 * body_weight_kg  # 1.8g per kg bodyweight (0.8g per lb)
        fat_g = 1.0 * body_weight_kg  # 1.0g per kg bodyweight (0.45g per lb)
    
    # Calculate calories from protein and fat
    protein_calories = protein_g * 4
    fat_calories = fat_g * 9
    
    # Calculate remaining calories for carbs
    carb_calories = target_calories - protein_calories - fat_calories
    
    # Handle negative or zero carb calories
    if carb_calories <= 0:
        # If we can't fit carbs in the calorie target, adjust fat down
        fat_g_min = 0.5 * body_weight_kg  # Minimum fat (0.25g per lb)
        fat_g = max(fat_g_min, fat_g)
        
        # Recalculate fat calories
        fat_calories = fat_g * 9
        
        # Recalculate carb calories
        carb_calories = target_calories - protein_calories - fat_calories
        
        # If still negative, adjust protein down slightly
        if carb_calories <= 0:
            protein_g_min = 1.6 * body_weight_kg  # Minimum protein (0.7g per lb)
            protein_g = max(protein_g_min, protein_g)
            protein_calories = protein_g * 4
            carb_calories = target_calories - protein_calories - fat_calories
    
    # Convert carb calories to grams
    carb_g = carb_calories / 4 if carb_calories > 0 else 50
    
    # Ensure minimum carbs for health (50g or at least 0.25g/lb of bodyweight)
    min_carbs = max(50, 0.25 * body_weight_lbs)
    carb_g = max(carb_g, min_carbs)
    
    # Ensure we're returning whole numbers
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

def get_performance_preference_multipliers(preference):
    """
    Get rate modifiers based on performance preference
    
    Parameters:
    preference (str): The performance preference selection
    
    Returns:
    dict: Multipliers for gain_rate, gain_fat_pct, loss_rate, loss_fat_pct
    """
    if preference == "I'm ok if my performance and recovery from training aren't as good during this phase in order to achieve my body composition goal.":
        # Body Composition priority
        # Based on data table: Performance No has gain rate 0.01, gain fat % 0.50, loss rate 0.02, loss fat % 0.80
        return {
            "gain_rate": 0.0050,  # Higher gain rate (faster changes, may impact performance)
            "gain_fat_pct": 0.50,  # Higher fat percentage (faster weight gain, less concern with fat gain)
            "loss_rate": 0.0125,  # Higher loss rate (faster fat loss but may impact performance)
            "loss_fat_pct": 0.80   # Lower fat % (may lose more muscle, less concern with performance)
        }
    else:
        # Performance and Recovery priority
        # Based on data table: Performance Yes has gain rate 0.00, gain fat % 0.30, loss rate 0.01, loss fat % 1.00
        return {
            "gain_rate": 0.0025,  # Lower gain rate (slower, more sustainable for performance)
            "gain_fat_pct": 0.30,  # Lower fat percentage (cleaner gains, better for performance)
            "loss_rate": 0.0050,  # Lower loss rate (slower, more sustainable for performance)
            "loss_fat_pct": 1.0    # Higher fat % (preserving all muscle for performance)
        }

def get_body_comp_tradeoff_multipliers(preference, goal_type):
    """
    Get rate modifiers based on body composition tradeoff preference
    
    Parameters:
    preference (str): The body comp tradeoff preference
    goal_type (str): "Muscle Gain" or "Fat Loss"
    
    Returns:
    dict: Multipliers for gain_rate, gain_fat_pct, loss_rate, loss_fat_pct or None if not applicable
    """
    if goal_type == "Muscle Gain":
        if preference == "I'm ok with gaining a little body fat to maximize muscle growth.":
            return {
                "gain_rate": 0.0075,  # Higher gain rate for more muscle growth
                "gain_fat_pct": 0.50,  # Higher fat percentage (accepting more fat gain)
                "loss_rate": None,
                "loss_fat_pct": None
            }
        else:  # Don't want to gain body fat
            # Based on your table: "Don't want to gain any body fat" has gain rate 0.00, gain fat % 0.10
            return {
                "gain_rate": 0.0013,  # Very low gain rate for minimal fat gain
                "gain_fat_pct": 0.10,  # Very low fat percentage (mostly lean gains)
                "loss_rate": None,
                "loss_fat_pct": None
            }
    else:  # Fat Loss
        if preference == "I don't want to lose any muscle mass while losing body fat.":
            return {
                "gain_rate": None,
                "gain_fat_pct": None,
                "loss_rate": 0.0025,  # Slower fat loss rate to preserve muscle
                "loss_fat_pct": 1.00   # 100% fat loss (no muscle loss)
            }
        else:  # Ok with losing muscle
            return {
                "gain_rate": None,
                "gain_fat_pct": None,
                "loss_rate": 0.0125,  # Faster fat loss rate
                "loss_fat_pct": 0.50   # Only 50% fat loss (more muscle loss)
            }

def get_activity_level_multipliers(activity_level):
    """
    Get rate modifiers based on activity level
    
    Parameters:
    activity_level (str): The activity level selection
    
    Returns:
    dict: Values for gain_rate, gain_fat_pct, loss_rate, loss_fat_pct
    """
    # Based on your table: Activity Level Light has gain rate 0.00, gain fat % 0.50, loss rate 0.01, loss fat % 0.01
    if activity_level == "Light (mostly sedentary, minimal physical activity)":
        return {
            "gain_rate": 0.0025,  # Lower gain rate due to less activity
            "gain_fat_pct": 0.50,  # Higher fat percentage due to less activity
            "loss_rate": 0.0075,  # Moderate loss rate
            "loss_fat_pct": 0.70   # Lower fat percentage (more muscle loss with less activity)
        }
    elif activity_level == "Moderate (regular daily activity, some exercise)":
        return {
            "gain_rate": 0.0050,  # Moderate gain rate
            "gain_fat_pct": 0.30,  # Moderate fat percentage
            "loss_rate": 0.0100,  # Higher loss rate 
            "loss_fat_pct": 0.80   # Higher fat percentage (better muscle preservation)
        }
    else:  # High activity
        return {
            "gain_rate": 0.0075,  # Higher gain rate with high activity
            "gain_fat_pct": 0.20,  # Lower fat percentage (better nutrient partitioning)
            "loss_rate": 0.0125,  # Highest loss rate with high activity
            "loss_fat_pct": 0.90   # Highest fat percentage (best muscle preservation)
        }

def get_workout_frequency_multipliers(frequency):
    """
    Get rate modifiers based on workout frequency
    
    Parameters:
    frequency (str): The workout frequency selection
    
    Returns:
    dict: Values for gain_rate, gain_fat_pct, loss_rate, loss_fat_pct
    """
    # Based on your table: Workout Frequency >5 has gain rate 0.01, gain fat % 0.10, loss rate 0.05, loss fat % 1.00
    if "5+" in frequency:
        return {
            "gain_rate": 0.0100,  # Highest gain rate with frequent workouts
            "gain_fat_pct": 0.10,  # Lowest fat percentage (optimal nutrient partitioning)
            "loss_rate": 0.0125,  # Highest loss rate with frequent workouts
            "loss_fat_pct": 1.00   # 100% fat loss (best muscle preservation)
        }
    elif "3-4" in frequency:
        return {
            "gain_rate": 0.0075,  # High gain rate
            "gain_fat_pct": 0.20,  # Low fat percentage
            "loss_rate": 0.0100,  # High loss rate
            "loss_fat_pct": 0.90   # High fat percentage (good muscle preservation)
        }
    elif "1-2" in frequency:
        return {
            "gain_rate": 0.0050,  # Moderate gain rate
            "gain_fat_pct": 0.30,  # Moderate fat percentage
            "loss_rate": 0.0075,  # Moderate loss rate
            "loss_fat_pct": 0.80   # Moderate fat percentage (some muscle loss)
        }
    else:  # Less than once per week
        return {
            "gain_rate": 0.0025,  # Low gain rate with infrequent workouts
            "gain_fat_pct": 0.50,  # Higher fat percentage
            "loss_rate": 0.0050,  # Lower loss rate
            "loss_fat_pct": 0.60   # Lower fat percentage (more muscle loss)
        }

def get_commitment_level_multipliers(commitment):
    """
    Get rate modifiers based on commitment level
    
    Parameters:
    commitment (str): The commitment level selection string
    
    Returns:
    dict: Multipliers for gain_rate, gain_fat_pct, loss_rate, loss_fat_pct
    """
    if "I am committed to prioritizing adequate sleep" in commitment:
        # High commitment
        return {
            "gain_rate": 0.0050,  # Higher gain rate due to better recovery and consistency
            "gain_fat_pct": 0.100,  # Lower fat percentage (cleaner gains with better nutrition)
            "loss_rate": 0.0125,  # Faster fat loss with high commitment
            "loss_fat_pct": 1.00   # 100% fat loss (better muscle preservation)
        }
    elif "I can commit to at least a few workouts per week" in commitment:
        # Moderate commitment
        return {
            "gain_rate": 0.0025,  # Moderate gain rate
            "gain_fat_pct": 0.500,  # Moderate fat percentage
            "loss_rate": 0.0075,  # Moderate fat loss rate
            "loss_fat_pct": 0.80   # 80% fat loss (some muscle loss)
        }
    else:
        # Low commitment - based on your table: Low commitment has gain rate 0.00, gain fat % 0.80, loss rate 0.00, loss fat % 0.50
        return {
            "gain_rate": 0.0013,  # Very low gain rate due to inconsistent training/nutrition
            "gain_fat_pct": 0.800,  # Higher fat percentage with gains (poorer nutrient partitioning)
            "loss_rate": 0.0025,  # Slower fat loss rate with low commitment
            "loss_fat_pct": 0.50   # Only 50% fat loss (more muscle loss with low commitment)
        }

def get_combined_category_rates(fmi_category_name, ffmi_category_name):
    """
    Get recommended rates based on the combination of FMI and FFMI categories
    
    Parameters:
    fmi_category_name (str): FMI category name
    ffmi_category_name (str): FFMI category name
    
    Returns:
    dict: Recommended rates and composition suggestion
    """
    # Comprehensive combination table
    combination_rates = {
        # Extremely Lean combinations
        ("Extremely Lean", "Undermuscled"): 
            {"recommendation": "Gain Muscle Mass", "gain_rate": 0.0075, "loss_rate": 0.0000},
        ("Extremely Lean", "Moderately Undermuscled"): 
            {"recommendation": "Gain Muscle Mass", "gain_rate": 0.0075, "loss_rate": 0.0000},
        ("Extremely Lean", "Considered Healthy"): 
            {"recommendation": "Gain Muscle Mass", "gain_rate": 0.0075, "loss_rate": 0.0000},
        ("Extremely Lean", "Muscular"): 
            {"recommendation": "No Indication", "gain_rate": 0.0013, "loss_rate": 0.0025},
        ("Extremely Lean", "High"): 
            {"recommendation": "No Indication", "gain_rate": 0.0013, "loss_rate": 0.0025},
            
        # Lean combinations
        ("Lean", "Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0050, "loss_rate": 0.0000},
        ("Lean", "Moderately Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0050, "loss_rate": 0.0000},
        ("Lean", "Considered Healthy"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0050, "loss_rate": 0.0000},
        ("Lean", "Muscular"): 
            {"recommendation": "No Indication", "gain_rate": 0.0013, "loss_rate": 0.0025},
        ("Lean", "High"): 
            {"recommendation": "No Indication", "gain_rate": 0.0000, "loss_rate": 0.0025},
            
        # Considered Healthy combinations
        ("Considered Healthy", "Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0025, "loss_rate": 0.0000},
        ("Considered Healthy", "Moderately Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0013, "loss_rate": 0.0000},
        ("Considered Healthy", "Considered Healthy"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0013, "loss_rate": 0.0025},
        ("Considered Healthy", "Muscular"): 
            {"recommendation": "Lose Fat", "gain_rate": 0.0013, "loss_rate": 0.0025},
        ("Considered Healthy", "High"): 
            {"recommendation": "Lose Fat", "gain_rate": 0.0000, "loss_rate": 0.0025},
            
        # Slightly Overfat combinations
        ("Slightly Overfat", "Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0000, "loss_rate": 0.0025},
        ("Slightly Overfat", "Moderately Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0000, "loss_rate": 0.0025},
        ("Slightly Overfat", "Considered Healthy"): 
            {"recommendation": "Lose Fat", "gain_rate": 0.0000, "loss_rate": 0.0050},
        ("Slightly Overfat", "Muscular"): 
            {"recommendation": "Lose Fat", "gain_rate": 0.0000, "loss_rate": 0.0050},
        ("Slightly Overfat", "High"): 
            {"recommendation": "Lose Fat", "gain_rate": 0.0000, "loss_rate": 0.0050},
            
        # Overfat combinations
        ("Overfat", "Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0000, "loss_rate": 0.0025},
        ("Overfat", "Moderately Undermuscled"): 
            {"recommendation": "Gain Muscle", "gain_rate": 0.0000, "loss_rate": 0.0025},
        ("Overfat", "Considered Healthy"): 
            {"recommendation": "Lose Body Fat", "gain_rate": 0.0000, "loss_rate": 0.0075},
        ("Overfat", "Muscular"): 
            {"recommendation": "Lose Body Fat", "gain_rate": 0.0000, "loss_rate": 0.0075},
        ("Overfat", "High"): 
            {"recommendation": "Lose Body Fat", "gain_rate": 0.0000, "loss_rate": 0.0075},
            
        # Significantly Overfat combinations
        ("Significantly Overfat", "Undermuscled"): 
            {"recommendation": "Gain Muscle Mass", "gain_rate": 0.0000, "loss_rate": 0.0025},
        ("Significantly Overfat", "Moderately Undermuscled"): 
            {"recommendation": "Gain Muscle Mass", "gain_rate": 0.0000, "loss_rate": 0.0025},
        ("Significantly Overfat", "Considered Healthy"): 
            {"recommendation": "Lose Body Fat", "gain_rate": 0.0000, "loss_rate": 0.0100},
        ("Significantly Overfat", "Muscular"): 
            {"recommendation": "Lose Body Fat", "gain_rate": 0.0000, "loss_rate": 0.0100},
        ("Significantly Overfat", "High"): 
            {"recommendation": "Lose Body Fat", "gain_rate": 0.0000, "loss_rate": 0.0100}
    }
    
    # Get the combination key
    combo_key = (fmi_category_name, ffmi_category_name)
    
    # Return the rates for this combination, or a default if not found
    return combination_rates.get(combo_key, {
        "recommendation": "Maintain",
        "gain_rate": 0.0025,
        "loss_rate": 0.0025
    })

def calculate_recommended_rate(user_data, goal_type):
    """
    Calculate recommended weekly weight change rate and body composition breakdown
    
    Parameters:
    user_data (dict): User information including FMI category, FFMI category, preferences
    goal_type (str): "Muscle Gain" or "Fat Loss"
    
    Returns:
    dict: Recommended weekly rate and composition percentages
    """
    # Get category-based recommendations
    fmi_category = user_data.get("fmi_category", {})
    ffmi_category = user_data.get("ffmi_category", {})
    
    # Get preference-based multipliers
    performance_multipliers = get_performance_preference_multipliers(
        user_data.get("performance_preference", "")
    )
    
    body_comp_multipliers = get_body_comp_tradeoff_multipliers(
        user_data.get("body_comp_preference", ""),
        goal_type
    )
    
    commitment_multipliers = get_commitment_level_multipliers(
        user_data.get("commitment_level", "")
    )
    
    # First try to get combined category recommendation
    fmi_category_name = fmi_category.get("name", "Considered Healthy") if fmi_category else "Considered Healthy"
    ffmi_category_name = ffmi_category.get("name", "Considered Healthy") if ffmi_category else "Considered Healthy"
    
    combined_recommendation = get_combined_category_rates(fmi_category_name, ffmi_category_name)
    
    # Determine base values from categories and combined recommendation
    if goal_type == "Muscle Gain":
        # For muscle gain, use the combined recommendation gain rate
        base_rate = combined_recommendation.get("gain_rate", 0.0025)
        
        # Use rate from individual categories for fat percentage 
        if fmi_category and "gain_fat_pct" in fmi_category:
            base_fat_pct = fmi_category.get("gain_fat_pct", 0.50)
        elif ffmi_category and "gain_fat_pct" in ffmi_category:
            base_fat_pct = ffmi_category.get("gain_fat_pct", 0.50)
        else:
            # Default fat percentage based on FMI category name
            if "Extremely Lean" in fmi_category_name or "Lean" in fmi_category_name:
                base_fat_pct = 0.10
            elif "Considered Healthy" in fmi_category_name:
                base_fat_pct = 0.50
            elif "Overfat" in fmi_category_name:
                base_fat_pct = 0.80
            else:
                base_fat_pct = 0.50
    else:
        # For fat loss, use the combined recommendation loss rate
        base_rate = combined_recommendation.get("loss_rate", 0.0050)
        
        # Use rate from individual categories for fat percentage
        if fmi_category and "loss_fat_pct" in fmi_category:
            base_fat_pct = fmi_category.get("loss_fat_pct", 0.80)
        elif ffmi_category and "loss_fat_pct" in ffmi_category:
            base_fat_pct = ffmi_category.get("loss_fat_pct", 0.80)
        else:
            # Default fat percentage based on commitment
            if "High" in user_data.get("commitment_level", ""):
                base_fat_pct = 1.00  # 100% fat (preserving all muscle)
            else:
                base_fat_pct = 0.80   # 80% fat (20% muscle)
    
    # Get activity level multipliers
    activity_multipliers = get_activity_level_multipliers(
        user_data.get("activity_level", "Moderate (regular daily activity, some exercise)")
    )
    
    # Get workout frequency multipliers
    workout_multipliers = get_workout_frequency_multipliers(
        user_data.get("workout_frequency", "1-2 workouts per week")
    )
    
    # Apply preference modifiers (taking the average)
    if goal_type == "Muscle Gain":
        modifiers = [
            performance_multipliers.get("gain_rate"),
            body_comp_multipliers.get("gain_rate") if body_comp_multipliers else None,
            commitment_multipliers.get("gain_rate"),
            activity_multipliers.get("gain_rate"),
            workout_multipliers.get("gain_rate")
        ]
        
        fat_modifiers = [
            performance_multipliers.get("gain_fat_pct"),
            body_comp_multipliers.get("gain_fat_pct") if body_comp_multipliers else None,
            commitment_multipliers.get("gain_fat_pct"),
            activity_multipliers.get("gain_fat_pct"),
            workout_multipliers.get("gain_fat_pct")
        ]
    else:
        modifiers = [
            performance_multipliers.get("loss_rate"),
            body_comp_multipliers.get("loss_rate") if body_comp_multipliers else None,
            commitment_multipliers.get("loss_rate"),
            activity_multipliers.get("loss_rate"),
            workout_multipliers.get("loss_rate")
        ]
        
        fat_modifiers = [
            performance_multipliers.get("loss_fat_pct"),
            body_comp_multipliers.get("loss_fat_pct") if body_comp_multipliers else None,
            commitment_multipliers.get("loss_fat_pct"),
            activity_multipliers.get("loss_fat_pct"),
            workout_multipliers.get("loss_fat_pct")
        ]
    
    # Filter out None values
    modifiers = [m for m in modifiers if m is not None]
    fat_modifiers = [m for m in fat_modifiers if m is not None]
    
    # Calculate final recommendations with weighted components
    if modifiers:
        # Enhanced weighting system that prioritizes certain factors
        # Define weights for different modifiers based on their importance from the data table
        
        # First calculate the base from body composition (FMI/FFMI) - 40% weight
        body_comp_weight = 0.4
        body_comp_contrib = base_rate * body_comp_weight
        
        # Calculate remaining weight to distribute
        remaining_weight = 1.0 - body_comp_weight
        
        # Get specific modifiers we want to assign different weights to
        activity_modifier = activity_multipliers.get("gain_rate" if goal_type == "Muscle Gain" else "loss_rate")
        workout_modifier = workout_multipliers.get("gain_rate" if goal_type == "Muscle Gain" else "loss_rate")
        
        # Isolate these from the general modifiers list
        other_modifiers = [m for m in modifiers if m != activity_modifier and m != workout_modifier]
        
        # Assign 25% to workout frequency, 15% to activity level, and 20% to other factors
        if workout_modifier is not None:
            workout_weight = 0.25
            workout_contrib = workout_modifier * workout_weight
        else:
            workout_weight = 0
            workout_contrib = 0
            
        if activity_modifier is not None:
            activity_weight = 0.15
            activity_contrib = activity_modifier * activity_weight
        else:
            activity_weight = 0
            activity_contrib = 0
            
        # Remaining weight goes to other factors (preferences, commitment)
        if other_modifiers:
            other_weight = remaining_weight - workout_weight - activity_weight
            other_contrib = (sum(other_modifiers) / len(other_modifiers)) * other_weight
        else:
            other_contrib = 0
        
        # Combine all contributions
        final_rate = body_comp_contrib + workout_contrib + activity_contrib + other_contrib
    else:
        final_rate = base_rate
        
    # Similar weighted approach for fat percentage
    if fat_modifiers:
        # For fat percentage, we prioritize workout frequency and commitment level
        workout_fat_modifier = workout_multipliers.get("gain_fat_pct" if goal_type == "Muscle Gain" else "loss_fat_pct")
        commitment_fat_modifier = commitment_multipliers.get("gain_fat_pct" if goal_type == "Muscle Gain" else "loss_fat_pct")
        
        # Isolate these from the general fat modifiers list
        other_fat_modifiers = [m for m in fat_modifiers if m != workout_fat_modifier and m != commitment_fat_modifier]
        
        # Base fat percentage gets 30% weight
        base_fat_weight = 0.3
        base_fat_contrib = base_fat_pct * base_fat_weight
        
        # Workout frequency gets 30% weight for fat percentage
        if workout_fat_modifier is not None:
            workout_fat_weight = 0.3
            workout_fat_contrib = workout_fat_modifier * workout_fat_weight
        else:
            workout_fat_weight = 0
            workout_fat_contrib = 0
            
        # Commitment level gets 20% weight
        if commitment_fat_modifier is not None:
            commitment_fat_weight = 0.2
            commitment_fat_contrib = commitment_fat_modifier * commitment_fat_weight
        else:
            commitment_fat_weight = 0
            commitment_fat_contrib = 0
            
        # Other factors get remaining weight
        remaining_fat_weight = 1.0 - base_fat_weight - workout_fat_weight - commitment_fat_weight
        if other_fat_modifiers:
            other_fat_contrib = (sum(other_fat_modifiers) / len(other_fat_modifiers)) * remaining_fat_weight
        else:
            other_fat_contrib = 0
            
        # Combine all contributions for fat percentage
        final_fat_pct = base_fat_contrib + workout_fat_contrib + commitment_fat_contrib + other_fat_contrib
    else:
        final_fat_pct = base_fat_pct
    
    # Turn percentages into actual weekly changes
    weekly_weight_pct = final_rate  # as decimal
    weekly_fat_pct = final_fat_pct  # as decimal
    
    # Store the recommended category for display
    recommended_category = combined_recommendation.get("recommendation", "Maintain")
    
    return {
        "weekly_weight_pct": weekly_weight_pct,
        "weekly_fat_pct": weekly_fat_pct,
        "weekly_muscle_pct": 1 - weekly_fat_pct,
        "recommendation": recommended_category
    }

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

def calculate_predicted_weeks(current_weight_kg, target_weight_kg, current_bf_pct, target_bf_pct, weekly_weight_pct, weekly_fat_pct, goal_type):
    """
    Calculate the predicted number of weeks to reach the target body composition
    
    Parameters:
    current_weight_kg (float): Current weight in kg
    target_weight_kg (float): Target weight in kg
    current_bf_pct (float): Current body fat percentage (as a whole number, e.g. 20 for 20%)
    target_bf_pct (float): Target body fat percentage (as a whole number, e.g. 15 for 15%)
    weekly_weight_pct (float): Selected percentage of weight change per week (as a decimal, e.g. 0.005 for 0.5%)
    weekly_fat_pct (float): Selected percentage of weight change as fat (as a decimal, e.g. 0.8 for 80%)
    goal_type (str): "lose_fat" or "gain_muscle"
    
    Returns:
    float: Predicted number of weeks to reach the target
    """
    # Convert body fat percentages to decimals
    current_bf = current_bf_pct / 100
    target_bf = target_bf_pct / 100
    
    # Calculate current fat mass and fat-free mass
    current_fat_mass = current_weight_kg * current_bf
    current_ffm = current_weight_kg * (1 - current_bf)
    
    # Calculate target fat mass and fat-free mass
    target_fat_mass = target_weight_kg * target_bf
    target_ffm = target_weight_kg * (1 - target_bf)
    
    if goal_type == "lose_fat":
        # For fat loss, use the logarithmic formula:
        # LOG(current body mass/predicted resultant body mass)/-LOG(1-selected % of weight loss per week)
        try:
            predicted_weeks = np.log(current_weight_kg/target_weight_kg) / -np.log(1 - weekly_weight_pct)
            return max(1, round(predicted_weeks))  # Ensure at least 1 week
        except (ValueError, ZeroDivisionError):
            # Fallback calculation if logarithmic formula fails
            if weekly_weight_pct > 0:
                # Simple linear calculation
                weight_to_lose = current_weight_kg - target_weight_kg
                weekly_loss_kg = current_weight_kg * weekly_weight_pct
                predicted_weeks = weight_to_lose / weekly_loss_kg if weekly_loss_kg > 0 else 52
                return max(1, round(predicted_weeks))
            return 52  # Default to a year if no valid calculation
    else:  # gain_muscle
        # For muscle gain, use the formula:
        # (Target fat-free mass - Current fat-free mass) / 
        # (current body mass * selected % rate of gain per week * (1 - selected % of weight gain as fat per week))
        try:
            ffm_to_gain = target_ffm - current_ffm
            weekly_ffm_gain = current_weight_kg * weekly_weight_pct * (1 - weekly_fat_pct)
            predicted_weeks = ffm_to_gain / weekly_ffm_gain if weekly_ffm_gain > 0 else 52
            return max(1, round(predicted_weeks))
        except (ValueError, ZeroDivisionError):
            # Fallback to simple calculation
            if weekly_weight_pct > 0:
                weight_to_gain = target_weight_kg - current_weight_kg
                weekly_gain_kg = current_weight_kg * weekly_weight_pct
                predicted_weeks = weight_to_gain / weekly_gain_kg if weekly_gain_kg > 0 else 52
                return max(1, round(predicted_weeks))
            return 52  # Default to a year if no valid calculation

def generate_detailed_progress_table(current_weight_lbs, current_bf_pct, target_weight_lbs, target_bf_pct, 
                              weekly_weight_pct, weekly_fat_pct, timeline_weeks, start_date, tdee, gender, age, height_cm):
    """
    Generate a detailed weekly progress table showing expected weight, body composition, and energy data
    for each week of the plan.
    
    Parameters:
    current_weight_lbs (float): Starting weight in pounds
    current_bf_pct (float): Starting body fat percentage
    target_weight_lbs (float): Target weight in pounds
    target_bf_pct (float): Target body fat percentage
    weekly_weight_pct (float): Weekly weight change as percentage of current weight (decimal)
    weekly_fat_pct (float): Percentage of weight change that is fat (decimal)
    timeline_weeks (int): Number of weeks for the plan
    start_date (str): Starting date in format 'YYYY-MM-DD'
    tdee (float): Total Daily Energy Expenditure in calories
    gender (str): "Male" or "Female"
    age (int): Age in years
    height_cm (float): Height in centimeters
    
    Returns:
    pd.DataFrame: Detailed progress table with weekly projections
    """
    try:
        # Convert pounds to kg for calculations
        current_weight_kg = current_weight_lbs / 2.20462
        target_weight_kg = target_weight_lbs / 2.20462
        
        # Calculate starting fat mass and fat-free mass
        current_fat_mass_kg = current_weight_kg * (current_bf_pct/100)
        current_ffm_kg = current_weight_kg - current_fat_mass_kg
        
        # Convert to pounds for display
        current_fat_mass_lbs = current_fat_mass_kg * 2.20462
        current_ffm_lbs = current_ffm_kg * 2.20462
        
        # Calculate total weight change and weekly weight change
        total_weight_change_kg = target_weight_kg - current_weight_kg
        total_weight_change_lbs = target_weight_lbs - current_weight_lbs
        weekly_weight_change_kg = total_weight_change_kg / timeline_weeks
        weekly_weight_change_lbs = weekly_weight_change_kg * 2.20462
        
        # Determine if this is a weight gain or loss goal
        goal_is_gain = total_weight_change_kg > 0
        
        # Parse start date
        if isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                # Fallback if date format is wrong
                start_date = datetime.now().date()
        else:
            # Fallback if not a string
            start_date = datetime.now().date()
        
        # Initialize data structure
        progress_data = []
        
        # Current stats
        weight_kg = current_weight_kg
        weight_lbs = current_weight_lbs
        fat_mass_kg = current_fat_mass_kg
        fat_mass_lbs = current_fat_mass_lbs
        ffm_kg = current_ffm_kg
        ffm_lbs = current_ffm_lbs
        body_fat_pct = current_bf_pct
        
        # Energy availability per kg of FFM (measure of energy surplus/deficit relative to lean mass)
        energy_availability = 0
        cumulative_fat_change = 0  # Track cumulative fat change from starting point
        
        for week in range(int(timeline_weeks) + 1):  # +1 to include the final state, convert float to int
            # Calculate the date for this week
            date = start_date + timedelta(days=7 * week)
            
            # Calculate energy balance needed to achieve the weekly change
            daily_energy_balance = 0
            if week > 0:  # Skip week 0 (starting point)
                # Caloric surplus/deficit needed (~7700 kcal per kg of weight change)
                if goal_is_gain:
                    daily_energy_balance = (abs(weekly_weight_change_kg) * 7700) / 7  # Daily surplus
                else:
                    daily_energy_balance = -1 * (abs(weekly_weight_change_kg) * 7700) / 7  # Daily deficit
            
            # Calculate TDEE based on current weight
            current_tdee = calculate_tdee(gender, weight_kg, height_cm, age, "Sedentary (office job, <2 hours exercise per week)")
            
            # Calculate target energy intake
            target_energy = current_tdee + daily_energy_balance
            
            # Calculate energy availability per kg of FFM (important metric for athletes)
            if ffm_kg > 0:
                energy_availability = target_energy / ffm_kg
            
            # Only store the initial values for week 0
            if week == 0:
                progress_data.append({
                    'Date': date.strftime('%m/%d/%Y'),
                    'Week': week,
                    'Starting Weight (lbs)': round(weight_lbs, 1),
                    'Ending Weight (lbs)': round(weight_lbs, 1),
                    'Weekly Change (lbs)': 0.0,
                    'Starting Fat Mass (lbs)': round(fat_mass_lbs, 1),
                    'Ending Fat Mass (lbs)': round(fat_mass_lbs, 1),
                    'Fat Mass Change (lbs)': 0.0,
                    'Cumulative Fat Change (lbs)': 0.0,
                    'Starting FFM (lbs)': round(ffm_lbs, 1),
                    'Ending FFM (lbs)': round(ffm_lbs, 1),
                    'FFM Change (lbs)': 0.0,
                    'Ending Body Fat %': round(body_fat_pct, 1),
                    'Daily Energy Balance (kcal)': round(daily_energy_balance),
                    'Daily TDEE (kcal)': round(current_tdee),
                    'Daily Energy Target (kcal)': round(target_energy),
                    'Energy Availability (kcal/kg FFM)': round(energy_availability)
                })
                continue
            
            # For the next entry, we calculate the changes based on weekly progress
            # Store starting values for this week
            week_starting_weight_lbs = weight_lbs
            week_starting_fat_mass_lbs = fat_mass_lbs
            week_starting_ffm_lbs = ffm_lbs
            
            # Calculate changes for this week
            if goal_is_gain:
                # Weight gain logic
                weight_lbs += weekly_weight_change_lbs
                fat_gain_lbs = weekly_weight_change_lbs * weekly_fat_pct
                ffm_gain_lbs = weekly_weight_change_lbs * (1 - weekly_fat_pct)
                
                fat_mass_lbs += fat_gain_lbs
                ffm_lbs += ffm_gain_lbs
            else:
                # Weight loss logic
                weight_lbs += weekly_weight_change_lbs  # Will be negative for weight loss
                fat_loss_lbs = abs(weekly_weight_change_lbs) * weekly_fat_pct
                ffm_loss_lbs = abs(weekly_weight_change_lbs) * (1 - weekly_fat_pct)
                
                fat_mass_lbs -= fat_loss_lbs
                ffm_lbs -= ffm_loss_lbs
                
                # Ensure we use negative values for losses
                fat_gain_lbs = -fat_loss_lbs
                ffm_gain_lbs = -ffm_loss_lbs
            
            # Convert back to kg for calculations
            weight_kg = weight_lbs / 2.20462
            fat_mass_kg = fat_mass_lbs / 2.20462
            ffm_kg = ffm_lbs / 2.20462
            
            # Calculate new body fat percentage
            body_fat_pct = (fat_mass_kg / weight_kg) * 100 if weight_kg > 0 else 0
            
            # Update cumulative fat change from start
            cumulative_fat_change = fat_mass_lbs - current_fat_mass_lbs
            
            # Store this week's data
            progress_data.append({
                'Date': date.strftime('%m/%d/%Y'),
                'Week': week,
                'Starting Weight (lbs)': round(week_starting_weight_lbs, 1),
                'Ending Weight (lbs)': round(weight_lbs, 1),
                'Weekly Change (lbs)': round(weight_lbs - week_starting_weight_lbs, 2),
                'Starting Fat Mass (lbs)': round(week_starting_fat_mass_lbs, 1),
                'Ending Fat Mass (lbs)': round(fat_mass_lbs, 1),
                'Fat Mass Change (lbs)': round(fat_gain_lbs, 2),
                'Cumulative Fat Change (lbs)': round(cumulative_fat_change, 1),
                'Starting FFM (lbs)': round(week_starting_ffm_lbs, 1),
                'Ending FFM (lbs)': round(ffm_lbs, 1),
                'FFM Change (lbs)': round(ffm_gain_lbs, 2),
                'Ending Body Fat %': round(body_fat_pct, 1),
                'Daily Energy Balance (kcal)': round(daily_energy_balance),
                'Daily TDEE (kcal)': round(current_tdee),
                'Daily Energy Target (kcal)': round(target_energy),
                'Energy Availability (kcal/kg FFM)': round(energy_availability)
            })
        
        # Create DataFrame
        return pd.DataFrame(progress_data)
    
    except Exception as e:
        print(f"Error generating progress table: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame()  # Return empty DataFrame on error

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
