import streamlit as st
import pandas as pd
import json
import sys
import os
import random
from datetime import datetime, date

# Import recipe database functionality
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
from recipe_database import get_recipe_database, display_recipe_card, load_sample_recipes
import utils

st.set_page_config(page_title="AI Meal Planner", page_icon="🤖", layout="wide")

st.title("🤖 AI Meal Planner")
st.markdown("Get personalized meal suggestions based on your preferences and nutrition targets")

# Check if user has completed previous steps
if not st.session_state.get('user_info') or not st.session_state.get('diet_preferences'):
    st.warning("Please complete Initial Setup and Diet Preferences first!")
    st.stop()

# Load user data
user_info = st.session_state.user_info
diet_prefs = st.session_state.diet_preferences
use_imperial = user_info.get('use_imperial', True)

# Get nutrition targets from Weekly Schedule or calculate defaults
if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
    # Use targets from Weekly Schedule page
    today = datetime.now().strftime('%A')
    day_data = st.session_state.day_specific_nutrition.get(today, {})
    target_calories = day_data.get('calories', 2000)
    target_protein = day_data.get('protein', 150)
    target_carbs = day_data.get('carbs', 200)
    target_fat = day_data.get('fat', 70)
else:
    # Calculate default targets
    weight_kg = user_info.get('weight_kg', 75)
    goal_type = user_info.get('goal_focus', 'maintain')
    
    if 'lose' in goal_type.lower():
        target_calories = int(user_info.get('tdee', 2000) * 0.85)  # 15% deficit
        target_protein = int(weight_kg * 2.0)
        target_fat = int(weight_kg * 0.8)
    elif 'build' in goal_type.lower() or 'gain' in goal_type.lower():
        target_calories = int(user_info.get('tdee', 2000) * 1.1)  # 10% surplus
        target_protein = int(weight_kg * 1.8)
        target_fat = int(weight_kg * 1.0)
    else:
        target_calories = int(user_info.get('tdee', 2000))
        target_protein = int(weight_kg * 1.6)
        target_fat = int(weight_kg * 0.9)
    
    remaining_calories = target_calories - (target_protein * 4) - (target_fat * 9)
    target_carbs = max(0, int(remaining_calories / 4))

# Get meal frequency from diet preferences
meal_frequency = diet_prefs.get('meal_frequency', 3)

# Display daily targets
st.subheader("📊 Your Daily Nutrition Targets")
target_cols = st.columns(4)
with target_cols[0]:
    st.metric("Calories", f"{target_calories} kcal")
with target_cols[1]:
    st.metric("Protein", f"{target_protein}g")
with target_cols[2]:
    st.metric("Carbs", f"{target_carbs}g")
with target_cols[3]:
    st.metric("Fat", f"{target_fat}g")

st.markdown("---")

# Initialize meal plan for today
if 'ai_meal_plan' not in st.session_state:
    st.session_state.ai_meal_plan = {}

if 'current_meal_date' not in st.session_state:
    st.session_state.current_meal_date = date.today().isoformat()

# Date selector
selected_date = st.date_input("Plan meals for:", value=date.today())
date_key = selected_date.isoformat()

if date_key not in st.session_state.ai_meal_plan:
    st.session_state.ai_meal_plan[date_key] = {
        'meals': {},
        'generated': False
    }

# Function to get meal names based on frequency
def get_meal_names(frequency):
    if frequency == 2:
        return ["Breakfast", "Dinner"]
    elif frequency == 3:
        return ["Breakfast", "Lunch", "Dinner"]
    elif frequency == 4:
        return ["Breakfast", "Lunch", "Snack", "Dinner"]
    elif frequency == 5:
        return ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"]
    elif frequency == 6:
        return ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"]
    else:
        return ["Breakfast", "Lunch", "Dinner"]

meal_names = get_meal_names(meal_frequency)

