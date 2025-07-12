import streamlit as st
import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime, timedelta

# Import custom modules
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import utils

# Set page config
st.set_page_config(
    page_title="Fitomics - Diet Preferences",
    page_icon="🍏",
    layout="wide"
)

# Load existing data
utils.load_data()

# Streamlit UI
st.title("🍏 Diet Preferences")
st.markdown("Customize your nutrition plan by setting your food preferences, dietary restrictions, and eating habits. These preferences will guide both DIY and AI-powered meal planning.")

# Check if user info is set
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

# Initialize diet preferences if not exists
if 'diet_preferences' not in st.session_state:
    st.session_state.diet_preferences = {
        'dietary_restrictions': [],
        'cuisine_preferences': [],
        'preferred_proteins': [],
        'preferred_carbs': [],
        'preferred_fats': [],
        'preferred_vegetables': [],
        'disliked_foods': [],
        'allergies': [],
        'meal_frequency': 3,
        'cooking_time_preference': 'Medium (30-60 min)',
        'budget_preference': 'Moderate'
    }

# Load existing preferences from file if available
preferences_file = 'data/diet_preferences.json'
if os.path.exists(preferences_file):
    try:
        with open(preferences_file, 'r') as f:
            saved_prefs = json.load(f)
            # Update session state with saved preferences
            for key, value in saved_prefs.items():
                st.session_state.diet_preferences[key] = value
    except Exception as e:
        st.error(f"Error loading saved preferences: {e}")

# ==================== SECTION 1: DIETARY RESTRICTIONS & ALLERGIES ====================
st.markdown("### 🚫 Dietary Restrictions & Allergies")
st.markdown("Tell us about any dietary restrictions, food allergies, or health conditions that affect your eating choices.")

# Use form to handle dietary restrictions properly
with st.form("dietary_restrictions_form", clear_on_submit=False):
    col1, col2 = st.columns(2)

    with col1:
        # Dietary restrictions
        restriction_options = [
            "None", "Vegetarian", "Vegan", "Pescatarian", 
            "Gluten-Free", "Dairy-Free", "Keto", "Paleo", 
            "Low-FODMAP", "Low-Sodium", "Diabetic-Friendly"
        ]
        dietary_restrictions = st.multiselect(
            "Dietary Restrictions",
            options=restriction_options,
            default=st.session_state.diet_preferences.get('dietary_restrictions', []),
            help="Select any dietary restrictions you follow",
            key="dietary_restrictions_multi"
        )

    with col2:
        # Allergies - critical for safety
        allergies_input = st.text_area(
            "Food Allergies (one per line)",
            value="\n".join(st.session_state.diet_preferences.get('allergies', [])),
            help="List any food allergies - these will be strictly avoided in meal planning",
            height=100,
            key="allergies_textarea"
        )
    
    # Submit button for dietary restrictions
    dietary_submit = st.form_submit_button("Update Dietary Restrictions & Allergies", type="primary")
    
# Process allergies outside the form
allergies = [allergy.strip() for allergy in allergies_input.split('\n') if allergy.strip()]

# ==================== SECTION 2: FOOD PREFERENCES ====================
st.markdown("### 🍽️ Food Preferences")
st.markdown("Select the foods you enjoy eating. This helps us create meal plans you'll actually want to follow.")

# Define all food options
protein_options = [
    "Chicken Breast", "Chicken Thighs", "Turkey", "Lean Beef", "Ground Beef",
    "Pork", "Salmon", "Tuna", "White Fish", "Shrimp", "Eggs", 
    "Greek Yogurt", "Cottage Cheese", "Tofu", "Tempeh", 
    "Lentils", "Chickpeas", "Black Beans", "Protein Powder"
]

carb_options = [
    "Brown Rice", "White Rice", "Quinoa", "Oats", "Sweet Potato",
    "Regular Potato", "Pasta", "Bread", "Tortillas", "Fruits",
    "Vegetables", "Legumes", "Barley", "Buckwheat"
]

fat_options = [
    "Olive Oil", "Coconut Oil", "Butter", "Avocado", "Nuts",
    "Seeds", "Nut Butters", "Fatty Fish", "Cheese", "Cream"
]

vegetable_options = [
    "Spinach", "Kale", "Broccoli", "Cauliflower", "Carrots",
    "Bell Peppers", "Zucchini", "Cucumber", "Tomatoes", "Onions",
    "Garlic", "Mushrooms", "Asparagus", "Green Beans", "Brussels Sprouts"
]

