"""Gateway smoke tests — health endpoint, security headers, rate limiting."""
from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ecopulse-gateway"


def test_root_returns_200(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200


def test_security_headers_present(client: TestClient) -> None:
    response = client.get("/health")
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "strict-transport-security" in response.headers
    assert "content-security-policy" in response.headers


def test_protected_route_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/activities")
    assert response.status_code == 403  # No Bearer token → HTTPBearer returns 403


def test_openapi_schema_accessible(client: TestClient) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "EcoPulse Gateway"


def test_upload_rejects_wrong_type(client: TestClient) -> None:
    """PDF uploads should be rejected at the content-type gate."""
    from unittest.mock import patch

    with patch("app.auth.auth.verify_id_token", return_value={"uid": "uid-123"}):
        response = client.post(
            "/api/v1/upload",
            files={"file": ("test.pdf", b"%PDF-1.4 fake", "application/pdf")},
            headers={"Authorization": "Bearer fake-token"},
        )
    assert response.status_code == 415


def test_upload_rejects_oversized_file(client: TestClient) -> None:
    """Files over 10MB should be rejected."""
    from unittest.mock import patch

    large_content = b"x" * (11 * 1024 * 1024)  # 11MB
    with patch("app.auth.auth.verify_id_token", return_value={"uid": "uid-123"}):
        response = client.post(
            "/api/v1/upload",
            files={"file": ("big.jpg", large_content, "image/jpeg")},
            headers={"Authorization": "Bearer fake-token"},
        )
    assert response.status_code == 413
