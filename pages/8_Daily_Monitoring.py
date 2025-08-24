import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import sys
import os

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Daily Monitoring",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Check if user has completed the previous steps
if (not st.session_state.user_info['gender'] or 
    not st.session_state.goal_info.get('goal_type') or 
    not st.session_state.nutrition_plan.get('target_calories')):
    st.warning("Please complete the Initial Setup, Body Composition Goals, and Nutrition Plan first!")
    st.stop()

st.title("Daily Monitoring")
st.markdown("Track your daily weight, nutrition intake, and progress photos to monitor your progress.")

# Create tabs for tracking different types of data
tracking_tab, photos_tab = st.tabs(["Daily Tracking", "Progress Photos"])

# First Tab: Daily Tracking Form
with tracking_tab:
    # Display existing records management section
    if not st.session_state.daily_records.empty:
        st.subheader("Manage Existing Records")
        
        # Sort records by date in descending order
        display_records = st.session_state.daily_records.sort_values('date', ascending=False).copy()
        
        # Convert date to datetime for display if it's not already
        if not pd.api.types.is_datetime64_any_dtype(display_records['date']):
            display_records['date'] = pd.to_datetime(display_records['date'])
        
        # Format date for display
        display_records['date_display'] = display_records['date'].dt.strftime('%Y-%m-%d')
        
        # Select columns for display
        display_cols = ['date_display', 'weight_lbs', 'calories', 'protein', 'carbs', 'fat']
        
        # Create a user-friendly table
        display_table = display_records[display_cols].copy()
        display_table.columns = ['Date', 'Weight (lbs)', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)']
        
        # Display the table with a checkbox for selection
        selected_indices = []
        
        # Use a container for better control of the table layout
        with st.container():
            # Add a search/filter option
            search_date = st.text_input("Filter by date (YYYY-MM-DD):", 
                                       placeholder="Enter date to filter records")
            
            if search_date:
                filtered_table = display_table[display_table['Date'].str.contains(search_date)]
            else:
                filtered_table = display_table
            
            # Display the table with row selection
            st.write("Select records to delete:")
            
            # Display the table (non-editable)
            st.dataframe(filtered_table, 
                       use_container_width=True,
                       hide_index=True)
            
            # Multi-select for deletion
            dates_to_delete = st.multiselect(
                "Select dates to delete:",
                options=filtered_table['Date'].tolist(),
                key="dates_to_delete_daily"
            )
        
        # Add action buttons
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Delete Selected Records", key="delete_records"):
                if dates_to_delete:
                    # Remove the selected rows from the dataframe
                    st.session_state.daily_records = st.session_state.daily_records[
                        ~st.session_state.daily_records['date'].astype(str).isin(dates_to_delete)
                    ]
                    
                    # Save updated records
                    st.session_state.daily_records.to_csv('data/daily_records.csv', index=False)
                    st.success(f"Deleted {len(dates_to_delete)} record(s)")
                    st.rerun()
                else:
                    st.warning("No records selected for deletion")
        
        with col2:
            if st.button("Clear All Records", key="clear_records"):
                # Add a confirmation step
                if 'confirm_delete_all' not in st.session_state:
                    st.session_state.confirm_delete_all = False
                
                if not st.session_state.confirm_delete_all:
                    st.session_state.confirm_delete_all = True
                    st.warning("⚠️ Are you sure you want to delete all records? This cannot be undone. Click the button again to confirm.")
                else:
                    # Clear the dataframe
                    st.session_state.daily_records = pd.DataFrame(columns=st.session_state.daily_records.columns)
                    
                    # Save empty dataframe
                    st.session_state.daily_records.to_csv('data/daily_records.csv', index=False)
                    st.success("All records cleared")
                    
                    # Reset confirmation
                    st.session_state.confirm_delete_all = False
                    st.rerun()
        
        st.markdown("---")
    
    # Form for daily tracking
    with st.form("daily_tracking_form"):
        st.subheader("Log Today's Data")
        
        col1, col2 = st.columns(2)
        
        with col1:
            log_date = st.date_input(
                "Date",
                value=datetime.now().date()
            )
            
            # Get current weight in pounds if available, otherwise convert from kg
            current_weight_lbs = st.session_state.user_info.get('weight_lbs', st.session_state.user_info.get('weight_kg', 70.0) * 2.20462)
            
            weight_lbs = st.number_input(
                "Weight (lbs)",
                min_value=66.0,
                max_value=660.0,
                value=current_weight_lbs,
                step=0.1,
                format="%.1f"
            )
            
            # Convert to kg for storage and calculations
            weight_kg = weight_lbs / 2.20462
            
            # Add mood tracking
            st.write("**Wellness Tracking**")
            
            mood_options = ["😔 Very Low", "🙁 Low", "😐 Neutral", "🙂 Good", "😄 Excellent"]
            mood = st.select_slider(
                "Today's Mood",
                options=mood_options,
                value="😐 Neutral"
            )
            
            # Convert mood to numeric value for correlation analysis (1-5 scale)
            mood_value = mood_options.index(mood) + 1
            
            energy_options = ["Very Low", "Low", "Moderate", "High", "Very High"]
            energy = st.select_slider(
                "Today's Energy Level",
                options=energy_options,
                value="Moderate"
            )
            
            # Convert energy to numeric value for correlation analysis (1-5 scale)
            energy_value = energy_options.index(energy) + 1
            
            sleep_hours = st.slider(
                "Hours of Sleep Last Night",
                min_value=0.0,
                max_value=12.0,
                value=7.0,
                step=0.5
            )
        
        with col2:
            st.write("**Nutrition Tracking**")
            # Make sure all numeric values are of same type (float)
            calories = st.number_input(
                "Calories Consumed",
                min_value=0.0,
                max_value=10000.0,
                value=float(st.session_state.nutrition_plan.get('target_calories', 2000)),
                step=50.0
            )
            
            protein = st.number_input(
                "Protein (g)",
                min_value=0.0,
                max_value=500.0,
                value=float(st.session_state.nutrition_plan.get('target_protein', 100)),
                step=5.0
            )
            
            carbs = st.number_input(
                "Carbohydrates (g)",
                min_value=0.0,
                max_value=1000.0,
                value=float(st.session_state.nutrition_plan.get('target_carbs', 200)),
                step=5.0
            )
            
            fat = st.number_input(
                "Fat (g)",
                min_value=0.0,
                max_value=500.0,
                value=float(st.session_state.nutrition_plan.get('target_fat', 70)),
                step=5.0
            )
            
            # Add stress level and workout intensity
            stress_options = ["Very Low", "Low", "Moderate", "High", "Very High"]
            stress = st.select_slider(
                "Today's Stress Level",
                options=stress_options,
                value="Moderate"
            )
            
            # Convert stress to numeric value for correlation analysis (1-5 scale)
            stress_value = stress_options.index(stress) + 1
            
            # Add workout tracking
            workout_done = st.checkbox("Did you workout today?")
            
            workout_intensity = 0
            if workout_done:
                intensity_options = ["Light", "Moderate", "Intense", "Very Intense"]
                workout_type = st.selectbox(
                    "Workout Type",
                    options=["Resistance Training", "Cardio", "Both", "Other"]
                )
                
                workout_intensity_label = st.select_slider(
                    "Workout Intensity",
                    options=intensity_options,
                    value="Moderate"
                )
                
                # Convert intensity to numeric value (1-4 scale)
                workout_intensity = intensity_options.index(workout_intensity_label) + 1
        
        # Check if macros add up to calories
        calculated_calories = (protein * 4) + (carbs * 4) + (fat * 9)
        calorie_diff = abs(calculated_calories - calories)
        
        if calorie_diff > 100:
            st.warning(f"Your macronutrient entries add up to {calculated_calories} calories, which is {calorie_diff} calories different from your entered calories. You may want to double-check your entries.")
        
        submit_button = st.form_submit_button("Save Entry")
        
        if submit_button:
            # Format date as string
            date_str = log_date.strftime('%Y-%m-%d')
            
            # Check if there's already an entry for this date
            existing_idx = st.session_state.daily_records[
                st.session_state.daily_records['date'] == date_str
            ].index
            
            new_entry = {
                'date': date_str,
                'weight_kg': weight_kg,
                'weight_lbs': weight_lbs,
                'calories': calories,
                'protein': protein,
                'carbs': carbs,
                'fat': fat,
                'mood': mood,
                'mood_value': mood_value,
                'energy': energy,
                'energy_value': energy_value,
                'sleep_hours': sleep_hours,
                'stress': stress,
                'stress_value': stress_value,
                'workout_done': workout_done,
                'workout_intensity': workout_intensity
            }
            
            # Add workout type if a workout was done
            if workout_done:
                # Initialize workout_type with a default value if it doesn't exist for some reason
                workout_type_val = locals().get('workout_type', "Other")
                new_entry['workout_type'] = workout_type_val
            
            if len(existing_idx) > 0:
                # Update existing entry
                for key, value in new_entry.items():
                    st.session_state.daily_records.at[existing_idx[0], key] = value
                st.success(f"Entry for {date_str} updated!")
            else:
                # Add new entry
                st.session_state.daily_records = pd.concat([
                    st.session_state.daily_records,
                    pd.DataFrame([new_entry])
                ], ignore_index=True)
                st.success(f"Entry for {date_str} added!")
            
            # Update the user's current weight
            if log_date.strftime('%Y-%m-%d') == datetime.now().strftime('%Y-%m-%d'):
                st.session_state.user_info['weight_kg'] = weight_kg
                st.session_state.user_info['weight_lbs'] = weight_lbs
            
            # Save data
            utils.save_data()

