"""
Iteration 7 Tests: Zod Validation + Auth Flows
- Register with Zod validation (email, password strength)
- Login with Zod validation
- Forgot password flow
- Reset password flow
- Email verification flow
- Full password reset E2E flow
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://job-marketplace-prod-1.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "andrei.georgescu@test.com"
ADMIN_PASSWORD = "Parola123!"


class TestZodValidationRegister:
    """Test Zod validation on POST /api/auth/register"""
    
    def test_register_invalid_email_format(self):
        """Register with invalid email format returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "not-an-email",
            "password": "ValidPass123!",
            "role": "worker"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "email" in data["error"].lower() or "invalid" in data["error"].lower()
        print(f"PASS: Invalid email format returns 400 with error: {data['error']}")
    
    def test_register_short_password(self):
        """Register with password < 8 chars returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "Short1",
            "role": "worker"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "8" in data["error"] or "caractere" in data["error"].lower()
        print(f"PASS: Short password returns 400 with error: {data['error']}")
    
    def test_register_password_no_uppercase(self):
        """Register with password without uppercase returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "lowercase123",
            "role": "worker"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "majuscul" in data["error"].lower() or "uppercase" in data["error"].lower()
        print(f"PASS: Password without uppercase returns 400 with error: {data['error']}")
    
    def test_register_password_no_digit(self):
        """Register with password without digit returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "NoDigitsHere",
            "role": "worker"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "cifr" in data["error"].lower() or "digit" in data["error"].lower()
        print(f"PASS: Password without digit returns 400 with error: {data['error']}")
    
    def test_register_short_name(self):
        """Register with name < 2 chars returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "A",
            "email": "test@example.com",
            "password": "ValidPass123!",
            "role": "worker"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Short name returns 400 with error: {data['error']}")
    
    def test_register_valid_data_creates_user(self):
        """Register with valid data creates user and returns token + verify_url"""
        unique_email = f"test_iter7_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User Iter7",
            "email": unique_email,
            "password": "ValidPass123!",
            "role": "worker"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "verify_url" in data  # Email verification URL returned
        assert data["user"]["email"] == unique_email
        assert data["user"]["email_verified"] == False  # New users not verified
        print(f"PASS: Valid registration returns token and verify_url: {data['verify_url'][:50]}...")
        return data  # Return for use in other tests


class TestZodValidationLogin:
    """Test Zod validation on POST /api/auth/login"""
    
    def test_login_invalid_email_format(self):
        """Login with invalid email format returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "not-an-email",
            "password": "SomePassword123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "email" in data["error"].lower() or "invalid" in data["error"].lower()
        print(f"PASS: Invalid email format on login returns 400 with error: {data['error']}")
    
    def test_login_empty_password(self):
        """Login with empty password returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Empty password on login returns 400 with error: {data['error']}")
    
    def test_login_wrong_password(self):
        """Login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        print(f"PASS: Wrong password returns 401 with error: {data['error']}")
    
    def test_login_valid_credentials(self):
        """Login with valid credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"PASS: Valid login returns token for user: {data['user']['email']}")
        return data["token"]


class TestForgotPasswordFlow:
    """Test POST /api/auth/forgot-password"""
    
    def test_forgot_password_invalid_email_format(self):
        """Forgot password with invalid email returns Zod error"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "not-an-email"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Invalid email format on forgot-password returns 400 with error: {data['error']}")
    
    def test_forgot_password_nonexistent_email(self):
        """Forgot password with non-existent email still returns success (anti-enumeration)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_user_12345@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # Should NOT return reset_url for non-existent users
        print(f"PASS: Non-existent email returns success (anti-enumeration): {data.get('message', '')}")
    
    def test_forgot_password_valid_email(self):
        """Forgot password with valid email returns success + reset_url"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "reset_url" in data  # URL returned for testing (email not configured)
        assert "token=" in data["reset_url"]
        print(f"PASS: Valid email returns reset_url: {data['reset_url'][:60]}...")
        return data["reset_url"]


class TestVerifyResetToken:
    """Test GET /api/auth/verify-reset-token/:token"""
    
    def test_verify_invalid_token(self):
        """Verify reset token with invalid token returns valid:false"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/invalid_token_12345")
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == False
        print(f"PASS: Invalid reset token returns valid:false")
    
    def test_verify_valid_token(self):
        """Verify reset token with valid token returns valid:true"""
        # First get a valid reset token
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        reset_url = forgot_response.json().get("reset_url", "")
        if "token=" in reset_url:
            token = reset_url.split("token=")[1].split("&")[0]
            response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/{token}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("valid") == True
            print(f"PASS: Valid reset token returns valid:true")
        else:
            pytest.skip("Could not get reset token from forgot-password")


