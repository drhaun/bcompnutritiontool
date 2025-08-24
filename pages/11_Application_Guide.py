import streamlit as st
import pandas as pd
from datetime import datetime
import os

# Configure the page
st.set_page_config(
    page_title="Application Guide - Fitomics",
    page_icon="📚",
    layout="wide"
)

# Import session management utilities
import sys
sys.path.append('.')

# Load custom CSS for Fitomics branding
def load_custom_css():
    """Apply custom CSS styling for Fitomics branding"""
    st.markdown("""
    <style>
        .main-header {
            background: linear-gradient(90deg, #1e3c72, #2a5298);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            text-align: center;
        }
        .guide-section {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
            border-left: 4px solid #2a5298;
        }
        .step-box {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            margin: 0.5rem 0;
            border: 1px solid #e9ecef;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .warning-box {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        .success-box {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        .tip-box {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
    </style>
    """, unsafe_allow_html=True)

# Apply custom styling
load_custom_css()

# Header
st.markdown("""
<div class="main-header">
    <h1>📚 Fitomics Application Guide</h1>
    <p>Your comprehensive guide to maximizing the Fitomics Body Composition Planning Tool</p>
</div>
""", unsafe_allow_html=True)

# Navigation menu
st.markdown("### Quick Navigation")
col1, col2, col3, col4 = st.columns(4)

with col1:
    if st.button("🚀 Getting Started", use_container_width=True):
        st.session_state.guide_section = "getting_started"

with col2:
    if st.button("📝 Step-by-Step Workflow", use_container_width=True):
        st.session_state.guide_section = "workflow"

with col3:
    if st.button("💡 Pro Tips & Best Practices", use_container_width=True):
        st.session_state.guide_section = "tips"

with col4:
    if st.button("🔧 Troubleshooting", use_container_width=True):
        st.session_state.guide_section = "troubleshooting"

# Initialize guide section if not set
if 'guide_section' not in st.session_state:
    st.session_state.guide_section = "getting_started"

