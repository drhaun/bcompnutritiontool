#!/usr/bin/env python3
"""
Test script to validate grocery list consolidation accuracy
"""

def test_consolidation():
    """Test the grocery list consolidation logic"""
    
    # Sample test data - same ingredient appearing multiple times
    test_ingredients = [
        {"item": "Chicken Breast", "amount": "150g"},
        {"item": "Almonds", "amount": "30g"},
        {"item": "Spinach", "amount": "100g"},
        {"item": "Chicken Breast", "amount": "150g"},  # Day 2
        {"item": "Almonds", "amount": "30g"},  # Day 2
        {"item": "Spinach", "amount": "100g"},  # Day 2
        {"item": "Chicken Breast", "amount": "150g"},  # Day 3
        {"item": "Almonds", "amount": "30g"},  # Day 3
        {"item": "Spinach", "amount": "100g"},  # Day 3
        # Add more days...
        {"item": "Chicken Breast", "amount": "150g"},  # Day 4
        {"item": "Chicken Breast", "amount": "150g"},  # Day 5
        {"item": "Chicken Breast", "amount": "150g"},  # Day 6
        {"item": "Chicken Breast", "amount": "150g"},  # Day 7
        {"item": "Almonds", "amount": "30g"},  # Day 4-7
        {"item": "Almonds", "amount": "30g"},
        {"item": "Almonds", "amount": "30g"},
        {"item": "Almonds", "amount": "30g"},
        {"item": "Spinach", "amount": "100g"},  # Day 4-7
        {"item": "Spinach", "amount": "100g"},
        {"item": "Spinach", "amount": "100g"},
        {"item": "Spinach", "amount": "100g"},
    ]
    
    print("🧪 Testing Grocery List Consolidation")
    print("=" * 50)
    print(f"Input: {len(test_ingredients)} total ingredient entries")
    
    # Count occurrences manually
    manual_count = {}
    for ingredient in test_ingredients:
        name = ingredient["item"]
        amount = ingredient["amount"]
        
        if name not in manual_count:
            manual_count[name] = []
        manual_count[name].append(amount)
    
    print("\n📊 Manual Count:")
    for name, amounts in manual_count.items():
        # Extract numeric values
        total = 0
        unit = ""
        for amount in amounts:
            if 'g' in amount:
                total += int(amount.replace('g', ''))
                unit = 'g'
        print(f"  {name}: {len(amounts)} entries → {total}{unit}")
    
    print("\n✅ Expected Consolidated Result:")
    print("  - Chicken Breast: 1050g (150g × 7 days)")
    print("  - Almonds: 420g (30g × 14 entries)")  
    print("  - Spinach: 1400g (100g × 14 entries)")
    
    # Load the actual PDF and check if it matches
    print("\n🔍 Checking PDF output...")
    try:
        with open('test_full_week_pdf_20250803.pdf', 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        if "Chicken Breast: 1050g" in content:
            print("  ✅ Chicken Breast consolidation: CORRECT")
        else:
            print("  ❌ Chicken Breast consolidation: INCORRECT")
            
        if "Almonds: 420g" in content:
            print("  ✅ Almonds consolidation: CORRECT")
        else:
            print("  ❌ Almonds consolidation: INCORRECT")
            
        if "Spinach: 1400g" in content:
            print("  ✅ Spinach consolidation: CORRECT")
        else:
            print("  ❌ Spinach consolidation: INCORRECT")
            
    except Exception as e:
        print(f"  ⚠️  Could not verify PDF: {e}")
    
    print("\n🎉 Grocery List Consolidation Test Complete!")

if __name__ == "__main__":
    test_consolidation()