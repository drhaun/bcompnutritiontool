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
            
            # Collect all relevant session data
            session_data = {
                'timestamp': datetime.now().isoformat(),
                'user_info': st.session_state.get('user_info', {}),
                'goal_info': st.session_state.get('goal_info', {}),
                'diet_preferences': st.session_state.get('diet_preferences', {}),
                'weekly_schedule_v2': st.session_state.get('weekly_schedule_v2', {}),
                'confirmed_weekly_schedule': st.session_state.get('confirmed_weekly_schedule', {}),
                'day_specific_nutrition': st.session_state.get('day_specific_nutrition', {}),
                'day_tdee_values': st.session_state.get('day_tdee_values', {}),
                'setup_complete': st.session_state.get('setup_complete', False),
                'body_fat_pct': st.session_state.get('body_fat_pct', 0),
                'target_bf': st.session_state.get('target_bf', 0),
                'timeline_weeks': st.session_state.get('timeline_weeks', 0),
                'target_weight_lbs': st.session_state.get('target_weight_lbs', 0),
                'activity_level': st.session_state.get('activity_level', ''),
                'goal_type': st.session_state.get('goal_type', ''),
                'weekly_weight_pct': st.session_state.get('weekly_weight_pct', 0),
                'recommended_rates': st.session_state.get('recommended_rates', {}),
                'nutrition_plan': st.session_state.get('nutrition_plan', {}),
                'ai_meal_plan': st.session_state.get('ai_meal_plan', {}),
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