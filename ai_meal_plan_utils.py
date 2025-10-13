"""
Utility functions for AI Meal Planning
Consolidates common functions and error handling
"""

import json
import streamlit as st
from typing import Dict, Any, Optional, Callable
import time

def safe_api_call(func: Callable, *args, max_retries: int = 3, delay: float = 1.0, **kwargs) -> Optional[Any]:
    """
    Safely execute an API call with retry logic
    
    Args:
        func: Function to call
        max_retries: Maximum number of retry attempts
        delay: Delay between retries in seconds
        *args, **kwargs: Arguments to pass to the function
    
    Returns:
        Function result or None if all retries fail
    """
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if attempt < max_retries - 1:
                st.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
                time.sleep(delay * (attempt + 1))  # Exponential backoff
            else:
                st.error(f"All attempts failed: {str(e)}")
                return None
    return None

def safe_json_parse(content: str, default: Dict = None) -> Dict:
    """
    Safely parse JSON content with fallback
    
    Args:
        content: JSON string to parse
        default: Default value if parsing fails
    
    Returns:
        Parsed JSON or default value
    """
    if not content:
        return default or {}
    
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        st.warning(f"JSON parsing error: {str(e)}")
        # Try to extract JSON from the content if it's wrapped in text
        import re
        json_pattern = r'\{[^{}]*\}'
        matches = re.findall(json_pattern, content, re.DOTALL)
        if matches:
            try:
                return json.loads(matches[0])
            except:
                pass
        return default or {}

def validate_meal_macros(meal: Dict, targets: Dict, tolerance: float = 0.03) -> bool:
    """
    Validate meal macros against targets
    
    Args:
        meal: Meal dictionary with 'total_macros' key
        targets: Target macros dictionary
        tolerance: Acceptable percentage deviation (default 3%)
    
    Returns:
        True if macros are within tolerance
    """
    if not meal.get('total_macros') or not targets:
        return False
    
    macros = meal['total_macros']
    for key in ['calories', 'protein', 'carbs', 'fat']:
        if key not in macros or key not in targets:
            return False
        
        target_val = targets.get(key, 0)
        actual_val = macros.get(key, 0)
        
        if target_val > 0:
            deviation = abs(actual_val - target_val) / target_val
            if deviation > tolerance:
                return False
    
    return True

def consolidate_meal_plan_display(meal_plan: Dict, day: str, show_export: bool = True):
    """
    Consolidated function to display a day's meal plan
    
    Args:
        meal_plan: Complete meal plan dictionary
        day: Day to display
        show_export: Whether to show export button
    """
    if day not in meal_plan:
        st.warning(f"No meal plan found for {day}")
        return
    
    day_plan = meal_plan[day]
    
    # Export button if requested
    if show_export:
        if st.button(f"📄 Export {day} PDF", key=f"export_{day}_pdf"):
            export_single_day_pdf(day, day_plan)
    
    # Display metadata
    if day_plan.get('meal_structure_rationale'):
        st.markdown(f"**Rationale:** {day_plan['meal_structure_rationale']}")
    
    # Validation status
    if day_plan.get('accuracy_validated', False):
        st.success("✅ Macro Accuracy Validated")
    else:
        st.warning("⚠️ Needs Accuracy Review")
    
    # Display meals
    meals = day_plan.get('meals', [])
    for i, meal in enumerate(meals, 1):
        display_meal(meal, i)

def display_meal(meal: Dict, index: int):
    """
    Display a single meal with consistent formatting
    
    Args:
        meal: Meal dictionary
        index: Meal number
    """
    # Determine meal label
    if index <= 3:
        meal_label = f"Meal {index}"
    else:
        meal_label = f"Snack {index - 3}"
    
    st.markdown(f"### {meal_label}")
    
    # Timing and context
    if meal.get('time'):
        st.markdown(f"**Time:** {meal['time']}")
    if meal.get('context'):
        st.markdown(f"**Context:** {meal['context']}")
    if meal.get('prep_time'):
        st.markdown(f"**Prep Time:** {meal['prep_time']}")
    
    # Macros display
    macros = meal.get('total_macros', {})
    if macros:
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Calories", f"{macros.get('calories', 0):.0f}")
        with col2:
            st.metric("Protein", f"{macros.get('protein', 0):.1f}g")
        with col3:
            st.metric("Carbs", f"{macros.get('carbs', 0):.1f}g")
        with col4:
            st.metric("Fat", f"{macros.get('fat', 0):.1f}g")
    
    # Ingredients
    ingredients = meal.get('ingredients', [])
    if ingredients:
        st.markdown("**Ingredients:**")
        for ingredient in ingredients:
            amount = ingredient.get('amount', '')
            item = ingredient.get('item', 'Unknown ingredient')
            st.markdown(f"• {amount} {item}")
    
    # Instructions
    instructions = meal.get('instructions', [])
    if instructions:
        st.markdown("**Instructions:**")
        for j, instruction in enumerate(instructions, 1):
            st.markdown(f"{j}. {instruction}")
    
    st.markdown("---")

def export_single_day_pdf(day: str, day_plan: Dict):
    """
    Export a single day's meal plan to PDF
    
    Args:
        day: Day name
        day_plan: Day's meal plan data
    """
    from datetime import datetime
    from pdf_export import export_meal_plan_pdf
    
    try:
        single_day_plan = {day: day_plan}
        
        # Get plan info from session state
        plan_info = {
            'user_profile': st.session_state.get('user_info', {}),
            'body_comp_goals': st.session_state.get('goal_info', {}),
            'diet_preferences': st.session_state.get('diet_preferences', {}),
            'weekly_schedule': st.session_state.get('weekly_schedule_v2', {}),
            'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {})
        }
        
        pdf_buffer = export_meal_plan_pdf(single_day_plan, plan_info)
        
        if pdf_buffer:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            st.download_button(
                label=f"📥 Download {day} PDF",
                data=pdf_buffer,
                file_name=f"fitomics_{day.lower()}_{timestamp}.pdf",
                mime="application/pdf",
                key=f"download_{day}_pdf"
            )
            st.success(f"✅ {day} PDF generated successfully!")
    except Exception as e:
        st.error(f"❌ PDF export failed: {str(e)}")

def build_meal_prompt(meal_number: int, meal_targets: Dict, user_context: str, dietary_context: str, 
                      schedule_context: str = "") -> str:
    """
    Build a consistent prompt for meal generation
    
    Args:
        meal_number: Meal number (1-5)
        meal_targets: Target macros for the meal
        user_context: User profile context
        dietary_context: Dietary preferences context
        schedule_context: Day's schedule context
        
    Returns:
        Formatted prompt string
    """
    meal_type = "Meal" if meal_number <= 3 else "Snack"
    meal_index = meal_number if meal_number <= 3 else meal_number - 3
    
    prompt = f"""
Create {meal_type} {meal_index} with these requirements:

MACRO TARGETS (±3% tolerance):
- Calories: {meal_targets.get('calories', 0):.0f}
- Protein: {meal_targets.get('protein', 0):.1f}g
- Carbs: {meal_targets.get('carbs', 0):.1f}g
- Fat: {meal_targets.get('fat', 0):.1f}g

{user_context}

{dietary_context}

{schedule_context}

Return a JSON object with:
- name: Simple meal name
- time: Suggested eating time
- context: Where/when to eat
- prep_time: Preparation time needed
- ingredients: List of {{amount, item, calories, protein, carbs, fat}}
- instructions: Step-by-step preparation
- total_macros: {{calories, protein, carbs, fat}}

Ensure exact macro accuracy by adjusting portion sizes.
"""
    
    return prompt