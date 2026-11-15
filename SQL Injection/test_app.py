import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure current dir is in path
sys.path.insert(0, str(Path(__file__).parent))

from main import app, init_db

client = TestClient(app)

def test_full_flow():
    print("=== Running SQL Injection Module Verification Suite ===")

    # 1. Reset Database
    res = client.post("/reset")
    assert res.status_code == 200, f"Reset failed: {res.text}"
    print("[PASS] Database reset endpoint works.")

    # 2. Verify Seeded Users
    res = client.get("/api/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 2, f"Expected 2 users, got {len(users)}"
    print(f"[PASS] Seeded users verified: {[u['username'] for u in users]}")

    # 3. Test Legitimate Login on both endpoints
    res_vuln_alice = client.post("/login/vulnerable", json={"username": "alice", "password": "alice123"})
    assert res_vuln_alice.status_code == 200
    assert res_vuln_alice.json()["authenticated"] is True
    assert res_vuln_alice.json()["user"]["username"] == "alice"
    assert res_vuln_alice.json()["user"]["role"] == "user"

    res_sec_alice = client.post("/login/secure", json={"username": "alice", "password": "alice123"})
    assert res_sec_alice.status_code == 200
    assert res_sec_alice.json()["authenticated"] is True
    assert res_sec_alice.json()["user"]["username"] == "alice"
    print("[PASS] Legitimate login works on both vulnerable and secure endpoints.")

    # 4. Test Attack Scenario: Comment Truncation (admin' --)
    res_vuln_bypass = client.post("/login/vulnerable", json={"username": "admin' --", "password": "wrongpassword"})
    assert res_vuln_bypass.status_code == 200
    data_vuln = res_vuln_bypass.json()
    assert data_vuln["authenticated"] is True, "Vulnerable endpoint failed to bypass auth!"
    assert data_vuln["user"]["username"] == "admin"
    assert data_vuln["user"]["role"] == "admin"
    print(f"[PASS] Vulnerable endpoint bypass (admin' --): ACCESS GRANTED as {data_vuln['user']['username']}")

    res_sec_bypass = client.post("/login/secure", json={"username": "admin' --", "password": "wrongpassword"})
    assert res_sec_bypass.status_code == 200
    data_sec = res_sec_bypass.json()
    assert data_sec["authenticated"] is False, "Secure endpoint incorrectly allowed auth bypass!"
    assert "query_executed" in data_sec
    assert "template" in data_sec["query_executed"]
    assert data_sec["query_executed"]["bound_parameters"] == ["admin' --", "wrongpassword"]
    print("[PASS] Secure endpoint properly blocked bypass (admin' --): ACCESS DENIED.")

    # 5. Test Attack Scenario: Tautology (' OR '1'='1)
    res_vuln_tautology = client.post("/login/vulnerable", json={"username": "' OR '1'='1", "password": "' OR '1'='1"})
    assert res_vuln_tautology.status_code == 200
    assert res_vuln_tautology.json()["authenticated"] is True
    assert res_vuln_tautology.json()["user"]["username"] == "admin"
    print("[PASS] Vulnerable endpoint tautology bypass (' OR '1'='1'): ACCESS GRANTED as admin.")

    res_sec_tautology = client.post("/login/secure", json={"username": "' OR '1'='1", "password": "' OR '1'='1"})
    assert res_sec_tautology.status_code == 200
    assert res_sec_tautology.json()["authenticated"] is False
    print("[PASS] Secure endpoint properly blocked tautology (' OR '1'='1'): ACCESS DENIED.")

    # 6. Test Syntax Error Leakage (admin')
    res_syntax_err = client.post("/login/vulnerable", json={"username": "admin'", "password": "any"})
    assert res_syntax_err.status_code == 400
    err_json = res_syntax_err.json()
    assert "SQLite Syntax" in err_json["error"] or "unrecognized token" in err_json["error"]
    print(f"[PASS] Malformed SQL error safely caught (HTTP 400): {err_json['error']}")

    # 7. Test Dashboard HTML Endpoint
    res_html = client.get("/")
    assert res_html.status_code == 200
    assert "SQL Injection Laboratory" in res_html.text
    assert "Tanishq Garg" in res_html.text
    print("[PASS] Dashboard GET / returns complete HTML successfully.")

    # 8. Test Modular Static Assets
    res_css = client.get("/static/css/style.css")
    assert res_css.status_code == 200
    assert "@import" in res_css.text

    res_api_js = client.get("/static/js/api.js")
    assert res_api_js.status_code == 200
    assert "ApiService" in res_api_js.text

    res_inspector_js = client.get("/static/js/inspector.js")
    assert res_inspector_js.status_code == 200
    assert "InspectorModule" in res_inspector_js.text

    res_app_js = client.get("/static/js/app.js")
    assert res_app_js.status_code == 200
    assert "App" in res_app_js.text
    print("[PASS] Modular static assets (CSS & JS modules) served successfully.")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! The module is fully functional and ready for demonstration.")

if __name__ == "__main__":
    test_full_flow()

