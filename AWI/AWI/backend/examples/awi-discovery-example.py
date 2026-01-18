#!/usr/bin/env python3
"""
AWI Discovery Example

Demonstrates how a browser agent (like browser-use) would discover
and interact with an Agent Web Interface (AWI) using the .well-known/llm-text
discovery mechanism.
"""

import requests
import json


def discover_awi(base_url: str) -> dict:
    """
    Discover AWI capabilities using multiple methods.

    Returns the complete AWI manifest.
    """
    print(f"🔍 Discovering AWI at {base_url}...")

    # Method 1: Check HTTP headers on any page
    print("\n📋 Method 1: Checking HTTP headers...")
    response = requests.head(base_url)

    if 'X-AWI-Discovery' in response.headers:
        well_known_path = response.headers['X-AWI-Discovery']
        print(f"   ✓ Found AWI Discovery header: {well_known_path}")
        print(f"   ✓ Agent API: {response.headers.get('X-Agent-API')}")
        print(f"   ✓ Capabilities: {response.headers.get('X-Agent-Capabilities')}")
        print(f"   ✓ Registration: {response.headers.get('X-Agent-Registration')}")
    else:
        print("   ✗ No AWI Discovery headers found")
        well_known_path = '/.well-known/llm-text'  # Try default

    # Method 2: Fetch .well-known/llm-text
    print(f"\n📄 Method 2: Fetching {well_known_path}...")
    well_known_url = f"{base_url}{well_known_path}"

    try:
        response = requests.get(well_known_url)
        if response.status_code == 200:
            manifest = response.json()
            print(f"   ✓ Successfully fetched AWI manifest")
            print(f"   ✓ AWI Name: {manifest['awi']['name']}")
            print(f"   ✓ Version: {manifest['awi']['version']}")
            print(f"   ✓ Specification: {manifest['awi']['specification']}")
            return manifest
        else:
            print(f"   ✗ Failed to fetch manifest: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Method 3: Try capabilities endpoint
    print("\n🔧 Method 3: Checking capabilities endpoint...")
    try:
        capabilities_url = f"{base_url}/api/agent/capabilities"
        response = requests.get(capabilities_url)
        if response.status_code == 200:
            capabilities = response.json()
            print(f"   ✓ Capabilities endpoint available")
            return capabilities
    except Exception as e:
        print(f"   ✗ Error: {e}")

    return None


def analyze_capabilities(manifest: dict):
    """Analyze and display AWI capabilities."""

    print("\n" + "="*80)
    print("🎯 AWI CAPABILITIES ANALYSIS")
    print("="*80)

    # Quick capabilities check
    if 'capabilities' in manifest:
        caps = manifest['capabilities']

        print("\n✅ Allowed Operations:")
        for op in caps.get('allowed_operations', []):
            print(f"   • {op}")

        print("\n🚫 Disallowed Operations:")
        for op in caps.get('disallowed_operations', []):
            print(f"   • {op}")

        print("\n🔒 Security Features:")
        for feature in caps.get('security_features', []):
            print(f"   • {feature}")

        print("\n📊 Response Features:")
        for feature in caps.get('response_features', []):
            print(f"   • {feature}")

        print("\n⏱️  Rate Limits:")
        rate_limits = caps.get('rate_limits', {})
        if rate_limits.get('status') == 'planned':
            print(f"   Status: Planned (not yet enforced)")
            for op, limit in rate_limits.get('planned_limits', {}).items():
                print(f"   • {op}: {limit}")

    # Endpoints
    if 'endpoints' in manifest:
        print("\n🌐 Available Endpoints:")
        endpoints = manifest['endpoints']
        print(f"   Base: {endpoints.get('base')}")
        print(f"   Registration: {endpoints.get('registration')}")
        print(f"   Documentation: {endpoints.get('documentation')}")
        print(f"   Swagger UI: {endpoints.get('swagger_ui')}")

    # Authentication
    if 'authentication' in manifest:
        auth = manifest['authentication']
        print("\n🔑 Authentication:")
        print(f"   Type: {auth.get('type')}")
        print(f"   Header: {auth.get('headerName', auth.get('header'))}")
        print(f"   Registration: {auth.get('registration', {}).get('endpoint', auth.get('registration'))}")

        if 'permissions' in auth:
            perms = auth['permissions']
            print(f"   Available Permissions: {', '.join(perms.get('available', []))}")
            print(f"   Default Permissions: {', '.join(perms.get('default', []))}")

    # Features
    if 'features' in manifest:
        print("\n✨ Advanced Features:")
        features = manifest['features']

        if 'session_state' in features:
            ss = features['session_state']
            if ss.get('enabled'):
                print(f"   ✓ Session State Management")
                print(f"     Benefits:")
                for benefit in ss.get('benefits', [])[:3]:
                    print(f"       • {benefit}")

        if features.get('structuredResponses') or features.get('structured_responses', {}).get('enabled'):
            print(f"   ✓ Structured Responses with Metadata")

        if features.get('semanticMetadata') or features.get('semantic_metadata', {}).get('enabled'):
            print(f"   ✓ Semantic Metadata (schema.org)")

        if features.get('trajectoryTracking') or features.get('trajectory_tracking', {}).get('enabled'):
            print(f"   ✓ Trajectory Tracking for RL")

    # Advantages
    if 'advantages_over_dom' in manifest:
        print("\n🚀 Advantages Over DOM Scraping:")
        advantages = manifest['advantages_over_dom']
        for key, value in advantages.items():
            print(f"   • {key.replace('_', ' ').title()}: {value}")


def register_agent(base_url: str, agent_name: str) -> dict:
    """Register a new agent and get API key."""

    print(f"\n📝 Registering agent '{agent_name}'...")

    registration_url = f"{base_url}/api/agent/register"
    payload = {
        "name": agent_name,
        "description": "Test agent for AWI discovery demonstration",
        "permissions": ["read", "write"],
        "agentType": "browser-use",
        "framework": "python"
    }

    try:
        response = requests.post(registration_url, json=payload)
        if response.status_code == 201:
            data = response.json()
            if data.get('success'):
                agent = data.get('agent', {})
                print(f"   ✓ Agent registered successfully!")
                print(f"   ✓ Agent ID: {agent.get('id')}")
                print(f"   ✓ API Key: {agent.get('apiKey')[:20]}...")
                print(f"   ✓ Permissions: {', '.join(agent.get('permissions', []))}")
                return agent
        else:
            print(f"   ✗ Registration failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    return None


def test_api_access(base_url: str, api_key: str):
    """Test API access with the registered agent."""

    print(f"\n🧪 Testing API access...")

    headers = {
        'X-Agent-API-Key': api_key,
        'Content-Type': 'application/json'
    }

    # Test 1: List posts
    print("\n   Test 1: List posts")
    try:
        response = requests.get(
            f"{base_url}/api/agent/posts?page=1&limit=3",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Successfully fetched posts")
            print(f"   ✓ Total posts: {data.get('pagination', {}).get('total', 0)}")

            # Check for session state
            if '_sessionState' in data:
                print(f"   ✓ Session state included in response")
                session_id = data['_sessionState'].get('sessionId')
                print(f"     Session ID: {session_id}")
        else:
            print(f"   ✗ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 2: Get session state
    print("\n   Test 2: Get session state")
    try:
        response = requests.get(
            f"{base_url}/api/agent/session/state",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Session state retrieved")
            print(f"   ✓ Session ID: {data.get('sessionId')}")
            print(f"   ✓ Total actions: {data.get('statistics', {}).get('totalActions', 0)}")
        else:
            print(f"   ✗ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 3: Get action history (trajectory)
    print("\n   Test 3: Get action history (trajectory)")
    try:
        response = requests.get(
            f"{base_url}/api/agent/session/history?limit=5",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Action history retrieved")
            print(f"   ✓ Total actions: {data.get('totalActions', 0)}")

            trajectory = data.get('trajectory', [])
            if trajectory:
                print(f"   ✓ Recent actions:")
                for action in trajectory[:3]:
                    print(f"     • {action.get('action')} at {action.get('timestamp')}")
        else:
            print(f"   ✗ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")


def main():
    """Main demonstration."""

    base_url = "http://localhost:5000"

    print("="*80)
    print("🤖 AWI DISCOVERY DEMONSTRATION")
    print("="*80)
    print(f"\nTarget: {base_url}")

    # Step 1: Discover AWI
    manifest = discover_awi(base_url)

    if not manifest:
        print("\n❌ Failed to discover AWI")
        return

    # Step 2: Analyze capabilities
    analyze_capabilities(manifest)

    # Step 3: Register agent
    agent = register_agent(base_url, "DiscoveryDemoAgent")

    if not agent:
        print("\n❌ Failed to register agent")
        return

    # Step 4: Test API access
    test_api_access(base_url, agent.get('apiKey'))

    print("\n" + "="*80)
    print("✅ AWI DISCOVERY DEMONSTRATION COMPLETE")
    print("="*80)
    print("\n💡 Key Takeaways:")
    print("   • AWI can be discovered via HTTP headers and .well-known URI")
    print("   • Complete manifest provides all necessary information")
    print("   • Agents can self-register and get API keys")
    print("   • Session state reduces token usage by 500x")
    print("   • Trajectory tracking enables RL training")
    print("   • Structured responses > DOM parsing")


if __name__ == "__main__":
    main()
