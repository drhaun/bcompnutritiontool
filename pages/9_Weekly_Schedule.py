import streamlit as st
import pandas as pd
import datetime
import copy
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
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

# Helper function to convert time string to decimal hours
def time_to_hours(time_str):
    if not time_str:
        return 0
    
    hours, minutes = map(int, time_str.split(":"))
    return hours + minutes / 60

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

# Initialize session state for quick add functionality
if 'quick_add_active' not in st.session_state:
    st.session_state.quick_add_active = False
    st.session_state.quick_add_hour = None

# Create title and description
st.title("Weekly Schedule Planner")
st.write("Plan your meals, workouts, and activities throughout the week.")

# Set up day selection with a clean interface
cols = st.columns([2, 2])
with cols[0]:
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    selected_day = st.selectbox("Select day:", days_of_week,
                              format_func=lambda x: f"📅 {x}")
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

# Create fixed time range (6am to midnight)
min_hour = 6  # 6 AM
max_hour = 24  # Midnight

# Display the schedule visualization
st.markdown(f"#### {selected_day}'s Schedule")

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
            "icon": "🍽️",
            "duration": 45  # Default meal duration for visual spacing
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
            "time": workout['start'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#2EC4B6",
            "icon": "💪",
            "duration": (end_hour - start_hour) * 60  # Duration in minutes
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
            "time": activity['start'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#E71D36",
            "icon": "📆",
            "duration": (end_hour - start_hour) * 60  # Duration in minutes
        })
        
# Sort all activities by hour
all_day_activities.sort(key=lambda x: x['hour'])

# Display timeline with cleaner design
for hour in range(min_hour, max_hour + 1):
    display_hour = hour % 24
    
    # Activities in this hour
    hour_activities = [a for a in all_day_activities 
                      if a['hour'] <= hour and (a.get('end_hour', a['hour'] + 1) > hour)]
    
    # Create a row for this hour
    st.write(f"**{display_hour:02d}:00**")
    
    # Show activities or empty slot
    if hour_activities:
        for activity in hour_activities:
            # Display the activity with a delete button
            with st.container(border=True):
                cols = st.columns([0.9, 0.1])
                
                # Activity info
                if activity['hour'] == hour:
                    # This is where the activity starts
                    display_text = f"{activity['icon']} {activity['name']} ({activity['time']})"
                else:
                    # Continuing activity
                    display_text = f"{activity['icon']} {activity['name']} (cont.)"
                
                cols[0].write(display_text)
                
                # Delete button (only show for starting hour)
                if activity['hour'] == hour:
                    if cols[1].button("🗑️", key=f"del_{activity['type']}_{activity['idx']}_{hour}"):
                        if activity['type'] == 'meal':
                            del st.session_state.weekly_schedule['days'][selected_day]['meals'][activity['idx']]
                        elif activity['type'] == 'workout':
                            del st.session_state.weekly_schedule['days'][selected_day]['workouts'][activity['idx']]
                        else:
                            del st.session_state.weekly_schedule['days'][selected_day]['work'][activity['idx']]
                        st.success(f"Removed {activity['name']}")
                        st.rerun()
    else:
        # Empty slot - show "Add activity" button
        if st.button(f"+ Add activity at {display_hour:02d}:00", key=f"add_{display_hour}"):
            st.session_state.quick_add_active = True
            st.session_state.quick_add_hour = display_hour
            st.rerun()
    
    # Add a separator
    st.markdown("---")

# Quick add activity form
if st.session_state.quick_add_active and st.session_state.quick_add_hour is not None:
    hour = st.session_state.quick_add_hour
    
    with st.container(border=True):
        st.subheader(f"Add activity at {hour:02d}:00")
        
        # Activity type selector
        activity_type = st.radio(
            "Activity type:", 
            ["Meal", "Workout", "Other Activity"],
            horizontal=True,
            key="quick_add_type"
        )
        
        if activity_type == "Meal":
            meal_options = [meal["name"] for meal in activity_types["Meals"]]
            meal_name = st.selectbox("Meal:", meal_options, key="quick_meal")
            
            if st.button("Add Meal", type="primary"):
                st.session_state.weekly_schedule['days'][selected_day]['meals'].append({
                    "name": meal_name,
                    "time": f"{hour:02d}:00"
                })
                st.success(f"Added {meal_name} at {hour:02d}:00")
                st.session_state.quick_add_active = False
                st.rerun()
                
        elif activity_type == "Workout":
            workout_options = [workout["name"] for workout in activity_types["Workouts"]]
            workout_name = st.selectbox("Workout:", workout_options, key="quick_workout")
            
            # Get duration
            for workout in activity_types["Workouts"]:
                if workout["name"] == workout_name:
                    duration = workout["duration"]
                    break
                    
            # Calculate end time
            end_hour = hour + (duration // 60)
            end_minute = duration % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"Duration: {duration} minutes (until {end_time})")
            
            if st.button("Add Workout", type="primary"):
                st.session_state.weekly_schedule['days'][selected_day]['workouts'].append({
                    "type": workout_name,
                    "start": f"{hour:02d}:00",
                    "end": end_time,
                    "intensity": "Moderate"
                })
                st.success(f"Added {workout_name} workout at {hour:02d}:00")
                st.session_state.quick_add_active = False
                st.rerun()
                
        else:  # Other Activity
            activity_options = [activity["name"] for activity in activity_types["Activities"]]
            activity_name = st.selectbox("Activity:", activity_options, key="quick_activity")
            
            # Get default duration
            default_duration = 60
            for activity in activity_types["Activities"]:
                if activity["name"] == activity_name:
                    default_duration = activity["duration"] // 60
                    break
                    
            # Let user adjust duration
            duration_hours = st.slider(
                "Duration (hours):", 
                min_value=0.5, 
                max_value=8.0, 
                value=float(default_duration),
                step=0.5
            )
            
            # Calculate end time
            duration_minutes = int(duration_hours * 60)
            end_hour = hour + (duration_minutes // 60)
            end_minute = duration_minutes % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"End time: {end_time}")
            
            if st.button("Add Activity", type="primary"):
                st.session_state.weekly_schedule['days'][selected_day]['work'].append({
                    "type": activity_name,
                    "start": f"{hour:02d}:00",
                    "end": end_time
                })
                st.success(f"Added {activity_name} at {hour:02d}:00")
                st.session_state.quick_add_active = False
                st.rerun()
        
        if st.button("Cancel"):
            st.session_state.quick_add_active = False
            st.rerun()

# Copy schedule to other days
st.markdown("#### Copy Schedule to Other Days")
copy_cols = st.columns(3)
with copy_cols[0]:
    target_day = st.selectbox("Copy to:", [d for d in days_of_week if d != selected_day])
with copy_cols[2]:
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