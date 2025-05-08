import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import sys
import os

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Progress Dashboard",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Check if user has entered some daily data
if st.session_state.daily_records.empty:
    st.warning("You need to enter some daily data before viewing your progress dashboard.")
    st.stop()

st.title("Progress Dashboard")
st.markdown("Track your progress towards your body composition and nutrition goals.")

# Convert date column to datetime if it's not already
st.session_state.daily_records['date'] = pd.to_datetime(st.session_state.daily_records['date'])

# Sort the data by date
data_for_plotting = st.session_state.daily_records.sort_values('date')

# Add a timestamp column for easier x-axis plotting
data_for_plotting['timestamp'] = data_for_plotting['date'].astype('int64') // 10**9

# Weight trend chart
st.subheader("Weight Trend")

weight_fig = utils.plot_weight_trend(data_for_plotting, st.session_state.goal_info)
if weight_fig:
    st.pyplot(weight_fig)
else:
    st.info("Not enough data to generate weight trend chart.")

# Macro adherence charts
st.subheader("Nutrition Adherence")

macro_fig = utils.plot_macro_adherence(data_for_plotting, st.session_state.nutrition_plan)
if macro_fig:
    st.pyplot(macro_fig)
else:
    st.info("Not enough data to generate nutrition adherence charts.")

# Weekly Statistics
st.subheader("Weekly Statistics")

