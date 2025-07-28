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
        'unit_system': 'metric',
        'body_weight': 70.0,
        'exercise_duration': 60,
        'exercise_intensity': 'moderate',
        'exercise_type': 'general',
        'environment_temp': 20,
        'environment_humidity': 50,
        'sweat_rate': None,
        'fluids_consumed': 0.0,
        'pre_weight': None,
        'post_weight': None,
        'advanced_mode': False,
        'altitude': 0,
        'clothing_type': 'light',
        'acclimatization': 'acclimatized'
    }

# Conversion functions
def kg_to_lbs(kg):
    """Convert kg to pounds"""
    return kg * 2.20462

def lbs_to_kg(lbs):
    """Convert pounds to kg"""
    return lbs / 2.20462

def liters_to_oz(liters):
    """Convert liters to fluid ounces"""
    return liters * 33.814

def oz_to_liters(oz):
    """Convert fluid ounces to liters"""
    return oz / 33.814

def ml_to_oz(ml):
    """Convert mL to fluid ounces"""
    return ml / 29.5735

def celsius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit"""
    return (celsius * 9/5) + 32

def fahrenheit_to_celsius(fahrenheit):
    """Convert Fahrenheit to Celsius"""
    return (fahrenheit - 32) * 5/9

def calculate_base_fluid_needs(body_weight_kg):
    """Calculate base fluid needs based on body weight"""
    # Base fluid needs: 35-40 mL/kg/day
    return body_weight_kg * 35  # mL/day

def calculate_sweat_rate_from_weights(pre_weight_kg, post_weight_kg, exercise_duration, fluids_consumed_L):
    """Calculate sweat rate from pre/post exercise weights"""
    if pre_weight_kg is None or post_weight_kg is None:
        return None
    
    # Weight loss (kg) + fluids consumed (L) = sweat loss (L)
    weight_loss_kg = pre_weight_kg - post_weight_kg
    sweat_loss_L = weight_loss_kg + fluids_consumed_L
    
    # Convert to L/hr
    sweat_rate_L_hr = sweat_loss_L / (exercise_duration / 60)
    
    return max(0, sweat_rate_L_hr)

def estimate_sweat_rate_comprehensive(body_weight_kg, intensity, exercise_type, temp_c, humidity, altitude, clothing, acclimatization):
    """Enhanced sweat rate estimation with environmental and personal factors"""
    
    # Base sweat rates by exercise type and intensity (L/hr)
    base_rates = {
        'general': {'low': 0.3, 'moderate': 0.8, 'high': 1.5},
        'running': {'low': 0.5, 'moderate': 1.0, 'high': 2.0},
        'cycling': {'low': 0.4, 'moderate': 0.9, 'high': 1.8},
        'strength': {'low': 0.2, 'moderate': 0.6, 'high': 1.2},
        'hiit': {'low': 0.6, 'moderate': 1.2, 'high': 2.2},
        'swimming': {'low': 0.2, 'moderate': 0.5, 'high': 1.0},
        'team_sports': {'low': 0.4, 'moderate': 1.0, 'high': 1.9}
    }
    
    base_rate = base_rates.get(exercise_type, base_rates['general'])[intensity]
    
    # Body weight factor (larger individuals typically sweat more)
    weight_factor = body_weight_kg / 70
    
    # Temperature factor
    if temp_c <= 15:
        temp_factor = 0.8
    elif temp_c <= 25:
        temp_factor = 1.0
    elif temp_c <= 30:
        temp_factor = 1.3
    elif temp_c <= 35:
        temp_factor = 1.6
    else:
        temp_factor = 2.0
    
    # Humidity factor
    if humidity <= 40:
        humidity_factor = 1.0
    elif humidity <= 60:
        humidity_factor = 1.1
    elif humidity <= 80:
        humidity_factor = 1.3
    else:
        humidity_factor = 1.5
    
    # Altitude factor (higher altitude = more sweating)
    altitude_factor = 1.0 + (altitude / 3000) * 0.2
    
    # Clothing factor
    clothing_factors = {
        'minimal': 0.9,
        'light': 1.0,
        'moderate': 1.2,
        'heavy': 1.5
    }
    clothing_factor = clothing_factors.get(clothing, 1.0)
    
    # Acclimatization factor
    acclimatization_factors = {
        'not_acclimatized': 1.3,
        'partially_acclimatized': 1.1,
        'acclimatized': 1.0
    }
    acclimatization_factor = acclimatization_factors.get(acclimatization, 1.0)
    
    # Calculate final sweat rate
    sweat_rate = (base_rate * weight_factor * temp_factor * humidity_factor * 
                  altitude_factor * clothing_factor * acclimatization_factor)
    
    return max(0.1, min(4.0, sweat_rate))  # Cap between 0.1 and 4.0 L/hr

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

def calculate_comprehensive_electrolyte_loss(sweat_rate, exercise_duration, acclimatization='acclimatized'):
    """Calculate comprehensive electrolyte loss including all major electrolytes"""
    if sweat_rate is None:
        return None
    
    fluid_loss = sweat_rate * (exercise_duration / 60)
    
    # Electrolyte concentrations in sweat (mg/L) - adjusted for acclimatization
    if acclimatization == 'not_acclimatized':
        electrolyte_concentrations = {
            'sodium': {'min': 800, 'max': 1400, 'avg': 1100},
            'chloride': {'min': 1200, 'max': 2100, 'avg': 1650},
            'potassium': {'min': 150, 'max': 300, 'avg': 225},
            'magnesium': {'min': 8, 'max': 25, 'avg': 16.5},
            'calcium': {'min': 60, 'max': 120, 'avg': 90},
            'phosphorus': {'min': 8, 'max': 15, 'avg': 11.5}
        }
    elif acclimatization == 'partially_acclimatized':
        electrolyte_concentrations = {
            'sodium': {'min': 600, 'max': 1000, 'avg': 800},
            'chloride': {'min': 900, 'max': 1500, 'avg': 1200},
            'potassium': {'min': 120, 'max': 250, 'avg': 185},
            'magnesium': {'min': 6, 'max': 20, 'avg': 13},
            'calcium': {'min': 45, 'max': 100, 'avg': 72.5},
            'phosphorus': {'min': 6, 'max': 12, 'avg': 9}
        }
    else:  # acclimatized
        electrolyte_concentrations = {
            'sodium': {'min': 400, 'max': 800, 'avg': 600},
            'chloride': {'min': 600, 'max': 1200, 'avg': 900},
            'potassium': {'min': 100, 'max': 200, 'avg': 150},
            'magnesium': {'min': 4, 'max': 15, 'avg': 9.5},
            'calcium': {'min': 30, 'max': 80, 'avg': 55},
            'phosphorus': {'min': 4, 'max': 10, 'avg': 7}
        }
    
    electrolyte_losses = {}
    for electrolyte, conc in electrolyte_concentrations.items():
        electrolyte_losses[electrolyte] = {
            'min': fluid_loss * conc['min'],
            'max': fluid_loss * conc['max'],
            'avg': fluid_loss * conc['avg']
        }
    
    return electrolyte_losses

def calculate_post_exercise_rehydration(fluid_loss):
    """Calculate post-exercise rehydration target"""
    if fluid_loss is None:
        return None, None
    
    # Replace 125-150% of fluid lost
    rehydration_min = fluid_loss * 1.25 * 1000  # mL
    rehydration_max = fluid_loss * 1.5 * 1000   # mL
    
    return rehydration_min, rehydration_max

# Custom CSS for enhanced styling
st.markdown("""
<style>
.metric-container {
    background-color: #f0f8ff;
    padding: 15px;
    border-radius: 10px;
    border-left: 4px solid #1f77b4;
    margin: 10px 0;
}

