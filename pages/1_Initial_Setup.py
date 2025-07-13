import streamlit as st
import pandas as pd
from datetime import datetime, date
import os
import utils
from session_manager import add_session_controls, save_on_change
from progress_summary import show_progress_summary

# Page config
st.set_page_config(
    page_title="Fitomics - Initial Setup",
    page_icon="📝",
    layout="wide"
)

# Header
try:
    st.image("images/fitomicshorizontalgold.png", width=300)
except:
    st.title("Fitomics")
st.title("Initial Setup")
st.markdown("Enter your personal information and goals to get started.")

# Add session management controls
add_session_controls()

# Initialize session state
if 'user_info' not in st.session_state:
    st.session_state.user_info = {}
if 'nutrition_plan' not in st.session_state:
    st.session_state.nutrition_plan = {}
if 'daily_tracking' not in st.session_state:
    st.session_state.daily_tracking = {}
if 'progress_photos' not in st.session_state:
    st.session_state.progress_photos = {}
if 'daily_records' not in st.session_state:
    st.session_state.daily_records = pd.DataFrame()

# Development shortcuts for faster testing
if st.sidebar.button("🚀 Quick Fill Test Data"):
    st.session_state.user_info = {
        'use_imperial': True,
        'gender': 'Male',
        'dob': '15/06/1990',  # Add DOB for proper age calculation
        'age': 34,
        'height_cm': 175,
        'height_ft': 5,
        'height_in': 9,
        'weight_kg': 75,
        'weight_lbs': 165,
        'body_fat_percentage': 18,
        'goal_focus': 'Build muscle',
        'activity_level': 'Moderately active',
        'workout_frequency': 4,
        'workout_calories': 350,
        'lifestyle_commitment': 'High - I am very motivated and can stick to detailed plans',
        'tracking_commitment': 'Medium - I can track most days but may miss some',
        'tdee': 2650
    }
    st.session_state.setup_complete = True
    st.success("Test data loaded! You can now navigate to other pages.")
    st.rerun()

# Add imperial/metric toggle at the top
imperial_selected = st.toggle("Use Imperial Units (lbs, ft/in)", value=st.session_state.user_info.get('use_imperial', True))

# Personal Information Section
st.subheader("Personal Information")

col1, col2 = st.columns(2)

