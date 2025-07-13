"""
Session Management System for Fitomics App
Handles saving and loading user entries to prevent data loss
"""

import json
import os
from datetime import datetime
import streamlit as st
import pandas as pd

class SessionManager:
    def __init__(self):
        self.save_directory = "saved_sessions"
        self.ensure_directory_exists()
    
    def ensure_directory_exists(self):
        """Create save directory if it doesn't exist"""
        if not os.path.exists(self.save_directory):
            os.makedirs(self.save_directory)
    
    def save_session(self, session_name=None):
        """Save current session state to file"""
        try:
            if not session_name:
                session_name = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Collect all relevant session data including all user inputs and selections
            session_data = {
                'timestamp': datetime.now().isoformat(),
                
                # User Setup Data - All form inputs and selections
                'user_info': st.session_state.get('user_info', {}),
                'goal_info': st.session_state.get('goal_info', {}),
                'diet_preferences': st.session_state.get('diet_preferences', {}),
                'weekly_schedule_v2': st.session_state.get('weekly_schedule_v2', {}),
                'confirmed_weekly_schedule': st.session_state.get('confirmed_weekly_schedule', {}),
                'meal_contexts_detailed': st.session_state.get('meal_contexts_detailed', {}),
                
                # Initial Setup Form Selections (extracted from user_info)
                'use_imperial': st.session_state.get('user_info', {}).get('use_imperial', True),
                'gender': st.session_state.get('user_info', {}).get('gender', ''),
                'dob': st.session_state.get('user_info', {}).get('dob', ''),
                'age': st.session_state.get('user_info', {}).get('age', 0),
                'height_cm': st.session_state.get('user_info', {}).get('height_cm', 0),
                'height_ft': st.session_state.get('user_info', {}).get('height_ft', 0),
                'height_in': st.session_state.get('user_info', {}).get('height_in', 0),
                'weight_kg': st.session_state.get('user_info', {}).get('weight_kg', 0),
                'weight_lbs': st.session_state.get('user_info', {}).get('weight_lbs', 0),
                'body_fat_percentage': st.session_state.get('user_info', {}).get('body_fat_percentage', 0),
                'goal_focus': st.session_state.get('user_info', {}).get('goal_focus', ''),
                'activity_level': st.session_state.get('user_info', {}).get('activity_level', ''),
                'workout_frequency': st.session_state.get('user_info', {}).get('workout_frequency', 0),
                'workout_calories': st.session_state.get('user_info', {}).get('workout_calories', 0),
                'lifestyle_commitment': st.session_state.get('user_info', {}).get('lifestyle_commitment', ''),
                'tracking_commitment': st.session_state.get('user_info', {}).get('tracking_commitment', ''),
                
                # Body Composition Goals Selections
                'body_fat_pct': st.session_state.get('body_fat_pct', 0),
                'target_bf': st.session_state.get('target_bf', 0),
                'target_fat': st.session_state.get('target_fat', 0),
                'target_ffm': st.session_state.get('target_ffm', 0),
                'target_weight': st.session_state.get('target_weight', 0),
                'target_fmi': st.session_state.get('target_fmi', 0),
                'target_ffmi': st.session_state.get('target_ffmi', 0),
                'targets_set': st.session_state.get('targets_set', False),
                'timeline_weeks': st.session_state.get('timeline_weeks', 0),
                'target_weight_lbs': st.session_state.get('target_weight_lbs', 0),
                'goal_type': st.session_state.get('goal_type', ''),
                'weekly_weight_pct': st.session_state.get('weekly_weight_pct', 0),
                'performance_preference': st.session_state.get('performance_preference', ''),
                'body_comp_preference': st.session_state.get('body_comp_preference', ''),
                'commitment_level': st.session_state.get('commitment_level', ''),
                
                # Diet Preferences Selections (extracted from diet_preferences)
                'selected_proteins': st.session_state.get('diet_preferences', {}).get('preferred_proteins', []),
                'selected_carbs': st.session_state.get('diet_preferences', {}).get('preferred_carbs', []),
                'selected_fats': st.session_state.get('diet_preferences', {}).get('preferred_fats', []),
                'selected_vegetables': st.session_state.get('diet_preferences', {}).get('preferred_vegetables', []),
                'selected_cuisines': st.session_state.get('diet_preferences', {}).get('cuisine_preferences', []),
                'dietary_restrictions': st.session_state.get('diet_preferences', {}).get('dietary_restrictions', []),
                'allergies': st.session_state.get('diet_preferences', {}).get('allergies', []),
                'meal_sourcing_preference': st.session_state.get('diet_preferences', {}).get('meal_sourcing_preference', ''),
                'cooking_for': st.session_state.get('diet_preferences', {}).get('cooking_for', ''),
                'leftover_preference': st.session_state.get('diet_preferences', {}).get('leftover_preference', ''),
                'spice_level': st.session_state.get('diet_preferences', {}).get('spice_level', ''),
                'flavor_profile': st.session_state.get('diet_preferences', {}).get('flavor_profile', []),
                'preferred_seasonings': st.session_state.get('diet_preferences', {}).get('preferred_seasonings', []),
                'cooking_enhancers': st.session_state.get('diet_preferences', {}).get('cooking_enhancers', []),
                'variety_preference': st.session_state.get('diet_preferences', {}).get('variety_level', ''),
                'repetition_preference': st.session_state.get('diet_preferences', {}).get('repetition_preference', ''),
                'weekly_structure': st.session_state.get('diet_preferences', {}).get('weekly_structure', ''),
                'cooking_variety': st.session_state.get('diet_preferences', {}).get('cooking_variety', ''),
                
                # Weekly Schedule Selections
                'daily_activities': st.session_state.get('daily_activities', {}),
                'sleep_schedule': st.session_state.get('sleep_schedule', {}),
                'workout_schedule': st.session_state.get('workout_schedule', {}),
                'meal_schedule': st.session_state.get('meal_schedule', {}),
                'weekly_workout_count': st.session_state.get('weekly_workout_count', 0),
                'selected_workout_days': st.session_state.get('selected_workout_days', []),
                
                # Calculated Data
                'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {}),
                'day_tdee_values': st.session_state.get('day_tdee_values', {}),
                'recommended_rates': st.session_state.get('recommended_rates', {}),
                'nutrition_plan': st.session_state.get('nutrition_plan', {}),
                'tdee': st.session_state.get('tdee', 0),
                
                # Progress Tracking
                'setup_complete': st.session_state.get('setup_complete', False),
                'body_composition_complete': st.session_state.get('body_composition_complete', False),
                'diet_preferences_complete': st.session_state.get('diet_preferences_complete', False),
                'weekly_schedule_complete': st.session_state.get('weekly_schedule_complete', False),
                'nutrition_targets_complete': st.session_state.get('nutrition_targets_complete', False),
                
                # Generated Plans
                'ai_meal_plan': st.session_state.get('ai_meal_plan', {}),
                'generated_weekly_meal_plan': st.session_state.get('generated_weekly_meal_plan', {}),
                
                # Session metadata
                'session_name': session_name
            }
            
            # Save to file
            filename = f"{session_name}.json"
            filepath = os.path.join(self.save_directory, filename)
            
            with open(filepath, 'w') as f:
                json.dump(session_data, f, indent=2, default=str)
            
            return filepath
            
        except Exception as e:
            st.error(f"Error saving session: {e}")
            return None
    
    def load_session(self, filename):
        """Load session from file"""
        try:
            filepath = os.path.join(self.save_directory, filename)
            
            if not os.path.exists(filepath):
                st.error(f"Session file not found: {filename}")
                return False
            
            with open(filepath, 'r') as f:
                session_data = json.load(f)
            
            # Load data back into session state
            for key, value in session_data.items():
                if key != 'timestamp' and key != 'session_name':
                    st.session_state[key] = value
            
            # Ensure nested structures are properly restored
            if 'user_info' in session_data:
                st.session_state.user_info = session_data['user_info']
            if 'diet_preferences' in session_data:
                st.session_state.diet_preferences = session_data['diet_preferences']
            if 'goal_info' in session_data:
                st.session_state.goal_info = session_data['goal_info']
            
            st.success(f"Session loaded successfully: {session_data.get('session_name', filename)}")
            return True
            
        except Exception as e:
            st.error(f"Error loading session: {e}")
            return False
    
    def get_saved_sessions(self):
        """Get list of saved sessions"""
        try:
            if not os.path.exists(self.save_directory):
                return []
            
            sessions = []
            for filename in os.listdir(self.save_directory):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.save_directory, filename)
                    try:
                        with open(filepath, 'r') as f:
                            session_data = json.load(f)
                        
                        sessions.append({
                            'filename': filename,
                            'session_name': session_data.get('session_name', filename.replace('.json', '')),
                            'timestamp': session_data.get('timestamp', 'Unknown'),
                            'user_name': session_data.get('user_info', {}).get('name', 'Unknown'),
                            'goal_type': session_data.get('goal_info', {}).get('goal_type', 'Unknown')
                        })
                    except:
                        continue
            
            # Sort by timestamp (newest first)
            sessions.sort(key=lambda x: x['timestamp'], reverse=True)
            return sessions
            
        except Exception as e:
            st.error(f"Error getting saved sessions: {e}")
            return []
    
    def delete_session(self, filename):
        """Delete a saved session"""
        try:
            filepath = os.path.join(self.save_directory, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return False
        except Exception as e:
            st.error(f"Error deleting session: {e}")
            return False
    
    def auto_save(self):
        """Auto-save current session"""
        auto_save_name = "auto_save_latest"
        return self.save_session(auto_save_name)
    
    def has_auto_save(self):
        """Check if auto-save exists"""
        filename = "auto_save_latest.json"
        filepath = os.path.join(self.save_directory, filename)
        return os.path.exists(filepath)

# Global session manager instance
session_manager = SessionManager()

def add_session_controls():
    """Add session save/load controls to sidebar"""
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 💾 Session Management")
    
    # Auto-load on page load
    auto_load_session()
    
    # Show current session status
    current_session = st.session_state.get('current_session_name', 'Unsaved')
    st.sidebar.info(f"Current: {current_session}")
    
    # Save current session
    col1, col2 = st.sidebar.columns(2)
    with col1:
        if st.button("💾 Save", use_container_width=True, key="save_session"):
            session_name = f"session_{datetime.now().strftime('%m%d_%H%M')}"
            filepath = session_manager.save_session(session_name)
            if filepath:
                st.session_state['current_session_name'] = session_name
                st.sidebar.success(f"Saved as {session_name}")
                st.rerun()
    
    with col2:
        if st.button("🔄 Auto-Save", use_container_width=True, key="auto_save_session"):
            session_manager.auto_save()
            st.session_state['current_session_name'] = "auto_save_latest"
            st.sidebar.success("Auto-saved")
    
    # Load existing sessions
    saved_sessions = session_manager.get_saved_sessions()
    if saved_sessions:
        st.sidebar.markdown("**Load Previous Session:**")
        
        # Create a selectbox with session info
        session_options = []
        for session in saved_sessions:
            timestamp = session['timestamp']
            if timestamp != 'Unknown':
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    time_str = dt.strftime('%m/%d %H:%M')
                except:
                    time_str = 'Unknown'
            else:
                time_str = 'Unknown'
            
            display_name = f"{session['user_name']} - {time_str}"
            session_options.append((display_name, session['filename']))
        
        if session_options:
            selected_session = st.sidebar.selectbox(
                "Select Session:",
                options=[None] + session_options,
                format_func=lambda x: "Choose..." if x is None else x[0],
                key="session_selector"
            )
            
            if selected_session:
                col1, col2 = st.sidebar.columns(2)
                with col1:
                    if st.button("📂 Load", use_container_width=True, key="load_session"):
                        if session_manager.load_session(selected_session[1]):
                            st.session_state['current_session_name'] = selected_session[1].replace('.json', '')
                            st.rerun()
                
                with col2:
                    if st.button("🗑️ Delete", use_container_width=True, key="delete_session"):
                        if session_manager.delete_session(selected_session[1]):
                            st.sidebar.success("Session deleted")
                            st.rerun()

def auto_load_session():
    """Automatically load the most recent session if available"""
    # Check if we should auto-load
    if 'session_auto_loaded' not in st.session_state:
        st.session_state.session_auto_loaded = True
        
        # Try to load auto-save first
        if session_manager.has_auto_save():
            session_manager.load_session("auto_save_latest.json")
            st.session_state['current_session_name'] = "auto_save_latest"
        else:
            # Load most recent session
            sessions = session_manager.get_saved_sessions()
            if sessions:
                latest_session = sessions[0]  # Already sorted by timestamp
                session_manager.load_session(latest_session['filename'])
                st.session_state['current_session_name'] = latest_session['filename'].replace('.json', '')

def save_on_change():
    """Auto-save whenever data changes"""
    if 'auto_save_enabled' not in st.session_state:
        st.session_state.auto_save_enabled = True
    
    if st.session_state.auto_save_enabled:
        session_manager.auto_save()
        st.session_state['current_session_name'] = "auto_save_latest"