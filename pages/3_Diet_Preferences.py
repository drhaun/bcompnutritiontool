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

# Create sections for diet preferences
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
            help="Shopping for ingredients and meal components",
            key="grocery_shopping_select"
        )
    
    # Submit button for sourcing preferences
    sourcing_submitted = st.form_submit_button("Update Meal Sourcing Preferences")
    
    if sourcing_submitted:
        st.session_state.diet_preferences.update({
            'meal_delivery_interest': meal_delivery_interest,
            'home_cooking_interest': home_cooking_interest,
            'grocery_shopping_interest': grocery_shopping_interest
        })
        st.success("Meal sourcing preferences updated!")

st.markdown("---")

st.markdown("### 🎯 Meal Planning Preferences")
st.markdown("Configure your meal planning approach for optimal results.")

# Initialize meal planning preferences if not exists
if 'meal_frequency' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['meal_frequency'] = 3
if 'cooking_time_preference' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['cooking_time_preference'] = 'Medium (30-60 min)'
if 'budget_preference' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['budget_preference'] = 'Moderate'
if 'cooking_for' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['cooking_for'] = 'Just myself'
if 'leftovers_preference' not in st.session_state.diet_preferences:
    st.session_state.diet_preferences['leftovers_preference'] = 'Okay with leftovers occasionally'

# Meal planning preferences in form to prevent refresh
with st.form("planning_preferences_form", clear_on_submit=False):
    planning_col1, planning_col2 = st.columns(2)

    with planning_col1:
        meals_per_day = st.selectbox(
            "Preferred number of meals per day",
            options=[2, 3, 4, 5, 6],
            index=[2, 3, 4, 5, 6].index(st.session_state.diet_preferences.get('meal_frequency', 3)),
            help="Choose how many meals you prefer to eat daily",
            key="meals_per_day_select"
        )
        
        cooking_time_preference = st.selectbox(
            "Cooking time preference",
            options=["Quick (under 30 min)", "Medium (30-60 min)", "Long (60+ min)", "No preference"],
            index=["Quick (under 30 min)", "Medium (30-60 min)", "Long (60+ min)", "No preference"].index(
                st.session_state.diet_preferences.get('cooking_time_preference', 'Medium (30-60 min)')
            ),
            help="How much time do you prefer to spend cooking?",
            key="cooking_time_select"
        )

    with planning_col2:
        budget_preference = st.selectbox(
            "Budget preference",
            options=["Budget-friendly", "Moderate", "Premium", "No preference"],
            index=["Budget-friendly", "Moderate", "Premium", "No preference"].index(
                st.session_state.diet_preferences.get('budget_preference', 'Moderate')
            ),
            help="What's your preferred price range for ingredients?",
            key="budget_select"
        )
        
        cooking_for = st.selectbox(
            "Who are you cooking for?",
            options=["Just myself", "Myself + partner (2 people)", "Small family (3-4 people)", "Large family (5+ people)"],
            index=["Just myself", "Myself + partner (2 people)", "Small family (3-4 people)", "Large family (5+ people)"].index(
                st.session_state.diet_preferences.get('cooking_for', 'Just myself')
            ),
            help="This affects portion sizes and meal planning",
            key="cooking_for_select"
        )

    # Leftovers preference
    leftovers_preference = st.radio(
        "How do you feel about leftovers?",
        options=["Love leftovers - helps with meal prep", "Okay with leftovers occasionally", "Prefer fresh meals each time"],
        index=["Love leftovers - helps with meal prep", "Okay with leftovers occasionally", "Prefer fresh meals each time"].index(
            st.session_state.diet_preferences.get('leftovers_preference', 'Okay with leftovers occasionally')
        ),
        help="This affects how we plan your meal variety and portions",
        key="leftovers_radio"
    )
    
    # Submit button for planning preferences
    planning_submitted = st.form_submit_button("Update Meal Planning Preferences")
    
    if planning_submitted:
        st.session_state.diet_preferences.update({
            'meal_frequency': meals_per_day,
            'cooking_time_preference': cooking_time_preference,
            'budget_preference': budget_preference,
            'cooking_for': cooking_for,
            'leftovers_preference': leftovers_preference
        })
        
        # Save to file for persistence
        preferences_file = 'data/diet_preferences.json'
        if not os.path.exists('data'):
            os.makedirs('data')
        with open(preferences_file, 'w') as f:
            json.dump(st.session_state.diet_preferences, f, indent=2)
        
        st.success("Meal planning preferences updated and saved!")

