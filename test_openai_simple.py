#!/usr/bin/env python3
"""
Simple OpenAI API test to isolate the issue
"""
import os
import openai

def test_openai():
    api_key = os.environ.get('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ No API key found")
        return False
    
    print(f"✓ API Key: {api_key[:20]}...")
    
    try:
        org_id = os.environ.get('OPENAI_ORGANIZATION_ID')
        project_id = os.environ.get('OPENAI_PROJECT_ID')
        
        print(f"✓ Organization ID: {org_id}")
        print(f"✓ Project ID: {project_id}")
        
        client = openai.OpenAI(
            api_key=api_key,
            organization=org_id,
            project=project_id
        )
        
        # Simple test
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=5
        )
        
        print("✅ SUCCESS!")
        print(f"Response: {response.choices[0].message.content}")
        return True
        
    except openai.AuthenticationError as e:
        print(f"❌ Authentication Error: {e}")
        return False
    except openai.RateLimitError as e:
        print(f"❌ Rate/Quota Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

if __name__ == "__main__":
    success = test_openai()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")