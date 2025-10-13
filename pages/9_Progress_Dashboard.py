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

# Add tabs for different sections
dashboard_tab, historical_tab, data_management_tab, photo_gallery_tab = st.tabs(["Dashboard", "Historical Analysis", "Data Management", "Progress Photos"])

# Convert date column to datetime if it's not already
st.session_state.daily_records['date'] = pd.to_datetime(st.session_state.daily_records['date'])

# Sort the data by date
data_for_plotting = st.session_state.daily_records.sort_values(by='date').copy()

# Make sure weight_lbs exists (for backward compatibility)
if 'weight_lbs' not in data_for_plotting.columns:
    data_for_plotting['weight_lbs'] = data_for_plotting['weight_kg'] * 2.20462

# Add a timestamp column for easier x-axis plotting
data_for_plotting['timestamp'] = data_for_plotting['date'].astype('int64') // 10**9

with dashboard_tab:
    # Weight trend chart
    st.subheader("Weight Trend")

    # Create a custom weight trend plot in pounds
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot actual weight data
    ax.plot(data_for_plotting['date'], data_for_plotting['weight_lbs'], 'o-', label='Actual Weight')

    # If goal info is available, plot projected weight line
    if (st.session_state.goal_info.get('start_date') and
        st.session_state.goal_info.get('target_weight_lbs') and 
        st.session_state.goal_info.get('timeline_weeks')):
        
        start_date = pd.to_datetime(st.session_state.goal_info['start_date'])
        # Get starting weight from data or from user_info
        if not data_for_plotting[data_for_plotting['date'] >= start_date].empty:
            start_weight = data_for_plotting.loc[data_for_plotting['date'] >= start_date, 'weight_lbs'].iloc[0]
        else:
            start_weight = st.session_state.user_info.get('weight_lbs', 0)
        
        target_weight = st.session_state.goal_info.get('target_weight_lbs')
        end_date = start_date + timedelta(days=st.session_state.goal_info['timeline_weeks'] * 7)
        
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
    ax.set_ylabel('Weight (lbs)')
    ax.set_title('Weight Trend vs. Target')
    ax.grid(True, linestyle='--', alpha=0.7)
    ax.legend()
    
    # Beautify the plot
    plt.tight_layout()
    
    # Show the plot
    st.pyplot(fig)
    
    # Macro adherence charts
    st.subheader("Nutrition Adherence")
    
    # Use the existing macro adherence function
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
        
        # Use weight_lbs for statistics
        weekly_stats = data_for_plotting.groupby('year_week').agg({
            'date': 'min',  # First day of the week
            'weight_lbs': ['mean', 'min', 'max', lambda x: x.iloc[-1] - x.iloc[0] if len(x) > 1 else 0],  # Weekly change
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
        weekly_stats = weekly_stats.sort_values(by='week_start', ascending=False)
        
        # Format dates for display
        weekly_stats['week_of'] = weekly_stats['week_start'].dt.strftime('%b %d, %Y')
        
        # Format numbers for display
        weekly_stats_display = weekly_stats.copy()
        
        # Format weight columns to 1 decimal place
        for col in ['avg_weight', 'min_weight', 'max_weight', 'weekly_weight_change']:
            weekly_stats_display[col] = weekly_stats_display[col].map('{:.1f}'.format)
        
        # Format nutrition columns to integers
        for col in ['avg_calories', 'avg_protein', 'avg_carbs', 'avg_fat']:
            weekly_stats_display[col] = weekly_stats_display[col].map('{:.0f}'.format)
        
        # Display columns
        display_cols = [
            'week_of', 'avg_weight', 'weekly_weight_change',
            'avg_calories', 'avg_protein', 'avg_carbs', 'avg_fat'
        ]
        
        # Create a display dataframe with selected columns
        display_df = weekly_stats_display[display_cols].copy()
        
        # Rename columns
        display_df.columns = [
            'Week Of', 'Avg Weight (lbs)', 'Weight Change (lbs)',
            'Avg Calories', 'Avg Protein (g)', 'Avg Carbs (g)', 'Avg Fat (g)'
        ]
        
        st.dataframe(display_df, use_container_width=True)
    
    # Display a summary of progress
    st.subheader("Progress Summary")
    
    # Calculate total progress
    first_weight = data_for_plotting.iloc[0]['weight_lbs']
    last_weight = data_for_plotting.iloc[-1]['weight_lbs']
    total_weight_change = last_weight - first_weight
    
    # Get goal details
    goal_type = st.session_state.goal_info['goal_type']
    target_weight = st.session_state.goal_info.get('target_weight_lbs', st.session_state.goal_info.get('target_weight_kg', 0) * 2.20462)
    
    # Calculate progress percentage
    if target_weight and first_weight != target_weight:
        weight_progress = abs(total_weight_change) / abs(target_weight - first_weight) * 100
        weight_progress = min(weight_progress, 100)  # Cap at 100%
    else:
        weight_progress = 0
    
    # Calculate time progress
    if st.session_state.goal_info.get('start_date') and st.session_state.goal_info.get('timeline_weeks'):
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
            value=f"{total_weight_change:.1f} lbs", 
            delta=f"{total_weight_change:.1f} lbs"
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
    
    # Weight trend insights - initialize weekly_stats if not available
    weekly_stats = None
    if len(data_for_plotting) >= 7:
        # Create weekly statistics
        data_for_plotting_copy = data_for_plotting.copy()
        data_for_plotting_copy['week'] = data_for_plotting_copy['date'].dt.isocalendar().week
        data_for_plotting_copy['year'] = data_for_plotting_copy['date'].dt.isocalendar().year
        data_for_plotting_copy['year_week'] = data_for_plotting_copy['year'].astype(str) + "-" + data_for_plotting_copy['week'].astype(str)
        
        weekly_stats = data_for_plotting_copy.groupby('year_week').agg({
            'weight_lbs': ['mean', lambda x: x.iloc[-1] - x.iloc[0] if len(x) > 1 else 0]
        }).reset_index()
        weekly_stats.columns = ['year_week', 'avg_weight', 'weekly_weight_change']
    
    if weekly_stats is not None and len(weekly_stats) >= 2:
        recent_weekly_change = weekly_stats.iloc[0]['weekly_weight_change']
        if goal_type == "lose_fat":
            if recent_weekly_change > 0:
                insights.append("⚠️ You gained weight last week, which is contrary to your fat loss goal.")
            elif recent_weekly_change < -2.0:  # More than 2 lbs/week
                insights.append("⚠️ Weight loss exceeded 2 lbs last week. While this might seem good, rapid weight loss often leads to muscle loss and is harder to sustain.")
            elif recent_weekly_change < -1.0:  # 1-2 lbs/week
                insights.append("✅ Good progress! Weight loss between 1-2 lbs per week is in the ideal range for sustainable fat loss.")
            else:  # Less than 1 lb/week
                insights.append("ℹ️ Weight loss was less than 1 lb last week. This is sustainable but consider reviewing your calorie intake if you want faster results.")
        
        elif goal_type == "gain_muscle":
            if recent_weekly_change < 0:
                insights.append("⚠️ You lost weight last week, which is contrary to your muscle gain goal.")
            elif recent_weekly_change > 1.1:  # More than 1.1 lbs/week
                insights.append("⚠️ Weight gain exceeded 1 lb last week. While this might seem good, rapid weight gain often leads to excessive fat gain.")
            elif recent_weekly_change > 0.5:  # 0.5-1.1 lbs/week
                insights.append("✅ Good progress! Weight gain between 0.5-1 lb per week is in the ideal range for muscle gain with minimal fat gain.")
            else:  # Less than 0.5 lb/week
                insights.append("ℹ️ Weight gain was less than 0.5 lb last week. Consider increasing your calorie intake slightly if you want faster results.")
        
        else:  # maintain
            if abs(recent_weekly_change) < 0.5:
                insights.append("✅ Great job maintaining your weight! Weekly fluctuation of less than 0.5 lb is within normal range.")
            else:
                insights.append(f"ℹ️ Your weight changed by {recent_weekly_change:.1f} lbs last week. For maintenance, aim to keep weekly fluctuations under 0.5 lb.")
    
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
        protein_per_lb = avg_protein / recent_data['weight_lbs'].mean()
        
        if protein_diff < -20:
            insights.append(f"⚠️ Your protein intake is significantly below target ({protein_per_lb:.2f} g/lb). Insufficient protein can lead to muscle loss, even when gaining weight.")
        elif protein_diff < -10:
            insights.append(f"ℹ️ Your protein intake is slightly below target ({protein_per_lb:.2f} g/lb). Try to include more protein-rich foods in your diet.")
        elif protein_diff > 20:
            insights.append(f"ℹ️ Your protein intake is significantly above target ({protein_per_lb:.2f} g/lb). While this is generally fine, very high protein intake is unnecessary and those calories might be better allocated to carbs for energy.")
        else:
            insights.append(f"✅ Good job meeting your protein target ({protein_per_lb:.2f} g/lb)! Consistent protein intake is crucial for body composition.")
    
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
        
        # Format date nicely
        if 'date' in adjustments.columns:
            adjustments['date_display'] = pd.to_datetime(adjustments['date']).dt.strftime('%b %d, %Y')
        
        # Format for display
        display_cols = [
            'date_display', 'message', 'calorie_adjustment', 
            'protein_adjustment', 'carbs_adjustment', 'fat_adjustment'
        ]
        
        # Create display DataFrame with only columns that exist
        existing_cols = [col for col in display_cols if col in adjustments.columns]
        display_df = adjustments[existing_cols].copy()
        
        # Create new column names dictionary
        new_column_names = {
            'date_display': 'Date',
            'message': 'Adjustment Message',
            'calorie_adjustment': 'Calories +/-',
            'protein_adjustment': 'Protein +/-',
            'carbs_adjustment': 'Carbs +/-',
            'fat_adjustment': 'Fat +/-'
        }
        
        # Rename only the columns that exist
        new_columns = []
        for col in display_df.columns:
            new_columns.append(new_column_names.get(col, col))
            
        display_df.columns = new_columns
        
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("Weekly statistics will be available once you have at least 7 days of data.")
    
    # Data export option
    st.subheader("Export Your Data")
    
    if st.button("Download data as CSV", key="dashboard_download"):
        # Create a copy with appropriate date formatting
        export_data = st.session_state.daily_records.copy()
        export_data['date'] = export_data['date'].dt.strftime('%Y-%m-%d')
        
        # Ensure we have a weight_lbs column
        if 'weight_lbs' not in export_data.columns:
            export_data['weight_lbs'] = export_data['weight_kg'] * 2.20462
        
        # Generate CSV
        csv = export_data.to_csv(index=False)
        
        # Create download button
        st.download_button(
            label="Download CSV file",
            data=csv,
            file_name="fitomics_data.csv",
            mime="text/csv",
            key="dashboard_download_button"
        )

# Historical Analysis Tab
with historical_tab:
    st.subheader("Historical Data Analysis & Extended Trends")
    st.markdown("Deep dive into your long-term progress patterns and discover insights to optimize your journey.")
    
    if len(data_for_plotting) < 14:
        st.warning("Historical analysis requires at least 14 days of data. Keep tracking to unlock detailed insights!")
        st.stop()
    
    # Time range selector
    st.markdown("### Analysis Time Range")
    col1, col2 = st.columns(2)
    
    with col1:
        start_date = st.date_input(
            "Start Date",
            value=data_for_plotting['date'].min().date(),
            min_value=data_for_plotting['date'].min().date(),
            max_value=data_for_plotting['date'].max().date(),
            key="hist_start_date"
        )
    
    with col2:
        end_date = st.date_input(
            "End Date", 
            value=data_for_plotting['date'].max().date(),
            min_value=data_for_plotting['date'].min().date(),
            max_value=data_for_plotting['date'].max().date(),
            key="hist_end_date"
        )
    
    # Filter data for selected range
    filtered_data = data_for_plotting[
        (data_for_plotting['date'] >= pd.to_datetime(start_date)) &
        (data_for_plotting['date'] <= pd.to_datetime(end_date))
    ].copy()
    
    if len(filtered_data) < 7:
        st.warning("Please select a range with at least 7 days of data for meaningful analysis.")
        st.stop()
    
    # Calculate advanced statistics
    st.markdown("### Trend Analysis")
    
    # Moving averages
    filtered_data['weight_7day_avg'] = filtered_data['weight_lbs'].rolling(window=7, center=True).mean()
    filtered_data['weight_14day_avg'] = filtered_data['weight_lbs'].rolling(window=14, center=True).mean()
    filtered_data['calories_7day_avg'] = filtered_data['calories'].rolling(window=7, center=True).mean()
    
    # Create comprehensive trend chart
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # Weight trends with moving averages
    axes[0,0].plot(filtered_data['date'], filtered_data['weight_lbs'], 'o-', alpha=0.6, label='Daily Weight', markersize=4)
    axes[0,0].plot(filtered_data['date'], filtered_data['weight_7day_avg'], '-', linewidth=2, label='7-Day Average')
    axes[0,0].plot(filtered_data['date'], filtered_data['weight_14day_avg'], '-', linewidth=2, label='14-Day Average')
    axes[0,0].set_title('Weight Trends with Moving Averages')
    axes[0,0].set_ylabel('Weight (lbs)')
    axes[0,0].legend()
    axes[0,0].grid(True, alpha=0.3)
    
    # Calorie intake patterns
    axes[0,1].plot(filtered_data['date'], filtered_data['calories'], 'o-', alpha=0.6, label='Daily Calories', markersize=4)
    axes[0,1].plot(filtered_data['date'], filtered_data['calories_7day_avg'], '-', linewidth=2, label='7-Day Average')
    if 'target_calories' in st.session_state.nutrition_plan:
        axes[0,1].axhline(y=st.session_state.nutrition_plan['target_calories'], color='red', linestyle='--', label='Target')
    axes[0,1].set_title('Calorie Intake Patterns')
    axes[0,1].set_ylabel('Calories')
    axes[0,1].legend()
    axes[0,1].grid(True, alpha=0.3)
    
    # Weekly weight change distribution
    if len(filtered_data) >= 14:
        weekly_changes = []
        for i in range(7, len(filtered_data)):
            if i + 7 < len(filtered_data):
                current_week_avg = filtered_data.iloc[i:i+7]['weight_lbs'].mean()
                prev_week_avg = filtered_data.iloc[i-7:i]['weight_lbs'].mean()
                weekly_changes.append(current_week_avg - prev_week_avg)
        
        if weekly_changes:
            axes[1,0].hist(weekly_changes, bins=max(5, len(weekly_changes)//3), alpha=0.7, edgecolor='black')
            axes[1,0].axvline(x=np.mean(weekly_changes), color='red', linestyle='--', label=f'Average: {np.mean(weekly_changes):.2f} lbs')
            axes[1,0].set_title('Weekly Weight Change Distribution')
            axes[1,0].set_xlabel('Weight Change (lbs)')
            axes[1,0].set_ylabel('Frequency')
            axes[1,0].legend()
            axes[1,0].grid(True, alpha=0.3)
    
    # Macro balance over time
    filtered_data['protein_ratio'] = filtered_data['protein'] * 4 / filtered_data['calories'] * 100
    filtered_data['carbs_ratio'] = filtered_data['carbs'] * 4 / filtered_data['calories'] * 100
    filtered_data['fat_ratio'] = filtered_data['fat'] * 9 / filtered_data['calories'] * 100
    
    axes[1,1].plot(filtered_data['date'], filtered_data['protein_ratio'], label='Protein %', alpha=0.8)
    axes[1,1].plot(filtered_data['date'], filtered_data['carbs_ratio'], label='Carbs %', alpha=0.8)
    axes[1,1].plot(filtered_data['date'], filtered_data['fat_ratio'], label='Fat %', alpha=0.8)
    axes[1,1].set_title('Macronutrient Balance Over Time')
    axes[1,1].set_ylabel('Percentage of Calories')
    axes[1,1].legend()
    axes[1,1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    st.pyplot(fig)
    
    # Advanced Insights Section
    st.markdown("### Advanced Insights")
    
    # Calculate correlation between variables
    insights_col1, insights_col2 = st.columns(2)
    
    with insights_col1:
        st.markdown("**Weight & Calorie Correlations**")
        
        # Calculate correlations
        weight_calorie_corr = filtered_data['weight_lbs'].corr(filtered_data['calories'])
        weight_protein_corr = filtered_data['weight_lbs'].corr(filtered_data['protein'])
        
        st.write(f"• Weight-Calorie correlation: {weight_calorie_corr:.3f}")
        if abs(weight_calorie_corr) > 0.3:
            direction = "higher" if weight_calorie_corr > 0 else "lower"
            st.write(f"  📊 Strong pattern: {direction} calories tend to correlate with weight changes")
        
        st.write(f"• Weight-Protein correlation: {weight_protein_corr:.3f}")
        if abs(weight_protein_corr) > 0.3:
            direction = "higher" if weight_protein_corr > 0 else "lower"
            st.write(f"  📊 {direction} protein intake shows correlation with weight trends")
    
    with insights_col2:
        st.markdown("**Consistency Metrics**")
        
        # Calculate coefficient of variation for consistency
        calorie_cv = (filtered_data['calories'].std() / filtered_data['calories'].mean()) * 100
        protein_cv = (filtered_data['protein'].std() / filtered_data['protein'].mean()) * 100
        
        st.write(f"• Calorie consistency: {100-min(calorie_cv, 100):.1f}%")
        if calorie_cv < 15:
            st.write("  ✅ Excellent calorie consistency!")
        elif calorie_cv < 25:
            st.write("  👍 Good calorie consistency")
        else:
            st.write("  ⚠️ Consider more consistent calorie intake")
        
        st.write(f"• Protein consistency: {100-min(protein_cv, 100):.1f}%")
        if protein_cv < 15:
            st.write("  ✅ Excellent protein consistency!")
        elif protein_cv < 25:
            st.write("  👍 Good protein consistency")
        else:
            st.write("  ⚠️ Consider more consistent protein intake")
    
    # Predictive Analysis
    st.markdown("### Predictive Trends")
    
    if len(filtered_data) >= 21:  # Need at least 3 weeks for meaningful prediction
        from scipy import stats
        
        # Linear regression for weight trend
        days_since_start = (filtered_data['date'] - filtered_data['date'].min()).dt.days
        slope, intercept, r_value, p_value, std_err = stats.linregress(days_since_start, filtered_data['weight_lbs'])
        
        # Project 30 days into the future
        future_days = np.arange(len(filtered_data), len(filtered_data) + 30)
        future_weights = slope * future_days + intercept
        future_dates = [filtered_data['date'].max() + timedelta(days=i) for i in range(1, 31)]
        
        # Create prediction chart
        pred_fig, pred_ax = plt.subplots(figsize=(12, 6))
        
        # Plot historical data
        pred_ax.plot(filtered_data['date'], filtered_data['weight_lbs'], 'o-', label='Historical Weight', alpha=0.7)
        pred_ax.plot(filtered_data['date'], filtered_data['weight_7day_avg'], '-', linewidth=2, label='7-Day Average')
        
        # Plot trend line
        trend_weights = slope * days_since_start + intercept
        pred_ax.plot(filtered_data['date'], trend_weights, '--', color='orange', linewidth=2, label='Trend Line')
        
        # Plot prediction
        pred_ax.plot(future_dates, future_weights, 's-', color='red', alpha=0.7, label='30-Day Projection')
        
        pred_ax.set_title('Weight Trend Prediction (Next 30 Days)')
        pred_ax.set_ylabel('Weight (lbs)')
        pred_ax.legend()
        pred_ax.grid(True, alpha=0.3)
        
        st.pyplot(pred_fig)
        
        # Prediction insights
        st.markdown("**Prediction Insights:**")
        
        weekly_rate = slope * 7
        monthly_rate = slope * 30
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Current Weekly Rate", f"{weekly_rate:.2f} lbs/week")
        with col2:
            st.metric("Projected 30-Day Change", f"{monthly_rate:.2f} lbs")
        with col3:
            confidence = max(0, min(100, (r_value**2) * 100))
            st.metric("Trend Confidence", f"{confidence:.1f}%")
        
        if abs(weekly_rate) > 2:
            st.warning("⚠️ Current rate exceeds 2 lbs/week. Consider adjusting your approach for sustainable results.")
        elif 0.5 <= abs(weekly_rate) <= 2:
            st.success("✅ You're in the ideal range for sustainable progress!")
        else:
            st.info("💡 Progress is slower than typical recommendations. Consider reviewing your plan.")
    
    # Pattern Recognition
    st.markdown("### Pattern Recognition")
    
    if len(filtered_data) >= 28:  # Need at least 4 weeks
        # Day of week patterns
        filtered_data['day_of_week'] = filtered_data['date'].dt.day_name()
        daily_patterns = filtered_data.groupby('day_of_week').agg({
            'weight_lbs': 'mean',
            'calories': 'mean',
            'protein': 'mean'
        }).round(1)
        
        # Reorder by day of week
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        daily_patterns = daily_patterns.reindex([day for day in day_order if day in daily_patterns.index])
        
        st.markdown("**Weekly Patterns:**")
        
        pattern_col1, pattern_col2 = st.columns(2)
        
        with pattern_col1:
            st.write("Average by Day of Week:")
            st.dataframe(daily_patterns)
        
        with pattern_col2:
            # Find best and worst days
            best_calorie_day = daily_patterns['calories'].idxmin()
            worst_calorie_day = daily_patterns['calories'].idxmax()
            
            if 'target_calories' in st.session_state.nutrition_plan:
                target = st.session_state.nutrition_plan['target_calories']
                best_adherence_day = daily_patterns.iloc[(daily_patterns['calories'] - target).abs().argsort()[:1]].index[0]
                
                st.write("**Day-of-Week Insights:**")
                st.write(f"• Lowest calorie day: {best_calorie_day}")
                st.write(f"• Highest calorie day: {worst_calorie_day}")
                st.write(f"• Best adherence day: {best_adherence_day}")
            
            # Weekend vs weekday comparison
            weekend_data = filtered_data[filtered_data['date'].dt.weekday >= 5]
            weekday_data = filtered_data[filtered_data['date'].dt.weekday < 5]
            
            if len(weekend_data) > 0 and len(weekday_data) > 0:
                weekend_avg_cal = weekend_data['calories'].mean()
                weekday_avg_cal = weekday_data['calories'].mean()
                
                st.write(f"• Weekend avg calories: {weekend_avg_cal:.0f}")
                st.write(f"• Weekday avg calories: {weekday_avg_cal:.0f}")
                
                if weekend_avg_cal > weekday_avg_cal * 1.1:
                    st.write("  📊 You tend to eat more on weekends")
                elif weekday_avg_cal > weekend_avg_cal * 1.1:
                    st.write("  📊 You tend to eat more on weekdays")
                else:
                    st.write("  📊 Consistent intake throughout the week")

# Data Management Tab
with data_management_tab:
    st.subheader("Manage Your Records")
    st.markdown("Edit, delete, or filter your tracking data using the tools below.")
    
    if not st.session_state.daily_records.empty:
        # Sort records by date in descending order (newest first)
        display_records = st.session_state.daily_records.sort_values(by='date', ascending=False).copy()
        
        # Format date for display
        display_records['date_display'] = display_records['date'].dt.strftime('%Y-%m-%d')
        
        # Add search/filter functionality
        search_date = st.text_input("Filter by date (YYYY-MM-DD):", 
                                  placeholder="Enter date to filter records",
                                  key="dashboard_date_filter")
        
        # Apply filter if provided
        if search_date:
            filtered_records = display_records[display_records['date_display'].str.contains(search_date)]
        else:
            filtered_records = display_records
            
        # Create tabs for different data views
        basic_tab, detailed_tab = st.tabs(["Basic View", "Detailed View"])
        
        with basic_tab:
            # Select columns for basic display
            basic_cols = ['date_display', 'weight_lbs', 'calories', 'protein', 'carbs', 'fat']
            
            # Check which columns actually exist in the dataframe
            available_cols = [col for col in basic_cols if col in filtered_records.columns]
            
            # Create a display dataframe with available columns
            basic_display = filtered_records[available_cols].copy()
            
            # Rename columns for user-friendly display
            column_names = {
                'date_display': 'Date',
                'weight_lbs': 'Weight (lbs)',
                'calories': 'Calories',
                'protein': 'Protein (g)',
                'carbs': 'Carbs (g)',
                'fat': 'Fat (g)'
            }
            
            # Only rename columns that exist
            new_names = {}
            for col in basic_display.columns:
                if col in column_names:
                    new_names[col] = column_names[col]
            
            basic_display.rename(columns=new_names, inplace=True)
            
            # Show editable data
            st.dataframe(
                basic_display,
                use_container_width=True,
                hide_index=True
            )
            
            # Create an edit form
            with st.expander("Edit Record"):
                # Select record to edit
                date_to_edit = st.selectbox(
                    "Select date to edit:",
                    options=basic_display['Date'].tolist(),
                    key="date_to_edit_dashboard"
                )
                
                if date_to_edit:
                    # Get the record to edit
                    record_to_edit = basic_display[basic_display['Date'] == date_to_edit].iloc[0]
                    
                    # Create form to edit values
                    with st.form(key="edit_record_form"):
                        # Weight input
                        if 'Weight (lbs)' in record_to_edit:
                            weight_value = record_to_edit['Weight (lbs)']
                            weight = st.number_input("Weight (lbs)", 
                                                 value=float(weight_value) if pd.notnull(weight_value) else 0.0,
                                                 step=0.1)
                        else:
                            weight = None
                        
                        # Calories input
                        if 'Calories' in record_to_edit:
                            calories_value = record_to_edit['Calories']
                            calories = st.number_input("Calories", 
                                                    value=int(float(calories_value)) if pd.notnull(calories_value) else 0,
                                                    step=10)
                        else:
                            calories = None
                        
                        # Macros inputs
                        if 'Protein (g)' in record_to_edit:
                            protein_value = record_to_edit['Protein (g)']
                            protein = st.number_input("Protein (g)", 
                                                  value=int(float(protein_value)) if pd.notnull(protein_value) else 0,
                                                  step=1)
                        else:
                            protein = None
                            
                        if 'Carbs (g)' in record_to_edit:
                            carbs_value = record_to_edit['Carbs (g)']
                            carbs = st.number_input("Carbs (g)", 
                                                value=int(float(carbs_value)) if pd.notnull(carbs_value) else 0,
                                                step=1)
                        else:
                            carbs = None
                            
                        if 'Fat (g)' in record_to_edit:
                            fat_value = record_to_edit['Fat (g)']
                            fat = st.number_input("Fat (g)", 
                                              value=int(float(fat_value)) if pd.notnull(fat_value) else 0,
                                              step=1)
                        else:
                            fat = None
                        
                        # Submit button
                        submit = st.form_submit_button("Save Changes")
                        
                        if submit:
                            try:
                                # Find matching record in original data
                                match_idx = st.session_state.daily_records[
                                    st.session_state.daily_records['date'].dt.strftime('%Y-%m-%d') == date_to_edit
                                ].index
                                
                                if not match_idx.empty:
                                    # Update weight if provided
                                    if weight is not None:
                                        st.session_state.daily_records.loc[match_idx[0], 'weight_lbs'] = weight
                                        st.session_state.daily_records.loc[match_idx[0], 'weight_kg'] = weight / 2.20462
                                    
                                    # Update other nutrition values if provided
                                    if calories is not None:
                                        st.session_state.daily_records.loc[match_idx[0], 'calories'] = calories
                                    if protein is not None:
                                        st.session_state.daily_records.loc[match_idx[0], 'protein'] = protein
                                    if carbs is not None:
                                        st.session_state.daily_records.loc[match_idx[0], 'carbs'] = carbs
                                    if fat is not None:
                                        st.session_state.daily_records.loc[match_idx[0], 'fat'] = fat
                                    
                                    # Save updated data
                                    st.session_state.daily_records.to_csv('data/daily_records.csv', index=False)
                                    st.success("Changes saved successfully!")
                                    st.rerun()
                            except Exception as e:
                                st.error(f"Error saving changes: {e}")
        
        with detailed_tab:
            # For detailed view, show all available columns
            st.write("Detailed view of your tracking data:")
            st.dataframe(filtered_records.drop(columns=['date_display'], errors='ignore'), use_container_width=True)
        
        # Data management actions
        st.subheader("Data Management Actions")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Delete selected records
            st.write("Delete specific records:")
            dates_to_delete = st.multiselect(
                "Select dates to delete:",
                options=filtered_records['date_display'].tolist(),
                key="dates_to_delete"
            )
            
            if st.button("Delete Selected Records", key="dashboard_delete_records"):
                if dates_to_delete:
                    # Remove the selected records
                    st.session_state.daily_records = st.session_state.daily_records[
                        ~st.session_state.daily_records['date'].dt.strftime('%Y-%m-%d').isin(dates_to_delete)
                    ]
                    
                    # Save the updated records
                    st.session_state.daily_records.to_csv('data/daily_records.csv', index=False)
                    st.success(f"Deleted {len(dates_to_delete)} record(s)")
                    st.rerun()
                else:
                    st.warning("No records selected for deletion")
        
        with col2:
            # Clear all data option with confirmation
            st.write("Clear all tracking data:")
            if st.button("Clear All Data", key="dashboard_clear_records"):
                # Add confirmation
                if 'dashboard_confirm_delete_all' not in st.session_state:
                    st.session_state.dashboard_confirm_delete_all = False
                
                if not st.session_state.dashboard_confirm_delete_all:
                    st.session_state.dashboard_confirm_delete_all = True
                    st.warning("⚠️ Are you sure you want to delete ALL data? This cannot be undone. Click again to confirm.")
                else:
                    # Clear the dataframe
                    st.session_state.daily_records = pd.DataFrame(columns=st.session_state.daily_records.columns)
                    
                    # Save empty dataframe
                    st.session_state.daily_records.to_csv('data/daily_records.csv', index=False)
                    st.success("All records cleared")
                    
                    # Reset confirmation
                    st.session_state.dashboard_confirm_delete_all = False
                    st.rerun()
    else:
        st.info("No tracking data available yet. Start logging your daily data in the Daily Monitoring page.")

# Progress Photos Tab
with photo_gallery_tab:
    st.subheader("Progress Photo Gallery")
    st.markdown("View and manage your progress photos over time.")
    
    # Get the progress photos dataframe
    photo_df = utils.get_progress_photos_df()
    
    if not photo_df.empty:
        # Sort by date (newest first)
        photo_df = photo_df.sort_values(by='date', ascending=False)
        
        # Date filtering
        date_filter = st.text_input(
            "Filter by date (YYYY-MM-DD):", 
            placeholder="Enter date to filter photos",
            key="gallery_date_filter"
        )
        
        # Apply date filter if provided
        if date_filter:
            filtered_photos = photo_df[photo_df['date'].str.contains(date_filter)]
        else:
            filtered_photos = photo_df
        
        # Group photos by date - convert to list directly
        dates = filtered_photos['date'].unique() if isinstance(filtered_photos['date'], pd.Series) else []
        dates = list(dates) if hasattr(dates, '__iter__') else []
        
        for date in dates:
            st.markdown(f"### {date}")
            
            # Get photos for this date
            date_photos = filtered_photos[filtered_photos['date'] == date]
            
            # Create columns for different photo types
            cols = st.columns(3)
            
            # Track if we have any photos for this date
            has_photos = False
            
            # Photo types we expect
            photo_types = ['front', 'side', 'back']
            
            # Display photos
            for i, photo_type in enumerate(photo_types):
                type_photos = date_photos[date_photos['photo_type'] == photo_type]
                
                if not type_photos.empty:
                    has_photos = True
                    with cols[i]:
                        st.markdown(f"**{photo_type.capitalize()} View**")
                        # Get first row's filepath
                        filepath = type_photos['filepath'].values[0] if len(type_photos) > 0 else ""
                        st.image(filepath, use_container_width=True)
                        
                        # Add a delete button for each photo
                        if st.button(f"Delete {photo_type.capitalize()} Photo", key=f"delete_{date}_{photo_type}"):
                            try:
                                # Get the filepath using values
                                filepath = type_photos['filepath'].values[0] if len(type_photos) > 0 else ""
                                
                                # Delete the file if it exists
                                if os.path.exists(filepath):
                                    os.remove(filepath)
                                
                                # Remove from dataframe
                                utils.get_progress_photos_df()  # Refresh the dataframe
                                updated_photo_df = utils.get_progress_photos_df()
                                updated_photo_df = updated_photo_df[~((updated_photo_df['date'] == date) & (updated_photo_df['photo_type'] == photo_type))]
                                
                                # Save updated dataframe
                                updated_photo_df.to_csv('data/progress_photos.csv', index=False)
                                
                                st.success(f"Deleted {photo_type} photo for {date}")
                                st.rerun()
                            except Exception as e:
                                st.error(f"Error deleting photo: {e}")
            
            if not has_photos:
                st.write("No photos found for this date")
            
            st.markdown("---")
        
        # Add option to delete all photos
        if st.button("Delete All Photos", key="gallery_delete_all"):
            # Add confirmation
            if 'gallery_confirm_delete_all' not in st.session_state:
                st.session_state.gallery_confirm_delete_all = False
            
            if not st.session_state.gallery_confirm_delete_all:
                st.session_state.gallery_confirm_delete_all = True
                st.warning("⚠️ Are you sure you want to delete ALL photos? This cannot be undone. Click again to confirm.")
            else:
                # Delete all photo files
                for _, row in photo_df.iterrows():
                    try:
                        filepath = str(row['filepath'])
                        if os.path.exists(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        st.error(f"Error deleting photo file: {e}")
                
                # Clear the dataframe - properly create empty DataFrame
                empty_df = pd.DataFrame({'date': [], 'photo_type': [], 'filepath': []})
                empty_df.to_csv('data/progress_photos.csv', index=False)
                
                # Reset confirmation
                st.session_state.gallery_confirm_delete_all = False
                st.success("All photos cleared")
                st.rerun()
    else:
        st.info("No progress photos uploaded yet. Add photos in the Daily Monitoring page.")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