# Function to distribute calories across meals
def distribute_calories(total_calories, meal_count):
    if meal_count == 2:
        return [int(total_calories * 0.4), int(total_calories * 0.6)]  # Breakfast, Dinner
    elif meal_count == 3:
        return [int(total_calories * 0.25), int(total_calories * 0.40), int(total_calories * 0.35)]  # B, L, D
    elif meal_count == 4:
        return [int(total_calories * 0.25), int(total_calories * 0.35), int(total_calories * 0.15), int(total_calories * 0.25)]  # B, L, S, D
    elif meal_count == 5:
        return [int(total_calories * 0.20), int(total_calories * 0.15), int(total_calories * 0.30), int(total_calories * 0.15), int(total_calories * 0.20)]
    elif meal_count == 6:
        return [int(total_calories * 0.20), int(total_calories * 0.10), int(total_calories * 0.30), int(total_calories * 0.10), int(total_calories * 0.25), int(total_calories * 0.05)]
    else:
        # Default to 3 meals
        per_meal = total_calories // meal_count
        return [per_meal] * meal_count

# Get calorie distribution
calorie_distribution = distribute_calories(target_calories, len(meal_names))

# Function to suggest recipes based on meal type and calories
def suggest_recipes_for_meal(meal_name, target_cal, preferred_proteins=None, cuisine_prefs=None):
    recipe_db = get_recipe_database()
    
    # Load sample recipes if database is empty
    if not recipe_db.recipes:
        load_sample_recipes()
        recipe_db = get_recipe_database()
    
    suitable_recipes = []
    
    for recipe_id, recipe in recipe_db.recipes.items():
        recipe_title = recipe.get('title', '').lower()
        recipe_category = recipe.get('category', '').lower()
        
        # Filter by meal type
        meal_match = False
        if meal_name.lower() == 'breakfast':
            meal_match = any(word in recipe_title or word in recipe_category 
                           for word in ['breakfast', 'pancake', 'oatmeal', 'cereal', 'egg', 'toast', 'smoothie'])
        elif meal_name.lower() == 'lunch':
            meal_match = any(word in recipe_title or word in recipe_category 
                           for word in ['salad', 'sandwich', 'soup', 'bowl', 'wrap', 'grain'])
        elif meal_name.lower() == 'dinner':
            meal_match = any(word in recipe_title or word in recipe_category 
                           for word in ['chicken', 'beef', 'fish', 'pasta', 'rice', 'stir', 'roast'])
        elif 'snack' in meal_name.lower():
            meal_match = any(word in recipe_title or word in recipe_category 
                           for word in ['bar', 'nuts', 'fruit', 'yogurt', 'smoothie', 'trail'])
        else:
            meal_match = True  # Accept any recipe for unspecified meal types
        
        # Check preferred proteins if specified
        protein_match = True
        if preferred_proteins:
            protein_match = any(protein.lower() in recipe_title 
                              for protein in preferred_proteins)
        
        # Estimate if recipe fits calorie target (within 50% range)
        estimated_calories = recipe.get('estimated_calories', target_cal)
        calorie_match = (target_cal * 0.5) <= estimated_calories <= (target_cal * 1.5)
        
        if meal_match and protein_match and calorie_match:
            suitable_recipes.append(recipe)
    
    # Return up to 3 random suitable recipes
    if suitable_recipes:
        return random.sample(suitable_recipes, min(3, len(suitable_recipes)))
    else:
        # Fallback: return any 3 recipes
        all_recipes = list(recipe_db.recipes.values())
        return random.sample(all_recipes, min(3, len(all_recipes))) if all_recipes else []

