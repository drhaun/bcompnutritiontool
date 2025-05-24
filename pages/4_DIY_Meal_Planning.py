import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
import os
import sys
from datetime import datetime, timedelta

# Import custom FDC API module
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import fdc_api

# Set page config
st.set_page_config(
    page_title="Fitomics - DIY Meal & Recipe Planner",
    page_icon="🍽️",
    layout="wide"
)

# Streamlit UI
st.title("DIY Meal & Recipe Planner")
st.markdown("Create, manage, and plan your meals using the USDA FoodData Central database for accurate nutrition information.")

# Initialize session state variables for this page if needed
if 'food_search_results' not in st.session_state:
    st.session_state.food_search_results = []

if 'favorite_foods' not in st.session_state:
    st.session_state.favorite_foods = []

if 'selected_foods' not in st.session_state:
    st.session_state.selected_foods = []

# Check if user info is set
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

# Food Search UI
def food_search_ui(section_key="main_search"):
    """UI for searching foods in FDC database"""
    st.header("Food Search")
    
    # Add food category filter
    food_categories = ["All Foods", "Protein Sources", "Carb Sources", "Fat Sources", "Vegetables", "Fruits"]
    selected_category = st.selectbox(
        "Filter by food category:",
        food_categories,
        key=f"category_filter_{section_key}"
    )
    
    # Search form
    col1, col2 = st.columns([3, 1])
    
    with col1:
        search_query = st.text_input(
            "Search for foods:", 
            key=f"search_query_{section_key}",
            placeholder="Enter food name (e.g., chicken breast, brown rice, avocado)"
        )
        
        # Add category-specific search suggestions
        if selected_category == "Protein Sources":
            st.info("Try searching for: chicken breast, tuna, ground beef, tofu, eggs, Greek yogurt, lentils, cottage cheese")
        elif selected_category == "Carb Sources":
            st.info("Try searching for: brown rice, quinoa, sweet potato, oats, pasta, bread, beans, corn")
        elif selected_category == "Fat Sources":
            st.info("Try searching for: avocado, olive oil, nuts, seeds, nut butter, cheese, coconut")
        elif selected_category == "Vegetables":
            st.info("Try searching for: broccoli, spinach, kale, carrots, bell peppers, tomatoes, zucchini")
        elif selected_category == "Fruits":
            st.info("Try searching for: apple, banana, berries, orange, mango, pineapple, grapes")
    
    with col2:
        search_button = st.button("Search", key=f"search_button_{section_key}")
    
    # If search button is clicked, perform search
    if search_button and search_query:
        with st.spinner("Searching for foods..."):
            # Call the FDC API to search for foods
            results = fdc_api.search_foods(search_query)
            
            if results:
                # Filter results by category if a specific category is selected
                if selected_category != "All Foods":
                    filtered_results = []
                    for food in results:
                        # Get detailed nutritional information
                        try:
                            food_details = fdc_api.get_food_details(food.get('fdcId', ''))
                            nutrients = fdc_api.extract_nutrients(food_details)
                            food_category = fdc_api.categorize_food(nutrients)
                            
                            # Categorize based on macronutrient ratio and keywords
                            if selected_category == "Protein Sources" and (food_category == "protein" or 
                                any(keyword in food.get('description', '').lower() for keyword in ["chicken", "beef", "fish", "turkey", "tofu", "egg", "yogurt", "protein", "whey", "cottage cheese", "tuna", "salmon", "lentil", "bean"])):
                                filtered_results.append(food)
                            elif selected_category == "Carb Sources" and (food_category == "carb" or 
                                any(keyword in food.get('description', '').lower() for keyword in ["rice", "pasta", "bread", "potato", "oat", "cereal", "grain", "wheat", "quinoa", "corn", "barley"])):
                                filtered_results.append(food)
                            elif selected_category == "Fat Sources" and (food_category == "fat" or 
                                any(keyword in food.get('description', '').lower() for keyword in ["oil", "butter", "nut", "seed", "avocado", "olive", "coconut", "cheese"])):
                                filtered_results.append(food)
                            elif selected_category == "Vegetables" and any(keyword in food.get('description', '').lower() for keyword in ["vegetable", "broccoli", "spinach", "kale", "lettuce", "carrot", "tomato", "cucumber", "pepper", "onion", "zucchini", "celery"]):
                                filtered_results.append(food)
                            elif selected_category == "Fruits" and any(keyword in food.get('description', '').lower() for keyword in ["fruit", "apple", "banana", "orange", "berry", "pear", "grape", "mango", "pineapple", "melon", "peach", "plum"]):
                                filtered_results.append(food)
                        except:
                            # If there's an error getting details, skip categorization
                            pass
                    
                    st.session_state.food_search_results = filtered_results
                    st.success(f"Found {len(filtered_results)} {selected_category.lower()} for '{search_query}'")
                else:
                    st.session_state.food_search_results = results
                    st.success(f"Found {len(results)} results for '{search_query}'")
            else:
                st.warning(f"No results found for '{search_query}'")
    
    # If there are search results, display them
    if st.session_state.food_search_results:
        # Display the search results in a table
        st.subheader("Search Results")
        
        # Create a table of search results
        table_data = []
        
        for i, result in enumerate(st.session_state.food_search_results[:20]):  # Limit to 20 results
            # Get basic info
            food_name = result.get('description', 'Unknown Food')
            brand = result.get('brandName', '')
            data_type = result.get('dataType', '')
            fdc_id = result.get('fdcId', '')
            
            if brand:
                display_name = f"{food_name} ({brand})"
            else:
                display_name = food_name
            
            table_data.append({
                'Index': i + 1,
                'Food Name': display_name,
                'Type': data_type,
                'FDC ID': fdc_id
            })
        
        # Convert to DataFrame and display
        results_df = pd.DataFrame(table_data)
        st.dataframe(results_df, use_container_width=True)
        
        # Food details and selection
        food_idx = st.number_input(
            "Select food by index:", 
            min_value=1, 
            max_value=len(st.session_state.food_search_results[:20]), 
            value=1, 
            key=f"food_idx_{section_key}"
        ) - 1
        
        if food_idx >= 0 and food_idx < len(st.session_state.food_search_results[:20]):
            selected_food = st.session_state.food_search_results[food_idx]
            
            # Get detailed info
            with st.spinner("Loading food details..."):
                food_details = fdc_api.get_food_details(selected_food['fdcId'])
                
                if food_details:
                    # Normalize the food data
                    normalized_food = fdc_api.normalize_food_data(food_details)
                    
                    # Display nutrients
                    st.subheader(f"Nutrients for {normalized_food['name']} (per 100g)")
                    
                    col1, col2, col3, col4, col5 = st.columns(5)
                    
                    with col1:
                        st.metric("Calories", f"{normalized_food['calories']:.0f} kcal")
                    
                    with col2:
                        st.metric("Protein", f"{normalized_food['protein']:.1f}g")
                    
                    with col3:
                        st.metric("Carbs", f"{normalized_food['carbs']:.1f}g")
                    
                    with col4:
                        st.metric("Fat", f"{normalized_food['fat']:.1f}g")
                    
                    with col5:
                        st.metric("Fiber", f"{normalized_food['fiber']:.1f}g")
                    
                    # Display macronutrient breakdown as percentages
                    st.subheader("Macronutrient Breakdown")
                    
                    # Calculate calories from macros
                    protein_cals = normalized_food['protein'] * 4
                    carb_cals = normalized_food['carbs'] * 4
                    fat_cals = normalized_food['fat'] * 9
                    total_cals = protein_cals + carb_cals + fat_cals
                    
                    if total_cals > 0:
                        protein_pct = (protein_cals / total_cals) * 100
                        carb_pct = (carb_cals / total_cals) * 100
                        fat_pct = (fat_cals / total_cals) * 100
                        
                        # Display as a bar chart
                        fig, ax = plt.subplots(figsize=(8, 2))
                        ax.barh(['Macros'], [protein_pct], color='#ff9999', label=f'Protein: {protein_pct:.1f}%')
                        ax.barh(['Macros'], [carb_pct], left=[protein_pct], color='#99ff99', label=f'Carbs: {carb_pct:.1f}%')
                        ax.barh(['Macros'], [fat_pct], left=[protein_pct + carb_pct], color='#9999ff', label=f'Fat: {fat_pct:.1f}%')
                        
                        ax.set_xlim(0, 100)
                        ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.2), ncol=3)
                        ax.set_xticks([])
                        ax.set_yticks([])
                        
                        for spine in ax.spines.values():
                            spine.set_visible(False)
                        
                        st.pyplot(fig)
                    
                    # Add to favorites button
                    fav_col1, fav_col2 = st.columns(2)
                    
                    with fav_col1:
                        if st.button("Add to Favorites", key=f"add_fav_{section_key}"):
                            fdc_api.add_to_favorites(normalized_food)
                            st.success(f"Added {normalized_food['name']} to favorites!")
                    
                    with fav_col2:
                        if st.button("Add to Selected Foods", key=f"add_selected_{section_key}"):
                            # Check if already in selected foods
                            if normalized_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                                st.session_state.selected_foods.append(normalized_food)
                                st.success(f"Added {normalized_food['name']} to selected foods!")
                            else:
                                st.warning(f"{normalized_food['name']} is already in your selected foods.")
                    
                    return normalized_food
    
    return None

