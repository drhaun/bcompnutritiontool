import streamlit as st
import pandas as pd
import numpy as np
import os
import sys
import json
from datetime import datetime
from fpdf import FPDF
import base64
from io import BytesIO

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils
import recipe_database
import fdc_api

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Grocery List",
    page_icon="🛒",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Function to load meal plan data
def load_meal_plan():
    """Load meal plan data from session state or file"""
    if 'meal_plan' in st.session_state:
        return st.session_state.meal_plan
    
    # Try to load from file
    meal_plan_path = 'data/meal_plan.json'
    if os.path.exists(meal_plan_path):
        try:
            with open(meal_plan_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            st.error(f"Error loading meal plan: {e}")
    
    # Return empty meal plan if not found
    return {
        'breakfast': [],
        'lunch': [],
        'dinner': [],
        'snacks': []
    }

# Function to consolidate ingredients from meal plan
def consolidate_ingredients(meal_plan):
    """
    Consolidate all ingredients from the meal plan into a single list
    with quantities summed up.
    
    Returns:
    - Dictionary with ingredient names as keys and quantities as values
    - Dictionary with ingredient details (category, nutrition, etc.)
    """
    ingredients = {}
    ingredient_details = {}
    
    # Process each meal type
    for meal_type, items in meal_plan.items():
        if not isinstance(items, list):
            continue
            
        for item in items:
            # Skip if no name or portion
            if not isinstance(item, dict) or 'name' not in item or 'portion' not in item:
                continue
                
            name = item['name']
            portion = item.get('portion', 0)
            
            # Add to ingredients dictionary
            if name in ingredients:
                ingredients[name] += portion
            else:
                ingredients[name] = portion
            
            # Store ingredient details
            if name not in ingredient_details and 'nutrients' in item:
                ingredient_details[name] = {
                    'food_id': item.get('food_id', ''),
                    'category': item.get('category', 'Other'),
                    'nutrients': item.get('nutrients', {}),
                    'unit': 'g'  # Default unit is grams
                }
    
    return ingredients, ingredient_details

# Function to generate PDF grocery list
def generate_grocery_pdf(ingredients, ingredient_details):
    """Generate a branded PDF with the grocery list"""
    class GroceryPDF(FPDF):
        def header(self):
            # Add logo
            try:
                logo_path = 'images/fitomicshorizontalgold.png'
                if os.path.exists(logo_path):
                    self.image(logo_path, 10, 8, 60)
                else:
                    # Use text instead
                    self.set_font('Arial', 'B', 16)
                    self.cell(0, 10, 'Fitomics', 0, 1, 'C')
            except Exception:
                # Use text instead
                self.set_font('Arial', 'B', 16)
                self.cell(0, 10, 'Fitomics', 0, 1, 'C')
            
            # Title
            self.ln(15)
            self.set_font('Arial', 'B', 14)
            self.cell(0, 10, 'Grocery List', 0, 1, 'C')
            self.ln(5)
            
            # Date
            self.set_font('Arial', 'I', 10)
            self.cell(0, 10, f'Generated on {datetime.now().strftime("%B %d, %Y")}', 0, 1, 'C')
            self.ln(10)
    
    # Create PDF object
    pdf = GroceryPDF()
    pdf.add_page()
    
    # Group ingredients by category
    categories = {}
    for name, amount in ingredients.items():
        category = ingredient_details.get(name, {}).get('category', 'Other')
        if category not in categories:
            categories[category] = []
        categories[category].append((name, amount))
    
    # Sort categories
    sorted_categories = sorted(categories.keys())
    
    # Add each category and its ingredients
    for category in sorted_categories:
        # Category header
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, category, 0, 1, 'L')
        pdf.ln(2)
        
        # Add ingredients
        pdf.set_font('Arial', '', 11)
        for name, amount in sorted(categories[category], key=lambda x: x[0]):
            # Format amount with appropriate unit
            unit = ingredient_details.get(name, {}).get('unit', 'g')
            formatted_amount = f"{amount:.0f} {unit}"
            
            pdf.cell(130, 8, name, 0, 0, 'L')
            pdf.cell(60, 8, formatted_amount, 0, 1, 'L')
        
        pdf.ln(5)
    
    # Add nutritional summary
    pdf.add_page()
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Nutritional Summary', 0, 1, 'C')
    pdf.ln(5)
    
    # Calculate total nutrition
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    for name, amount in ingredients.items():
        nutrients = ingredient_details.get(name, {}).get('nutrients', {})
        # Calculate nutrition based on portion size
        scaling_factor = amount / 100  # Assuming nutrients are per 100g
        total_calories += nutrients.get('calories', 0) * scaling_factor
        total_protein += nutrients.get('protein', 0) * scaling_factor
        total_carbs += nutrients.get('carbs', 0) * scaling_factor
        total_fat += nutrients.get('fat', 0) * scaling_factor
    
    # Add nutrition table
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(100, 10, 'Nutrient', 1, 0, 'C')
    pdf.cell(90, 10, 'Total Amount', 1, 1, 'C')
    
    pdf.set_font('Arial', '', 11)
    pdf.cell(100, 10, 'Calories', 1, 0, 'L')
    pdf.cell(90, 10, f"{total_calories:.0f} kcal", 1, 1, 'L')
    
    pdf.cell(100, 10, 'Protein', 1, 0, 'L')
    pdf.cell(90, 10, f"{total_protein:.1f} g", 1, 1, 'L')
    
    pdf.cell(100, 10, 'Carbohydrates', 1, 0, 'L')
    pdf.cell(90, 10, f"{total_carbs:.1f} g", 1, 1, 'L')
    
    pdf.cell(100, 10, 'Fat', 1, 0, 'L')
    pdf.cell(90, 10, f"{total_fat:.1f} g", 1, 1, 'L')
    
    # Add footer
    pdf.ln(10)
    pdf.set_font('Arial', 'I', 8)
    pdf.cell(0, 10, 'Powered by Fitomics - Your Personal Nutrition Coach', 0, 1, 'C')
    
    return pdf.output(dest='S').encode('latin1')