# Main content based on selected section
if st.session_state.guide_section == "getting_started":
    st.markdown("""
    <div class="guide-section">
        <h2>🚀 Getting Started with Fitomics</h2>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    ### Welcome to Your Body Composition Journey!
    
    The Fitomics Body Composition Planning Tool is designed to provide you with science-based, personalized nutrition and body composition guidance. This comprehensive application combines advanced nutritional science with AI-powered meal planning to help you achieve your specific goals.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="success-box">
            <h4>✅ What This App Does</h4>
            <ul>
                <li><strong>Body Composition Analysis:</strong> Calculate and track FMI, FFMI, and body fat percentage</li>
                <li><strong>Personalized Nutrition Targets:</strong> Set macro targets based on your goals and activity level</li>
                <li><strong>AI Meal Planning:</strong> Generate intelligent meal plans with precise macro targeting</li>
                <li><strong>Progress Tracking:</strong> Monitor your journey with comprehensive analytics</li>
                <li><strong>Professional Reports:</strong> Export branded PDF meal plans for reference</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="tip-box">
            <h4>💡 Before You Start</h4>
            <ul>
                <li><strong>Gather Your Data:</strong> Have your current weight, height, and body fat percentage ready</li>
                <li><strong>Define Your Goals:</strong> Be clear about whether you want to lose fat, build muscle, or maintain</li>
                <li><strong>Know Your Schedule:</strong> Think about your workout routine and daily schedule</li>
                <li><strong>Consider Preferences:</strong> Have your dietary restrictions and food preferences in mind</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("""
    ### Key Features Overview
    """)
    
    feature_col1, feature_col2, feature_col3 = st.columns(3)
    
    with feature_col1:
        st.markdown("""
        <div class="step-box">
            <h4>🎯 Goal Setting</h4>
            <p>Set specific body composition targets using scientifically-backed metrics like Fat Mass Index (FMI) and Fat-Free Mass Index (FFMI).</p>
        </div>
        """, unsafe_allow_html=True)
    
    with feature_col2:
        st.markdown("""
        <div class="step-box">
            <h4>🤖 AI Integration</h4>
            <p>Advanced AI meal planning that considers your macro targets, preferences, schedule, and dietary restrictions.</p>
        </div>
        """, unsafe_allow_html=True)
    
    with feature_col3:
        st.markdown("""
        <div class="step-box">
            <h4>📊 Progress Analytics</h4>
            <p>Comprehensive tracking with insights, correlations, and progress photos to monitor your transformation.</p>
        </div>
        """, unsafe_allow_html=True)

elif st.session_state.guide_section == "workflow":
    st.markdown("""
    <div class="guide-section">
        <h2>📝 Complete Step-by-Step Workflow</h2>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    ### The 11-Page Journey to Your Perfect Plan
    
    Follow this systematic approach to get the most out of your Fitomics experience. Each step builds upon the previous one to create your personalized body composition plan.
    """)
    
    # Step 1
    st.markdown("""
    <div class="step-box">
        <h3>📋 Step 1: App Overview</h3>
        <p><strong>Purpose:</strong> Get familiar with the application structure and features.</p>
        <p><strong>What to do:</strong></p>
        <ul>
            <li>Read through the app features and capabilities</li>
            <li>Understand what data you'll need to provide</li>
            <li>Review the scientific approach behind the recommendations</li>
        </ul>
        <p><strong>Time needed:</strong> 5-10 minutes</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Step 2
    st.markdown("""
    <div class="step-box">
        <h3>👤 Step 2: Initial Setup</h3>
        <p><strong>Purpose:</strong> Establish your baseline measurements and personal information.</p>
        <p><strong>What to do:</strong></p>
        <ul>
            <li>Enter your height, weight, age, and gender</li>
            <li>Provide body fat percentage (if known)</li>
            <li>Select your activity level</li>
            <li>Set your primary goal (lose fat, build muscle, maintain)</li>
        </ul>
        <p><strong>Pro tip:</strong> If you don't know your body fat percentage, the app will help you estimate it later.</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Step 3
    st.markdown("""
    <div class="step-box">
        <h3>🎯 Step 3: Body Composition Goals</h3>
        <p><strong>Purpose:</strong> Set specific, measurable targets for your transformation.</p>
        <p><strong>What to do:</strong></p>
        <ul>
            <li>Use the body composition calculator to understand your current FMI and FFMI</li>
            <li>Set target values for fat mass and fat-free mass</li>
            <li>Define your timeline and rate of change</li>
            <li>Review the projected weekly progress table</li>
        </ul>
        <p><strong>Critical point:</strong> This step determines your calorie and macro targets for the entire plan.</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Step 4
    st.markdown("""
    <div class="step-box">
        <h3>🍽️ Step 4: Diet Preferences</h3>
        <p><strong>Purpose:</strong> Customize the AI meal planning to your tastes and restrictions.</p>
        <p><strong>What to do:</strong></p>
        <ul>
            <li>Select your dietary restrictions and allergies</li>
            <li>Choose cuisine preferences and disliked foods</li>
            <li>Set meal variety preferences</li>
            <li>Configure supplementation preferences</li>
            <li>Optional: Add location-based preferences for restaurants and stores</li>
        </ul>
        <p><strong>Pro tip:</strong> Be thorough here - it directly impacts your meal plan quality.</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Step 5
    st.markdown("""
    <div class="step-box">
        <h3>📅 Step 5: Weekly Schedule</h3>
        <p><strong>Purpose:</strong> Align your nutrition plan with your lifestyle and workout routine.</p>
        <p><strong>What to do:</strong></p>
        <ul>
            <li>Set your workout schedule for each day</li>
            <li>Configure meal timing and contexts (home, work, on-the-go)</li>
            <li>Set nutrient timing preferences around workouts</li>
            <li>Define your energy distribution preferences</li>
        </ul>
        <p><strong>Why this matters:</strong> Proper nutrient timing can significantly impact your results.</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Step 6
    st.markdown("""
    <div class="step-box">
        <h3>🎯 Step 6: Nutrition Targets</h3>
        <p><strong>Purpose:</strong> Fine-tune your daily macro targets and meal distribution.</p>
        <p><strong>What to do:</strong></p>
        <ul>
            <li>Review your calculated TDEE and macro targets</li>
            <li>Customize targets for specific days if needed</li>
            <li>Set meal distribution (how many meals and snacks)</li>
            <li>Configure macro distribution across meals</li>
        </ul>
        <p><strong>Key targets:</strong> Main meals = 656 calories/50g protein, Snacks = 328 calories/25g protein</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Steps 7-11
    steps_789 = [
        {
            "step": "7",
            "title": "🤖 Advanced AI Meal Plan",
            "purpose": "Generate your complete weekly meal plan using AI.",
            "actions": [
                "Generate AI meal plans for each day",
                "Review and approve/modify suggested meals",
                "Ensure macro targets are met within ±3% tolerance",
                "Export your meal plan as a professional PDF"
            ],
            "tip": "The AI considers all your preferences and targets for optimal meal suggestions."
        },
        {
            "step": "8",
            "title": "🛠️ DIY Meal Planning",
            "purpose": "Manually create or modify meals using the food database.",
            "actions": [
                "Search the comprehensive food database",
                "Build custom meals and recipes",
                "Calculate and verify macro content",
                "Save favorite meals for future use"
            ],
            "tip": "Great for when you want specific meals or need to make substitutions."
        },
        {
            "step": "9",
            "title": "📝 Daily Monitoring",
            "purpose": "Track your daily progress and adherence.",
            "actions": [
                "Log daily weight and body measurements",
                "Track mood, energy, and sleep quality",
                "Monitor meal adherence and satisfaction",
                "Review daily nutrition summary"
            ],
            "tip": "Consistent tracking is key to understanding what works for your body."
        },
        {
            "step": "10",
            "title": "📊 Progress Dashboard",
            "purpose": "Analyze your progress and get personalized insights.",
            "actions": [
                "Review weight and body composition trends",
                "Upload and manage progress photos",
                "Analyze correlations between variables",
                "Get AI-powered insights and recommendations"
            ],
            "tip": "Use this data to make informed adjustments to your plan."
        },
        {
            "step": "11",
            "title": "💧 Hydration Calculator",
            "purpose": "Optimize your fluid and electrolyte intake.",
            "actions": [
                "Calculate personalized hydration needs",
                "Account for exercise and environmental factors",
                "Get electrolyte recommendations",
                "Track daily fluid intake"
            ],
            "tip": "Proper hydration supports all aspects of body composition and performance."
        }
    ]
    
    for step_info in steps_789:
        st.markdown(f"""
        <div class="step-box">
            <h3>{step_info['title']}</h3>
            <p><strong>Purpose:</strong> {step_info['purpose']}</p>
            <p><strong>What to do:</strong></p>
            <ul>
                {''.join([f'<li>{action}</li>' for action in step_info['actions']])}
            </ul>
            <p><strong>Pro tip:</strong> {step_info['tip']}</p>
        </div>
        """, unsafe_allow_html=True)

elif st.session_state.guide_section == "tips":
    st.markdown("""
    <div class="guide-section">
        <h2>💡 Pro Tips & Best Practices</h2>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    ### Maximize Your Success with These Expert Tips
    """)
    
    # Accuracy Tips
    st.markdown("""
    <div class="tip-box">
        <h3>🎯 Accuracy Tips</h3>
        <h4>Body Composition Measurements:</h4>
        <ul>
            <li><strong>Consistent Timing:</strong> Weigh yourself at the same time each day (preferably morning, after bathroom, before eating)</li>
            <li><strong>Body Fat Percentage:</strong> Use DEXA scan, BodPod, or professional calipers for most accurate results</li>
            <li><strong>Track Trends:</strong> Focus on weekly averages rather than daily fluctuations</li>
            <li><strong>Measurements:</strong> Take body measurements (waist, hips, arms) in addition to weight</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    # Nutrition Tips
    st.markdown("""
    <div class="success-box">
        <h3>🍽️ Nutrition Optimization</h3>
        <h4>Meal Planning Success:</h4>
        <ul>
            <li><strong>Macro Precision:</strong> Aim for ±3% of your target macros for optimal results</li>
            <li><strong>Meal Timing:</strong> Eat protein within 2 hours post-workout for muscle recovery</li>
            <li><strong>Hydration:</strong> Drink water throughout the day, not just during meals</li>
            <li><strong>Flexibility:</strong> Use the 80/20 rule - be precise 80% of the time, flexible 20%</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    # AI Tips
    st.markdown("""
    <div class="tip-box">
        <h3>🤖 Getting the Most from AI Meal Planning</h3>
        <h4>Optimization Strategies:</h4>
        <ul>
            <li><strong>Be Specific:</strong> The more detailed your preferences, the better the AI suggestions</li>
            <li><strong>Review & Adjust:</strong> Always review AI-generated meals before accepting</li>
            <li><strong>Learn Patterns:</strong> Notice which AI suggestions work best for you</li>
            <li><strong>Seasonal Adjustment:</strong> Update preferences seasonally for variety</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    # Progress Tips
    st.markdown("""
    <div class="warning-box">
        <h3>📈 Progress Tracking Best Practices</h3>
        <h4>Smart Monitoring:</h4>
        <ul>
            <li><strong>Consistency:</strong> Log data at the same time each day</li>
            <li><strong>Multiple Metrics:</strong> Track weight, measurements, photos, and how you feel</li>
            <li><strong>Progress Photos:</strong> Take them in consistent lighting and poses</li>
            <li><strong>Patience:</strong> Significant changes take 2-4 weeks to become apparent</li>
            <li><strong>Adjustments:</strong> Make small adjustments based on 1-2 week trends</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    # Advanced Tips
    st.markdown("""
    ### 🚀 Advanced Optimization Strategies
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="step-box">
            <h4>🎯 Goal-Specific Tips</h4>
            <p><strong>Fat Loss:</strong></p>
            <ul>
                <li>Prioritize protein to preserve muscle mass</li>
                <li>Time carbs around workouts</li>
                <li>Include fiber-rich foods for satiety</li>
            </ul>
            <p><strong>Muscle Gain:</strong></p>
            <ul>
                <li>Eat in a controlled surplus (200-500 calories)</li>
                <li>Distribute protein throughout the day</li>
                <li>Don't fear carbs - they fuel growth</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="step-box">
            <h4>⚡ Performance Tips</h4>
            <p><strong>Energy Management:</strong></p>
            <ul>
                <li>Match carb intake to training demands</li>
                <li>Use caffeine strategically (not constantly)</li>
                <li>Prioritize sleep for recovery</li>
            </ul>
            <p><strong>Supplements:</strong></p>
            <ul>
                <li>Focus on basics: protein, creatine, multivitamin</li>
                <li>Get nutrients from food first</li>
                <li>Consult professionals for specific needs</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

elif st.session_state.guide_section == "troubleshooting":
    st.markdown("""
    <div class="guide-section">
        <h2>🔧 Troubleshooting & Common Issues</h2>
    </div>
    """, unsafe_allow_html=True)
    
    # Common Issues
    st.markdown("""
    ### 🚨 Common Issues & Solutions
    """)
    
    issues = [
        {
            "problem": "My weight isn't changing as expected",
            "solutions": [
                "Check if you're accurately tracking food intake",
                "Ensure you're hitting your calorie targets consistently",
                "Consider water retention from sodium, hormones, or new exercise",
                "Allow 2-3 weeks for metabolic adaptation",
                "Adjust calories by 100-200 if no change after 2 weeks"
            ]
        },
        {
            "problem": "I can't hit my macro targets exactly",
            "solutions": [
                "Aim for ±3% tolerance on macros rather than perfect precision",
                "Use the DIY meal planning to fine-tune meals",
                "Plan your day in advance rather than tracking reactively",
                "Keep emergency foods that help balance macros",
                "Focus on weekly averages, not daily perfection"
            ]
        },
        {
            "problem": "The AI meal suggestions don't fit my preferences",
            "solutions": [
                "Review and update your diet preferences more specifically",
                "Use the meal modification feature to adjust AI suggestions",
                "Try the DIY meal planning for more control",
                "Gradually expand your food preferences for more options",
                "Use the feedback feature to improve future suggestions"
            ]
        },
        {
            "problem": "I'm not seeing progress in the dashboard",
            "solutions": [
                "Ensure you're logging data consistently every day",
                "Check that your targets are realistic (1-2 lbs per week max)",
                "Take progress photos and measurements beyond just weight",
                "Consider that progress may be slower than expected",
                "Review your adherence to the meal plan"
            ]
        }
    ]
    
    for issue in issues:
        st.markdown(f"""
        <div class="warning-box">
            <h4>❓ {issue['problem']}</h4>
            <p><strong>Solutions:</strong></p>
            <ul>
                {''.join([f'<li>{solution}</li>' for solution in issue['solutions']])}
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    # Technical Issues
    st.markdown("""
    ### 🔧 Technical Troubleshooting
    """)
    
    tech_col1, tech_col2 = st.columns(2)
    
    with tech_col1:
        st.markdown("""
        <div class="step-box">
            <h4>📱 App Performance</h4>
            <p><strong>If the app is slow or unresponsive:</strong></p>
            <ul>
                <li>Refresh the page (F5 or Ctrl+R)</li>
                <li>Clear your browser cache</li>
                <li>Check your internet connection</li>
                <li>Try using a different browser</li>
                <li>Ensure JavaScript is enabled</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with tech_col2:
        st.markdown("""
        <div class="step-box">
            <h4>💾 Data Issues</h4>
            <p><strong>If your data isn't saving:</strong></p>
            <ul>
                <li>Make sure to click "Save" buttons when available</li>
                <li>Don't close the tab while data is processing</li>
                <li>Check if you have sufficient browser storage</li>
                <li>Try logging the same data again</li>
                <li>Export important data as backup</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    # Getting Help
    st.markdown("""
    <div class="success-box">
        <h3>🆘 Getting Additional Help</h3>
        <p><strong>Resources for Further Support:</strong></p>
        <ul>
            <li><strong>Documentation:</strong> Review this guide and the tooltips throughout the app</li>
            <li><strong>Scientific References:</strong> The app is based on peer-reviewed nutrition science</li>
            <li><strong>Professional Consultation:</strong> Consider working with a registered dietitian for complex cases</li>
            <li><strong>Community Forums:</strong> Join fitness and nutrition communities for peer support</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)

# Footer with summary
st.markdown("---")
st.markdown("""
<div class="tip-box">
    <h3>🎯 Remember: Success is a Process</h3>
    <p>The Fitomics Body Composition Planning Tool provides you with the structure and guidance, but your consistency and patience determine the results. Use this app as your scientific foundation, but remember that sustainable body composition changes take time, typically 8-16 weeks for significant results.</p>
    <p><strong>Key to Success:</strong> Consistency over perfection, progress over speed, and evidence-based decisions over emotional reactions.</p>
</div>
""", unsafe_allow_html=True)

# Quick action buttons
st.markdown("### 🚀 Ready to Take Action?")
action_col1, action_col2, action_col3 = st.columns(3)

with action_col1:
    if st.button("▶️ Start the Workflow", type="primary", use_container_width=True):
        st.switch_page("pages/1_Initial_Setup.py")

with action_col2:
    if st.button("📊 View Progress Dashboard", use_container_width=True):
        st.switch_page("pages/9_Progress_Dashboard.py")

with action_col3:
    if st.button("🤖 Try AI Meal Planning", use_container_width=True):
        st.switch_page("pages/6_Advanced_AI_Meal_Plan.py")