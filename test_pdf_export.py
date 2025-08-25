#!/usr/bin/env python3
"""Test script to generate a sample PDF with personalized data"""

import os
import sys
from datetime import datetime
from pdf_export import export_meal_plan_pdf

# Sample personalized meal plan data (realistic values)
sample_meal_plan = {
    'Monday': {
        'meals': [
            {
                'meal_type': 'Meal 1',
                'time': '7:00 AM',
                'context': 'Post-workout breakfast',
                'recipe': {
                    'name': 'Power Oatmeal Bowl',
                    'macros': {'calories': 625, 'protein': 38, 'carbs': 78, 'fat': 18},
                    'ingredients': [
                        {'item': 'Oats', 'amount': '80g'},
                        {'item': 'Whey Protein', 'amount': '30g'},
                        {'item': 'Banana', 'amount': '100g'},
                        {'item': 'Almond Butter', 'amount': '15g'}
                    ],
                    'instructions': [
                        'Cook oats with water',
                        'Mix in protein powder',
                        'Top with sliced banana and almond butter'
                    ]
                }
            },
            {
                'meal_type': 'Meal 2',
                'time': '12:30 PM',
                'context': 'Lunch',
                'recipe': {
                    'name': 'Grilled Chicken Power Bowl',
                    'macros': {'calories': 625, 'protein': 45, 'carbs': 72, 'fat': 16},
                    'ingredients': [
                        {'item': 'Chicken Breast', 'amount': '150g'},
                        {'item': 'Quinoa', 'amount': '100g'},
                        {'item': 'Mixed Vegetables', 'amount': '200g'},
                        {'item': 'Olive Oil', 'amount': '10g'}
                    ],
                    'instructions': [
                        'Grill chicken breast with herbs',
                        'Cook quinoa according to package',
                        'Steam vegetables',
                        'Combine and drizzle with olive oil'
                    ]
                }
            },
            {
                'meal_type': 'Meal 3',
                'time': '6:30 PM',
                'context': 'Dinner',
                'recipe': {
                    'name': 'Salmon with Sweet Potato',
                    'macros': {'calories': 625, 'protein': 42, 'carbs': 65, 'fat': 22},
                    'ingredients': [
                        {'item': 'Salmon Fillet', 'amount': '150g'},
                        {'item': 'Sweet Potato', 'amount': '200g'},
                        {'item': 'Asparagus', 'amount': '150g'},
                        {'item': 'Avocado Oil', 'amount': '10g'}
                    ],
                    'instructions': [
                        'Bake salmon at 375F for 15 minutes',
                        'Roast sweet potato cubes',
                        'Grill asparagus with oil',
                        'Serve together'
                    ]
                }
            },
            {
                'meal_type': 'Snack 1',
                'time': '10:00 AM',
                'context': 'Mid-morning',
                'recipe': {
                    'name': 'Greek Yogurt Parfait',
                    'macros': {'calories': 250, 'protein': 20, 'carbs': 28, 'fat': 8},
                    'ingredients': [
                        {'item': 'Greek Yogurt', 'amount': '200g'},
                        {'item': 'Berries', 'amount': '80g'},
                        {'item': 'Granola', 'amount': '20g'}
                    ],
                    'instructions': ['Layer yogurt with berries and granola']
                }
            },
            {
                'meal_type': 'Snack 2',
                'time': '3:30 PM',
                'context': 'Pre-workout',
                'recipe': {
                    'name': 'Apple with Almond Butter',
                    'macros': {'calories': 253, 'protein': 7, 'carbs': 34, 'fat': 11},
                    'ingredients': [
                        {'item': 'Apple', 'amount': '150g'},
                        {'item': 'Almond Butter', 'amount': '20g'}
                    ],
                    'instructions': ['Slice apple and serve with almond butter']
                }
            }
        ],
        'daily_totals': {'calories': 2378, 'protein': 192, 'carbs': 277, 'fat': 85}
    },
    'Tuesday': {
        'meals': [
            {
                'meal_type': 'Meal 1',
                'time': '7:00 AM',
                'context': 'Breakfast',
                'recipe': {
                    'name': 'Scrambled Eggs & Toast',
                    'macros': {'calories': 688, 'protein': 42, 'carbs': 68, 'fat': 24},
                    'ingredients': [
                        {'item': 'Eggs', 'amount': '3 whole'},
                        {'item': 'Whole Grain Bread', 'amount': '2 slices'},
                        {'item': 'Spinach', 'amount': '100g'},
                        {'item': 'Cheese', 'amount': '30g'}
                    ],
                    'instructions': [
                        'Scramble eggs with spinach',
                        'Add cheese at the end',
                        'Serve with toasted bread'
                    ]
                }
            },
            {
                'meal_type': 'Meal 2',
                'time': '12:30 PM',
                'context': 'Lunch',
                'recipe': {
                    'name': 'Turkey Wrap',
                    'macros': {'calories': 688, 'protein': 48, 'carbs': 75, 'fat': 20},
                    'ingredients': [
                        {'item': 'Turkey Breast', 'amount': '150g'},
                        {'item': 'Whole Wheat Tortilla', 'amount': '1 large'},
                        {'item': 'Lettuce & Tomato', 'amount': '100g'},
                        {'item': 'Hummus', 'amount': '40g'}
                    ],
                    'instructions': [
                        'Spread hummus on tortilla',
                        'Layer turkey and vegetables',
                        'Roll tightly and cut in half'
                    ]
                }
            },
            {
                'meal_type': 'Meal 3',
                'time': '7:00 PM',
                'context': 'Post-workout dinner',
                'recipe': {
                    'name': 'Lean Beef Stir-fry',
                    'macros': {'calories': 688, 'protein': 45, 'carbs': 72, 'fat': 22},
                    'ingredients': [
                        {'item': 'Lean Beef', 'amount': '150g'},
                        {'item': 'Brown Rice', 'amount': '100g'},
                        {'item': 'Mixed Vegetables', 'amount': '200g'},
                        {'item': 'Sesame Oil', 'amount': '10g'}
                    ],
                    'instructions': [
                        'Stir-fry beef until browned',
                        'Add vegetables and cook',
                        'Serve over brown rice'
                    ]
                }
            },
            {
                'meal_type': 'Snack 1',
                'time': '10:00 AM',
                'context': 'Mid-morning',
                'recipe': {
                    'name': 'Protein Shake',
                    'macros': {'calories': 231, 'protein': 25, 'carbs': 20, 'fat': 6},
                    'ingredients': [
                        {'item': 'Protein Powder', 'amount': '1 scoop'},
                        {'item': 'Banana', 'amount': '50g'},
                        {'item': 'Almond Milk', 'amount': '250ml'}
                    ],
                    'instructions': ['Blend all ingredients with ice']
                }
            },
            {
                'meal_type': 'Snack 2',
                'time': '3:30 PM',
                'context': 'Afternoon',
                'recipe': {
                    'name': 'Trail Mix',
                    'macros': {'calories': 231, 'protein': 8, 'carbs': 24, 'fat': 14},
                    'ingredients': [
                        {'item': 'Mixed Nuts', 'amount': '30g'},
                        {'item': 'Dried Fruit', 'amount': '20g'}
                    ],
                    'instructions': ['Mix and enjoy']
                }
            }
        ],
        'daily_totals': {'calories': 2526, 'protein': 213, 'carbs': 259, 'fat': 86}
    }
}