st.markdown("---")

# Create dietary restrictions section
st.markdown("### 🚫 Dietary Restrictions & Allergies")

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
    allergies = [allergy.strip() for allergy in allergies_input.split('\n') if allergy.strip()]

# Food Preferences Section with Select All functionality
st.markdown("### 🍽️ Food Preferences")

# Define all food options
protein_options = [
    "Chicken Breast", "Chicken Thighs", "Turkey", "Lean Beef", "Ground Beef",
    "Pork", "Salmon", "Tuna", "White Fish", "Shrimp", "Eggs", 
    "Greek Yogurt", "Cottage Cheese", "Tofu", "Tempeh", 
    "Beans", "Lentils", "Chickpeas", "Protein Powder"
]

carb_options = [
    "White Rice", "Brown Rice", "Quinoa", "Oats", "Sweet Potatoes",
    "Regular Potatoes", "Pasta", "Whole Wheat Pasta", "Bread", 
    "Whole Grain Bread", "Tortillas", "Fruits", "Cereal", "Corn"
]

fat_options = [
    "Olive Oil", "Coconut Oil", "Avocado", "Almonds", "Walnuts",
    "Peanut Butter", "Almond Butter", "Seeds", "Cheese", 
    "Butter", "Ghee", "Fatty Fish", "Dark Chocolate"
]

vegetable_options = [
    "Broccoli", "Spinach", "Kale", "Bell Peppers", "Carrots",
    "Zucchini", "Cauliflower", "Green Beans", "Asparagus",
    "Brussels Sprouts", "Mushrooms", "Onions", "Tomatoes", "Cucumber"
]

cuisine_options = [
    "American", "Italian", "Mexican", "Asian", "Mediterranean",
    "Indian", "French", "Middle Eastern", "Japanese", "Chinese",
    "Thai", "Greek", "Spanish", "Korean", "Vietnamese"
]

# Initialize food preferences if they don't exist
for category in ['preferred_proteins', 'preferred_carbs', 'preferred_fats', 'preferred_vegetables', 'cuisine_preferences']:
    if category not in st.session_state.diet_preferences:
        st.session_state.diet_preferences[category] = []

# Create tabs for different food categories
pref_tabs = st.tabs(["🥩 Proteins", "🍞 Carbohydrates", "🥑 Fats", "🥬 Vegetables", "🌍 Cuisines"])

with pref_tabs[0]:  # Proteins
    # Select All / Clear All buttons
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Select All Proteins", key="select_all_proteins", use_container_width=True):
            st.session_state.diet_preferences['preferred_proteins'] = protein_options.copy()
            st.success("All proteins selected!")
            st.rerun()
    with col2:
        if st.button("❌ Clear All Proteins", key="clear_all_proteins", use_container_width=True):
            st.session_state.diet_preferences['preferred_proteins'] = []
            st.success("All proteins cleared!")
            st.rerun()
    
    preferred_proteins = st.multiselect(
        "Select your preferred protein sources",
        options=protein_options,
        default=st.session_state.diet_preferences.get('preferred_proteins', []),
        help="Choose proteins you enjoy eating - use buttons above for quick selection",
        key="proteins_multiselect"
    )
    
    # Update session state when user changes selection
    if preferred_proteins != st.session_state.diet_preferences.get('preferred_proteins', []):
        st.session_state.diet_preferences['preferred_proteins'] = preferred_proteins

