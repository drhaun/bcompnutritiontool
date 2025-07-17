import streamlit as st
import pandas as pd
import json
import os
from datetime import datetime, time, date
import copy

# Import our modules
import utils
import fdc_api
import macro_validator
from nutrition_cache import NutritionCache
from pdf_export import export_meal_plan_pdf

# OpenAI Integration
def get_openai_client():
    """Get OpenAI client if API key is available"""
    try:
        import openai
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return openai.OpenAI(api_key=api_key)
    except ImportError:
        pass
    return None

def generate_standalone_meal_plan(daily_totals, diet_preferences, meal_config, openai_client, meal_targets=None):
    """Generate complete AI meal plan using OpenAI for standalone mode"""
    try:
        user_profile = meal_config.get('user_profile', {})
        
        # Build comprehensive prompt with enhanced context
        prompt = f"""
Create a complete daily meal plan with the following specifications:

USER PROFILE:
- Name: {user_profile.get('name', 'User')}
- Age: {user_profile.get('age', 'N/A')} years
- Gender: {user_profile.get('gender', 'N/A')}
- Weight: {user_profile.get('weight_kg', 'N/A')} kg
- Height: {user_profile.get('height_cm', 'N/A')} cm
- Body Fat: {user_profile.get('body_fat_pct', 'N/A')}%
- TDEE: {user_profile.get('tdee', 'N/A')} calories
- Goal: {user_profile.get('goal_type', 'N/A')}

NUTRITION TARGETS:
{json.dumps(daily_totals, indent=2)}

DIETARY PREFERENCES & RESTRICTIONS:
- Dietary restrictions: {diet_preferences.get('dietary_restrictions', [])}
- Food allergies: {diet_preferences.get('food_allergies', 'None')} (STRICTLY AVOID - SAFETY CRITICAL)
- Disliked foods: {diet_preferences.get('disliked_foods', [])}
- Cuisine preferences: {diet_preferences.get('cuisine_preferences', [])}
- Preferred proteins: {diet_preferences.get('proteins', [])}
- Preferred carbs: {diet_preferences.get('carbs', [])}
- Preferred fats: {diet_preferences.get('fats', [])}
- Spice level: {diet_preferences.get('spice_level', 'Medium')}
- Flavor profiles: {diet_preferences.get('flavor_profiles', [])}
- Cooking style: {diet_preferences.get('cooking_style', 'N/A')}
- Meal variety: {diet_preferences.get('meal_variety', 'Some variety')}
- Cooking time preference: {diet_preferences.get('cooking_time_preference', 'Medium (30-60 min)')}
- Budget preference: {diet_preferences.get('budget_preference', 'Moderate')}
- Cooking for: {diet_preferences.get('cooking_for', 'Just myself')}
- Leftovers preference: {diet_preferences.get('leftovers_preference', 'Okay with leftovers occasionally')}
- Meal prep interest: {diet_preferences.get('meal_prep_interest', 'Some meal prep')}

SUPPLEMENTATION PREFERENCES:
- Creatine: {diet_preferences.get('supplementation_preferences', {}).get('creatine', 'Not interested')}
- Protein powder: {diet_preferences.get('supplementation_preferences', {}).get('protein_powder', 'Not interested')}
- Pre-workout: {diet_preferences.get('supplementation_preferences', {}).get('pre_workout', 'Not interested')}
- Multivitamin: {diet_preferences.get('supplementation_preferences', {}).get('multivitamin', 'Not interested')}
- Omega-3: {diet_preferences.get('supplementation_preferences', {}).get('omega3', 'Not interested')}
- Vitamin D: {diet_preferences.get('supplementation_preferences', {}).get('vitamin_d', 'Not interested')}
- Other supplements: {', '.join(diet_preferences.get('supplementation_preferences', {}).get('other_supplements', [])[:3])}

SEASONING & FLAVOR PREFERENCES:
- Preferred seasonings: {', '.join(diet_preferences.get('preferred_seasonings', [])[:8])}
- Cooking enhancers: {', '.join(diet_preferences.get('cooking_enhancers', [])[:8])}
- Flavor profiles: {', '.join(diet_preferences.get('flavor_profile', [])[:5])}

MEAL SOURCING PREFERENCES:
- Meal delivery interest: {diet_preferences.get('meal_delivery_interest', 'Moderate')}
- Home cooking interest: {diet_preferences.get('home_cooking_interest', 'High')}
- Grocery shopping interest: {diet_preferences.get('grocery_shopping_interest', 'High')}

VARIETY PREFERENCES:
- Variety level: {diet_preferences.get('variety_level', 'Moderate Variety')}
- Repetition preference: {diet_preferences.get('repetition_preference', 'I like some repetition but with variations')}
- Weekly structure: {diet_preferences.get('weekly_structure', 'Mix of routine and variety')}
- Cooking variety: {diet_preferences.get('cooking_variety', 'Some variety in cooking methods')}

LOCATION-BASED PREFERENCES:
- Primary Location: {diet_preferences.get('primary_zip', 'Not specified')}
- Work Location: {diet_preferences.get('work_zip', 'Not specified')}  
- Travel Routes: {diet_preferences.get('travel_routes', 'Not specified')}
- Favorite Restaurants: {diet_preferences.get('favorite_restaurants', 'Not specified')}
- Favorite Grocery Stores: {diet_preferences.get('favorite_grocery_stores', 'Not specified')}
- Convenience Stores: {diet_preferences.get('convenience_stores', 'Not specified')}
- Current Season: {diet_preferences.get('current_season', 'Summer')}
- Seasonal Ingredients: {', '.join(diet_preferences.get('seasonal_ingredients', []))}

ENHANCED PREFERENCES:
- Micronutrient Focus: {', '.join(diet_preferences.get('enhanced_preferences', {}).get('micronutrient_focus', [])[:5])}
- Seasonal Ingredients: {diet_preferences.get('enhanced_preferences', {}).get('seasonal_ingredients', True)}
- Current Season: {diet_preferences.get('enhanced_preferences', {}).get('current_season', 'Auto-detect')}
- Ingredient Substitutions: {diet_preferences.get('enhanced_preferences', {}).get('ingredient_substitutions', True)}
- Meal Prep Coordination: {diet_preferences.get('enhanced_preferences', {}).get('meal_prep_coordination', 'Some coordination')}

DAILY SCHEDULE:
- Wake time: {meal_config.get('wake_time', '07:00')}
- Sleep time: {meal_config.get('sleep_time', '23:00')}
- Has workout: {meal_config.get('has_workout', False)}
- Workout details: {meal_config.get('workout_details', [])}
- Pre-workout preference: {meal_config.get('pre_workout_preference', 'N/A')}
- Post-workout preference: {meal_config.get('post_workout_preference', 'N/A')}
- Number of meals: {meal_config.get('num_meals', 3)}
- Number of snacks: {meal_config.get('num_snacks', 1)}
- Day activity level: {meal_config.get('day_activity', 'N/A')}
- Meal contexts: {meal_config.get('meal_contexts', {})}

REQUIREMENTS:
1. Create realistic meals with specific food items and portions
2. Accurate macro calculations matching targets (±3% tolerance)
3. Practical cooking instructions with timing
4. **WORKOUT PROXIMITY MEAL TIMING (CRITICAL)**:
   - If workout is scheduled, optimize meal timing and composition around training
   - PRE-WORKOUT (1-2 hours before): Moderate protein, moderate-high carbs, LOW fat, LOW fiber
   - POST-WORKOUT (within 1 hour): High protein, high carbs, moderate fat, avoid high-fiber foods
   - DURING WORKOUT WINDOW (±1 hour): Avoid large meals, prefer liquid/easily digestible options
   - FASTED TRAINING: If user allows, provide post-workout recovery meal emphasis
   - Consider workout type (cardio vs strength) for carb timing and amounts
5. Use preferred ingredients and respect dietary restrictions
6. Match cooking style and spice preferences
7. Consider budget and cooking time preferences
8. Optimize for the specified meal context and variety level
9. **ENHANCED NUTRITIONAL OPTIMIZATION**:
   - Micronutrient Focus: {', '.join(diet_preferences.get('enhanced_preferences', {}).get('micronutrient_focus', [])[:5])} - prioritize foods rich in these nutrients
   - Seasonal Ingredients: {diet_preferences.get('enhanced_preferences', {}).get('seasonal_ingredients', True)} - use seasonal produce when available
   - Current Season: {diet_preferences.get('enhanced_preferences', {}).get('current_season', 'Auto-detect')} - adjust ingredient selections accordingly
   - Ingredient Substitutions: {diet_preferences.get('enhanced_preferences', {}).get('ingredient_substitutions', True)} - offer alternatives when appropriate
   - Meal Prep Coordination: {diet_preferences.get('enhanced_preferences', {}).get('meal_prep_coordination', 'Some coordination - Share ingredients across meals')} - coordinate ingredients across meals
10. **LOCATION-BASED MEAL SOURCING**:
    - Primary Location: {diet_preferences.get('primary_zip', 'Not specified')}
    - Work Location: {diet_preferences.get('work_zip', 'Not specified')}
    - When location information is provided:
      * Suggest specific restaurants from favorite list: {diet_preferences.get('favorite_restaurants', 'Not specified')}
      * Recommend macro-friendly menu options from these restaurants
      * Include grocery store suggestions: {diet_preferences.get('favorite_grocery_stores', 'Not specified')}
      * Consider convenience store options for on-the-go meals: {diet_preferences.get('convenience_stores', 'Not specified')}
      * Account for travel routes: {diet_preferences.get('travel_routes', 'Not specified')}
      * Use seasonal ingredients based on current season: {diet_preferences.get('current_season', 'Summer')}
      * Focus on seasonal produce: {', '.join(diet_preferences.get('seasonal_ingredients', []))}

**MANDATORY JSON FORMAT** - Follow this structure exactly:
{{
  "profile_summary": "Brief explanation of how user's preferences influenced this meal plan (dietary restrictions, favorite foods, workout timing, etc.)",
  "workout_annotations": {{
    "has_workout": true/false,
    "workout_details": "time and type of workout if applicable",
    "peri_workout_meals": [
      {{
        "meal_name": "name of meal",
        "timing": "pre-workout/post-workout/during",
        "optimization": "how this meal is optimized for workout performance"
      }}
    ]
  }},
  "meals": [
    {{
      "meal_type": "breakfast/lunch/dinner/snack",
      "name": "Descriptive meal name (e.g., 'Protein-Packed Breakfast Bowl', 'Post-Workout Recovery Lunch')",
      "timing": "suggested time",
      "context": "context description",
      "workout_annotation": "PRE-WORKOUT/POST-WORKOUT/REGULAR (if applicable)",
      "ingredients": [
        {{"item": "specific food name", "amount": "exact quantity with unit", "calories": precise_number, "protein": precise_number, "carbs": precise_number, "fat": precise_number}}
      ],
      "instructions": "Clear step-by-step preparation instructions (no numbering issues)",
      "total_macros": {{"calories": sum_of_ingredient_calories, "protein": sum_of_ingredient_protein, "carbs": sum_of_ingredient_carbs, "fat": sum_of_ingredient_fat}},
      "meal_targets": {{"calories": individual_meal_target_calories, "protein": individual_meal_target_protein, "carbs": individual_meal_target_carbs, "fat": individual_meal_target_fat}},
      "accuracy_check": {{"calories": "±X%", "protein": "±X%", "carbs": "±X%", "fat": "±X%"}}
    }}
  ],
  "daily_totals": {{"calories": sum_of_all_meal_calories, "protein": sum_of_all_meal_protein, "carbs": sum_of_all_meal_carbs, "fat": sum_of_all_meal_fat}},
  "daily_targets": {{"calories": target_calories, "protein": target_protein, "carbs": target_carbs, "fat": target_fat}},
  "accuracy_summary": {{"calories": "±X%", "protein": "±X%", "carbs": "±X%", "fat": "±X%"}},
  "grocery_ingredients": [
    {{"item": "ingredient name", "total_amount": "total quantity needed", "category": "protein/carbs/fats/vegetables/seasonings"}}
  ],
  "location_recommendations": {{
    "restaurant_options": [
      {{"restaurant": "name from favorite list", "menu_item": "macro-friendly option", "macros": "approximate macros"}}
    ],
    "grocery_stores": [
      {{"store": "name from favorite list", "shopping_tips": "specific tips for this store"}}
    ],
    "convenience_options": [
      {{"store": "name from favorite list", "quick_options": "portable/quick meal options"}}
    ]
  }}
}}

**CRITICAL ACCURACY REQUIREMENTS - MUST BE FOLLOWED**:
1. Daily totals MUST be within ±1% of daily targets (not ±3% or higher) - EXTREMELY STRICT
2. If any macro is outside ±1%, INCREASE ingredient portions significantly or add calorie-dense ingredients
3. Use PRECISE serving sizes in grams/ounces when possible (e.g., "150g chicken breast" not "1 chicken breast")
4. Verify nutritional calculations using standard USDA values for each ingredient
5. For protein: Use 6-8oz portions of meat/fish, add protein powder, Greek yogurt, eggs
6. For carbs: Use specific amounts (e.g., "200g cooked rice", "80g oats", "2 medium bananas")
7. For fats: Use precise amounts (e.g., "15ml olive oil", "30g almonds", "1/2 medium avocado")
8. Calculate each ingredient's macros individually and sum them accurately
9. Include profile summary explaining how user preferences influenced meal selections
10. Add workout annotations showing pre/post-workout meal optimizations
11. Use descriptive meal names that reflect the actual recipe content
12. Provide clear, step-by-step cooking instructions with cooking times
13. Organize grocery ingredients by category for easy shopping
14. Show individual meal targets vs actual to demonstrate precision
"""

        # Add location-based context if enabled
        location_context = ""
        if diet_preferences.get('location_based_preferences', {}).get('enable_location_features', False):
            location_prefs = diet_preferences['location_based_preferences']
            if location_prefs.get('primary_zip_code'):
                location_context += f"\n**LOCATION-BASED PREFERENCES**:\n"
                location_context += f"- Primary Location: {location_prefs['primary_zip_code']}\n"
                if location_prefs.get('work_zip_code'):
                    location_context += f"- Work Location: {location_prefs['work_zip_code']}\n"
                if location_prefs.get('favorite_restaurants'):
                    location_context += f"- Favorite Restaurants: {', '.join(location_prefs['favorite_restaurants'])}\n"
                if location_prefs.get('favorite_grocery_stores'):
                    location_context += f"- Favorite Grocery Stores: {', '.join(location_prefs['favorite_grocery_stores'])}\n"
                if location_prefs.get('convenience_stores'):
                    location_context += f"- Convenience Stores: {', '.join(location_prefs['convenience_stores'])}\n"
                location_context += f"- IMPORTANT: Include location_recommendations in your JSON response with specific restaurant menu items from the user's favorite restaurants that match their macro targets\n"
        
        # Add seasonal context
        seasonal_context = ""
        if diet_preferences.get('enhanced_preferences', {}).get('seasonal_ingredients', False):
            enhanced_prefs = diet_preferences['enhanced_preferences']
            seasonal_context += f"\n**SEASONAL PREFERENCES**:\n"
            seasonal_context += f"- Current Season: {enhanced_prefs.get('current_season', 'Auto-detect')}\n"
            if enhanced_prefs.get('preferred_produce_seasons'):
                seasonal_context += f"- Preferred Seasonal Produce: {', '.join(enhanced_prefs['preferred_produce_seasons'])}\n"
            seasonal_context += f"- Use seasonal ingredients appropriate for the current season\n"

        # Add specific macro targets with enhanced precision requirements
        enhanced_prompt = f"""
**MACRO TARGETS - MUST HIT EXACTLY (±1% tolerance MAXIMUM)**:
- Calories: {daily_totals['calories']} (Acceptable range: {daily_totals['calories'] * 0.99:.0f} - {daily_totals['calories'] * 1.01:.0f})
- Protein: {daily_totals['protein']}g (Acceptable range: {daily_totals['protein'] * 0.99:.0f} - {daily_totals['protein'] * 1.01:.0f}g)
- Carbs: {daily_totals['carbs']}g (Acceptable range: {daily_totals['carbs'] * 0.99:.0f} - {daily_totals['carbs'] * 1.01:.0f}g)
- Fat: {daily_totals['fat']}g (Acceptable range: {daily_totals['fat'] * 0.99:.0f} - {daily_totals['fat'] * 1.01:.0f}g)

**PRECISE PORTION SIZE GUIDELINES**:
- For {daily_totals['calories']} calories: Calculate exact portions using calorie-dense ingredients
- For {daily_totals['protein']}g protein: Use precise meat weights (170g chicken breast = 31g protein)
- For {daily_totals['carbs']}g carbs: Use specific amounts (100g cooked rice = 28g carbs)
- For {daily_totals['fat']}g fat: Use exact measurements (15ml olive oil = 14g fat)

**PRECISION CALCULATION REQUIREMENTS**:
- Each ingredient must specify exact weight/volume (e.g., "150g chicken breast", "200g cooked rice", "15ml olive oil")
- Use USDA nutritional database values for accuracy
- Calculate macros per 100g for each ingredient, then scale to portion size
- Show your calculation work for each ingredient
- Sum all individual ingredient macros to verify totals
- If total is outside ±1% range, adjust portions immediately

{location_context}
{seasonal_context}

{prompt}
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {"role": "system", "content": "You are a professional nutritionist and meal planning expert with expertise in precise macro calculations. You MUST create meal plans that exactly match the specified macro targets within ±1% tolerance. If the calculated totals are below targets, you MUST increase ingredient portions aggressively. Add oils, nuts, larger protein portions, and calorie-dense ingredients to hit the exact targets. NEVER submit a meal plan below the target ranges. Prioritize macro accuracy above all other considerations."},
                {"role": "user", "content": enhanced_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,  # Lower temperature for more consistent calculations
            max_tokens=4000  # Increased for more detailed responses and validation
        )
        
        meal_plan = json.loads(response.choices[0].message.content)
        
        # Validate macro accuracy and regenerate if needed
        max_attempts = 3
        for attempt in range(max_attempts):
            if validate_standalone_meal_plan_accuracy(meal_plan, daily_totals):
                return meal_plan
            else:
                if attempt < max_attempts - 1:
                    st.warning(f"⚠️ Attempt {attempt + 1}: Macro accuracy insufficient. Regenerating...")
                    # Add stronger requirement in follow-up prompt
                    correction_prompt = f"""
                    CRITICAL: The previous meal plan had macro accuracy issues. You MUST hit these exact targets:
                    - Calories: {daily_totals['calories']} (±1% = {daily_totals['calories'] * 0.99:.0f} - {daily_totals['calories'] * 1.01:.0f})
                    - Protein: {daily_totals['protein']}g (±1% = {daily_totals['protein'] * 0.99:.0f} - {daily_totals['protein'] * 1.01:.0f}g)
                    - Carbs: {daily_totals['carbs']}g (±1% = {daily_totals['carbs'] * 0.99:.0f} - {daily_totals['carbs'] * 1.01:.0f}g)
                    - Fat: {daily_totals['fat']}g (±1% = {daily_totals['fat'] * 0.99:.0f} - {daily_totals['fat'] * 1.01:.0f}g)
                    
                    INCREASE PORTION SIZES AGGRESSIVELY. Add more oil, nuts, protein powder, larger meat portions.
                    
                    {enhanced_prompt}
                    """
                    
                    response = openai_client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {"role": "system", "content": "You are a professional nutritionist. You MUST create meal plans within ±1% of targets. If below targets, INCREASE portions aggressively. Use calorie-dense ingredients: oils, nuts, protein powder, large meat portions. NEVER submit plans below target ranges."},
                            {"role": "user", "content": correction_prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.05,  # Even lower temperature for precision
                        max_tokens=4000
                    )
                    meal_plan = json.loads(response.choices[0].message.content)
                else:
                    st.error("⚠️ Unable to generate meal plan with sufficient macro accuracy after 3 attempts.")
                    return meal_plan
        
        return meal_plan
            
    except Exception as e:
        st.error(f"AI meal generation failed: {e}")
        return None

def validate_standalone_meal_plan_accuracy(meal_plan, target_totals):
    """Validate that generated meal plan matches targets within acceptable tolerance"""
    try:
        # Extract daily totals from generated plan
        generated_totals = meal_plan.get('daily_totals', {})
        
        # Define strict tolerance (1%)
        tolerance = 0.01
        
        # Check each macro
        macros = ['calories', 'protein', 'carbs', 'fat']
        accuracy_issues = []
        
        for macro in macros:
            generated = generated_totals.get(macro, 0)
            target = target_totals.get(macro, 0)
            
            if target > 0:
                deviation = abs(generated - target) / target
                if deviation > tolerance:
                    accuracy_issues.append(f"{macro}: {generated} vs {target} (±{deviation:.1%})")
        
        if accuracy_issues:
            print(f"⚠️ Standalone meal plan macro accuracy issues (±1% tolerance):")
            for issue in accuracy_issues:
                print(f"  - {issue}")
            return False
        else:
            print(f"✅ Standalone meal plan macro accuracy validated (±1% tolerance)")
            return True
            
    except Exception as e:
        print(f"⚠️ Error validating standalone meal plan: {e}")
        return False

# Set page config
st.set_page_config(
    page_title="Fitomics - Daily Meal Planner",
    page_icon="🍽️",
    layout="wide"
)

# Header
try:
    st.image("images/fitomicshorizontalgold.png", width=300)
except:
    st.title("Fitomics")

st.title("🍽️ Daily AI Meal Planner")
st.markdown("""
Create a personalized daily meal plan in minutes! This standalone planner calculates your nutrition needs and generates AI-powered meal recommendations tailored to your preferences and schedule.

