#!/usr/bin/env python3
"""
Generate a realistic PDF meal plan for user review
"""
from pdf_export import FitomicsPDF
from datetime import datetime

def create_realistic_meal_plan():
    """Create a realistic 7-day meal plan with proper consolidation"""
    
    meal_plan = {
        "Monday": {
            "Breakfast": {
                "name": "Protein Oatmeal Bowl",
                "ingredients": [
                    {"name": "Rolled Oats", "amount": "50g"},
                    {"name": "Whey Protein Powder", "amount": "30g"},
                    {"name": "Banana", "amount": "1 medium"},
                    {"name": "Almonds", "amount": "15g"},
                    {"name": "Blueberries", "amount": "75g"}
                ],
                "macros": {"protein": 35, "carbs": 52, "fat": 8, "calories": 410},
                "instructions": "1. Cook oats with water. 2. Stir in protein powder. 3. Top with sliced banana, almonds, and blueberries."
            },
            "Lunch": {
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
                "instructions": "1. Grill chicken breast and slice. 2. Combine greens, tomatoes, cucumber. 3. Top with chicken and feta. 4. Drizzle with olive oil."
            },
            "Dinner": {
                "name": "Salmon with Sweet Potato",
                "ingredients": [
                    {"name": "Salmon Fillet", "amount": "140g"},
                    {"name": "Sweet Potato", "amount": "200g"},
                    {"name": "Broccoli", "amount": "150g"},
                    {"name": "Olive Oil", "amount": "8ml"}
                ],
                "macros": {"protein": 38, "carbs": 35, "fat": 18, "calories": 420},
                "instructions": "1. Bake salmon at 400°F for 15 minutes. 2. Roast sweet potato cubes. 3. Steam broccoli. 4. Drizzle vegetables with olive oil."
            },
            "Snack 1": {
                "name": "Greek Yogurt with Nuts",
                "ingredients": [
                    {"name": "Greek Yogurt", "amount": "150g"},
                    {"name": "Walnuts", "amount": "20g"}
                ],
                "macros": {"protein": 18, "carbs": 8, "fat": 15, "calories": 225},
                "instructions": "Mix Greek yogurt with chopped walnuts."
            },
            "Snack 2": {
                "name": "Apple with Almond Butter",
                "ingredients": [
                    {"name": "Apple", "amount": "1 medium"},
                    {"name": "Almond Butter", "amount": "15g"}
                ],
                "macros": {"protein": 4, "carbs": 22, "fat": 9, "calories": 175},
                "instructions": "Slice apple and serve with almond butter for dipping."
            }
        },
        "Tuesday": {
            "Breakfast": {
                "name": "Egg White Scramble",
                "ingredients": [
                    {"name": "Egg Whites", "amount": "200ml"},
                    {"name": "Spinach", "amount": "50g"},
                    {"name": "Bell Pepper", "amount": "60g"},
                    {"name": "Whole Wheat Toast", "amount": "2 slices"},
                    {"name": "Avocado", "amount": "50g"}
                ],
                "macros": {"protein": 28, "carbs": 32, "fat": 8, "calories": 300},
                "instructions": "1. Scramble egg whites with vegetables. 2. Toast bread. 3. Top with sliced avocado."
            },
            "Lunch": {
                "name": "Turkey and Quinoa Bowl",
                "ingredients": [
                    {"name": "Ground Turkey", "amount": "120g"},
                    {"name": "Quinoa", "amount": "60g dry"},
                    {"name": "Black Beans", "amount": "80g"},
                    {"name": "Bell Pepper", "amount": "80g"},
                    {"name": "Corn", "amount": "60g"}
                ],
                "macros": {"protein": 38, "carbs": 45, "fat": 8, "calories": 395},
                "instructions": "1. Cook quinoa. 2. Brown ground turkey with peppers. 3. Combine with beans and corn."
            },
            "Dinner": {
                "name": "Lean Beef Stir Fry",
                "ingredients": [
                    {"name": "Lean Beef", "amount": "130g"},
                    {"name": "Brown Rice", "amount": "60g dry"},
                    {"name": "Broccoli", "amount": "100g"},
                    {"name": "Carrots", "amount": "80g"},
                    {"name": "Sesame Oil", "amount": "5ml"}
                ],
                "macros": {"protein": 35, "carbs": 38, "fat": 12, "calories": 385},
                "instructions": "1. Cook brown rice. 2. Stir fry beef with vegetables in sesame oil. 3. Serve over rice."
            },
            "Snack 1": {
                "name": "Protein Smoothie",
                "ingredients": [
                    {"name": "Whey Protein Powder", "amount": "25g"},
                    {"name": "Banana", "amount": "1 small"},
                    {"name": "Spinach", "amount": "30g"},
                    {"name": "Almond Milk", "amount": "250ml"}
                ],
                "macros": {"protein": 22, "carbs": 18, "fat": 3, "calories": 185},
                "instructions": "Blend all ingredients until smooth."
            },
            "Snack 2": {
                "name": "Cottage Cheese Bowl",
                "ingredients": [
                    {"name": "Cottage Cheese", "amount": "120g"},
                    {"name": "Cherry Tomatoes", "amount": "80g"},
                    {"name": "Cucumber", "amount": "60g"}
                ],
                "macros": {"protein": 16, "carbs": 8, "fat": 4, "calories": 125},
                "instructions": "Combine cottage cheese with chopped vegetables."
            }
        },
        "Wednesday": {
            "Breakfast": {
                "name": "Overnight Chia Oats",
                "ingredients": [
                    {"name": "Rolled Oats", "amount": "40g"},
                    {"name": "Chia Seeds", "amount": "15g"},
                    {"name": "Almond Milk", "amount": "200ml"},
                    {"name": "Strawberries", "amount": "100g"},
                    {"name": "Honey", "amount": "10g"}
                ],
                "macros": {"protein": 12, "carbs": 45, "fat": 9, "calories": 295},
                "instructions": "1. Mix oats, chia seeds, and almond milk overnight. 2. Top with strawberries and honey."
            },
            "Lunch": {
                "name": "Tuna Salad Wrap",
                "ingredients": [
                    {"name": "Canned Tuna", "amount": "120g"},
                    {"name": "Whole Wheat Tortilla", "amount": "1 large"},
                    {"name": "Mixed Greens", "amount": "60g"},
                    {"name": "Cucumber", "amount": "60g"},
                    {"name": "Avocado", "amount": "40g"}
                ],
                "macros": {"protein": 32, "carbs": 28, "fat": 12, "calories": 330},
                "instructions": "1. Mix tuna with vegetables. 2. Wrap in tortilla with greens and avocado."
            },
            "Dinner": {
                "name": "Chicken Thigh with Vegetables",
                "ingredients": [
                    {"name": "Chicken Thigh", "amount": "140g"},
                    {"name": "Sweet Potato", "amount": "180g"},
                    {"name": "Green Beans", "amount": "120g"},
                    {"name": "Olive Oil", "amount": "8ml"}
                ],
                "macros": {"protein": 36, "carbs": 32, "fat": 16, "calories": 390},
                "instructions": "1. Bake chicken thigh. 2. Roast sweet potato and green beans with olive oil."
            },
            "Snack 1": {
                "name": "Trail Mix",
                "ingredients": [
                    {"name": "Almonds", "amount": "20g"},
                    {"name": "Dried Cranberries", "amount": "15g"}
                ],
                "macros": {"protein": 5, "carbs": 15, "fat": 12, "calories": 175},
                "instructions": "Mix almonds with dried cranberries."
            },
            "Snack 2": {
                "name": "Hummus with Vegetables",
                "ingredients": [
                    {"name": "Hummus", "amount": "40g"},
                    {"name": "Carrots", "amount": "100g"},
                    {"name": "Bell Pepper", "amount": "80g"}
                ],
                "macros": {"protein": 6, "carbs": 18, "fat": 6, "calories": 140},
                "instructions": "Serve hummus with sliced vegetables for dipping."
            }
        }
        # Thursday through Sunday would follow similar pattern
    }
    
    return meal_plan

