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
    page_title="Enhanced Meal Planning",
    page_icon="🍽️",
    layout="wide"
)

# Streamlit UI
st.title("🍽️ Enhanced Meal & Grocery Planning")
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
    
    # Search form
    col1, col2 = st.columns([3, 1])
    
    with col1:
        search_query = st.text_input(
            "Search for foods:", 
            key=f"search_query_{section_key}",
            placeholder="Enter food name (e.g., chicken breast, brown rice, avocado)"
        )
    
    with col2:
        search_button = st.button("Search", key=f"search_button_{section_key}")
    
    # If search button is clicked, perform search
    if search_button and search_query:
        with st.spinner("Searching for foods..."):
            # Call the FDC API to search for foods
            results = fdc_api.search_foods(search_query)
            
            if results:
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

# Main layout
tab1, tab2, tab3 = st.tabs(["Food Search", "My Favorites", "Selected Foods"])

with tab1:
    food_search_ui()

with tab2:
    favorites_ui()

with tab3:
    selected_foods_ui()

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")