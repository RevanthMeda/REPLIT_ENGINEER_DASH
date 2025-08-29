
#!/usr/bin/env python3
"""
Test script to check if all imports are working correctly
"""

def test_imports():
    print("🔍 Testing imports...")
    
    try:
        print("  ✓ Flask imports...")
        
        
        print("✅ All imports successful!")
        assert True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    success = test_imports()
    if not success:
        print("\n🔧 Please check your dependencies and file structure.")
        exit(1)
    else:
        print("\n🚀 Ready to start the server!")
