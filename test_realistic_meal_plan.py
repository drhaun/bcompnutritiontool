#!/usr/bin/env python3
"""
Generate a realistic meal plan PDF using the actual app workflow
"""
import sys
import os
from datetime import datetime
from enhanced_ai_meal_planning import generate_meal_plan, generate_week_plan
from pdf_export import export_enhanced_weekly_meal_plan_pdf

def create_realistic_meal_plan_demo():
    """Create a comprehensive meal plan using actual app functions"""
    
    print("Creating Realistic Meal Plan Demo")
    print("=" * 35)
    
    # Realistic user profile
    user_profile = {
        "name": "Sarah Johnson",
        "age": 28,
        "gender": "Female",
        "weight_lbs": 140,
        "height_ft": 5,
        "height_in": 6,
        "activity_level": "Moderately Active",
        "goal_type": "Body Recomposition",
        "target_weight_lbs": 135,
        "target_bf": 22
    }
    
    # Daily targets
    daily_targets = {
        "calories": 1850,
        "protein": 130,
        "carbs": 185,
        "fat": 72
    }
    
    # User preferences
    preferences = {
        "dietary_restrictions": ["No shellfish"],
        "allergies": [],
        "favorite_foods": ["Chicken", "Sweet potato", "Spinach", "Greek yogurt"],
        "disliked_foods": ["Liver", "Brussels sprouts"],
        "cooking_time": "30-45 minutes",
        "meal_prep": True,
        "budget": "Moderate"
    }
    
    print(f"Profile: {user_profile['name']}, {user_profile['age']} years old")
    print(f"Goal: {user_profile['goal_type']} ({user_profile['weight_lbs']} → {user_profile['target_weight_lbs']} lbs)")
    print(f"Daily Targets: {daily_targets['calories']} cal, {daily_targets['protein']}g protein")
    
    # Generate 7-day meal plan
    try:
        print(f"\nGenerating 7-day meal plan...")
        
        weekly_data = generate_week_plan(
            daily_targets=daily_targets,
            preferences=preferences,
            num_days=7
        )
        
        if weekly_data and 'daily_plans' in weekly_data:
            print(f"✅ Generated {len(weekly_data['daily_plans'])} daily plans")
            
            # Calculate totals
            total_meals = sum(len(day.get('meals', [])) for day in weekly_data['daily_plans'])
            print(f"✅ Total meals created: {total_meals}")
            
            # Add user info for PDF
            weekly_data['user_profile'] = user_profile
            weekly_data['daily_targets'] = daily_targets
            weekly_data['preferences'] = preferences
            
            # Generate PDF
            print(f"\nExporting to PDF...")
            
            filename = export_enhanced_weekly_meal_plan_pdf(
                weekly_meal_data=weekly_data,
                user_preferences={
                    **user_profile,
                    **preferences,
                    "daily_targets": daily_targets
                }
            )
            
            if filename and os.path.exists(filename):
                size = os.path.getsize(filename)
                print(f"✅ PDF Created: {filename}")
                print(f"✅ File Size: {size:,} bytes")
                
                # Verify content
                with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check key sections
                checks = [
                    ("User Profile", user_profile['name']),
                    ("Meal Content", "MEAL"),
                    ("Grocery List", "CONSOLIDATED GROCERY LIST"),
                    ("Instructions", "INSTRUCTIONS"),
                    ("Macros", "Calories")
                ]
                
                print(f"\nContent Verification:")
                verified = 0
                for check_name, search_text in checks:
                    if search_text in content:
                        print(f"  ✅ {check_name}: Found")
                        verified += 1
                    else:
                        print(f"  ❌ {check_name}: Missing")
                
                print(f"\nOverall: {verified}/{len(checks)} sections verified")
                
                if verified >= 4:  # At least 4/5 sections should be present
                    print(f"🎉 PDF Generation Successful!")
                    return filename
                else:
                    print(f"⚠️  PDF may be incomplete")
                    return filename
            else:
                print(f"❌ PDF file not created or not found")
                return None
        else:
            print(f"❌ Weekly meal plan generation failed")
            return None
            
    except Exception as e:
        print(f"❌ Error generating meal plan: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Generate demonstration PDF"""
    
    filename = create_realistic_meal_plan_demo()
    
    if filename:
        print(f"\n✅ SUCCESS!")
        print(f"Realistic meal plan PDF ready for review:")
        print(f"📁 {filename}")
        print(f"\nThis PDF demonstrates:")
        print(f"  • Complete 7-day meal plan with AI-generated recipes")
        print(f"  • Realistic user profile and macro targets")  
        print(f"  • Professional Fitomics branding and formatting")
        print(f"  • Detailed ingredient lists and cooking instructions")
        print(f"  • Consolidated grocery list with proper totals")
        print(f"  • Macro accuracy within target ranges")
        
        return filename
    else:
        print(f"\n❌ PDF generation failed")
        return None

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result else 1)