with pref_tabs[1]:  # Carbs
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Select All Carbs", key="select_all_carbs", use_container_width=True):
            st.session_state.diet_preferences['preferred_carbs'] = carb_options.copy()
            st.success("All carbs selected!")
            st.rerun()
    with col2:
        if st.button("❌ Clear All Carbs", key="clear_all_carbs", use_container_width=True):
            st.session_state.diet_preferences['preferred_carbs'] = []
            st.success("All carbs cleared!")
            st.rerun()
    
    preferred_carbs = st.multiselect(
        "Select your preferred carbohydrate sources",
        options=carb_options,
        default=st.session_state.diet_preferences.get('preferred_carbs', []),
        help="Choose carbs you enjoy eating - use buttons above for quick selection",
        key="carbs_multiselect"
    )
    
    if preferred_carbs != st.session_state.diet_preferences.get('preferred_carbs', []):
        st.session_state.diet_preferences['preferred_carbs'] = preferred_carbs

with pref_tabs[2]:  # Fats
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Select All Fats", key="select_all_fats", use_container_width=True):
            st.session_state.diet_preferences['preferred_fats'] = fat_options.copy()
            st.success("All fats selected!")
            st.rerun()
    with col2:
        if st.button("❌ Clear All Fats", key="clear_all_fats", use_container_width=True):
            st.session_state.diet_preferences['preferred_fats'] = []
            st.success("All fats cleared!")
            st.rerun()
    
    preferred_fats = st.multiselect(
        "Select your preferred fat sources",
        options=fat_options,
        default=st.session_state.diet_preferences.get('preferred_fats', []),
        help="Choose healthy fats you enjoy - use buttons above for quick selection",
        key="fats_multiselect"
    )
    
    if preferred_fats != st.session_state.diet_preferences.get('preferred_fats', []):
        st.session_state.diet_preferences['preferred_fats'] = preferred_fats

with pref_tabs[3]:  # Vegetables
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Select All Vegetables", key="select_all_vegetables", use_container_width=True):
            st.session_state.diet_preferences['preferred_vegetables'] = vegetable_options.copy()
            st.success("All vegetables selected!")
            st.rerun()
    with col2:
        if st.button("❌ Clear All Vegetables", key="clear_all_vegetables", use_container_width=True):
            st.session_state.diet_preferences['preferred_vegetables'] = []
            st.success("All vegetables cleared!")
            st.rerun()
    
    preferred_vegetables = st.multiselect(
        "Select your preferred vegetables",
        options=vegetable_options,
        default=st.session_state.diet_preferences.get('preferred_vegetables', []),
        help="Choose vegetables you enjoy eating - use buttons above for quick selection",
        key="vegetables_multiselect"
    )
    
    if preferred_vegetables != st.session_state.diet_preferences.get('preferred_vegetables', []):
        st.session_state.diet_preferences['preferred_vegetables'] = preferred_vegetables

with pref_tabs[4]:  # Cuisines
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Select All Cuisines", key="select_all_cuisines", use_container_width=True):
            st.session_state.diet_preferences['cuisine_preferences'] = cuisine_options.copy()
            st.success("All cuisines selected!")
            st.rerun()
    with col2:
        if st.button("❌ Clear All Cuisines", key="clear_all_cuisines", use_container_width=True):
            st.session_state.diet_preferences['cuisine_preferences'] = []
            st.success("All cuisines cleared!")
            st.rerun()
    
    cuisine_preferences = st.multiselect(
        "Select your preferred cuisines",
        options=cuisine_options,
        default=st.session_state.diet_preferences.get('cuisine_preferences', []),
        help="Choose cuisines you enjoy - use buttons above for quick selection",
        key="cuisines_multiselect"
    )
    
    if cuisine_preferences != st.session_state.diet_preferences.get('cuisine_preferences', []):
        st.session_state.diet_preferences['cuisine_preferences'] = cuisine_preferences

# Foods to Avoid section
st.markdown("### 🚫 Foods to Avoid")
disliked_foods_input = st.text_area(
    "Foods You Dislike (one per line)",
    value="\n".join(st.session_state.diet_preferences.get('disliked_foods', [])),
    help="List foods you prefer not to eat - these will be avoided in meal planning",
    height=80,
    key="disliked_foods_textarea"
)
disliked_foods = [food.strip() for food in disliked_foods_input.split('\n') if food.strip()]

