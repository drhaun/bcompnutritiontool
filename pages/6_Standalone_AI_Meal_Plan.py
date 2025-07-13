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

def generate_standalone_meal_plan(meal_targets, diet_preferences, meal_config, openai_client):
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
{json.dumps(meal_targets, indent=2)}

DIETARY PREFERENCES & RESTRICTIONS:
- Dietary restrictions: {diet_preferences.get('dietary_restrictions', [])}
- Food allergies: {diet_preferences.get('food_allergies', 'None')}
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

LOCATION-BASED PREFERENCES:
- Location Features Enabled: {diet_preferences.get('location_based_preferences', {}).get('enable_location_features', False)}
- Primary Zip Code: {diet_preferences.get('location_based_preferences', {}).get('primary_zip_code', 'Not specified')}
- Favorite Restaurants: {', '.join(diet_preferences.get('location_based_preferences', {}).get('favorite_restaurants', [])[:3])}
- Favorite Grocery Stores: {', '.join(diet_preferences.get('location_based_preferences', {}).get('favorite_grocery_stores', [])[:3])}

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
10. **LOCATION-BASED MEAL SOURCING** (if enabled):
    - Location Features: {diet_preferences.get('location_based_preferences', {}).get('enable_location_features', False)}
    - If location features enabled:
      * Suggest specific restaurants from favorite list: {', '.join(diet_preferences.get('location_based_preferences', {}).get('favorite_restaurants', [])[:3])}
      * Recommend macro-friendly options from these restaurants
      * Include grocery store suggestions: {', '.join(diet_preferences.get('location_based_preferences', {}).get('favorite_grocery_stores', [])[:3])}
      * Consider convenience store options for on-the-go meals