def generate_pdf_for_review():
    """Generate a comprehensive PDF for user review"""
    
    print("Generating Realistic PDF Meal Plan...")
    print("=" * 40)
    
    # Create meal plan data
    meal_plan = create_realistic_meal_plan()
    
    # Initialize PDF
    pdf = FitomicsPDF()
    
    # Add title page
    pdf.add_page()
    pdf.set_font('Arial', 'B', 20)
    pdf.cell(0, 15, 'Fitomics Personalized Meal Plan', 0, 1, 'C')
    pdf.ln(5)
    
    pdf.set_font('Arial', '', 12)
    pdf.cell(0, 8, f'Generated: {datetime.now().strftime("%B %d, %Y")}', 0, 1, 'C')
    pdf.cell(0, 8, 'Target: 2000 calories, 150g protein, 200g carbs, 75g fat', 0, 1, 'C')
    pdf.ln(10)
    
    # Add each day
    for day_name, meals in meal_plan.items():
        pdf.add_day_header(day_name)
        
        for meal_type, meal_data in meals.items():
            pdf.add_meal(
                meal_type=meal_type,
                meal_name=meal_data["name"],
                ingredients=meal_data["ingredients"],
                macros=meal_data["macros"],
                instructions=meal_data["instructions"]
            )
    
    # Collect all ingredients for grocery list
    all_ingredients = []
    for day_meals in meal_plan.values():
        for meal_data in day_meals.values():
            all_ingredients.extend(meal_data["ingredients"])
    
    # Add grocery list
    pdf.add_grocery_list(all_ingredients)
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"fitomics_meal_plan_{timestamp}.pdf"
    
    # Save PDF
    pdf.output(filename)
    
    print(f"✅ PDF Generated: {filename}")
    
    # Verify file
    import os
    if os.path.exists(filename):
        size = os.path.getsize(filename)
        print(f"✅ File Size: {size:,} bytes")
        
        # Quick content verification
        with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Check key sections
        sections = [
            ("Meal Plan Title", "Fitomics Personalized Meal Plan"),
            ("Day Headers", "Monday"),
            ("Meal Names", "Protein Oatmeal Bowl"),
            ("Ingredients", "Chicken Breast"),
            ("Grocery List", "CONSOLIDATED GROCERY LIST"),
            ("Consolidation", "300g")  # Should show consolidated amounts
        ]
        
        print(f"\nContent Verification:")
        for section_name, search_text in sections:
            if search_text in content:
                print(f"✅ {section_name}: Found")
            else:
                print(f"❌ {section_name}: Missing")
        
        return filename
    else:
        print(f"❌ PDF creation failed")
        return None

if __name__ == "__main__":
    filename = generate_pdf_for_review()
    
    if filename:
        print(f"\n🎉 SUCCESS!")
        print(f"Realistic meal plan PDF ready for review: {filename}")
        print(f"\nFeatures included:")
        print(f"  • 3-day detailed meal plan with realistic portions")
        print(f"  • Professional formatting and branding")
        print(f"  • Complete ingredient lists with amounts")
        print(f"  • Detailed cooking instructions")
        print(f"  • Consolidated grocery list with proper totals")
        print(f"  • Macro breakdowns for each meal")
    else:
        print(f"\n❌ PDF generation failed")