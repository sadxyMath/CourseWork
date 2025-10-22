from jose import JWTError, jwt
from datetime import datetime, timedelta
from backend.app import schemes
from fastapi import Depends, status, HTTPException
from fastapi.security import OAuth2PasswordBearer
from backend.app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl = "login")


SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKENE_EXPIRE_MINUTES = settings.access_token_expire_minutes

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKENE_EXPIRE_MINUTES)
    to_encode.update({"exp":expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        id = payload.get("user_id") 
        role = payload.get("user_role")
        if id is None and (role == "admin" or role == "staff"):
            return schemes.TokenDataForPersonal(role=role)
        if id is None:
            raise credentials_exception
        if role is None:
            raise credentials_exception
        token_data = schemes.TokenData(id = str(id), role=role)
    except JWTError:
        raise credentials_exception
    return token_data

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"could not validate credentials", headers={"WWW-Authenticate": "Bearer"})

    return verify_access_token(token, credentials_exception)