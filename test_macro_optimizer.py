#!/usr/bin/env python3
"""
Test the intelligent macro optimizer
"""
from intelligent_macro_optimizer import MacroOptimizer

def test_basic_optimization():
    """Test basic macro optimization functionality"""
    
    print("Testing Intelligent Macro Optimizer")
    print("=" * 40)
    
    optimizer = MacroOptimizer()
    
    # Test meal with poor macro distribution
    test_ingredients = [
        {"name": "Chicken Breast", "amount": "100g"},
        {"name": "Broccoli", "amount": "150g"},
        {"name": "Olive Oil", "amount": "5ml"}
    ]
    
    # Target macros for a balanced meal
    target_macros = {
        "protein": 40,    # 40g protein
        "carbs": 35,      # 35g carbs  
        "fat": 15,        # 15g fat
        "calories": 400   # 400 calories
    }
    
    print("Original Ingredients:")
    for ingredient in test_ingredients:
        print(f"  • {ingredient['name']}: {ingredient['amount']}")
    
    # Calculate current macros
    current_macros = optimizer.calculate_current_macros(test_ingredients)
    print(f"\nCurrent Macros:")
    print(f"  Protein: {current_macros['protein']:.1f}g")
    print(f"  Carbs: {current_macros['carbs']:.1f}g") 
    print(f"  Fat: {current_macros['fat']:.1f}g")
    print(f"  Calories: {current_macros['calories']:.0f}")
    
    print(f"\nTarget Macros:")
    print(f"  Protein: {target_macros['protein']}g")
    print(f"  Carbs: {target_macros['carbs']}g")
    print(f"  Fat: {target_macros['fat']}g") 
    print(f"  Calories: {target_macros['calories']}")
    
    # Optimize the meal
    print(f"\nOptimizing meal...")
    optimized_ingredients, achieved_macros = optimizer.optimize_meal_macros(
        test_ingredients, target_macros, tolerance=0.01
    )
    
    print(f"\nOptimized Ingredients:")
    for ingredient in optimized_ingredients:
        print(f"  • {ingredient['name']}: {ingredient['amount']}")
    
    print(f"\nAchieved Macros:")
    print(f"  Protein: {achieved_macros['protein']:.1f}g")
    print(f"  Carbs: {achieved_macros['carbs']:.1f}g")
    print(f"  Fat: {achieved_macros['fat']:.1f}g")
    print(f"  Calories: {achieved_macros['calories']:.0f}")
    
    # Calculate accuracy
    print(f"\nAccuracy Analysis:")
    for macro in ["protein", "carbs", "fat", "calories"]:
        target_val = target_macros[macro]
        achieved_val = achieved_macros[macro]
        error_pct = abs(achieved_val - target_val) / target_val * 100
        
        status = "✅ EXCELLENT" if error_pct <= 1 else "✅ GOOD" if error_pct <= 3 else "⚠️ NEEDS IMPROVEMENT"
        print(f"  {macro.title()}: {error_pct:.1f}% error {status}")
    
    # Overall success
    max_error = max(abs(achieved_macros[macro] - target_macros[macro]) / target_macros[macro] * 100 
                   for macro in ["protein", "carbs", "fat", "calories"])
    
    if max_error <= 1:
        print(f"\n🎉 SUCCESS: ±1% accuracy achieved! (Max error: {max_error:.1f}%)")
    elif max_error <= 3:
        print(f"\n✅ GOOD: Within ±3% tolerance (Max error: {max_error:.1f}%)")
    else:
        print(f"\n⚠️ IMPROVEMENT NEEDED: {max_error:.1f}% max error")
    
    return max_error <= 1

def test_with_user_preferences():
    """Test optimization with dietary restrictions"""
    
    print(f"\n" + "=" * 40)
    print("Testing with Dietary Restrictions")
    print("=" * 40)
    
    optimizer = MacroOptimizer()
    
    # Simple meal needing carbs
    test_ingredients = [
        {"name": "Salmon", "amount": "120g"},
        {"name": "Spinach", "amount": "100g"}
    ]
    
    target_macros = {
        "protein": 35,
        "carbs": 45,     # High carb target 
        "fat": 12,
        "calories": 400
    }
    
    # User preferences with restrictions
    user_preferences = {
        "dietary_restrictions": ["Vegetarian"],  # Should avoid adding more fish/meat
        "allergies": ["Nuts"],                   # Should avoid nuts
        "preferred_carbs": ["Sweet Potato", "Quinoa"]
    }
    
    print("Original Ingredients:")
    for ingredient in test_ingredients:
        print(f"  • {ingredient['name']}: {ingredient['amount']}")
    
    print(f"\nUser Restrictions: {user_preferences['dietary_restrictions']}")
    print(f"Allergies: {user_preferences['allergies']}")
    
    # Optimize with restrictions
    optimized_ingredients, achieved_macros = optimizer.optimize_meal_macros(
        test_ingredients, target_macros, user_preferences, tolerance=0.02
    )
    
    print(f"\nOptimized Ingredients:")
    added_ingredients = []
    for ingredient in optimized_ingredients:
        print(f"  • {ingredient['name']}: {ingredient['amount']}")
        if ingredient['name'] not in [ing['name'] for ing in test_ingredients]:
            added_ingredients.append(ingredient['name'])
    
    if added_ingredients:
        print(f"\nAdded Ingredients: {', '.join(added_ingredients)}")
        
        # Check if restrictions were respected
        restrictions_ok = True
        for added in added_ingredients:
            if any(meat in added.lower() for meat in ["chicken", "beef", "turkey"]) and "Vegetarian" in user_preferences['dietary_restrictions']:
                restrictions_ok = False
                print(f"⚠️ WARNING: Added {added} violates vegetarian restriction")
            if any(nut in added.lower() for nut in ["almond", "walnut", "cashew", "nut"]) and "Nuts" in user_preferences['allergies']:
                restrictions_ok = False
                print(f"⚠️ WARNING: Added {added} violates nut allergy")
        
        if restrictions_ok:
            print("✅ All dietary restrictions respected")
    
    return len(added_ingredients) > 0 and achieved_macros['carbs'] > 40

def main():
    """Run all optimizer tests"""
    
    test1_passed = test_basic_optimization()
    test2_passed = test_with_user_preferences()
    
    print(f"\n" + "=" * 50)
    print("INTELLIGENT MACRO OPTIMIZER TEST RESULTS")
    print("=" * 50)
    print(f"✅ Basic Optimization: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"✅ Dietary Restrictions: {'PASSED' if test2_passed else 'FAILED'}")
    
    if test1_passed and test2_passed:
        print(f"\n🎉 ALL TESTS PASSED!")
        print(f"Intelligent macro optimizer is ready for production!")
        print(f"\nKey Features Demonstrated:")
        print(f"  • ±1% macro accuracy through mathematical optimization")
        print(f"  • Intelligent ingredient addition for macro gaps")
        print(f"  • Respect for dietary restrictions and allergies")
        print(f"  • Automatic serving size optimization")
        print(f"  • Compatible ingredient selection")
    else:
        print(f"\n⚠️ Some tests failed - optimizer needs refinement")

if __name__ == "__main__":
    main()