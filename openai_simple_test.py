#!/usr/bin/env python3
"""
Simple OpenAI test without organization/project headers
"""

import os
import openai
from openai import OpenAI

def test_without_headers():
    """Test OpenAI API without organization/project headers"""
    
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("No API key found")
        return False
    
    print(f"Testing with API key: {api_key[:20]}...")
    
    try:
        # Simple client without org/project
        client = OpenAI(api_key=api_key)
        
        print("Sending minimal test request...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        
        print("SUCCESS!")
        print(f"Response: {response.choices[0].message.content}")
        return True
        
    except openai.RateLimitError as e:
        print(f"Quota Error: {e}")
        return False
    except Exception as e:
        print(f"Other Error: {e}")
        return False

if __name__ == "__main__":
    test_without_headers()