# Function to create and format cart data for export to grocery delivery services
def format_cart_for_delivery(ingredients, ingredient_details, service='instacart'):
    """
    Format ingredient data for export to grocery delivery services
    
    Parameters:
    - ingredients: Dictionary with ingredient names and quantities
    - ingredient_details: Dictionary with ingredient details
    - service: Service to format for ('instacart' or 'shipt')
    
    Returns:
    - Formatted data ready for export
    """
    # Create formatted cart data
    cart_data = []
    
    for name, quantity in ingredients.items():
        item = {
            'name': name,
            'quantity': quantity,
            'unit': ingredient_details.get(name, {}).get('unit', 'g')
        }
        
        # Add any service-specific formatting
        if service == 'instacart':
            # Instacart specific format if needed
            pass
        elif service == 'shipt':
            # Shipt specific format if needed
            pass
        
        cart_data.append(item)
    
    return cart_data

# Main page content
st.title("Grocery List")
st.markdown("Generate a grocery list from your meal plan and easily shop for ingredients.")

# Load meal plan
meal_plan = load_meal_plan()

# Check if we have a meal plan
if not meal_plan or all(not items for items in meal_plan.values() if isinstance(items, list)):
    st.warning("No meal plan found. Please create a meal plan in the DIY Meal Planning or AI Meal Planning pages first.")
    st.stop()

# Display meal plan summary
st.subheader("Your Meal Plan")
meal_tabs = st.tabs(["Breakfast", "Lunch", "Dinner", "Snacks"])

