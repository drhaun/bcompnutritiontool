import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Daily Monitoring",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Check if user has completed the previous steps
if (not st.session_state.user_info['gender'] or 
    not st.session_state.goal_info.get('goal_type') or 
    not st.session_state.nutrition_plan.get('target_calories')):
    st.warning("Please complete the Initial Setup, Body Composition Goals, and Nutrition Plan first!")
    st.stop()

st.title("Daily Monitoring")
st.markdown("Track your daily weight and nutrition intake to monitor your progress.")

# Form for daily tracking
with st.form("daily_tracking_form"):
    st.subheader("Log Today's Data")
    
    col1, col2 = st.columns(2)
    
    with col1:
        log_date = st.date_input(
            "Date",
            value=datetime.now().date()
        )
        
        # Get current weight in pounds if available, otherwise convert from kg
        current_weight_lbs = st.session_state.user_info.get('weight_lbs', st.session_state.user_info.get('weight_kg', 70.0) * 2.20462)
        
        weight_lbs = st.number_input(
            "Weight (lbs)",
            min_value=66.0,
            max_value=660.0,
            value=current_weight_lbs,
            step=0.1,
            format="%.1f"
        )
        
        # Convert to kg for storage and calculations
        weight_kg = weight_lbs / 2.20462
    
    with col2:
        calories = st.number_input(
            "Calories Consumed",
            min_value=0,
            max_value=10000,
            value=st.session_state.nutrition_plan.get('target_calories', 2000),
            step=50
        )
        
        protein = st.number_input(
            "Protein (g)",
            min_value=0,
            max_value=500,
            value=st.session_state.nutrition_plan.get('target_protein', 100),
            step=5
        )
        
        carbs = st.number_input(
            "Carbohydrates (g)",
            min_value=0,
            max_value=1000,
            value=st.session_state.nutrition_plan.get('target_carbs', 200),
            step=5
        )
        
        fat = st.number_input(
            "Fat (g)",
            min_value=0,
            max_value=500,
            value=st.session_state.nutrition_plan.get('target_fat', 70),
            step=5
        )
    
    # Check if macros add up to calories
    calculated_calories = (protein * 4) + (carbs * 4) + (fat * 9)
    calorie_diff = abs(calculated_calories - calories)
    
    if calorie_diff > 100:
        st.warning(f"Your macronutrient entries add up to {calculated_calories} calories, which is {calorie_diff} calories different from your entered calories. You may want to double-check your entries.")
    
    submit_button = st.form_submit_button("Save Entry")
    
    if submit_button:
        # Format date as string
        date_str = log_date.strftime('%Y-%m-%d')
        
        # Check if there's already an entry for this date
        existing_idx = st.session_state.daily_records[
            st.session_state.daily_records['date'] == date_str
        ].index
        
        new_entry = {
            'date': date_str,
            'weight_kg': weight_kg,
            'weight_lbs': weight_lbs,
            'calories': calories,
            'protein': protein,
            'carbs': carbs,
            'fat': fat
        }
        
        if len(existing_idx) > 0:
            # Update existing entry
            for key, value in new_entry.items():
                st.session_state.daily_records.at[existing_idx[0], key] = value
            st.success(f"Entry for {date_str} updated!")
        else:
            # Add new entry
            st.session_state.daily_records = pd.concat([
                st.session_state.daily_records,
                pd.DataFrame([new_entry])
            ], ignore_index=True)
            st.success(f"Entry for {date_str} added!")
        
        # Update the user's current weight
        if log_date.strftime('%Y-%m-%d') == datetime.now().strftime('%Y-%m-%d'):
            st.session_state.user_info['weight_kg'] = weight_kg
            st.session_state.user_info['weight_lbs'] = weight_lbs
        
        # Save data
        utils.save_data()

