#!/usr/bin/env python3
"""
Test minimal OpenAI request to check quota status
"""

import os
from openai import OpenAI

def test_minimal_quota():
    """Test with smallest possible request"""
    
    client = OpenAI(
        api_key=os.environ.get('OPENAI_API_KEY'),
        organization=os.environ.get('OPENAI_ORGANIZATION_ID'),
        project=os.environ.get('OPENAI_PROJECT_ID')
    )
    
    try:
        # Smallest possible request - 1 token max
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Try cheaper model first
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=1,
            temperature=0
        )
        
        print("✅ GPT-3.5-turbo quota available")
        return True
        
    except Exception as e:
        print(f"❌ GPT-3.5-turbo quota error: {e}")
        
        # Try GPT-4o-mini if available
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=1,
                temperature=0
            )
            print("✅ GPT-4o-mini quota available")
            return True
        except Exception as e2:
            print(f"❌ GPT-4o-mini quota error: {e2}")
            return False

if __name__ == "__main__":
    success = test_minimal_quota()
    if not success:
        print("\n📋 NEXT STEPS:")
        print("1. Check OpenAI platform billing dashboard")
        print("2. Verify project has active payment method")
        print("3. Confirm quota allocation to this specific project")
        print("4. May need to wait for billing activation (can take a few minutes)")