# Auto-generate meal plan button
if st.button("🎯 Generate Smart Meal Plan", type="primary", use_container_width=True):
    preferred_proteins = diet_prefs.get('preferred_proteins', [])
    cuisine_prefs = diet_prefs.get('cuisine_preferences', [])
    
    meal_plan = {}
    for i, meal_name in enumerate(meal_names):
        target_cal = calorie_distribution[i]
        suggested_recipes = suggest_recipes_for_meal(meal_name, target_cal, preferred_proteins, cuisine_prefs)
        
        if suggested_recipes:
            # Choose the first suggested recipe
            chosen_recipe = suggested_recipes[0]
            
            # Calculate portion size to hit target calories
            recipe_calories = chosen_recipe.get('estimated_calories', target_cal)
            portion_multiplier = target_cal / recipe_calories if recipe_calories > 0 else 1.0
            portion_multiplier = max(0.25, min(3.0, portion_multiplier))  # Keep reasonable portion sizes
            
            meal_plan[meal_name] = {
                'recipe': chosen_recipe,
                'portion': portion_multiplier,
                'target_calories': target_cal,
                'alternatives': suggested_recipes[1:] if len(suggested_recipes) > 1 else []
            }
    
    st.session_state.ai_meal_plan[date_key]['meals'] = meal_plan
    st.session_state.ai_meal_plan[date_key]['generated'] = True
    st.success("✨ Smart meal plan generated based on your preferences!")
    st.rerun()

# Display meal plan
if st.session_state.ai_meal_plan[date_key].get('generated', False):
    st.subheader(f"🍽️ Your Meal Plan for {selected_date.strftime('%B %d, %Y')}")
    
    total_planned_calories = 0
    total_planned_protein = 0
    total_planned_carbs = 0
    total_planned_fat = 0
    
    # Create grocery list tracking
    grocery_items = []
    
    for meal_name in meal_names:
        meal_data = st.session_state.ai_meal_plan[date_key]['meals'].get(meal_name)
        
        if meal_data:
            recipe = meal_data['recipe']
            portion = meal_data['portion']
            target_cal = meal_data['target_calories']
            
            with st.expander(f"🍴 {meal_name} - Target: {target_cal} calories", expanded=True):
                col1, col2 = st.columns([2, 1])
                
                with col1:
                    st.markdown(f"**{recipe.get('title', 'Unknown Recipe')}**")
                    st.markdown(f"*Portion: {portion:.1f}x serving*")
                    
                    # Display estimated nutrition
                    est_calories = int(recipe.get('estimated_calories', 0) * portion)
                    est_protein = int(recipe.get('estimated_protein', 0) * portion)
                    est_carbs = int(recipe.get('estimated_carbs', 0) * portion)
                    est_fat = int(recipe.get('estimated_fat', 0) * portion)
                    
                    total_planned_calories += est_calories
                    total_planned_protein += est_protein
                    total_planned_carbs += est_carbs
                    total_planned_fat += est_fat
                    
                    nutrition_cols = st.columns(4)
                    with nutrition_cols[0]:
                        st.metric("Calories", f"{est_calories}")
                    with nutrition_cols[1]:
                        st.metric("Protein", f"{est_protein}g")
                    with nutrition_cols[2]:
                        st.metric("Carbs", f"{est_carbs}g")
                    with nutrition_cols[3]:
                        st.metric("Fat", f"{est_fat}g")
                    
                    # Add ingredients to grocery list
                    ingredients = recipe.get('ingredients', [])
                    if ingredients:
                        st.markdown("**Ingredients needed:**")
                        for ingredient in ingredients[:5]:  # Show first 5 ingredients
                            grocery_items.append(f"{ingredient} (for {meal_name})")
                            st.markdown(f"• {ingredient}")
                        if len(ingredients) > 5:
                            st.markdown(f"*... and {len(ingredients) - 5} more ingredients*")
                
                with col2:
                    # Alternative recipes
                    alternatives = meal_data.get('alternatives', [])
                    if alternatives:
                        st.markdown("**Alternatives:**")
                        for alt in alternatives:
                            if st.button(f"Switch to {alt.get('title', 'Recipe')[:20]}...", 
                                       key=f"alt_{meal_name}_{alt.get('id', 'unknown')}"):
                                # Switch to alternative recipe
                                st.session_state.ai_meal_plan[date_key]['meals'][meal_name]['recipe'] = alt
                                st.rerun()
    
    # Summary
    st.markdown("---")
    st.subheader("📈 Daily Summary")
    summary_cols = st.columns(4)
    
    with summary_cols[0]:
        diff_cal = total_planned_calories - target_calories
        st.metric("Total Calories", f"{total_planned_calories}", f"{diff_cal:+d}")
    with summary_cols[1]:
        diff_protein = total_planned_protein - target_protein
        st.metric("Total Protein", f"{total_planned_protein}g", f"{diff_protein:+d}g")
    with summary_cols[2]:
        diff_carbs = total_planned_carbs - target_carbs
        st.metric("Total Carbs", f"{total_planned_carbs}g", f"{diff_carbs:+d}g")
    with summary_cols[3]:
        diff_fat = total_planned_fat - target_fat
        st.metric("Total Fat", f"{total_planned_fat}g", f"{diff_fat:+d}g")
    
    # Grocery List
    st.markdown("---")
    st.subheader("🛒 Grocery List")
    
    if grocery_items:
        # Remove duplicates and organize
        unique_items = list(set(item.split(' (for ')[0] for item in grocery_items))
        
        col1, col2 = st.columns([2, 1])
        with col1:
            for item in unique_items[:10]:  # Show first 10 items
                st.markdown(f"• {item}")
            if len(unique_items) > 10:
                st.markdown(f"*... and {len(unique_items) - 10} more items*")
        
        with col2:
            # Export options
            grocery_text = "\n".join([f"• {item}" for item in unique_items])
            st.download_button(
                "📄 Download Grocery List",
                grocery_text,
                file_name=f"grocery_list_{selected_date.isoformat()}.txt",
                mime="text/plain"
            )
            
            st.markdown("**Quick Actions:**")
            st.info("🛍️ Copy this list to your favorite grocery app or service")
    
    # Meal prep instructions
    with st.expander("👨‍🍳 Meal Prep Tips", expanded=False):
        st.markdown("""
        **Smart Meal Prep Strategy:**
        
        1. **Batch Cook Proteins**: Prepare all proteins at once (grilled chicken, cooked beans, etc.)
        2. **Prep Vegetables**: Wash, chop, and store vegetables for the week
        3. **Cook Grains**: Prepare large batches of rice, quinoa, or other grains
        4. **Portion Control**: Use containers to pre-portion meals according to your plan
        5. **Storage**: Most prepped meals stay fresh for 3-4 days in the refrigerator
        
        **Time-Saving Tips:**
        - Use a slow cooker or instant pot for hands-off cooking
        - Pre-cut vegetables on weekends
        - Cook double portions and freeze half for later
        """)

