import streamlit as st
import pandas as pd
import datetime
import copy
import numpy as np
import json
import os

# Initialize session state variables for weekly schedule 
if 'weekly_schedule' not in st.session_state:
    # Create template for weekly schedule
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    wake_time = "06:00"
    bed_time = "22:00"
    
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
        "wake_time": wake_time,
        "bed_time": bed_time,
        "days": days_dict
    }

# Initialize session state for quick add
if 'show_add_popup' not in st.session_state:
    st.session_state.show_add_popup = False
    st.session_state.add_time_hour = None
    st.session_state.add_day = None

# Helper function to convert time string to decimal hours
def time_to_hours(time_str):
    if not time_str:
        return 0
    
    hours, minutes = map(int, time_str.split(":"))
    return hours + minutes / 60

# Create a clean, streamlined weekly schedule view
st.write("### Weekly Schedule")

# Define common activity types for quick selection in a more concise format
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

# Set up day selection with a clean interface
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
cols = st.columns([1, 1])
with cols[0]:
    selected_day = st.selectbox("Select day:", days_of_week, format_func=lambda x: f"📅 {x}")
    day_data = st.session_state.weekly_schedule['days'][selected_day]

with cols[1]:
    # Template patterns for quick schedule creation
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
    
    template_name = st.selectbox("Quick template:", ["None"] + list(template_options.keys()))
    
    if template_name != "None" and st.button("Apply Template"):
        # Clear existing day data first
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

# Daily timeline display
st.write(f"#### {selected_day}'s Schedule")

# Create fixed time range
min_hour = 6  # 6 AM
max_hour = 24  # Midnight

# Prepare a list of all activities sorted by time
all_day_activities = []

# Add meals
for idx, meal in enumerate(day_data['meals']):
    hour = int(time_to_hours(meal['time']))
    if min_hour <= hour <= max_hour:
        all_day_activities.append({
            "type": "meal",
            "name": meal['name'],
            "time": meal['time'],
            "hour": hour,
            "idx": idx,
            "color": "#FF9F1C",
            "icon": "🍽️"
        })

