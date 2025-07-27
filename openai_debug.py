"""
Debug script to help diagnose OpenAI API issues
"""
import os
import openai
import json

def debug_openai_connection():
    """Comprehensive OpenAI API debugging"""
    
    api_key = os.environ.get('OPENAI_API_KEY')
    org_id = os.environ.get('OPENAI_ORGANIZATION_ID')
    project_id = os.environ.get('OPENAI_PROJECT_ID')
    
    if not api_key:
        print("❌ No OPENAI_API_KEY found in environment")
        return False
    
    print(f"✓ API Key found (length: {len(api_key)})")
    print(f"✓ Key prefix: {api_key[:15]}...")
    print(f"✓ Organization ID: {org_id[:10] + '...' if org_id and len(org_id) > 10 else org_id}")
    print(f"✓ Project ID: {project_id[:10] + '...' if project_id and len(project_id) > 10 else project_id}")
    
    try:
        client = openai.OpenAI(
            api_key=api_key,
            organization=org_id,
            project=project_id
        )
        
        # Test 1: Simple completion
        print("\n🧪 Testing simple completion...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'working'"}],
            max_tokens=5
        )
        print("✓ Simple completion successful")
        return True
        
    except openai.RateLimitError as e:
        print(f"❌ Rate limit error: {e}")
        return False
    except openai.AuthenticationError as e:
        print(f"❌ Authentication error: {e}")
        return False
    except Exception as e:
        print(f"❌ Other error: {e}")
        return False

if __name__ == "__main__":
    success = debug_openai_connection()
    if not success:
        print("\n💡 Suggestions:")
        print("1. Verify the API key is from the correct OpenAI project")
        print("2. Check your OpenAI dashboard for quota usage")
        print("3. Ensure billing is set up correctly")
        print("4. Try creating a new API key from your main account")