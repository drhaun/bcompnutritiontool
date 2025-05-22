import streamlit as st
import pandas as pd
import datetime
import copy
import json
import os
import sys

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Weekly Schedule",
    page_icon="📅",
    layout="wide"
)

# Initialize session state for schedule if needed
if 'weekly_schedule' not in st.session_state:
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Create empty schedule for each day
    day_template = {
        "meals": [],
        "workouts": [],
        "work": []  # This includes all other activities
    }
    
    days_dict = {}
    for day in days_of_week:
        days_dict[day] = copy.deepcopy(day_template)
    
    st.session_state.weekly_schedule = {
        "wake_time": "06:00",
        "bed_time": "22:00",
        "days": days_dict
    }

# Initialize session state for activity popup
if 'add_activity_popup' not in st.session_state:
    st.session_state.add_activity_popup = False
    st.session_state.add_activity_hour = None
    st.session_state.add_activity_day = None

# Helper function to convert time string to decimal hours
def time_to_hours(time_str):
    if not time_str:
        return 0
    
    hours, minutes = map(int, time_str.split(":"))
    return hours + minutes / 60

# Header and description
st.title("Weekly Schedule Planner")
st.write("Plan your meals, workouts, and other activities throughout the week.")

# Define activity types and templates
activity_types = {
    "Meals": [
        {"name": "Breakfast", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Lunch", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Dinner", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Snack", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Pre-workout", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Post-workout", "color": "#FF9F1C", "icon": "🍽️"},
    ],
    "Workouts": [
        {"name": "Strength", "duration": 60, "color": "#2EC4B6", "icon": "💪"},
        {"name": "Cardio", "duration": 45, "color": "#2EC4B6", "icon": "🏃"},
        {"name": "HIIT", "duration": 30, "color": "#2EC4B6", "icon": "⚡"},
        {"name": "Yoga", "duration": 45, "color": "#2EC4B6", "icon": "🧘"},
    ],
    "Activities": [
        {"name": "Work", "duration": 480, "color": "#E71D36", "icon": "💼"},
        {"name": "Study", "duration": 120, "color": "#E71D36", "icon": "📚"},
        {"name": "Family", "duration": 120, "color": "#E71D36", "icon": "👨‍👩‍👧‍👦"},
        {"name": "Free Time", "duration": 60, "color": "#E71D36", "icon": "🎮"},
        {"name": "Sleep", "duration": 480, "color": "#E71D36", "icon": "😴"},
        {"name": "Wake Up", "duration": 30, "color": "#E71D36", "icon": "⏰"},
    ]
}

# Quick template patterns
template_options = {
    "3 Meals": [
        {"type": "meal", "name": "Breakfast", "time": "07:30"},
        {"type": "meal", "name": "Lunch", "time": "12:30"}, 
        {"type": "meal", "name": "Dinner", "time": "18:30"}
    ],
    "5 Meals": [
        {"type": "meal", "name": "Breakfast", "time": "07:00"},
        {"type": "meal", "name": "Snack", "time": "10:00"},
        {"type": "meal", "name": "Lunch", "time": "13:00"},
        {"type": "meal", "name": "Snack", "time": "16:00"},
        {"type": "meal", "name": "Dinner", "time": "19:00"}
    ],
    "Workout Day": [
        {"type": "meal", "name": "Breakfast", "time": "07:00"},
        {"type": "meal", "name": "Pre-workout", "time": "15:30"},
        {"type": "workout", "start": "16:30", "end": "17:30", "type": "Strength", "intensity": "Moderate"},
        {"type": "meal", "name": "Post-workout", "time": "18:00"},
        {"type": "meal", "name": "Dinner", "time": "20:00"}
    ],
    "Work Day": [
        {"type": "activity", "type": "Wake Up", "start": "06:30", "end": "07:00"},
        {"type": "meal", "name": "Breakfast", "time": "07:15"},
        {"type": "activity", "type": "Work", "start": "09:00", "end": "17:00"},
        {"type": "meal", "name": "Lunch", "time": "12:30"},
        {"type": "workout", "start": "18:00", "end": "19:00", "type": "Workout", "intensity": "Moderate"},
        {"type": "meal", "name": "Dinner", "time": "19:30"},
        {"type": "activity", "type": "Sleep", "start": "22:30", "end": "06:30"}
    ]
}

# Day selection and templates in the header
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
col1, col2 = st.columns(2)

with col1:
    selected_day = st.selectbox("Select day:", days_of_week, format_func=lambda x: f"{x}")
    day_data = st.session_state.weekly_schedule['days'][selected_day]

with col2:
    template_name = st.selectbox("Apply template:", ["None"] + list(template_options.keys()))
    
    if template_name != "None" and st.button("Apply Template"):
        # Clear existing day data
        st.session_state.weekly_schedule['days'][selected_day]['meals'] = []
        st.session_state.weekly_schedule['days'][selected_day]['workouts'] = [] 
        st.session_state.weekly_schedule['days'][selected_day]['work'] = []
        
        # Add template items
        for item in template_options[template_name]:
            if "type" in item and item["type"] == "meal":
                st.session_state.weekly_schedule['days'][selected_day]['meals'].append({
                    "name": item["name"],
                    "time": item["time"]
                })
            elif "type" in item and item["type"] == "workout":
                st.session_state.weekly_schedule['days'][selected_day]['workouts'].append({
                    "type": item["type"],
                    "start": item["start"],
                    "end": item["end"],
                    "intensity": item.get("intensity", "Moderate")
                })
            elif "type" in item:  # Activity
                st.session_state.weekly_schedule['days'][selected_day]['work'].append({
                    "type": item["type"],
                    "start": item["start"],
                    "end": item["end"]
                })
        
        st.success(f"Applied template '{template_name}' to {selected_day}")
        st.rerun()

# Create timeline for selected day
st.write(f"### {selected_day}'s Schedule")

# Prepare list of activities for the day
min_hour = 6  # Start at 6am
max_hour = 23  # End at 11pm
all_activities = []

# Add meals to timeline
for idx, meal in enumerate(day_data['meals']):
    hour = int(time_to_hours(meal['time']))
    if min_hour <= hour <= max_hour:
        all_activities.append({
            "type": "meal",
            "name": meal['name'],
            "time": meal['time'],
            "hour": hour,
            "idx": idx,
            "color": "#FF9F1C",
            "icon": "🍽️"
        })

# Add workouts to timeline
for idx, workout in enumerate(day_data['workouts']):
    start_hour = int(time_to_hours(workout['start']))
    end_hour = int(time_to_hours(workout['end']))
    
    # Handle overnight workouts
    if end_hour < start_hour:
        end_hour += 24
        
    if min_hour <= start_hour <= max_hour or min_hour <= end_hour <= max_hour:
        all_activities.append({
            "type": "workout",
            "name": workout['type'],
            "time": workout['start'],
            "start": workout['start'],
            "end": workout['end'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#2EC4B6",
            "icon": "💪"
        })

# Add other activities to timeline
for idx, activity in enumerate(day_data['work']):
    start_hour = int(time_to_hours(activity['start']))
    end_hour = int(time_to_hours(activity['end']))
    
    # Handle overnight activities
    if end_hour < start_hour:
        end_hour += 24
        
    if min_hour <= start_hour <= max_hour or min_hour <= end_hour <= max_hour:
        all_activities.append({
            "type": "activity",
            "name": activity['type'],
            "time": activity['start'],
            "start": activity['start'],
            "end": activity['end'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#E71D36",
            "icon": "📆"
        })

# Sort activities by time
all_activities.sort(key=lambda x: x['hour'])

# Display the timeline
for hour in range(min_hour, max_hour + 1):
    # Find activities in this hour
    hour_activities = [a for a in all_activities 
                     if a['hour'] <= hour < a.get('end_hour', a['hour'] + 1)]
    
    # Create a row for this hour
    st.markdown(f"**{hour:02d}:00**")
    
    if hour_activities:
        # Display activities in this hour
        for activity in hour_activities:
            with st.container(border=True):
                cols = st.columns([0.9, 0.1])
                
                # Show activity details
                if activity['hour'] == hour:
                    # Activity starts in this hour
                    if activity['type'] == 'meal':
                        cols[0].write(f"{activity['icon']} {activity['name']} ({activity['time']})")
                    else:
                        cols[0].write(f"{activity['icon']} {activity['name']} ({activity['start']}-{activity['end']})")
                        
                    # Add delete button
                    if cols[1].button("❌", key=f"delete_{activity['type']}_{activity['idx']}_{hour}"):
                        if activity['type'] == 'meal':
                            st.session_state.weekly_schedule['days'][selected_day]['meals'].pop(activity['idx'])
                        elif activity['type'] == 'workout':
                            st.session_state.weekly_schedule['days'][selected_day]['workouts'].pop(activity['idx'])
                        else:
                            st.session_state.weekly_schedule['days'][selected_day]['work'].pop(activity['idx'])
                        st.success(f"Removed activity")
                        st.rerun()
                else:
                    # Activity continues from previous hour
                    cols[0].write(f"{activity['icon']} {activity['name']} (continued)")
    else:
        # Empty time slot - show add button
        if st.button(f"+ Add activity at {hour:02d}:00", key=f"add_{hour}"):
            st.session_state.add_activity_popup = True
            st.session_state.add_activity_hour = hour
            st.session_state.add_activity_day = selected_day
            st.rerun()
    
    # Add divider between hours
    st.markdown("---")

# Show popup for adding activity
if st.session_state.add_activity_popup:
    with st.container(border=True):
        popup_hour = st.session_state.add_activity_hour
        popup_day = st.session_state.add_activity_day
        
        st.subheader(f"Add to {popup_day} at {popup_hour:02d}:00")
        
        # Create tabs for different activity types
        add_tabs = st.tabs(["Meal", "Workout", "Other Activity"])
        
        # Meal tab
        with add_tabs[0]:
            meal_name = st.selectbox(
                "Meal type:",
                [meal["name"] for meal in activity_types["Meals"]],
                key="popup_meal_name"
            )
            
            if st.button("Add Meal", key="add_meal_btn"):
                st.session_state.weekly_schedule['days'][popup_day]['meals'].append({
                    "name": meal_name,
                    "time": f"{popup_hour:02d}:00"
                })
                st.success(f"Added {meal_name} at {popup_hour:02d}:00")
                st.session_state.add_activity_popup = False
                st.rerun()
        
        # Workout tab
        with add_tabs[1]:
            workout_name = st.selectbox(
                "Workout type:",
                [workout["name"] for workout in activity_types["Workouts"]],
                key="popup_workout_name"
            )
            
            # Find duration for selected workout
            duration = 60
            for workout in activity_types["Workouts"]:
                if workout["name"] == workout_name:
                    duration = workout["duration"]
                    break
            
            # Calculate end time
            end_hour = popup_hour + (duration // 60)
            end_minute = duration % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"Duration: {duration} minutes (ends at {end_time})")
            
            if st.button("Add Workout", key="add_workout_btn"):
                st.session_state.weekly_schedule['days'][popup_day]['workouts'].append({
                    "type": workout_name,
                    "start": f"{popup_hour:02d}:00",
                    "end": end_time,
                    "intensity": "Moderate"
                })
                st.success(f"Added {workout_name} at {popup_hour:02d}:00")
                st.session_state.add_activity_popup = False
                st.rerun()
        
        # Other Activity tab
        with add_tabs[2]:
            activity_name = st.selectbox(
                "Activity type:",
                [activity["name"] for activity in activity_types["Activities"]],
                key="popup_activity_name"
            )
            
            # Find default duration
            duration_hours = 1
            for activity in activity_types["Activities"]:
                if activity["name"] == activity_name:
                    duration_hours = activity["duration"] // 60
                    break
            
            # Let user customize duration
            duration_hours = st.slider(
                "Duration (hours):", 
                min_value=0.5, 
                max_value=8.0, 
                value=float(duration_hours), 
                step=0.5
            )
            
            # Calculate end time
            duration_minutes = int(duration_hours * 60)
            end_hour = popup_hour + (duration_minutes // 60)
            end_minute = duration_minutes % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"End time: {end_time}")
            
            if st.button("Add Activity", key="add_activity_btn"):
                st.session_state.weekly_schedule['days'][popup_day]['work'].append({
                    "type": activity_name,
                    "start": f"{popup_hour:02d}:00",
                    "end": end_time
                })
                st.success(f"Added {activity_name} at {popup_hour:02d}:00")
                st.session_state.add_activity_popup = False
                st.rerun()
        
        # Cancel button
        if st.button("Cancel", key="popup_cancel"):
            st.session_state.add_activity_popup = False
            st.rerun()

# Copy schedule to other days
st.write("### Copy Schedule to Other Days")
copy_cols = st.columns([2, 1])

with copy_cols[0]:
    target_day = st.selectbox(
        "Copy current schedule to:",
        [d for d in days_of_week if d != selected_day]
    )
    
with copy_cols[1]:
    if st.button("Copy Schedule"):
        # Deep copy all schedule items
        st.session_state.weekly_schedule['days'][target_day]['meals'] = copy.deepcopy(
            st.session_state.weekly_schedule['days'][selected_day]['meals']
        )
        st.session_state.weekly_schedule['days'][target_day]['workouts'] = copy.deepcopy(
            st.session_state.weekly_schedule['days'][selected_day]['workouts']
        )
        st.session_state.weekly_schedule['days'][target_day]['work'] = copy.deepcopy(
            st.session_state.weekly_schedule['days'][selected_day]['work']
        )
        
        st.success(f"Copied schedule from {selected_day} to {target_day}")
        st.rerun()