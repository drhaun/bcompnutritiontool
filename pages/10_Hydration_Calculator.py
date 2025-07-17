import streamlit as st
import pandas as pd
import numpy as np
import math
from session_manager import add_session_controls

# Set page configuration
st.set_page_config(
    page_title="Hydration Calculator",
    page_icon="💧",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state variables
if 'hydration_data' not in st.session_state:
    st.session_state.hydration_data = {
        'body_weight': 70.0,
        'exercise_duration': 60,
        'exercise_intensity': 'moderate',
        'sweat_rate': None,
        'fluids_consumed': 0.0,
        'pre_weight': None,
        'post_weight': None,
        'advanced_mode': False
    }

def calculate_base_fluid_needs(body_weight):
    """Calculate base fluid needs based on body weight"""
    # Base fluid needs: 35-40 mL/kg/day
    return body_weight * 35  # mL/day

def calculate_sweat_rate_from_weights(pre_weight, post_weight, exercise_duration, fluids_consumed):
    """Calculate sweat rate from pre/post exercise weights"""
    if pre_weight is None or post_weight is None:
        return None
    
    # Weight loss (kg) + fluids consumed (L) = sweat loss (L)
    weight_loss_kg = pre_weight - post_weight
    sweat_loss_L = weight_loss_kg + fluids_consumed
    
    # Convert to L/hr
    sweat_rate_L_hr = sweat_loss_L / (exercise_duration / 60)
    
    return max(0, sweat_rate_L_hr)

def estimate_sweat_rate_by_intensity(body_weight, intensity):
    """Estimate sweat rate based on exercise intensity and body weight"""
    # Base sweat rates (L/hr) adjusted for body weight
    base_rates = {
        'low': 0.3,
        'moderate': 0.8,
        'high': 1.5
    }
    
    # Adjust for body weight (larger individuals typically sweat more)
    weight_factor = body_weight / 70  # Normalize to 70kg
    
    return base_rates[intensity] * weight_factor

def calculate_fluid_loss(sweat_rate, exercise_duration):
    """Calculate total fluid loss during exercise"""
    if sweat_rate is None:
        return None
    
    return sweat_rate * (exercise_duration / 60)  # L

def calculate_hydration_recommendation(fluid_loss, exercise_duration):
    """Calculate recommended fluid intake during exercise"""
    if fluid_loss is None:
        return None, None
    
    # Recommend replacing 80-100% of fluid loss during exercise
    total_fluid_needed = fluid_loss * 0.9  # 90% replacement
    
    # Convert to mL and calculate per 15-20 minute intervals
    total_mL = total_fluid_needed * 1000
    intervals_15min = exercise_duration / 15
    intervals_20min = exercise_duration / 20
    
    mL_per_15min = total_mL / intervals_15min if intervals_15min > 0 else 0
    mL_per_20min = total_mL / intervals_20min if intervals_20min > 0 else 0
    
    return mL_per_15min, mL_per_20min

def calculate_sodium_loss(sweat_rate, exercise_duration):
    """Calculate sodium loss based on sweat rate"""
    if sweat_rate is None:
        return None, None
    
    fluid_loss = sweat_rate * (exercise_duration / 60)
    
    # Sodium concentration in sweat: 500-1200 mg/L (average 850 mg/L)
    sodium_min = fluid_loss * 500  # mg
    sodium_max = fluid_loss * 1200  # mg
    
    return sodium_min, sodium_max

def calculate_post_exercise_rehydration(fluid_loss):
    """Calculate post-exercise rehydration target"""
    if fluid_loss is None:
        return None, None
    
    # Replace 125-150% of fluid lost
    rehydration_min = fluid_loss * 1.25 * 1000  # mL
    rehydration_max = fluid_loss * 1.5 * 1000   # mL
    
    return rehydration_min, rehydration_max

# Page header
col1, col2 = st.columns([1, 4])
with col1:
    st.image("attached_assets/Fitomics Stacked – Dark Blue_1751728580847.png", width=120)
with col2:
    st.title("💧 Hydration Calculator")
    st.markdown("**Personalized Hydration Needs Assessment**")

# Advanced mode toggle
st.session_state.hydration_data['advanced_mode'] = st.toggle(
    "Advanced Mode", 
    value=st.session_state.hydration_data['advanced_mode'],
    help="Show detailed calculations and additional metrics"
)

# Main input form
st.markdown("## Exercise & Body Information")

col1, col2 = st.columns(2)

with col1:
    st.session_state.hydration_data['body_weight'] = st.number_input(
        "Body Weight (kg)",
        min_value=30.0,
        max_value=200.0,
        value=st.session_state.hydration_data['body_weight'],
        step=0.5,
        help="Your current body weight"
    )
    
    st.session_state.hydration_data['exercise_duration'] = st.number_input(
        "Exercise Duration (minutes)",
        min_value=10,
        max_value=480,
        value=st.session_state.hydration_data['exercise_duration'],
        step=5,
        help="Total duration of your exercise session"
    )
    
    st.session_state.hydration_data['exercise_intensity'] = st.selectbox(
        "Exercise Intensity",
        options=['low', 'moderate', 'high'],
        index=['low', 'moderate', 'high'].index(st.session_state.hydration_data['exercise_intensity']),
        help="Low: Light activity, minimal sweating\nModerate: Some sweating, can hold conversation\nHigh: Heavy sweating, difficult to speak"
    )

with col2:
    st.session_state.hydration_data['fluids_consumed'] = st.number_input(
        "Fluids Consumed During Exercise (L)",
        min_value=0.0,
        max_value=5.0,
        value=st.session_state.hydration_data['fluids_consumed'],
        step=0.1,
        help="Amount of fluids you drank during exercise"
    )
    
    # Optional sweat rate input
    sweat_rate_input = st.number_input(
        "Known Sweat Rate (L/hr) - Optional",
        min_value=0.0,
        max_value=5.0,
        value=st.session_state.hydration_data['sweat_rate'] if st.session_state.hydration_data['sweat_rate'] is not None else 0.0,
        step=0.1,
        help="If you know your sweat rate from previous testing"
    )
    
    if sweat_rate_input > 0:
        st.session_state.hydration_data['sweat_rate'] = sweat_rate_input
    else:
        st.session_state.hydration_data['sweat_rate'] = None

# Optional pre/post weight section
st.markdown("## Pre/Post Exercise Weight (Optional)")
st.markdown("*For more accurate sweat rate calculation*")

col1, col2 = st.columns(2)
with col1:
    pre_weight = st.number_input(
        "Pre-Exercise Weight (kg)",
        min_value=30.0,
        max_value=200.0,
        value=st.session_state.hydration_data['pre_weight'] if st.session_state.hydration_data['pre_weight'] is not None else st.session_state.hydration_data['body_weight'],
        step=0.1,
        help="Your weight before exercise"
    )
    
    if pre_weight != st.session_state.hydration_data['body_weight']:
        st.session_state.hydration_data['pre_weight'] = pre_weight
    else:
        st.session_state.hydration_data['pre_weight'] = None

with col2:
    post_weight = st.number_input(
        "Post-Exercise Weight (kg)",
        min_value=30.0,
        max_value=200.0,
        value=st.session_state.hydration_data['post_weight'] if st.session_state.hydration_data['post_weight'] is not None else st.session_state.hydration_data['body_weight'],
        step=0.1,
        help="Your weight after exercise"
    )
    
    if post_weight != st.session_state.hydration_data['body_weight']:
        st.session_state.hydration_data['post_weight'] = post_weight
    else:
        st.session_state.hydration_data['post_weight'] = None

# Calculate results
body_weight = st.session_state.hydration_data['body_weight']
exercise_duration = st.session_state.hydration_data['exercise_duration']
exercise_intensity = st.session_state.hydration_data['exercise_intensity']
fluids_consumed = st.session_state.hydration_data['fluids_consumed']
pre_weight = st.session_state.hydration_data['pre_weight']
post_weight = st.session_state.hydration_data['post_weight']

# Determine sweat rate
if st.session_state.hydration_data['sweat_rate'] is not None:
    sweat_rate = st.session_state.hydration_data['sweat_rate']
    sweat_rate_source = "User Input"
elif pre_weight is not None and post_weight is not None:
    sweat_rate = calculate_sweat_rate_from_weights(pre_weight, post_weight, exercise_duration, fluids_consumed)
    sweat_rate_source = "Calculated from Weight Loss"
else:
    sweat_rate = estimate_sweat_rate_by_intensity(body_weight, exercise_intensity)
    sweat_rate_source = "Estimated from Intensity"

# Calculate all metrics
fluid_loss = calculate_fluid_loss(sweat_rate, exercise_duration)
mL_per_15min, mL_per_20min = calculate_hydration_recommendation(fluid_loss, exercise_duration)
sodium_min, sodium_max = calculate_sodium_loss(sweat_rate, exercise_duration)
rehydration_min, rehydration_max = calculate_post_exercise_rehydration(fluid_loss)
base_fluid_needs = calculate_base_fluid_needs(body_weight)

# Display results
st.markdown("---")
st.markdown("## 📊 Hydration Results")

# Main results in columns
col1, col2, col3 = st.columns(3)

with col1:
    st.metric(
        "Estimated Sweat Rate",
        f"{sweat_rate:.2f} L/hr" if sweat_rate is not None else "N/A",
        help=f"Source: {sweat_rate_source}"
    )
    
    if st.session_state.hydration_data['advanced_mode']:
        st.caption(f"Source: {sweat_rate_source}")

with col2:
    st.metric(
        "Total Fluid Loss",
        f"{fluid_loss:.2f} L" if fluid_loss is not None else "N/A",
        help="Total fluid lost during exercise through sweat"
    )

with col3:
    st.metric(
        "Sodium Loss Range",
        f"{sodium_min:.0f}-{sodium_max:.0f} mg" if sodium_min is not None else "N/A",
        help="Estimated sodium lost in sweat (500-1200 mg/L)"
    )

# Hydration recommendations
st.markdown("### 🥤 During Exercise Hydration")
col1, col2 = st.columns(2)

with col1:
    st.metric(
        "Every 15 minutes",
        f"{mL_per_15min:.0f} mL" if mL_per_15min is not None else "N/A",
        help="Recommended fluid intake every 15 minutes"
    )

with col2:
    st.metric(
        "Every 20 minutes",
        f"{mL_per_20min:.0f} mL" if mL_per_20min is not None else "N/A",
        help="Recommended fluid intake every 20 minutes"
    )

# Post-exercise rehydration
st.markdown("### 💪 Post-Exercise Rehydration")
col1, col2 = st.columns(2)

with col1:
    st.metric(
        "Minimum Target",
        f"{rehydration_min:.0f} mL" if rehydration_min is not None else "N/A",
        help="125% of fluid lost (minimum recommendation)"
    )

with col2:
    st.metric(
        "Optimal Target",
        f"{rehydration_max:.0f} mL" if rehydration_max is not None else "N/A",
        help="150% of fluid lost (optimal recommendation)"
    )

# Advanced mode detailed information
if st.session_state.hydration_data['advanced_mode']:
    st.markdown("---")
    st.markdown("## 🔬 Advanced Calculations")
    
    # Base fluid needs
    st.markdown("### Daily Base Fluid Needs")
    st.info(f"**{base_fluid_needs:.0f} mL/day** ({base_fluid_needs/1000:.1f} L/day)")
    st.caption("Based on 35 mL/kg body weight (not including exercise)")
    
    # Detailed calculations
    st.markdown("### Calculation Details")
    
    if sweat_rate is not None:
        st.markdown("**Sweat Rate Calculation:**")
        if sweat_rate_source == "Calculated from Weight Loss":
            weight_loss = pre_weight - post_weight if pre_weight and post_weight else 0
            st.write(f"• Weight loss: {weight_loss:.2f} kg")
            st.write(f"• Fluids consumed: {fluids_consumed:.2f} L")
            st.write(f"• Total sweat loss: {weight_loss + fluids_consumed:.2f} L")
            st.write(f"• Exercise duration: {exercise_duration} minutes ({exercise_duration/60:.1f} hours)")
            st.write(f"• Sweat rate: {sweat_rate:.2f} L/hr")
        elif sweat_rate_source == "Estimated from Intensity":
            weight_factor = body_weight / 70
            st.write(f"• Base rate for {exercise_intensity} intensity: {estimate_sweat_rate_by_intensity(70, exercise_intensity):.2f} L/hr")
            st.write(f"• Body weight adjustment factor: {weight_factor:.2f}")
            st.write(f"• Adjusted sweat rate: {sweat_rate:.2f} L/hr")
    
    # Hydration strategy
    st.markdown("### Hydration Strategy")
    st.markdown("""
    **Pre-Exercise (2-3 hours before):**
    - Drink 400-600 mL of fluid
    - Include some sodium if exercising >1 hour
    
    **During Exercise:**
    - Start drinking early (within 15-20 minutes)
    - Aim for cool fluids (15-22°C)
    - Include carbohydrates for sessions >60 minutes
    
    **Post-Exercise:**
    - Drink 125-150% of fluid lost
    - Include sodium to help retention
    - Monitor urine color (pale yellow ideal)
    """)

# Fluid recommendations table
if st.session_state.hydration_data['advanced_mode']:
    st.markdown("### Fluid Type Recommendations")
    
    recommendations_data = []
    
    if exercise_duration <= 60:
        recommendations_data.append({
            'Duration': '≤60 minutes',
            'Fluid Type': 'Water',
            'Sodium': 'Not needed',
            'Carbohydrates': 'Not needed'
        })
    else:
        recommendations_data.append({
            'Duration': '>60 minutes',
            'Fluid Type': 'Sports drink or water + electrolytes',
            'Sodium': '300-700 mg/L',
            'Carbohydrates': '30-60g/hour'
        })
    
    if exercise_intensity == 'high' or exercise_duration > 120:
        recommendations_data.append({
            'Duration': '>120 minutes or high intensity',
            'Fluid Type': 'Sports drink with electrolytes',
            'Sodium': '500-1000 mg/L',
            'Carbohydrates': '60-90g/hour'
        })
    
    df_recommendations = pd.DataFrame(recommendations_data)
    st.table(df_recommendations)

# Warning messages
if fluid_loss is not None:
    if fluid_loss > 2.0:
        st.warning("⚠️ High fluid loss detected. Consider reducing exercise intensity or increasing fluid intake.")
    
    if sweat_rate is not None and sweat_rate > 2.0:
        st.warning("⚠️ Very high sweat rate. Consider heat acclimatization and frequent hydration breaks.")

# Tips section
st.markdown("---")
st.markdown("## 💡 Hydration Tips")

tips_col1, tips_col2 = st.columns(2)

with tips_col1:
    st.markdown("""
    **Before Exercise:**
    - Check urine color (pale yellow = well hydrated)
    - Drink 400-600 mL 2-3 hours before
    - Don't over-hydrate to avoid hyponatremia
    """)

with tips_col2:
    st.markdown("""
    **During Exercise:**
    - Drink regularly, don't wait until thirsty
    - Cool fluids (15-22°C) are absorbed faster
    - Include electrolytes for sessions >60 minutes
    """)

# Session management
add_session_controls()