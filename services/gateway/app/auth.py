"""Firebase Auth token verification for all protected routes."""
from typing import Annotated

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

# Initialize Firebase Admin SDK (uses Application Default Credentials in Cloud Run)
if not firebase_admin._apps:
    firebase_admin.initialize_app()

_bearer = HTTPBearer(auto_error=True)


async def verify_token(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> str:
    """Verify Firebase ID token and return the authenticated user's UID.

    Raises 401 if the token is missing, expired, or invalid.
    All subsequent Firestore operations must be scoped to this UID.
    """
    try:
        decoded = auth.verify_id_token(creds.credentials)
    except (firebase_admin.exceptions.FirebaseError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    uid: str = decoded["uid"]
    return uid


# Type alias for route handlers
AuthenticatedUID = Annotated[str, Depends(verify_token)]