cuisine_options = [
    "American", "Italian", "Mexican", "Asian", "Mediterranean",
    "Indian", "Thai", "Japanese", "French", "Greek", "Middle Eastern"
]

# Food Preferences with Select All functionality
food_tabs = st.tabs(["🥩 Proteins", "🍞 Carbohydrates", "🥑 Fats", "🥬 Vegetables", "🌍 Cuisines"])

with food_tabs[0]:
    st.write("**Protein Sources**")
    
    # Select All / Clear All buttons for proteins
    protein_col1, protein_col2 = st.columns(2)
    with protein_col1:
        if st.button("✅ Select All Proteins", key="select_all_proteins", use_container_width=True):
            st.session_state.diet_preferences['preferred_proteins'] = protein_options.copy()
    
    with protein_col2:
        if st.button("❌ Clear All Proteins", key="clear_all_proteins", use_container_width=True):
            st.session_state.diet_preferences['preferred_proteins'] = []
    
    # Protein multiselect with unique key and proper state management
    preferred_proteins = st.multiselect(
        "Select preferred proteins",
        options=protein_options,
        default=st.session_state.diet_preferences.get('preferred_proteins', []),
        key="multiselect_proteins",
        help="Choose protein sources you enjoy"
    )
    
    # Update session state when proteins are changed
    st.session_state.diet_preferences['preferred_proteins'] = preferred_proteins

with food_tabs[1]:
    st.write("**Carbohydrate Sources**")
    
    # Select All / Clear All buttons for carbs
    carb_col1, carb_col2 = st.columns(2)
    with carb_col1:
        if st.button("✅ Select All Carbs", key="select_all_carbs", use_container_width=True):
            st.session_state.diet_preferences['preferred_carbs'] = carb_options.copy()
    
    with carb_col2:
        if st.button("❌ Clear All Carbs", key="clear_all_carbs", use_container_width=True):
            st.session_state.diet_preferences['preferred_carbs'] = []
    
    # Carbs multiselect with unique key and proper state management
    preferred_carbs = st.multiselect(
        "Select preferred carbohydrates",
        options=carb_options,
        default=st.session_state.diet_preferences.get('preferred_carbs', []),
        key="multiselect_carbs",
        help="Choose carbohydrate sources you enjoy"
    )
    
    # Update session state when carbs are changed
    st.session_state.diet_preferences['preferred_carbs'] = preferred_carbs

with food_tabs[2]:
    st.write("**Fat Sources**")
    
    # Select All / Clear All buttons for fats
    fat_col1, fat_col2 = st.columns(2)
    with fat_col1:
        if st.button("✅ Select All Fats", key="select_all_fats", use_container_width=True):
            st.session_state.diet_preferences['preferred_fats'] = fat_options.copy()
    
    with fat_col2:
        if st.button("❌ Clear All Fats", key="clear_all_fats", use_container_width=True):
            st.session_state.diet_preferences['preferred_fats'] = []
    
    # Fats multiselect with unique key and proper state management
    preferred_fats = st.multiselect(
        "Select preferred fats",
        options=fat_options,
        default=st.session_state.diet_preferences.get('preferred_fats', []),
        key="multiselect_fats",
        help="Choose fat sources you enjoy"
    )
    
    # Update session state when fats are changed
    st.session_state.diet_preferences['preferred_fats'] = preferred_fats

with food_tabs[3]:
    st.write("**Vegetables**")
    
    # Select All / Clear All buttons for vegetables
    veg_col1, veg_col2 = st.columns(2)
    with veg_col1:
        if st.button("✅ Select All Vegetables", key="select_all_vegetables", use_container_width=True):
            st.session_state.diet_preferences['preferred_vegetables'] = vegetable_options.copy()
    
    with veg_col2:
        if st.button("❌ Clear All Vegetables", key="clear_all_vegetables", use_container_width=True):
            st.session_state.diet_preferences['preferred_vegetables'] = []
    
    # Vegetables multiselect with unique key and proper state management
    preferred_vegetables = st.multiselect(
        "Select preferred vegetables",
        options=vegetable_options,
        default=st.session_state.diet_preferences.get('preferred_vegetables', []),
        key="multiselect_vegetables",
        help="Choose vegetables you enjoy"
    )
    
    # Update session state when vegetables are changed
    st.session_state.diet_preferences['preferred_vegetables'] = preferred_vegetables

