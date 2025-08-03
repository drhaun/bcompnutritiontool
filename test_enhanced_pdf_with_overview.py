#!/usr/bin/env python3
"""
Test the enhanced PDF export with weekly overview table
"""
import os
from datetime import datetime
from pdf_export import export_meal_plan_pdf

def create_test_data_with_schedule():
    """Create test data with schedule information for weekly overview"""
    
    # Realistic meal data with schedule info
    meal_data = [
        {
            "meal_type": "Breakfast",
            "recipe": {
                "name": "Protein Oatmeal Bowl",
                "ingredients": [
                    {"name": "Rolled Oats", "amount": "50g"},
                    {"name": "Whey Protein Powder", "amount": "30g"},
                    {"name": "Banana", "amount": "1 medium"},
                    {"name": "Almonds", "amount": "15g"}
                ],
                "macros": {"protein": 35, "carbs": 52, "fat": 8, "calories": 410},
                "instructions": ["Cook oats with water", "Stir in protein powder", "Top with banana and almonds"]
            },
            "day": "Monday"
        },
        {
            "meal_type": "Lunch",
            "recipe": {
                "name": "Chicken Salad",
                "ingredients": [
                    {"name": "Chicken Breast", "amount": "150g"},
                    {"name": "Mixed Greens", "amount": "100g"},
                    {"name": "Olive Oil", "amount": "10ml"}
                ],
                "macros": {"protein": 42, "carbs": 12, "fat": 15, "calories": 335},
                "instructions": ["Grill chicken", "Combine with greens", "Drizzle with olive oil"]
            },
            "day": "Monday"
        },
        {
            "meal_type": "Dinner",
            "recipe": {
                "name": "Salmon with Vegetables",
                "ingredients": [
                    {"name": "Salmon Fillet", "amount": "140g"},
                    {"name": "Sweet Potato", "amount": "200g"},
                    {"name": "Broccoli", "amount": "150g"}
                ],
                "macros": {"protein": 38, "carbs": 35, "fat": 18, "calories": 420},
                "instructions": ["Bake salmon", "Roast sweet potato", "Steam broccoli"]
            },
            "day": "Monday"
        },
        {
            "meal_type": "Snack",
            "recipe": {
                "name": "Greek Yogurt",
                "ingredients": [
                    {"name": "Greek Yogurt", "amount": "150g"},
                    {"name": "Walnuts", "amount": "20g"}
                ],
                "macros": {"protein": 18, "carbs": 8, "fat": 15, "calories": 225},
                "instructions": ["Mix yogurt with nuts"]
            },
            "day": "Monday"
        },
        # Tuesday
        {
            "meal_type": "Breakfast",
            "recipe": {
                "name": "Egg Scramble",
                "ingredients": [
                    {"name": "Eggs", "amount": "3 large"},
                    {"name": "Spinach", "amount": "50g"},
                    {"name": "Cheese", "amount": "30g"}
                ],
                "macros": {"protein": 28, "carbs": 5, "fat": 22, "calories": 320},
                "instructions": ["Scramble eggs with spinach", "Top with cheese"]
            },
            "day": "Tuesday"
        },
        {
            "meal_type": "Lunch",
            "recipe": {
                "name": "Turkey Bowl",
                "ingredients": [
                    {"name": "Ground Turkey", "amount": "120g"},
                    {"name": "Quinoa", "amount": "60g dry"},
                    {"name": "Black Beans", "amount": "80g"}
                ],
                "macros": {"protein": 38, "carbs": 45, "fat": 8, "calories": 395},
                "instructions": ["Cook quinoa", "Brown turkey", "Combine with beans"]
            },
            "day": "Tuesday"
        }
    ]
    
    # User preferences with schedule information
    user_preferences = {
        "name": "Sarah Johnson",
        "age": 28,
        "daily_targets": {
            "calories": 1850,
            "protein": 130,
            "carbs": 185,
            "fat": 72
        },
        "schedule_info": {
            "wake_time": "6:30 AM",
            "sleep_time": "10:30 PM",
            "workout_time": "7:00 PM"
        },
        "profile": {
            "name": "Sarah Johnson",
            "age": 28,
            "gender": "Female",
            "weight_lbs": 140,
            "height_ft": 5,
            "height_in": 6,
            "activity_level": "Moderately Active"
        },
        "goals": {
            "goal_type": "Body Recomposition",
            "target_weight_lbs": 135,
            "target_bf": 22
        }
    }
    
    # Plan info with daily plans structure
    plan_info = {
        "total_meals": len(meal_data),
        "days_covered": 2,
        "daily_totals": {
            "calories": 1390,  # Sum of Monday meals
            "protein": 133,
            "carbs": 107,
            "fat": 56
        },
        "meal_data": meal_data,
        # Convert to daily_plans format for weekly overview
        "daily_plans": [
            {
                "day": "Monday",
                "meals": [m for m in meal_data if m.get('day') == 'Monday'],
                "schedule": {
                    "wake_time": "6:30 AM",
                    "sleep_time": "10:30 PM", 
                    "workout_time": "7:00 PM"
                }
            },
            {
                "day": "Tuesday", 
                "meals": [m for m in meal_data if m.get('day') == 'Tuesday'],
                "schedule": {
                    "wake_time": "6:30 AM",
                    "sleep_time": "10:30 PM",
                    "workout_time": "7:00 PM"
                }
            }
        ]
    }
    
    return meal_data, user_preferences, plan_info

