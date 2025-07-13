"""
Progressive Summary System for Fitomics App
Shows cumulative progress through the planning workflow
"""

import streamlit as st
from datetime import datetime

def show_progress_summary(current_page):
    """
    Display a progressive summary based on current page and completed steps
    
    Parameters:
    current_page (str): Current page name ('initial_setup', 'body_comp', 'diet_prefs', 'weekly_schedule', 'nutrition_targets')
    """
    
    # Define page order and check completion
    pages = ['initial_setup', 'body_comp', 'diet_prefs', 'weekly_schedule', 'nutrition_targets']
    current_index = pages.index(current_page) if current_page in pages else 0
    
    # Check completion status
    setup_complete = bool(st.session_state.get('user_info', {}).get('name'))
    body_comp_complete = bool(st.session_state.get('targets_set', False))
    diet_prefs_complete = bool(st.session_state.get('diet_preferences', {}).get('dietary_restrictions'))
    weekly_schedule_complete = bool(st.session_state.get('weekly_schedule_v2', {}).get('basic_schedule'))
    nutrition_targets_complete = bool(st.session_state.get('nutrition_targets_confirmed', False))
    
    # Only show summary if we have some progress
    if not setup_complete:
        return
    
    st.markdown("---")
    st.markdown("## 📋 Your Planning Progress")
    st.markdown("*Summary of selections made so far*")
    
    # Progress indicators
    progress_items = [
        ("✅" if setup_complete else "⏳", "Initial Setup", setup_complete),
        ("✅" if body_comp_complete else "⏳", "Body Composition Goals", body_comp_complete),
        ("✅" if diet_prefs_complete else "⏳", "Diet Preferences", diet_prefs_complete),
        ("✅" if weekly_schedule_complete else "⏳", "Weekly Schedule", weekly_schedule_complete),
        ("✅" if nutrition_targets_complete else "⏳", "Nutrition Targets", nutrition_targets_complete),
    ]
    
    # Show progress bar
    progress_col1, progress_col2 = st.columns([3, 1])
    with progress_col1:
        progress_text = " → ".join([f"{icon} {name}" for icon, name, complete in progress_items[:current_index + 1]])
        st.markdown(f"**Progress:** {progress_text}")
    
    with progress_col2:
        completed_steps = sum(1 for _, _, complete in progress_items if complete)
        st.markdown(f"**Step {current_index + 1}/5** ({completed_steps} complete)")
    
    # Show summaries for completed steps
    col1, col2 = st.columns(2)
    
    with col1:
        # Initial Setup Summary
        if setup_complete and current_index >= 0:
            st.markdown("### 👤 Personal Information")
            user_info = st.session_state.get('user_info', {})
            
            # Basic info
            name = user_info.get('name', 'Not set')
            gender = user_info.get('gender', 'Not set')
            age = user_info.get('age', 'Not set')
            
            # Height and weight (show in user's preferred units)
            if user_info.get('use_imperial', True):
                height_display = f"{user_info.get('height_ft', 0)}'{user_info.get('height_in', 0)}\""
                weight_display = f"{user_info.get('weight_lbs', 0)} lbs"
            else:
                height_display = f"{user_info.get('height_cm', 0)} cm"
                weight_display = f"{user_info.get('weight_kg', 0)} kg"
            
            st.write(f"**{name}** • {gender} • {age} years old")
            st.write(f"**Height:** {height_display}")
            st.write(f"**Weight:** {weight_display}")
            st.write(f"**Body Fat:** {user_info.get('body_fat_percentage', 0)}%")
            st.write(f"**Activity Level:** {user_info.get('activity_level', 'Not set')}")
            st.write(f"**Goal Focus:** {user_info.get('goal_focus', 'Not set')}")
        
        # Body Composition Goals Summary
        if body_comp_complete and current_index >= 1:
            st.markdown("### 🎯 Body Composition Goals")
            
            # Get goal type from goal_info
            goal_info = st.session_state.get('goal_info', {})
            goal_type = goal_info.get('goal_type', 'Not set')
            if goal_type == 'lose_fat':
                goal_type = 'Lose Fat'
            elif goal_type == 'gain_muscle':
                goal_type = 'Build Muscle'
            elif goal_type == 'maintain':
                goal_type = 'Maintain Weight'
            
            st.write(f"**Goal Type:** {goal_type}")
            
            # Get target values from session state
            target_weight = st.session_state.get('target_weight', 0)
            target_bf = st.session_state.get('target_bf', 0)
            
            if target_weight > 0:
                st.write(f"**Target Weight:** {target_weight:.1f} lbs")
            if target_bf > 0:
                st.write(f"**Target Body Fat:** {target_bf:.1f}%")
            
            # Weekly rate info
            weekly_weight_pct = goal_info.get('weekly_weight_pct', 0)
            if weekly_weight_pct != 0:
                current_weight = st.session_state.get('user_info', {}).get('weight_lbs', 0)
                weekly_change = abs(weekly_weight_pct * current_weight)
                direction = 'gain' if weekly_weight_pct > 0 else 'loss'
                st.write(f"**Weekly Rate:** {weekly_change:.2f} lbs {direction}/week")
    
    with col2:
        # Diet Preferences Summary
        if diet_prefs_complete and current_index >= 2:
            st.markdown("### 🍽️ Diet Preferences")
            diet_prefs = st.session_state.get('diet_preferences', {})
            
            # Dietary restrictions
            restrictions = diet_prefs.get('dietary_restrictions', [])
            if restrictions:
                st.write(f"**Dietary Restrictions:** {', '.join(restrictions)}")
            
            # Preferred foods (show just counts to save space)
            proteins = diet_prefs.get('preferred_proteins', [])
            carbs = diet_prefs.get('preferred_carbs', [])
            fats = diet_prefs.get('preferred_fats', [])
            vegetables = diet_prefs.get('preferred_vegetables', [])
            
            if proteins:
                st.write(f"**Preferred Proteins:** {len(proteins)} selected")
            if carbs:
                st.write(f"**Preferred Carbs:** {len(carbs)} selected")
            if fats:
                st.write(f"**Preferred Fats:** {len(fats)} selected")
            if vegetables:
                st.write(f"**Preferred Vegetables:** {len(vegetables)} selected")
            
            # Cuisine preferences
            cuisines = diet_prefs.get('preferred_cuisines', [])
            if cuisines:
                st.write(f"**Cuisines:** {', '.join(cuisines[:3])}")
            
            # Cooking preferences
            cooking_time = diet_prefs.get('cooking_time', '')
            if cooking_time:
                st.write(f"**Cooking Time:** {cooking_time}")
            
            variety_level = diet_prefs.get('variety_level', '')
            if variety_level:
                st.write(f"**Variety Level:** {variety_level}")
        
        # Weekly Schedule Summary
        if weekly_schedule_complete and current_index >= 3:
            st.markdown("### 📅 Weekly Schedule")
            weekly_schedule = st.session_state.get('weekly_schedule_v2', {})
            
            # Basic schedule info
            basic_schedule = weekly_schedule.get('basic_schedule', {})
            if basic_schedule:
                wake_time = basic_schedule.get('wake_time', 'Not set')
                sleep_time = basic_schedule.get('sleep_time', 'Not set')
                work_start = basic_schedule.get('work_start', 'Not set')
                work_end = basic_schedule.get('work_end', 'Not set')
                
                st.write(f"**Wake Time:** {wake_time}")
                st.write(f"**Sleep Time:** {sleep_time}")
                st.write(f"**Work Hours:** {work_start} - {work_end}")
            
            # Workout info
            workout_frequency = weekly_schedule.get('workout_frequency', 0)
            if workout_frequency > 0:
                st.write(f"**Workouts per Week:** {workout_frequency}")
            
            # Meal contexts
            meal_contexts = weekly_schedule.get('meal_contexts', {})
            if meal_contexts:
                st.write(f"**Meal Contexts:** {len(meal_contexts)} meals configured")
        
        # Nutrition Targets Summary
        if nutrition_targets_complete and current_index >= 4:
            st.markdown("### 📊 Nutrition Targets")
            
            # Get from user_info if saved there
            user_info = st.session_state.get('user_info', {})
            target_calories = user_info.get('target_calories', 0)
            target_protein = user_info.get('target_protein', 0)
            target_carbs = user_info.get('target_carbs', 0)
            target_fat = user_info.get('target_fat', 0)
            
            if target_calories > 0:
                st.write(f"**Target Calories:** {target_calories:,}")
            if target_protein > 0:
                st.write(f"**Protein:** {target_protein}g")
            if target_carbs > 0:
                st.write(f"**Carbohydrates:** {target_carbs}g")
            if target_fat > 0:
                st.write(f"**Fat:** {target_fat}g")
    
    # Next steps guidance
    st.markdown("### 🚀 Next Steps")
    if current_index < len(pages) - 1:
        next_page_names = {
            'initial_setup': 'Body Composition Goals',
            'body_comp': 'Diet Preferences',
            'diet_prefs': 'Weekly Schedule',
            'weekly_schedule': 'Nutrition Targets'
        }
        next_page = next_page_names.get(current_page, 'Continue')
        st.info(f"Ready to proceed to **{next_page}**")
    else:
        st.success("🎉 Setup complete! You can now proceed to AI Meal Planning.")