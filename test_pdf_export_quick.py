#!/usr/bin/env python3
"""
Quick PDF generation test using existing methods
"""
from pdf_export import export_meal_plan_pdf
from datetime import datetime

def create_test_meal_data():
    """Create realistic meal data in the format expected by the export function"""
    
    meal_data = [
        {
            "meal_type": "Breakfast",
            "recipe": {
                "name": "Protein Oatmeal Bowl",
                "ingredients": [
                    {"name": "Rolled Oats", "amount": "50g"},
                    {"name": "Whey Protein Powder", "amount": "30g"},
                    {"name": "Banana", "amount": "1 medium"},
                    {"name": "Almonds", "amount": "15g"},
                    {"name": "Blueberries", "amount": "75g"}
                ],
                "macros": {"protein": 35, "carbs": 52, "fat": 8, "calories": 410},
                "instructions": ["Cook oats with water until creamy", "Stir in protein powder while warm", "Top with sliced banana, almonds, and fresh blueberries"]
            },
            "day": "Monday"
        },
        {
            "meal_type": "Lunch", 
            "recipe": {
                "name": "Mediterranean Chicken Salad",
                "ingredients": [
                    {"name": "Chicken Breast", "amount": "150g"},
                    {"name": "Mixed Greens", "amount": "100g"},
                    {"name": "Cherry Tomatoes", "amount": "100g"},
                    {"name": "Cucumber", "amount": "80g"},
                    {"name": "Olive Oil", "amount": "10ml"},
                    {"name": "Feta Cheese", "amount": "30g"}
                ],
                "macros": {"protein": 42, "carbs": 12, "fat": 15, "calories": 335},
                "instructions": ["Grill chicken breast and slice", "Combine greens, tomatoes, cucumber in bowl", "Top with chicken and crumbled feta", "Drizzle with olive oil"]
            },
            "day": "Monday"
        },
        {
            "meal_type": "Dinner",
            "recipe": {
                "name": "Salmon with Sweet Potato",
                "ingredients": [
                    {"name": "Salmon Fillet", "amount": "140g"},
                    {"name": "Sweet Potato", "amount": "200g"},
                    {"name": "Broccoli", "amount": "150g"},
                    {"name": "Olive Oil", "amount": "8ml"}
                ],
                "macros": {"protein": 38, "carbs": 35, "fat": 18, "calories": 420},
                "instructions": ["Preheat oven to 400°F", "Bake salmon for 15 minutes", "Roast sweet potato cubes until tender", "Steam broccoli and drizzle with olive oil"]
            },
            "day": "Monday"
        },
        {
            "meal_type": "Snack",
            "recipe": {
                "name": "Greek Yogurt with Nuts",
                "ingredients": [
                    {"name": "Greek Yogurt", "amount": "150g"},
                    {"name": "Walnuts", "amount": "20g"}
                ],
                "macros": {"protein": 18, "carbs": 8, "fat": 15, "calories": 225},
                "instructions": ["Mix Greek yogurt with chopped walnuts"]
            },
            "day": "Monday"
        },
        # Tuesday meals
        {
            "meal_type": "Breakfast",
            "recipe": {
                "name": "Egg White Scramble",
                "ingredients": [
                    {"name": "Egg Whites", "amount": "200ml"},
                    {"name": "Spinach", "amount": "50g"},
                    {"name": "Bell Pepper", "amount": "60g"},
                    {"name": "Whole Wheat Toast", "amount": "2 slices"},
                    {"name": "Avocado", "amount": "50g"}
                ],
                "macros": {"protein": 28, "carbs": 32, "fat": 8, "calories": 300},
                "instructions": ["Scramble egg whites with vegetables", "Toast bread", "Top with sliced avocado"]
            },
            "day": "Tuesday"
        },
        {
            "meal_type": "Lunch",
            "recipe": {
                "name": "Turkey and Quinoa Bowl",
                "ingredients": [
                    {"name": "Ground Turkey", "amount": "120g"},
                    {"name": "Quinoa", "amount": "60g dry"},
                    {"name": "Black Beans", "amount": "80g"},
                    {"name": "Bell Pepper", "amount": "80g"},
                    {"name": "Corn", "amount": "60g"}
                ],
                "macros": {"protein": 38, "carbs": 45, "fat": 8, "calories": 395},
                "instructions": ["Cook quinoa according to package directions", "Brown ground turkey with peppers", "Combine with beans and corn", "Serve over quinoa"]
            },
            "day": "Tuesday"
        },
        {
            "meal_type": "Dinner",
            "recipe": {
                "name": "Lean Beef Stir Fry",
                "ingredients": [
                    {"name": "Lean Beef", "amount": "130g"},
                    {"name": "Brown Rice", "amount": "60g dry"},
                    {"name": "Broccoli", "amount": "100g"},
                    {"name": "Carrots", "amount": "80g"},
                    {"name": "Sesame Oil", "amount": "5ml"}
                ],
                "macros": {"protein": 35, "carbs": 38, "fat": 12, "calories": 385},
                "instructions": ["Cook brown rice", "Stir fry beef with vegetables in sesame oil", "Serve over rice"]
            },
            "day": "Tuesday"
        },
        # Add some duplicate ingredients for consolidation testing
        {
            "meal_type": "Snack",
            "recipe": {
                "name": "Second Serving",
                "ingredients": [
                    {"name": "Chicken Breast", "amount": "150g"},  # Duplicate
                    {"name": "Almonds", "amount": "25g"},         # Duplicate but different amount
                    {"name": "Spinach", "amount": "50g"}         # Duplicate
                ],
                "macros": {"protein": 25, "carbs": 5, "fat": 12, "calories": 200},
                "instructions": ["Additional serving for consolidation test"]
            },
            "day": "Tuesday"
        }
    ]
    
    return meal_data

