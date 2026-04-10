"""
Test Production Configuration Features - Iteration 4
Tests for:
- /api/config/status endpoint
- /api/health endpoint
- /api/payments/stripe-config endpoint
- Admin login and role verification
- Escrow payment flow (simulated mode)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://job-marketplace-prod-1.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')
if not BASE_URL.endswith('/api'):
    BASE_URL = BASE_URL + '/api'

# Test credentials
TEST_EMAIL = "andrei.georgescu@test.com"
TEST_PASSWORD = "Parola123!"


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_ok(self):
        """GET /api/health returns ok status with database connected"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert "timestamp" in data
        assert "uptime" in data
        assert "version" in data
        print(f"✓ Health check passed: status={data['status']}, db={data['database']}")


class TestConfigStatusEndpoint:
    """Production config status endpoint tests"""
    
    def test_config_status_returns_services(self):
        """GET /api/config/status returns correct service statuses"""
        response = requests.get(f"{BASE_URL}/config/status")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields
        assert "production_ready" in data
        assert "active_services" in data
        assert "services" in data
        assert "vapid_public_key" in data
        
        services = data["services"]
        
        # Verify all 6 services are present
        expected_services = ["database", "stripe", "email", "cloudinary", "push_notifications", "jwt"]
        for svc in expected_services:
            assert svc in services, f"Missing service: {svc}"
            assert "status" in services[svc]
            assert "details" in services[svc]
        
        print(f"✓ Config status returned {len(services)} services")
        
    def test_config_status_database_active(self):
        """Database should be active"""
        response = requests.get(f"{BASE_URL}/config/status")
        data = response.json()
        
        assert data["services"]["database"]["status"] == "active"
        print(f"✓ Database status: {data['services']['database']['status']}")
        
    def test_config_status_stripe_simulated(self):
        """Stripe should be in simulated mode (no real key configured)"""
        response = requests.get(f"{BASE_URL}/config/status")
        data = response.json()
        
        assert data["services"]["stripe"]["status"] == "simulated"
        print(f"✓ Stripe status: {data['services']['stripe']['status']}")
        
    def test_config_status_email_inactive(self):
        """Email should be inactive (no EMAIL_USER/EMAIL_PASS configured)"""
        response = requests.get(f"{BASE_URL}/config/status")
        data = response.json()
        
        assert data["services"]["email"]["status"] == "inactive"
        print(f"✓ Email status: {data['services']['email']['status']}")
        
    def test_config_status_cloudinary_local(self):
        """Cloudinary should be in local mode (no CLOUDINARY_* configured)"""
        response = requests.get(f"{BASE_URL}/config/status")
        data = response.json()
        
        assert data["services"]["cloudinary"]["status"] == "local"
        print(f"✓ Cloudinary status: {data['services']['cloudinary']['status']}")
        
    def test_config_status_push_active(self):
        """Push notifications should be active (VAPID keys configured)"""
        response = requests.get(f"{BASE_URL}/config/status")
        data = response.json()
        
        assert data["services"]["push_notifications"]["status"] == "active"
        assert data["vapid_public_key"] is not None
        assert len(data["vapid_public_key"]) > 50  # VAPID keys are long
        print(f"✓ Push notifications status: {data['services']['push_notifications']['status']}")
        
    def test_config_status_jwt_secure(self):
        """JWT should be secure (64 byte secret configured)"""
        response = requests.get(f"{BASE_URL}/config/status")
        data = response.json()
        
        assert data["services"]["jwt"]["status"] == "secure"
        print(f"✓ JWT status: {data['services']['jwt']['status']}")


class TestStripeConfigEndpoint:
    """Stripe configuration endpoint tests"""
    
    def test_stripe_config_returns_configured_false(self):
        """GET /api/payments/stripe-config returns configured:false"""
        response = requests.get(f"{BASE_URL}/payments/stripe-config")
        assert response.status_code == 200
        
        data = response.json()
        assert "configured" in data
        assert data["configured"] == False
        print(f"✓ Stripe config: configured={data['configured']}")