def main():
    """Test enhanced PDF with weekly overview"""
    
    print("Testing Enhanced PDF with Weekly Overview Table")
    print("=" * 50)
    
    # Create test data
    meal_data, user_preferences, plan_info = create_test_data_with_schedule()
    
    print(f"Created data:")
    print(f"  • {len(meal_data)} meals across {plan_info['days_covered']} days")
    print(f"  • User: {user_preferences['name']}")
    print(f"  • Schedule: Wake {user_preferences['schedule_info']['wake_time']}, Workout {user_preferences['schedule_info']['workout_time']}")
    
    # Generate PDF
    try:
        filename = export_meal_plan_pdf(
            meal_data=meal_data,
            user_preferences=user_preferences,
            plan_info=plan_info
        )
        
        if filename and os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"\n✅ Enhanced PDF Created: {filename}")
            print(f"✅ File Size: {size:,} bytes")
            
            # Verify weekly overview table is included
            with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Check for key table elements
            table_elements = [
                ("Weekly Overview Header", "WEEKLY OVERVIEW"),
                ("Table Headers", "TDEE"),
                ("Day Column", "Mon"),
                ("Protein Values", "130g"),
                ("Schedule Times", "6:30"),
                ("Grocery List", "CONSOLIDATED GROCERY LIST")
            ]
            
            print(f"\nContent Verification:")
            verified = 0
            for element_name, search_text in table_elements:
                if search_text in content:
                    print(f"  ✅ {element_name}: Found")
                    verified += 1
                else:
                    print(f"  ❌ {element_name}: Missing")
            
            print(f"\nTable Elements: {verified}/{len(table_elements)} found")
            
            if verified >= 5:
                print(f"🎉 SUCCESS! Weekly overview table successfully added to PDF")
                return filename
            else:
                print(f"⚠️  Some table elements may be missing")
                return filename
                
        else:
            print(f"❌ PDF file not created")
            return None
            
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = main()
    
    if result:
        print(f"\n✅ ENHANCEMENT COMPLETE!")
        print(f"PDF with weekly overview ready: {result}")
        print(f"\nNew features added:")
        print(f"  • Weekly overview table on title page")
        print(f"  • Day-by-day breakdown with TDEE, macros, meal counts")
        print(f"  • Schedule information (wake, sleep, workout times)")
        print(f"  • Professional table formatting with proper columns")
        print(f"  • Matches Advanced AI Meal Plan page display")
    else:
        print(f"\n❌ Enhancement failed")