import streamlit as st
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta
import utils
from session_manager import add_session_controls

# Create data directory if it doesn't exist
if not os.path.exists("data"):
    os.makedirs("data")

# Set page configuration
st.set_page_config(
    page_title="App Overview",
    page_icon="🏋️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state variables if they don't exist
if 'user_info' not in st.session_state:
    st.session_state.user_info = {
        'gender': None,
        'age': None,
        'height_cm': None,
        'weight_kg': None,
        'activity_level': None,
        'body_fat_percentage': None
    }

if 'goal_info' not in st.session_state:
    st.session_state.goal_info = {
        'goal_type': None,  # 'lose_fat', 'gain_muscle', 'maintain'
        'target_weight_kg': None,
        'target_body_fat': None,
        'timeline_weeks': None,
        'start_date': None
    }

if 'nutrition_plan' not in st.session_state:
    st.session_state.nutrition_plan = {
        'target_calories': None,
        'target_protein': None,
        'target_carbs': None,
        'target_fat': None,
        'weekly_adjustments': []
    }

if 'daily_records' not in st.session_state:
    st.session_state.daily_records = pd.DataFrame()

# Main page content  
col1, col2 = st.columns([1, 4])
with col1:
    st.image("attached_assets/Fitomics Stacked – Dark Blue_1751728580847.png", width=120)
with col2:
    st.title("App Overview")
    st.markdown("**Fitomics Body Composition Planning Tool**")

st.markdown("""
This application helps you plan and track your body composition and nutrition goals. Navigate through the steps using the sidebar menu:

## Core Workflow Steps:

1. **Initial Setup**: Enter your personal information, body measurements, and fitness goals
2. **Body Composition Goals**: Define your target weight, body fat percentage, and timeline
3. **Diet Preferences**: Set your food preferences, dietary restrictions, allergies, and flavor preferences
4. **Weekly Schedule**: Plan your workout schedule, meal timing, and daily activities
5. **Nutrition Targets**: Review calculated nutrition targets and customize if needed
6. **Advanced AI Meal Plan**: Complete weekly meal plans with AI integration  
7. **Enhanced AI Meal Plan**: FDC-verified nutrition with interactive macro adjustments
8. **DIY Meal Planning**: Manual meal planning with macro tracking
9. **Daily Monitoring**: Track daily progress and adjustments
10. **Progress Dashboard**: View comprehensive progress analytics and trends
11. **Hydration Calculator**: Calculate personalized hydration needs for exercise and daily life

## Additional Features:

- **Session Management**: Save and load your progress at any step
- **PDF Export**: Generate branded meal plans with grocery lists
- **Macro Accuracy**: AI-powered meal planning with precise macro targeting (±3% tolerance)
- **FDC Nutrition Verification**: USDA database integration for accurate nutrition data
- **Interactive Portion Adjustments**: Real-time sliders to hit exact macro targets
- **Flavor Customization**: Seasoning and spice preferences for better meal variety
- **Progress Tracking**: Monitor your body composition journey
- **Hydration Calculator**: Personalized fluid intake recommendations for exercise and daily needs

## Enhanced Features (NEW):

- **Micronutrient Optimization**: Target specific vitamins and minerals in your meal plans
- **Seasonal Ingredient Integration**: Prioritize seasonal produce for better taste and nutrition
- **Location-Based Meal Planning**: Get local restaurant and grocery store recommendations
- **Smart Ingredient Substitutions**: Alternative ingredient suggestions for dietary restrictions
- **Meal Prep Coordination**: Optimize ingredient usage and preparation timing across meals
- **Local Cuisine Integration**: Restaurant recommendations based on your location and preferences

## Getting Started:

Complete the setup steps in order (1-5) for the best experience, then use either AI meal planning option based on your needs. Your progress is automatically saved and can be resumed at any time.

**Quick Start**: Select "Initial Setup" from the sidebar to begin!
""")

# Add some basic statistics if user has been using the app
if not st.session_state.daily_records.empty:
    st.subheader("Quick Stats")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # Check if user preference is for imperial units
        use_imperial = st.session_state.user_info.get('use_imperial', True)
        
        if use_imperial:
            current_wt = st.session_state.daily_records['weight_kg'].iloc[-1] * 2.20462
            initial_wt = st.session_state.daily_records['weight_kg'].iloc[0] * 2.20462
            units = "lbs"
        else:
            current_wt = st.session_state.daily_records['weight_kg'].iloc[-1]
            initial_wt = st.session_state.daily_records['weight_kg'].iloc[0]
            units = "kg"
            
        st.metric(
            label="Current Weight", 
            value=f"{current_wt:.1f} {units}",
            delta=f"{current_wt - initial_wt:.1f} {units}"
        )
    
    with col2:
        avg_calories = st.session_state.daily_records['calories'].mean()
        target = st.session_state.nutrition_plan['target_calories']
        st.metric(
            label="Avg. Daily Calories", 
            value=f"{avg_calories:.0f} kcal",
            delta=f"{avg_calories - target:.0f} kcal" if target else None
        )
    
    with col3:
        days_tracked = len(st.session_state.daily_records)
        if 'start_date' in st.session_state.goal_info and st.session_state.goal_info['start_date']:
            start = st.session_state.goal_info['start_date']
            timeline_weeks = st.session_state.goal_info.get('timeline_weeks')
            if timeline_weeks and timeline_weeks > 0:
                timeline = timeline_weeks * 7
                progress = min(days_tracked / timeline * 100, 100)
            else:
                progress = 0
            st.metric(
                label="Progress", 
                value=f"{progress:.1f}%",
                delta=f"{days_tracked} days tracked"
            )

# Add session management controls to sidebar
add_session_controls()