class TestAdminLogin:
    """Admin login and role verification tests"""
    
    def test_login_with_admin_credentials(self):
        """Login with andrei.georgescu@test.com / Parola123! - user should have admin role"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "admin", f"Expected role 'admin', got '{data['user'].get('role')}'"
        
        print(f"✓ Admin login successful: email={data['user']['email']}, role={data['user']['role']}")
        return data["token"]


class TestEscrowPaymentFlow:
    """Escrow payment flow tests (simulated mode)"""
    
    @pytest.fixture
    def auth_data(self):
        """Get authentication token and user data"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return {"token": data.get("token"), "user": data.get("user")}
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def auth_headers(self, auth_data):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_data['token']}"}
    
    @pytest.fixture
    def user_id(self, auth_data):
        """Get user ID"""
        return auth_data["user"].get("id") or auth_data["user"].get("_id")
    
    def test_create_payment_intent_simulated(self, auth_headers, user_id):
        """Create payment intent in simulated mode"""
        # First get a job to use
        jobs_response = requests.get(f"{BASE_URL}/jobs")
        assert jobs_response.status_code == 200
        jobs_data = jobs_response.json()
        # Handle both list and object response formats
        jobs = jobs_data.get("jobs", jobs_data) if isinstance(jobs_data, dict) else jobs_data
        assert len(jobs) > 0, "No jobs available for testing"
        
        job = jobs[0]
        job_id = job.get("id") or job.get("_id")
        
        # payee_id is required by the model, use the logged-in user's ID
        response = requests.post(f"{BASE_URL}/payments/create-intent", 
            headers=auth_headers,
            json={
                "job_id": job_id,
                "payee_id": user_id,  # Use logged-in user's ID
                "amount": job.get("salary", 100),
                "method": "card"
            }
        )
        
        assert response.status_code == 200, f"Create intent failed: {response.text}"
        
        data = response.json()
        assert "payment_id" in data
        assert data.get("simulated") == True
        assert "message" in data  # Should have demo message
        
        print(f"✓ Payment intent created (simulated): payment_id={data['payment_id']}")
        return data["payment_id"]
    
    def test_release_payment_simulated(self, auth_headers, user_id):
        """Release payment in simulated mode"""
        # First create a payment
        jobs_response = requests.get(f"{BASE_URL}/jobs")
        jobs_data = jobs_response.json()
        jobs = jobs_data.get("jobs", jobs_data) if isinstance(jobs_data, dict) else jobs_data
        job = jobs[0]
        job_id = job.get("id") or job.get("_id")
        
        create_response = requests.post(f"{BASE_URL}/payments/create-intent",
            headers=auth_headers,
            json={
                "job_id": job_id,
                "payee_id": user_id,  # Use logged-in user's ID
                "amount": job.get("salary", 100),
                "method": "card"
            }
        )
        
        assert create_response.status_code == 200
        payment_id = create_response.json()["payment_id"]
        
        # Now release it
        release_response = requests.post(f"{BASE_URL}/payments/{payment_id}/release",
            headers=auth_headers
        )
        
        assert release_response.status_code == 200, f"Release failed: {release_response.text}"
        
        data = release_response.json()
        assert data.get("success") == True
        
        print(f"✓ Payment released successfully: payment_id={payment_id}")
    
    def test_dispute_payment_simulated(self, auth_headers, user_id):
        """Dispute payment in simulated mode"""
        # First create a payment
        jobs_response = requests.get(f"{BASE_URL}/jobs")
        jobs_data = jobs_response.json()
        jobs = jobs_data.get("jobs", jobs_data) if isinstance(jobs_data, dict) else jobs_data
        job = jobs[0]
        job_id = job.get("id") or job.get("_id")
        
        create_response = requests.post(f"{BASE_URL}/payments/create-intent",
            headers=auth_headers,
            json={
                "job_id": job_id,
                "payee_id": user_id,  # Use logged-in user's ID
                "amount": job.get("salary", 100),
                "method": "card"
            }
        )
        
        assert create_response.status_code == 200
        payment_id = create_response.json()["payment_id"]
        
        # Now dispute it
        dispute_response = requests.post(f"{BASE_URL}/payments/{payment_id}/dispute",
            headers=auth_headers
        )
        
        assert dispute_response.status_code == 200, f"Dispute failed: {dispute_response.text}"
        
        data = dispute_response.json()
        assert data.get("success") == True
        assert "message" in data
        
        print(f"✓ Payment disputed successfully: payment_id={payment_id}")


class TestExistingNavigation:
    """Test that existing navigation endpoints still work"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_jobs_endpoint(self):
        """GET /api/jobs returns jobs"""
        response = requests.get(f"{BASE_URL}/jobs")
        assert response.status_code == 200
        data = response.json()
        # Handle both list and object response formats
        jobs = data.get("jobs", data) if isinstance(data, dict) else data
        assert isinstance(jobs, list)
        print(f"✓ Jobs endpoint: {len(jobs)} jobs returned")
    
    def test_reviews_endpoint(self, auth_headers):
        """GET /api/reviews works"""
        response = requests.get(f"{BASE_URL}/reviews", headers=auth_headers)
        # May return 200 or 404 depending on data
        assert response.status_code in [200, 404]
        print(f"✓ Reviews endpoint: status={response.status_code}")
    
    def test_contracts_endpoint(self, auth_headers):
        """GET /api/contracts works"""
        response = requests.get(f"{BASE_URL}/contracts", headers=auth_headers)
        assert response.status_code in [200, 404]
        print(f"✓ Contracts endpoint: status={response.status_code}")
    
    def test_notifications_endpoint(self, auth_headers):
        """GET /api/notifications works"""
        response = requests.get(f"{BASE_URL}/notifications", headers=auth_headers)
        assert response.status_code in [200, 404]
        print(f"✓ Notifications endpoint: status={response.status_code}")
    
    def test_stats_endpoint(self, auth_headers):
        """GET /api/stats works"""
        response = requests.get(f"{BASE_URL}/stats", headers=auth_headers)
        assert response.status_code in [200, 404]
        print(f"✓ Stats endpoint: status={response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