**Perfect for:** Daily meal planning, trying new recipes, or creating one-off meal plans without the full body composition workflow.
""")

# Initialize session state for this page
if 'generated_standalone_plan' not in st.session_state:
    st.session_state.generated_standalone_plan = None

# Step 1: Personal Information (for calculations)
st.markdown("## 👤 Personal Information")
st.markdown("*Basic information for calculating your daily energy needs*")

# Personal info section
personal_col1, personal_col2 = st.columns(2)

with personal_col1:
    name = st.text_input("Full Name", value="", placeholder="Enter your name")
    
    gender = st.selectbox("Gender", options=["Male", "Female"], index=0)
    
    # Date of Birth with age calculation
    dob = st.date_input(
        "Date of Birth",
        value=date(1990, 1, 1),
        min_value=date(1920, 1, 1),
        max_value=date.today(),
        help="Used to calculate age for accurate TDEE estimation"
    )
    
    # Calculate and display age
    if dob:
        today = date.today()
        calculated_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        st.info(f"**Age:** {calculated_age} years")
    else:
        calculated_age = 25
    
    # Imperial/Metric toggle
    use_imperial = st.toggle("Use Imperial Units (lbs, ft/in)", value=True)
    
    # Height input
    if use_imperial:
        height_feet = st.number_input("Height (feet)", min_value=3, max_value=8, value=5, step=1)
        height_inches = st.number_input("Height (inches)", min_value=0, max_value=11, value=8, step=1)
        height_cm = (height_feet * 12 + height_inches) * 2.54
        st.write(f"Height: {height_feet}'{height_inches}\" ({height_cm:.1f} cm)")
    else:
        height_cm = st.number_input("Height (cm)", min_value=120.0, max_value=250.0, value=175.0, step=0.5)
        height_inches = height_cm / 2.54
        height_feet = int(height_inches // 12)
        height_in_remainder = int(height_inches % 12)
        st.write(f"Height: {height_feet}'{height_in_remainder}\" ({height_cm:.1f} cm)")

with personal_col2:
    # Weight input
    if use_imperial:
        weight_lbs = st.number_input("Weight (lbs)", min_value=80.0, max_value=500.0, value=165.0, step=0.5)
        weight_kg = weight_lbs / 2.20462
        st.write(f"Weight: {weight_kg:.1f} kg")
    else:
        weight_kg = st.number_input("Weight (kg)", min_value=35.0, max_value=225.0, value=75.0, step=0.1)
        weight_lbs = weight_kg * 2.20462
        st.write(f"Weight: {weight_lbs:.1f} lbs")
    
    # Body fat percentage
    body_fat_pct = st.number_input(
        "Estimated Body Fat %",
        min_value=5.0,
        max_value=50.0,
        value=18.0,
        step=0.5,
        help="Estimate your body fat percentage (affects metabolic calculations)"
    )
    
    # Activity level
    activity_level = st.selectbox(
        "Physical Activity Level",
        options=[
            "Sedentary (office job, <2 hours exercise per week)",
            "Lightly Active (light exercise 2-3 times per week)",
            "Moderately Active (moderate exercise 3-5 times per week)",
            "Very Active (hard exercise 6-7 times per week)",
            "Extremely Active (very hard exercise, physical job)"
        ],
        index=2
    )

# Workout planning section (outside form for dynamic updates)
st.markdown("---")
st.markdown("## 💪 Workout Planning")
st.markdown("*Configure your workout schedule to optimize meal timing and content.*")

has_workout = st.checkbox("I'm working out today", value=False)
workout_details = []
pre_workout_preference = None
post_workout_preference = None

if has_workout:
    workout_col1, workout_col2 = st.columns(2)
    
    with workout_col1:
        # Number of workouts
        num_workouts = st.selectbox("Number of workouts today", [1, 2, 3], index=0)
        
        # Workout meal timing preferences
        st.markdown("**🏋️ Workout Meal Timing**")
        pre_workout_preference = st.selectbox("Pre-workout meal preference", [
            "Fasted training (no pre-workout meal)",
            "Light snack 30-60 min before (banana, toast)",
            "Small meal 1-2 hours before (moderate protein/carbs, low fat/fiber)",
            "Regular meal 2+ hours before"
        ], index=2)
        
        post_workout_preference = st.selectbox("Post-workout meal preference", [
            "Immediate recovery snack/shake within 30 min",
            "Full meal within 1 hour (high protein/carbs)",
            "Regular meal timing (no special timing)"
        ], index=1)
    
    with workout_col2:
        # Workout proximity guidance
        st.info("""
        **Workout Meal Timing Guidelines:**
        • **Pre-workout (1-2 hours)**: Moderate protein, moderate-high carbs, LOW fat & fiber
        • **Post-workout (within 1 hour)**: High protein, high carbs, moderate fat, easily digestible
        • **Avoid large meals within 1 hour before intense exercise**
        • **Liquid/light options preferred around workout times**
        """)
    
    # Individual workout details
    for i in range(num_workouts):
        workout_num = i + 1
        st.markdown(f"**Workout {workout_num} Details:**")
        
        detail_col1, detail_col2 = st.columns(2)
        
        with detail_col1:
            workout_time = st.selectbox(f"Workout {workout_num} Time", [
                "Early Morning (5-7 AM)", "Morning (7-9 AM)", "Mid-Morning (9-11 AM)",
                "Lunch Time (11 AM-1 PM)", "Afternoon (1-4 PM)", "Evening (4-7 PM)",
                "Night (7-9 PM)", "Late Night (9-11 PM)"
            ], index=1 if i == 0 else 5, key=f"workout_{workout_num}_time")
            
            workout_type = st.selectbox(f"Workout {workout_num} Type", [
                "Cardio (Running, Cycling, etc.)",
                "Strength Training",
                "HIIT/Circuit Training",
                "Yoga/Pilates",
                "Sports/Recreation",
                "Mixed Training"
            ], key=f"workout_{workout_num}_type")
        
        with detail_col2:
            workout_duration = st.selectbox(f"Workout {workout_num} Duration", [
                "15-30 minutes", "30-45 minutes", "45-60 minutes", "60-90 minutes", "90+ minutes"
            ], index=1, key=f"workout_{workout_num}_duration")
            
            workout_calories = st.number_input(f"Workout {workout_num} Calories Burned", 
                                             min_value=50, max_value=1500, value=300, step=25,
                                             key=f"workout_{workout_num}_calories")
        
        workout_details.append({
            "time": workout_time,
            "type": workout_type,
            "duration": workout_duration,
            "calories": workout_calories
        })

# Goal selection (outside form for dynamic updates)
st.markdown("---")
st.markdown("## 🎯 Daily Goal")
st.markdown("*What's your goal for today? This will adjust your nutrition targets.*")

goal_type = st.selectbox(
    "What's your goal for today?",
    options=[
        "Maintain Weight",
        "Lose Weight (0.5-1 lb/week)",
        "Lose Weight (1-2 lbs/week)",
        "Gain Weight (0.5-1 lb/week)",
        "Gain Weight (1-2 lbs/week)"
    ],
    index=0
)

# Meal and snack configuration (outside form for dynamic updates)
st.markdown("---")
st.markdown("## 🍽️ Meal Configuration")
st.markdown("*How many meals and snacks would you like today? This will configure your meal contexts.*")

meal_config_col1, meal_config_col2 = st.columns(2)

with meal_config_col1:
    # Meal timing preferences
    num_meals = st.selectbox("Number of Main Meals", [2, 3, 4], index=1)
    num_snacks = st.selectbox("Number of Snacks", [0, 1, 2, 3], index=1)

with meal_config_col2:
    # Activity level for the day
    day_activity = st.selectbox("Today's Activity Level", [
        "Sedentary (desk work, minimal movement)",
        "Light Activity (some walking, desk work)",
        "Moderate Activity (regular movement, errands)",
        "Active Day (lots of walking, physical tasks)",
        "Very Active (physical job, lots of movement)"
    ], index=2)

# Enhanced Meal Context Builder (dynamic based on meal/snack selection)
st.markdown("---")
st.markdown("## 🍽️ Meal Context Builder")
st.markdown("*Configure each meal and snack based on your selections above.*")

# Initialize meal contexts storage
if 'standalone_meal_contexts_detailed' not in st.session_state:
    st.session_state.standalone_meal_contexts_detailed = {}

meal_contexts = {}
meal_names = ["First Meal", "Second Meal", "Third Meal", "Fourth Meal"]

# Process main meals with detailed context
for i in range(num_meals):
    meal_key = f"meal_{i+1}"
    meal_name = meal_names[i] if i < len(meal_names) else f"Meal {i+1}"
    
    with st.expander(f"🍽️ **{meal_name}** Configuration", expanded=False):
        # 1. Prep type
        st.write("**How will you prepare this meal?**")
        prep_type = st.selectbox(
            "Preparation method:",
            options=[
                "🧑‍🍳 Cook from scratch",
                "🍱 Use leftovers/pre-prepped ingredients",
                "🥡 Pickup or takeout",
                "🚚 Meal delivery (ready-to-eat)",
                "🥪 Quick & easy (sandwiches, simple assembly)"
            ],
            key=f"prep_type_{meal_key}"
        )
        
        # 2. Prep time (conditional)
        if prep_type == "🧑‍🍳 Cook from scratch":
            prep_time = st.selectbox(
                "Cooking time preference:",
                options=[
                    "⚡ Quick (15-30 min)",
                    "🕐 Medium (30-60 min)",
                    "🕑 Longer (60+ min)"
                ],
                key=f"prep_time_{meal_key}"
            )
        else:
            prep_time = None
        
        # 3. Location
        st.write("**Where will you eat this meal?**")
        location = st.multiselect(
            "Location options:",
            options=[
                "🏠 Home",
                "🏢 Work/Office",
                "🚗 Car/Commute",
                "🏃‍♂️ Gym/Fitness Center",
                "🍽️ Restaurant",
                "🌳 Outdoor/On-the-go"
            ],
            default=["🏠 Home"],
            key=f"location_{meal_key}"
        )
        
        # 4. Time range
        st.write("**What time do you typically eat this meal?**")
        time_range_options = [
            "Early Morning (5:00-8:00 AM)",
            "Morning (8:00-11:00 AM)", 
            "Midday (11:00 AM-2:00 PM)",
            "Afternoon (2:00-5:00 PM)",
            "Evening (5:00-8:00 PM)",
            "Night (8:00-11:00 PM)"
        ]
        time_range = st.selectbox(
            "Typical time range:",
            time_range_options,
            index=min(i, len(time_range_options)-1),
            key=f"time_range_{meal_key}"
        )
        
        # Store detailed context
        st.session_state.standalone_meal_contexts_detailed[meal_key] = {
            "meal": meal_name,
            "prep_type": prep_type.split(" ", 1)[1] if prep_type else None,
            "prep_time": prep_time.split(" ", 1)[1] if prep_time else None,
            "location": [loc.split(" ", 1)[1] for loc in location] if location else [],
            "time_range": time_range
        }
        
        # Create simplified context for AI
        if prep_type == "🧑‍🍳 Cook from scratch":
            context = f"Home cooking - {prep_time}" if prep_time else "Home cooking"
        elif prep_type == "🍱 Use leftovers/pre-prepped ingredients":
            context = "Meal prep/leftovers"
        elif prep_type == "🥡 Pickup or takeout":
            context = "Takeout/restaurant"
        elif prep_type == "🚚 Meal delivery (ready-to-eat)":
            context = "Meal delivery"
        else:
            context = "Quick & easy"
        
        meal_contexts[meal_key] = context

# Process snacks with simplified context
snack_names = ["First Snack", "Second Snack", "Third Snack"]
for i in range(num_snacks):
    snack_key = f"snack_{i+1}"
    snack_name = snack_names[i] if i < len(snack_names) else f"Snack {i+1}"
    
    with st.expander(f"🍿 **{snack_name}** Configuration", expanded=False):
        st.write("**What type of snack do you prefer?**")
        snack_type = st.selectbox(
            "Snack preference:",
            options=[
                "🥜 Protein-focused (nuts, protein bar, Greek yogurt)",
                "🍎 Fresh & light (fruit, vegetables, light snacks)",
                "🍪 Comfort food (cookies, crackers, comfort snacks)",
                "🥤 Liquid/shake (protein shake, smoothie, drink)",
                "🏃‍♂️ Pre/post workout (energy bar, banana, recovery snack)"
            ],
            key=f"snack_type_{snack_key}"
        )
        
        # Create context for AI
        if "Protein-focused" in snack_type:
            context = "Protein snack"
        elif "Fresh & light" in snack_type:
            context = "Healthy snack"
        elif "Comfort food" in snack_type:
            context = "Comfort snack"
        elif "Liquid/shake" in snack_type:
            context = "Liquid snack"
        else:
            context = "Workout snack"
        
        meal_contexts[snack_key] = context

# Create meal plan form for preferences and generation
with st.form("standalone_meal_plan_form"):
    st.markdown("## 📋 Meal Plan Configuration")
    st.markdown("*Configure your meal preferences and schedule for AI generation.*")
    
    # Day Schedule Planning
    st.markdown("### 📅 Daily Schedule Planning")
    st.markdown("*Tell us about your day so we can optimize meal timing and content.*")
    
    schedule_col1, schedule_col2 = st.columns(2)
    
    with schedule_col1:
        # Basic timing
        wake_time = st.time_input("Wake Time", value=time(7, 0))
        sleep_time = st.time_input("Sleep Time", value=time(23, 0))
        
        # Show workout summary if configured
        if has_workout:
            st.success(f"✅ {len(workout_details)} workout(s) configured")
            for i, workout in enumerate(workout_details):
                st.write(f"**Workout {i+1}:** {workout['type']} at {workout['time']} ({workout['duration']})")
        else:
            st.info("No workouts scheduled for today")
    
    with schedule_col2:
        # Show meal configuration summary
        st.success(f"✅ {num_meals} meals and {num_snacks} snacks configured")
        st.write(f"**Today's Activity:** {day_activity}")
        st.write(f"**Goal:** {goal_type}")
        


        
        # Show meal contexts summary
        st.markdown("**Meal Contexts Configured:**")
        for key, context in meal_contexts.items():
            meal_num = key.replace("meal_", "").replace("snack_", "")
            if "meal" in key:
                st.write(f"• Meal {meal_num}: {context}")
            else:
                st.write(f"• Snack {meal_num}: {context}")
        
        # Show workout preferences if configured
        if has_workout and pre_workout_preference:
            st.markdown("**Workout Meal Preferences:**")
            st.write(f"• Pre-workout: {pre_workout_preference}")
            st.write(f"• Post-workout: {post_workout_preference}")
        
        # Calculate and show nutrition targets
        base_tdee = utils.calculate_tdee(gender, weight_kg, height_cm, calculated_age, activity_level)
        
        # Adjust calories based on goal
        if goal_type == "Maintain Weight":
            target_calories = base_tdee
        elif goal_type == "Lose Weight (0.5-1 lb/week)":
            target_calories = base_tdee - 375
        elif goal_type == "Lose Weight (1-2 lbs/week)":
            target_calories = base_tdee - 750
        elif goal_type == "Gain Weight (0.5-1 lb/week)":
            target_calories = base_tdee + 375
        elif goal_type == "Gain Weight (1-2 lbs/week)":
            target_calories = base_tdee + 750
        else:
            target_calories = base_tdee
        
        # Calculate macros using simple calculations
        # Protein: 0.8-1.2g per kg body weight (higher for muscle gain/fat loss)
        if "gain" in goal_type.lower():
            protein_grams = weight_kg * 1.2
        elif "lose" in goal_type.lower():
            protein_grams = weight_kg * 1.1
        else:
            protein_grams = weight_kg * 0.9
        
        # Fat: 0.8-1.0g per kg body weight (25-35% of calories)
        fat_grams = weight_kg * 0.9
        
        # Carbs: Remainder of calories after protein and fat
        protein_calories = protein_grams * 4
        fat_calories = fat_grams * 9
        carb_calories = target_calories - protein_calories - fat_calories
        carb_grams = max(carb_calories / 4, 50)  # Minimum 50g carbs
        
        # Display targets
        st.markdown("**Dynamic Nutrition Targets:**")
        st.write(f"• **Calories:** {target_calories:,.0f} cal")
        st.write(f"• **Protein:** {protein_grams:.0f}g")
        st.write(f"• **Carbs:** {carb_grams:.0f}g")  
        st.write(f"• **Fat:** {fat_grams:.0f}g")
    
    # Comprehensive Diet Preferences (matching Diet Preferences page structure)
    st.markdown("---")
    st.markdown("## 🥗 Diet Preferences")
    st.markdown("*Customize your food preferences and dietary requirements for precise meal planning.*")
    
    # Use tabs for better organization
    diet_tab1, diet_tab2, diet_tab3, diet_tab4, diet_tab5 = st.tabs(["🚫 Restrictions & Allergies", "🍽️ Food Preferences", "🌶️ Flavors & Seasonings", "📦 Meal Sourcing", "📍 Location & Restaurants"])
    
    with diet_tab1:
        st.markdown("### 🚫 Dietary Restrictions & Allergies")
        
        restrict_col1, restrict_col2 = st.columns(2)
        
        with restrict_col1:
            st.markdown("**Dietary Restrictions**")
            dietary_restrictions = st.multiselect(
                "Select any that apply:",
                ["Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free", 
                 "Nut-Free", "Soy-Free", "Low-Sodium", "Low-Sugar", "Keto", "Paleo", "Halal", "Kosher"],
                default=[],
                key="standalone_dietary_restrictions"
            )
            
            food_allergies = st.text_area(
                "Food Allergies/Intolerances (SAFETY CRITICAL)",
                placeholder="List any specific foods you cannot eat due to allergies...",
                height=80,
                key="standalone_food_allergies"
            )
        
        with restrict_col2:
            st.markdown("**Cuisine Preferences**")
            cuisine_preferences = st.multiselect(
                "What cuisines do you enjoy?",
                ["American", "Italian", "Mexican", "Asian", "Indian", "Mediterranean", 
                 "Middle Eastern", "Thai", "Japanese", "French", "Greek", "Korean", "Spanish", "Ethiopian"],
                default=["American", "Italian", "Mexican"],
                key="standalone_cuisine_preferences"
            )
            
            cooking_time = st.selectbox("Cooking Time Preference", [
                "Quick (15-30 min)", "Medium (30-60 min)", "Longer (60+ min)", "No preference"
            ], key="standalone_cooking_time")
    
    with diet_tab2:
        st.markdown("### 🍽️ Food Preferences")
        
        food_col1, food_col2, food_col3 = st.columns(3)
        
        with food_col1:
            st.markdown("**Preferred Proteins**")
            proteins = st.multiselect(
                "Select preferred proteins:",
                ["Chicken", "Beef", "Pork", "Fish", "Salmon", "Shrimp", "Eggs", 
                 "Tofu", "Tempeh", "Beans", "Lentils", "Greek Yogurt", "Cottage Cheese", "Protein Powder"],
                default=["Chicken", "Fish", "Eggs"],
                key="standalone_proteins"
            )
        
        with food_col2:
            st.markdown("**Preferred Carbs**")
            carbs = st.multiselect(
                "Select preferred carbs:",
                ["Rice", "Pasta", "Bread", "Oats", "Quinoa", "Sweet Potato", 
                 "Regular Potato", "Fruit", "Vegetables", "Beans", "Lentils", "Barley", "Bulgur"],
                default=["Rice", "Oats", "Sweet Potato"],
                key="standalone_carbs"
            )
        
        with food_col3:
            st.markdown("**Preferred Fats**")
            fats = st.multiselect(
                "Select preferred fats:",
                ["Olive Oil", "Avocado", "Nuts", "Seeds", "Butter", "Coconut Oil", 
                 "Ghee", "Nut Butters", "Cheese", "Fatty Fish"],
                default=["Olive Oil", "Avocado", "Nuts"],
                key="standalone_fats"
            )
    
    with diet_tab3:
        st.markdown("### 🌶️ Flavors & Seasonings")
        
        flavor_col1, flavor_col2 = st.columns(2)
        
        with flavor_col1:
            st.markdown("**Spice Level**")
            spice_level = st.selectbox("How spicy do you like your food?", [
                "No spice", "Mild", "Medium", "Hot", "Very Hot"
            ], index=2, key="standalone_spice_level")
            
            st.markdown("**Preferred Seasonings**")
            preferred_seasonings = st.multiselect(
                "What seasonings do you enjoy?",
                ["Salt", "Black Pepper", "Garlic", "Onion", "Herbs", "Lemon", "Paprika", "Cumin", "Oregano", "Basil"],
                default=["Salt", "Black Pepper", "Garlic"],
                key="standalone_seasonings"
            )
        
        with flavor_col2:
            st.markdown("**Flavor Profiles**")
            flavor_profiles = st.multiselect(
                "What flavor profiles do you prefer?",
                ["Savory", "Sweet", "Umami", "Tangy", "Smoky", "Fresh", "Rich", "Light"],
                default=["Savory", "Fresh"],
                key="standalone_flavor_profiles"
            )
            
            st.markdown("**Cooking Enhancers**")
            cooking_enhancers = st.multiselect(
                "What cooking enhancers do you use?",
                ["Olive Oil", "Butter", "Stock/Broth", "Wine", "Vinegar", "Citrus", "Soy Sauce", "Hot Sauce"],
                default=["Olive Oil", "Stock/Broth"],
                key="standalone_cooking_enhancers"
            )
    
    with diet_tab4:
        st.markdown("### 📦 Meal Sourcing Preferences")
        
        source_col1, source_col2 = st.columns(2)
        
        with source_col1:
            st.markdown("**Meal Preparation Interest**")
            home_cooking_interest = st.selectbox("Home cooking interest level", [
                "Low", "Moderate", "High", "Very High"
            ], index=2, key="standalone_home_cooking")
            
            meal_prep_interest = st.selectbox("Meal prep interest level", [
                "Not interested", "Some meal prep", "Moderate meal prep", "Heavy meal prep"
            ], index=1, key="standalone_meal_prep")
        
        with source_col2:
            st.markdown("**Convenience Options**")
            meal_delivery_interest = st.selectbox("Meal delivery interest level", [
                "Not interested", "Occasional", "Moderate", "Frequent"
            ], index=1, key="standalone_meal_delivery")
            
            grocery_shopping_interest = st.selectbox("Grocery shopping interest level", [
                "Low", "Moderate", "High", "Very High"
            ], index=2, key="standalone_grocery_shopping")
    
    with diet_tab5:
        st.markdown("### 📍 Location & Restaurant Preferences")
        st.markdown("*Help us recommend location-appropriate meals and nearby restaurant options*")
        
        location_col1, location_col2 = st.columns(2)
        
        with location_col1:
            st.markdown("**Your Location**")
            primary_zip = st.text_input(
                "Primary Location (Zip Code)",
                placeholder="e.g., 10001",
                help="For seasonal ingredients and local restaurant recommendations",
                key="standalone_primary_zip"
            )
            
            work_zip = st.text_input(
                "Work Location (Zip Code)",
                placeholder="e.g., 10002",
                help="For work lunch recommendations",
                key="standalone_work_zip"
            )
            
            st.markdown("**Travel Routes**")
            travel_routes = st.text_area(
                "Common travel routes or areas you visit",
                placeholder="e.g., Between home and gym (Downtown), Weekend trips to suburbs",
                help="Helps suggest portable meals and restaurant options along your routes",
                key="standalone_travel_routes"
            )
        
        with location_col2:
            st.markdown("**Favorite Local Spots**")
            favorite_restaurants = st.text_area(
                "Favorite restaurants or food places",
                placeholder="e.g., Chipotle, local pizza place, farmer's market",
                help="We'll suggest similar options or menu items",
                key="standalone_favorite_restaurants"
            )
            
            favorite_grocery_stores = st.text_area(
                "Favorite grocery stores",
                placeholder="e.g., Whole Foods, Trader Joe's, local market",
                help="For ingredient availability and shopping list optimization",
                key="standalone_favorite_grocery_stores"
            )
            
            convenience_stores = st.text_area(
                "Nearby convenience stores",
                placeholder="e.g., 7-Eleven, CVS, campus store",
                help="For quick meal options and emergency snacks",
                key="standalone_convenience_stores"
            )
        
        # Seasonal and regional preferences
        st.markdown("**Seasonal & Regional Preferences**")
        seasonal_col1, seasonal_col2 = st.columns(2)
        
        with seasonal_col1:
            # Auto-detect current season
            import datetime
            current_month = datetime.datetime.now().month
            if current_month in [12, 1, 2]:
                default_season = "Winter"
            elif current_month in [3, 4, 5]:
                default_season = "Spring"
            elif current_month in [6, 7, 8]:
                default_season = "Summer"
            else:
                default_season = "Fall"
            
            current_season = st.selectbox(
                "Current season focus",
                ["Spring", "Summer", "Fall", "Winter"],
                index=["Spring", "Summer", "Fall", "Winter"].index(default_season),
                key="standalone_current_season"
            )
        
        with seasonal_col2:
            seasonal_ingredients = st.multiselect(
                "Preferred seasonal ingredients",
                ["Citrus fruits", "Root vegetables", "Leafy greens", "Berries", "Stone fruits", 
                 "Squash", "Apples", "Herbs", "Tomatoes", "Peppers", "Corn", "Melons"],
                default=["Leafy greens", "Herbs"],
                key="standalone_seasonal_ingredients"
            )
    
    # Collect all diet preferences for comprehensive AI prompt
    diet_preferences = {
        'dietary_restrictions': dietary_restrictions,
        'food_allergies': food_allergies,
        'cuisine_preferences': cuisine_preferences,
        'cooking_time_preference': cooking_time,
        'proteins': proteins,
        'carbs': carbs,
        'fats': fats,
        'spice_level': spice_level,
        'preferred_seasonings': preferred_seasonings,
        'flavor_profiles': flavor_profiles,
        'cooking_enhancers': cooking_enhancers,
        'home_cooking_interest': home_cooking_interest,
        'meal_prep_interest': meal_prep_interest,
        'meal_delivery_interest': meal_delivery_interest,
        'grocery_shopping_interest': grocery_shopping_interest,
        'primary_zip': primary_zip,
        'work_zip': work_zip,
        'travel_routes': travel_routes,
        'favorite_restaurants': favorite_restaurants,
        'favorite_grocery_stores': favorite_grocery_stores,
        'convenience_stores': convenience_stores,
        'current_season': current_season,
        'seasonal_ingredients': seasonal_ingredients
    }
    
    # Calculate energy needs based on selections
    st.markdown("---")
    st.markdown("## 📊 Calculated Daily Energy Needs")
    st.markdown("*Based on your personal information and goal selection above*")
    
    # Calculate TDEE with workout-specific adjustments if available
    base_tdee = utils.calculate_tdee(
        gender, weight_kg, height_cm, calculated_age, activity_level
    )
    
    # Calculate precise workout calories if user provided specific workout details
    daily_workout_calories = 0
    if has_workout and workout_details:
        for workout in workout_details:
            # Estimate calories based on workout type and duration
            duration_minutes = 45  # Default duration
            if "15-30" in workout.get('duration', ''):
                duration_minutes = 22.5
            elif "30-45" in workout.get('duration', ''):
                duration_minutes = 37.5
            elif "45-60" in workout.get('duration', ''):
                duration_minutes = 52.5
            elif "60-90" in workout.get('duration', ''):
                duration_minutes = 75
            elif "90+" in workout.get('duration', ''):
                duration_minutes = 105
            
            # Calories per minute by workout type (rough estimates)
            workout_type = workout.get('type', '')
            if 'Cardio' in workout_type:
                calories_per_minute = 8
            elif 'Strength' in workout_type:
                calories_per_minute = 6
            elif 'HIIT' in workout_type:
                calories_per_minute = 10
            elif 'Yoga' in workout_type:
                calories_per_minute = 3
            elif 'Sports' in workout_type:
                calories_per_minute = 7
            else:  # Mixed Training
                calories_per_minute = 7
            
            daily_workout_calories += duration_minutes * calories_per_minute
        
        # Adjust TDEE based on specific workout calories vs activity level estimate
        activity_exercise_estimate = 0
        if "Lightly Active" in activity_level:
            activity_exercise_estimate = 200
        elif "Moderately Active" in activity_level:
            activity_exercise_estimate = 350
        elif "Very Active" in activity_level:
            activity_exercise_estimate = 500
        elif "Extremely Active" in activity_level:
            activity_exercise_estimate = 650
        
        # Use the higher of the two estimates for more accurate TDEE
        if daily_workout_calories > activity_exercise_estimate:
            tdee = base_tdee + (daily_workout_calories - activity_exercise_estimate)
            st.info(f"📊 **Enhanced TDEE Calculation**: Using specific workout details (+{daily_workout_calories - activity_exercise_estimate:.0f} calories from detailed workouts)")
        else:
            tdee = base_tdee
        
        # Show workout calorie breakdown for transparency
        if len(workout_details) > 1:
            st.markdown("**Today's Workout Breakdown:**")
            for i, workout in enumerate(workout_details, 1):
                duration_str = workout.get('duration', '45-60 minutes')
                workout_type = workout.get('type', 'Mixed Training')
                workout_time = workout.get('time', 'Not specified')
                
                # Calculate calories for this specific workout
                duration_minutes = 45
                if "15-30" in duration_str:
                    duration_minutes = 22.5
                elif "30-45" in duration_str:
                    duration_minutes = 37.5
                elif "45-60" in duration_str:
                    duration_minutes = 52.5
                elif "60-90" in duration_str:
                    duration_minutes = 75
                elif "90+" in duration_str:
                    duration_minutes = 105
                
                # Calories per minute by workout type
                if 'Cardio' in workout_type:
                    calories_per_minute = 8
                elif 'Strength' in workout_type:
                    calories_per_minute = 6
                elif 'HIIT' in workout_type:
                    calories_per_minute = 10
                elif 'Yoga' in workout_type:
                    calories_per_minute = 3
                elif 'Sports' in workout_type:
                    calories_per_minute = 7
                else:
                    calories_per_minute = 7
                
                workout_calories = duration_minutes * calories_per_minute
                st.write(f"• **Workout {i}**: {workout_type} ({workout_time}) - {duration_str} = ~{workout_calories:.0f} calories")
            
            st.write(f"**Total Daily Workout Calories**: ~{daily_workout_calories:.0f} calories")
        elif len(workout_details) == 1:
            workout = workout_details[0]
            duration_str = workout.get('duration', '45-60 minutes')
            workout_type = workout.get('type', 'Mixed Training')
            workout_time = workout.get('time', 'Not specified')
            st.write(f"**Today's Workout**: {workout_type} ({workout_time}) - {duration_str} = ~{daily_workout_calories:.0f} calories")
    else:
        tdee = base_tdee
        # Estimate daily workout calories based on activity level
        if "Lightly Active" in activity_level:
            daily_workout_calories = 200
        elif "Moderately Active" in activity_level:
            daily_workout_calories = 350
        elif "Very Active" in activity_level:
            daily_workout_calories = 500
        elif "Extremely Active" in activity_level:
            daily_workout_calories = 650
    
    # Calculate target calories based on goal
    if goal_type == "Maintain Weight":
        target_calories = int(tdee)
    elif goal_type == "Lose Weight (0.5-1 lb/week)":
        target_calories = int(tdee - 375)  # 0.75 lb/week average
    elif goal_type == "Lose Weight (1-2 lbs/week)":
        target_calories = int(tdee - 750)  # 1.5 lbs/week average
    elif goal_type == "Gain Weight (0.5-1 lb/week)":
        target_calories = int(tdee + 375)  # 0.75 lb/week average
    else:  # Gain Weight (1-2 lbs/week)
        target_calories = int(tdee + 750)  # 1.5 lbs/week average
    
    # Calculate macros based on goal and body weight
    macros = utils.calculate_macros(target_calories, weight_kg, goal_type)
    target_protein = int(macros['protein'])
    target_carbs = int(macros['carbs'])
    target_fat = int(macros['fat'])
    
    # Calculate body composition metrics
    fat_free_mass_kg = weight_kg * (1 - body_fat_pct / 100)
    fat_mass_kg = weight_kg - fat_free_mass_kg
    
    # Calculate energy availability using precise workout calories
    energy_availability = (target_calories - daily_workout_calories) / fat_free_mass_kg
    
    # Display calculated values with enhanced context
    st.markdown("### 🎯 Your Personalized Targets")
    
    # Primary metrics
    primary_col1, primary_col2 = st.columns(2)
    
    with primary_col1:
        st.metric("Estimated TDEE", f"{tdee:,} calories", help="Total Daily Energy Expenditure based on your activity level")
        st.metric("Target Calories", f"{target_calories:,} calories", help="Adjusted for your goal")
    
    with primary_col2:
        st.metric("Fat-Free Mass", f"{fat_free_mass_kg:.1f} kg", f"{fat_free_mass_kg * 2.20462:.1f} lbs")
        st.metric("Energy Availability", f"{energy_availability:.0f} kcal/kg FFM", 
                 help="Energy available for essential body functions after exercise")
    
    # Macronutrient targets with context
    st.markdown("### 📊 Macronutrient Breakdown")
    
    macro_col1, macro_col2, macro_col3 = st.columns(3)
    
    with macro_col1:
        protein_per_kg = target_protein / weight_kg
        protein_per_ffm = target_protein / fat_free_mass_kg
        protein_calories = target_protein * 4
        protein_percentage = (protein_calories / target_calories) * 100
        
        st.metric("Protein Target", f"{target_protein}g", f"{protein_percentage:.0f}% of calories")
        st.caption(f"• {protein_per_kg:.1f}g per kg body weight")
        st.caption(f"• {protein_per_ffm:.1f}g per kg fat-free mass")
    
    with macro_col2:
        carbs_per_kg = target_carbs / weight_kg
        carbs_calories = target_carbs * 4
        carbs_percentage = (carbs_calories / target_calories) * 100
        
        st.metric("Carbs Target", f"{target_carbs}g", f"{carbs_percentage:.0f}% of calories")
        st.caption(f"• {carbs_per_kg:.1f}g per kg body weight")
        st.caption(f"• Primary energy source for brain & muscles")
    
    with macro_col3:
        fat_per_kg = target_fat / weight_kg
        fat_calories = target_fat * 9
        fat_percentage = (fat_calories / target_calories) * 100
        
        st.metric("Fat Target", f"{target_fat}g", f"{fat_percentage:.0f}% of calories")
        st.caption(f"• {fat_per_kg:.1f}g per kg body weight")
        st.caption(f"• Essential for hormone production")
    
    # Energy Availability Education
    with st.expander("📚 Understanding Energy Availability", expanded=False):
        st.markdown("""
        **Energy Availability (EA)** is the amount of energy left for essential body functions after accounting for exercise energy expenditure.
        
        **EA = (Energy Intake - Exercise Energy Expenditure) ÷ Fat-Free Mass**
        
        **Optimal Ranges:**
        - **Healthy EA:** 45+ kcal/kg FFM/day - Supports optimal health, metabolism, and performance
        - **Reduced EA:** 30-45 kcal/kg FFM/day - May impact some metabolic functions
        - **Low EA:** <30 kcal/kg FFM/day - Risk of metabolic dysfunction, hormonal issues
        
        **Your Current EA:** {energy_availability:.0f} kcal/kg FFM
        """.format(energy_availability=energy_availability))
        
        if energy_availability >= 45:
            st.success("✅ **Excellent EA** - Supporting optimal health and performance")
        elif energy_availability >= 30:
            st.warning("⚠️ **Moderate EA** - Consider increasing intake if experiencing fatigue or performance issues")
        else:
            st.error("🚨 **Low EA** - May negatively impact metabolism, hormones, and health. Consider increasing calorie intake.")
        
        st.markdown("""
        **Why EA Matters:**
        - Maintains healthy metabolism and hormone production
        - Supports immune function and recovery
        - Prevents metabolic adaptation in extreme dieting
        - Critical for reproductive health and bone density
        - Ensures sustainable long-term results
        
        **Improving EA:**
        - Increase overall calorie intake
        - Reduce excessive exercise volume
        - Focus on nutrient-dense foods
        - Consider periodized training and nutrition
        """)
    
    # Allow manual adjustment with warnings
    st.markdown("#### 🔧 Fine-Tune Targets (Optional)")
    st.markdown("*⚠️ Adjusting targets may impact your energy availability and health outcomes*")
    
    adjust_col1, adjust_col2, adjust_col3, adjust_col4 = st.columns(4)
    
    with adjust_col1:
        adjusted_calories = st.number_input("Daily Calories", min_value=1000, max_value=6000, value=int(target_calories), step=50, key="form_adj_calories")
        
        # Show EA impact if calories changed
        if adjusted_calories != target_calories:
            new_ea = (adjusted_calories - daily_workout_calories) / fat_free_mass_kg
            delta_ea = new_ea - energy_availability
            if delta_ea > 0:
                st.caption(f"🔼 EA: +{delta_ea:.0f} kcal/kg FFM")
            else:
                st.caption(f"🔽 EA: {delta_ea:.0f} kcal/kg FFM")
    
    with adjust_col2:
        adjusted_protein = st.number_input("Protein (g)", min_value=50, max_value=400, value=int(target_protein), step=5, key="form_adj_protein")
        
        # Show relative changes
        if adjusted_protein != target_protein:
            new_protein_per_kg = adjusted_protein / weight_kg
            st.caption(f"= {new_protein_per_kg:.1f}g/kg BW")
    
    with adjust_col3:
        adjusted_carbs = st.number_input("Carbs (g)", min_value=50, max_value=800, value=int(target_carbs), step=10, key="form_adj_carbs")
        
        # Show relative changes
        if adjusted_carbs != target_carbs:
            new_carbs_per_kg = adjusted_carbs / weight_kg
            st.caption(f"= {new_carbs_per_kg:.1f}g/kg BW")
    
    with adjust_col4:
        adjusted_fat = st.number_input("Fat (g)", min_value=30, max_value=300, value=int(target_fat), step=5, key="form_adj_fat")
        
        # Show relative changes
        if adjusted_fat != target_fat:
            new_fat_per_kg = adjusted_fat / weight_kg
            st.caption(f"= {new_fat_per_kg:.1f}g/kg BW")
    
    # Update targets if user made changes
    if adjusted_calories != target_calories or adjusted_protein != target_protein or adjusted_carbs != target_carbs or adjusted_fat != target_fat:
        target_calories = adjusted_calories
        target_protein = adjusted_protein
        target_carbs = adjusted_carbs
        target_fat = adjusted_fat
        
        # Recalculate energy availability with new values
        energy_availability = (target_calories - daily_workout_calories) / fat_free_mass_kg
        
        # Show warning if EA is getting too low
        if energy_availability < 30:
            st.error("🚨 **Warning:** Your adjusted targets result in low energy availability (<30 kcal/kg FFM). This may negatively impact your health, metabolism, and performance.")
        elif energy_availability < 45:
            st.warning("⚠️ **Caution:** Your adjusted targets result in moderate energy availability (30-45 kcal/kg FFM). Monitor for signs of fatigue or performance issues.")
    
    # Generate button
    st.markdown("---")
    generate_button = st.form_submit_button("🚀 Generate My Meal Plan", type="primary", use_container_width=True)
    
    if generate_button:
        openai_client = get_openai_client()
        
        if not openai_client:
            st.error("OpenAI API key not found. Please add your OPENAI_API_KEY to generate AI meal plans.")
            st.stop()
        
        # Dynamic meal distribution based on user selections
        total_meals = num_meals + num_snacks
        
        # Calculate meal distribution percentages dynamically
        meal_distribution = {}
        
        # Define base percentages for meals (larger portions)
        if num_meals == 2:
            meal_percentages = [0.45, 0.45]  # Two larger meals
        elif num_meals == 3:
            meal_percentages = [0.30, 0.40, 0.30]  # Traditional three meals
        elif num_meals == 4:
            meal_percentages = [0.25, 0.30, 0.30, 0.15]  # Four smaller meals
        else:
            # For any number of meals, distribute roughly equally
            base_percentage = 0.85 / num_meals  # 85% for meals, 15% for snacks
            meal_percentages = [base_percentage] * num_meals
        
        # Add meals to distribution
        for i in range(num_meals):
            meal_key = f"meal_{i+1}"
            meal_distribution[meal_key] = meal_percentages[i]
        
        # Calculate remaining percentage for snacks
        remaining_percentage = 1.0 - sum(meal_percentages)
        
        # Distribute remaining percentage among snacks
        if num_snacks > 0:
            snack_percentage = remaining_percentage / num_snacks
            for i in range(num_snacks):
                snack_key = f"snack_{i+1}"
                meal_distribution[snack_key] = snack_percentage
        
        # Calculate meal targets based on dynamic distribution
        meal_targets = {}
        for meal_type, percentage in meal_distribution.items():
            meal_targets[meal_type] = {
                'calories': int(target_calories * percentage),
                'protein': int(target_protein * percentage),
                'carbs': int(target_carbs * percentage),
                'fat': int(target_fat * percentage)
            }
        
        # Prepare comprehensive preferences matching Diet Preferences page structure
        diet_preferences = {
            'dietary_restrictions': dietary_restrictions,
            'food_allergies': food_allergies,
            'disliked_foods': [],  # Could be extended to collect this in UI
            'cuisine_preferences': cuisine_preferences,
            'proteins': proteins,
            'carbs': carbs,
            'fats': fats,
            'spice_level': spice_level,
            'flavor_profiles': flavor_profiles,
            'cooking_style': 'Mixed cooking methods',
            'meal_variety': 'Moderate variety',
            'cooking_time_preference': cooking_time,
            'budget_preference': 'Moderate',
            'cooking_for': 'Just myself',
            'leftovers_preference': 'Okay with leftovers occasionally',
            'meal_prep_interest': meal_prep_interest,
            
            # Extended preferences to match comprehensive Diet Preferences page
            'supplementation_preferences': {
                'creatine': 'Not interested',
                'protein_powder': 'Not interested', 
                'pre_workout': 'Not interested',
                'multivitamin': 'Not interested',
                'omega3': 'Not interested',
                'vitamin_d': 'Not interested',
                'other_supplements': []
            },
            'preferred_seasonings': ['Salt', 'Black Pepper', 'Garlic Powder', 'Oregano'],
            'cooking_enhancers': ['Olive Oil', 'Lemon Juice', 'Garlic'],
            'flavor_profile': flavor_profiles,
            'meal_delivery_interest': meal_delivery_interest,
            'home_cooking_interest': home_cooking_interest,
            'grocery_shopping_interest': grocery_shopping_interest,
            'variety_level': 'Moderate variety',
            'repetition_preference': 'I like some repetition but with variations',
            'weekly_structure': 'Mix of routine and variety',
            'cooking_variety': 'Some variety in cooking methods',
            'location_based_preferences': {
                'enable_location_features': bool(primary_zip.strip()) if primary_zip else False,
                'primary_zip_code': primary_zip,
                'work_zip_code': work_zip,
                'favorite_restaurants': favorite_restaurants.split(',') if favorite_restaurants else [],
                'favorite_grocery_stores': favorite_grocery_stores.split(',') if favorite_grocery_stores else [],
                'convenience_stores': convenience_stores.split(',') if convenience_stores else [],
                'travel_routes': travel_routes.split(',') if travel_routes else []
            },
            'enhanced_preferences': {
                'micronutrient_focus': [],
                'seasonal_ingredients': seasonal_ingredients,
                'current_season': current_season,
                'ingredient_substitutions': True,
                'meal_prep_coordination': 'Some coordination - Share ingredients across meals',
                'local_cuisine_integration': False,
                'preferred_produce_seasons': seasonal_ingredients
            }
        }
        
        # Prepare enhanced meal config
        meal_config = {
            'wake_time': wake_time.strftime("%H:%M"),
            'sleep_time': sleep_time.strftime("%H:%M"),
            'has_workout': has_workout,
            'workout_details': workout_details if has_workout else [],
            'pre_workout_preference': pre_workout_preference if has_workout else None,
            'post_workout_preference': post_workout_preference if has_workout else None,
            'num_meals': num_meals,
            'num_snacks': num_snacks,
            'day_activity': day_activity,
            'meal_contexts': meal_contexts,
            'user_profile': {
                'name': name,
                'age': calculated_age,
                'gender': gender,
                'weight_kg': weight_kg,
                'height_cm': height_cm,
                'body_fat_pct': body_fat_pct,
                'tdee': tdee,
                'goal_type': goal_type
            }
        }
        
        # Create daily totals from meal targets for AI function
        daily_totals = {
            'calories': target_calories,
            'protein': target_protein,
            'carbs': target_carbs,
            'fat': target_fat
        }
        
        with st.spinner("🤖 Creating your personalized daily meal plan..."):
            meal_plan = generate_standalone_meal_plan(
                daily_totals, diet_preferences, meal_config, openai_client, meal_targets
            )
            
            if meal_plan:
                st.session_state.generated_standalone_plan = meal_plan
                st.session_state.standalone_targets = {
                    'calories': target_calories,
                    'protein': target_protein,
                    'carbs': target_carbs,
                    'fat': target_fat
                }
                st.session_state.standalone_preferences = diet_preferences
                st.session_state.standalone_user_info = {
                    'name': name,
                    'age': calculated_age,
                    'gender': gender,
                    'tdee': tdee,
                    'goal_type': goal_type
                }
                st.success("✅ **Personalized meal plan generated successfully!**")
                st.rerun()

# Display generated meal plan
if 'generated_standalone_plan' in st.session_state:
    st.markdown("---")
    st.markdown("## 🍽️ Your Personalized Meal Plan")
    
    meal_plan = st.session_state.generated_standalone_plan
    
    # Daily totals summary - check if meal_plan is valid
    if meal_plan and isinstance(meal_plan, dict):
        # Handle new enhanced format with daily_totals
        if 'daily_totals' in meal_plan:
            daily_totals = meal_plan['daily_totals']
            total_calories = daily_totals.get('calories', 0)
            total_protein = daily_totals.get('protein', 0)
            total_carbs = daily_totals.get('carbs', 0)
            total_fat = daily_totals.get('fat', 0)
        # Handle legacy format with meals as keys
        elif 'meals' in meal_plan:
            meals = meal_plan['meals']
            total_calories = sum(meal.get('total_macros', {}).get('calories', 0) for meal in meals)
            total_protein = sum(meal.get('total_macros', {}).get('protein', 0) for meal in meals)
            total_carbs = sum(meal.get('total_macros', {}).get('carbs', 0) for meal in meals)
            total_fat = sum(meal.get('total_macros', {}).get('fat', 0) for meal in meals)
        else:
            # Legacy format with meal types as keys
            total_calories = sum(meal.get('total_macros', {}).get('calories', 0) for meal in meal_plan.values())
            total_protein = sum(meal.get('total_macros', {}).get('protein', 0) for meal in meal_plan.values())
            total_carbs = sum(meal.get('total_macros', {}).get('carbs', 0) for meal in meal_plan.values())
            total_fat = sum(meal.get('total_macros', {}).get('fat', 0) for meal in meal_plan.values())
    else:
        total_calories = total_protein = total_carbs = total_fat = 0
    
    # User info display
    if 'standalone_user_info' in st.session_state:
        user_info = st.session_state.standalone_user_info
        st.markdown("### 👤 Your Profile Summary")
        info_col1, info_col2, info_col3, info_col4 = st.columns(4)
        
        with info_col1:
            st.metric("Name", user_info.get('name', 'User'))
        with info_col2:
            st.metric("Age", f"{user_info.get('age', 'N/A')} years")
        with info_col3:
            st.metric("TDEE", f"{user_info.get('tdee', 'N/A'):,} cal")
        with info_col4:
            st.metric("Goal", user_info.get('goal_type', 'N/A'))
    
    # Nutrition accuracy check
    targets = st.session_state.get('standalone_targets', {})
    target_calories = targets.get('calories', 0)
    target_protein = targets.get('protein', 0)
    target_carbs = targets.get('carbs', 0)
    target_fat = targets.get('fat', 0)
    
    st.markdown("### 🎯 Nutrition Accuracy Check")
    accuracy_col1, accuracy_col2, accuracy_col3, accuracy_col4 = st.columns(4)
    
    with accuracy_col1:
        cal_diff = total_calories - target_calories
        cal_percent = (cal_diff / target_calories * 100) if target_calories > 0 else 0
        st.metric("Calories", f"{total_calories:,}", f"{cal_diff:+,} ({cal_percent:+.1f}%)")
    
    with accuracy_col2:
        protein_diff = total_protein - target_protein
        protein_percent = (protein_diff / target_protein * 100) if target_protein > 0 else 0
        st.metric("Protein", f"{total_protein}g", f"{protein_diff:+}g ({protein_percent:+.1f}%)")
    
    with accuracy_col3:
        carb_diff = total_carbs - target_carbs
        carb_percent = (carb_diff / target_carbs * 100) if target_carbs > 0 else 0
        st.metric("Carbs", f"{total_carbs}g", f"{carb_diff:+}g ({carb_percent:+.1f}%)")
    
    with accuracy_col4:
        fat_diff = total_fat - target_fat
        fat_percent = (fat_diff / target_fat * 100) if target_fat > 0 else 0
        st.metric("Fat", f"{total_fat}g", f"{fat_diff:+}g ({fat_percent:+.1f}%)")
    
    # Accuracy summary
    accuracy_scores = []
    if target_calories > 0:
        accuracy_scores.append(abs(cal_percent))
    if target_protein > 0:
        accuracy_scores.append(abs(protein_percent))
    if target_carbs > 0:
        accuracy_scores.append(abs(carb_percent))
    if target_fat > 0:
        accuracy_scores.append(abs(fat_percent))
    
    if accuracy_scores:
        avg_accuracy = sum(accuracy_scores) / len(accuracy_scores)
        if avg_accuracy <= 5:
            st.success("🎯 **Excellent accuracy!** Your meal plan is within 5% of all targets.")
        elif avg_accuracy <= 10:
            st.info("✅ **Good accuracy!** Your meal plan is within 10% of targets.")
        else:
            st.warning("⚠️ **Moderate accuracy.** Consider adjusting portions if needed.")
    
    # Add profile summary and workout annotations if available
    if meal_plan and isinstance(meal_plan, dict):
        if 'profile_summary' in meal_plan:
            st.markdown("### 📝 How Your Preferences Influenced Your Plan")
            st.info(meal_plan['profile_summary'])
        
        if 'workout_annotations' in meal_plan:
            workout_info = meal_plan['workout_annotations']
            if workout_info.get('has_workout'):
                st.markdown("### 🏋️ Workout Optimization")
                st.success(f"**Workout Details:** {workout_info.get('workout_details', 'Workout scheduled')}")
                
                if 'peri_workout_meals' in workout_info:
                    for meal_info in workout_info['peri_workout_meals']:
                        st.markdown(f"- **{meal_info['meal_name']}** ({meal_info['timing']}): {meal_info['optimization']}")
    
    # Create tabs for each meal
    if meal_plan:
        # Handle new enhanced format with meals array
        if 'meals' in meal_plan:
            meals_list = meal_plan['meals']
            meal_types = [meal['meal_type'] for meal in meals_list]
        else:
            # Legacy format with meal types as keys
            meal_types = list(meal_plan.keys())
        meal_tabs = st.tabs([meal_type.title() for meal_type in meal_types])
        
        for i, meal_type in enumerate(meal_types):
            with meal_tabs[i]:
                # Handle new enhanced format with meals array
                if 'meals' in meal_plan:
                    meal_data = meals_list[i]
                else:
                    # Legacy format with meal types as keys
                    meal_data = meal_plan[meal_type]
                
                # Display meal information
                st.markdown(f"### {meal_data.get('name', meal_type.title())}")
                
                # Show timing and context
                timing = meal_data.get('timing', meal_data.get('time', 'N/A'))
                context = meal_data.get('context', meal_data.get('meal_context', 'N/A'))
                
                timing_col, context_col = st.columns(2)
                with timing_col:
                    st.markdown(f"**⏰ Timing:** {timing}")
                with context_col:
                    st.markdown(f"**📍 Context:** {context}")
                
                # Show workout annotation if available
                if 'workout_annotation' in meal_data:
                    workout_annotation = meal_data['workout_annotation']
                    if workout_annotation != 'REGULAR':
                        st.markdown(f"**🏋️ Workout Timing:** {workout_annotation}")
                
                # Display macros
                meal_macros = meal_data.get('total_macros', {})
                if meal_macros:
                    macro_col1, macro_col2, macro_col3, macro_col4 = st.columns(4)
                    
                    with macro_col1:
                        st.metric("Calories", f"{meal_macros.get('calories', 0):,}")
                    with macro_col2:
                        st.metric("Protein", f"{meal_macros.get('protein', 0)}g")
                    with macro_col3:
                        st.metric("Carbs", f"{meal_macros.get('carbs', 0)}g")
                    with macro_col4:
                        st.metric("Fat", f"{meal_macros.get('fat', 0)}g")
                
                # Display accuracy check if available
                if 'accuracy_check' in meal_data:
                    accuracy = meal_data['accuracy_check']
                    st.markdown(f"**Accuracy vs Target:** Calories {accuracy.get('calories', 'N/A')}, Protein {accuracy.get('protein', 'N/A')}, Carbs {accuracy.get('carbs', 'N/A')}, Fat {accuracy.get('fat', 'N/A')}")
                
                # Display ingredients
                ingredients = meal_data.get('ingredients', [])
                if ingredients:
                    st.markdown("#### 🥘 Ingredients")
                    for ingredient in ingredients:
                        if isinstance(ingredient, dict):
                            item = ingredient.get('item', 'Unknown')
                            amount = ingredient.get('amount', 'N/A')
                            calories = ingredient.get('calories', 0)
                            st.markdown(f"• **{amount}** {item} ({calories} cal)")
                        else:
                            st.markdown(f"• {ingredient}")
                
                # Display instructions
                instructions = meal_data.get('instructions', '')
                if instructions:
                    st.markdown("#### 📋 Instructions")
                    st.markdown(instructions)
    else:
        st.warning("No meal plan available. Please generate a new plan.")
    
    # Export Options
    st.markdown("---")
    st.markdown("## 📤 Export Your Meal Plan")
    
    export_col1, export_col2, export_col3 = st.columns(3)
    
    with export_col1:
        if st.button("📄 Export PDF", type="primary", use_container_width=True):
            try:
                # Convert meal plan to format expected by PDF export
                meal_data_for_pdf = []
                
                if meal_plan:
                    # Handle new enhanced format with meals array
                    if 'meals' in meal_plan:
                        for meal_data in meal_plan['meals']:
                            meal_info = {
                                'day': 'Today',
                                'meal_type': meal_data.get('meal_type', 'meal'),
                                'time': meal_data.get('timing', meal_data.get('time', '')),
                                'context': meal_data.get('context', 'Standalone Plan'),
                                'recipe': {
                                    'name': meal_data.get('name', meal_data.get('meal_type', 'Meal').title()),
                                    'ingredients': meal_data.get('ingredients', []),
                                    'instructions': meal_data.get('instructions', ''),
                                    'macros': meal_data.get('total_macros', {})
                                }
                            }
                            meal_data_for_pdf.append(meal_info)
                    else:
                        # Legacy format with meal types as keys  
                        for meal_type, meal_data in meal_plan.items():
                            if meal_type not in ['profile_summary', 'workout_annotations', 'daily_totals', 'daily_targets', 'accuracy_summary', 'grocery_ingredients']:
                                meal_info = {
                                    'day': 'Today',
                                    'meal_type': meal_type,
                                    'time': meal_data.get('timing', ''),
                                    'context': 'Standalone Plan',
                                    'recipe': {
                                        'name': meal_data.get('name', meal_type.title()),
                                        'ingredients': meal_data.get('ingredients', []),
                                        'instructions': meal_data.get('instructions', ''),
                                        'macros': meal_data.get('total_macros', {})
                                    }
                                }
                                meal_data_for_pdf.append(meal_info)
                
                # Get user preferences for PDF
                from datetime import datetime as dt
                user_info = {
                    'name': 'Fitomics User',
                    'plan_type': 'Standalone Meal Plan',
                    'generation_date': dt.now().strftime('%B %d, %Y')
                }
                
                pdf_path = export_meal_plan_pdf(meal_data_for_pdf, user_info)
                
                if pdf_path and os.path.exists(pdf_path):
                    st.success("✅ PDF generated successfully!")
                    
                    # Provide download link
                    with open(pdf_path, "rb") as pdf_file:
                        st.download_button(
                            label="⬇️ Download PDF",
                            data=pdf_file.read(),
                            file_name=f"fitomics_meal_plan_{dt.now().strftime('%Y%m%d')}.pdf",
                            mime="application/pdf",
                            use_container_width=True
                        )
                else:
                    st.error("Failed to generate PDF. Please try again.")
                    
            except Exception as e:
                st.error(f"PDF export error: {e}")
    
    with export_col2:
        if st.button("🛒 Generate Grocery List", use_container_width=True):
            # Extract all ingredients for grocery list
            grocery_items = []
            if meal_plan and 'meals' in meal_plan:
                for meal in meal_plan['meals']:
                    if isinstance(meal, dict) and 'ingredients' in meal:
                        for ingredient in meal['ingredients']:
                            grocery_items.append({
                                'Item': ingredient.get('item', 'Unknown'),
                                'Amount': ingredient.get('amount', 'N/A'),
                                'Meal': meal.get('meal_type', 'Unknown').title()
                            })
            
            if grocery_items:
                st.markdown("### 🛒 Grocery List")
                grocery_df = pd.DataFrame(grocery_items)
                st.dataframe(grocery_df, use_container_width=True, hide_index=True)
                
                # Text format for copying
                grocery_text = "\n".join([f"• {item['Item']}: {item['Amount']}" for item in grocery_items])
                st.text_area("Copy your grocery list:", grocery_text, height=200)
                
                # Add location-based recommendations if available
                if meal_plan and 'location_recommendations' in meal_plan:
                    location_recs = meal_plan['location_recommendations']
                    
                    if location_recs:
                        st.markdown("### 📍 Location-Based Recommendations")
                        
                        # Restaurant options
                        if 'restaurant_options' in location_recs and location_recs['restaurant_options']:
                            st.markdown("#### 🍽️ Restaurant Options")
                            for restaurant in location_recs['restaurant_options']:
                                st.markdown(f"• **{restaurant.get('restaurant', 'N/A')}**: {restaurant.get('menu_item', 'N/A')} - {restaurant.get('macros', 'N/A')}")
                        
                        # Grocery store recommendations
                        if 'grocery_stores' in location_recs and location_recs['grocery_stores']:
                            st.markdown("#### 🏪 Grocery Store Tips")
                            for store in location_recs['grocery_stores']:
                                st.markdown(f"• **{store.get('store', 'N/A')}**: {store.get('shopping_tips', 'N/A')}")
                        
                        # Convenience store options
                        if 'convenience_options' in location_recs and location_recs['convenience_options']:
                            st.markdown("#### 🏬 Convenience Options")
                            for conv in location_recs['convenience_options']:
                                st.markdown(f"• **{conv.get('store', 'N/A')}**: {conv.get('quick_options', 'N/A')}")
                
                # Add seasonal ingredient recommendations
                if 'standalone_preferences' in st.session_state:
                    prefs = st.session_state.standalone_preferences
                    if prefs.get('seasonal_ingredients') and prefs.get('current_season'):
                        st.markdown("### 🌱 Seasonal Ingredient Focus")
                        st.info(f"**Current Season**: {prefs.get('current_season', 'Summer')} - Look for seasonal produce like {', '.join(prefs.get('seasonal_ingredients', []))}")
            else:
                st.info("No grocery items found. Please generate a meal plan first.")
    
    with export_col3:
        if st.button("🔄 Generate New Plan", use_container_width=True):
            if 'generated_standalone_plan' in st.session_state:
                del st.session_state.generated_standalone_plan
            if 'standalone_targets' in st.session_state:
                del st.session_state.standalone_targets
            if 'standalone_preferences' in st.session_state:
                del st.session_state.standalone_preferences
            st.rerun()

# Help section
if 'generated_standalone_plan' not in st.session_state:
    st.markdown("---")
    st.markdown("## 💡 Need More Advanced Features?")
    
    help_col1, help_col2 = st.columns(2)
    
    with help_col1:
        st.markdown("**🧠 Advanced AI Meal Plan**")
        st.markdown("• Weekly meal plans (7 days)")
        st.markdown("• Body composition integration")
        st.markdown("• Schedule-optimized timing")
        st.markdown("• Pre/post-workout meal contexts")
        
        if st.button("🧠 Try Advanced AI Meal Plan", use_container_width=True):
            st.switch_page("pages/7_Advanced_AI_Meal_Plan.py")
    
    with help_col2:
        st.markdown("**📊 Complete Workflow**")
        st.markdown("• Body composition analysis")
        st.markdown("• Weekly schedule planning")
        st.markdown("• Nutrition target calculation")
        st.markdown("• Progress tracking")
        
        if st.button("📊 Start Complete Workflow", use_container_width=True):
            st.switch_page("pages/1_Initial_Setup.py")