with col1:
    name = st.text_input("Full Name", value=st.session_state.user_info.get('name', ''))
    
    gender = st.selectbox(
        "Gender",
        options=["Male", "Female"],
        index=0 if st.session_state.user_info.get('gender') == "Male" else 1
    )
    
    # Date of Birth with DD/MM/YYYY format and extended date range
    # Handle different date formats for backwards compatibility
    stored_dob = st.session_state.user_info.get('dob', '')
    default_dob = date(1990, 1, 1)
    
    if stored_dob:
        try:
            # Try DD/MM/YYYY format first
            if '/' in stored_dob:
                default_dob = datetime.strptime(stored_dob, '%d/%m/%Y').date()
            else:
                # Fallback to YYYY-MM-DD format
                default_dob = datetime.strptime(stored_dob, '%Y-%m-%d').date()
        except ValueError:
            default_dob = date(1990, 1, 1)
    
    dob = st.date_input(
        "Date of Birth",
        value=default_dob,
        min_value=date(1920, 1, 1),  # Allow dates back to 1920
        max_value=date.today(),
        format="DD/MM/YYYY",
        help="Enter your date of birth. You can type the date in DD/MM/YYYY format or use the calendar picker."
    )
    
    # Display the date in DD/MM/YYYY format consistently
    if dob:
        formatted_date = dob.strftime('%d/%m/%Y')
        st.write(f"**Selected Date: {formatted_date}**")
    
    # Automatically calculate and display age when date is entered
    if dob:
        today = date.today()
        calculated_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        st.write(f"**Age: {calculated_age} years**")
        
        # Store calculated age in session state for immediate use
        if 'temp_age' not in st.session_state:
            st.session_state.temp_age = calculated_age
        else:
            st.session_state.temp_age = calculated_age
    else:
        calculated_age = 25  # Default fallback
        st.session_state.temp_age = calculated_age
    
    # Height input based on unit preference
    if imperial_selected:
        height_feet = st.number_input("Height (feet)", min_value=3, max_value=8, 
                                    value=st.session_state.user_info.get('height_ft', 5), step=1)
        height_inches = st.number_input("Height (inches)", min_value=0, max_value=11, 
                                      value=st.session_state.user_info.get('height_in', 8), step=1)
        if height_feet is not None and height_inches is not None:
            height_cm = (height_feet * 12 + height_inches) * 2.54
            st.write(f"Height: {height_feet}'{height_inches}\" ({height_cm:.1f} cm)")
        else:
            height_cm = 175.0  # Default fallback
    else:
        height_cm = st.number_input("Height (cm)", min_value=120.0, max_value=250.0, 
                                   value=st.session_state.user_info.get('height_cm', 175.0), step=0.5)
        if height_cm is not None:
            height_inches = height_cm / 2.54
            height_feet = int(height_inches // 12)
            height_in_remainder = int(height_inches % 12)
            st.write(f"Height: {height_feet}'{height_in_remainder}\" ({height_cm:.1f} cm)")
        else:
            height_inches = 0
            height_feet = 0
            height_in_remainder = 0
    
    # Weight input based on unit preference
    if imperial_selected:
        weight_lbs_value = st.session_state.user_info.get('weight_lbs', 165.0)
        weight_lbs_value = weight_lbs_value if weight_lbs_value is not None else 165.0
        weight_lbs = st.number_input("Weight (lbs)", min_value=80.0, max_value=500.0, 
                                   value=float(weight_lbs_value), step=0.5)
        if weight_lbs is not None:
            weight_kg = weight_lbs / 2.20462
            st.write(f"Weight: {weight_kg:.1f} kg")
        else:
            weight_kg = 75.0  # Default fallback
    else:
        weight_kg_value = st.session_state.user_info.get('weight_kg', 75.0)
        weight_kg_value = weight_kg_value if weight_kg_value is not None else 75.0
        weight_kg = st.number_input("Weight (kg)", min_value=35.0, max_value=225.0, 
                                  value=float(weight_kg_value), step=0.1)
        if weight_kg is not None:
            weight_lbs = weight_kg * 2.20462
            st.write(f"Weight: {weight_lbs:.1f} lbs")
        else:
            weight_lbs = 165.0  # Default fallback

with col2:
    # Body fat input with reference photo tooltip
    bf_col1, bf_col2 = st.columns([3, 1])
    
    with bf_col1:
        st.write("Enter Current Estimated Body Fat %")
        body_fat = st.number_input(
            "Body Fat Percentage",
            min_value=3.0,
            max_value=50.0,
            value=15.0,
            step=0.1,
            format="%.1f"
        )
    
    with bf_col2:
        st.write("")  # Empty space to align with input
        if st.button("📷 Reference", help="View body fat percentage reference photos"):
            st.session_state.show_bf_reference = True
    
    # Show reference photos in a modal-like container when button is clicked
    if st.session_state.get('show_bf_reference', False):
        with st.container():
            st.markdown("### Body Fat Percentage Visual Reference")
            st.markdown("Use these reference photos to help estimate your current body fat percentage.")
            
            ref_photo_path = "images/ref_photos.jpg"
            if os.path.exists(ref_photo_path):
                st.image(ref_photo_path, caption="Body Fat Percentage Reference - Men (top) and Women (bottom)", use_container_width=True)
            else:
                alt_path = "attached_assets/ref_photos.jpg"
                if os.path.exists(alt_path):
                    st.image(alt_path, caption="Body Fat Percentage Reference", use_container_width=True)
                else:
                    st.warning("Reference photos not available.")
            
            if st.button("Close Reference Photos"):
                st.session_state.show_bf_reference = False
                st.rerun()
    
    activity_level = st.selectbox(
        "Select Physical Activity Level Outside of Workouts",
        options=[
            "Sedentary (0-5k steps/day)",
            "Light Active (5-10k steps/day)",
            "Active (10-15k steps/day)",
            "Labor Intensive (>15k steps/day)"
        ]
    )
    
    workouts_per_week = st.number_input(
        "Enter Average Number of Workouts Per Week",
        min_value=0,
        max_value=14,
        value=3,
        step=1
    )
    
    workout_calories = st.number_input(
        "Enter Average Calories Expended During a Workout",
        min_value=0,
        max_value=2000,
        value=300,
        step=50,
        help="Simple estimates: Light workout (walking, yoga) = 150-250 calories • Moderate workout (jogging, cycling) = 250-400 calories • Intense workout (HIIT, heavy lifting) = 400-600 calories • Very intense workout (CrossFit, long runs) = 600+ calories"
    )

# Goals and Preferences Section
st.subheader("Goals and Preferences")

# Primary goal selection
goal_type = st.radio(
    "What body composition goal do you want to focus on over the next 8-12 weeks?",
    options=["Lose fat", "Build muscle", "Maintain body composition/Support performance"],
    horizontal=True
)

# Performance preference (not for maintenance)
if goal_type != "Maintain body composition/Support performance":
    performance_preference = st.radio(
        "Regarding your performance and recovery, choose one of the following options:",
        options=[
            "I'm ok if my performance and recovery from training aren't as good during this phase in order to achieve my body composition goal.",
            "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal."
        ]
    )
else:
    performance_preference = "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal."

# Body composition preferences - dynamic based on goal
if goal_type == "Lose fat":
    body_comp_preference = st.radio(
        "Regarding your body composition, choose one of the following options:",
        options=[
            "I don't want to lose any muscle mass while losing body fat.",
            "I'm ok with losing a little muscle mass while losing body fat."
        ]
    )
elif goal_type == "Build muscle":
    body_comp_preference = st.radio(
        "Regarding your body composition, choose one of the following options:",
        options=[
            "I want to maximize muscle growth and am ok with gaining some body fat.",
            "I don't want to gain any body fat while focusing on building muscle."
        ]
    )
else:
    body_comp_preference = "Maintain current body composition"

# Lifestyle commitment
lifestyle_commitment = st.radio(
    "As of today, choose what you believe you can commit to regarding your lifestyle:",
    options=[
        "I am committed to prioritizing adequate sleep, performing resistance exercise/cardio at least 4 days per week, and consuming adequate protein, macronutrients, and micronutrients this phase.",
        "I can commit to at least a few workouts per week and will try to ensure I prioritize sufficient sleep. I will also try to eat mindfully according to my goals, but I'm not certain I'll be able to do all that's required to maximize my progress during this phase.",
        "I can't commit to consistently perform 3 or more workouts per week or achieve adequate sleep levels."
    ]
)

# Tracking commitment
tracking_commitment = st.radio(
    "Regarding tracking your progress:",
    options=[
        "I am committed to tracking regularly",
        "I'm not committed to tracking regularly"
    ]
)

# Submit button
if st.button("Save and Continue", use_container_width=True, type="primary"):
        # Map activity level for TDEE calculation
        activity_map = {
            "Sedentary (0-5k steps/day)": "Sedentary (office job, <2 hours exercise per week)",
            "Light Active (5-10k steps/day)": "Lightly Active (light exercise 2-3 times per week)",
            "Active (10-15k steps/day)": "Moderately Active (moderate exercise 3-5 times per week)",
            "Labor Intensive (>15k steps/day)": "Very Active (hard exercise 6-7 times per week)"
        }
        mapped_activity = activity_map[activity_level]
        
        # Map workout frequency
        if workouts_per_week <= 1:
            workout_frequency = "0-1 workouts per week"
        elif workouts_per_week <= 3:
            workout_frequency = "2-3 workouts per week"
        elif workouts_per_week <= 5:
            workout_frequency = "4-5 workouts per week"
        else:
            workout_frequency = "6+ workouts per week"
        
        # Combine commitment levels for backend logic
        if lifestyle_commitment == "I am committed to prioritizing adequate sleep, performing resistance exercise/cardio at least 4 days per week, and consuming adequate protein, macronutrients, and micronutrients this phase." and tracking_commitment == "I am committed to tracking regularly":
            commitment_level = "I am committed to prioritizing adequate sleep, performing resistance exercise/cardio at least 4 days per week, consuming adequate protein, macronutrients, and micronutrients this phase. I'm also willing to track my nutrition and bodyweight consistently."
        elif lifestyle_commitment == "I can't commit to consistently perform 3 or more workouts per week or achieve adequate sleep levels." or tracking_commitment == "I'm not committed to tracking regularly":
            commitment_level = "I can't commit to consistently perform 3 or more workouts per week or achieve adequate sleep levels. I'm also not willing to regularly track my nutrition and bodyweight."
        else:
            commitment_level = "I can commit to at least a few workouts per week and will try to ensure I prioritize sufficient sleep. I will also try to eat mindfully according to my goals, but I'm not certain I'll be able to do all that's required to maximize my progress during this phase."
        
        # Use the calculated age from date of birth section
        final_age = st.session_state.get('temp_age', 25)
        
        # Calculate TDEE using the calculated age
        tdee = utils.calculate_tdee(
            gender, weight_kg, height_cm, final_age, mapped_activity, workouts_per_week, workout_calories
        )
        
        # Calculate total height in inches and store height components
        if imperial_selected:
            total_height_inches = height_feet * 12 + height_inches
            height_ft_store = height_feet
            height_in_store = height_inches
        else:
            total_height_inches = height_cm / 2.54
            height_ft_store = int(total_height_inches // 12)
            height_in_store = int(total_height_inches % 12)
        
        # Save all data to session state
        # Use the calculated age from the display section
        final_age = st.session_state.get('temp_age', 25)
        
        st.session_state.user_info = {
            'name': name,
            'gender': gender,
            'dob': dob.strftime('%d/%m/%Y') if dob else '',  # Store in DD/MM/YYYY format
            'age': final_age,
            'height_cm': height_cm,
            'height_inches': total_height_inches,
            'height_ft': height_ft_store,
            'height_in': height_in_store,
            'weight_kg': weight_kg,
            'weight_lbs': weight_lbs,
            'body_fat_percentage': body_fat,
            'activity_level': mapped_activity,
            'raw_activity_level': activity_level,
            'workouts_per_week': workouts_per_week,
            'workout_frequency': workout_frequency,
            'workout_calories': workout_calories,
            'goal_focus': goal_type,
            'performance_preference': performance_preference,
            'body_comp_preference': body_comp_preference,
            'lifestyle_commitment': lifestyle_commitment,
            'tracking_commitment': tracking_commitment,
            'commitment_level': commitment_level,
            'use_imperial': imperial_selected,
            'tdee': tdee
        }
        
        # Set goal in goal_info
        if 'goal_info' not in st.session_state:
            st.session_state.goal_info = {}
        
        goal_type_code = "lose_fat" if goal_type == "Lose fat" else "gain_muscle" if goal_type == "Build muscle" else "maintain"
        st.session_state.goal_info['goal_type'] = goal_type_code
        

        
        # Mark setup as complete
        st.session_state.setup_complete = True
        
        # Save data
        utils.save_data()
        
        st.success("✅ Setup complete! Please proceed to 'Body Composition Goals' to set your targets.")
        st.info("👈 Use the sidebar navigation to continue to the next step.")
        st.info("💡 You can return to this page at any time to update your information. All changes will be saved automatically.")

# Body fat reference photos


# Show current values if saved
if st.session_state.user_info:
    st.markdown("---")
    st.markdown("### 📋 Current Setup Summary")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.session_state.user_info.get('name'):
            st.write(f"**Name:** {st.session_state.user_info['name']}")
        st.write(f"**Goal:** {st.session_state.user_info.get('goal_focus', 'Not set')}")
        st.write(f"**Age:** {st.session_state.user_info.get('age', 'Not set')} years")
        # Get height components from stored data
        height_ft = st.session_state.user_info.get('height_ft', 5)
        height_in = st.session_state.user_info.get('height_in', 8)
        height_cm = st.session_state.user_info.get('height_cm', 175)
        
        # Ensure values are not None
        height_ft = height_ft if height_ft is not None else 5
        height_in = height_in if height_in is not None else 8
        height_cm = height_cm if height_cm is not None else 175
        
        if imperial_selected:
            st.write(f"**Height:** {height_ft}'{height_in}\"")
            weight_lbs = st.session_state.user_info.get('weight_lbs', 0)
            weight_lbs = weight_lbs if weight_lbs is not None else 0
            st.write(f"**Weight:** {weight_lbs:.1f} lbs")
        else:
            st.write(f"**Height:** {height_cm:.1f} cm")
            weight_kg = st.session_state.user_info.get('weight_kg', 0)
            weight_kg = weight_kg if weight_kg is not None else 0
            st.write(f"**Weight:** {weight_kg:.1f} kg")
    
    with col2:
        body_fat = st.session_state.user_info.get('body_fat_percentage', 0)
        tdee = st.session_state.user_info.get('tdee', 0)
        workouts = st.session_state.user_info.get('workouts_per_week', 0)
        
        st.write(f"**Body Fat:** {body_fat:.1f}%" if body_fat else "**Body Fat:** Not set")
        st.write(f"**Activity Level:** {st.session_state.user_info.get('raw_activity_level', 'Not set')}")
        st.write(f"**Workouts/Week:** {workouts}" if workouts is not None else "**Workouts/Week:** Not set")
        st.write(f"**TDEE:** {tdee:.0f} calories" if tdee else "**TDEE:** Not calculated")

# Show progressive summary
show_progress_summary('initial_setup')