# Function to display favorites
def favorites_ui(section_key="favorites"):
    st.header("My Favorite Foods")
    
    # Get user favorites
    favorites = fdc_api.get_user_favorites()
    
    if not favorites:
        st.info("You haven't added any favorite foods yet. Use the search to find and add foods to your favorites.")
        return None
    
    # Group favorites by category
    categorized_favorites = {}
    
    for food in favorites:
        category = food.get('category', 'other').capitalize()
        
        if category not in categorized_favorites:
            categorized_favorites[category] = []
        
        categorized_favorites[category].append(food)
    
    # Display favorites by category
    for category, foods in categorized_favorites.items():
        st.subheader(category)
        
        # Create a table of foods
        table_data = []
        
        for i, food in enumerate(foods):
            table_data.append({
                'Index': i + 1,
                'Food Name': food['name'],
                'Calories': f"{food['calories']:.0f}",
                'Protein': f"{food['protein']:.1f}g",
                'Carbs': f"{food['carbs']:.1f}g",
                'Fat': f"{food['fat']:.1f}g",
                'Fiber': f"{food.get('fiber', 0):.1f}g"
            })
        
        # Create a DataFrame and display it
        favorites_df = pd.DataFrame(table_data)
        st.dataframe(favorites_df, use_container_width=True)
    
    # Food selection
    food_idx = st.number_input(
        "Select food by index:", 
        min_value=1, 
        max_value=len(favorites), 
        value=1, 
        key=f"fav_idx_{section_key}"
    ) - 1
    
    if food_idx >= 0 and food_idx < len(favorites):
        selected_food = favorites[food_idx]
        
        # Display nutrients
        st.subheader(f"Selected: {selected_food['name']}")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Button to remove from favorites
            if st.button("Remove from Favorites", key=f"remove_fav_{section_key}"):
                fdc_api.remove_from_favorites(selected_food.get('fdcId', ''))
                st.success(f"Removed {selected_food['name']} from favorites!")
                st.rerun()
        
        with col2:
            if st.button("Add to Selected Foods", key=f"add_selected_fav_{section_key}"):
                # Check if already in selected foods
                if selected_food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                    st.session_state.selected_foods.append(selected_food)
                    st.success(f"Added {selected_food['name']} to selected foods!")
                else:
                    st.warning(f"{selected_food['name']} is already in your selected foods.")
        
        return selected_food
    
    return None

