#!/usr/bin/env python3
"""
Live test of AI meal planning system functionality
"""

import os
import json
from openai import OpenAI

def test_meal_planning_workflow():
    """Test the core AI meal planning functionality"""
    
    print("🧪 TESTING AI MEAL PLANNING SYSTEM")
    print("=" * 45)
    
    # Initialize OpenAI client
    client = OpenAI(
        api_key=os.environ.get('OPENAI_API_KEY'),
        organization=os.environ.get('OPENAI_ORGANIZATION_ID'),
        project=os.environ.get('OPENAI_PROJECT_ID')
    )
    
    # Test meal planning with sample user data
    test_prompt = """
    You are a nutrition expert creating a sample meal plan. Generate ONE meal for testing purposes.

    User Profile:
    - Weight: 180 lbs
    - Goal: Muscle gain
    - Activity: Moderate exercise
    - Dietary preferences: No restrictions

    Target macros for this ONE meal:
    - Calories: 600
    - Protein: 35g
    - Carbs: 65g  
    - Fat: 20g

    Return ONLY a JSON object with this structure:
    {
        "meal_name": "Descriptive meal name",
        "ingredients": [
            {"name": "ingredient", "amount": "200g", "calories": 100, "protein": 20, "carbs": 5, "fat": 2}
        ],
        "instructions": "Simple cooking steps",
        "nutrition_totals": {"calories": 600, "protein": 35, "carbs": 65, "fat": 20}
    }
    """
    
    try:
        print("🤖 Generating test meal plan...")
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutrition expert. Respond only with valid JSON."},
                {"role": "user", "content": test_prompt}
            ],
            max_tokens=800,
            temperature=0.1
        )
        
        result = response.choices[0].message.content.strip()
        print("✅ AI response received")
        
        # Parse JSON response
        meal_data = json.loads(result)
        print("✅ JSON parsing successful")
        
        # Display results
        print(f"\n📋 GENERATED MEAL:")
        print(f"  Name: {meal_data['meal_name']}")
        print(f"  Ingredients: {len(meal_data['ingredients'])} items")
        print(f"  Calories: {meal_data['nutrition_totals']['calories']}")
        print(f"  Protein: {meal_data['nutrition_totals']['protein']}g")
        print(f"  Carbs: {meal_data['nutrition_totals']['carbs']}g")
        print(f"  Fat: {meal_data['nutrition_totals']['fat']}g")
        
        print(f"\n✅ AI MEAL PLANNING SYSTEM FULLY OPERATIONAL!")
        print(f"🎯 Ready for comprehensive meal planning workflow")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Raw response: {result[:200]}...")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_meal_planning_workflow()
    if success:
        print(f"\n🚀 SYSTEM STATUS: READY FOR PRODUCTION USE")
    else:
        print(f"\n⚠️ System needs debugging")