else:
    st.info("👆 Click 'Generate Smart Meal Plan' to get personalized meal suggestions based on your preferences and nutrition targets!")
    
    # Show preview of what the planner will consider
    with st.expander("🔍 What the AI considers for your meal plan", expanded=False):
        st.markdown(f"""
        **Your Preferences:**
        - **Meal Frequency**: {meal_frequency} meals per day
        - **Preferred Proteins**: {', '.join(diet_prefs.get('preferred_proteins', ['None specified']))}
        - **Preferred Cuisines**: {', '.join(diet_prefs.get('cuisine_preferences', ['None specified']))}
        - **Foods to Avoid**: {', '.join(diet_prefs.get('disliked_foods', ['None specified']))}
        
        **Nutrition Targets:**
        - **Daily Calories**: {target_calories} kcal
        - **Target per meal**: {', '.join([f"{cal} kcal" for cal in calorie_distribution])}
        
        The AI will suggest recipes that match your preferences and automatically calculate portion sizes to hit your nutrition targets.
        """)

# Quick actions
st.markdown("---")
action_cols = st.columns(3)

with action_cols[0]:
    if st.button("🔄 Generate New Plan"):
        if date_key in st.session_state.ai_meal_plan:
            del st.session_state.ai_meal_plan[date_key]
        st.rerun()

with action_cols[1]:
    if st.button("📅 Plan Next Day"):
        next_date = selected_date.replace(day=selected_date.day + 1)
        st.session_state.current_meal_date = next_date.isoformat()
        st.rerun()

with action_cols[2]:
    if st.button("🏠 Back to Dashboard"):
        # Navigate to main dashboard
        st.info("Use the sidebar to navigate to other sections")