# Function to display selected foods
def selected_foods_ui(section_key="selected"):
    st.header("Selected Foods")
    
    if not st.session_state.selected_foods:
        st.info("No foods selected yet. Use the search or favorites to add foods.")
        return
    
    # Display selected foods in a table
    table_data = []
    
    for i, food in enumerate(st.session_state.selected_foods):
        table_data.append({
            'Index': i + 1,
            'Food Name': food['name'],
            'Category': food.get('category', 'Unknown').capitalize(),
            'Calories': f"{food['calories']:.0f}",
            'Protein': f"{food['protein']:.1f}g",
            'Carbs': f"{food['carbs']:.1f}g",
            'Fat': f"{food['fat']:.1f}g"
        })
    
    # Create a DataFrame and display it
    selected_df = pd.DataFrame(table_data)
    st.dataframe(selected_df, use_container_width=True)
    
    # Total nutrition
    total_calories = sum(food['calories'] for food in st.session_state.selected_foods)
    total_protein = sum(food['protein'] for food in st.session_state.selected_foods)
    total_carbs = sum(food['carbs'] for food in st.session_state.selected_foods)
    total_fat = sum(food['fat'] for food in st.session_state.selected_foods)
    
    st.subheader("Total Nutrition (per 100g)")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Calories", f"{total_calories:.0f} kcal")
    
    with col2:
        st.metric("Protein", f"{total_protein:.1f}g")
    
    with col3:
        st.metric("Carbs", f"{total_carbs:.1f}g")
    
    with col4:
        st.metric("Fat", f"{total_fat:.1f}g")
    
    # Calculate percentages for pie chart
    protein_cals = total_protein * 4
    carb_cals = total_carbs * 4
    fat_cals = total_fat * 9
    total_cals = protein_cals + carb_cals + fat_cals
    
    if total_cals > 0:
        protein_pct = (protein_cals / total_cals) * 100
        carb_pct = (carb_cals / total_cals) * 100
        fat_pct = (fat_cals / total_cals) * 100
        
        # Create pie chart
        fig, ax = plt.subplots(figsize=(6, 6))
        ax.pie([protein_pct, carb_pct, fat_pct], 
              labels=['Protein', 'Carbs', 'Fat'],
              colors=['#ff9999', '#99ff99', '#9999ff'],
              autopct='%1.1f%%',
              startangle=90)
        ax.axis('equal')
        st.pyplot(fig)
    
    # Button to clear all selected foods
    if st.button("Clear All Foods", key=f"clear_foods_{section_key}"):
        st.session_state.selected_foods = []
        st.success("All foods cleared!")
        st.rerun()
    
    # Button to remove a food
    food_to_remove = st.number_input(
        "Select food to remove by index:", 
        min_value=1, 
        max_value=len(st.session_state.selected_foods), 
        value=1, 
        key=f"remove_idx_{section_key}"
    ) - 1
    
    if st.button("Remove Selected Food", key=f"remove_food_{section_key}"):
        if 0 <= food_to_remove < len(st.session_state.selected_foods):
            food_name = st.session_state.selected_foods[food_to_remove]['name']
            st.session_state.selected_foods.pop(food_to_remove)
            st.success(f"Removed {food_name} from selected foods!")
            st.rerun()

