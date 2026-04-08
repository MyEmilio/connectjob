import requests
import sys
import time
import json
from datetime import datetime

class ConnectJobBackendTester:
    def __init__(self, base_url="https://edb73af5-cca6-40c6-afd7-ebe5e41a0d9f.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, test_func):
        """Run a single test and track results"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            success = test_func()
            if success:
                self.tests_passed += 1
                self.passed_tests.append(name)
                print(f"✅ PASSED: {name}")
            else:
                self.failed_tests.append(name)
                print(f"❌ FAILED: {name}")
            return success
        except Exception as e:
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            print(f"❌ FAILED: {name} - Exception: {str(e)}")
            return False

    def test_health_check(self):
        """Test health check endpoint returns proper structure"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code != 200:
                print(f"❌ Health check failed with status {response.status_code}")
                return False
            
            data = response.json()
            required_fields = ['status', 'timestamp', 'version', 'database', 'uptime']
            
            for field in required_fields:
                if field not in data:
                    print(f"❌ Missing field in health check: {field}")
                    return False
            
            if data['status'] not in ['ok', 'degraded']:
                print(f"❌ Invalid status: {data['status']}")
                return False
                
            if data['database'] not in ['connected', 'connecting', 'disconnected']:
                print(f"❌ Invalid database status: {data['database']}")
                return False
                
            print(f"✅ Health check OK: {data}")
            return True
            
        except Exception as e:
            print(f"❌ Health check exception: {str(e)}")
            return False

    def test_register_invalid_email(self):
        """Test registration with invalid email (no @ symbol)"""
        try:
            payload = {
                "name": "Test User",
                "email": "invalid-email-no-at-symbol",
                "password": "validpassword123",
                "role": "worker"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/register", json=payload, timeout=10)
            
            # Should return 400 for invalid email
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and ('email' in data.get('error', '').lower() or 'invalid' in data.get('error', '').lower()):
                    print(f"✅ Correctly rejected invalid email: {data}")
                    return True
                else:
                    print(f"❌ Wrong error message for invalid email: {data}")
                    return False
            else:
                print(f"❌ Expected 400 for invalid email, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing invalid email: {str(e)}")
            return False

    def test_register_short_password(self):
        """Test registration with password less than 8 characters"""
        try:
            payload = {
                "name": "Test User",
                "email": "test@example.com",
                "password": "short",  # Only 5 characters
                "role": "worker"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/register", json=payload, timeout=10)
            
            # Should return 400 for short password
            if response.status_code == 400:
                data = response.json()
                # Check for password validation error (English or Romanian)
                error_text = str(data).lower()
                if ('password' in error_text and ('minim' in error_text or 'minimum' in error_text)) or 'parola' in error_text:
                    print(f"✅ Correctly rejected short password: {data}")
                    return True
                else:
                    print(f"❌ Wrong error message for short password: {data}")
                    return False
            else:
                print(f"❌ Expected 400 for short password, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing short password: {str(e)}")
            return False

    def test_login_missing_email(self):
        """Test login without email field"""
        try:
            payload = {
                "password": "somepassword"
                # Missing email field
            }
            
            response = requests.post(f"{self.base_url}/api/auth/login", json=payload, timeout=10)
            
            # Should return 400 for missing email
            if response.status_code == 400:
                data = response.json()
                # Check for email validation error (English or Romanian)
                error_text = str(data).lower()
                if ('email' in error_text and ('obligatoriu' in error_text or 'required' in error_text)) or 'email-ul este obligatoriu' in error_text:
                    print(f"✅ Correctly rejected missing email: {data}")
                    return True
                else:
                    print(f"❌ Wrong error message for missing email: {data}")
                    return False
            else:
                print(f"❌ Expected 400 for missing email, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing missing email: {str(e)}")
            return False

    def test_rate_limiting_auth(self):
        """Test rate limiting on auth routes (20 requests per 15min)"""
        try:
            print("🔄 Testing rate limiting (this may take a moment)...")
            
            # Make multiple rapid requests to trigger rate limiting
            payload = {
                "email": "test@example.com",
                "password": "testpassword"
            }
            
            rate_limited = False
            for i in range(25):  # Try 25 requests (should hit 20 limit)
                response = requests.post(f"{self.base_url}/api/auth/login", json=payload, timeout=5)
                
                if response.status_code == 429:  # Too Many Requests
                    print(f"✅ Rate limiting triggered after {i+1} requests")
                    data = response.json()
                    print(f"Rate limit response: {data}")
                    rate_limited = True
                    break
                elif i < 20:
                    # First 20 should be allowed (even if they fail auth)
                    if response.status_code not in [400, 401]:
                        print(f"❌ Unexpected status code {response.status_code} on request {i+1}")
                        return False
                
                # Small delay to avoid overwhelming
                time.sleep(0.1)
            
            if not rate_limited:
                print(f"❌ Rate limiting not triggered after 25 requests")
                return False
                
            return True
            
        except Exception as e:
            print(f"❌ Exception testing rate limiting: {str(e)}")
            return False

    def test_stripe_webhook_endpoint(self):
        """Test Stripe webhook endpoint exists and returns appropriate response"""
        try:
            # Test with empty body (should fail signature verification)
            response = requests.post(f"{self.base_url}/api/payments/webhook", 
                                   data=b'{}', 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            
            # Should return 400 for missing/invalid signature
            if response.status_code == 400:
                data = response.json()
                if 'error' in data:
                    print(f"✅ Webhook endpoint exists and validates signatures: {data}")
                    return True
                else:
                    print(f"❌ Webhook endpoint exists but wrong error format: {data}")
                    return False
            else:
                print(f"❌ Expected 400 for invalid webhook, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing webhook endpoint: {str(e)}")
            return False

    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        try:
            # Make an OPTIONS request to check CORS
            response = requests.options(f"{self.base_url}/api/health", timeout=10)
            
            headers = response.headers
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods', 
                'Access-Control-Allow-Headers'
            ]
            
            found_cors = False
            for header in cors_headers:
                if header in headers:
                    found_cors = True
                    break
            
            if found_cors:
                print(f"✅ CORS headers found: {dict(headers)}")
                return True
            else:
                # Try a regular GET request to see if CORS headers are present
                response = requests.get(f"{self.base_url}/api/health", timeout=10)
                headers = response.headers
                
                for header in cors_headers:
                    if header in headers:
                        print(f"✅ CORS headers found in GET response: {dict(headers)}")
                        return True
                
                print(f"❌ No CORS headers found in response: {dict(headers)}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing CORS headers: {str(e)}")
            return False

    def test_server_startup(self):
        """Test backend server starts without errors (already confirmed by health check)"""
        try:
            # If we can reach the health endpoint, server started successfully
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                print(f"✅ Backend server started successfully")
                return True
            else:
                print(f"❌ Backend server not responding properly")
                return False
        except Exception as e:
            print(f"❌ Backend server startup test failed: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ConnectJob Backend Production Readiness Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all tests
        self.run_test("Health Check Endpoint", self.test_health_check)
        self.run_test("Server Startup", self.test_server_startup)
        self.run_test("Input Validation - Invalid Email", self.test_register_invalid_email)
        self.run_test("Input Validation - Short Password", self.test_register_short_password)
        self.run_test("Input Validation - Missing Email", self.test_login_missing_email)
        self.run_test("Rate Limiting on Auth Routes", self.test_rate_limiting_auth)
        self.run_test("Stripe Webhook Endpoint", self.test_stripe_webhook_endpoint)
        self.run_test("CORS Headers", self.test_cors_headers)
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        if self.passed_tests:
            print(f"\n✅ Passed Tests:")
            for test in self.passed_tests:
                print(f"  - {test}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ConnectJobBackendTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())