.electrolyte-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px;
    border-radius: 10px;
    margin: 5px 0;
    text-align: center;
}

.hydration-tip {
    background-color: #e8f5e8;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #28a745;
    margin: 10px 0;
}

.warning-box {
    background-color: #fff3cd;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #ffc107;
    margin: 10px 0;
}
</style>
""", unsafe_allow_html=True)

# Page header
col1, col2 = st.columns([1, 4])
with col1:
    st.image("attached_assets/Fitomics Stacked – Dark Blue_1751728580847.png", width=120)
with col2:
    st.title("💧 Enhanced Hydration Calculator")
    st.markdown("**Comprehensive Hydration & Electrolyte Management System**")

# Unit system selection
st.markdown("## ⚙️ Measurement System")
unit_system = st.radio(
    "Choose your preferred units:",
    options=['metric', 'imperial'],
    index=0 if st.session_state.hydration_data['unit_system'] == 'metric' else 1,
    horizontal=True,
    help="Metric: kg, Celsius, mL, L | Imperial: lbs, Fahrenheit, fl oz"
)
st.session_state.hydration_data['unit_system'] = unit_system

# Advanced mode toggle
st.session_state.hydration_data['advanced_mode'] = st.toggle(
    "🔬 Advanced Mode", 
    value=st.session_state.hydration_data['advanced_mode'],
    help="Show detailed environmental factors, comprehensive electrolyte analysis, and advanced calculations"
)

# Main input form
st.markdown("## 📊 Personal & Exercise Information")

col1, col2 = st.columns(2)

with col1:
    if unit_system == 'metric':
        body_weight_input = st.number_input(
            "Body Weight (kg)",
            min_value=30.0,
            max_value=200.0,
            value=st.session_state.hydration_data['body_weight'],
            step=0.5,
            help="Your current body weight in kilograms"
        )
        body_weight_kg = body_weight_input
    else:
        body_weight_lbs = st.number_input(
            "Body Weight (lbs)",
            min_value=66.0,
            max_value=440.0,
            value=kg_to_lbs(st.session_state.hydration_data['body_weight']),
            step=1.0,
            help="Your current body weight in pounds"
        )
        body_weight_kg = lbs_to_kg(body_weight_lbs)
    
    st.session_state.hydration_data['body_weight'] = body_weight_kg
    
    st.session_state.hydration_data['exercise_duration'] = st.number_input(
        "Exercise Duration (minutes)",
        min_value=10,
        max_value=480,
        value=st.session_state.hydration_data['exercise_duration'],
        step=5,
        help="Total duration of your exercise session"
    )
    
    st.session_state.hydration_data['exercise_type'] = st.selectbox(
        "Exercise Type",
        options=['general', 'running', 'cycling', 'strength', 'hiit', 'swimming', 'team_sports'],
        index=['general', 'running', 'cycling', 'strength', 'hiit', 'swimming', 'team_sports'].index(st.session_state.hydration_data['exercise_type']),
        help="Different exercise types have different sweat patterns"
    )
    
    st.session_state.hydration_data['exercise_intensity'] = st.selectbox(
        "Exercise Intensity",
        options=['low', 'moderate', 'high'],
        index=['low', 'moderate', 'high'].index(st.session_state.hydration_data['exercise_intensity']),
        help="Low: Light activity, minimal sweating\nModerate: Some sweating, can hold conversation\nHigh: Heavy sweating, difficult to speak"
    )

with col2:
    if unit_system == 'metric':
        fluids_input = st.number_input(
            "Fluids Consumed During Exercise (L)",
            min_value=0.0,
            max_value=5.0,
            value=st.session_state.hydration_data['fluids_consumed'],
            step=0.1,
            help="Amount of fluids you drank during exercise"
        )
        fluids_consumed_L = fluids_input
    else:
        fluids_oz = st.number_input(
            "Fluids Consumed During Exercise (fl oz)",
            min_value=0.0,
            max_value=169.0,
            value=liters_to_oz(st.session_state.hydration_data['fluids_consumed']),
            step=1.0,
            help="Amount of fluids you drank during exercise"
        )
        fluids_consumed_L = oz_to_liters(fluids_oz)
    
    st.session_state.hydration_data['fluids_consumed'] = fluids_consumed_L
    
    # Environmental conditions
    if unit_system == 'metric':
        temp_input = st.number_input(
            "Environment Temperature (°C)",
            min_value=-10,
            max_value=50,
            value=st.session_state.hydration_data['environment_temp'],
            step=1,
            help="Temperature of your exercise environment"
        )
        temp_c = temp_input
    else:
        temp_f = st.number_input(
            "Environment Temperature (°F)",
            min_value=14,
            max_value=122,
            value=celsius_to_fahrenheit(st.session_state.hydration_data['environment_temp']),
            step=1,
            help="Temperature of your exercise environment"
        )
        temp_c = fahrenheit_to_celsius(temp_f)
    
    st.session_state.hydration_data['environment_temp'] = temp_c
    
    st.session_state.hydration_data['environment_humidity'] = st.slider(
        "Humidity (%)",
        min_value=10,
        max_value=100,
        value=st.session_state.hydration_data['environment_humidity'],
        step=5,
        help="Relative humidity of your exercise environment"
    )

# Advanced environmental factors
if st.session_state.hydration_data['advanced_mode']:
    st.markdown("### 🌍 Advanced Environmental Factors")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.session_state.hydration_data['altitude'] = st.number_input(
            "Altitude (meters)",
            min_value=0,
            max_value=5000,
            value=st.session_state.hydration_data['altitude'],
            step=100,
            help="Altitude affects sweat rate and fluid needs"
        )
    
    with col2:
        st.session_state.hydration_data['clothing_type'] = st.selectbox(
            "Clothing Type",
            options=['minimal', 'light', 'moderate', 'heavy'],
            index=['minimal', 'light', 'moderate', 'heavy'].index(st.session_state.hydration_data['clothing_type']),
            help="Clothing affects heat dissipation and sweat rate"
        )
    
    with col3:
        st.session_state.hydration_data['acclimatization'] = st.selectbox(
            "Heat Acclimatization",
            options=['not_acclimatized', 'partially_acclimatized', 'acclimatized'],
            index=['not_acclimatized', 'partially_acclimatized', 'acclimatized'].index(st.session_state.hydration_data['acclimatization']),
            help="Heat acclimatization affects sweat composition and rate"
        )

# Optional precise sweat rate input
st.markdown("### 🔬 Precise Sweat Rate (Optional)")
if unit_system == 'metric':
    sweat_rate_input = st.number_input(
        "Known Sweat Rate (L/hr) - Optional",
        min_value=0.0,
        max_value=5.0,
        value=st.session_state.hydration_data['sweat_rate'] if st.session_state.hydration_data['sweat_rate'] is not None else 0.0,
        step=0.1,
        help="If you know your precise sweat rate from previous testing"
    )
else:
    sweat_rate_oz = st.number_input(
        "Known Sweat Rate (fl oz/hr) - Optional",
        min_value=0.0,
        max_value=169.0,
        value=liters_to_oz(st.session_state.hydration_data['sweat_rate']) if st.session_state.hydration_data['sweat_rate'] is not None else 0.0,
        step=1.0,
        help="If you know your precise sweat rate from previous testing"
    )
    sweat_rate_input = oz_to_liters(sweat_rate_oz) if sweat_rate_oz > 0 else 0.0

if sweat_rate_input > 0:
    st.session_state.hydration_data['sweat_rate'] = sweat_rate_input
else:
    st.session_state.hydration_data['sweat_rate'] = None

# Optional pre/post weight section for precise measurement
st.markdown("### ⚖️ Pre/Post Exercise Weight (Optional)")
st.markdown("*For the most accurate sweat rate calculation - weigh yourself naked before and after exercise*")

col1, col2 = st.columns(2)
with col1:
    if unit_system == 'metric':
        pre_weight_input = st.number_input(
            "Pre-Exercise Weight (kg)",
            min_value=30.0,
            max_value=200.0,
            value=st.session_state.hydration_data['pre_weight'] if st.session_state.hydration_data['pre_weight'] is not None else st.session_state.hydration_data['body_weight'],
            step=0.1,
            help="Your weight immediately before exercise (naked weight preferred)"
        )
        pre_weight_kg = pre_weight_input
    else:
        pre_weight_lbs = st.number_input(
            "Pre-Exercise Weight (lbs)",
            min_value=66.0,
            max_value=440.0,
            value=kg_to_lbs(st.session_state.hydration_data['pre_weight']) if st.session_state.hydration_data['pre_weight'] is not None else kg_to_lbs(st.session_state.hydration_data['body_weight']),
            step=0.2,
            help="Your weight immediately before exercise (naked weight preferred)"
        )
        pre_weight_kg = lbs_to_kg(pre_weight_lbs)
    
    if abs(pre_weight_kg - st.session_state.hydration_data['body_weight']) > 0.1:
        st.session_state.hydration_data['pre_weight'] = pre_weight_kg
    else:
        st.session_state.hydration_data['pre_weight'] = None

with col2:
    if unit_system == 'metric':
        post_weight_input = st.number_input(
            "Post-Exercise Weight (kg)",
            min_value=30.0,
            max_value=200.0,
            value=st.session_state.hydration_data['post_weight'] if st.session_state.hydration_data['post_weight'] is not None else st.session_state.hydration_data['body_weight'],
            step=0.1,
            help="Your weight immediately after exercise (naked weight preferred)"
        )
        post_weight_kg = post_weight_input
    else:
        post_weight_lbs = st.number_input(
            "Post-Exercise Weight (lbs)",
            min_value=66.0,
            max_value=440.0,
            value=kg_to_lbs(st.session_state.hydration_data['post_weight']) if st.session_state.hydration_data['post_weight'] is not None else kg_to_lbs(st.session_state.hydration_data['body_weight']),
            step=0.2,
            help="Your weight immediately after exercise (naked weight preferred)"
        )
        post_weight_kg = lbs_to_kg(post_weight_lbs)
    
    if abs(post_weight_kg - st.session_state.hydration_data['body_weight']) > 0.1:
        st.session_state.hydration_data['post_weight'] = post_weight_kg
    else:
        st.session_state.hydration_data['post_weight'] = None

# Calculate results
body_weight_kg = st.session_state.hydration_data['body_weight']
exercise_duration = st.session_state.hydration_data['exercise_duration']
exercise_type = st.session_state.hydration_data['exercise_type']
exercise_intensity = st.session_state.hydration_data['exercise_intensity']
fluids_consumed_L = st.session_state.hydration_data['fluids_consumed']
temp_c = st.session_state.hydration_data['environment_temp']
humidity = st.session_state.hydration_data['environment_humidity']
altitude = st.session_state.hydration_data['altitude']
clothing = st.session_state.hydration_data['clothing_type']
acclimatization = st.session_state.hydration_data['acclimatization']
pre_weight_kg = st.session_state.hydration_data['pre_weight']
post_weight_kg = st.session_state.hydration_data['post_weight']
# Determine sweat rate using the most accurate method available
if st.session_state.hydration_data['sweat_rate'] is not None:
    sweat_rate = st.session_state.hydration_data['sweat_rate']
    sweat_rate_source = "User Input"
elif pre_weight_kg is not None and post_weight_kg is not None:
    sweat_rate = calculate_sweat_rate_from_weights(pre_weight_kg, post_weight_kg, exercise_duration, fluids_consumed_L)
    sweat_rate_source = "Calculated from Weight Loss"
else:
    sweat_rate = estimate_sweat_rate_comprehensive(body_weight_kg, exercise_intensity, exercise_type, temp_c, humidity, altitude, clothing, acclimatization)
    sweat_rate_source = "Comprehensive Estimation"

# Calculate all metrics
fluid_loss = calculate_fluid_loss(sweat_rate, exercise_duration)
mL_per_15min, mL_per_20min = calculate_hydration_recommendation(fluid_loss, exercise_duration)
electrolyte_losses = calculate_comprehensive_electrolyte_loss(sweat_rate, exercise_duration, acclimatization)
rehydration_min, rehydration_max = calculate_post_exercise_rehydration(fluid_loss)
base_fluid_needs = calculate_base_fluid_needs(body_weight_kg)

# Display results
st.markdown("---")
st.markdown("## 📊 Comprehensive Hydration Results")

# Main results in columns
col1, col2, col3 = st.columns(3)

with col1:
    if unit_system == 'metric':
        sweat_display = f"{sweat_rate:.2f} L/hr"
        fluid_loss_display = f"{fluid_loss:.2f} L" if fluid_loss is not None else "N/A"
    else:
        sweat_display = f"{liters_to_oz(sweat_rate):.1f} fl oz/hr"
        fluid_loss_display = f"{liters_to_oz(fluid_loss):.1f} fl oz" if fluid_loss is not None else "N/A"
    
    st.metric(
        "Estimated Sweat Rate",
        sweat_display if sweat_rate is not None else "N/A",
        help=f"Source: {sweat_rate_source}"
    )
    
    if st.session_state.hydration_data['advanced_mode']:
        st.caption(f"📍 {sweat_rate_source}")

with col2:
    st.metric(
        "Total Fluid Loss",
        fluid_loss_display,
        help="Total fluid lost during exercise through sweat"
    )

with col3:
    if electrolyte_losses:
        sodium_loss = electrolyte_losses['sodium']['avg']
        st.metric(
            "Sodium Loss",
            f"{sodium_loss:.0f} mg",
            help=f"Estimated sodium lost (Range: {electrolyte_losses['sodium']['min']:.0f}-{electrolyte_losses['sodium']['max']:.0f} mg)"
        )
    else:
        st.metric("Sodium Loss", "N/A")

# During Exercise Hydration Recommendations
st.markdown("### 🥤 During Exercise Hydration Strategy")
col1, col2 = st.columns(2)

with col1:
    if unit_system == 'metric':
        per_15min_display = f"{mL_per_15min:.0f} mL" if mL_per_15min is not None else "N/A"
        per_20min_display = f"{mL_per_20min:.0f} mL" if mL_per_20min is not None else "N/A"
    else:
        per_15min_display = f"{ml_to_oz(mL_per_15min):.1f} fl oz" if mL_per_15min is not None else "N/A"
        per_20min_display = f"{ml_to_oz(mL_per_20min):.1f} fl oz" if mL_per_20min is not None else "N/A"
    
    st.metric(
        "Every 15 minutes",
        per_15min_display,
        help="Recommended fluid intake every 15 minutes during exercise"
    )

with col2:
    st.metric(
        "Every 20 minutes",
        per_20min_display,
        help="Recommended fluid intake every 20 minutes during exercise"
    )

# Post-exercise rehydration
st.markdown("### 💪 Post-Exercise Rehydration Targets")
col1, col2 = st.columns(2)

with col1:
    if unit_system == 'metric':
        rehydration_min_display = f"{rehydration_min:.0f} mL" if rehydration_min is not None else "N/A"
        rehydration_max_display = f"{rehydration_max:.0f} mL" if rehydration_max is not None else "N/A"
    else:
        rehydration_min_display = f"{ml_to_oz(rehydration_min):.1f} fl oz" if rehydration_min is not None else "N/A"
        rehydration_max_display = f"{ml_to_oz(rehydration_max):.1f} fl oz" if rehydration_max is not None else "N/A"
    
    st.metric(
        "Minimum Target",
        rehydration_min_display,
        help="125% of fluid lost - minimum for adequate rehydration"
    )

with col2:
    st.metric(
        "Optimal Target",
        rehydration_max_display,
        help="150% of fluid lost - optimal for complete rehydration"
    )

# Comprehensive Electrolyte Analysis
if electrolyte_losses and st.session_state.hydration_data['advanced_mode']:
    st.markdown("### ⚡ Comprehensive Electrolyte Loss Analysis")
    
    # Create electrolyte cards
    col1, col2, col3 = st.columns(3)
    
    electrolyte_info = {
        'sodium': {'name': 'Sodium (Na+)', 'icon': '🧂', 'color': '#FF6B6B'},
        'chloride': {'name': 'Chloride (Cl-)', 'icon': '💧', 'color': '#4ECDC4'},
        'potassium': {'name': 'Potassium (K+)', 'icon': '🍌', 'color': '#45B7D1'},
        'magnesium': {'name': 'Magnesium (Mg2+)', 'icon': '🥬', 'color': '#96CEB4'},
        'calcium': {'name': 'Calcium (Ca2+)', 'icon': '🦴', 'color': '#FFEAA7'},
        'phosphorus': {'name': 'Phosphorus (P)', 'icon': '💊', 'color': '#DDA0DD'}
    }
    
    electrolyte_keys = list(electrolyte_info.keys())
    
    for i, (electrolyte, loss_data) in enumerate(electrolyte_losses.items()):
        col_idx = i % 3
        with [col1, col2, col3][col_idx]:
            info = electrolyte_info[electrolyte]
            st.markdown(f"""
            <div class="electrolyte-card" style="background-color: {info['color']};">
                <h4>{info['icon']} {info['name']}</h4>
                <h3>{loss_data['avg']:.1f} mg</h3>
                <small>Range: {loss_data['min']:.1f} - {loss_data['max']:.1f} mg</small>
            </div>
            """, unsafe_allow_html=True)

# Electrolyte Replacement Recommendations
if electrolyte_losses:
    st.markdown("### 🥤 Electrolyte Replacement Recommendations")
    
    # Calculate replacement needs based on losses
    sodium_per_hour = electrolyte_losses['sodium']['avg'] / (exercise_duration / 60)
    potassium_per_hour = electrolyte_losses['potassium']['avg'] / (exercise_duration / 60)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="hydration-tip">
        <h4>🧂 Sodium Replacement</h4>
        <ul>
        <li><strong>During Exercise:</strong> 200-400 mg sodium per hour</li>
        <li><strong>Sports Drinks:</strong> Most contain 100-200 mg/8oz</li>
        <li><strong>Electrolyte Tablets:</strong> Usually 300-500 mg sodium</li>
        <li><strong>Natural Options:</strong> Sea salt (1/4 tsp = ~600mg)</li>
        </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="hydration-tip">
        <h4>🍌 Potassium & Other Electrolytes</h4>
        <ul>
        <li><strong>Potassium:</strong> 150-300 mg/hour from food/drinks</li>
        <li><strong>Magnesium:</strong> Often overlooked but important for muscle function</li>
        <li><strong>Calcium:</strong> Usually adequate from normal diet</li>
        <li><strong>Natural Sources:</strong> Coconut water, bananas, dates</li>
        </ul>
        </div>
        """, unsafe_allow_html=True)

