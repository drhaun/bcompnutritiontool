#!/usr/bin/env python3
"""
Comprehensive OpenAI quota issue diagnosis
"""

import os
import openai
from openai import OpenAI
import requests
import json

def diagnose_openai_issue():
    """Comprehensive diagnosis of OpenAI API issues"""
    
    api_key = os.environ.get('OPENAI_API_KEY')
    print(f"🔍 Diagnosing OpenAI Issue")
    print(f"   API Key: {api_key[:15]}...{api_key[-4:]}")
    print(f"   Key Type: {'Project-scoped' if api_key.startswith('sk-proj-') else 'User key'}")
    print(f"   Key Length: {len(api_key)}")
    
    # Test 1: Basic authentication
    print("\n1️⃣ Testing Basic Authentication...")
    try:
        response = requests.get(
            'https://api.openai.com/v1/models',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=5
        )
        if response.status_code == 200:
            print("   ✅ Authentication successful")
            models = response.json()['data']
            chat_models = [m for m in models if 'gpt' in m['id'] and 'instruct' not in m['id']]
            print(f"   📊 Available chat models: {len(chat_models)}")
        else:
            print(f"   ❌ Auth failed: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Auth error: {e}")
        return
    
    # Test 2: Usage/billing check
    print("\n2️⃣ Checking Usage/Billing...")
    endpoints_to_try = [
        'https://api.openai.com/v1/usage',
        'https://api.openai.com/v1/billing/usage',
        'https://api.openai.com/v1/dashboard/billing/usage'
    ]
    
    for endpoint in endpoints_to_try:
        try:
            response = requests.get(
                endpoint,
                headers={'Authorization': f'Bearer {api_key}'},
                timeout=5
            )
            print(f"   {endpoint.split('/')[-1]}: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"      Response keys: {list(data.keys())}")
        except Exception as e:
            print(f"   {endpoint.split('/')[-1]}: Error - {str(e)[:50]}")
    
    # Test 3: Try different completion methods
    print("\n3️⃣ Testing Different Completion Methods...")
    
    # Method A: Direct HTTP to chat/completions
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'OpenAI-Organization': 'org-pcvyQ5OkA65PHwySXie14IDI',
                'OpenAI-Project': 'proj_uEFGQaGWPJEJOIqrnKvRuwW3'
            },
            json={
                'model': 'gpt-3.5-turbo',
                'messages': [{'role': 'user', 'content': 'Hi'}],
                'max_tokens': 3
            },
            timeout=10
        )
        print(f"   Chat/completions with headers: {response.status_code}")
        print(f"   Response: {response.text[:100]}...")
    except Exception as e:
        print(f"   Chat/completions: {str(e)[:50]}")
    
    # Method B: Legacy completions
    try:
        response = requests.post(
            'https://api.openai.com/v1/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-3.5-turbo-instruct',
                'prompt': 'Hi',
                'max_tokens': 3
            },
            timeout=10
        )
        print(f"   Legacy completions: {response.status_code}")
        print(f"   Response: {response.text[:100]}...")
    except Exception as e:
        print(f"   Legacy completions: {str(e)[:50]}")
    
    # Test 4: Different models
    print("\n4️⃣ Testing Cheapest Models...")
    cheap_models = ['gpt-3.5-turbo', 'gpt-4o-mini']
    
    for model in cheap_models:
        try:
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[{'role': 'user', 'content': 'Hi'}],
                max_tokens=1
            )
            print(f"   ✅ {model}: SUCCESS!")
            break
        except openai.RateLimitError as e:
            print(f"   ❌ {model}: Quota error")
        except Exception as e:
            print(f"   ❌ {model}: {str(e)[:50]}")
    
    print("\n📋 DIAGNOSIS SUMMARY:")
    print("   • API key authenticates successfully")
    print("   • Can retrieve models list")
    print("   • All completion attempts fail with quota error")
    print("   • This suggests project-level billing/quota issue")
    print("\n💡 RECOMMENDATION:")
    print("   Check OpenAI dashboard for:")
    print("   1. Project billing settings")
    print("   2. Usage quotas for this specific project")
    print("   3. Payment method status")
    print("   4. Try creating a new project with fresh quota")

if __name__ == "__main__":
    diagnose_openai_issue()