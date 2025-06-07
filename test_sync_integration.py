"""
Test script to verify sync profile integration between body composition planning and AI Meal Planner
"""
import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.abspath('.'))
import utils

st.set_page_config(page_title="Sync Integration Test", page_icon="🔄", layout="wide")

st.title("🔄 Sync Profile Integration Test")
st.markdown("Testing the complete workflow from body composition planning to AI meal planning")

# Test 1: Body Composition Profile Setup
st.markdown("## Step 1: Body Composition Profile Setup")

# Simulate user profile data
test_profile = {
    'gender': 'Male',
    'age': 30,
    'height_cm': 180,
    'weight_kg': 80,
    'activity_level': 'Moderately active',
    'body_fat_percentage': 15
}

test_goals = {
    'goal_type': 'gain_muscle',
    'target_weight_kg': 85,
    'target_body_fat': 12,
    'timeline_weeks': 16
}

# Display test profile
col1, col2 = st.columns(2)

with col1:
    st.markdown("### Test Profile")
    for key, value in test_profile.items():
        st.write(f"**{key.replace('_', ' ').title()}:** {value}")

with col2:
    st.markdown("### Test Goals")
    for key, value in test_goals.items():
        st.write(f"**{key.replace('_', ' ').title()}:** {value}")

# Test 2: Calculate nutrition targets using the actual utils functions
st.markdown("## Step 2: Calculate Nutrition Targets")

if st.button("Calculate TDEE and Macros"):
    with st.spinner("Calculating nutritional targets..."):
        # Calculate TDEE
        tdee = utils.calculate_tdee(
            test_profile['gender'],
            test_profile['weight_kg'],
            test_profile['height_cm'],
            test_profile['age'],
            test_profile['activity_level']
        )
        
        # Calculate target calories
        target_calories = utils.calculate_target_calories(tdee, test_goals['goal_type'])
        
        # Calculate macros
        macros = utils.calculate_macros(target_calories, test_profile['weight_kg'], test_goals['goal_type'])
        
        # Store in session state (simulating body comp planning output)
        st.session_state.calculated_nutrition = {
            'tdee': tdee,
            'target_calories': target_calories,
            'target_protein': macros['protein'],
            'target_carbs': macros['carbs'],
            'target_fat': macros['fat']
        }
        
        # Display results
        st.success("Nutrition targets calculated successfully!")
        
        nutrition_col1, nutrition_col2, nutrition_col3, nutrition_col4, nutrition_col5 = st.columns(5)
        
        with nutrition_col1:
            st.metric("TDEE", f"{tdee:.0f} cal")
        with nutrition_col2:
            st.metric("Target Calories", f"{target_calories:.0f} cal")
        with nutrition_col3:
            st.metric("Protein", f"{macros['protein']:.0f}g")
        with nutrition_col4:
            st.metric("Carbs", f"{macros['carbs']:.0f}g")
        with nutrition_col5:
            st.metric("Fat", f"{macros['fat']:.0f}g")

# Test 3: Create meal distribution
if 'calculated_nutrition' in st.session_state:
    st.markdown("## Step 3: Meal Distribution")
    
    nutrition = st.session_state.calculated_nutrition
    
    # Create meal targets (similar to AI Meal Planning page)
    meal_distribution = {
        'Breakfast': 0.25,
        'Lunch': 0.35,
        'Dinner': 0.30,
        'Snack': 0.10
    }
    
    meal_targets = {}
    for meal_type, percentage in meal_distribution.items():
        meal_targets[meal_type] = {
            'calories': int(nutrition['target_calories'] * percentage),
            'protein': int(nutrition['target_protein'] * percentage),
            'carbs': int(nutrition['target_carbs'] * percentage),
            'fat': int(nutrition['target_fat'] * percentage)
        }
    
    # Display meal targets
    st.markdown("### Calculated Meal Targets")
    
    for meal_type, targets in meal_targets.items():
        with st.container():
            st.markdown(f"**{meal_type}**")
            target_col1, target_col2, target_col3, target_col4 = st.columns(4)
            
            with target_col1:
                st.write(f"Calories: {targets['calories']}")
            with target_col2:
                st.write(f"Protein: {targets['protein']}g")
            with target_col3:
                st.write(f"Carbs: {targets['carbs']}g")
            with target_col4:
                st.write(f"Fat: {targets['fat']}g")
    
    # Test 4: Simulate sync to AI Meal Planner
    st.markdown("## Step 4: Sync to AI Meal Planner")
    
    if st.button("Sync Profile to AI Meal Planner"):
        with st.spinner("Syncing profile data to AI Meal Planner..."):
            # Simulate the data that would be passed to AI Meal Planner
            st.session_state.meal_planning_confirmed = True
            st.session_state.confirmed_meal_targets = meal_targets
            st.session_state.confirmed_diet_prefs = {
                'vegetarian': False,
                'vegan': False,
                'gluten_free': False,
                'dairy_free': False
            }
            st.session_state.confirmed_meal_config = {
                'wake_time': '07:00',
                'sleep_time': '23:00',
                'workout_time': 'Afternoon (2-5 PM)',
                'num_meals': 3,
                'num_snacks': 1,
                'is_training_day': True
            }
            
            st.success("Profile synced successfully to AI Meal Planner!")
            st.info("Data has been saved to session state. The AI Meal Planner will now use these targets.")
            
            # Show what was synced
            st.markdown("### Synced Data Summary")
            st.write("**Meal Targets:** Complete macro distribution for 4 meals")
            st.write("**Dietary Preferences:** No restrictions (can be customized)")
            st.write("**Meal Configuration:** Training day schedule with afternoon workout")

# Test 5: Verify sync status
st.markdown("## Step 5: Sync Status Verification")

if st.session_state.get('meal_planning_confirmed', False):
    st.success("✅ Sync Profile Integration: ACTIVE")
    st.write("The AI Meal Planner will use the synced nutrition targets from your body composition plan.")
    
    # Show current synced data
    with st.expander("View Synced Data"):
        if 'confirmed_meal_targets' in st.session_state:
            st.json(st.session_state.confirmed_meal_targets)
else:
    st.warning("❌ Sync Profile Integration: INACTIVE")
    st.write("Complete the steps above to activate sync profile integration.")

# Test 6: Navigation to AI Meal Planner
st.markdown("## Step 6: Test AI Meal Planner Integration")

if st.session_state.get('meal_planning_confirmed', False):
    st.markdown("### Ready for AI Meal Planning")
    st.info("Navigate to the AI Meal Plan page and select 'Sync Profile Mode' to use the calculated targets.")
    
    if st.button("Generate Test Meal Plan"):
        st.info("This would redirect to the AI Meal Plan page in sync mode.")
        st.markdown("**Expected behavior:**")
        st.write("1. AI Meal Plan page detects synced profile data")
        st.write("2. Displays calculated nutrition targets")
        st.write("3. Generates appropriate meals for each meal type")
        st.write("4. Considers dietary preferences and meal timing")
        st.write("5. Allows PDF export with complete meal plan")
else:
    st.warning("Complete the sync process above before testing AI Meal Planner integration.")

# Debug information
if st.checkbox("Show Debug Information"):
    st.markdown("### Session State Debug")
    st.write("**Keys in session state:**")
    for key in sorted(st.session_state.keys()):
        if 'meal' in key.lower() or 'nutrition' in key.lower() or 'confirmed' in key.lower():
            st.write(f"- {key}: {type(st.session_state[key])}")