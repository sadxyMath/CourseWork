from fastapi import APIRouter, HTTPException, status, Response, Depends
from sqlalchemy.orm import Session
from backend.app import database, schemes, models, utils, oauth2
from fastapi.security.oauth2 import OAuth2PasswordRequestForm


router = APIRouter(
    tags = ["Логин"]
)

@router.post("/login", response_model=schemes.TokenModel)
def login(user_credintials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.phone == user_credintials.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid credentials")

        
    if not utils.verify(user_credintials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid credentials")
    access_token = oauth2.create_access_token(data={"user_id":user.id, "user_role":user.role})
    return {"access_token": access_token, "token_type": "bearer"}