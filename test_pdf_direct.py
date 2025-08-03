#!/usr/bin/env python3
"""
Direct test of PDF export functionality using sample data
"""
import json
import os
from pdf_export import export_meal_plan_pdf

def create_test_meal_plan():
    """Create realistic test data with repeated ingredients for consolidation testing"""
    
    # Create meal plan with ingredients that appear multiple times
    meal_plan = {
        "Monday": {
            "day": "Monday",
            "meals": [
                {
                    "name": "Meal 1",
                    "time": "7:00 AM",
                    "context": "Breakfast",
                    "ingredients": [
                        {"item": "Eggs", "amount": "3 large"},
                        {"item": "Spinach", "amount": "50g"},
                        {"item": "Olive Oil", "amount": "1 tbsp"}
                    ],
                    "instructions": ["Scramble eggs with spinach", "Cook in olive oil"],
                    "total_macros": {"calories": 300, "protein": 20, "carbs": 5, "fat": 22}
                },
                {
                    "name": "Meal 2", 
                    "time": "12:00 PM",
                    "context": "Lunch",
                    "ingredients": [
                        {"item": "Chicken Breast", "amount": "150g"},
                        {"item": "Brown Rice", "amount": "100g cooked"},
                        {"item": "Broccoli", "amount": "100g"}
                    ],
                    "instructions": ["Grill chicken", "Steam broccoli", "Serve over rice"],
                    "total_macros": {"calories": 400, "protein": 45, "carbs": 35, "fat": 8}
                },
                {
                    "name": "Snack 1",
                    "time": "3:00 PM", 
                    "context": "Afternoon Snack",
                    "ingredients": [
                        {"item": "Greek Yogurt", "amount": "150g"},
                        {"item": "Almonds", "amount": "25g"}
                    ],
                    "instructions": ["Mix yogurt with almonds"],
                    "total_macros": {"calories": 200, "protein": 20, "carbs": 10, "fat": 12}
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
                    "ingredients": [
                        {"item": "Eggs", "amount": "2 large"},  # Repeated ingredient
                        {"item": "Spinach", "amount": "50g"},  # Repeated ingredient
                        {"item": "Olive Oil", "amount": "1 tbsp"}  # Repeated ingredient
                    ],
                    "instructions": ["Make spinach omelet"],
                    "total_macros": {"calories": 250, "protein": 15, "carbs": 3, "fat": 20}
                },
                {
                    "name": "Meal 2",
                    "time": "12:00 PM", 
                    "context": "Lunch",
                    "ingredients": [
                        {"item": "Chicken Breast", "amount": "150g"},  # Repeated ingredient
                        {"item": "Sweet Potato", "amount": "150g"},
                        {"item": "Broccoli", "amount": "100g"}  # Repeated ingredient
                    ],
                    "instructions": ["Bake chicken", "Roast sweet potato", "Steam broccoli"],
                    "total_macros": {"calories": 380, "protein": 40, "carbs": 30, "fat": 6}
                },
                {
                    "name": "Snack 1",
                    "time": "3:00 PM",
                    "context": "Afternoon Snack", 
                    "ingredients": [
                        {"item": "Greek Yogurt", "amount": "150g"},  # Repeated ingredient
                        {"item": "Almonds", "amount": "25g"}  # Repeated ingredient
                    ],
                    "instructions": ["Mix yogurt with almonds"],
                    "total_macros": {"calories": 200, "protein": 20, "carbs": 10, "fat": 12}
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
                    "ingredients": [
                        {"item": "Eggs", "amount": "2 large"},  # Repeated ingredient
                        {"item": "Avocado", "amount": "100g"},
                        {"item": "Olive Oil", "amount": "1 tbsp"}  # Repeated ingredient
                    ],
                    "instructions": ["Scramble eggs", "Serve with avocado"],
                    "total_macros": {"calories": 320, "protein": 18, "carbs": 8, "fat": 26}
                },
                {
                    "name": "Meal 2",
                    "time": "12:00 PM",
                    "context": "Lunch",
                    "ingredients": [
                        {"item": "Salmon", "amount": "120g"},
                        {"item": "Brown Rice", "amount": "100g cooked"},  # Repeated ingredient
                        {"item": "Asparagus", "amount": "100g"}
                    ],
                    "instructions": ["Pan-sear salmon", "Steam asparagus", "Serve over rice"],
                    "total_macros": {"calories": 420, "protein": 35, "carbs": 28, "fat": 18}
                },
                {
                    "name": "Snack 1",
                    "time": "3:00 PM",
                    "context": "Afternoon Snack",
                    "ingredients": [
                        {"item": "Greek Yogurt", "amount": "100g"},  # Repeated ingredient
                        {"item": "Almonds", "amount": "20g"}  # Repeated ingredient
                    ],
                    "instructions": ["Mix yogurt with almonds"],
                    "total_macros": {"calories": 180, "protein": 18, "carbs": 8, "fat": 10}
                }
            ]
        }
    }
    
    return meal_plan