# Display the daily records
if not st.session_state.daily_records.empty:
    st.subheader("Recent Entries")
    
    # Sort by date (newest first) and take most recent 10 entries
    recent_data = st.session_state.daily_records.sort_values(by='date', ascending=False).head(10).copy()
    
    # Ensure weight_lbs exists (for backward compatibility)
    if 'weight_lbs' not in recent_data.columns:
        recent_data['weight_lbs'] = recent_data['weight_kg'] * 2.20462
    
    # Add target columns for comparison
    recent_data['target_calories'] = st.session_state.nutrition_plan['target_calories']
    recent_data['target_protein'] = st.session_state.nutrition_plan['target_protein']
    recent_data['target_carbs'] = st.session_state.nutrition_plan['target_carbs']
    recent_data['target_fat'] = st.session_state.nutrition_plan['target_fat']
    
    # Calculate differences from targets
    recent_data['calories_diff'] = recent_data['calories'] - recent_data['target_calories']
    recent_data['protein_diff'] = recent_data['protein'] - recent_data['target_protein']
    recent_data['carbs_diff'] = recent_data['carbs'] - recent_data['target_carbs']
    recent_data['fat_diff'] = recent_data['fat'] - recent_data['target_fat']
    
    # Format differences with +/- signs
    recent_data['calories_diff'] = recent_data['calories_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    recent_data['protein_diff'] = recent_data['protein_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    recent_data['carbs_diff'] = recent_data['carbs_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    recent_data['fat_diff'] = recent_data['fat_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    
    # Format date nicely
    recent_data['date_display'] = pd.to_datetime(recent_data['date']).dt.strftime('%b %d, %Y')
    
    # Display columns
    display_cols = [
        'date_display', 'weight_lbs',
        'calories', 'calories_diff',
        'protein', 'protein_diff',
        'carbs', 'carbs_diff',
        'fat', 'fat_diff'
    ]
    
    # Format and rename columns for display
    display_data = recent_data[display_cols].copy()
    
    # Rename columns
    display_data.columns = [
        'Date', 'Weight (lbs)',
        'Calories', 'Cal +/-',
        'Protein (g)', 'Prot +/-',
        'Carbs (g)', 'Carbs +/-',
        'Fat (g)', 'Fat +/-'
    ]
    
    # Format weight to one decimal place
    display_data['Weight (lbs)'] = [f"{x:.1f}" for x in display_data['Weight (lbs)']]
    
    st.dataframe(display_data, use_container_width=True)
    
    # Option to delete entries
    st.subheader("Delete Entry")
    
    # Get dates for selection
    dates = recent_data[['date', 'date_display']].copy()
    # Sort by date in descending order
    dates = dates.sort_values(by='date', ascending=False)
    date_options = dates['date_display'].tolist()
    date_values = dates['date'].tolist()
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        selected_date_display = st.selectbox("Select date to delete", date_options)
        # Get the actual date value
        selected_date_index = date_options.index(selected_date_display)
        delete_date = date_values[selected_date_index]
    
    with col2:
        delete_button = st.button("Delete Selected Entry")
    
    if delete_button and delete_date:
        # Remove the entry
        st.session_state.daily_records = st.session_state.daily_records[
            st.session_state.daily_records['date'] != delete_date
        ]
        
        # Save data
        utils.save_data()
        
        st.success(f"Entry for {selected_date_display} deleted!")
        st.rerun()
else:
    st.info("No entries yet. Use the form above to log your daily data.")

# Calculate and display weekly adjustments
if len(st.session_state.daily_records) >= 7:
    st.subheader("Weekly Adjustment Recommendation")
    
    adjustment = utils.calculate_weekly_adjustment(
        st.session_state.daily_records,
        st.session_state.goal_info,
        st.session_state.nutrition_plan
    )
    
    st.write(adjustment['message'])
    
    if adjustment['calorie_adjustment'] != 0:
        # Create columns for the new targets
        col1, col2, col3, col4 = st.columns(4)
        
        # Calculate new targets
        new_calories = st.session_state.nutrition_plan['target_calories'] + adjustment['calorie_adjustment']
        new_protein = st.session_state.nutrition_plan['target_protein'] + adjustment['protein_adjustment']
        new_carbs = st.session_state.nutrition_plan['target_carbs'] + adjustment['carbs_adjustment']
        new_fat = st.session_state.nutrition_plan['target_fat'] + adjustment['fat_adjustment']
        
        with col1:
            st.metric(
                label="New Calories Target",
                value=f"{new_calories:.0f} kcal",
                delta=f"{adjustment['calorie_adjustment']:.0f}"
            )
        
        with col2:
            st.metric(
                label="New Protein Target",
                value=f"{new_protein:.0f} g",
                delta=f"{adjustment['protein_adjustment']:.0f}"
            )
        
        with col3:
            st.metric(
                label="New Carbs Target",
                value=f"{new_carbs:.0f} g",
                delta=f"{adjustment['carbs_adjustment']:.0f}"
            )
        
        with col4:
            st.metric(
                label="New Fat Target",
                value=f"{new_fat:.0f} g",
                delta=f"{adjustment['fat_adjustment']:.0f}"
            )
        
        # Button to apply the adjustment
        if st.button("Apply This Adjustment"):
            # Add the adjustment to the history
            today = datetime.now().strftime('%Y-%m-%d')
            adjustment['date'] = today
            
            if 'weekly_adjustments' not in st.session_state.nutrition_plan:
                st.session_state.nutrition_plan['weekly_adjustments'] = []
            
            st.session_state.nutrition_plan['weekly_adjustments'].append(adjustment)
            
            # Update the nutrition plan with new targets
            st.session_state.nutrition_plan['target_calories'] = round(new_calories)
            st.session_state.nutrition_plan['target_protein'] = round(new_protein)
            st.session_state.nutrition_plan['target_carbs'] = round(new_carbs)
            st.session_state.nutrition_plan['target_fat'] = round(new_fat)
            
            # Save data
            utils.save_data()
            
            st.success("Nutrition plan updated with the new targets!")
            st.rerun()
    
    # Add guidance based on the weekly data
    st.subheader("Weekly Analysis")
    
    # Get recent week of data
    recent_data = st.session_state.daily_records.sort_values(by='date', ascending=False).head(7)
    
    # Calculate average adherence
    avg_cal_adherence = 100 - min(abs(recent_data['calories'].mean() - st.session_state.nutrition_plan['target_calories']) / 
                                 st.session_state.nutrition_plan['target_calories'] * 100, 100)
    
    avg_protein_adherence = 100 - min(abs(recent_data['protein'].mean() - st.session_state.nutrition_plan['target_protein']) / 
                                     st.session_state.nutrition_plan['target_protein'] * 100, 100)
    
    # Calculate weight change
    sorted_weekly_data = recent_data.sort_values(by='date', ascending=True)
    first_weight = sorted_weekly_data['weight_lbs'].iloc[0]
    last_weight = sorted_weekly_data['weight_lbs'].iloc[-1]
    weekly_weight_change = last_weight - first_weight
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="Weekly Weight Change", 
            value=f"{weekly_weight_change:.1f} lbs",
            delta=f"{weekly_weight_change:.1f} lbs"
        )
    
    with col2:
        st.metric(
            label="Calorie Adherence", 
            value=f"{avg_cal_adherence:.1f}%",
        )
    
    with col3:
        st.metric(
            label="Protein Adherence", 
            value=f"{avg_protein_adherence:.1f}%",
        )
    
    # Add tailored advice based on goals and adherence
    goal_type = st.session_state.goal_info['goal_type']
    
    if goal_type == "lose_fat":
        if weekly_weight_change > 0:
            st.warning("⚠️ You gained weight this week, which is contrary to your fat loss goal. Consider reducing calories or increasing activity.")
        elif weekly_weight_change < -2:
            st.warning("⚠️ You lost more than 2 lbs this week. While this might seem good, rapid weight loss often leads to muscle loss and is harder to sustain.")
        elif weekly_weight_change < -1:
            st.success("✅ Good progress! Weight loss between 1-2 lbs per week is in the ideal range for sustainable fat loss.")
        else:
            st.info("ℹ️ Weight loss was less than 1 lb this week. This is sustainable but consider reviewing your calorie intake if you want faster results.")
    
    elif goal_type == "gain_muscle":
        if weekly_weight_change < 0:
            st.warning("⚠️ You lost weight this week, which is contrary to your muscle gain goal. Consider increasing calories.")
        elif weekly_weight_change > 1:
            st.warning("⚠️ Weight gain exceeded 1 lb this week. While this might seem good, rapid weight gain often leads to excessive fat gain.")
        elif weekly_weight_change > 0.5:
            st.success("✅ Good progress! Weight gain between 0.5-1 lb per week is in the ideal range for muscle gain with minimal fat gain.")
        else:
            st.info("ℹ️ Weight gain was less than 0.5 lb this week. Consider increasing your calorie intake slightly if you want faster results.")
    
    # Protein advice
    if avg_protein_adherence < 80:
        st.warning("⚠️ Your protein intake was significantly below target. This can impact your muscle preservation/growth. Try to prioritize protein-rich foods.")
    elif avg_protein_adherence > 95:
        st.success("✅ Excellent job meeting your protein targets! This is crucial for body composition goals.")
else:
    st.info("Weekly adjustments and analysis will be available once you have at least 7 days of data.")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Progress Dashboard](/Progress_Dashboard)")
