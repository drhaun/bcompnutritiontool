import streamlit as st
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta
import utils

# Create data directory if it doesn't exist
if not os.path.exists("data"):
    os.makedirs("data")

# Set page configuration
st.set_page_config(
    page_title="Fitomics Body Comp Planning Tool",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load Fitomics brand colors
try:
    with open('images/branding/fitomics_colors.json', 'r') as f:
        brand_colors = json.load(f)
except:
    # Default brand colors if file not found
    brand_colors = {
        "dark_blue": {"hex": "#00263d"},
        "navy": {"hex": "#003b59"},
        "light_blue": {"hex": "#82c2d7"},
        "dark_gold": {"hex": "#c19962"},
        "light_gold": {"hex": "#e4ac61"}
    }

# Custom CSS with Fitomics branding
st.markdown(f"""
<style>
    .main .block-container {{
        padding-top: 2rem;
    }}
    h1, h2, h3 {{
        color: {brand_colors["dark_blue"]["hex"]};
    }}
    .stButton>button {{
        background-color: {brand_colors["dark_blue"]["hex"]};
        color: white;
    }}
    .stButton>button:hover {{
        background-color: {brand_colors["navy"]["hex"]};
        color: white;
    }}
    .stTabs [data-baseweb="tab-list"] button [data-testid="stMarkdownContainer"] p {{
        font-size: 1rem;
    }}
    .stTabs [data-baseweb="tab-list"] {{
        gap: 1rem;
    }}
    .stTabs [aria-selected="true"] {{
        background-color: {brand_colors["light_gold"]["hex"]};
    }}
    .css-18e3th9 {{
        padding-top: 0;
    }}
    
    /* Custom class for the logo container */
    .logo-container {{
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
    }}
    .title-text {{
        color: {brand_colors["dark_gold"]["hex"]};
        margin-left: 1rem;
    }}
    
    /* Custom sidebar styling */
    .css-1d391kg {{
        background-color: {brand_colors["dark_blue"]["hex"]};
    }}
    .css-1cypcdb {{
        background-color: {brand_colors["navy"]["hex"]};
        color: white !important;
    }}
</style>
""", unsafe_allow_html=True)

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
    st.session_state.daily_records = pd.DataFrame(columns=[
        'date', 'weight_kg', 'calories', 'protein', 'carbs', 'fat'
    ])

# Main page content
st.markdown("""
<div class="logo-container">
    <img src="data:image/png;base64,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" height="60">
    <h1 class="title-text">Fitomics Body Composition Planner</h1>
</div>
""", unsafe_allow_html=True)

st.markdown("""
This application helps you plan and track your body composition and nutrition goals. Navigate through the steps using the sidebar menu:

1. **Initial Setup**: Enter your personal information
2. **Body Composition Goals**: Define your body composition targets
3. **Nutrition Plan**: Review your personalized nutrition recommendations
4. **Advanced Meal Planning**: Create and plan meals with accurate nutrition data
5. **Daily Monitoring**: Track your daily weight and nutrition intake
6. **Progress Dashboard**: Visualize your journey and get weekly adjustments

Get started by selecting "Initial Setup" from the sidebar!
""")

# Add some basic statistics if user has been using the app
if not st.session_state.daily_records.empty:
    st.subheader("Quick Stats")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="Current Weight", 
            value=f"{st.session_state.daily_records['weight_kg'].iloc[-1]:.1f} kg",
            delta=f"{st.session_state.daily_records['weight_kg'].iloc[-1] - st.session_state.daily_records['weight_kg'].iloc[0]:.1f} kg"
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
            timeline = st.session_state.goal_info['timeline_weeks'] * 7
            progress = min(days_tracked / timeline * 100, 100) if timeline else 0
            st.metric(
                label="Progress", 
                value=f"{progress:.1f}%",
                delta=f"{days_tracked} days tracked"
            )
