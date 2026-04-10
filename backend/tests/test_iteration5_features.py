"""
Iteration 5 Backend Tests - ConnectJob Marketplace
Tests for: Translation API, Commission rate (3%), Escrow, Jobs, Auth
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://job-marketplace-prod-1.preview.emergentagent.com')
if BASE_URL.endswith('/api'):
    BASE_URL = BASE_URL[:-4]  # Remove /api suffix if present

# Test credentials
TEST_EMAIL = "andrei.georgescu@test.com"
TEST_PASSWORD = "Parola123!"


class TestHealthAndConfig:
    """Health and configuration endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        print(f"✓ Health check passed: {data}")
    
    def test_translate_status_endpoint(self):
        """Test /api/translate/status returns configured:true"""
        response = requests.get(f"{BASE_URL}/api/translate/status")
        assert response.status_code == 200
        data = response.json()
        assert data["configured"] == True
        assert data["model"] == "gpt-4o-mini"
        assert data["languages"] == 11
        print(f"✓ Translation status: {data}")


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful: {data['user']['name']} (role: {data['user']['role']})")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


class TestTranslationAPI:
    """Translation API tests - GPT-4o-mini via Emergent proxy"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Authentication failed")
    
    def test_translate_romanian_to_spanish(self):
        """Test POST /api/translate - Romanian to Spanish"""
        response = requests.post(f"{BASE_URL}/api/translate", 
            headers=self.headers,
            json={
                "text": "Bună ziua! Sunt interesat de acest job.",
                "target_lang": "es"
            },
            timeout=15  # LLM calls may take time
        )
        assert response.status_code == 200
        data = response.json()
        assert "translated" in data
        assert data["source_lang"] == "ro"
        assert data["target_lang"] == "es"
        assert data["same_language"] == False
        # Check translation contains Spanish words
        assert any(word in data["translated"].lower() for word in ["hola", "interesado", "trabajo", "este"])
        print(f"✓ Translation: '{data['translated']}'")
    
    def test_translate_same_language(self):
        """Test translation when source and target are same"""
        response = requests.post(f"{BASE_URL}/api/translate",
            headers=self.headers,
            json={
                "text": "Hello world",
                "target_lang": "en",
                "source_lang": "en"
            },
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert data["same_language"] == True
        assert data["translated"] == "Hello world"
        print(f"✓ Same language detection works")
    
    def test_translate_batch_messages(self):
        """Test POST /api/translate/batch - multiple messages"""
        response = requests.post(f"{BASE_URL}/api/translate/batch",
            headers=self.headers,
            json={
                "messages": [
                    {"id": 1, "text": "Bună ziua!"},
                    {"id": 2, "text": "Ești disponibil mâine?"},
                    {"id": 3, "text": "Mulțumesc pentru răspuns."}
                ],
                "target_lang": "es"
            },
            timeout=20
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        for item in data:
            assert "id" in item
            assert "translated" in item
            assert "source_lang" in item
        print(f"✓ Batch translation: {len(data)} messages translated")
    
    def test_translate_requires_auth(self):
        """Test that translation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/translate",
            json={"text": "Test", "target_lang": "es"}
        )
        assert response.status_code == 401
        print("✓ Translation requires auth token")
    
    def test_translate_missing_params(self):
        """Test translation with missing parameters"""
        response = requests.post(f"{BASE_URL}/api/translate",
            headers=self.headers,
            json={"text": "Test"}  # Missing target_lang
        )
        assert response.status_code == 400
        print("✓ Missing params rejected correctly")


class TestJobsAPI:
    """Jobs API tests"""
    
    def test_get_jobs_list(self):
        """Test GET /api/jobs returns jobs"""
        response = requests.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        jobs = data.get("jobs", data)
        assert isinstance(jobs, list)
        assert len(jobs) >= 15  # Should have 15 seeded jobs
        print(f"✓ Jobs list: {len(jobs)} jobs found")
        return jobs
    
    def test_jobs_have_coordinates(self):
        """Test that jobs have lat/lng for map display"""
        response = requests.get(f"{BASE_URL}/api/jobs")
        data = response.json()
        jobs = data.get("jobs", data)
        jobs_with_coords = [j for j in jobs if j.get("lat") and j.get("lng")]
        assert len(jobs_with_coords) >= 10
        print(f"✓ Jobs with coordinates: {len(jobs_with_coords)}")


class TestPaymentsAndCommission:
    """Payments API tests - verify 3% commission"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and job for payment tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.user_id = response.json()["user"]["_id"]
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Authentication failed")
        
        # Get a job for testing
        jobs_response = requests.get(f"{BASE_URL}/api/jobs")
        if jobs_response.status_code == 200:
            jobs = jobs_response.json().get("jobs", jobs_response.json())
            if jobs:
                self.test_job = jobs[0]
    
    def test_stripe_config_demo_mode(self):
        """Test GET /api/payments/stripe-config returns demo mode"""
        response = requests.get(f"{BASE_URL}/api/payments/stripe-config")
        assert response.status_code == 200
        data = response.json()
        assert data["configured"] == False  # Stripe not configured = demo mode
        print(f"✓ Stripe config: demo mode (configured={data['configured']})")
    
    def test_create_payment_3_percent_commission(self):
        """Test POST /api/payments/create-intent uses 3% commission"""
        if not hasattr(self, 'test_job'):
            pytest.skip("No test job available")
        
        test_amount = 100  # 100 RON
        expected_commission = 3  # 3% of 100 = 3 RON
        
        response = requests.post(f"{BASE_URL}/api/payments/create-intent",
            headers=self.headers,
            json={
                "job_id": self.test_job["_id"],
                "payee_id": self.user_id,  # Using self as payee for test
                "amount": test_amount,
                "method": "card"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "payment_id" in data
        assert data["simulated"] == True  # Demo mode
        assert data["commission"] == expected_commission
        assert data["total"] == test_amount + expected_commission
        print(f"✓ Payment created: amount={test_amount}, commission={data['commission']} (3%), total={data['total']}")
        return data["payment_id"]
    
    def test_commission_calculation_various_amounts(self):
        """Test 3% commission calculation for various amounts"""
        if not hasattr(self, 'test_job'):
            pytest.skip("No test job available")
        
        test_cases = [
            (200, 6),    # 200 * 0.03 = 6
            (500, 15),   # 500 * 0.03 = 15
            (1000, 30),  # 1000 * 0.03 = 30
        ]
        
        for amount, expected_commission in test_cases:
            response = requests.post(f"{BASE_URL}/api/payments/create-intent",
                headers=self.headers,
                json={
                    "job_id": self.test_job["_id"],
                    "payee_id": self.user_id,
                    "amount": amount,
                    "method": "card"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["commission"] == expected_commission, f"Expected {expected_commission}, got {data['commission']}"
            print(f"✓ Amount {amount} RON → Commission {data['commission']} RON (3%)")


class TestMessagesAPI:
    """Messages/Chat API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Authentication failed")
    
    def test_get_conversations(self):
        """Test GET /api/messages/conversations"""
        response = requests.get(f"{BASE_URL}/api/messages/conversations",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Conversations endpoint works: {len(data)} conversations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
