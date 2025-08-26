"""
Local database of common foods with nutritional information per 100g
This eliminates the need for constant API calls and provides instant food data
"""

COMMON_FOODS = {
    # PROTEINS (per 100g)
    "proteins": {
        "Chicken Breast (raw)": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0},
        "Chicken Breast (cooked)": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0},
        "Chicken Thigh": {"calories": 221, "protein": 26, "carbs": 0, "fat": 13, "fiber": 0},
        "Ground Beef (85/15)": {"calories": 250, "protein": 26, "carbs": 0, "fat": 17, "fiber": 0},
        "Ground Beef (90/10)": {"calories": 200, "protein": 29, "carbs": 0, "fat": 10, "fiber": 0},
        "Ground Turkey (93/7)": {"calories": 150, "protein": 30, "carbs": 0, "fat": 7, "fiber": 0},
        "Salmon": {"calories": 208, "protein": 20, "carbs": 0, "fat": 13, "fiber": 0},
        "Tilapia": {"calories": 128, "protein": 26, "carbs": 0, "fat": 2.7, "fiber": 0},
        "Tuna (canned in water)": {"calories": 116, "protein": 26, "carbs": 0, "fat": 1, "fiber": 0},
        "Eggs (whole)": {"calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0},
        "Egg Whites": {"calories": 52, "protein": 11, "carbs": 0.7, "fat": 0.2, "fiber": 0},
        "Greek Yogurt (non-fat)": {"calories": 59, "protein": 10, "carbs": 3.6, "fat": 0.4, "fiber": 0},
        "Greek Yogurt (2%)": {"calories": 73, "protein": 9.9, "carbs": 3.9, "fat": 2, "fiber": 0},
        "Cottage Cheese (low-fat)": {"calories": 72, "protein": 12, "carbs": 3.4, "fat": 1, "fiber": 0},
        "Whey Protein Powder": {"calories": 400, "protein": 80, "carbs": 10, "fat": 5, "fiber": 0},
        "Tofu (firm)": {"calories": 144, "protein": 17, "carbs": 2, "fat": 8, "fiber": 2},
        "Lentils (cooked)": {"calories": 116, "protein": 9, "carbs": 20, "fat": 0.4, "fiber": 8},
        "Black Beans (cooked)": {"calories": 132, "protein": 9, "carbs": 24, "fat": 0.5, "fiber": 8.7},
        "Chickpeas (cooked)": {"calories": 164, "protein": 9, "carbs": 27, "fat": 2.6, "fiber": 7.6},
        "Edamame": {"calories": 122, "protein": 11, "carbs": 9, "fat": 5, "fiber": 5},
        "Pork Tenderloin": {"calories": 143, "protein": 27, "carbs": 0, "fat": 3.5, "fiber": 0},
        "Shrimp": {"calories": 85, "protein": 20, "carbs": 0, "fat": 0.5, "fiber": 0},
        "Cod": {"calories": 82, "protein": 18, "carbs": 0, "fat": 0.7, "fiber": 0}
    },
    
    # CARBOHYDRATES (per 100g)
    "carbs": {
        "White Rice (cooked)": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4},
        "Brown Rice (cooked)": {"calories": 112, "protein": 2.6, "carbs": 24, "fat": 0.9, "fiber": 1.8},
        "Jasmine Rice (cooked)": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.6},
        "Quinoa (cooked)": {"calories": 120, "protein": 4.4, "carbs": 21, "fat": 1.9, "fiber": 2.8},
        "Oatmeal (cooked)": {"calories": 71, "protein": 2.5, "carbs": 12, "fat": 1.5, "fiber": 1.7},
        "Oats (dry)": {"calories": 389, "protein": 17, "carbs": 66, "fat": 7, "fiber": 11},
        "Sweet Potato": {"calories": 86, "protein": 1.6, "carbs": 20, "fat": 0.1, "fiber": 3},
        "White Potato": {"calories": 77, "protein": 2, "carbs": 17, "fat": 0.1, "fiber": 2.2},
        "Pasta (cooked)": {"calories": 131, "protein": 5, "carbs": 25, "fat": 1.1, "fiber": 1.8},
        "Whole Wheat Pasta (cooked)": {"calories": 124, "protein": 5.3, "carbs": 27, "fat": 0.5, "fiber": 4.5},
        "White Bread": {"calories": 265, "protein": 9, "carbs": 49, "fat": 3.2, "fiber": 2.7},
        "Whole Wheat Bread": {"calories": 247, "protein": 13, "carbs": 41, "fat": 3.4, "fiber": 6.8},
        "Bagel": {"calories": 257, "protein": 10, "carbs": 50, "fat": 1.7, "fiber": 2.1},
        "English Muffin": {"calories": 227, "protein": 8, "carbs": 44, "fat": 1.8, "fiber": 2.5},
        "Rice Cakes": {"calories": 387, "protein": 9, "carbs": 82, "fat": 3, "fiber": 4.2},
        "Corn Tortilla": {"calories": 218, "protein": 6, "carbs": 45, "fat": 3, "fiber": 6.3},
        "Flour Tortilla": {"calories": 312, "protein": 8.5, "carbs": 50, "fat": 8, "fiber": 3},
        "Banana": {"calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fiber": 2.6},
        "Apple": {"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "fiber": 2.4},
        "Blueberries": {"calories": 57, "protein": 0.7, "carbs": 14, "fat": 0.3, "fiber": 2.4},
        "Strawberries": {"calories": 32, "protein": 0.7, "carbs": 8, "fat": 0.3, "fiber": 2},
        "Grapes": {"calories": 69, "protein": 0.7, "carbs": 18, "fat": 0.2, "fiber": 0.9}
    },
    
    # FATS (per 100g)
    "fats": {
        "Olive Oil": {"calories": 884, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0},
        "Coconut Oil": {"calories": 862, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0},
        "Avocado Oil": {"calories": 884, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0},
        "Butter": {"calories": 717, "protein": 0.9, "carbs": 0.1, "fat": 81, "fiber": 0},
        "Avocado": {"calories": 160, "protein": 2, "carbs": 9, "fat": 15, "fiber": 7},
        "Almonds": {"calories": 579, "protein": 21, "carbs": 22, "fat": 50, "fiber": 13},
        "Walnuts": {"calories": 654, "protein": 15, "carbs": 14, "fat": 65, "fiber": 7},
        "Cashews": {"calories": 553, "protein": 18, "carbs": 30, "fat": 44, "fiber": 3.3},
        "Peanuts": {"calories": 567, "protein": 26, "carbs": 16, "fat": 49, "fiber": 9},
        "Peanut Butter": {"calories": 588, "protein": 25, "carbs": 20, "fat": 50, "fiber": 6},
        "Almond Butter": {"calories": 614, "protein": 21, "carbs": 19, "fat": 56, "fiber": 10},
        "Chia Seeds": {"calories": 486, "protein": 17, "carbs": 42, "fat": 31, "fiber": 34},
        "Flax Seeds": {"calories": 534, "protein": 18, "carbs": 29, "fat": 42, "fiber": 27},
        "Sunflower Seeds": {"calories": 584, "protein": 21, "carbs": 20, "fat": 51, "fiber": 9},
        "Cheese (Cheddar)": {"calories": 402, "protein": 25, "carbs": 1.3, "fat": 33, "fiber": 0},
        "Mozzarella (part-skim)": {"calories": 254, "protein": 24, "carbs": 3, "fat": 16, "fiber": 0},
        "Cream Cheese": {"calories": 342, "protein": 6, "carbs": 4, "fat": 34, "fiber": 0},
        "Dark Chocolate (70%)": {"calories": 598, "protein": 8, "carbs": 46, "fat": 43, "fiber": 11},
        "Mayonnaise": {"calories": 680, "protein": 1, "carbs": 0.6, "fat": 75, "fiber": 0}
    },
    
    # VEGETABLES (per 100g)
    "vegetables": {
        "Broccoli": {"calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4, "fiber": 2.6},
        "Spinach": {"calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4, "fiber": 2.2},
        "Kale": {"calories": 49, "protein": 4.3, "carbs": 9, "fat": 0.9, "fiber": 3.6},
        "Lettuce (Romaine)": {"calories": 17, "protein": 1.2, "carbs": 3.3, "fat": 0.3, "fiber": 2.1},
        "Carrots": {"calories": 41, "protein": 0.9, "carbs": 10, "fat": 0.2, "fiber": 2.8},
        "Bell Peppers": {"calories": 31, "protein": 1, "carbs": 6, "fat": 0.3, "fiber": 2.1},
        "Tomatoes": {"calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2},
        "Cucumber": {"calories": 16, "protein": 0.7, "carbs": 3.6, "fat": 0.1, "fiber": 0.5},
        "Asparagus": {"calories": 20, "protein": 2.2, "carbs": 3.9, "fat": 0.1, "fiber": 2.1},
        "Green Beans": {"calories": 31, "protein": 1.8, "carbs": 7, "fat": 0.2, "fiber": 2.7},
        "Brussels Sprouts": {"calories": 43, "protein": 3.4, "carbs": 9, "fat": 0.3, "fiber": 3.8},
        "Cauliflower": {"calories": 25, "protein": 1.9, "carbs": 5, "fat": 0.3, "fiber": 2},
        "Zucchini": {"calories": 17, "protein": 1.2, "carbs": 3.1, "fat": 0.3, "fiber": 1},
        "Mushrooms": {"calories": 22, "protein": 3.1, "carbs": 3.3, "fat": 0.3, "fiber": 1},
        "Onions": {"calories": 40, "protein": 1.1, "carbs": 9, "fat": 0.1, "fiber": 1.7},
        "Celery": {"calories": 16, "protein": 0.7, "carbs": 3, "fat": 0.2, "fiber": 1.6}
    },
    
    # DAIRY & ALTERNATIVES (per 100g)
    "dairy": {
        "Milk (whole)": {"calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3, "fiber": 0},
        "Milk (2%)": {"calories": 50, "protein": 3.3, "carbs": 4.8, "fat": 2, "fiber": 0},
        "Milk (skim)": {"calories": 34, "protein": 3.4, "carbs": 5, "fat": 0.1, "fiber": 0},
        "Almond Milk": {"calories": 17, "protein": 0.6, "carbs": 0.7, "fat": 1.5, "fiber": 0.2},
        "Soy Milk": {"calories": 54, "protein": 3.3, "carbs": 6, "fat": 1.8, "fiber": 0.5},
        "Oat Milk": {"calories": 48, "protein": 1.5, "carbs": 7, "fat": 1.5, "fiber": 0.8},
        "Heavy Cream": {"calories": 345, "protein": 2.8, "carbs": 2.8, "fat": 37, "fiber": 0}
    }
}

def get_food_by_category(category):
    """Get all foods in a specific category"""
    return COMMON_FOODS.get(category, {})

def get_all_foods():
    """Get all foods from all categories as a flat dictionary"""
    all_foods = {}
    for category in COMMON_FOODS.values():
        all_foods.update(category)
    return all_foods

def calculate_nutrition_for_amount(food_name, amount_grams):
    """
    Calculate nutrition for a specific amount of food
    
    Parameters:
    food_name (str): Name of the food item
    amount_grams (float): Amount in grams
    
    Returns:
    dict: Scaled nutritional information
    """
    all_foods = get_all_foods()
    
    if food_name not in all_foods:
        return None
    
    food_data = all_foods[food_name]
    scale_factor = amount_grams / 100.0
    
    return {
        "calories": round(food_data["calories"] * scale_factor, 1),
        "protein": round(food_data["protein"] * scale_factor, 1),
        "carbs": round(food_data["carbs"] * scale_factor, 1),
        "fat": round(food_data["fat"] * scale_factor, 1),
        "fiber": round(food_data["fiber"] * scale_factor, 1)
    }

def search_foods(query, category=None):
    """
    Search for foods by name
    
    Parameters:
    query (str): Search query
    category (str): Optional category to limit search
    
    Returns:
    list: List of matching food names
    """
    query_lower = query.lower()
    
    if category:
        foods = COMMON_FOODS.get(category, {})
    else:
        foods = get_all_foods()
    
    matches = []
    for food_name in foods.keys():
        if query_lower in food_name.lower():
            matches.append(food_name)
    
    return sorted(matches)

def get_foods_by_macro_profile(primary_macro="protein", min_ratio=0.4):
    """
    Get foods that are high in a specific macronutrient
    
    Parameters:
    primary_macro (str): "protein", "carbs", or "fat"
    min_ratio (float): Minimum ratio of calories from the primary macro
    
    Returns:
    list: List of food names that meet the criteria
    """
    all_foods = get_all_foods()
    matching_foods = []
    
    for food_name, nutrition in all_foods.items():
        if nutrition["calories"] == 0:
            continue
            
        if primary_macro == "protein":
            macro_calories = nutrition["protein"] * 4
        elif primary_macro == "carbs":
            macro_calories = nutrition["carbs"] * 4
        elif primary_macro == "fat":
            macro_calories = nutrition["fat"] * 9
        else:
            continue
        
        ratio = macro_calories / nutrition["calories"]
        
        if ratio >= min_ratio:
            matching_foods.append({
                "name": food_name,
                "ratio": round(ratio, 2),
                "nutrition": nutrition
            })
    
    return sorted(matching_foods, key=lambda x: x["ratio"], reverse=True)