# Personalized Hydration Recommendations
st.markdown("### 🎯 Personalized Hydration Protocol")

# Create customized recommendations based on all factors
recommendations = []

if exercise_duration > 90:
    recommendations.append("⏱️ **Long Duration**: Focus on consistent fluid intake throughout exercise")

if exercise_intensity == 'high':
    recommendations.append("🔥 **High Intensity**: Pre-cool if possible, monitor for overheating signs")

if temp_c > 25:
    recommendations.append("🌡️ **Hot Environment**: Start hydrating 2-3 hours before exercise")

if humidity > 70:
    recommendations.append("💨 **High Humidity**: Sweat evaporation reduced, increase fluid intake")

if acclimatization != 'acclimatized':
    recommendations.append("🌿 **Heat Acclimatization**: Extra caution needed, higher electrolyte replacement")

if altitude > 1500:
    recommendations.append("⛰️ **Altitude**: Increased fluid needs due to higher respiratory water loss")

for rec in recommendations:
    st.markdown(f"- {rec}")

# Hydration timing strategy
st.markdown("### ⏰ Optimal Hydration Timing")

col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    <div class="hydration-tip">
    <h4>🕐 Pre-Exercise (2-3 hours before)</h4>
    <ul>
    <li>Drink 400-600 mL (14-20 fl oz)</li>
    <li>Include some sodium if sweating heavily</li>
    <li>Monitor urine color (pale yellow ideal)</li>
    </ul>
    
    <h4>🕕 Pre-Exercise (15-30 minutes before)</h4>
    <ul>
    <li>Drink 200-300 mL (7-10 fl oz)</li>
    <li>Avoid overhydration before start</li>
    </ul>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="hydration-tip">
    <h4>🏃 During Exercise</h4>
    <ul>
    <li>Follow calculated intervals above</li>
    <li>Cool fluids (15-22°C) are absorbed faster</li>
    <li>Include electrolytes for sessions >60 minutes</li>
    </ul>
    
    <h4>🛑 Post-Exercise</h4>
    <ul>
    <li>Replace 125-150% of fluid lost</li>
    <li>Include sodium to retain fluids</li>
    <li>Spread intake over 2-6 hours</li>
    </ul>
    </div>
    """, unsafe_allow_html=True)

# Advanced mode detailed information
if st.session_state.hydration_data['advanced_mode']:
    st.markdown("---")
    st.markdown("## 🔬 Advanced Analysis & Calculations")
    
    # Base fluid needs
    st.markdown("### 📊 Daily Base Fluid Needs")
    if unit_system == 'metric':
        base_display = f"**{base_fluid_needs:.0f} mL/day** ({base_fluid_needs/1000:.1f} L/day)"
    else:
        base_display = f"**{ml_to_oz(base_fluid_needs):.0f} fl oz/day** ({base_fluid_needs/1000:.1f} L/day)"
    
    st.info(base_display)
    st.caption("Based on 35 mL/kg body weight (excludes exercise needs)")
    
    # Environmental impact analysis
    st.markdown("### 🌍 Environmental Impact Factors")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        temp_impact = "Low" if temp_c <= 20 else "Moderate" if temp_c <= 30 else "High"
        st.metric("Temperature Impact", temp_impact, f"{temp_c:.1f}°C")
    
    with col2:
        humidity_impact = "Low" if humidity <= 50 else "Moderate" if humidity <= 75 else "High"
        st.metric("Humidity Impact", humidity_impact, f"{humidity}%")
    
    with col3:
        altitude_impact = "None" if altitude == 0 else "Moderate" if altitude <= 2000 else "High"
        st.metric("Altitude Impact", altitude_impact, f"{altitude}m")
    
    # Detailed calculation breakdown
    st.markdown("### 🧮 Calculation Details")
    
    if sweat_rate is not None:
        st.markdown("**Sweat Rate Calculation:**")
        if sweat_rate_source == "Calculated from Weight Loss":
            if pre_weight_kg and post_weight_kg:
                weight_loss = pre_weight_kg - post_weight_kg
                st.write(f"- Weight loss: {weight_loss:.2f} kg")
                st.write(f"- Fluids consumed: {fluids_consumed_L:.2f} L")
                st.write(f"- Total sweat loss: {weight_loss + fluids_consumed_L:.2f} L")
                st.write(f"- Exercise duration: {exercise_duration} minutes")
                st.write(f"- **Calculated sweat rate: {sweat_rate:.2f} L/hr**")
        elif sweat_rate_source == "Comprehensive Estimation":
            st.write("**Factors considered in estimation:**")
            st.write(f"- Exercise type: {exercise_type.title()}")
            st.write(f"- Intensity: {exercise_intensity.title()}")
            st.write(f"- Body weight factor: {body_weight_kg/70:.2f}")
            st.write(f"- Temperature: {temp_c}°C")
            st.write(f"- Humidity: {humidity}%")
            st.write(f"- Clothing: {clothing.title()}")
            st.write(f"- Acclimatization: {acclimatization.replace('_', ' ').title()}")
            if altitude > 0:
                st.write(f"- Altitude: {altitude}m")
            st.write(f"- **Estimated sweat rate: {sweat_rate:.2f} L/hr**")
    
    # Warning indicators
    if fluid_loss and fluid_loss > 2.0:
        st.markdown("""
        <div class="warning-box">
        <h4>⚠️ High Fluid Loss Warning</h4>
        <p>Your estimated fluid loss exceeds 2L, which may significantly impact performance and health. Consider:</p>
        <ul>
        <li>More frequent fluid intake intervals</li>
        <li>Pre-cooling strategies</li>
        <li>Environmental modifications if possible</li>
        <li>Medical consultation for extreme conditions</li>
        </ul>
        </div>
        """, unsafe_allow_html=True)
    
    if sweat_rate and sweat_rate > 2.5:
        st.markdown("""
        <div class="warning-box">
        <h4>⚠️ Extreme Sweat Rate</h4>
        <p>Your sweat rate exceeds 2.5 L/hr. This is very high and requires careful monitoring:</p>
        <ul>
        <li>Consider sweat testing with a sports medicine professional</li>
        <li>Monitor for heat illness symptoms</li>
        <li>Ensure adequate electrolyte replacement</li>
        <li>Consider reducing exercise intensity in hot conditions</li>
        </ul>
        </div>
        """, unsafe_allow_html=True)

# Add session controls
add_session_controls()

# Add helpful tips footer
st.markdown("---")
st.markdown("### 💡 Pro Tips for Optimal Hydration")

tips_col1, tips_col2 = st.columns(2)

with tips_col1:
    st.markdown("""
    **🎯 Monitoring Hydration Status:**
    - Urine color: Pale yellow is optimal
    - Body weight: <2% loss during exercise
    - Thirst: Don't rely on it alone during exercise
    - Performance: Sudden fatigue may indicate dehydration
    """)
    
    st.markdown("""
    **🧪 Sweat Testing at Home:**
    - Weigh yourself naked before/after exercise
    - Record fluid intake during session
    - Calculate: (Weight loss + fluid intake) ÷ exercise hours
    - Test in different conditions for accuracy
    """)

with tips_col2:
    st.markdown("""
    **🥤 Fluid Selection Guidelines:**
    - Water: Fine for <60 minutes exercise
    - Sports drinks: 6-8% carbs for >60 minutes
    - Electrolyte tablets: Good for heavy sweaters
    - Natural options: Coconut water, diluted fruit juice
    """)
    
    st.markdown("""
    **⚠️ Warning Signs:**
    - Dizziness or lightheadedness
    - Rapid heartbeat
    - Nausea or vomiting
    - Confusion or irritability
    - Muscle cramps
    """)

st.markdown("---")
st.markdown("*For personalized hydration strategies or medical concerns, consult with a sports medicine professional or registered dietitian.*")
