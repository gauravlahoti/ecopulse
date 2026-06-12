"""pytest fixtures for the gateway test suite."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def auth_client() -> TestClient:
    """TestClient with a mocked auth token — returns uid='test-user-123'."""

    def mock_verify(_creds: object) -> str:
        return "test-user-123"

    with patch("app.auth.auth.verify_id_token", return_value={"uid": "test-user-123"}):
        yield TestClient(app)


@pytest.fixture()
def mock_firestore() -> MagicMock:
    mock = MagicMock()
    with patch("google.cloud.firestore.Client", return_value=mock):
        yield mock