# Create a simple form for saving preferences
with st.form("diet_preferences_form"):
    # Form submit button
    submitted = st.form_submit_button("Save Diet Preferences", use_container_width=True)
    
    if submitted:
        # Update session state with all diet preference data
        st.session_state.diet_preferences.update({
            'dietary_restrictions': dietary_restrictions,
            'allergies': allergies,
            'preferred_proteins': preferred_proteins,
            'preferred_carbs': preferred_carbs,
            'preferred_fats': preferred_fats,
            'preferred_vegetables': preferred_vegetables,
            'cuisine_preferences': cuisine_preferences,
            'disliked_foods': disliked_foods,
        })
        
        # Save to file
        os.makedirs('data', exist_ok=True)
        try:
            with open(preferences_file, 'w') as f:
                json.dump(st.session_state.diet_preferences, f, indent=2)
            st.success("✅ Diet preferences saved successfully! These will now guide your meal planning.")
            
            # Show summary of saved preferences
            st.markdown("### Your Saved Preferences Summary")
            
            summary_col1, summary_col2 = st.columns(2)
            
            with summary_col1:
                if dietary_restrictions and 'None' not in dietary_restrictions:
                    st.write(f"**Dietary Restrictions:** {', '.join(dietary_restrictions)}")
                if allergies:
                    st.write(f"**Allergies:** {', '.join(allergies)}")
                if preferred_proteins:
                    st.write(f"**Preferred Proteins:** {', '.join(preferred_proteins[:3])}{'...' if len(preferred_proteins) > 3 else ''}")
                if cuisine_preferences:
                    st.write(f"**Cuisines:** {', '.join(cuisine_preferences[:3])}{'...' if len(cuisine_preferences) > 3 else ''}")
                st.write(f"**Meal Delivery:** {st.session_state.diet_preferences.get('meal_delivery_interest', 'Not set')}")
                st.write(f"**Home Cooking:** {st.session_state.diet_preferences.get('home_cooking_interest', 'Not set')}")
            
            with summary_col2:
                st.write(f"**Meals per Day:** {st.session_state.diet_preferences.get('meal_frequency', 'Not set')}")
                st.write(f"**Cooking Time:** {st.session_state.diet_preferences.get('cooking_time_preference', 'Not set')}")
                st.write(f"**Budget:** {st.session_state.diet_preferences.get('budget_preference', 'Not set')}")
                st.write(f"**Cooking For:** {st.session_state.diet_preferences.get('cooking_for', 'Not set')}")
                st.write(f"**Grocery Shopping:** {st.session_state.diet_preferences.get('grocery_shopping_interest', 'Not set')}")
                st.write(f"**Leftovers:** {st.session_state.diet_preferences.get('leftovers_preference', 'Not set')}")
                if disliked_foods:
                    st.write(f"**Foods to Avoid:** {len(disliked_foods)} items")
            
        except Exception as e:
            st.error(f"Error saving preferences: {e}")

# Preferences are now updated through individual form submissions above

# Information section outside the form
st.markdown("---")
st.markdown("### How Your Preferences Are Used")

info_col1, info_col2 = st.columns(2)

with info_col1:
    st.markdown("""
    **AI Meal Planning:**
    - Suggests recipes matching your dietary restrictions
    - Prioritizes your preferred ingredients
    - Avoids allergies and disliked foods
    - Considers your cooking time and budget
    - Adjusts portions based on who you're cooking for
    """)

with info_col2:
    st.markdown("""
    **DIY Meal Planning:**
    - Filters food database by your preferences
    - Highlights compatible foods in green
    - Warns about potential allergens
    - Suggests portion sizes based on meal frequency
    - Plans meals considering your leftovers preference
    """)

# Quick preference checker for safety
if st.session_state.diet_preferences.get('allergies') or st.session_state.diet_preferences.get('dietary_restrictions'):
    st.info("**Safety First**: Your allergies and dietary restrictions are prioritized in all meal suggestions to keep you safe and aligned with your lifestyle.")

st.markdown("---")
st.markdown("**Next Step:** Navigate to **Weekly Schedule** to set up your daily routine and meal timing preferences before proceeding to meal planning.")