# Add remaining days with similar structure
for day in ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
    sample_meal_plan[day] = sample_meal_plan['Monday']  # Use Monday as template

# Sample plan info with personalized data
sample_plan_info = {
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
        'goal_type': 'Build Muscle',
        'target_weight_lbs': 185,
        'target_bf': 12
    },
    'day_specific_nutrition': {
        'Monday': {'calories': 2378, 'protein': 200, 'carbs': 232, 'fat': 73, 'tdee': 2526},
        'Tuesday': {'calories': 2526, 'protein': 213, 'carbs': 247, 'fat': 78, 'tdee': 2726},
        'Wednesday': {'calories': 2378, 'protein': 200, 'carbs': 232, 'fat': 73, 'tdee': 2526},
        'Thursday': {'calories': 2526, 'protein': 213, 'carbs': 247, 'fat': 78, 'tdee': 2726},
        'Friday': {'calories': 2378, 'protein': 200, 'carbs': 232, 'fat': 73, 'tdee': 2526},
        'Saturday': {'calories': 2300, 'protein': 194, 'carbs': 225, 'fat': 71, 'tdee': 2426},
        'Sunday': {'calories': 2200, 'protein': 185, 'carbs': 215, 'fat': 68, 'tdee': 2326}
    },
    'weekly_schedule': {
        'Monday': {
            'wake_time': '6:00 AM',
            'sleep_time': '10:30 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': [{'type': 'Resistance Training', 'time': '5:30 AM', 'duration': 60}]
        },
        'Tuesday': {
            'wake_time': '6:00 AM',
            'sleep_time': '10:30 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': [{'type': 'Cardio', 'time': '6:00 PM', 'duration': 45}]
        },
        'Wednesday': {
            'wake_time': '6:00 AM',
            'sleep_time': '10:30 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': [{'type': 'Resistance Training', 'time': '5:30 AM', 'duration': 60}]
        },
        'Thursday': {
            'wake_time': '6:00 AM',
            'sleep_time': '10:30 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': [{'type': 'Yoga', 'time': '6:00 PM', 'duration': 30}]
        },
        'Friday': {
            'wake_time': '6:00 AM',
            'sleep_time': '11:00 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': [{'type': 'Resistance Training', 'time': '5:30 AM', 'duration': 60}]
        },
        'Saturday': {
            'wake_time': '7:00 AM',
            'sleep_time': '11:00 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': []
        },
        'Sunday': {
            'wake_time': '7:00 AM',
            'sleep_time': '10:00 PM',
            'meal_count': 3,
            'snack_count': 2,
            'workouts': []
        }
    },
    'diet_preferences': {
        'vegetarian': False,
        'vegan': False,
        'gluten_free': False,
        'dairy_free': False
    }
}

# Generate the PDF
print("Generating sample PDF with personalized data...")
try:
    pdf_buffer = export_meal_plan_pdf(sample_meal_plan, sample_plan_info)
    
    # Save to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"sample_personalized_meal_plan_{timestamp}.pdf"
    
    with open(filename, 'wb') as f:
        if hasattr(pdf_buffer, 'getvalue'):
            f.write(pdf_buffer.getvalue())
        else:
            f.write(pdf_buffer)
    
    print(f"✅ PDF generated successfully: {filename}")
    print("\nThe PDF now shows:")
    print("- Personalized TDEE values (2526, 2726, etc.) instead of generic 2000")
    print("- Your specific macro targets (200g protein on Monday, 213g on Tuesday)")
    print("- Actual workout times and types from your schedule")
    print("- Correct meal/snack distribution based on your preferences")
    
except Exception as e:
    print(f"❌ Error generating PDF: {e}")
    import traceback
    traceback.print_exc()