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

# Create a streamlined form for diet preferences
with st.form("diet_preferences_form"):
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
            help="Select any dietary restrictions you follow"
        )
    
    with col2:
        # Allergies - critical for safety
        allergies_input = st.text_area(
            "Food Allergies (one per line)",
            value="\n".join(st.session_state.diet_preferences.get('allergies', [])),
            help="List any food allergies - these will be strictly avoided in meal planning",
            height=100
        )
        allergies = [allergy.strip() for allergy in allergies_input.split('\n') if allergy.strip()]
    
    st.markdown("### 🍽️ Food Preferences")
    
    # Create tabs for different food categories
    pref_tabs = st.tabs(["🥩 Proteins", "🍞 Carbohydrates", "🥑 Fats", "🥬 Vegetables", "🌍 Cuisines"])
    
    with pref_tabs[0]:  # Proteins
        protein_options = [
            "Chicken Breast", "Chicken Thighs", "Turkey", "Lean Beef", "Ground Beef",
            "Pork", "Salmon", "Tuna", "White Fish", "Shrimp", "Eggs", 
            "Greek Yogurt", "Cottage Cheese", "Tofu", "Tempeh", 
            "Beans", "Lentils", "Chickpeas", "Protein Powder"
        ]
        preferred_proteins = st.multiselect(
            "Select your preferred protein sources",
            options=protein_options,
            default=st.session_state.diet_preferences.get('preferred_proteins', []),
            help="Choose proteins you enjoy eating"
        )
    
    with pref_tabs[1]:  # Carbs
        carb_options = [
            "White Rice", "Brown Rice", "Quinoa", "Oats", "Sweet Potatoes",
            "Regular Potatoes", "Pasta", "Whole Wheat Pasta", "Bread", 
            "Whole Grain Bread", "Tortillas", "Fruits", "Cereal", "Corn"
        ]
        preferred_carbs = st.multiselect(
            "Select your preferred carbohydrate sources",
            options=carb_options,
            default=st.session_state.diet_preferences.get('preferred_carbs', []),
            help="Choose carbs you enjoy eating"
        )
    
    with pref_tabs[2]:  # Fats
        fat_options = [
            "Olive Oil", "Coconut Oil", "Avocado", "Almonds", "Walnuts",
            "Peanut Butter", "Almond Butter", "Seeds", "Cheese", 
            "Butter", "Ghee", "Fatty Fish", "Dark Chocolate"
        ]
        preferred_fats = st.multiselect(
            "Select your preferred fat sources",
            options=fat_options,
            default=st.session_state.diet_preferences.get('preferred_fats', []),
            help="Choose healthy fats you enjoy"
        )
    
    with pref_tabs[3]:  # Vegetables
        vegetable_options = [
            "Broccoli", "Spinach", "Kale", "Bell Peppers", "Carrots",
            "Zucchini", "Cauliflower", "Green Beans", "Asparagus",
            "Brussels Sprouts", "Mushrooms", "Onions", "Tomatoes", "Cucumber"
        ]
        preferred_vegetables = st.multiselect(
            "Select your preferred vegetables",
            options=vegetable_options,
            default=st.session_state.diet_preferences.get('preferred_vegetables', []),
            help="Choose vegetables you enjoy eating"
        )
    
    with pref_tabs[4]:  # Cuisines
        cuisine_options = [
            "American", "Italian", "Mexican", "Asian", "Mediterranean",
            "Indian", "French", "Middle Eastern", "Japanese", "Chinese",
            "Thai", "Greek", "Spanish", "Korean", "Vietnamese"
        ]
        cuisine_preferences = st.multiselect(
            "Select your preferred cuisines",
            options=cuisine_options,
            default=st.session_state.diet_preferences.get('cuisine_preferences', []),
            help="Choose cuisines you enjoy"
        )
    
    st.markdown("### 🚫 Foods to Avoid")
    disliked_foods_input = st.text_area(
        "Foods You Dislike (one per line)",
        value="\n".join(st.session_state.diet_preferences.get('disliked_foods', [])),
        help="List foods you prefer not to eat - these will be avoided in meal planning",
        height=80
    )
    disliked_foods = [food.strip() for food in disliked_foods_input.split('\n') if food.strip()]
    
    st.markdown("### ⚙️ Meal Planning Preferences")
    
    meal_col1, meal_col2, meal_col3 = st.columns(3)
    
    with meal_col1:
        meal_frequency = st.selectbox(
            "Preferred Number of Meals per Day",
            options=[2, 3, 4, 5, 6],
            index=[2, 3, 4, 5, 6].index(st.session_state.diet_preferences.get('meal_frequency', 3)),
            help="How many meals do you prefer to eat per day?"
        )
    
    with meal_col2:
        cooking_time_preference = st.selectbox(
            "Cooking Time Preference",
            options=["Quick (15-30 min)", "Medium (30-60 min)", "Long (60+ min)"],
            index=["Quick (15-30 min)", "Medium (30-60 min)", "Long (60+ min)"].index(
                st.session_state.diet_preferences.get('cooking_time_preference', 'Medium (30-60 min)')
            ),
            help="How much time do you want to spend cooking?"
        )
    
    with meal_col3:
        budget_preference = st.selectbox(
            "Budget Preference",
            options=["Budget-Friendly", "Moderate", "Premium"],
            index=["Budget-Friendly", "Moderate", "Premium"].index(
                st.session_state.diet_preferences.get('budget_preference', 'Moderate')
            ),
            help="What's your preferred food budget level?"
        )
    
    # Submit button
    submitted = st.form_submit_button("💾 Save Diet Preferences", use_container_width=True)
    
    if submitted:
        # Update session state with form data
        st.session_state.diet_preferences.update({
            'dietary_restrictions': dietary_restrictions,
            'allergies': allergies,
            'preferred_proteins': preferred_proteins,
            'preferred_carbs': preferred_carbs,
            'preferred_fats': preferred_fats,
            'preferred_vegetables': preferred_vegetables,
            'cuisine_preferences': cuisine_preferences,
            'disliked_foods': disliked_foods,
            'meal_frequency': meal_frequency,
            'cooking_time_preference': cooking_time_preference,
            'budget_preference': budget_preference
        })
        
        # Save to file
        os.makedirs('data', exist_ok=True)
        try:
            with open(preferences_file, 'w') as f:
                json.dump(st.session_state.diet_preferences, f, indent=2)
            st.success("✅ Diet preferences saved successfully! These will now guide your meal planning.")
            
            # Show summary of saved preferences
            st.markdown("### 📋 Your Saved Preferences Summary")
            
            summary_col1, summary_col2 = st.columns(2)
            
            with summary_col1:
                if dietary_restrictions and 'None' not in dietary_restrictions:
                    st.write(f"**Dietary Restrictions:** {', '.join(dietary_restrictions)}")
                if allergies:
                    st.write(f"**🚨 Allergies:** {', '.join(allergies)}")
                if preferred_proteins:
                    st.write(f"**Preferred Proteins:** {', '.join(preferred_proteins[:3])}{'...' if len(preferred_proteins) > 3 else ''}")
                if cuisine_preferences:
                    st.write(f"**Cuisines:** {', '.join(cuisine_preferences[:3])}{'...' if len(cuisine_preferences) > 3 else ''}")
            
            with summary_col2:
                st.write(f"**Meals per Day:** {meal_frequency}")
                st.write(f"**Cooking Time:** {cooking_time_preference}")
                st.write(f"**Budget:** {budget_preference}")
                if disliked_foods:
                    st.write(f"**Foods to Avoid:** {len(disliked_foods)} items")
            
        except Exception as e:
            st.error(f"Error saving preferences: {e}")

# Information section outside the form
st.markdown("---")
st.markdown("### ℹ️ How Your Preferences Are Used")

info_col1, info_col2 = st.columns(2)

with info_col1:
    st.markdown("""
    **🤖 AI Meal Planning:**
    - Suggests recipes matching your dietary restrictions
    - Prioritizes your preferred ingredients
    - Avoids allergies and disliked foods
    - Considers your cooking time and budget
    """)

with info_col2:
    st.markdown("""
    **🛠️ DIY Meal Planning:**
    - Filters food database by your preferences
    - Highlights compatible foods in green
    - Warns about potential allergens
    - Suggests portion sizes based on meal frequency
    """)

# Quick preference checker
if st.session_state.diet_preferences.get('allergies') or st.session_state.diet_preferences.get('dietary_restrictions'):
    st.info("💡 **Safety First**: Your allergies and dietary restrictions are prioritized in all meal suggestions to keep you safe and aligned with your lifestyle.")

st.markdown("---")
st.markdown("👈 Use the sidebar to navigate to **DIY Meal Planning** or **AI Meal Planning** to see your preferences in action!")