# Process and display each meal type
for i, meal_type in enumerate(['breakfast', 'lunch', 'dinner', 'snacks']):
    with meal_tabs[i]:
        items = meal_plan.get(meal_type, [])
        if not items:
            st.info(f"No {meal_type.capitalize()} items in your meal plan.")
        else:
            # Create a dataframe for display
            meal_data = []
            for item in items:
                if isinstance(item, dict) and 'name' in item and 'portion' in item:
                    meal_data.append({
                        'Food': item['name'],
                        'Portion (g)': item['portion'],
                        'Calories': item.get('nutrients', {}).get('calories', 0) * item['portion'] / 100,
                        'Protein (g)': item.get('nutrients', {}).get('protein', 0) * item['portion'] / 100,
                        'Carbs (g)': item.get('nutrients', {}).get('carbs', 0) * item['portion'] / 100,
                        'Fat (g)': item.get('nutrients', {}).get('fat', 0) * item['portion'] / 100
                    })
            
            if meal_data:
                # Convert to dataframe
                df = pd.DataFrame(meal_data)
                # Round numerical columns
                for col in ['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)']:
                    df[col] = df[col].round(1)
                # Display
                st.dataframe(df, use_container_width=True)

# Generate consolidated grocery list
ingredients, ingredient_details = consolidate_ingredients(meal_plan)

# Display grocery list
st.subheader("Grocery List")

if not ingredients:
    st.info("No ingredients found in your meal plan.")
else:
    # Group ingredients by category
    categories = {}
    for name, amount in ingredients.items():
        category = ingredient_details.get(name, {}).get('category', 'Other')
        if category not in categories:
            categories[category] = []
        categories[category].append((name, amount))
    
    # Display by category
    for category in sorted(categories.keys()):
        st.markdown(f"**{category}**")
        
        # Create a dataframe for this category
        category_data = []
        for name, amount in sorted(categories[category], key=lambda x: x[0]):
            category_data.append({
                'Ingredient': name,
                'Amount': f"{amount:.0f} g"
            })
        
        # Convert to dataframe and display
        df = pd.DataFrame(category_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
    
    # Generate PDF download button
    pdf_bytes = generate_grocery_pdf(ingredients, ingredient_details)
    
    st.download_button(
        label="Download Grocery List as PDF",
        data=pdf_bytes,
        file_name=f"fitomics_grocery_list_{datetime.now().strftime('%Y-%m-%d')}.pdf",
        mime="application/pdf"
    )
    
    # Grocery delivery integration
    st.subheader("Shop for Ingredients")
    
    delivery_option = st.selectbox(
        "Choose a grocery delivery service:",
        ["Instacart", "Shipt"],
        index=0
    )
    
    if st.button(f"Create Cart in {delivery_option}"):
        st.info(f"Preparing your cart for {delivery_option}...")
        
        # Format cart data for the selected service
        service_name = delivery_option.lower()
        cart_data = format_cart_for_delivery(ingredients, ingredient_details, service=service_name)
        
        # This is where we would integrate with the respective service's API
        # For now, we'll just show a sample of what would be sent
        
        st.success(f"Your cart has been prepared for {delivery_option}!")
        
        # Show a preview of the cart
        st.write("Cart Preview:")
        preview_df = pd.DataFrame([
            {'Item': item['name'], 'Quantity': f"{item['quantity']:.0f} {item['unit']}"}
            for item in cart_data
        ])
        st.dataframe(preview_df, use_container_width=True, hide_index=True)
        
        # In a real implementation, we would provide a direct link to the service with the cart pre-populated
        st.markdown(f"**Note:** To complete your order, please click the button below to go to {delivery_option}.")
        
        if delivery_option == "Instacart":
            st.link_button("Go to Instacart", "https://www.instacart.com")
        else:  # Shipt
            st.link_button("Go to Shipt", "https://www.shipt.com")
        
        st.info("In the future, direct cart integration will be available. For now, you'll need to create your cart manually using the grocery list.")

# Instructions
st.markdown("---")
st.markdown("""
### How to Use This Feature
1. Create your meal plan in the DIY Meal Planning or AI Meal Planning page
2. Come to this page to see your consolidated grocery list
3. Download the PDF for offline use or create a cart in a grocery delivery service
4. When direct integration is available, your cart will be automatically created

Please note that direct integration with Instacart and Shipt requires API access, which will be implemented in a future update.
""")