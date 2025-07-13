# OpenAI Prompt Analysis for Fitomics Meal Planning

## Overview
This document provides a comprehensive breakdown of the OpenAI prompts used in both the **Advanced AI Meal Plan** (weekly) and **Standalone AI Meal Plan** (daily) systems to ensure robust meal planning that considers all user selections and preferences.

## 1. Advanced AI Meal Plan (Weekly) - `pages/7_Advanced_AI_Meal_Plan.py`

### Function: `generate_weekly_ai_meal_plan()`

### User Data Integration:

#### **USER PROFILE CONTEXT:**
```python
- Age: {user_profile.get('age', 'Not specified')} years
- Gender: {user_profile.get('gender', 'Not specified')}
- Height: {user_profile.get('height_ft', 'Not specified')}'{user_profile.get('height_in', '')}\"
- Activity Level: {user_profile.get('activity_level', 'Not specified')}
- Experience Level: {user_profile.get('experience_level', 'Not specified')}
```

#### **BODY COMPOSITION GOALS:**
```python
- Primary Goal: {body_comp_goals.get('goal_type', 'Not specified')}
- Current Weight: {user_profile.get('weight_lbs', 'Not specified')} lbs
- Target Weight: {st.session_state.get('target_weight_lbs', 'Not specified')} lbs
- Target Body Fat: {st.session_state.get('target_bf', 'Not specified')}%
- Timeline: {st.session_state.get('timeline_weeks', 'Not specified')} weeks
```

#### **DIETARY PREFERENCES & RESTRICTIONS:**
```python
- Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- Allergies: {', '.join(diet_preferences.get('allergies', []))}
- Disliked Foods: {', '.join(diet_preferences.get('disliked_foods', [])[:5])}

FOOD PREFERENCES:
- Preferred Proteins: {', '.join(diet_preferences.get('preferred_proteins', [])[:5])}
- Preferred Carbs: {', '.join(diet_preferences.get('preferred_carbs', [])[:5])}
- Preferred Fats: {', '.join(diet_preferences.get('preferred_fats', [])[:5])}
- Preferred Vegetables: {', '.join(diet_preferences.get('preferred_vegetables', [])[:5])}
- Preferred Cuisines: {', '.join(diet_preferences.get('cuisine_preferences', [])[:3])}
```

#### **PRACTICAL PREFERENCES:**
```python
- Cooking Time: {diet_preferences.get('cooking_time_preference', 'Not specified')}
- Budget: {diet_preferences.get('budget_preference', 'Not specified')}
- Meal Sourcing: Home cooking interest - {diet_preferences.get('home_cooking_interest', 'High')}
- Meal Frequency: {diet_preferences.get('meal_frequency', 'Not specified')}
```

#### **VARIETY PREFERENCES:**
```python
- Variety Level: {diet_preferences.get('variety_level', 'Moderate Variety')}
- Repetition Preference: {diet_preferences.get('repetition_preference', 'I like some repetition but with variations')}
- Weekly Structure: {diet_preferences.get('weekly_structure', 'Mix of routine and variety')}
- Cooking Variety: {diet_preferences.get('cooking_variety', 'Some variety in cooking methods')}
```

#### **DAILY SCHEDULE CONTEXT** (Per Day):
```python
- Wake time: {schedule_info.get('wake_time', '07:00')}
- Sleep time: {schedule_info.get('bed_time', '23:00')}
- Work schedule: {schedule_info.get('work_start', 'N/A')} - {schedule_info.get('work_end', 'N/A')}
- Workout day: {len(schedule_info.get('workouts', [])) > 0}
- Workout times: {', '.join([f"{w.get('time', 'N/A')} ({w.get('duration', 0)}min {w.get('type', 'workout')})" for w in schedule_info.get('workouts', [])])}
- Estimated TDEE: {schedule_info.get('total_calories', 2000)} calories
```

#### **FLAVOR & SEASONING REQUIREMENTS:**
```python
- Spice Level: {diet_preferences.get('spice_level', 'Medium')} - adjust heat accordingly
- Flavor Profiles: {', '.join(diet_preferences.get('flavor_profile', ['Savory/Umami', 'Herbal']))} - emphasize these tastes
- Preferred Seasonings: {', '.join(diet_preferences.get('preferred_seasonings', ['Salt', 'Black Pepper', 'Garlic Powder', 'Oregano']))} - use these in recipes
- Cooking Enhancers: {', '.join(diet_preferences.get('cooking_enhancers', ['Olive Oil', 'Lemon Juice', 'Garlic']))} - incorporate these for flavor
```

### Critical Requirements in Advanced Prompt:

1. **MACRO ACCURACY (±3% tolerance)** - Highest priority
2. **WORKOUT PROXIMITY MEAL TIMING** - Critical for performance
3. **INGREDIENT PRECISION** - Specific quantities with exact macros
4. **MEAL CONTEXT OPTIMIZATION** - Pre/post workout specifications
5. **VARIETY CONTROL** - User-defined variety levels enforced
6. **PRACTICAL CONSIDERATIONS** - Cooking time, budget, timing
7. **FLAVOR REQUIREMENTS** - Specific seasoning and taste preferences
8. **QUALITY ASSURANCE** - Multiple validation checkpoints