with food_tabs[4]:
    st.write("**Cuisine Preferences**")
    
    # Select All / Clear All buttons for cuisines
    cuisine_col1, cuisine_col2 = st.columns(2)
    with cuisine_col1:
        if st.button("✅ Select All Cuisines", key="select_all_cuisines", use_container_width=True):
            st.session_state.diet_preferences['cuisine_preferences'] = cuisine_options.copy()
    
    with cuisine_col2:
        if st.button("❌ Clear All Cuisines", key="clear_all_cuisines", use_container_width=True):
            st.session_state.diet_preferences['cuisine_preferences'] = []
    
    # Cuisines multiselect with unique key and proper state management
    cuisine_preferences = st.multiselect(
        "Select preferred cuisines",
        options=cuisine_options,
        default=st.session_state.diet_preferences.get('cuisine_preferences', []),
        key="multiselect_cuisines",
        help="Choose cuisines you enjoy"
    )
    
    # Update session state when cuisines are changed
    st.session_state.diet_preferences['cuisine_preferences'] = cuisine_preferences

# ==================== SECTION 3: FOODS TO AVOID ====================
st.markdown("### 🚫 Foods to Avoid")
st.markdown("List any foods you dislike or prefer to avoid (separate from allergies).")

# Foods to avoid
disliked_foods_input = st.text_area(
    "Foods to Avoid (one per line)",
    value="\n".join(st.session_state.diet_preferences.get('disliked_foods', [])),
    help="List foods you don't like or prefer to avoid in meal planning",
    height=100,
    key="disliked_foods_textarea"
)
disliked_foods = [food.strip() for food in disliked_foods_input.split('\n') if food.strip()]

# ==================== SECTION 4: SUPPLEMENTATION PREFERENCES ====================
st.markdown("### 💊 Supplementation Preferences")
st.markdown("Tell us about any supplements you take or are interested in for meal planning integration.")

# Initialize supplementation preferences if not exists
if 'supplementation_preferences' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['supplementation_preferences'] = {
        'creatine': 'Not interested',
        'protein_powder': 'Not interested', 
        'pre_workout': 'Not interested',
        'post_workout': 'Not interested',
        'multivitamin': 'Not interested',
        'omega3': 'Not interested',
        'vitamin_d': 'Not interested',
        'other_supplements': []
    }

supp_col1, supp_col2 = st.columns(2)

with supp_col1:
    st.write("**Common Supplements**")
    
    creatine_pref = st.selectbox(
        "Creatine (3-5g daily)",
        ["Not interested", "Already taking", "Interested in starting"],
        index=["Not interested", "Already taking", "Interested in starting"].index(
            st.session_state.diet_preferences['supplementation_preferences'].get('creatine', 'Not interested')
        ),
        key="creatine_pref"
    )
    
    protein_powder_pref = st.selectbox(
        "Protein Powder",
        ["Not interested", "Already taking", "Interested in starting"],
        index=["Not interested", "Already taking", "Interested in starting"].index(
            st.session_state.diet_preferences['supplementation_preferences'].get('protein_powder', 'Not interested')
        ),
        key="protein_powder_pref"
    )
    
    pre_workout_pref = st.selectbox(
        "Pre-Workout",
        ["Not interested", "Already taking", "Interested in starting"],
        index=["Not interested", "Already taking", "Interested in starting"].index(
            st.session_state.diet_preferences['supplementation_preferences'].get('pre_workout', 'Not interested')
        ),
        key="pre_workout_pref"
    )

with supp_col2:
    st.write("**Health Supplements**")
    
    multivitamin_pref = st.selectbox(
        "Multivitamin",
        ["Not interested", "Already taking", "Interested in starting"],
        index=["Not interested", "Already taking", "Interested in starting"].index(
            st.session_state.diet_preferences['supplementation_preferences'].get('multivitamin', 'Not interested')
        ),
        key="multivitamin_pref"
    )
    
    omega3_pref = st.selectbox(
        "Omega-3/Fish Oil",
        ["Not interested", "Already taking", "Interested in starting"],
        index=["Not interested", "Already taking", "Interested in starting"].index(
            st.session_state.diet_preferences['supplementation_preferences'].get('omega3', 'Not interested')
        ),
        key="omega3_pref"
    )
    
    vitamin_d_pref = st.selectbox(
        "Vitamin D",
        ["Not interested", "Already taking", "Interested in starting"],
        index=["Not interested", "Already taking", "Interested in starting"].index(
            st.session_state.diet_preferences['supplementation_preferences'].get('vitamin_d', 'Not interested')
        ),
        key="vitamin_d_pref"
    )