# Create weekly statistics
if len(data_for_plotting) >= 7:
    # Group by week and calculate statistics
    data_for_plotting['week'] = data_for_plotting['date'].dt.isocalendar().week
    data_for_plotting['year'] = data_for_plotting['date'].dt.isocalendar().year
    
    # Create a year-week key for proper grouping across year boundaries
    data_for_plotting['year_week'] = data_for_plotting['year'].astype(str) + "-" + data_for_plotting['week'].astype(str)
    
    weekly_stats = data_for_plotting.groupby('year_week').agg({
        'date': 'min',  # First day of the week
        'weight_kg': ['mean', 'min', 'max', lambda x: x.iloc[-1] - x.iloc[0] if len(x) > 1 else 0],  # Weekly change
        'calories': ['mean', 'min', 'max', 'sum'],
        'protein': ['mean', 'min', 'max', 'sum'],
        'carbs': ['mean', 'min', 'max', 'sum'],
        'fat': ['mean', 'min', 'max', 'sum']
    }).reset_index()
    
    # Rename columns for clarity
    weekly_stats.columns = [
        'year_week', 'week_start', 
        'avg_weight', 'min_weight', 'max_weight', 'weekly_weight_change',
        'avg_calories', 'min_calories', 'max_calories', 'total_calories',
        'avg_protein', 'min_protein', 'max_protein', 'total_protein',
        'avg_carbs', 'min_carbs', 'max_carbs', 'total_carbs',
        'avg_fat', 'min_fat', 'max_fat', 'total_fat'
    ]
    
    # Sort by week start date (most recent first)
    weekly_stats = weekly_stats.sort_values('week_start', ascending=False)
    
    # Format dates for display
    weekly_stats['week_of'] = weekly_stats['week_start'].dt.strftime('%b %d, %Y')
    
    # Display weekly statistics table
    display_cols = [
        'week_of', 'avg_weight', 'weekly_weight_change',
        'avg_calories', 'avg_protein', 'avg_carbs', 'avg_fat'
    ]
    
    st.dataframe(weekly_stats[display_cols], use_container_width=True)
    
    # Display a summary of progress
    st.subheader("Progress Summary")
    
    # Calculate total progress
    first_weight = data_for_plotting.iloc[0]['weight_kg']
    last_weight = data_for_plotting.iloc[-1]['weight_kg']
    total_weight_change = last_weight - first_weight
    
    # Get goal details
    goal_type = st.session_state.goal_info['goal_type']
    target_weight = st.session_state.goal_info['target_weight_kg']
    
    # Calculate progress percentage
    if target_weight and first_weight != target_weight:
        weight_progress = abs(total_weight_change) / abs(target_weight - first_weight) * 100
        weight_progress = min(weight_progress, 100)  # Cap at 100%
    else:
        weight_progress = 0
    
    # Calculate time progress
    if st.session_state.goal_info['start_date'] and st.session_state.goal_info['timeline_weeks']:
        start_date = datetime.strptime(st.session_state.goal_info['start_date'], '%Y-%m-%d')
        total_days = st.session_state.goal_info['timeline_weeks'] * 7
        elapsed_days = (datetime.now() - start_date).days
        time_progress = min(elapsed_days / total_days * 100, 100)  # Cap at 100%
    else:
        time_progress = 0
    
    # Display progress metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="Total Weight Change", 
            value=f"{total_weight_change:.1f} kg", 
            delta=f"{total_weight_change:.1f} kg"
        )
    
    with col2:
        st.metric(
            label="Progress Toward Goal Weight", 
            value=f"{weight_progress:.1f}%"
        )
    
    with col3:
        st.metric(
            label="Time Progress", 
            value=f"{time_progress:.1f}%"
        )
    
    # Overall adherence calculation
    if 'target_calories' in st.session_state.nutrition_plan:
        target_calories = st.session_state.nutrition_plan['target_calories']
        calories_adherence = 100 - min(abs(data_for_plotting['calories'].mean() - target_calories) / target_calories * 100, 100)
        
        st.write(f"Overall plan adherence: {calories_adherence:.1f}%")
        st.progress(calories_adherence / 100)
    
    # Generate insights
    st.subheader("Insights & Recommendations")
    
    insights = []
    
    # Weight trend insights
    if len(weekly_stats) >= 2:
        recent_weekly_change = weekly_stats.iloc[0]['weekly_weight_change']
        if goal_type == "lose_fat":
            if recent_weekly_change > 0:
                insights.append("⚠️ You gained weight last week, which is contrary to your fat loss goal.")
            elif recent_weekly_change < -1.0:
                insights.append("⚠️ Weight loss exceeded 1 kg last week. While this might seem good, rapid weight loss often leads to muscle loss and is harder to sustain.")
            elif recent_weekly_change < -0.5:
                insights.append("✅ Good progress! Weight loss between 0.5-1.0 kg per week is in the ideal range for sustainable fat loss.")
            else:
                insights.append("ℹ️ Weight loss was less than 0.5 kg last week. This is sustainable but consider reviewing your calorie intake if you want faster results.")
        
        elif goal_type == "gain_muscle":
            if recent_weekly_change < 0:
                insights.append("⚠️ You lost weight last week, which is contrary to your muscle gain goal.")
            elif recent_weekly_change > 0.5:
                insights.append("⚠️ Weight gain exceeded 0.5 kg last week. While this might seem good, rapid weight gain often leads to excessive fat gain.")
            elif recent_weekly_change > 0.2:
                insights.append("✅ Good progress! Weight gain between 0.2-0.5 kg per week is in the ideal range for muscle gain with minimal fat gain.")
            else:
                insights.append("ℹ️ Weight gain was less than 0.2 kg last week. Consider increasing your calorie intake slightly if you want faster results.")
        
        else:  # maintain
            if abs(recent_weekly_change) < 0.2:
                insights.append("✅ Great job maintaining your weight! Weekly fluctuation of less than 0.2 kg is within normal range.")
            else:
                insights.append(f"ℹ️ Your weight changed by {recent_weekly_change:.1f} kg last week. For maintenance, aim to keep weekly fluctuations under 0.2 kg.")
    
    # Nutrition adherence insights
    if 'target_calories' in st.session_state.nutrition_plan and len(data_for_plotting) >= 7:
        recent_data = data_for_plotting.tail(7)
        
        target_calories = st.session_state.nutrition_plan['target_calories']
        avg_calories = recent_data['calories'].mean()
        calories_diff = avg_calories - target_calories
        
        if abs(calories_diff) < 100:
            insights.append("✅ Excellent calorie adherence! You've been within 100 calories of your target on average.")
        elif abs(calories_diff) < 250:
            insights.append(f"ℹ️ Moderate calorie adherence. You've been averaging {abs(calories_diff):.0f} calories {'over' if calories_diff > 0 else 'under'} your target.")
        else:
            insights.append(f"⚠️ Poor calorie adherence. You've been averaging {abs(calories_diff):.0f} calories {'over' if calories_diff > 0 else 'under'} your target, which can significantly impact your results.")
        
        # Protein adherence
        target_protein = st.session_state.nutrition_plan['target_protein']
        avg_protein = recent_data['protein'].mean()
        protein_diff = avg_protein - target_protein
        
        if protein_diff < -20:
            insights.append("⚠️ Your protein intake is significantly below target. Insufficient protein can lead to muscle loss, even when gaining weight.")
        elif protein_diff < -10:
            insights.append("ℹ️ Your protein intake is slightly below target. Try to include more protein-rich foods in your diet.")
        elif protein_diff > 20:
            insights.append("ℹ️ Your protein intake is significantly above target. While this is generally fine, very high protein intake is unnecessary and those calories might be better allocated to carbs for energy.")
        else:
            insights.append("✅ Good job meeting your protein target! Consistent protein intake is crucial for body composition.")
    
    # Display insights
    if insights:
        for insight in insights:
            st.write(insight)
    else:
        st.write("More insights will be available as you log more data.")
    
    # Display adjustment history
    if 'weekly_adjustments' in st.session_state.nutrition_plan and st.session_state.nutrition_plan['weekly_adjustments']:
        st.subheader("Plan Adjustment History")
        
        adjustments = pd.DataFrame(st.session_state.nutrition_plan['weekly_adjustments'])
        
        # Display in reverse chronological order
        adjustments = adjustments.sort_values('date', ascending=False)
        
        # Format for display
        display_cols = [
            'date', 'message', 'calorie_adjustment', 
            'protein_adjustment', 'carbs_adjustment', 'fat_adjustment'
        ]
        
        st.dataframe(adjustments[display_cols], use_container_width=True)
else:
    st.info("Weekly statistics will be available once you have at least 7 days of data.")

# Data export option
st.subheader("Export Your Data")

if st.button("Download data as CSV"):
    # Create a copy with appropriate date formatting
    export_data = st.session_state.daily_records.copy()
    export_data['date'] = export_data['date'].dt.strftime('%Y-%m-%d')
    
    # Generate CSV
    csv = export_data.to_csv(index=False)
    
    # Create download button
    st.download_button(
        label="Download CSV file",
        data=csv,
        file_name="fitomics_data.csv",
        mime="text/csv"
    )

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