# Function to create a recipe
def create_recipe_ui(section_key="recipe"):
    """UI for creating a recipe from selected foods"""
    st.header("Create Recipe")
    
    if not st.session_state.selected_foods:
        st.warning("Please add foods to your selection before creating a recipe.")
        return
    
    # Recipe form
    recipe_name = st.text_input("Recipe Name:", key=f"recipe_name_{section_key}", 
                               placeholder="E.g., High Protein Breakfast, Post-Workout Meal")
    
    meal_type = st.selectbox("Meal Type:", 
                            ["Breakfast", "Lunch", "Dinner", "Snack", "Any"], 
                            key=f"meal_type_{section_key}")
    
    # Portion size inputs
    st.subheader("Adjust Portion Sizes")
    
    # Calculate total nutrition
    total_nutrition = {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    }
    
    portions = {}
    
    for i, food in enumerate(st.session_state.selected_foods):
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            st.write(f"**{food['name']}**")
        
        with col2:
            default_portion = 100
            portion = st.number_input(
                f"Portion (g):", 
                min_value=0, 
                value=default_portion,
                key=f"portion_{i}_{section_key}"
            )
            portions[food['name']] = portion
        
        with col3:
            st.write(f"{food['calories'] * portion / 100:.0f} kcal")
        
        # Update total nutrition
        total_nutrition['calories'] += food['calories'] * portion / 100
        total_nutrition['protein'] += food['protein'] * portion / 100
        total_nutrition['carbs'] += food['carbs'] * portion / 100
        total_nutrition['fat'] += food['fat'] * portion / 100
        total_nutrition['fiber'] += food.get('fiber', 0) * portion / 100
    
    # Display total nutrition
    st.subheader("Recipe Nutrition")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Calories", f"{total_nutrition['calories']:.0f} kcal")
    
    with col2:
        st.metric("Protein", f"{total_nutrition['protein']:.1f}g")
    
    with col3:
        st.metric("Carbs", f"{total_nutrition['carbs']:.1f}g")
    
    with col4:
        st.metric("Fat", f"{total_nutrition['fat']:.1f}g")
    
    with col5:
        st.metric("Fiber", f"{total_nutrition['fiber']:.1f}g")
    
    # Calculate macros percentages for visualization
    protein_cals = total_nutrition['protein'] * 4
    carb_cals = total_nutrition['carbs'] * 4
    fat_cals = total_nutrition['fat'] * 9
    total_cals = protein_cals + carb_cals + fat_cals
    
    if total_cals > 0:
        protein_pct = (protein_cals / total_cals) * 100
        carb_pct = (carb_cals / total_cals) * 100
        fat_pct = (fat_cals / total_cals) * 100
        
        # Create pie chart
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.pie([protein_pct, carb_pct, fat_pct], 
              labels=['Protein', 'Carbs', 'Fat'],
              colors=['#ff9999', '#99ff99', '#9999ff'],
              autopct='%1.1f%%',
              startangle=90)
        ax.axis('equal')
        st.pyplot(fig)
    
    # Save recipe button
    if st.button("Save Recipe", key=f"save_recipe_{section_key}") and recipe_name:
        # Add recipe to recipes
        fdc_api.add_recipe(recipe_name, st.session_state.selected_foods, portions, meal_type)
        st.success(f"Recipe '{recipe_name}' saved successfully!")
        
        # Clear selected foods
        if st.button("Clear Selected Foods", key=f"clear_after_save_{section_key}"):
            st.session_state.selected_foods = []
            st.rerun()

