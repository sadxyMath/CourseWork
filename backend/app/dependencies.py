# app/dependencies.py
from fastapi import Depends, HTTPException, status
from backend.app.oauth2 import get_current_user

def require_role(required_roles: list[str]):
    def role_dependency(current_user=Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав (нужна роль: {required_roles})"
            )
        return current_user
    return role_dependency