### Model Configuration:
- **Model**: GPT-4o (latest)
- **Temperature**: 0.1 (maximum calculation consistency)
- **Max Tokens**: 4000 (detailed responses)
- **Response Format**: JSON object
- **System Role**: Professional nutritionist with macro calculation expertise

---

## 2. Standalone AI Meal Plan (Daily) - `pages/6_Standalone_AI_Meal_Plan.py`

### Function: `generate_standalone_meal_plan()`

### User Data Integration:

#### **USER PROFILE:**
```python
- Name: {user_profile.get('name', 'User')}
- Age: {user_profile.get('age', 'N/A')} years
- Gender: {user_profile.get('gender', 'N/A')}
- Weight: {user_profile.get('weight_kg', 'N/A')} kg
- Height: {user_profile.get('height_cm', 'N/A')} cm
- Body Fat: {user_profile.get('body_fat_pct', 'N/A')}%
- TDEE: {user_profile.get('tdee', 'N/A')} calories
- Goal: {user_profile.get('goal_type', 'N/A')}
```

#### **NUTRITION TARGETS:**
```python
{json.dumps(meal_targets, indent=2)}
```

#### **DIETARY PREFERENCES & RESTRICTIONS:**
```python
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
```

#### **DAILY SCHEDULE:**
```python
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
```

### Requirements in Standalone Prompt:

1. **Realistic meals** with specific food items and portions
2. **Accurate macro calculations** matching targets (±3% tolerance)
3. **Practical cooking instructions** with timing
4. **Workout proximity meal timing** (same as advanced)
5. **Preferred ingredient usage** and dietary restriction respect
6. **Cooking style and spice preference** matching
7. **Budget and cooking time consideration**
8. **Meal context and variety level optimization**

### Model Configuration:
- **Model**: GPT-4o (latest)
- **Temperature**: 0.1 (consistent calculations)
- **Max Tokens**: 3000
- **Response Format**: JSON object
- **System Role**: Nutrition expert with macro calculation focus

---

## 3. Key Differences Between Systems

### Advanced AI Meal Plan (Weekly):
- **Comprehensive body composition integration** with target weights and timelines
- **Day-specific schedule optimization** with varying TDEE requirements
- **Weekly variety enforcement** to prevent repetition across days
- **Enhanced flavor and seasoning requirements** with specific preferences
- **More detailed validation checkpoints** and error handling
- **Longer, more detailed prompts** with extensive context

### Standalone AI Meal Plan (Daily):
- **Simplified user profile** focused on daily needs
- **Single-day optimization** without weekly context
- **Streamlined dietary preferences** collection
- **Faster generation** for immediate meal planning
- **Compact JSON response** format for single-day planning

---

## 4. Critical Prompt Engineering Features

### Both Systems Include:

#### **Macro Accuracy Requirements:**
- ±3% tolerance enforced strictly
- Exact ingredient quantities with measurements
- Nutritionally accurate macro values
- Validation checkpoints before response

#### **Workout Proximity Optimization:**
- Pre-workout: Low fat (<10g), moderate carbs (20-40g), some protein (15-25g)
- Post-workout: High protein (25-40g), moderate-high carbs (30-50g), lower fat (<15g)
- During workout window: Light, easily digestible options
- Fasted training consideration

#### **User Preference Integration:**
- Dietary restrictions and allergies strictly enforced
- Preferred foods prioritized in meal selection
- Cuisine preferences respected
- Cooking time and budget constraints considered
- Spice and flavor profile matching

#### **Quality Assurance:**
- Multiple calculation validation steps
- Ingredient conflict checking
- Realistic portion size verification
- Daily total verification against targets

---

## 5. Data Sources and Validation

### User Data Captured:
- **Personal Info**: Age, gender, height, weight, body fat percentage
- **Goals**: Weight targets, body fat targets, timeline
- **Activity**: TDEE calculations, workout schedules, activity levels
- **Preferences**: 50+ dietary preference categories
- **Schedule**: Daily timing, work schedule, sleep schedule
- **Practical**: Budget, cooking time, meal prep interest

### Validation Points:
- Form input validation before API call
- Macro calculation verification post-generation
- Accuracy scoring and feedback display
- Error handling and regeneration options

---

## 6. Continuous Improvement Areas

### Current Strengths:
- Comprehensive user data integration
- Strict macro accuracy requirements
- Workout timing optimization
- Extensive preference consideration
- Multiple validation checkpoints

### Enhancement Opportunities:
- Ingredient substitution suggestions
- Seasonal availability consideration
- Local cuisine integration
- Micronutrient optimization
- Meal prep timing coordination

This analysis demonstrates that both meal planning systems comprehensively consider user selections and preferences through detailed prompt engineering and extensive data integration.