# Second Tab: Progress Photos        
with photos_tab:
    st.subheader("Progress Photos")
    st.markdown("Upload progress photos to visually track your transformation over time.")
    
    # Add tabs for management and uploading
    photo_management_tab, photo_upload_tab = st.tabs(["Manage Photos", "Upload Photos"])
    
    with photo_management_tab:
        st.subheader("Manage Your Progress Photos")
        
        # Get all progress photos
        photo_df = utils.get_progress_photos_df()
        
        if not photo_df.empty:
            # Create a copy for display
            display_photos = photo_df.copy()
            
            # Sort by date (newest first)
            display_photos = display_photos.sort_values(by='date', ascending=False)
            
            # Add a date filter
            date_filter = st.text_input("Filter by date (YYYY-MM-DD):", 
                                      placeholder="Enter date to filter photos",
                                      key="photo_date_filter")
            
            if date_filter:
                display_photos = display_photos[display_photos['date'].str.contains(date_filter)]
            
            # Create an editable table
            st.write("**Your Progress Photos:**")
            edited_df = st.data_editor(
                display_photos,
                column_config={
                    "date": "Date",
                    "photo_type": "Photo Type",
                    "filepath": st.column_config.ImageColumn(
                        "Photo Preview", 
                        help="Preview of your progress photo",
                        width="medium"
                    )
                },
                hide_index=True,
                use_container_width=True,
                key="photo_editor"
            )
            
            # Add delete functionality
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("Delete Selected Photos", key="delete_photos"):
                    # Get selected photos to delete
                    selected_photos = st.multiselect(
                        "Select photos to delete:",
                        options=display_photos['filepath'].tolist(),
                        format_func=lambda x: f"{os.path.basename(x)}"
                    )
                    
                    if selected_photos:
                        # Remove the photos from the filesystem
                        deleted_count = 0
                        for filepath in selected_photos:
                            try:
                                if os.path.exists(filepath):
                                    os.remove(filepath)
                                    deleted_count += 1
                            except Exception as e:
                                st.error(f"Error deleting photo file: {e}")
                        
                        # Update the dataframe to remove the deleted photos
                        photo_df = photo_df[~photo_df['filepath'].isin(selected_photos)]
                        photo_df.to_csv('data/progress_photos.csv', index=False)
                        st.success(f"Deleted {deleted_count} photo(s)")
                        st.rerun()
            
            with col2:
                if st.button("Clear All Photos", key="clear_photos"):
                    # Add confirmation
                    if 'confirm_delete_all_photos' not in st.session_state:
                        st.session_state.confirm_delete_all_photos = False
                    
                    if not st.session_state.confirm_delete_all_photos:
                        st.session_state.confirm_delete_all_photos = True
                        st.warning("⚠️ Are you sure you want to delete ALL photos? This cannot be undone. Click again to confirm.")
                    else:
                        # Delete all photo files
                        for _, row in photo_df.iterrows():
                            try:
                                filepath = str(row['filepath'])
                                if os.path.exists(filepath):
                                    os.remove(filepath)
                            except Exception as e:
                                st.error(f"Error deleting photo file: {e}")
                        
                        # Clear the dataframe
                        photo_df = pd.DataFrame(columns=photo_df.columns)
                        photo_df.to_csv('data/progress_photos.csv', index=False)
                        
                        # Reset confirmation
                        st.session_state.confirm_delete_all_photos = False
                        st.success("All photos cleared")
                        st.rerun()
        else:
            st.info("No progress photos uploaded yet. Use the 'Upload Photos' tab to add some.")
    
    with photo_upload_tab:
        st.subheader("Upload New Photos")
        
        # Select date
        photo_date = st.date_input("Select Date", value=datetime.now().date(), key="photo_upload_date")
        photo_date_str = photo_date.strftime('%Y-%m-%d')
        
        # Create three columns for front, side, and back photos
        front_col, side_col, back_col = st.columns(3)
        
        # Get existing photos for this date
        existing_photos = utils.get_photos_for_date(photo_date_str)
    
    # Front photo upload and display
    with front_col:
        st.markdown("### Front View")
        
        # Upload new front photo
        front_photo = st.file_uploader("Upload Front View", type=["jpg", "jpeg", "png"], key="front_photo")
        
        if front_photo:
            # Show preview of the photo
            st.image(front_photo, caption="Front View Preview", use_column_width=True)
            
            # Button to save the photo
            if st.button("Save Front Photo"):
                filepath = utils.save_progress_photo(front_photo, photo_date_str, "front")
                if filepath:
                    st.success("Front photo saved successfully!")
                    # Update the existing photos dictionary
                    existing_photos["front"] = filepath
                else:
                    st.error("Failed to save front photo.")
        
        # Display existing front photo if available
        elif "front" in existing_photos:
            try:
                st.image(existing_photos["front"], caption=f"Front View - {photo_date_str}", use_column_width=True)
            except Exception as e:
                st.error(f"Error displaying front photo: {e}")
    
    # Side photo upload and display
    with side_col:
        st.markdown("### Side View")
        
        # Upload new side photo
        side_photo = st.file_uploader("Upload Side View", type=["jpg", "jpeg", "png"], key="side_photo")
        
        if side_photo:
            # Show preview of the photo
            st.image(side_photo, caption="Side View Preview", use_column_width=True)
            
            # Button to save the photo
            if st.button("Save Side Photo"):
                filepath = utils.save_progress_photo(side_photo, photo_date_str, "side")
                if filepath:
                    st.success("Side photo saved successfully!")
                    # Update the existing photos dictionary
                    existing_photos["side"] = filepath
                else:
                    st.error("Failed to save side photo.")
        
        # Display existing side photo if available
        elif "side" in existing_photos:
            try:
                st.image(existing_photos["side"], caption=f"Side View - {photo_date_str}", use_column_width=True)
            except Exception as e:
                st.error(f"Error displaying side photo: {e}")
    
    # Back photo upload and display
    with back_col:
        st.markdown("### Back View")
        
        # Upload new back photo
        back_photo = st.file_uploader("Upload Back View", type=["jpg", "jpeg", "png"], key="back_photo")
        
        if back_photo:
            # Show preview of the photo
            st.image(back_photo, caption="Back View Preview", use_column_width=True)
            
            # Button to save the photo
            if st.button("Save Back Photo"):
                filepath = utils.save_progress_photo(back_photo, photo_date_str, "back")
                if filepath:
                    st.success("Back photo saved successfully!")
                    # Update the existing photos dictionary
                    existing_photos["back"] = filepath
                else:
                    st.error("Failed to save back photo.")
        
        # Display existing back photo if available
        elif "back" in existing_photos:
            try:
                st.image(existing_photos["back"], caption=f"Back View - {photo_date_str}", use_column_width=True)
            except Exception as e:
                st.error(f"Error displaying back photo: {e}")
    
    # Tips for consistent photos
    with st.expander("Tips for Consistent Progress Photos"):
        st.markdown("""
        **For the best visual tracking of your progress:**
        
        - Take photos at the same time of day (preferably morning)
        - Use the same lighting conditions each time
        - Wear similar clothing that shows your physique clearly
        - Stand in the same position/pose for each photo type
        - Take photos from the same distance and angle
        - Try to use the same camera/phone each time
        - For front and back views, stand with feet shoulder-width apart and arms slightly away from body
        - For side view, choose your preferred side and be consistent
        """)
    
    # Photo comparison feature
    st.subheader("Photo Comparison")
    st.markdown("Compare photos from different dates to visualize your progress.")
    
    # Get all available dates with photos
    photo_df = utils.get_progress_photos_df()
    if not photo_df.empty:
        # Get unique dates
        unique_dates = sorted(photo_df['date'].unique(), reverse=True)
        
        if len(unique_dates) >= 2:
            col1, col2 = st.columns(2)
            
            with col1:
                # Get the most recent date as default
                date1 = st.selectbox("First Date", unique_dates, index=0, key="compare_date1")
                date1_photos = utils.get_photos_for_date(date1)
            
            with col2:
                # Get the second most recent date as default
                default_idx = min(1, len(unique_dates) - 1)
                date2 = st.selectbox("Second Date", unique_dates, index=default_idx, key="compare_date2")
                date2_photos = utils.get_photos_for_date(date2)
            
            # Create tabs for each photo type
            photo_types = ["front", "side", "back"]
            valid_types = []
            
            # Only show tabs for photo types that exist in at least one of the dates
            for photo_type in photo_types:
                if photo_type in date1_photos or photo_type in date2_photos:
                    valid_types.append(photo_type)
            
            if valid_types:
                photo_tabs = st.tabs([t.capitalize() for t in valid_types])
                
                for i, photo_type in enumerate(valid_types):
                    with photo_tabs[i]:
                        comp_col1, comp_col2 = st.columns(2)
                        
                        with comp_col1:
                            st.markdown(f"### {date1}")
                            if photo_type in date1_photos:
                                try:
                                    st.image(date1_photos[photo_type], use_column_width=True)
                                except Exception as e:
                                    st.error(f"Error displaying photo: {e}")
                            else:
                                st.info(f"No {photo_type} view photo for {date1}")
                        
                        with comp_col2:
                            st.markdown(f"### {date2}")
                            if photo_type in date2_photos:
                                try:
                                    st.image(date2_photos[photo_type], use_column_width=True)
                                except Exception as e:
                                    st.error(f"Error displaying photo: {e}")
                            else:
                                st.info(f"No {photo_type} view photo for {date2}")
            else:
                st.info("No matching photo types found for the selected dates.")
        elif len(unique_dates) == 1:
            st.info("You need at least two different dates with photos to use the comparison feature.")
        else:
            st.info("No photos found. Upload photos to use the comparison feature.")
    else:
        st.info("No photos uploaded yet. Use the section above to start tracking your progress visually.")

