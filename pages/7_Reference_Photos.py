import streamlit as st
import sys
import os
from PIL import Image
import base64
from io import BytesIO

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Reference Photos",
    page_icon="🛡️",
    layout="wide"
)

# Load brand logo
st.markdown("""
<div class="logo-container">
    <img src="data:image/png;base64,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" height="60">
    <h1 class="title-text">Reference Photos</h1>
</div>
""", unsafe_allow_html=True)

# Attempt to load existing data
utils.load_data()

def main():
    st.write("""
    ## Body Fat Percentage Reference
    
    These reference photos provide visual examples of different body fat percentages for men and women.
    Use these as a guide to help estimate your current body fat percentage.
    """)
    
    # Gender selector
    gender = st.radio("Select gender for reference photos", ["Male", "Female"])
    
    # Create tabs for different body fat ranges
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "5-10% (Very Lean)", 
        "10-15% (Lean)", 
        "15-20% (Athletic)", 
        "20-25% (Average)", 
        "25%+ (Above Average)"
    ])
    
    with tab1:
        if gender == "Male":
            st.subheader("Male: 5-10% Body Fat (Very Lean)")
            st.write("""
            * Visible six-pack abs
            * Visible vascularity throughout the body
            * Muscle striations visible
            * Minimal body fat
            * Very defined muscles
            """)
            # Placeholder for male 5-10% image
            st.image("https://via.placeholder.com/600x400?text=Male+5-10%+Body+Fat", caption="5-10% Body Fat - Male Example")
        else:
            st.subheader("Female: 10-15% Body Fat (Very Lean)")
            st.write("""
            * Visible muscle definition
            * Some vascularity
            * Visible abs
            * Minimal body fat
            * Very defined muscles
            """)
            # Placeholder for female 10-15% image
            st.image("https://via.placeholder.com/600x400?text=Female+10-15%+Body+Fat", caption="10-15% Body Fat - Female Example")
    
    with tab2:
        if gender == "Male":
            st.subheader("Male: 10-15% Body Fat (Lean)")
            st.write("""
            * Visible abs
            * Some vascularity
            * Good muscle definition
            * Low body fat
            * Athletic appearance
            """)
            # Placeholder for male 10-15% image
            st.image("https://via.placeholder.com/600x400?text=Male+10-15%+Body+Fat", caption="10-15% Body Fat - Male Example")
        else:
            st.subheader("Female: 15-20% Body Fat (Lean)")
            st.write("""
            * Some muscle definition
            * Athletic appearance
            * Some abdominal definition
            * Low body fat
            * Fit appearance
            """)
            # Placeholder for female 15-20% image
            st.image("https://via.placeholder.com/600x400?text=Female+15-20%+Body+Fat", caption="15-20% Body Fat - Female Example")
    
    with tab3:
        if gender == "Male":
            st.subheader("Male: 15-20% Body Fat (Athletic)")
            st.write("""
            * Some abdominal definition
            * Less vascularity
            * Muscle definition still visible
            * Moderate body fat
            * Fit appearance
            """)
            # Placeholder for male 15-20% image
            st.image("https://via.placeholder.com/600x400?text=Male+15-20%+Body+Fat", caption="15-20% Body Fat - Male Example")
        else:
            st.subheader("Female: 20-25% Body Fat (Athletic)")
            st.write("""
            * Soft muscle definition
            * Limited abdominal definition
            * Healthy appearance
            * Moderate body fat
            * Fit but not visibly lean
            """)
            # Placeholder for female 20-25% image
            st.image("https://via.placeholder.com/600x400?text=Female+20-25%+Body+Fat", caption="20-25% Body Fat - Female Example")
    
    with tab4:
        if gender == "Male":
            st.subheader("Male: 20-25% Body Fat (Average)")
            st.write("""
            * Little to no muscle definition
            * No visible abs
            * Some fat accumulation around waist
            * Higher body fat
            * Average appearance
            """)
            # Placeholder for male 20-25% image
            st.image("https://via.placeholder.com/600x400?text=Male+20-25%+Body+Fat", caption="20-25% Body Fat - Male Example")
        else:
            st.subheader("Female: 25-30% Body Fat (Average)")
            st.write("""
            * Limited muscle definition
            * Softer appearance
            * No abdominal definition
            * Higher body fat
            * Average appearance
            """)
            # Placeholder for female 25-30% image
            st.image("https://via.placeholder.com/600x400?text=Female+25-30%+Body+Fat", caption="25-30% Body Fat - Female Example")
    
    with tab5:
        if gender == "Male":
            st.subheader("Male: 25%+ Body Fat (Above Average)")
            st.write("""
            * No muscle definition
            * Significant fat around waist and other areas
            * Rounded appearance
            * High body fat
            * Above average appearance
            """)
            # Placeholder for male 25%+ image
            st.image("https://via.placeholder.com/600x400?text=Male+25%2B+Body+Fat", caption="25%+ Body Fat - Male Example")
        else:
            st.subheader("Female: 30%+ Body Fat (Above Average)")
            st.write("""
            * No muscle definition
            * Softer, rounded appearance
            * Fat accumulation in various areas
            * High body fat
            * Above average appearance
            """)
            # Placeholder for female 30%+ image
            st.image("https://via.placeholder.com/600x400?text=Female+30%2B+Body+Fat", caption="30%+ Body Fat - Female Example")
    
    st.write("""
    ## Disclaimer
    These are approximate visual references. Body fat distribution varies based on genetics, age, and other factors.
    For a more accurate assessment, consider using methods like DEXA scans, hydrostatic weighing, or skin fold calipers with a professional.
    """)

if __name__ == "__main__":
    main()