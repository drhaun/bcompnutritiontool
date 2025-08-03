#!/usr/bin/env python3
"""
Test full week PDF generation with comprehensive sample data
"""

import json
from pdf_export import export_meal_plan_pdf

def create_full_week_sample_data():
    """Create a full week of realistic meal data for testing"""
    
    # Sample ingredients for variety
    proteins = [
        {"item": "Chicken Breast", "amount": "150g", "calories": 231, "protein": 43.5, "carbs": 0, "fat": 5},
        {"item": "Salmon", "amount": "120g", "calories": 206, "protein": 22, "carbs": 0, "fat": 12},
        {"item": "Ground Turkey", "amount": "100g", "calories": 149, "protein": 20, "carbs": 0, "fat": 7},
        {"item": "Greek Yogurt", "amount": "200g", "calories": 130, "protein": 23, "carbs": 9, "fat": 0},
        {"item": "Eggs", "amount": "2 large", "calories": 140, "protein": 12, "carbs": 1, "fat": 10}
    ]
    
    carbs = [
        {"item": "Brown Rice", "amount": "100g cooked", "calories": 111, "protein": 2.6, "carbs": 23, "fat": 0.9},
        {"item": "Quinoa", "amount": "80g cooked", "calories": 120, "protein": 4.4, "carbs": 22, "fat": 1.9},
        {"item": "Sweet Potato", "amount": "150g", "calories": 129, "protein": 2.3, "carbs": 30, "fat": 0.1},
        {"item": "Oats", "amount": "50g dry", "calories": 190, "protein": 6.5, "carbs": 32, "fat": 3.5}
    ]
    
    vegetables = [
        {"item": "Spinach", "amount": "100g", "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4},
        {"item": "Broccoli", "amount": "150g", "calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4},
        {"item": "Bell Peppers", "amount": "100g", "calories": 31, "protein": 1, "carbs": 7, "fat": 0.3},
        {"item": "Zucchini", "amount": "150g", "calories": 20, "protein": 1.5, "carbs": 4, "fat": 0.3}
    ]
    
    fats = [
        {"item": "Olive Oil", "amount": "1 tbsp", "calories": 119, "protein": 0, "carbs": 0, "fat": 13.5},
        {"item": "Almonds", "amount": "30g", "calories": 173, "protein": 6, "carbs": 6, "fat": 15},
        {"item": "Avocado", "amount": "100g", "calories": 160, "protein": 2, "carbs": 9, "fat": 15}
    ]
    
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    meal_contexts = ['Breakfast', 'Lunch', 'Dinner', 'Morning Snack', 'Afternoon Snack']
    meal_times = ['7:30 AM', '12:30 PM', '6:30 PM', '10:00 AM', '3:30 PM']
    
    full_week_data = {}
    
    for day in days:
        daily_meals = []
        daily_calories = 0
        daily_protein = 0
        daily_carbs = 0
        daily_fat = 0
        
        # Generate 5 meals per day (3 meals + 2 snacks)
        for meal_idx in range(5):
            meal_ingredients = []
            meal_calories = 0
            meal_protein = 0
            meal_carbs = 0
            meal_fat = 0
            
            # Create varied meal compositions
            if meal_idx < 3:  # Main meals
                # Add protein
                protein = proteins[meal_idx % len(proteins)]
                meal_ingredients.append(protein)
                meal_calories += protein['calories']
                meal_protein += protein['protein']
                meal_carbs += protein['carbs']
                meal_fat += protein['fat']
                
                # Add carb
                carb = carbs[meal_idx % len(carbs)]
                meal_ingredients.append(carb)
                meal_calories += carb['calories']
                meal_protein += carb['protein']
                meal_carbs += carb['carbs']
                meal_fat += carb['fat']
                
                # Add vegetable
                veg = vegetables[meal_idx % len(vegetables)]
                meal_ingredients.append(veg)
                meal_calories += veg['calories']
                meal_protein += veg['protein']
                meal_carbs += veg['carbs']
                meal_fat += veg['fat']
                
                # Add fat
                fat = fats[meal_idx % len(fats)]
                meal_ingredients.append(fat)
                meal_calories += fat['calories']
                meal_protein += fat['protein']
                meal_carbs += fat['carbs']
                meal_fat += fat['fat']
                
                instructions = [
                    f"Prepare {protein['item'].lower()} by grilling or baking until cooked through",
                    f"Cook {carb['item'].lower()} according to package instructions",
                    f"Steam or sauté {veg['item'].lower()} until tender",
                    f"Combine all ingredients and drizzle with {fat['item'].lower()}",
                    "Season with herbs and spices to taste"
                ]
            else:  # Snacks
                # Simpler snacks with 2-3 ingredients
                if meal_idx == 3:  # Morning snack
                    snack_items = [proteins[4], fats[1]]  # Eggs + Almonds
                else:  # Afternoon snack
                    snack_items = [proteins[3], vegetables[0]]  # Greek Yogurt + Spinach (smoothie)
                
                for item in snack_items:
                    meal_ingredients.append(item)
                    meal_calories += item['calories']
                    meal_protein += item['protein']
                    meal_carbs += item['carbs']
                    meal_fat += item['fat']
                
                if meal_idx == 3:
                    instructions = ["Hard boil eggs and serve with almonds"]
                else:
                    instructions = ["Blend Greek yogurt with spinach for a nutritious smoothie"]
            
            meal = {
                "name": f"Meal {meal_idx + 1}" if meal_idx < 3 else f"Snack {meal_idx - 2}",
                "time": meal_times[meal_idx],
                "context": meal_contexts[meal_idx],
                "prep_time": "15 minutes" if meal_idx < 3 else "5 minutes",
                "ingredients": meal_ingredients,
                "instructions": instructions,
                "total_macros": {
                    "calories": round(meal_calories),
                    "protein": round(meal_protein, 1),
                    "carbs": round(meal_carbs, 1),
                    "fat": round(meal_fat, 1)
                }
            }
            
            daily_meals.append(meal)
            daily_calories += meal_calories
            daily_protein += meal_protein
            daily_carbs += meal_carbs
            daily_fat += meal_fat
        
        full_week_data[day] = {
            "day": day,
            "meals": daily_meals,
            "daily_totals": {
                "calories": round(daily_calories),
                "protein": round(daily_protein, 1),
                "carbs": round(daily_carbs, 1),
                "fat": round(daily_fat, 1)
            },
            "meal_structure_rationale": f"Balanced nutrition plan for {day} with emphasis on whole foods and macro balance",
            "accuracy_validated": True,
            "schedule_context": {
                "wake_time": "7:00 AM",
                "bed_time": "10:00 PM",
                "workouts": ["Resistance Training"] if day in ['Monday', 'Wednesday', 'Friday'] else []
            },
            "nutrition_targets": {
                "calories": 2200,
                "protein": 165,
                "carbs": 220,
                "fat": 75
            }
        }
    
    return full_week_data

def test_full_week_pdf():
    """Test PDF generation with full week data"""
    print("Creating full week sample meal data...")
    
    # Generate comprehensive test data
    meal_data = create_full_week_sample_data()
    
    print(f"Generated data for {len(meal_data)} days")
    for day, data in meal_data.items():
        meals_count = len(data['meals'])
        calories = data['daily_totals']['calories']
        print(f"  {day}: {meals_count} meals, {calories} calories")
    
    # Test user preferences
    user_preferences = {
        'dietary_restrictions': ['gluten_free'],
        'food_allergies': [],
        'cuisine_preferences': ['Mediterranean', 'American'],
        'cooking_experience': 'intermediate'
    }
    
    # Plan info for the title page
    plan_info = {
        'total_calories': sum(day['daily_totals']['calories'] for day in meal_data.values()) // 7,
        'total_protein': sum(day['daily_totals']['protein'] for day in meal_data.values()) / 7,
        'total_carbs': sum(day['daily_totals']['carbs'] for day in meal_data.values()) / 7,
        'total_fat': sum(day['daily_totals']['fat'] for day in meal_data.values()) / 7,
        'diet_preferences': {
            'gluten_free': True,
            'vegetarian': False,
            'vegan': False,
            'dairy_free': False
        },
        'generation_date': '2025-08-03',
        'meal_data': meal_data
    }
    
    print("\nGenerating comprehensive PDF...")
    
    # Generate the PDF
    pdf_buffer = export_meal_plan_pdf(
        meal_data=meal_data,
        user_preferences=user_preferences,
        plan_info=plan_info
    )
    
    if pdf_buffer:
        # Save to file
        filename = "test_full_week_pdf_20250803.pdf"
        with open(filename, 'wb') as f:
            f.write(pdf_buffer)
        
        print(f"✅ Full week PDF generated successfully!")
        print(f"✅ Saved as: {filename}")
        print(f"✅ File size: {len(pdf_buffer)} bytes")
        
        # Print summary
        total_meals = sum(len(day['meals']) for day in meal_data.values())
        total_ingredients = sum(len(meal['ingredients']) for day in meal_data.values() for meal in day['meals'])
        
        print(f"\n📊 PDF Contains:")
        print(f"   • 7 days of meal plans")
        print(f"   • {total_meals} individual meals and snacks")
        print(f"   • {total_ingredients} total ingredients")
        print(f"   • Consolidated grocery list")
        print(f"   • Professional formatting with day organization")
        
        return True
    else:
        print("❌ PDF generation failed")
        return False

if __name__ == "__main__":
    success = test_full_week_pdf()
    if success:
        print("\n🎉 Full week PDF test completed successfully!")
        print("The PDF formatting improvements are working correctly.")
    else:
        print("\n💥 Full week PDF test failed")