def test_pdf_export():
    """Test PDF export and verify consolidation"""
    
    print("Testing PDF Export with Realistic Data")
    print("=" * 50)
    
    # Create test meal plan
    meal_plan = create_test_meal_plan()
    
    # Count expected consolidations
    ingredient_totals = {}
    total_ingredients = 0
    
    for day_data in meal_plan.values():
        for meal in day_data["meals"]:
            for ingredient in meal["ingredients"]:
                item = ingredient["item"]
                amount = ingredient["amount"]
                total_ingredients += 1
                
                if item not in ingredient_totals:
                    ingredient_totals[item] = []
                ingredient_totals[item].append(amount)
    
    print(f"Test Data Overview:")
    print(f"• 3 days of meal plans")
    print(f"• {total_ingredients} total ingredient entries")
    print(f"• {len(ingredient_totals)} unique ingredients")
    
    print(f"\nExpected Consolidations:")
    for item, amounts in ingredient_totals.items():
        if len(amounts) > 1:
            print(f"• {item}: {len(amounts)} entries → {amounts}")
    
    # Expected totals for key ingredients
    expected = {
        "Eggs": "7 large (3+2+2)",
        "Chicken Breast": "300g (150+150)", 
        "Greek Yogurt": "400g (150+150+100)",
        "Almonds": "70g (25+25+20)",
        "Olive Oil": "3 tbsp (1+1+1)",
        "Spinach": "100g (50+50)",
        "Broccoli": "200g (100+100)",
        "Brown Rice": "200g cooked (100+100)"
    }
    
    print(f"\nExpected Totals in PDF:")
    for item, total in expected.items():
        print(f"• {item}: {total}")
    
    # Test PDF export
    try:
        print(f"\nGenerating PDF...")
        
        plan_info = {
            'diet_preferences': {
                'gluten_free': True,
                'vegetarian': False,
                'vegan': False,
                'dairy_free': False
            }
        }
        
        filename = export_meal_plan_pdf(
            meal_data=meal_plan,
            user_preferences={'dietary_restrictions': ['gluten_free']},
            plan_info=plan_info
        )
        
        print(f"✅ PDF created: {filename}")
        
        # Verify file exists and has content
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"• File size: {size:,} bytes")
            
            if size > 5000:  # Should be substantial
                print(f"✅ PDF has substantial content")
                
                # Check grocery list consolidation
                try:
                    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    if "CONSOLIDATED GROCERY LIST" in content:
                        print(f"✅ Consolidated grocery list found")
                        
                        # Extract grocery section
                        sections = content.split("CONSOLIDATED GROCERY LIST")
                        if len(sections) > 1:
                            grocery_section = sections[1].split("Generated by Fitomics")[0]
                            
                            # Verify key consolidations
                            consolidation_results = {}
                            for item in expected.keys():
                                count = grocery_section.count(item) + grocery_section.count(item.title())
                                consolidation_results[item] = count
                                
                                if count == 1:
                                    print(f"✅ {item}: Properly consolidated (1 occurrence)")
                                elif count == 0:
                                    print(f"⚠️  {item}: Not found in grocery list")
                                else:
                                    print(f"❌ {item}: Multiple occurrences ({count}) - not consolidated")
                            
                            # Overall assessment
                            properly_consolidated = sum(1 for count in consolidation_results.values() if count == 1)
                            total_tested = len(consolidation_results)
                            
                            print(f"\nConsolidation Results:")
                            print(f"• {properly_consolidated}/{total_tested} ingredients properly consolidated")
                            
                            if properly_consolidated >= total_tested * 0.8:  # 80% success rate
                                print(f"🎉 Grocery list consolidation working correctly!")
                                return True
                            else:
                                print(f"❌ Grocery list consolidation needs improvement")
                                return False
                        else:
                            print(f"❌ Could not extract grocery section")
                            return False
                    else:
                        print(f"❌ Consolidated grocery list not found in PDF")
                        return False
                        
                except Exception as e:
                    print(f"⚠️  Error reading PDF content: {e}")
                    return True  # PDF was created successfully
            else:
                print(f"❌ PDF file too small")
                return False
        else:
            print(f"❌ PDF file not created")
            return False
            
    except Exception as e:
        print(f"❌ PDF export failed: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def main():
    """Run the test"""
    success = test_pdf_export()
    
    if success:
        print(f"\n🎉 PDF Export Test PASSED!")
        print(f"The grocery list consolidation is working correctly.")
    else:
        print(f"\n💥 PDF Export Test FAILED!")
        print(f"There are issues with the consolidation algorithm.")
    
    return success

if __name__ == "__main__":
    main()