# Function to manage recipes
def recipes_ui(section_key="recipes"):
    """UI for managing saved recipes"""
    st.header("My Recipes")
    
    # Get user recipes
    recipes = fdc_api.get_user_recipes()
    
    if not recipes:
        st.info("You haven't created any recipes yet. Use the 'Create Recipe' tab to create and save recipes.")
        return
    
    # Display recipes in a table
    table_data = []
    
    for i, recipe in enumerate(recipes):
        table_data.append({
            'Index': i + 1,
            'Recipe Name': recipe['name'],
            'Meal Type': recipe['meal_type'],
            'Calories': f"{recipe.get('total_calories', 0):.0f}",
            'Protein': f"{recipe.get('total_protein', 0):.1f}g",
            'Carbs': f"{recipe.get('total_carbs', 0):.1f}g",
            'Fat': f"{recipe.get('total_fat', 0):.1f}g"
        })
    
    # Convert to DataFrame and display
    recipes_df = pd.DataFrame(table_data)
    st.dataframe(recipes_df, use_container_width=True)
    
    # Recipe selection
    recipe_idx = st.number_input(
        "Select recipe by index:", 
        min_value=1, 
        max_value=len(recipes), 
        value=1, 
        key=f"recipe_idx_{section_key}"
    ) - 1
    
    if recipe_idx >= 0 and recipe_idx < len(recipes):
        selected_recipe = recipes[recipe_idx]
        
        # Display recipe details
        st.subheader(f"Selected: {selected_recipe['name']}")
        st.write(f"Meal Type: {selected_recipe['meal_type']}")
        
        # Display ingredients
        st.write("**Ingredients:**")
        ingredients_data = []
        
        for food in selected_recipe.get('foods', []):
            # Get portion size
            portion = selected_recipe.get('portions', {}).get(food['name'], 100)
            
            ingredients_data.append({
                'Food': food['name'],
                'Portion': f"{portion}g",
                'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                'Protein': f"{food['protein'] * portion / 100:.1f}g",
                'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                'Fat': f"{food['fat'] * portion / 100:.1f}g"
            })
        
        # Convert to DataFrame and display
        ingredients_df = pd.DataFrame(ingredients_data)
        st.dataframe(ingredients_df, use_container_width=True)
        
        # Action buttons for the recipe
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Delete Recipe", key=f"delete_recipe_{section_key}"):
                # Remove the recipe from the recipes list
                recipes.pop(recipe_idx)
                fdc_api.save_user_recipes(recipes)
                st.success(f"Recipe '{selected_recipe['name']}' deleted successfully!")
                st.rerun()
        
        with col2:
            if st.button("Add to Meal Plan", key=f"add_to_meal_{section_key}"):
                st.session_state.add_recipe_to_meal = selected_recipe
                st.info("Recipe added. Go to 'Meal Planning' tab to add it to a specific meal.")
        
        with col3:
            if st.button("Load Recipe Foods", key=f"load_recipe_{section_key}"):
                # Add all foods from the recipe to selected foods
                for food in selected_recipe.get('foods', []):
                    if food['name'] not in [f['name'] for f in st.session_state.selected_foods]:
                        st.session_state.selected_foods.append(food)
                
                st.success(f"Added foods from '{selected_recipe['name']}' to selected foods!")
                st.rerun()