class TestResetPassword:
    """Test POST /api/auth/reset-password"""
    
    def test_reset_password_invalid_token(self):
        """Reset password with invalid token returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "password": "NewValidPass123!"
        })
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Invalid token on reset-password returns 400 with error: {data['error']}")
    
    def test_reset_password_weak_password(self):
        """Reset password with weak password returns Zod error"""
        # First get a valid reset token
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        reset_url = forgot_response.json().get("reset_url", "")
        if "token=" in reset_url:
            token = reset_url.split("token=")[1].split("&")[0]
            
            # Try with weak password (no uppercase)
            response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
                "token": token,
                "password": "weakpassword123"
            })
            assert response.status_code == 400
            data = response.json()
            assert "error" in data
            print(f"PASS: Weak password on reset returns 400 with error: {data['error']}")
        else:
            pytest.skip("Could not get reset token from forgot-password")
    
    def test_reset_password_short_password(self):
        """Reset password with short password returns Zod error"""
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        reset_url = forgot_response.json().get("reset_url", "")
        if "token=" in reset_url:
            token = reset_url.split("token=")[1].split("&")[0]
            
            response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
                "token": token,
                "password": "Short1"
            })
            assert response.status_code == 400
            data = response.json()
            assert "error" in data
            assert "8" in data["error"] or "caractere" in data["error"].lower()
            print(f"PASS: Short password on reset returns 400 with error: {data['error']}")
        else:
            pytest.skip("Could not get reset token from forgot-password")


class TestVerifyEmail:
    """Test GET /api/auth/verify-email/:token"""
    
    def test_verify_email_invalid_token(self):
        """Verify email with invalid token returns 400"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid_token_12345")
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Invalid email verify token returns 400 with error: {data['error']}")


class TestResendVerification:
    """Test POST /api/auth/resend-verification"""
    
    def test_resend_verification_without_auth(self):
        """Resend verification without auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/resend-verification")
        assert response.status_code == 401
        print(f"PASS: Resend verification without auth returns 401")
    
    def test_resend_verification_with_auth(self):
        """Resend verification with auth token works"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json().get("token")
        
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Admin is already verified, so should return "already verified" message
        # or success with verify_url
        assert "message" in data or "verify_url" in data
        print(f"PASS: Resend verification with auth returns: {data}")


class TestFullPasswordResetE2E:
    """Full E2E test: forgot-password -> get token -> reset-password -> login with new password"""
    
    def test_full_password_reset_flow(self):
        """Complete password reset flow for a test user"""
        # Step 1: Create a new test user
        unique_email = f"test_reset_{uuid.uuid4().hex[:8]}@example.com"
        original_password = "OriginalPass123!"
        new_password = "NewSecurePass456!"
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Reset Test User",
            "email": unique_email,
            "password": original_password,
            "role": "worker"
        })
        assert register_response.status_code == 200
        print(f"Step 1: Created test user: {unique_email}")
        
        # Step 2: Request password reset
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": unique_email
        })
        assert forgot_response.status_code == 200
        reset_url = forgot_response.json().get("reset_url", "")
        assert "token=" in reset_url
        token = reset_url.split("token=")[1].split("&")[0]
        print(f"Step 2: Got reset token from forgot-password")
        
        # Step 3: Verify token is valid
        verify_response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/{token}")
        assert verify_response.json().get("valid") == True
        print(f"Step 3: Token verified as valid")
        
        # Step 4: Reset password
        reset_response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "password": new_password
        })
        assert reset_response.status_code == 200
        assert reset_response.json().get("success") == True
        print(f"Step 4: Password reset successful")
        
        # Step 5: Login with OLD password should fail
        old_login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": original_password
        })
        assert old_login_response.status_code == 401
        print(f"Step 5: Old password correctly rejected")
        
        # Step 6: Login with NEW password should succeed
        new_login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": new_password
        })
        assert new_login_response.status_code == 200
        assert "token" in new_login_response.json()
        print(f"Step 6: New password login successful")
        
        # Step 7: Token should be used (can't reuse)
        verify_again_response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/{token}")
        assert verify_again_response.json().get("valid") == False
        print(f"Step 7: Token correctly marked as used")
        
        print(f"PASS: Full password reset E2E flow completed successfully!")


class TestEmailVerificationE2E:
    """Test email verification flow"""
    
    def test_email_verification_flow(self):
        """Register -> get verify_url -> verify email"""
        # Step 1: Register new user
        unique_email = f"test_verify_{uuid.uuid4().hex[:8]}@example.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Verify Test User",
            "email": unique_email,
            "password": "ValidPass123!",
            "role": "worker"
        })
        assert register_response.status_code == 200
        data = register_response.json()
        assert "verify_url" in data
        verify_url = data["verify_url"]
        token = verify_url.split("token=")[1].split("&")[0]
        print(f"Step 1: Registered user with verify_url")
        
        # Step 2: Verify email
        verify_response = requests.get(f"{BASE_URL}/api/auth/verify-email/{token}")
        assert verify_response.status_code == 200
        assert verify_response.json().get("success") == True
        print(f"Step 2: Email verified successfully")
        
        # Step 3: Token should be used (can't reuse)
        verify_again_response = requests.get(f"{BASE_URL}/api/auth/verify-email/{token}")
        assert verify_again_response.status_code == 400
        print(f"Step 3: Token correctly marked as used")
        
        print(f"PASS: Email verification E2E flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