Format as JSON with this structure:
{{
  "breakfast": {{
    "name": "meal name",
    "ingredients": [
      {{"item": "food name", "amount": "portion", "calories": number, "protein": number, "carbs": number, "fat": number}}
    ],
    "instructions": "detailed cooking steps with timing",
    "total_macros": {{"calories": number, "protein": number, "carbs": number, "fat": number}},
    "timing": "suggested time",
    "meal_context": "context description"
  }},
  "lunch": {{ ... }},
  "dinner": {{ ... }},
  "snack": {{ ... }}
}}
"""

        response = openai_client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {"role": "system", "content": "You are a nutrition expert who creates precise meal plans with accurate macro calculations. Focus on meal personalization based on user preferences and schedule optimization."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,  # Lower temperature for more consistent calculations
            max_tokens=3000
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        st.error(f"AI meal generation failed: {e}")
        return None

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
    


# Create meal plan form for preferences and generation
with st.form("standalone_meal_plan_form"):
    st.markdown("## 📋 Meal Plan Configuration")
    st.markdown("*Configure your meal preferences and schedule for AI generation.*")
    
    # Goal selection first
    st.markdown("### 🎯 Daily Goal")
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
    
    # Day Schedule Planning
    st.markdown("---")
    st.markdown("## 📅 Daily Schedule Planning")
    st.markdown("*Tell us about your day so we can optimize meal timing and content.*")
    
    schedule_col1, schedule_col2 = st.columns(2)
    
    with schedule_col1:
        # Basic timing
        wake_time = st.time_input("Wake Time", value=time(7, 0))
        sleep_time = st.time_input("Sleep Time", value=time(23, 0))
        
        # Workout planning with enhanced timing guidance
        has_workout = st.checkbox("I'm working out today", value=True)
        if has_workout:
            # Option for multiple workouts
            multiple_workouts = st.checkbox("I'm working out more than once today")
            
            if multiple_workouts:
                st.markdown("**First Workout:**")
                workout_time_1 = st.selectbox("First Workout Time", [
                    "Early Morning (5-7 AM)", "Morning (7-9 AM)", "Mid-Morning (9-11 AM)",
                    "Lunch Time (11 AM-1 PM)", "Afternoon (1-4 PM)", "Evening (4-7 PM)",
                    "Night (7-9 PM)", "Late Night (9-11 PM)"
                ], index=1, key="workout1_time")
                
                workout_type_1 = st.selectbox("First Workout Type", [
                    "Cardio (Running, Cycling, etc.)",
                    "Strength Training",
                    "HIIT/Circuit Training",
                    "Yoga/Pilates",
                    "Sports/Recreation",
                    "Mixed Training"
                ], key="workout1_type")
                
                workout_duration_1 = st.selectbox("First Workout Duration", [
                    "15-30 minutes", "30-45 minutes", "45-60 minutes", "60-90 minutes", "90+ minutes"
                ], index=1, key="workout1_duration")
                
                st.markdown("**Second Workout:**")
                workout_time_2 = st.selectbox("Second Workout Time", [
                    "Early Morning (5-7 AM)", "Morning (7-9 AM)", "Mid-Morning (9-11 AM)",
                    "Lunch Time (11 AM-1 PM)", "Afternoon (1-4 PM)", "Evening (4-7 PM)",
                    "Night (7-9 PM)", "Late Night (9-11 PM)"
                ], index=5, key="workout2_time")
                
                workout_type_2 = st.selectbox("Second Workout Type", [
                    "Cardio (Running, Cycling, etc.)",
                    "Strength Training",
                    "HIIT/Circuit Training",
                    "Yoga/Pilates",
                    "Sports/Recreation",
                    "Mixed Training"
                ], key="workout2_type")
                
                workout_duration_2 = st.selectbox("Second Workout Duration", [
                    "15-30 minutes", "30-45 minutes", "45-60 minutes", "60-90 minutes", "90+ minutes"
                ], index=1, key="workout2_duration")
                
                workout_details = [
                    {"time": workout_time_1, "type": workout_type_1, "duration": workout_duration_1},
                    {"time": workout_time_2, "type": workout_type_2, "duration": workout_duration_2}
                ]
            else:
                workout_time = st.selectbox("Workout Time", [
                    "Early Morning (5-7 AM)", "Morning (7-9 AM)", "Mid-Morning (9-11 AM)",
                    "Lunch Time (11 AM-1 PM)", "Afternoon (1-4 PM)", "Evening (4-7 PM)",
                    "Night (7-9 PM)", "Late Night (9-11 PM)"
                ], index=1)
                
                workout_type = st.selectbox("Workout Type", [
                    "Cardio (Running, Cycling, etc.)",
                    "Strength Training",
                    "HIIT/Circuit Training",
                    "Yoga/Pilates",
                    "Sports/Recreation",
                    "Mixed Training"
                ])
                
                workout_duration = st.selectbox("Workout Duration", [
                    "15-30 minutes", "30-45 minutes", "45-60 minutes", "60-90 minutes", "90+ minutes"
                ], index=1)
                
                workout_details = [{"time": workout_time, "type": workout_type, "duration": workout_duration}]
            
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
            
            # Workout proximity guidance
            st.info("""
            **Workout Meal Timing Guidelines:**
            • **Pre-workout (1-2 hours)**: Moderate protein, moderate-high carbs, LOW fat & fiber
            • **Post-workout (within 1 hour)**: High protein, high carbs, moderate fat, easily digestible
            • **Avoid large meals within 1 hour before intense exercise**
            • **Liquid/light options preferred around workout times**
            """)
        else:
            workout_details = []
            pre_workout_preference = None
            post_workout_preference = None
    
    with schedule_col2:
        # Meal timing preferences
        num_meals = st.selectbox("Number of Main Meals", [2, 3, 4], index=1)
        num_snacks = st.selectbox("Number of Snacks", [0, 1, 2, 3], index=1)
        
        # Activity level for the day
        day_activity = st.selectbox("Today's Activity Level", [
            "Sedentary (desk work, minimal movement)",
            "Light Activity (some walking, desk work)",
            "Moderate Activity (regular movement, errands)",
            "Active Day (lots of walking, physical tasks)",
            "Very Active (physical job, lots of movement)"
        ], index=2)
        
        # Individual meal contexts
        st.markdown("**Meal Contexts**")
        st.write("Set the context for each meal:")
        
        context_options = [
            "Home cooking", "Meal prep", "Quick & easy", "Comfort food",
            "Healthy focus", "Performance focus", "Social/family meals", 
            "On-the-go", "Work meal", "Post-workout", "Pre-workout"
        ]
        
        breakfast_context = st.selectbox("Breakfast Context", context_options, index=0)
        lunch_context = st.selectbox("Lunch Context", context_options, index=2)
        dinner_context = st.selectbox("Dinner Context", context_options, index=0)
        snack_context = st.selectbox("Snack Context", context_options, index=3)
        
        meal_contexts = {
            'breakfast': breakfast_context,
            'lunch': lunch_context,
            'dinner': dinner_context,
            'snack': snack_context
        }
    
    # Diet Preferences
    st.markdown("---")
    st.markdown("## 🥗 Diet Preferences")
    st.markdown("*Customize your food preferences and dietary requirements.*")
    
    # Dietary restrictions
    restrict_col1, restrict_col2 = st.columns(2)
    
    with restrict_col1:
        st.markdown("**Dietary Restrictions & Allergies**")
        dietary_restrictions = st.multiselect(
            "Select any that apply:",
            ["Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free", 
             "Nut-Free", "Soy-Free", "Low-Sodium", "Low-Sugar", "Keto", "Paleo"],
            default=[]
        )
        
        food_allergies = st.text_area(
            "Food Allergies/Intolerances",
            placeholder="List any specific foods you cannot eat...",
            height=80
        )
    
    with restrict_col2:
        st.markdown("**Cuisine Preferences**")
        cuisine_preferences = st.multiselect(
            "What cuisines do you enjoy?",
            ["American", "Italian", "Mexican", "Asian", "Indian", "Mediterranean", 
             "Middle Eastern", "Thai", "Japanese", "French", "Greek", "Korean"],
            default=["American", "Italian", "Mexican"]
        )
        
        cooking_time = st.selectbox("Cooking Time Preference", [
            "Quick (15-30 min)", "Medium (30-60 min)", "Longer (60+ min)", "No preference"
        ])
    
    # Food preferences
    st.markdown("**Food Preferences**")
    food_col1, food_col2, food_col3 = st.columns(3)
    
    with food_col1:
        st.markdown("*Preferred Proteins*")
        proteins = st.multiselect(
            "Select preferred proteins:",
            ["Chicken", "Beef", "Pork", "Fish", "Salmon", "Shrimp", "Eggs", 
             "Tofu", "Tempeh", "Beans", "Lentils", "Greek Yogurt", "Cottage Cheese"],
            default=["Chicken", "Fish", "Eggs"]
        )
    
    with food_col2:
        st.markdown("*Preferred Carbs*")
        carbs = st.multiselect(
            "Select preferred carbs:",
            ["Rice", "Pasta", "Bread", "Oats", "Quinoa", "Sweet Potato", 
             "Regular Potato", "Fruit", "Vegetables", "Beans", "Lentils"],
            default=["Rice", "Oats", "Sweet Potato"]
        )
    
    with food_col3:
        st.markdown("*Preferred Fats*")
        fats = st.multiselect(
            "Select preferred fats:",
            ["Olive Oil", "Avocado", "Nuts", "Seeds", "Butter", "Coconut Oil", 
             "Fatty Fish", "Cheese", "Nut Butters"],
            default=["Olive Oil", "Avocado", "Nuts"]
        )
    
    # Flavor preferences
    st.markdown("**Flavor & Spice Preferences**")
    flavor_col1, flavor_col2 = st.columns(2)
    
    with flavor_col1:
        spice_level = st.selectbox("Spice Level", [
            "Mild (no spice)", "Medium (some heat)", "Spicy (lots of heat)", "Very Spicy (extreme heat)"
        ])
        
        flavor_profiles = st.multiselect(
            "Favorite Flavor Profiles:",
            ["Savory", "Sweet", "Sour", "Bitter", "Umami", "Herbal", "Smoky", "Citrusy"],
            default=["Savory", "Herbal"]
        )
    
    with flavor_col2:
        cooking_style = st.selectbox("Cooking Style Preference", [
            "Simple & clean", "Bold & flavorful", "Comfort food", "Gourmet", "Healthy focus"
        ])
        
        meal_variety = st.selectbox("Meal Variety Level", [
            "Keep it simple (similar meals)", "Some variety", "High variety", "Maximum variety"
        ])
    
    # Practical preferences
    st.markdown("**Practical Preferences**")
    practical_col1, practical_col2 = st.columns(2)
    
    with practical_col1:
        cooking_for = st.selectbox("Cooking For", [
            "Just myself", "2 people", "3-4 people", "Family (5+ people)"
        ])
        
        leftover_preference = st.selectbox("Leftover Preference", [
            "Love leftovers", "Okay with leftovers occasionally", "Prefer fresh meals daily"
        ])
    
    with practical_col2:
        budget_level = st.selectbox("Budget Level", [
            "Budget-conscious", "Moderate budget", "Higher budget", "No budget constraints"
        ])
        
        meal_prep_interest = st.selectbox("Meal Prep Interest", [
            "No meal prep", "Some meal prep", "Heavy meal prep", "Batch cooking"
        ])
    
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
        
        # Prepare data for AI generation
        total_meals = num_meals + num_snacks
        
        if total_meals == 3:  # 2 meals + 1 snack
            meal_distribution = {'breakfast': 0.35, 'lunch': 0.45, 'snack': 0.20}
        elif total_meals == 4:  # 3 meals + 1 snack
            meal_distribution = {'breakfast': 0.25, 'lunch': 0.35, 'dinner': 0.30, 'snack': 0.10}
        elif total_meals == 5:  # 3 meals + 2 snacks
            meal_distribution = {'breakfast': 0.25, 'lunch': 0.30, 'dinner': 0.30, 'snack1': 0.08, 'snack2': 0.07}
        else:  # Default to 4 meals
            meal_distribution = {'breakfast': 0.25, 'lunch': 0.35, 'dinner': 0.30, 'snack': 0.10}
        
        # Calculate meal targets
        meal_targets = {}
        for meal_type, percentage in meal_distribution.items():
            meal_targets[meal_type] = {
                'calories': int(target_calories * percentage),
                'protein': int(target_protein * percentage),
                'carbs': int(target_carbs * percentage),
                'fat': int(target_fat * percentage)
            }
        
        # Prepare comprehensive preferences
        diet_preferences = {
            'dietary_restrictions': dietary_restrictions,
            'food_allergies': food_allergies,
            'cuisine_preferences': cuisine_preferences,
            'proteins': proteins,
            'carbs': carbs,
            'fats': fats,
            'spice_level': spice_level,
            'flavor_profiles': flavor_profiles,
            'cooking_style': cooking_style,
            'meal_variety': meal_variety,
            'cooking_time_preference': cooking_time,
            'budget_preference': budget_level,
            'cooking_for': cooking_for,
            'leftovers_preference': leftover_preference,
            'meal_prep_interest': meal_prep_interest
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
        
        with st.spinner("🤖 Creating your personalized daily meal plan..."):
            meal_plan = generate_standalone_meal_plan(
                meal_targets, diet_preferences, meal_config, openai_client
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
    if meal_plan:
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
    
    # Create tabs for each meal
    if meal_plan:
        meal_types = list(meal_plan.keys())
        meal_tabs = st.tabs([meal_type.title() for meal_type in meal_types])
    else:
        st.warning("No meal plan available. Please generate a new plan.")
        meal_types = []
    
    for i, meal_type in enumerate(meal_types):
        with meal_tabs[i]:
            meal_data = meal_plan[meal_type] if meal_plan else {}
            
            st.markdown(f"### {meal_data.get('name', meal_type.title())}")
            if 'timing' in meal_data:
                st.markdown(f"**Suggested Time:** {meal_data['timing']}")
            
            # Macro summary
            macros = meal_data.get('total_macros', {})
            macro_col1, macro_col2, macro_col3, macro_col4 = st.columns(4)
            
            with macro_col1:
                st.metric("Calories", macros.get('calories', 0))
            with macro_col2:
                st.metric("Protein", f"{macros.get('protein', 0)}g")
            with macro_col3:
                st.metric("Carbs", f"{macros.get('carbs', 0)}g")
            with macro_col4:
                st.metric("Fat", f"{macros.get('fat', 0)}g")
            
            # Ingredients
            st.markdown("**Ingredients:**")
            ingredients = meal_data.get('ingredients', [])
            
            for j, ingredient in enumerate(ingredients):
                with st.expander(f"{ingredient.get('item', 'Unknown')} - {ingredient.get('amount', 'N/A')}", expanded=False):
                    ing_col1, ing_col2, ing_col3, ing_col4 = st.columns(4)
                    with ing_col1:
                        st.write(f"Calories: {ingredient.get('calories', 0)}")
                    with ing_col2:
                        st.write(f"Protein: {ingredient.get('protein', 0)}g")
                    with ing_col3:
                        st.write(f"Carbs: {ingredient.get('carbs', 0)}g")
                    with ing_col4:
                        st.write(f"Fat: {ingredient.get('fat', 0)}g")
            
            # Instructions
            if 'instructions' in meal_data:
                st.markdown("**Preparation Instructions:**")
                st.markdown(meal_data['instructions'])
    
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
                    for meal_type, meal_data in meal_plan.items():
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
                user_info = {
                    'name': 'Fitomics User',
                    'plan_type': 'Standalone Meal Plan',
                    'generation_date': datetime.now().strftime('%B %d, %Y')
                }
                
                pdf_path = export_meal_plan_pdf(meal_data_for_pdf, user_info)
                
                if pdf_path and os.path.exists(pdf_path):
                    st.success("✅ PDF generated successfully!")
                    
                    # Provide download link
                    with open(pdf_path, "rb") as pdf_file:
                        st.download_button(
                            label="⬇️ Download PDF",
                            data=pdf_file.read(),
                            file_name=f"fitomics_meal_plan_{datetime.now().strftime('%Y%m%d')}.pdf",
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
            if meal_plan:
                for meal_type, meal_data in meal_plan.items():
                    for ingredient in meal_data.get('ingredients', []):
                        grocery_items.append({
                            'Item': ingredient.get('item', 'Unknown'),
                            'Amount': ingredient.get('amount', 'N/A'),
                            'Meal': meal_type.title()
                        })
            
            if grocery_items:
                st.markdown("### 🛒 Grocery List")
                grocery_df = pd.DataFrame(grocery_items)
                st.dataframe(grocery_df, use_container_width=True, hide_index=True)
                
                # Text format for copying
                grocery_text = "\n".join([f"• {item['Item']}: {item['Amount']}" for item in grocery_items])
                st.text_area("Copy your grocery list:", grocery_text, height=200)
    
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