# Function for meal planning by day
def meal_planning_ui(section_key="meal_plan"):
    """UI for planning meals by day"""
    st.header("Weekly Meal Planning")
    
    # Initialize weekly meal plan in session state if not exists
    if 'weekly_meal_plan' not in st.session_state:
        st.session_state.weekly_meal_plan = {
            day: {
                'meals': [],
                'total_nutrition': {
                    'calories': 0,
                    'protein': 0,
                    'carbs': 0,
                    'fat': 0,
                    'fiber': 0
                }
            }
            for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }
    
    # Check if day-specific nutrition targets exist from Weekly Schedule page
    has_nutrition_targets = False
    if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
        has_nutrition_targets = True
        st.success("📊 Great! You've set up day-specific nutrition targets in the Weekly Schedule. These will be used to guide your meal planning.")
    else:
        st.warning("⚠️ You haven't set up day-specific nutrition targets yet. For best results, go to 'Weekly Schedule and Nutrition' page first to set your targets for each day.")
    
    # Day selection
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    selected_day = st.selectbox("Select Day:", days, key=f"day_select_{section_key}")
    
    # Display current plan and nutrition targets for the selected day
    st.subheader(f"Meal Plan for {selected_day}")
    
    # Get meals for the day
    day_plan = st.session_state.weekly_meal_plan[selected_day]
    meals = day_plan.get('meals', [])
    
    # Display nutrition targets if available
    if has_nutrition_targets and selected_day in st.session_state.day_specific_nutrition:
        targets = st.session_state.day_specific_nutrition[selected_day]
        
        # Create columns for target display
        target_cols = st.columns(4)
        with target_cols[0]:
            st.metric("Target Calories", f"{targets.get('target_calories', 0)} kcal")
        with target_cols[1]:
            st.metric("Target Protein", f"{targets.get('protein', 0)}g")
        with target_cols[2]:
            st.metric("Target Carbs", f"{targets.get('carbs', 0)}g")
        with target_cols[3]:
            st.metric("Target Fat", f"{targets.get('fat', 0)}g")
            
        # Calculate and display current totals and remaining targets
        total_calories = day_plan['total_nutrition']['calories']
        total_protein = day_plan['total_nutrition']['protein']
        total_carbs = day_plan['total_nutrition']['carbs']
        total_fat = day_plan['total_nutrition']['fat']
        
        remaining_calories = targets.get('target_calories', 0) - total_calories
        remaining_protein = targets.get('protein', 0) - total_protein
        remaining_carbs = targets.get('carbs', 0) - total_carbs
        remaining_fat = targets.get('fat', 0) - total_fat
        
        st.subheader("Nutrition Progress")
        progress_cols = st.columns(4)
        with progress_cols[0]:
            st.metric("Calories", f"{int(total_calories)} kcal", f"{int(remaining_calories)} remaining")
            cal_progress = min(100, (total_calories / targets.get('target_calories', 1)) * 100)
            st.progress(cal_progress / 100)
        with progress_cols[1]:
            st.metric("Protein", f"{total_protein:.1f}g", f"{remaining_protein:.1f}g remaining")
            protein_progress = min(100, (total_protein / targets.get('protein', 1)) * 100)
            st.progress(protein_progress / 100)
        with progress_cols[2]:
            st.metric("Carbs", f"{total_carbs:.1f}g", f"{remaining_carbs:.1f}g remaining")
            carbs_progress = min(100, (total_carbs / targets.get('carbs', 1)) * 100)
            st.progress(carbs_progress / 100)
        with progress_cols[3]:
            st.metric("Fat", f"{total_fat:.1f}g", f"{remaining_fat:.1f}g remaining")
            fat_progress = min(100, (total_fat / targets.get('fat', 1)) * 100)
            st.progress(fat_progress / 100)
    
    if not meals:
        st.info(f"No meals planned for {selected_day} yet. Add meals below.")
    else:
        # Display meals
        for i, meal in enumerate(meals):
            st.write(f"**Meal {i+1}: {meal.get('name', 'Unnamed Meal')}**")
            
            # Display meal details
            meal_data = []
            
            for food in meal.get('foods', []):
                portion = meal.get('portions', {}).get(food['name'], 100)
                
                meal_data.append({
                    'Food': food['name'],
                    'Portion': f"{portion}g",
                    'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                    'Protein': f"{food['protein'] * portion / 100:.1f}g",
                    'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                    'Fat': f"{food['fat'] * portion / 100:.1f}g"
                })
            
            if meal_data:
                meal_df = pd.DataFrame(meal_data)
                st.dataframe(meal_df, use_container_width=True)
                
                # Remove meal button
                if st.button("Remove Meal", key=f"remove_meal_{selected_day}_{i}"):
                    # Remove meal from the plan
                    meals.pop(i)
                    
                    # Recalculate total nutrition for the day
                    day_plan['total_nutrition'] = {
                        'calories': 0,
                        'protein': 0,
                        'carbs': 0,
                        'fat': 0,
                        'fiber': 0
                    }
                    
                    for m in meals:
                        for food in m.get('foods', []):
                            portion = m.get('portions', {}).get(food['name'], 100)
                            
                            day_plan['total_nutrition']['calories'] += food['calories'] * portion / 100
                            day_plan['total_nutrition']['protein'] += food['protein'] * portion / 100
                            day_plan['total_nutrition']['carbs'] += food['carbs'] * portion / 100
                            day_plan['total_nutrition']['fat'] += food['fat'] * portion / 100
                            day_plan['total_nutrition']['fiber'] += food.get('fiber', 0) * portion / 100
                    
                    st.success(f"Removed Meal {i+1} from {selected_day}.")
                    st.rerun()
    
    # Display total nutrition for the day
    st.subheader("Daily Nutrition Totals")
    
    total_nutrition = day_plan.get('total_nutrition', {
        'calories': 0,
        'protein': 0,
        'carbs': 0,
        'fat': 0,
        'fiber': 0
    })
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Calories", f"{total_nutrition.get('calories', 0):.0f} kcal")
    
    with col2:
        st.metric("Protein", f"{total_nutrition.get('protein', 0):.1f}g")
    
    with col3:
        st.metric("Carbs", f"{total_nutrition.get('carbs', 0):.1f}g")
    
    with col4:
        st.metric("Fat", f"{total_nutrition.get('fat', 0):.1f}g")
    
    with col5:
        st.metric("Fiber", f"{total_nutrition.get('fiber', 0):.1f}g")
    
    # Add new meal section
    st.subheader("Add New Meal")
    
    meal_name = st.text_input("Meal Name:", key=f"new_meal_name_{selected_day}", 
                            placeholder="E.g., Breakfast, Lunch, Dinner, Snack")
    
    # Check if there are selected foods or a recipe to add
    if st.session_state.selected_foods:
        st.write("**Selected Foods:**")
        
        selected_foods_data = []
        portions = {}
        
        for i, food in enumerate(st.session_state.selected_foods):
            col1, col2 = st.columns([3, 1])
            
            with col1:
                st.write(f"{food['name']}")
            
            with col2:
                portion = st.number_input(
                    f"Portion (g):", 
                    min_value=0, 
                    value=100,
                    key=f"meal_portion_{selected_day}_{i}"
                )
                portions[food['name']] = portion
            
            selected_foods_data.append({
                'Food': food['name'],
                'Portion': f"{portion}g",
                'Calories': f"{food['calories'] * portion / 100:.0f} kcal",
                'Protein': f"{food['protein'] * portion / 100:.1f}g",
                'Carbs': f"{food['carbs'] * portion / 100:.1f}g",
                'Fat': f"{food['fat'] * portion / 100:.1f}g"
            })
        
        if selected_foods_data:
            selected_df = pd.DataFrame(selected_foods_data)
            st.dataframe(selected_df, use_container_width=True)
        
        if st.button("Add to Meal Plan", key=f"add_to_plan_{selected_day}") and meal_name:
            # Create a new meal
            new_meal = {
                'name': meal_name,
                'foods': st.session_state.selected_foods.copy(),
                'portions': portions.copy()
            }
            
            # Add to the day's meal plan
            meals.append(new_meal)
            
            # Update total nutrition for the day
            for food in new_meal['foods']:
                portion = new_meal['portions'].get(food['name'], 100)
                
                day_plan['total_nutrition']['calories'] += food['calories'] * portion / 100
                day_plan['total_nutrition']['protein'] += food['protein'] * portion / 100
                day_plan['total_nutrition']['carbs'] += food['carbs'] * portion / 100
                day_plan['total_nutrition']['fat'] += food['fat'] * portion / 100
                day_plan['total_nutrition']['fiber'] += food.get('fiber', 0) * portion / 100
            
            st.success(f"Added {meal_name} to {selected_day}'s meal plan!")
            
            # Clear selected foods
            if st.button("Clear Selected Foods", key=f"clear_after_add_{selected_day}"):
                st.session_state.selected_foods = []
                st.rerun()
    else:
        st.info("No foods selected. Use the 'Food Search' or 'My Favorites' tabs to select foods for this meal.")

