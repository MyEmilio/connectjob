"""
ConnectJob API Tests - Post-Refactoring Validation
Tests all major API endpoints after App.js refactoring
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://job-marketplace-prod-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "andrei.georgescu@test.com"
TEST_PASSWORD = "Parola123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token - shared across all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.fail("Authentication failed - cannot proceed with tests")


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert "database" in data
        print(f"Health check passed: {data}")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"Login successful for: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [400, 401]
        print("Invalid login correctly rejected")


class TestJobsAPI:
    """Jobs endpoint tests"""
    
    def test_get_jobs_list(self):
        """Test fetching jobs list"""
        response = requests.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        jobs = data.get("jobs", data)
        assert isinstance(jobs, list)
        assert len(jobs) > 0
        print(f"Found {len(jobs)} jobs")
    
    def test_jobs_have_required_fields(self):
        """Test that jobs have required fields"""
        response = requests.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        jobs = data.get("jobs", data)
        
        required_fields = ["title", "category", "salary"]
        for job in jobs[:5]:  # Check first 5 jobs
            for field in required_fields:
                assert field in job, f"Job missing field: {field}"
        print("All jobs have required fields")
    
    def test_jobs_have_coordinates(self):
        """Test that jobs have lat/lng for map clustering"""
        response = requests.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        jobs = data.get("jobs", data)
        
        jobs_with_coords = [j for j in jobs if j.get("lat") and j.get("lng")]
        print(f"Jobs with coordinates: {len(jobs_with_coords)}/{len(jobs)}")
        assert len(jobs_with_coords) > 0, "No jobs have coordinates"
    
    def test_jobs_category_filter(self):
        """Test category filter on jobs"""
        response = requests.get(f"{BASE_URL}/api/jobs", params={"category": "transport"})
        assert response.status_code == 200
        data = response.json()
        jobs = data.get("jobs", data)
        print(f"Transport category jobs: {len(jobs)}")
    
    def test_jobs_geo_filter(self):
        """Test geo filter with lat/lng/radius"""
        response = requests.get(f"{BASE_URL}/api/jobs", params={
            "lat": 46.7712,
            "lng": 23.6236,
            "radius": 50
        })
        assert response.status_code == 200
        data = response.json()
        jobs = data.get("jobs", data)
        print(f"Jobs within 50km radius: {len(jobs)}")


class TestPaymentsAPI:
    """Payments/Escrow endpoint tests"""
    
    def test_stripe_config(self):
        """Test Stripe configuration endpoint"""
        response = requests.get(f"{BASE_URL}/api/payments/stripe-config")
        assert response.status_code == 200
        data = response.json()
        # Should return configured status (true or false for simulated mode)
        assert "configured" in data
        print(f"Stripe configured: {data.get('configured')}")
    
    def test_create_payment_requires_auth(self):
        """Test that payment creation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/payments/create-intent", json={
            "amount": 100,
            "jobId": "test123"
        })
        assert response.status_code in [401, 403]
        print("Payment creation correctly requires auth")
    
    def test_create_payment_with_auth(self, auth_token):
        """Test payment creation with authentication"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/payments/create-intent", 
            json={"amount": 100, "jobId": "test123"},
            headers=headers
        )
        # Should succeed or return validation error (not auth error)
        assert response.status_code in [200, 201, 400]
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"Payment created: {data.get('paymentId', 'N/A')}")
    
    def test_get_my_payments(self, auth_token):
        """Test fetching user's payments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/payments/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # API returns list directly
        payments = data if isinstance(data, list) else data.get("payments", [])
        print(f"User has {len(payments)} payments")


class TestDashboardStats:
    """Dashboard statistics endpoint tests"""
    
    def test_dashboard_stats_requires_auth(self):
        """Test that dashboard stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code in [401, 403]
        print("Dashboard stats correctly requires auth")
    
    def test_dashboard_stats_with_auth(self, auth_token):
        """Test fetching dashboard stats with authentication"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Should have some stats fields
        print(f"Dashboard stats: {list(data.keys())[:5]}...")


class TestMessagesAPI:
    """Messages/Chat endpoint tests"""
    
    def test_get_conversations(self, auth_token):
        """Test fetching user conversations"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/conversations", headers=headers)
        # Should return 200 or 404 if no conversations
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"User has conversations: {len(data) if isinstance(data, list) else 'N/A'}")


class TestUserProfile:
    """User profile endpoint tests"""
    
    def test_get_user_profile(self, auth_token):
        """Test fetching user profile via /api/auth/me"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == TEST_EMAIL
        print(f"User profile: {data.get('name')}, verified: {data.get('verified')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
