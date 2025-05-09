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
st.title("Fitomics Body Comp Planning Tool")

st.markdown("""
This application helps you plan and track your body composition and nutrition goals. Navigate through the steps using the sidebar menu:

1. **Initial Setup**: Enter your personal information
2. **Body Composition Goals**: Define your body composition targets
3. **Nutrition Plan**: Review your personalized nutrition recommendations
4. **Daily Monitoring**: Track your daily weight and nutrition intake
5. **Progress Dashboard**: Visualize your journey and get weekly adjustments
6. **Enhanced Meal Planning**: Create and plan meals with accurate nutrition data from USDA

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
