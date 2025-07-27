#!/usr/bin/env python3
"""
Production-ready OpenAI API test script
Organization: Fitomics
Project: Body Comp & Nutrition Planning Tool
"""

import os
import openai
from openai import OpenAI
import sys


def test_openai_api():
    """
    Test OpenAI API with proper organization and project headers
    """
    
    # Get API key from environment
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        return False
    
    # Organization and Project details
    organization_id = "org-pcvyQ5OkA65PHwySXie14IDI"
    project_id = "proj_uEFGQaGWPJEJOIqrnKvRuwW3"
    
    print("🔧 Initializing OpenAI client...")
    print(f"   Organization: Fitomics ({organization_id})")
    print(f"   Project: Body Comp & Nutrition Planning Tool ({project_id})")
    print(f"   API Key: {api_key[:20]}...")
    
    try:
        # Initialize OpenAI client with proper headers
        client = OpenAI(
            api_key=api_key,
            organization=organization_id,
            project=project_id
        )
        
        print("\n🚀 Sending test prompt to GPT-4...")
        
        # Try different models to isolate the issue
        models_to_test = ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4"]
        
        for model in models_to_test:
            try:
                print(f"   Testing model: {model}")
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "user", 
                            "content": "What are 3 benefits of resistance training?"
                        }
                    ],
                    max_tokens=50,
                    temperature=0.7
                )
                # If we get here, the request succeeded
                break
            except Exception as model_error:
                print(f"   {model}: {str(model_error)[:80]}...")
                if model == models_to_test[-1]:  # Last model failed
                    raise model_error
                continue
        
        # Print successful response
        print("\n✅ SUCCESS! OpenAI API Response:")
        print("=" * 50)
        print(response.choices[0].message.content)
        print("=" * 50)
        
        # Print usage information
        if hasattr(response, 'usage'):
            print(f"\n📊 Token Usage:")
            print(f"   Prompt tokens: {response.usage.prompt_tokens}")
            print(f"   Completion tokens: {response.usage.completion_tokens}")
            print(f"   Total tokens: {response.usage.total_tokens}")
        
        return True
        
    except openai.RateLimitError as e:
        print(f"\n❌ Rate Limit Error: {e}")
        print("   This usually indicates quota exceeded or billing issues")
        return False
        
    except openai.APIError as e:
        print(f"\n❌ API Error: {e}")
        print("   This indicates a server-side issue with OpenAI")
        return False
        
    except openai.InvalidRequestError as e:
        print(f"\n❌ Invalid Request Error: {e}")
        print("   This indicates an issue with the request parameters")
        return False
        
    except openai.AuthenticationError as e:
        print(f"\n❌ Authentication Error: {e}")
        print("   This indicates an issue with the API key or permissions")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False


def main():
    """Main function"""
    print("🤖 OpenAI API Production Test")
    print("=" * 40)
    
    success = test_openai_api()
    
    if success:
        print("\n🎉 Test completed successfully!")
        print("   OpenAI API is properly configured and working")
        sys.exit(0)
    else:
        print("\n💥 Test failed!")
        print("   Please check your API configuration and billing status")
        sys.exit(1)


if __name__ == "__main__":
    main()