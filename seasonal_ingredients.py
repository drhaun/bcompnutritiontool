"""
Seasonal Ingredients Module for Enhanced Meal Planning
Provides seasonal ingredient recommendations and micronutrient optimization
"""

from datetime import datetime
import json

def get_current_season():
    """Get current season based on current date"""
    month = datetime.now().month
    if month in [12, 1, 2]:
        return "Winter"
    elif month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    else:
        return "Fall"

def get_seasonal_ingredients(season=None):
    """Get seasonal ingredients for a specific season"""
    if season is None:
        season = get_current_season()
    
    seasonal_data = {
        "Spring": {
            "vegetables": [
                "Asparagus", "Artichokes", "Peas", "Snap Peas", "Radishes",
                "Spring Onions", "Lettuce", "Spinach", "Arugula", "Fennel",
                "Leeks", "Carrots", "Beets", "Turnips"
            ],
            "fruits": [
                "Strawberries", "Apricots", "Rhubarb", "Pineapple",
                "Avocados", "Mangoes", "Kiwi"
            ],
            "benefits": "High in detoxifying compounds, vitamin C, and fiber for spring cleansing"
        },
        "Summer": {
            "vegetables": [
                "Tomatoes", "Corn", "Zucchini", "Bell Peppers", "Cucumbers",
                "Eggplant", "Okra", "Green Beans", "Lima Beans", "Basil",
                "Cilantro", "Parsley", "Mint"
            ],
            "fruits": [
                "Berries", "Peaches", "Nectarines", "Plums", "Cherries",
                "Watermelon", "Cantaloupe", "Grapes", "Blackberries",
                "Blueberries", "Raspberries"
            ],
            "benefits": "High in antioxidants, vitamin C, and hydrating compounds for summer heat"
        },
        "Fall": {
            "vegetables": [
                "Squash", "Pumpkin", "Sweet Potatoes", "Brussels Sprouts",
                "Cauliflower", "Broccoli", "Cabbage", "Kale", "Collard Greens",
                "Parsnips", "Turnips", "Rutabaga", "Onions"
            ],
            "fruits": [
                "Apples", "Pears", "Cranberries", "Pomegranates",
                "Persimmons", "Figs", "Grapes"
            ],
            "benefits": "Rich in beta-carotene, vitamin A, and warming compounds for immune support"
        },
        "Winter": {
            "vegetables": [
                "Citrus", "Cabbage", "Brussels Sprouts", "Kale", "Collard Greens",
                "Leeks", "Potatoes", "Sweet Potatoes", "Carrots", "Beets",
                "Parsnips", "Turnips", "Winter Squash"
            ],
            "fruits": [
                "Oranges", "Grapefruits", "Lemons", "Limes", "Tangerines",
                "Pomegranates", "Persimmons", "Pears", "Apples"
            ],
            "benefits": "High in vitamin C, immune-supporting compounds, and warming nutrients"
        }
    }
    
    return seasonal_data.get(season, seasonal_data["Spring"])

def get_micronutrient_rich_foods(nutrients):
    """Get foods rich in specific micronutrients"""
    nutrient_sources = {
        "Vitamin D": [
            "Fatty Fish (Salmon, Mackerel, Sardines)", "Egg Yolks", "Fortified Dairy",
            "Mushrooms", "Fortified Cereals"
        ],
        "Vitamin B12": [
            "Lean Beef", "Salmon", "Tuna", "Eggs", "Greek Yogurt",
            "Nutritional Yeast", "Fortified Plant Milks"
        ],
        "Iron": [
            "Lean Red Meat", "Chicken Thighs", "Spinach", "Lentils",
            "Chickpeas", "Quinoa", "Pumpkin Seeds", "Dark Chocolate"
        ],
        "Calcium": [
            "Dairy Products", "Leafy Greens", "Canned Salmon with Bones",
            "Almonds", "Tahini", "Fortified Plant Milks", "Broccoli"
        ],
        "Magnesium": [
            "Nuts", "Seeds", "Whole Grains", "Leafy Greens",
            "Dark Chocolate", "Avocados", "Legumes"
        ],
        "Zinc": [
            "Oysters", "Beef", "Pumpkin Seeds", "Chickpeas",
            "Cashews", "Hemp Seeds", "Greek Yogurt"
        ],
        "Omega-3 Fatty Acids": [
            "Fatty Fish", "Walnuts", "Flaxseeds", "Chia Seeds",
            "Hemp Seeds", "Algae Oil", "Sardines"
        ],
        "Vitamin C": [
            "Citrus Fruits", "Bell Peppers", "Strawberries", "Kiwi",
            "Broccoli", "Brussels Sprouts", "Tomatoes"
        ],
        "Vitamin A": [
            "Sweet Potatoes", "Carrots", "Spinach", "Kale",
            "Cantaloupe", "Apricots", "Liver"
        ],
        "Folate": [
            "Leafy Greens", "Legumes", "Asparagus", "Avocados",
            "Fortified Grains", "Citrus Fruits"
        ],
        "Potassium": [
            "Bananas", "Sweet Potatoes", "Spinach", "Avocados",
            "White Beans", "Yogurt", "Salmon"
        ],
        "Vitamin K": [
            "Leafy Greens", "Broccoli", "Brussels Sprouts", "Cabbage",
            "Fermented Foods", "Herbs"
        ],
        "Antioxidants": [
            "Berries", "Dark Chocolate", "Green Tea", "Colorful Vegetables",
            "Nuts", "Seeds", "Herbs and Spices"
        ],
        "Fiber": [
            "Vegetables", "Fruits", "Whole Grains", "Legumes",
            "Nuts", "Seeds", "Avocados"
        ],
        "Probiotics": [
            "Greek Yogurt", "Kefir", "Sauerkraut", "Kimchi",
            "Miso", "Tempeh", "Kombucha"
        ]
    }
    
    recommended_foods = []
    for nutrient in nutrients:
        if nutrient in nutrient_sources:
            recommended_foods.extend(nutrient_sources[nutrient])
    
    # Remove duplicates while preserving order
    return list(dict.fromkeys(recommended_foods))