# Other supplements
other_supplements_input = st.text_area(
    "Other Supplements (one per line)",
    value="\n".join(st.session_state.diet_preferences['supplementation_preferences'].get('other_supplements', [])),
    help="List any other supplements you take or are interested in",
    height=80,
    key="other_supplements_textarea"
)
other_supplements = [supp.strip() for supp in other_supplements_input.split('\n') if supp.strip()]

# ==================== SECTION 5: MEAL SOURCING PREFERENCES ====================
st.markdown("### 🍽️ Meal Sourcing Preferences")
st.markdown("Tell us how you prefer to get your meals and groceries.")

# Initialize sourcing preferences if not exists
if 'meal_delivery_interest' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['meal_delivery_interest'] = 'Moderate'
if 'home_cooking_interest' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['home_cooking_interest'] = 'High'
if 'grocery_shopping_interest' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['grocery_shopping_interest'] = 'High'

# Consolidated meal sourcing options - use form to prevent refresh
with st.form("sourcing_preferences_form", clear_on_submit=False):
    sourcing_col1, sourcing_col2, sourcing_col3 = st.columns(3)

    with sourcing_col1:
        st.markdown("**Ready-to-Eat Meal Delivery**")
        meal_delivery_interest = st.selectbox(
            "Interest Level",
            options=["High", "Moderate", "Low", "None"],
            index=["High", "Moderate", "Low", "None"].index(st.session_state.diet_preferences.get('meal_delivery_interest', 'Moderate')),
            help="Services like DoorDash, meal kit subscriptions",
            key="meal_delivery_select"
        )

    with sourcing_col2:
        st.markdown("**Home Cooking/DIY Meal Prep**")
        home_cooking_interest = st.selectbox(
            "Interest Level",
            options=["High", "Moderate", "Low", "None"],
            index=["High", "Moderate", "Low", "None"].index(st.session_state.diet_preferences.get('home_cooking_interest', 'High')),
            help="Preparing meals from scratch at home",
            key="home_cooking_select"
        )

    with sourcing_col3:
        st.markdown("**Grocery Shopping**")
        grocery_shopping_interest = st.selectbox(
            "Interest Level",
            options=["High", "Moderate", "Low", "None"],
            index=["High", "Moderate", "Low", "None"].index(st.session_state.diet_preferences.get('grocery_shopping_interest', 'High')),
            help="Shopping for ingredients to cook at home",
            key="grocery_shopping_select"
        )

    # Submit button for sourcing preferences
    sourcing_submit = st.form_submit_button("Update Sourcing Preferences", type="primary")



# ==================== SAVE PREFERENCES ====================
# Save preferences to session state
st.session_state.diet_preferences.update({
    'dietary_restrictions': dietary_restrictions,
    'allergies': allergies,
    'preferred_proteins': preferred_proteins,
    'preferred_carbs': preferred_carbs,
    'preferred_fats': preferred_fats,
    'preferred_vegetables': preferred_vegetables,
    'cuisine_preferences': cuisine_preferences,
    'disliked_foods': disliked_foods,
    'supplementation_preferences': {
        'creatine': creatine_pref,
        'protein_powder': protein_powder_pref,
        'pre_workout': pre_workout_pref,
        'multivitamin': multivitamin_pref,
        'omega3': omega3_pref,
        'vitamin_d': vitamin_d_pref,
        'other_supplements': other_supplements
    }
})

# Update dietary restrictions if form was submitted
if dietary_submit:
    st.session_state.diet_preferences.update({
        'dietary_restrictions': dietary_restrictions,
        'allergies': allergies
    })

# Update sourcing preferences if form was submitted
if sourcing_submit:
    st.session_state.diet_preferences.update({
        'meal_delivery_interest': meal_delivery_interest,
        'home_cooking_interest': home_cooking_interest,
        'grocery_shopping_interest': grocery_shopping_interest
    })



# ==================== HOW PREFERENCES ARE USED ====================
st.markdown("### How Your Preferences Are Used")
st.markdown("""
**In AI Meal Planning:**
- Dietary restrictions and allergies are strictly enforced
- Preferred foods are prioritized in meal suggestions
- Cooking time preferences guide recipe complexity
- Cuisine preferences influence meal variety

**In DIY Meal Planning:**
- Food preferences filter available ingredient options
- Meal frequency guides daily meal structure
- Sourcing preferences help with grocery planning

**Safety Note:** Food allergies are treated as absolute restrictions and will never be included in meal plans.
""")