# Display the daily records
if not st.session_state.daily_records.empty:
    st.subheader("Recent Entries")
    
    # Sort by date (newest first) and take most recent 10 entries
    recent_data = st.session_state.daily_records.copy()
    recent_data = recent_data.sort_values(by='date', ascending=False).head(10)
    
    # Ensure weight_lbs exists (for backward compatibility)
    if 'weight_lbs' not in recent_data.columns:
        recent_data['weight_lbs'] = recent_data['weight_kg'] * 2.20462
    
    # Add target columns for comparison
    recent_data['target_calories'] = st.session_state.nutrition_plan['target_calories']
    recent_data['target_protein'] = st.session_state.nutrition_plan['target_protein']
    recent_data['target_carbs'] = st.session_state.nutrition_plan['target_carbs']
    recent_data['target_fat'] = st.session_state.nutrition_plan['target_fat']
    
    # Calculate differences from targets
    recent_data['calories_diff'] = recent_data['calories'] - recent_data['target_calories']
    recent_data['protein_diff'] = recent_data['protein'] - recent_data['target_protein']
    recent_data['carbs_diff'] = recent_data['carbs'] - recent_data['target_carbs']
    recent_data['fat_diff'] = recent_data['fat'] - recent_data['target_fat']
    
    # Format differences with +/- signs
    recent_data['calories_diff'] = recent_data['calories_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    recent_data['protein_diff'] = recent_data['protein_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    recent_data['carbs_diff'] = recent_data['carbs_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    recent_data['fat_diff'] = recent_data['fat_diff'].apply(lambda x: f"+{x}" if x > 0 else str(x))
    
    # Format date nicely
    recent_data['date_display'] = pd.to_datetime(recent_data['date']).dt.strftime('%b %d, %Y')
    
    # Display columns
    display_cols = [
        'date_display', 'weight_lbs',
        'calories', 'calories_diff',
        'protein', 'protein_diff',
        'carbs', 'carbs_diff',
        'fat', 'fat_diff'
    ]
    
    # Format and rename columns for display
    display_data = recent_data[display_cols].copy()
    
    # Rename columns
    display_data.columns = [
        'Date', 'Weight (lbs)',
        'Calories', 'Cal +/-',
        'Protein (g)', 'Prot +/-',
        'Carbs (g)', 'Carbs +/-',
        'Fat (g)', 'Fat +/-'
    ]
    
    # Format weight to one decimal place
    display_data['Weight (lbs)'] = [f"{x:.1f}" for x in display_data['Weight (lbs)']]
    
    st.dataframe(display_data, use_container_width=True)
    
    # Option to delete entries
    st.subheader("Delete Entry")
    
    # Get dates for selection
    dates = recent_data[['date', 'date_display']].copy()
    # Sort by date in descending order
    dates = dates.sort_values('date', ascending=False)
    date_options = dates['date_display'].tolist()
    date_values = dates['date'].tolist()
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        selected_date_display = st.selectbox("Select date to delete", date_options)
        # Get the actual date value
        selected_date_index = date_options.index(selected_date_display)
        delete_date = date_values[selected_date_index]
    
    with col2:
        delete_button = st.button("Delete Selected Entry")
    
    if delete_button and delete_date:
        # Remove the entry
        st.session_state.daily_records = st.session_state.daily_records[
            st.session_state.daily_records['date'] != delete_date
        ]
        
        # Save data
        utils.save_data()
        
        st.success(f"Entry for {selected_date_display} deleted!")
        st.rerun()
else:
    st.info("No entries yet. Use the form above to log your daily data.")

# Calculate and display weekly adjustments
if len(st.session_state.daily_records) >= 7:
    st.subheader("Weekly Adjustment Recommendation")
    
    adjustment = utils.calculate_weekly_adjustment(
        st.session_state.daily_records,
        st.session_state.goal_info,
        st.session_state.nutrition_plan
    )
    
    st.write(adjustment['message'])
    
    if adjustment['calorie_adjustment'] != 0:
        # Create columns for the new targets
        col1, col2, col3, col4 = st.columns(4)
        
        # Calculate new targets
        new_calories = st.session_state.nutrition_plan['target_calories'] + adjustment['calorie_adjustment']
        new_protein = st.session_state.nutrition_plan['target_protein'] + adjustment['protein_adjustment']
        new_carbs = st.session_state.nutrition_plan['target_carbs'] + adjustment['carbs_adjustment']
        new_fat = st.session_state.nutrition_plan['target_fat'] + adjustment['fat_adjustment']
        
        with col1:
            st.metric(
                label="New Calories Target",
                value=f"{new_calories:.0f} kcal",
                delta=f"{adjustment['calorie_adjustment']:.0f}"
            )
        
        with col2:
            st.metric(
                label="New Protein Target",
                value=f"{new_protein:.0f} g",
                delta=f"{adjustment['protein_adjustment']:.0f}"
            )
        
        with col3:
            st.metric(
                label="New Carbs Target",
                value=f"{new_carbs:.0f} g",
                delta=f"{adjustment['carbs_adjustment']:.0f}"
            )
        
        with col4:
            st.metric(
                label="New Fat Target",
                value=f"{new_fat:.0f} g",
                delta=f"{adjustment['fat_adjustment']:.0f}"
            )
        
        # Button to apply the adjustment
        if st.button("Apply This Adjustment"):
            # Add the adjustment to the history
            today = datetime.now().strftime('%Y-%m-%d')
            adjustment['date'] = today
            
            if 'weekly_adjustments' not in st.session_state.nutrition_plan:
                st.session_state.nutrition_plan['weekly_adjustments'] = []
            
            st.session_state.nutrition_plan['weekly_adjustments'].append(adjustment)
            
            # Update the nutrition plan with new targets
            st.session_state.nutrition_plan['target_calories'] = round(new_calories)
            st.session_state.nutrition_plan['target_protein'] = round(new_protein)
            st.session_state.nutrition_plan['target_carbs'] = round(new_carbs)
            st.session_state.nutrition_plan['target_fat'] = round(new_fat)
            
            # Save data
            utils.save_data()
            
            st.success("Nutrition plan updated with the new targets!")
            st.rerun()
    
    # Add guidance based on the weekly data
    st.subheader("Weekly Analysis")
    
    # Get recent week of data
    recent_week_data = st.session_state.daily_records.copy()
    recent_week_data = recent_week_data.sort_values(by='date', ascending=False).head(7)
    
    # Calculate average adherence
    avg_cal_adherence = 100 - min(abs(recent_week_data['calories'].mean() - st.session_state.nutrition_plan['target_calories']) / 
                                 st.session_state.nutrition_plan['target_calories'] * 100, 100)
    
    avg_protein_adherence = 100 - min(abs(recent_week_data['protein'].mean() - st.session_state.nutrition_plan['target_protein']) / 
                                     st.session_state.nutrition_plan['target_protein'] * 100, 100)
    
    # Calculate weight change
    sorted_weekly_data = recent_week_data.copy()
    sorted_weekly_data = sorted_weekly_data.sort_values(by='date', ascending=True)
    first_weight = sorted_weekly_data['weight_lbs'].iloc[0]
    last_weight = sorted_weekly_data['weight_lbs'].iloc[-1]
    weekly_weight_change = last_weight - first_weight
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="Weekly Weight Change", 
            value=f"{weekly_weight_change:.1f} lbs",
            delta=f"{weekly_weight_change:.1f} lbs"
        )
    
    with col2:
        st.metric(
            label="Calorie Adherence", 
            value=f"{avg_cal_adherence:.1f}%",
        )
    
    with col3:
        st.metric(
            label="Protein Adherence", 
            value=f"{avg_protein_adherence:.1f}%",
        )
    
    # Add tailored advice based on goals and adherence
    goal_type = st.session_state.goal_info['goal_type']
    
    if goal_type == "lose_fat":
        if weekly_weight_change > 0:
            st.warning("⚠️ You gained weight this week, which is contrary to your fat loss goal. Consider reducing calories or increasing activity.")
        elif weekly_weight_change < -2:
            st.warning("⚠️ You lost more than 2 lbs this week. While this might seem good, rapid weight loss often leads to muscle loss and is harder to sustain.")
        elif weekly_weight_change < -1:
            st.success("✅ Good progress! Weight loss between 1-2 lbs per week is in the ideal range for sustainable fat loss.")
        else:
            st.info("ℹ️ Weight loss was less than 1 lb this week. This is sustainable but consider reviewing your calorie intake if you want faster results.")
    
    elif goal_type == "gain_muscle":
        if weekly_weight_change < 0:
            st.warning("⚠️ You lost weight this week, which is contrary to your muscle gain goal. Consider increasing calories.")
        elif weekly_weight_change > 1:
            st.warning("⚠️ Weight gain exceeded 1 lb this week. While this might seem good, rapid weight gain often leads to excessive fat gain.")
        elif weekly_weight_change > 0.5:
            st.success("✅ Good progress! Weight gain between 0.5-1 lb per week is in the ideal range for muscle gain with minimal fat gain.")
        else:
            st.info("ℹ️ Weight gain was less than 0.5 lb this week. Consider increasing your calorie intake slightly if you want faster results.")
    
    # Protein advice
    if avg_protein_adherence < 80:
        st.warning("⚠️ Your protein intake was significantly below target. This can impact your muscle preservation/growth. Try to prioritize protein-rich foods.")
    elif avg_protein_adherence > 95:
        st.success("✅ Excellent job meeting your protein targets! This is crucial for body composition goals.")
    
    # Mood and Energy Correlation Analysis
    st.subheader("Mood & Energy Correlation Analysis")
    
    # Check if we have mood and energy data in the records
    if 'mood_value' in recent_week_data.columns and len(recent_week_data) >= 3:
        try:
            # Create a copy of the data for correlation analysis
            corr_data = recent_week_data.copy()
            
            # Ensure numeric columns for correlation
            numeric_columns = ['mood_value', 'energy_value', 'stress_value', 'calories', 
                             'protein', 'carbs', 'fat', 'sleep_hours']
            
            # Only keep columns that exist in the data
            numeric_columns = [col for col in numeric_columns if col in corr_data.columns]
            
            # Filter for only those columns and drop NaN values
            corr_data = corr_data[numeric_columns].dropna()
            
            if len(corr_data) >= 3:  # Need at least 3 data points for meaningful correlation
                # Calculate correlation matrix using Pearson method
                correlation = corr_data.corr()
                
                # Create a visualization for the correlations
                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 8))
                
                # Initialize variables
                mood_corr = None
                energy_corr = None
                
                # Plot mood correlations
                if 'mood_value' in correlation.columns:
                    mood_corr = correlation['mood_value'].drop('mood_value')
                    # Sort values
                    mood_corr = mood_corr.sort_values(ascending=False)
                    colors = ['green' if x >= 0 else 'red' for x in mood_corr]
                    ax1.barh(mood_corr.index, mood_corr.values, color=colors)
                    ax1.set_title('Factors Correlated with Mood', fontsize=16)
                    ax1.set_xlim(-1, 1)
                    ax1.axvline(x=0, color='black', linestyle='-', alpha=0.3)
                    ax1.grid(axis='x', linestyle='--', alpha=0.7)
                    
                    # Add correlation values as text
                    for i, v in enumerate(mood_corr.values):
                        ax1.text(v + (0.05 if v >= 0 else -0.05), 
                                i, 
                                f"{v:.2f}", 
                                color='black', 
                                va='center',
                                ha='left' if v >= 0 else 'right')
                
                # Plot energy correlations
                if 'energy_value' in correlation.columns:
                    energy_corr = correlation['energy_value'].drop('energy_value')
                    # Sort values
                    energy_corr = energy_corr.sort_values(ascending=False)
                    colors = ['green' if x >= 0 else 'red' for x in energy_corr]
                    ax2.barh(energy_corr.index, energy_corr.values, color=colors)
                    ax2.set_title('Factors Correlated with Energy Levels', fontsize=16)
                    ax2.set_xlim(-1, 1)
                    ax2.axvline(x=0, color='black', linestyle='-', alpha=0.3)
                    ax2.grid(axis='x', linestyle='--', alpha=0.7)
                    
                    # Add correlation values as text
                    for i, v in enumerate(energy_corr.values):
                        ax2.text(v + (0.05 if v >= 0 else -0.05), 
                                i, 
                                f"{v:.2f}", 
                                color='black', 
                                va='center',
                                ha='left' if v >= 0 else 'right')
                
                plt.tight_layout()
                st.pyplot(fig)
                
                # Provide insights based on correlations
                st.subheader("Personalized Insights")
                
                insights = []
                
                # Mood insights
                if mood_corr is not None:
                    # Strong positive correlations with mood
                    strong_pos_mood = [(col, corr) for col, corr in mood_corr.items() if corr >= 0.5]
                    if strong_pos_mood:
                        for col, corr in strong_pos_mood:
                            factor = str(col)  # Ensure it's a string
                            if "_value" in factor:
                                factor = factor.replace('_value', '').title()
                            
                            if col == 'sleep_hours':
                                factor = "Sleep Duration"
                            elif col == 'protein':
                                factor = "Protein Intake"
                            elif col == 'carbs':
                                factor = "Carbohydrate Intake"
                            elif col == 'fat':
                                factor = "Fat Intake"
                            elif col == 'calories':
                                factor = "Calorie Intake"
                            
                            insights.append(f"✅ Higher {factor} is strongly associated with better mood in your data.")
                    
                    # Strong negative correlations with mood
                    strong_neg_mood = [(col, corr) for col, corr in mood_corr.items() if corr <= -0.5]
                    if strong_neg_mood:
                        for col, corr in strong_neg_mood:
                            factor = str(col)  # Ensure it's a string
                            if "_value" in factor:
                                factor = factor.replace('_value', '').title()
                            
                            if col == 'stress_value':
                                factor = "Stress"
                                insights.append(f"⚠️ Higher levels of {factor} are strongly associated with worse mood.")
                            else:
                                insights.append(f"⚠️ Higher {factor} is strongly associated with worse mood in your data.")
                
                # Energy insights
                if energy_corr is not None:
                    # Strong positive correlations with energy
                    strong_pos_energy = [(col, corr) for col, corr in energy_corr.items() if corr >= 0.5]
                    if strong_pos_energy:
                        for col, corr in strong_pos_energy:
                            factor = str(col)  # Ensure it's a string
                            if "_value" in factor:
                                factor = factor.replace('_value', '').title()
                            
                            if col == 'sleep_hours':
                                factor = "Sleep Duration"
                            elif col == 'protein':
                                factor = "Protein Intake"
                            elif col == 'carbs':
                                factor = "Carbohydrate Intake"
                            elif col == 'fat':
                                factor = "Fat Intake"
                            elif col == 'calories':
                                factor = "Calorie Intake"
                            
                            insights.append(f"✅ Higher {factor} is strongly associated with better energy levels in your data.")
                    
                    # Strong negative correlations with energy
                    strong_neg_energy = [(col, corr) for col, corr in energy_corr.items() if corr <= -0.5]
                    if strong_neg_energy:
                        for col, corr in strong_neg_energy:
                            factor = str(col)  # Ensure it's a string
                            if "_value" in factor:
                                factor = factor.replace('_value', '').title()
                            
                            if col == 'stress_value':
                                factor = "Stress"
                                insights.append(f"⚠️ Higher levels of {factor} are strongly associated with lower energy levels.")
                            else:
                                insights.append(f"⚠️ Higher {factor} is strongly associated with lower energy levels in your data.")
                
                # Macro insights
                if 'carbs' in correlation.columns and 'mood_value' in correlation.columns:
                    carb_mood_corr = correlation.loc['carbs', 'mood_value']
                    if carb_mood_corr >= 0.3:
                        insights.append(f"🔍 Your mood appears to respond positively to carbohydrate intake (correlation: {carb_mood_corr:.2f}).")
                    elif carb_mood_corr <= -0.3:
                        insights.append(f"🔍 Your mood appears to respond negatively to carbohydrate intake (correlation: {carb_mood_corr:.2f}).")
                
                if 'protein' in correlation.columns and 'energy_value' in correlation.columns:
                    protein_energy_corr = correlation.loc['protein', 'energy_value']
                    if protein_energy_corr >= 0.3:
                        insights.append(f"🔍 Your energy levels appear to benefit from higher protein intake (correlation: {protein_energy_corr:.2f}).")
                
                if 'sleep_hours' in correlation.columns and 'energy_value' in correlation.columns:
                    sleep_energy_corr = correlation.loc['sleep_hours', 'energy_value']
                    if sleep_energy_corr >= 0.3:
                        insights.append(f"🔍 Better sleep is associated with higher energy levels in your data (correlation: {sleep_energy_corr:.2f}).")
                
                if insights:
                    for insight in insights:
                        st.write(insight)
                else:
                    st.info("Keep tracking your data to reveal more personalized insights about how nutrition, sleep, and stress affect your mood and energy levels.")
                    
                st.caption("Note: Correlations show relationships between factors but don't necessarily indicate causation. More data points will improve the accuracy of these insights.")
            else:
                st.info("Continue tracking your mood, energy, and nutrition to see meaningful correlations (at least 3 days of data needed).")
        except Exception as e:
            st.error(f"Couldn't analyze mood and energy correlations: {e}")
            st.info("Continue tracking your data consistently to enable correlation analysis.")
    else:
        st.info("Continue tracking your mood and energy levels to see how they correlate with your nutrition. At least 3 days of data are needed.")
else:
    st.info("Weekly adjustments and analysis will be available once you have at least 7 days of data.")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Progress Dashboard](/Progress_Dashboard)")