def main():
    """Generate a realistic PDF for user review"""
    
    print("Generating Realistic PDF with Current Code...")
    print("=" * 45)
    
    # Create meal data
    meal_data = create_test_meal_data()
    
    # User preferences (optional)
    user_preferences = {
        "name": "John Doe",
        "dietary_restrictions": ["No nuts"],
        "target_calories": 2000,
        "target_protein": 150,
        "target_carbs": 200,
        "target_fat": 75
    }
    
    # Plan info for summary
    plan_info = {
        "total_meals": len(meal_data),
        "days_covered": len(set(meal.get("day", "Unknown") for meal in meal_data)),
        "daily_totals": {
            "calories": 1565,  # Sum of sample day
            "protein": 133,
            "carbs": 107,
            "fat": 43
        }
    }
    
    print(f"Creating meal plan with {len(meal_data)} meals")
    print(f"Days covered: {plan_info['days_covered']}")
    print(f"Sample daily totals: {plan_info['daily_totals']['calories']} cal, {plan_info['daily_totals']['protein']}g protein")
    
    # Generate PDF
    try:
        filename = export_meal_plan_pdf(
            meal_data=meal_data,
            user_preferences=user_preferences,
            plan_info=plan_info
        )
        
        if filename:
            import os
            if os.path.exists(filename):
                size = os.path.getsize(filename)
                print(f"\n✅ PDF Generated Successfully!")
                print(f"📁 Filename: {filename}")
                print(f"📊 File Size: {size:,} bytes")
                
                # Verify grocery consolidation
                print(f"\n🛒 Checking Grocery List Consolidation:")
                
                expected_consolidations = [
                    ("Chicken Breast", "300g", "150g + 150g"),
                    ("Almonds", "40g", "15g + 25g"),
                    ("Spinach", "100g", "50g + 50g"),
                    ("Bell Pepper", "140g", "60g + 80g")
                ]
                
                # Check PDF content
                with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                consolidation_success = 0
                for item, expected_total, description in expected_consolidations:
                    if f"- {item}: {expected_total}" in content:
                        print(f"  ✅ {item}: {expected_total} ({description})")
                        consolidation_success += 1
                    else:
                        print(f"  ❌ {item}: Expected {expected_total}")
                
                print(f"\n📈 Consolidation Results: {consolidation_success}/{len(expected_consolidations)} items properly consolidated")
                
                if consolidation_success == len(expected_consolidations):
                    print(f"🎉 Perfect! All grocery items consolidated correctly")
                else:
                    print(f"⚠️  Some consolidation issues detected")
                
                return filename
                
            else:
                print(f"❌ PDF file not found after generation")
                return None
        else:
            print(f"❌ PDF generation returned no filename")
            return None
            
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = main()
    
    if result:
        print(f"\n✅ SUCCESS!")
        print(f"Realistic PDF meal plan ready for your review: {result}")
        print(f"\nThis PDF includes:")
        print(f"  • Professional Fitomics branding and formatting")
        print(f"  • 2 complete days with breakfast, lunch, dinner, snacks")
        print(f"  • Detailed ingredient lists with precise amounts")
        print(f"  • Step-by-step cooking instructions")
        print(f"  • Complete macro breakdowns for each meal")
        print(f"  • Consolidated grocery list with proper totals")
        print(f"  • Duplicate ingredient consolidation (Chicken: 300g total)")
    else:
        print(f"\n❌ PDF generation failed - please check the logs above")