def get_meal_prep_coordination_tips(coordination_level):
    """Get meal prep coordination tips based on user preference"""
    tips = {
        "Minimal - Each meal independent": {
            "approach": "Individual meal preparation",
            "tips": [
                "Prepare each meal separately",
                "Focus on quick, single-serving recipes",
                "Keep ingredients simple and fresh"
            ]
        },
        "Some coordination - Share ingredients across meals": {
            "approach": "Ingredient overlap optimization",
            "tips": [
                "Use base ingredients across multiple meals",
                "Prep vegetables once for multiple uses",
                "Cook grains in bulk for the week",
                "Use similar proteins with different seasonings"
            ]
        },
        "High coordination - Batch cooking optimization": {
            "approach": "Batch cooking and component prep",
            "tips": [
                "Cook proteins in large batches",
                "Prepare grain and vegetable components ahead",
                "Use slow cooker and sheet pan methods",
                "Portion meals into containers for easy access"
            ]
        },
        "Maximum - Full weekly prep planning": {
            "approach": "Complete weekly meal prep system",
            "tips": [
                "Dedicate time for full weekly meal prep",
                "Use systematic container organization",
                "Prepare complete meals ready to reheat",
                "Create detailed prep schedules and shopping lists"
            ]
        }
    }
    
    return tips.get(coordination_level, tips["Some coordination - Share ingredients across meals"])

def get_location_based_suggestions(zip_code, restaurants, grocery_stores):
    """Get location-based meal suggestions (placeholder for future API integration)"""
    suggestions = {
        "restaurants": [],
        "grocery_stores": [],
        "convenience_options": []
    }
    
    # Placeholder implementation - in the future, this would integrate with:
    # - Google Places API for restaurant discovery
    # - DoorDash API for menu and macro information
    # - Grocery store APIs for ingredient availability
    
    for restaurant in restaurants:
        suggestions["restaurants"].append({
            "name": restaurant,
            "macro_friendly_options": "Available upon API integration",
            "estimated_distance": "API integration needed"
        })
    
    for store in grocery_stores:
        suggestions["grocery_stores"].append({
            "name": store,
            "seasonal_availability": "API integration needed",
            "estimated_distance": "API integration needed"
        })
    
    return suggestions

def get_ingredient_substitutions(original_ingredient, dietary_restrictions=None):
    """Get ingredient substitutions based on dietary restrictions and preferences"""
    substitutions = {
        "chicken_breast": {
            "vegetarian": ["Tofu", "Tempeh", "Seitan"],
            "vegan": ["Tofu", "Tempeh", "Seitan", "Lentils"],
            "pescatarian": ["White Fish", "Salmon", "Shrimp"],
            "general": ["Turkey Breast", "Lean Beef", "Pork Tenderloin"]
        },
        "dairy_milk": {
            "lactose_free": ["Lactose-Free Milk", "Almond Milk", "Oat Milk"],
            "vegan": ["Almond Milk", "Oat Milk", "Soy Milk", "Coconut Milk"],
            "general": ["Whole Milk", "2% Milk", "Skim Milk"]
        },
        "wheat_flour": {
            "gluten_free": ["Almond Flour", "Oat Flour", "Rice Flour", "Coconut Flour"],
            "general": ["Whole Wheat Flour", "All-Purpose Flour", "Bread Flour"]
        },
        "eggs": {
            "vegan": ["Flax Eggs", "Chia Eggs", "Applesauce", "Aquafaba"],
            "general": ["Egg Whites", "Whole Eggs", "Egg Substitutes"]
        }
    }
    
    # This would be expanded with more comprehensive substitution logic
    ingredient_key = original_ingredient.lower().replace(" ", "_")
    
    if ingredient_key in substitutions:
        if dietary_restrictions:
            for restriction in dietary_restrictions:
                if restriction.lower() in substitutions[ingredient_key]:
                    return substitutions[ingredient_key][restriction.lower()]
        return substitutions[ingredient_key]["general"]
    
    return [original_ingredient]  # Return original if no substitutions available

def enhance_meal_plan_with_seasonal_micronutrients(meal_plan, preferences):
    """Enhance meal plan with seasonal and micronutrient considerations"""
    enhanced_plan = meal_plan.copy()
    
    # Get seasonal ingredients
    current_season = preferences.get('current_season', 'Auto-detect')
    if current_season == 'Auto-detect':
        current_season = get_current_season()
    
    seasonal_ingredients = get_seasonal_ingredients(current_season)
    
    # Get micronutrient-rich foods
    micronutrient_focus = preferences.get('micronutrient_focus', [])
    nutrient_rich_foods = get_micronutrient_rich_foods(micronutrient_focus)
    
    # Get meal prep coordination tips
    coordination_level = preferences.get('meal_prep_coordination', 'Some coordination')
    prep_tips = get_meal_prep_coordination_tips(coordination_level)
    
    # Add enhancement metadata
    enhanced_plan['seasonal_context'] = {
        'current_season': current_season,
        'seasonal_ingredients': seasonal_ingredients,
        'seasonal_benefits': seasonal_ingredients.get('benefits', '')
    }
    
    enhanced_plan['micronutrient_optimization'] = {
        'focus_nutrients': micronutrient_focus,
        'recommended_foods': nutrient_rich_foods[:10]  # Top 10 recommendations
    }
    
    enhanced_plan['meal_prep_guidance'] = prep_tips
    
    return enhanced_plan