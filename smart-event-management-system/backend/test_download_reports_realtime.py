import requests

BACKEND_URL = "http://127.0.0.1:8000"

def test_reports():
    print("=== TESTING REAL-TIME DOWNLOADABLE REPORTS ===")
    
    # 1. Login as Admin
    r = requests.post(
        f"{BACKEND_URL}/api/auth/email/verify-login-otp",
        json={"email": "admin@test.com", "role": "admin", "otp_code": "000000"},
        timeout=10
    )
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Test Faculty Report PDF Download
    res_fac = requests.get(f"{BACKEND_URL}/api/admin/reports/faculty/all/pdf", headers=admin_headers, timeout=10)
    print(f"Faculty Report PDF: Status={res_fac.status_code}, Content-Type={res_fac.headers.get('content-type')}, Bytes={len(res_fac.content)}")
    assert res_fac.status_code == 200
    assert res_fac.content.startswith(b"%PDF"), "Response is not a valid PDF document"
    
    # 3. Test Student Report PDF Download
    res_stu = requests.get(f"{BACKEND_URL}/api/faculty/reports/students/all/pdf", headers=admin_headers, timeout=10)
    print(f"Student Report PDF: Status={res_stu.status_code}, Content-Type={res_stu.headers.get('content-type')}, Bytes={len(res_stu.content)}")
    assert res_stu.status_code == 200
    assert res_stu.content.startswith(b"%PDF"), "Response is not a valid PDF document"
    
    # 4. Test Volunteer Report PDF Download
    res_vol = requests.get(f"{BACKEND_URL}/api/faculty/reports/volunteers/all/pdf", headers=admin_headers, timeout=10)
    print(f"Volunteer Report PDF: Status={res_vol.status_code}, Content-Type={res_vol.headers.get('content-type')}, Bytes={len(res_vol.content)}")
    assert res_vol.status_code == 200
    assert res_vol.content.startswith(b"%PDF"), "Response is not a valid PDF document"
    
    print("\nALL REAL-TIME DOWNLOADABLE REPORTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_reports()
