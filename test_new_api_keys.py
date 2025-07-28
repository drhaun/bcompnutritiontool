#!/usr/bin/env python3
"""
Test OpenAI API connection with new project credentials
"""

import os
import sys
from openai import OpenAI

def test_openai_connection():
    """Test OpenAI API connection with new credentials"""
    
    # Get API credentials from environment
    api_key = os.environ.get('OPENAI_API_KEY')
    org_id = os.environ.get('OPENAI_ORGANIZATION_ID')
    project_id = os.environ.get('OPENAI_PROJECT_ID')
    
    print("=== OpenAI API Connection Test ===")
    print(f"API Key present: {'Yes' if api_key else 'No'}")
    print(f"Organization ID present: {'Yes' if org_id else 'No'}")
    print(f"Project ID present: {'Yes' if project_id else 'No'}")
    
    if not api_key:
        print("❌ ERROR: OPENAI_API_KEY not found in environment")
        return False
    
    # Initialize OpenAI client
    try:
        client = OpenAI(
            api_key=api_key,
            organization=org_id,
            project=project_id
        )
        print("✅ OpenAI client initialized successfully")
    except Exception as e:
        print(f"❌ ERROR initializing OpenAI client: {e}")
        return False
    
    # Test 1: List available models
    try:
        print("\n=== Testing Model Access ===")
        models = client.models.list()
        model_count = len(models.data)
        print(f"✅ Successfully retrieved {model_count} available models")
        
        # Check for GPT-4o specifically
        gpt4o_available = any(model.id == "gpt-4o" for model in models.data)
        print(f"GPT-4o available: {'Yes' if gpt4o_available else 'No'}")
        
    except Exception as e:
        print(f"❌ ERROR listing models: {e}")
        return False
    
    # Test 2: Simple completion request
    try:
        print("\n=== Testing Completion Request ===")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'API connection successful' in exactly those words."}
            ],
            max_tokens=10,
            temperature=0
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✅ Completion request successful")
        print(f"Response: {result}")
        
        if "API connection successful" in result:
            print("✅ API fully operational for meal planning system")
            return True
        else:
            print("⚠️ Unexpected response format")
            return False
            
    except Exception as e:
        print(f"❌ ERROR with completion request: {e}")
        return False

if __name__ == "__main__":
    success = test_openai_connection()
    if success:
        print("\n🎉 AI MEAL PLANNING SYSTEM READY TO ACTIVATE! 🎉")
        sys.exit(0)
    else:
        print("\n❌ API connection issues detected")
        sys.exit(1)