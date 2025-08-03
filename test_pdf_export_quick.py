#!/usr/bin/env python3
"""
Quick test to verify PDF export functionality works without generating full week
"""

import sys
import os
sys.path.append('.')

from pdf_export import export_meal_plan_pdf
from datetime import datetime

def test_pdf_export():
    """Test PDF export with minimal sample data"""
    
    # Create minimal meal plan data structure matching what the app generates
    sample_meal_plan = {
        'Monday': {
            'day': 'Monday',
            'meals': [
                {
                    'name': 'Meal 1',
                    'time': '8:00 AM',
                    'context': 'Breakfast',
                    'prep_time': '10 minutes',
                    'ingredients': [
                        {
                            'item': 'Greek Yogurt',
                            'amount': '200g',
                            'calories': 130,
                            'protein': 23,
                            'carbs': 9,
                            'fat': 0
                        },
                        {
                            'item': 'Blueberries',
                            'amount': '100g',
                            'calories': 57,
                            'protein': 0.7,
                            'carbs': 14,
                            'fat': 0.3
                        }
                    ],
                    'instructions': [
                        'Add blueberries to Greek yogurt',
                        'Mix gently and serve'
                    ],
                    'total_macros': {
                        'calories': 187,
                        'protein': 23.7,
                        'carbs': 23,
                        'fat': 0.3
                    }
                },
                {
                    'name': 'Meal 2',
                    'time': '12:30 PM',
                    'context': 'Lunch',
                    'prep_time': '15 minutes',
                    'ingredients': [
                        {
                            'item': 'Chicken Breast',
                            'amount': '150g',
                            'calories': 231,
                            'protein': 43.5,
                            'carbs': 0,
                            'fat': 5
                        },
                        {
                            'item': 'Brown Rice',
                            'amount': '100g cooked',
                            'calories': 111,
                            'protein': 2.6,
                            'carbs': 23,
                            'fat': 0.9
                        }
                    ],
                    'instructions': [
                        'Grill chicken breast seasoned with herbs',
                        'Serve over brown rice'
                    ],
                    'total_macros': {
                        'calories': 342,
                        'protein': 46.1,
                        'carbs': 23,
                        'fat': 5.9
                    }
                }
            ],
            'daily_totals': {
                'calories': 529,
                'protein': 69.8,
                'carbs': 46,
                'fat': 6.2
            },
            'meal_structure_rationale': 'Test meal plan for PDF verification',
            'accuracy_validated': True,
            'schedule_context': {
                'wake_time': '7:00 AM',
                'bed_time': '10:00 PM',
                'workouts': []
            },
            'nutrition_targets': {
                'calories': 2000,
                'protein': 150,
                'carbs': 200,
                'fat': 70
            }
        }
    }
    
    # Sample plan info
    plan_info = {
        'user_profile': {
            'name': 'Test User',
            'age': 30,
            'gender': 'Male',
            'weight_lbs': 180,
            'height_ft': 5,
            'height_in': 10,
            'activity_level': 'Moderately Active'
        },
        'body_comp_goals': {
            'goal_type': 'Maintain Weight',
            'target_weight_lbs': 180,
            'target_bf': 15
        },
        'diet_preferences': {
            'vegetarian': False,
            'vegan': False,
            'gluten_free': False,
            'dairy_free': False
        },
        'weekly_schedule': {},
        'day_specific_nutrition': {
            'Monday': {
                'calories': 2000,
                'protein': 150,
                'carbs': 200,
                'fat': 70
            }
        }
    }
    
    print("Testing PDF export functionality...")
    
    try:
        # Test PDF generation
        pdf_buffer = export_meal_plan_pdf(sample_meal_plan, plan_info)
        
        if pdf_buffer:
            # Save test PDF
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            filename = f"test_pdf_export_{timestamp}.pdf"
            
            with open(filename, 'wb') as f:
                f.write(pdf_buffer)
            
            print(f"✅ PDF export test SUCCESSFUL!")
            print(f"✅ Test PDF saved as: {filename}")
            print(f"✅ PDF size: {len(pdf_buffer)} bytes")
            
            return True
            
        else:
            print("❌ PDF export test FAILED: No PDF buffer returned")
            return False
            
    except Exception as e:
        print(f"❌ PDF export test FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pdf_export()
    if success:
        print("\n🎉 PDF export functionality is working correctly!")
        print("The full week meal plan PDF export should work properly.")
    else:
        print("\n⚠️ PDF export has issues that need to be fixed.")
    
    sys.exit(0 if success else 1)