#!/usr/bin/env python3
"""
Generate a realistic meal plan PDF to demonstrate proper grocery consolidation
"""
import json
from pdf_export import FitomicsPDF
import os
from datetime import datetime

def create_realistic_week_plan():
    """Create a realistic 7-day meal plan with repeated ingredients to test consolidation"""
    
    # Common ingredients that appear multiple times across the week
    meal_plan = {
        "Monday": {
            "day": "Monday",
            "meals": [
                {
                    "name": "Meal 1",
                    "time": "7:00 AM",
                    "context": "Breakfast",
                    "prep_time": "10 minutes",
                    "ingredients": [
                        {"item": "Eggs", "amount": "3 large", "calories": 210, "protein": 18, "carbs": 1, "fat": 14},
                        {"item": "Spinach", "amount": "50g", "calories": 12, "protein": 1.5, "carbs": 1.8, "fat": 0.2},
                        {"item": "Olive Oil", "amount": "1 tbsp", "calories": 120, "protein": 0, "carbs": 0, "fat": 14},
                        {"item": "Avocado", "amount": "100g", "calories": 160, "protein": 2, "carbs": 9, "fat": 15}
                    ],
                    "instructions": ["Beat eggs and scramble with spinach", "Cook in olive oil", "Serve with sliced avocado"],
                    "total_macros": {"calories": 502, "protein": 21.5, "carbs": 11.8, "fat": 43.2}
                },
                {
                    "name": "Meal 2",
                    "time": "12:30 PM",
                    "context": "Lunch",
                    "prep_time": "20 minutes",
                    "ingredients": [
                        {"item": "Chicken Breast", "amount": "150g", "calories": 231, "protein": 43.5, "carbs": 0, "fat": 5},
                        {"item": "Sweet Potato", "amount": "200g", "calories": 172, "protein": 3, "carbs": 40, "fat": 0.2},
                        {"item": "Broccoli", "amount": "150g", "calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4}
                    ],
                    "instructions": ["Grill chicken breast until cooked through", "Roast sweet potato at 400°F for 25 mins", "Steam broccoli until tender"],
                    "total_macros": {"calories": 437, "protein": 49.3, "carbs": 47, "fat": 5.6}
                },
                {
                    "name": "Meal 3",
                    "time": "6:30 PM",
                    "context": "Dinner",
                    "prep_time": "25 minutes",
                    "ingredients": [
                        {"item": "Salmon", "amount": "120g", "calories": 206, "protein": 22, "carbs": 0, "fat": 12},
                        {"item": "Brown Rice", "amount": "150g cooked", "calories": 167, "protein": 4, "carbs": 34, "fat": 1.4},
                        {"item": "Asparagus", "amount": "100g", "calories": 20, "protein": 2.2, "carbs": 4, "fat": 0.1}
                    ],
                    "instructions": ["Pan-sear salmon with lemon", "Cook brown rice according to package directions", "Roast asparagus with garlic"],
                    "total_macros": {"calories": 393, "protein": 28.2, "carbs": 38, "fat": 13.5}
                },
                {
                    "name": "Snack 1",
                    "time": "10:00 AM",
                    "context": "Morning Snack",
                    "prep_time": "2 minutes",
                    "ingredients": [
                        {"item": "Greek Yogurt", "amount": "150g", "calories": 100, "protein": 18, "carbs": 9, "fat": 0},
                        {"item": "Almonds", "amount": "25g", "calories": 145, "protein": 5, "carbs": 5, "fat": 13}
                    ],
                    "instructions": ["Mix yogurt with almonds"],
                    "total_macros": {"calories": 245, "protein": 23, "carbs": 14, "fat": 13}
                },
                {
                    "name": "Snack 2",
                    "time": "3:30 PM",
                    "context": "Afternoon Snack",
                    "prep_time": "5 minutes",
                    "ingredients": [
                        {"item": "Apple", "amount": "1 medium", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3},
                        {"item": "Almond Butter", "amount": "2 tbsp", "calories": 190, "protein": 8, "carbs": 7, "fat": 18}
                    ],
                    "instructions": ["Slice apple and serve with almond butter"],
                    "total_macros": {"calories": 285, "protein": 8.5, "carbs": 32, "fat": 18.3}
                }
            ]
        },
        "Tuesday": {
            "day": "Tuesday",
            "meals": [
                {
                    "name": "Meal 1",
                    "time": "7:00 AM",
                    "context": "Breakfast",
                    "prep_time": "10 minutes",
                    "ingredients": [
                        {"item": "Eggs", "amount": "3 large", "calories": 210, "protein": 18, "carbs": 1, "fat": 14},
                        {"item": "Spinach", "amount": "50g", "calories": 12, "protein": 1.5, "carbs": 1.8, "fat": 0.2},
                        {"item": "Olive Oil", "amount": "1 tbsp", "calories": 120, "protein": 0, "carbs": 0, "fat": 14}
                    ],
                    "instructions": ["Make spinach omelet with olive oil"],
                    "total_macros": {"calories": 342, "protein": 19.5, "carbs": 2.8, "fat": 28.2}
                },
                {
                    "name": "Meal 2",
                    "time": "12:30 PM",
                    "context": "Lunch",
                    "prep_time": "20 minutes",
                    "ingredients": [
                        {"item": "Chicken Breast", "amount": "150g", "calories": 231, "protein": 43.5, "carbs": 0, "fat": 5},
                        {"item": "Brown Rice", "amount": "150g cooked", "calories": 167, "protein": 4, "carbs": 34, "fat": 1.4},
                        {"item": "Bell Peppers", "amount": "100g", "calories": 31, "protein": 1, "carbs": 7, "fat": 0.3}
                    ],
                    "instructions": ["Grill chicken and serve over rice with peppers"],
                    "total_macros": {"calories": 429, "protein": 48.5, "carbs": 41, "fat": 6.7}
                },
                {
                    "name": "Meal 3",
                    "time": "6:30 PM",
                    "context": "Dinner",
                    "prep_time": "25 minutes",
                    "ingredients": [
                        {"item": "Ground Turkey", "amount": "120g", "calories": 179, "protein": 24, "carbs": 0, "fat": 8},
                        {"item": "Sweet Potato", "amount": "200g", "calories": 172, "protein": 3, "carbs": 40, "fat": 0.2},
                        {"item": "Broccoli", "amount": "150g", "calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4}
                    ],
                    "instructions": ["Cook turkey meatballs", "Roast sweet potato", "Steam broccoli"],
                    "total_macros": {"calories": 385, "protein": 29.8, "carbs": 47, "fat": 8.6}
                },
                {
                    "name": "Snack 1",
                    "time": "10:00 AM",
                    "context": "Morning Snack",
                    "prep_time": "2 minutes",
                    "ingredients": [
                        {"item": "Greek Yogurt", "amount": "150g", "calories": 100, "protein": 18, "carbs": 9, "fat": 0},
                        {"item": "Blueberries", "amount": "100g", "calories": 57, "protein": 0.7, "carbs": 14, "fat": 0.3}
                    ],
                    "instructions": ["Mix yogurt with fresh blueberries"],
                    "total_macros": {"calories": 157, "protein": 18.7, "carbs": 23, "fat": 0.3}
                },
                {
                    "name": "Snack 2",
                    "time": "3:30 PM",
                    "context": "Afternoon Snack",
                    "prep_time": "2 minutes",
                    "ingredients": [
                        {"item": "Almonds", "amount": "25g", "calories": 145, "protein": 5, "carbs": 5, "fat": 13}
                    ],
                    "instructions": ["Enjoy handful of almonds"],
                    "total_macros": {"calories": 145, "protein": 5, "carbs": 5, "fat": 13}
                }
            ]
        },
        "Wednesday": {
            "day": "Wednesday",
            "meals": [
                {
                    "name": "Meal 1",
                    "time": "7:00 AM",
                    "context": "Breakfast",
                    "prep_time": "15 minutes",
                    "ingredients": [
                        {"item": "Oats", "amount": "50g", "calories": 190, "protein": 6.5, "carbs": 32, "fat": 3.5},
                        {"item": "Greek Yogurt", "amount": "100g", "calories": 67, "protein": 12, "carbs": 6, "fat": 0},
                        {"item": "Blueberries", "amount": "100g", "calories": 57, "protein": 0.7, "carbs": 14, "fat": 0.3},
                        {"item": "Almonds", "amount": "15g", "calories": 87, "protein": 3, "carbs": 3, "fat": 8}
                    ],
                    "instructions": ["Cook oats with water", "Top with yogurt, berries, and sliced almonds"],
                    "total_macros": {"calories": 401, "protein": 22.2, "carbs": 55, "fat": 11.8}
                },
                {
                    "name": "Meal 2",
                    "time": "12:30 PM",
                    "context": "Lunch",
                    "prep_time": "20 minutes",
                    "ingredients": [
                        {"item": "Salmon", "amount": "120g", "calories": 206, "protein": 22, "carbs": 0, "fat": 12},
                        {"item": "Quinoa", "amount": "150g cooked", "calories": 180, "protein": 6.6, "carbs": 33, "fat": 2.8},
                        {"item": "Asparagus", "amount": "100g", "calories": 20, "protein": 2.2, "carbs": 4, "fat": 0.1}
                    ],
                    "instructions": ["Bake salmon with herbs", "Prepare quinoa", "Grill asparagus"],
                    "total_macros": {"calories": 406, "protein": 30.8, "carbs": 37, "fat": 14.9}
                },
                {
                    "name": "Meal 3",
                    "time": "6:30 PM",
                    "context": "Dinner",
                    "prep_time": "25 minutes",
                    "ingredients": [
                        {"item": "Chicken Breast", "amount": "150g", "calories": 231, "protein": 43.5, "carbs": 0, "fat": 5},
                        {"item": "Sweet Potato", "amount": "150g", "calories": 129, "protein": 2.3, "carbs": 30, "fat": 0.1},
                        {"item": "Spinach", "amount": "100g", "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4},
                        {"item": "Olive Oil", "amount": "1 tbsp", "calories": 120, "protein": 0, "carbs": 0, "fat": 14}
                    ],
                    "instructions": ["Grill chicken breast", "Roast sweet potato", "Sauté spinach in olive oil"],
                    "total_macros": {"calories": 503, "protein": 48.7, "carbs": 33.6, "fat": 19.5}
                },
                {
                    "name": "Snack 1",
                    "time": "10:00 AM",
                    "context": "Morning Snack",
                    "prep_time": "2 minutes",
                    "ingredients": [
                        {"item": "Apple", "amount": "1 medium", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3}
                    ],
                    "instructions": ["Fresh apple"],
                    "total_macros": {"calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3}
                },
                {
                    "name": "Snack 2",
                    "time": "3:30 PM",
                    "context": "Afternoon Snack",
                    "prep_time": "5 minutes",
                    "ingredients": [
                        {"item": "Eggs", "amount": "2 large", "calories": 140, "protein": 12, "carbs": 1, "fat": 10},
                        {"item": "Avocado", "amount": "50g", "calories": 80, "protein": 1, "carbs": 4.5, "fat": 7.5}
                    ],
                    "instructions": ["Hard boil eggs", "Serve with sliced avocado"],
                    "total_macros": {"calories": 220, "protein": 13, "carbs": 5.5, "fat": 17.5}
                }
            ]
        }
    }
    
    # Add 4 more days with similar patterns to show real consolidation
    for day_name in ["Thursday", "Friday", "Saturday", "Sunday"]:
        meal_plan[day_name] = {
            "day": day_name,
            "meals": [
                {
                    "name": "Meal 1",
                    "time": "7:00 AM",
                    "context": "Breakfast",
                    "prep_time": "10 minutes",
                    "ingredients": [
                        {"item": "Eggs", "amount": "2 large", "calories": 140, "protein": 12, "carbs": 1, "fat": 10},
                        {"item": "Spinach", "amount": "50g", "calories": 12, "protein": 1.5, "carbs": 1.8, "fat": 0.2},
                        {"item": "Olive Oil", "amount": "1 tbsp", "calories": 120, "protein": 0, "carbs": 0, "fat": 14}
                    ],
                    "instructions": ["Scramble eggs with spinach in olive oil"],
                    "total_macros": {"calories": 272, "protein": 13.5, "carbs": 2.8, "fat": 24.2}
                },
                {
                    "name": "Meal 2",
                    "time": "12:30 PM",
                    "context": "Lunch",
                    "prep_time": "20 minutes",
                    "ingredients": [
                        {"item": "Chicken Breast", "amount": "120g", "calories": 185, "protein": 35, "carbs": 0, "fat": 4},
                        {"item": "Brown Rice", "amount": "100g cooked", "calories": 111, "protein": 2.6, "carbs": 23, "fat": 0.9},
                        {"item": "Broccoli", "amount": "100g", "calories": 23, "protein": 1.9, "carbs": 4.7, "fat": 0.3}
                    ],
                    "instructions": ["Grill chicken", "Serve with rice and steamed broccoli"],
                    "total_macros": {"calories": 319, "protein": 39.5, "carbs": 27.7, "fat": 5.2}
                },
                {
                    "name": "Meal 3", 
                    "time": "6:30 PM",
                    "context": "Dinner",
                    "prep_time": "25 minutes",
                    "ingredients": [
                        {"item": "Salmon", "amount": "100g", "calories": 172, "protein": 18, "carbs": 0, "fat": 10},
                        {"item": "Sweet Potato", "amount": "150g", "calories": 129, "protein": 2.3, "carbs": 30, "fat": 0.1},
                        {"item": "Asparagus", "amount": "100g", "calories": 20, "protein": 2.2, "carbs": 4, "fat": 0.1}
                    ],
                    "instructions": ["Bake salmon", "Roast sweet potato", "Grill asparagus"],
                    "total_macros": {"calories": 321, "protein": 22.5, "carbs": 34, "fat": 10.2}
                },
                {
                    "name": "Snack 1",
                    "time": "10:00 AM", 
                    "context": "Morning Snack",
                    "prep_time": "2 minutes",
                    "ingredients": [
                        {"item": "Greek Yogurt", "amount": "100g", "calories": 67, "protein": 12, "carbs": 6, "fat": 0},
                        {"item": "Almonds", "amount": "20g", "calories": 116, "protein": 4, "carbs": 4, "fat": 10}
                    ],
                    "instructions": ["Mix yogurt with chopped almonds"],
                    "total_macros": {"calories": 183, "protein": 16, "carbs": 10, "fat": 10}
                },
                {
                    "name": "Snack 2",
                    "time": "3:30 PM",
                    "context": "Afternoon Snack", 
                    "prep_time": "2 minutes",
                    "ingredients": [
                        {"item": "Apple", "amount": "1 medium", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3},
                        {"item": "Almond Butter", "amount": "1 tbsp", "calories": 95, "protein": 4, "carbs": 3.5, "fat": 9}
                    ],
                    "instructions": ["Slice apple and serve with almond butter"],
                    "total_macros": {"calories": 190, "protein": 4.5, "carbs": 28.5, "fat": 9.3}
                }
            ]
        }
    
    return meal_plan

def main():
    """Generate the realistic meal plan PDF"""
    print("🍎 Creating Realistic 7-Day Meal Plan PDF...")
    print("This will demonstrate proper grocery list consolidation")
    
    # Create meal plan
    meal_plan = create_realistic_week_plan()
    
    # Calculate totals
    total_days = len(meal_plan)
    total_meals = sum(len(day["meals"]) for day in meal_plan.values())
    
    print(f"📊 Plan Details:")
    print(f"   • {total_days} days")
    print(f"   • {total_meals} total meals")
    
    # Show expected consolidation for key ingredients
    expected_totals = {
        "Eggs": "17 large (3+3+2+2+2+2+2 from different meals)",
        "Chicken Breast": "690g (150+150+150+120+120+120+120)",
        "Sweet Potato": "950g (200+200+150+150+150+150+150)", 
        "Spinach": "350g (50×7 days)",
        "Greek Yogurt": "650g (150+150+100+100+100+100+100)",
        "Almonds": "130g (25+25+15+20+20+20+20)",
        "Olive Oil": "7 tbsp (1×7 days)"
    }
    
    print(f"\n🧮 Expected Consolidation Examples:")
    for item, total in expected_totals.items():
        print(f"   • {item}: {total}")
    
    # Generate PDF
    try:
        filename = "realistic_meal_plan_demo_20250803.pdf"
        
        # Extract all ingredients for grocery list
        all_ingredients = []
        for day_data in meal_plan.values():
            for meal in day_data["meals"]:
                for ingredient in meal["ingredients"]:
                    all_ingredients.append({
                        "name": ingredient["item"],
                        "amount": ingredient["amount"]
                    })
        
        # Create PDF
        pdf = FitomicsPDF()
        
        # Add cover page
        pdf.add_page()
        pdf.set_font('Arial', 'B', 24)
        pdf.set_text_color(41, 84, 144)
        pdf.cell(0, 20, 'FITOMICS AI MEAL PLAN', 0, 1, 'C')
        pdf.ln(10)
        
        pdf.set_font('Arial', '', 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 8, f'Generated: {datetime.now().strftime("%B %d, %Y")}', 0, 1, 'L')
        pdf.cell(0, 8, f'Dietary Preferences: Gluten-Free, High Protein', 0, 1, 'L')
        pdf.ln(10)
        
        # Add each day's meals
        for day_name, day_data in meal_plan.items():
            # Add day header
            pdf.add_page()
            pdf.set_font('Arial', 'B', 18)
            pdf.set_text_color(41, 84, 144)
            pdf.cell(0, 12, day_name.upper(), 0, 1, 'L')
            pdf.ln(5)
            
            # Add each meal for this day
            for meal in day_data["meals"]:
                meal_title = f"{day_name.upper()} - {meal['name'].upper()}"
                pdf.add_meal_section(
                    meal_type=meal_title,
                    recipe={
                        'instructions': meal.get('instructions', []),
                        'prep_time': meal.get('prep_time', '')
                    },
                    macros=meal.get('total_macros', {}),
                    ingredients=meal.get('ingredients', []),
                    meal_context=meal.get('context', ''),
                    meal_time=meal.get('time', '')
                )
        
        # Add grocery list
        pdf.add_grocery_list(all_ingredients)
        
        # Save PDF
        pdf.output(filename)
        
        print(f"   📄 PDF saved as: {filename}")
        print(f"   📊 Total ingredients processed: {len(all_ingredients)}")
        
        print(f"\n✅ PDF generated successfully!")
        print(f"📄 Filename: {filename}")
        print(f"\n🎯 What to Check in the PDF:")
        print(f"   1. Each day clearly labeled (MONDAY, TUESDAY, etc.)")
        print(f"   2. Meals named consistently (MONDAY - MEAL 1, etc.)")
        print(f"   3. Instructions display completely without cutoff")
        print(f"   4. Consolidated grocery list shows correct totals:")
        print(f"      • Eggs should total 17 large")
        print(f"      • Chicken Breast should total 690g")
        print(f"      • Sweet Potato should total 950g")
        print(f"      • All ingredients properly summed across 7 days")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print(f"\n🎉 Demo PDF ready for review!")
    else:
        print(f"\n💥 PDF generation failed")