# Save all preferences to file
st.markdown("---")
if st.button("💾 Save All Preferences", type="primary", use_container_width=True):
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    # Save to file
    try:
        with open(preferences_file, 'w') as f:
            json.dump(st.session_state.diet_preferences, f, indent=2)
        st.success("✅ Diet preferences saved successfully!")
        st.balloons()
    except Exception as e:
        st.error(f"Error saving preferences: {e}")

# Display current preferences summary
st.markdown("---")
st.markdown("### 📊 Complete User Profile Summary")
st.markdown("This comprehensive summary will be used to inform your AI meal planning and nutrition recommendations.")

# Create comprehensive profile summary
profile_col1, profile_col2 = st.columns(2)

with profile_col1:
    st.markdown("#### 👤 Personal Information")
    user_info = st.session_state.get('user_info', {})
    if user_info:
        st.write(f"**Name:** {user_info.get('name', 'Not set')}")
        st.write(f"**Gender:** {user_info.get('gender', 'Not set')}")
        st.write(f"**Age:** {user_info.get('age', 'Not set')} years")
        if user_info.get('use_imperial', True):
            st.write(f"**Height:** {user_info.get('height_ft', 'Not set')}'{user_info.get('height_in', 'Not set')}\"")
            st.write(f"**Weight:** {user_info.get('weight_lbs', 'Not set')} lbs")
        else:
            st.write(f"**Height:** {user_info.get('height_cm', 'Not set')} cm")
            st.write(f"**Weight:** {user_info.get('weight_kg', 'Not set')} kg")
        st.write(f"**Body Fat:** {user_info.get('body_fat_percentage', 'Not set')}%")
        st.write(f"**Activity Level:** {user_info.get('activity_level', 'Not set')}")
        st.write(f"**Workout Frequency:** {user_info.get('workout_frequency', 'Not set')}/week")
    else:
        st.warning("Complete Initial Setup to see personal information")

    st.markdown("#### 🎯 Body Composition Goals")
    goal_info = st.session_state.get('goal_info', {})
    if goal_info and st.session_state.get('targets_set', False):
        st.write(f"**Goal Type:** {goal_info.get('goal_type', 'Not set')}")
        st.write(f"**Target Weight:** {goal_info.get('target_weight_lbs', 'Not set')} lbs")
        st.write(f"**Target Body Fat:** {goal_info.get('target_body_fat', 'Not set'):.1f}%")
        st.write(f"**Target Fat Mass:** {goal_info.get('target_fat_mass_lbs', 'Not set')} lbs")
        st.write(f"**Target FFM:** {goal_info.get('target_ffm_lbs', 'Not set')} lbs")
        st.write(f"**Timeline:** {goal_info.get('timeline_weeks', 'Not set')} weeks")
    else:
        st.warning("Complete Body Composition Goals to see targets")

with profile_col2:
    st.markdown("#### 🍽️ Diet Preferences")
    diet_prefs = st.session_state.get('diet_preferences', {})
    
    # Dietary restrictions and allergies
    restrictions = diet_prefs.get('dietary_restrictions', [])
    allergies = diet_prefs.get('allergies', [])
    st.write(f"**Dietary Restrictions:** {', '.join(restrictions) if restrictions else 'None'}")
    st.write(f"**Allergies:** {', '.join(allergies) if allergies else 'None'}")
    
    # Food preferences
    proteins = diet_prefs.get('preferred_proteins', [])
    carbs = diet_prefs.get('preferred_carbs', [])
    fats = diet_prefs.get('preferred_fats', [])
    vegetables = diet_prefs.get('preferred_vegetables', [])
    cuisines = diet_prefs.get('cuisine_preferences', [])
    
    st.write(f"**Preferred Proteins:** {len(proteins)} selected")
    if proteins:
        st.caption(f"*{', '.join(proteins[:3])}{'...' if len(proteins) > 3 else ''}*")
    
    st.write(f"**Preferred Carbs:** {len(carbs)} selected")
    if carbs:
        st.caption(f"*{', '.join(carbs[:3])}{'...' if len(carbs) > 3 else ''}*")
    
    st.write(f"**Preferred Fats:** {len(fats)} selected")
    if fats:
        st.caption(f"*{', '.join(fats[:3])}{'...' if len(fats) > 3 else ''}*")
    
    st.write(f"**Preferred Vegetables:** {len(vegetables)} selected")
    if vegetables:
        st.caption(f"*{', '.join(vegetables[:3])}{'...' if len(vegetables) > 3 else ''}*")
    
    st.write(f"**Cuisine Preferences:** {len(cuisines)} selected")
    if cuisines:
        st.caption(f"*{', '.join(cuisines[:3])}{'...' if len(cuisines) > 3 else ''}*")
    
    # Foods to avoid
    disliked = diet_prefs.get('disliked_foods', [])
    st.write(f"**Foods to Avoid:** {len(disliked)} listed")
    if disliked:
        st.caption(f"*{', '.join(disliked[:3])}{'...' if len(disliked) > 3 else ''}*")
    
    # Meal sourcing preferences
    st.markdown("#### 🛒 Meal Sourcing Preferences")
    meal_delivery = diet_prefs.get('meal_delivery_interest', 'Not set')
    home_cooking = diet_prefs.get('home_cooking_interest', 'Not set')
    grocery_shopping = diet_prefs.get('grocery_shopping_interest', 'Not set')
    
    st.write(f"**Meal Delivery:** {meal_delivery}")
    st.write(f"**Home Cooking:** {home_cooking}")
    st.write(f"**Grocery Shopping:** {grocery_shopping}")
    
    # Cooking preferences
    cooking_time = diet_prefs.get('cooking_time_preference', 'Not set')
    budget = diet_prefs.get('budget_preference', 'Not set')
    st.write(f"**Cooking Time:** {cooking_time}")
    st.write(f"**Budget:** {budget}")

