"""
Backend API tests for ConnectJob Map Clustering and Stripe Escrow features
Tests: Jobs API with geo filtering, Payments API (simulated mode), Stats API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://job-marketplace-prod-1.preview.emergentagent.com/api').rstrip('/')

# Test credentials
TEST_EMAIL = "andrei.georgescu@test.com"
TEST_PASSWORD = "Parola123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestJobsAPI:
    """Tests for /api/jobs endpoint - Map clustering data source"""
    
    def test_get_jobs_returns_list(self, api_client):
        """GET /api/jobs returns jobs array with pagination"""
        response = api_client.get(f"{BASE_URL}/jobs")
        assert response.status_code == 200
        
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        assert isinstance(data["jobs"], list)
        print(f"Total jobs: {data['total']}")
    
    def test_jobs_have_geo_coordinates(self, api_client):
        """Jobs should have lat/lng for map clustering"""
        response = api_client.get(f"{BASE_URL}/jobs")
        assert response.status_code == 200
        
        jobs = response.json()["jobs"]
        jobs_with_coords = [j for j in jobs if j.get("lat") and j.get("lng")]
        
        assert len(jobs_with_coords) > 0, "No jobs with coordinates found"
        print(f"Jobs with coordinates: {len(jobs_with_coords)}/{len(jobs)}")
        
        # Verify coordinate format
        for job in jobs_with_coords[:3]:
            assert isinstance(job["lat"], (int, float))
            assert isinstance(job["lng"], (int, float))
            assert -90 <= job["lat"] <= 90, f"Invalid latitude: {job['lat']}"
            assert -180 <= job["lng"] <= 180, f"Invalid longitude: {job['lng']}"
    
    def test_jobs_have_required_fields(self, api_client):
        """Jobs should have all required fields for map display"""
        response = api_client.get(f"{BASE_URL}/jobs")
        assert response.status_code == 200
        
        jobs = response.json()["jobs"]
        assert len(jobs) > 0, "No jobs returned"
        
        required_fields = ["title", "category", "salary"]
        for job in jobs[:5]:
            for field in required_fields:
                assert field in job, f"Missing field: {field}"
    
    def test_jobs_geo_filter(self, api_client):
        """GET /api/jobs with lat/lng/radius filters jobs by distance"""
        # Cluj-Napoca coordinates
        lat, lng, radius = 46.7712, 23.6236, 10
        
        response = api_client.get(f"{BASE_URL}/jobs", params={
            "lat": lat,
            "lng": lng,
            "radius": radius
        })
        assert response.status_code == 200
        
        data = response.json()
        jobs = data["jobs"]
        
        # Jobs should have distance calculated
        for job in jobs:
            if job.get("lat") and job.get("lng"):
                assert "distance" in job, "Distance not calculated for job with coordinates"
                if job["distance"] is not None:
                    assert job["distance"] <= radius, f"Job outside radius: {job['distance']} > {radius}"
        
        print(f"Jobs within {radius}km: {len(jobs)}")
    
    def test_jobs_category_filter(self, api_client):
        """GET /api/jobs with category filter"""
        response = api_client.get(f"{BASE_URL}/jobs", params={"category": "Constructii"})
        assert response.status_code == 200
        
        jobs = response.json()["jobs"]
        # All returned jobs should match category (if any returned)
        for job in jobs:
            assert job.get("category") == "Constructii" or job.get("category") is None


class TestPaymentsAPI:
    """Tests for /api/payments - Stripe Escrow (simulated mode)"""
    
    def test_stripe_config_endpoint(self, api_client):
        """GET /api/payments/stripe-config returns configuration status"""
        response = api_client.get(f"{BASE_URL}/payments/stripe-config")
        assert response.status_code == 200
        
        data = response.json()
        assert "configured" in data
        assert "publishableKey" in data
        
        # In test environment, Stripe is not configured (simulated mode)
        print(f"Stripe configured: {data['configured']}")
        print(f"Publishable key present: {data['publishableKey'] is not None}")
    
    def test_create_payment_intent_simulated(self, authenticated_client):
        """POST /api/payments/create-intent creates simulated payment"""
        # First get a job ID
        jobs_response = authenticated_client.get(f"{BASE_URL}/jobs")
        jobs = jobs_response.json()["jobs"]
        assert len(jobs) > 0, "No jobs available for payment test"
        
        job = jobs[0]
        job_id = job.get("_id") or job.get("id")
        
        # Get user ID from login response
        login_response = authenticated_client.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        user = login_response.json()["user"]
        user_id = user.get("_id") or user.get("id")
        
        # Create payment intent
        response = authenticated_client.post(f"{BASE_URL}/payments/create-intent", json={
            "job_id": job_id,
            "payee_id": user_id,
            "amount": 100
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert "payment_id" in data
        assert "total" in data
        assert "commission" in data
        
        # In simulated mode
        if data.get("simulated"):
            assert data["client_secret"] is None
            print("Payment created in SIMULATED mode")
        
        # Verify commission calculation (5%)
        assert data["commission"] == 5.0, f"Expected 5% commission, got {data['commission']}"
        assert data["total"] == 105.0, f"Expected total 105, got {data['total']}"
        
        print(f"Payment ID: {data['payment_id']}")
        print(f"Total: {data['total']} (amount: 100 + commission: {data['commission']})")
    
    def test_create_payment_requires_auth(self, api_client):
        """POST /api/payments/create-intent requires authentication"""
        response = api_client.post(f"{BASE_URL}/payments/create-intent", json={
            "job_id": "test",
            "payee_id": "test",
            "amount": 100
        })
        assert response.status_code in [401, 403]
    
    def test_get_my_payments(self, authenticated_client):
        """GET /api/payments/my returns user's payments"""
        response = authenticated_client.get(f"{BASE_URL}/payments/my")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"User has {len(data)} payments")


class TestStatsAPI:
    """Tests for /api/stats - Dashboard statistics"""
    
    def test_dashboard_stats_requires_auth(self, api_client):
        """GET /api/stats/dashboard requires authentication"""
        response = api_client.get(f"{BASE_URL}/stats/dashboard")
        assert response.status_code in [401, 403]
    
    def test_dashboard_stats_returns_data(self, authenticated_client):
        """GET /api/stats/dashboard returns comprehensive stats"""
        response = authenticated_client.get(f"{BASE_URL}/stats/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check overview section
        assert "overview" in data
        overview = data["overview"]
        assert "total_jobs_posted" in overview
        assert "active_jobs" in overview
        assert "total_applications_sent" in overview
        
        # Check applications section
        assert "applications" in data
        
        # Check finances section
        assert "finances" in data
        finances = data["finances"]
        assert "total_paid" in finances
        assert "total_earned" in finances
        
        # Check charts section
        assert "charts" in data
        
        print(f"Jobs posted: {overview['total_jobs_posted']}")
        print(f"Active jobs: {overview['active_jobs']}")


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health returns server status"""
        response = api_client.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "ok"
    
    def test_login_success(self, api_client):
        """POST /api/auth/login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_login_invalid_credentials(self, api_client):
        """POST /api/auth/login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [400, 401]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