# Function for grocery list generation
def grocery_list_ui(section_key="grocery"):
    """UI for generating grocery lists from meal plans"""
    st.header("Grocery List Generator")
    
    # Option to select days to include
    st.subheader("Select Days to Include")
    
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    selected_days = []
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.checkbox("Monday", key=f"day_mon_{section_key}", value=True):
            selected_days.append('Monday')
        if st.checkbox("Tuesday", key=f"day_tue_{section_key}", value=True):
            selected_days.append('Tuesday')
        if st.checkbox("Wednesday", key=f"day_wed_{section_key}", value=True):
            selected_days.append('Wednesday')
        if st.checkbox("Thursday", key=f"day_thu_{section_key}", value=True):
            selected_days.append('Thursday')
    
    with col2:
        if st.checkbox("Friday", key=f"day_fri_{section_key}", value=True):
            selected_days.append('Friday')
        if st.checkbox("Saturday", key=f"day_sat_{section_key}", value=True):
            selected_days.append('Saturday')
        if st.checkbox("Sunday", key=f"day_sun_{section_key}", value=True):
            selected_days.append('Sunday')
    
    # Generate grocery list button
    if st.button("Generate Grocery List", key=f"gen_grocery_{section_key}"):
        if not selected_days:
            st.warning("Please select at least one day to include in the grocery list.")
        else:
            # Collect all foods from selected days
            all_foods = {}
            
            for day in selected_days:
                day_plan = st.session_state.weekly_meal_plan.get(day, {})
                meals = day_plan.get('meals', [])
                
                for meal in meals:
                    for food in meal.get('foods', []):
                        food_name = food['name']
                        portion = meal.get('portions', {}).get(food_name, 100)
                        
                        if food_name in all_foods:
                            all_foods[food_name]['portion'] += portion
                        else:
                            all_foods[food_name] = {
                                'food': food,
                                'portion': portion
                            }
            
            if not all_foods:
                st.warning("No foods found in the selected days. Please add meals to your plan first.")
            else:
                # Categorize foods
                categorized_foods = {
                    'Protein': [],
                    'Carbs': [],
                    'Fats': [],
                    'Fruits & Vegetables': [],
                    'Dairy': [],
                    'Other': []
                }
                
                for food_name, food_info in all_foods.items():
                    food = food_info['food']
                    portion = food_info['portion']
                    
                    # Determine category based on food properties
                    category = food.get('category', '').lower()
                    
                    if category in ['protein', 'high protein']:
                        categorized_foods['Protein'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['carb', 'carbohydrate', 'high carb']:
                        categorized_foods['Carbs'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['fat', 'high fat']:
                        categorized_foods['Fats'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['fruit', 'vegetable', 'produce']:
                        categorized_foods['Fruits & Vegetables'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    elif category in ['dairy', 'milk']:
                        categorized_foods['Dairy'].append({
                            'name': food_name,
                            'portion': portion
                        })
                    else:
                        categorized_foods['Other'].append({
                            'name': food_name,
                            'portion': portion
                        })
                
                # Display grocery list by category
                st.subheader("Grocery List")
                
                grocery_text = "# Grocery List\n\n"
                
                for category, foods in categorized_foods.items():
                    if foods:
                        st.write(f"**{category}**")
                        grocery_text += f"## {category}\n\n"
                        
                        for food in foods:
                            st.write(f"- {food['name']}: {food['portion']:.0f}g")
                            grocery_text += f"- {food['name']}: {food['portion']:.0f}g\n"
                        
                        grocery_text += "\n"
                
                # Option to print/export
                st.write("---")
                st.subheader("Export Options")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button("Print Grocery List", key=f"print_grocery_{section_key}"):
                        st.code(grocery_text, language="markdown")
                        st.info("Copy the text above to print or save your grocery list.")
                
                with col2:
                    if st.download_button(
                        label="Download Grocery List",
                        data=grocery_text,
                        file_name="grocery_list.md",
                        mime="text/markdown",
                        key=f"download_grocery_{section_key}"
                    ):
                        st.success("Grocery list downloaded successfully!")

# Main layout with tabs
tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
    "Food Search", 
    "My Favorites", 
    "Selected Foods", 
    "Create Recipe", 
    "My Recipes", 
    "Meal Planning",
    "Grocery List"
])

with tab1:
    food_search_ui("main")

with tab2:
    favorites_ui("main")

with tab3:
    selected_foods_ui("main")

with tab4:
    create_recipe_ui("main")

with tab5:
    recipes_ui("main")

with tab6:
    meal_planning_ui("main")

with tab7:
    grocery_list_ui("main")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")