# Show nutrition targets if available
st.markdown("#### 📈 Nutrition Targets")
nutrition_targets = st.session_state.get('final_nutrition_targets', {})
if nutrition_targets:
    target_col1, target_col2, target_col3, target_col4 = st.columns(4)
    with target_col1:
        st.metric("Calories", f"{nutrition_targets.get('calories', 'Not set'):,}")
    with target_col2:
        st.metric("Protein", f"{nutrition_targets.get('protein', 'Not set')}g")
    with target_col3:
        st.metric("Carbs", f"{nutrition_targets.get('carbs', 'Not set')}g")
    with target_col4:
        st.metric("Fat", f"{nutrition_targets.get('fat', 'Not set')}g")
else:
    st.warning("Complete Nutrition Targets to see daily macro goals")

# Show weekly schedule summary if available
st.markdown("#### 📅 Weekly Schedule")
weekly_schedule = st.session_state.get('confirmed_weekly_schedule', {})
if weekly_schedule:
    st.success("Weekly schedule configured - ready for AI meal planning")
    # Show brief schedule summary
    total_workouts = sum(len(day.get('workouts', [])) for day in weekly_schedule.values())
    st.write(f"**Total Weekly Workouts:** {total_workouts}")
    
    # Show day-specific nutrition if available
    day_nutrition = st.session_state.get('day_specific_nutrition', {})
    if day_nutrition:
        st.write("**Day-Specific Nutrition:** Configured")
        avg_calories = sum(day.get('calories', 0) for day in day_nutrition.values()) / len(day_nutrition)
        st.write(f"**Average Daily Calories:** {avg_calories:,.0f}")
else:
    st.warning("Complete Weekly Schedule for personalized meal timing")

st.markdown("---")
st.info("💡 This complete profile will be used to create personalized AI meal plans that match your goals, preferences, and schedule.")

# Detailed expandable section for full preferences
with st.expander("🔍 Detailed Preferences Breakdown"):
    st.markdown("#### Complete Food Preferences")
    
    detail_col1, detail_col2 = st.columns(2)
    
    with detail_col1:
        st.write("**Preferred Proteins:**")
        if proteins:
            for protein in proteins:
                st.write(f"• {protein}")
        else:
            st.write("*None selected*")
        
        st.write("**Preferred Carbohydrates:**")
        if carbs:
            for carb in carbs:
                st.write(f"• {carb}")
        else:
            st.write("*None selected*")
        
        st.write("**Preferred Fats:**")
        if fats:
            for fat in fats:
                st.write(f"• {fat}")
        else:
            st.write("*None selected*")
    
    with detail_col2:
        st.write("**Preferred Vegetables:**")
        if vegetables:
            for vegetable in vegetables:
                st.write(f"• {vegetable}")
        else:
            st.write("*None selected*")
        
        st.write("**Cuisine Preferences:**")
        if cuisines:
            for cuisine in cuisines:
                st.write(f"• {cuisine}")
        else:
            st.write("*None selected*")
        
        st.write("**Foods to Avoid:**")
        if disliked:
            for food in disliked:
                st.write(f"• {food}")
        else:
            st.write("*None listed*")