# Add workouts
for idx, workout in enumerate(day_data['workouts']):
    start_hour = int(time_to_hours(workout['start']))
    end_hour = int(time_to_hours(workout['end']))
    if end_hour < start_hour:  # Handle overnight
        end_hour += 24
        
    if max(min_hour, start_hour) <= min(max_hour, end_hour):
        all_day_activities.append({
            "type": "workout",
            "name": workout['type'],
            "start": workout['start'],
            "end": workout['end'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#2EC4B6",
            "icon": "💪"
        })

# Add other activities
for idx, activity in enumerate(day_data['work']):
    start_hour = int(time_to_hours(activity['start']))
    end_hour = int(time_to_hours(activity['end']))
    if end_hour < start_hour:  # Handle overnight
        end_hour += 24
        
    if max(min_hour, start_hour) <= min(max_hour, end_hour):
        all_day_activities.append({
            "type": "activity",
            "name": activity['type'],
            "start": activity['start'],
            "end": activity['end'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#E71D36",
            "icon": "📆"
        })
        
# Sort all activities by hour
all_day_activities.sort(key=lambda x: x['hour'])

# Create the timeline
for hour in range(min_hour, max_hour + 1):
    display_hour = hour % 24
    
    # Activities in this hour
    hour_activities = [a for a in all_day_activities 
                      if a['hour'] <= hour and (a.get('end_hour', a['hour'] + 1) > hour)]
    
    # Display the hour
    st.write(f"**{display_hour:02d}:00**")
    
    # Display activities or empty slot with direct add button
    if hour_activities:
        for activity in hour_activities:
            # Create container for the activity
            with st.container(border=True):
                cols = st.columns([0.9, 0.1])
                
                # Show activity details
                if activity['hour'] == hour:
                    if activity['type'] == 'meal':
                        display_text = f"{activity['icon']} {activity['name']} ({activity['time']})"
                    else:
                        display_text = f"{activity['icon']} {activity['name']} ({activity['start']}-{activity['end']})"
                else:
                    display_text = f"{activity['icon']} {activity['name']} (continuing)"
                
                # Display the activity
                cols[0].write(display_text)
                
                # Delete button (only show for start hour)
                if activity['hour'] == hour:
                    delete_key = f"delete_{activity['type']}_{activity['idx']}_{hour}"
                    if cols[1].button("❌", key=delete_key):
                        if activity['type'] == 'meal':
                            st.session_state.weekly_schedule['days'][selected_day]['meals'].pop(activity['idx'])
                        elif activity['type'] == 'workout':
                            st.session_state.weekly_schedule['days'][selected_day]['workouts'].pop(activity['idx'])
                        else:
                            st.session_state.weekly_schedule['days'][selected_day]['work'].pop(activity['idx'])
                        st.success(f"Removed activity")
                        st.rerun()
    else:
        # Empty slot - add button
        add_key = f"add_button_{hour}"
        if st.button(f"+ Add activity at {display_hour:02d}:00", key=add_key):
            st.session_state.show_add_popup = True
            st.session_state.add_time_hour = display_hour
            st.session_state.add_day = selected_day
            st.rerun()
    
    # Separator
    st.markdown("---")

# Quick add popup
if st.session_state.show_add_popup:
    with st.container(border=True):
        popup_hour = st.session_state.add_time_hour
        popup_day = st.session_state.add_day
        
        st.subheader(f"Add to {popup_day} at {popup_hour:02d}:00")
        
        # Create tabs for activity types
        add_tabs = st.tabs(["Meal", "Workout", "Other Activity"])
        
        # Meal tab
        with add_tabs[0]:
            meal_name = st.selectbox(
                "Meal type:", 
                options=[meal["name"] for meal in activity_types["Meals"]],
                key="add_meal_name"
            )
            
            if st.button("Add Meal", key="add_meal_btn", type="primary"):
                st.session_state.weekly_schedule['days'][popup_day]['meals'].append({
                    "name": meal_name,
                    "time": f"{popup_hour:02d}:00"
                })
                st.success(f"Added {meal_name}")
                st.session_state.show_add_popup = False
                st.rerun()
        
        # Workout tab
        with add_tabs[1]:
            workout_name = st.selectbox(
                "Workout type:",
                options=[workout["name"] for workout in activity_types["Workouts"]],
                key="add_workout_name"
            )
            
            # Get duration
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
            
            if st.button("Add Workout", key="add_workout_btn", type="primary"):
                st.session_state.weekly_schedule['days'][popup_day]['workouts'].append({
                    "type": workout_name,
                    "start": f"{popup_hour:02d}:00",
                    "end": end_time,
                    "intensity": "Moderate"
                })
                st.success(f"Added {workout_name} workout")
                st.session_state.show_add_popup = False
                st.rerun()
        
        # Activity tab
        with add_tabs[2]:
            activity_name = st.selectbox(
                "Activity type:",
                options=[activity["name"] for activity in activity_types["Activities"]],
                key="add_activity_name"
            )
            
            # Get duration
            duration_hours = 1.0
            for activity in activity_types["Activities"]:
                if activity["name"] == activity_name:
                    duration_hours = activity["duration"] / 60
                    break
            
            # Allow adjusting duration
            duration_hours = st.slider(
                "Duration (hours):",
                min_value=0.5,
                max_value=12.0,
                value=float(duration_hours),
                step=0.5,
                key="add_activity_duration"
            )
            
            # Calculate end time
            duration_minutes = int(duration_hours * 60)
            end_hour = popup_hour + (duration_minutes // 60)
            end_minute = duration_minutes % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"End time: {end_time}")
            
            if st.button("Add Activity", key="add_activity_btn", type="primary"):
                st.session_state.weekly_schedule['days'][popup_day]['work'].append({
                    "type": activity_name,
                    "start": f"{popup_hour:02d}:00",
                    "end": end_time
                })
                st.success(f"Added {activity_name}")
                st.session_state.show_add_popup = False
                st.rerun()
        
        # Cancel button
        if st.button("Cancel", key="add_cancel_btn"):
            st.session_state.show_add_popup = False
            st.rerun()

# Copy schedule to other days
st.write("#### Copy Schedule to Other Days")
copy_cols = st.columns(3)
with copy_cols[0]:
    target_days = [d for d in days_of_week if d != selected_day]
    target_day = st.selectbox("Copy to:", target_days, key="copy_target_day")
with copy_cols[2]:
    if st.button("Copy Schedule", key="copy_schedule_button"):
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