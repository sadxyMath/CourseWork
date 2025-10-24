from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from backend.app import database, schemes, models, utils, oauth2

router = APIRouter(tags=["Логин"])

@router.post("/login", response_model=schemes.TokenModel)
def login(
    user_credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    # Находим пользователя по телефону
    user = db.query(models.User).filter(models.User.phone == user_credentials.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учётные данные"
        )

    # Проверяем пароль
    if not utils.verify(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учётные данные"
        )

    # Генерируем токен (включаем tenant_id)
    access_token = oauth2.create_access_token(data={
        "user_id": user.id,
        "tenant_id": user.id_арендатора,  # может быть None для админов/сотрудников
        "user_role": user.role
    })

    return {"access_token": access_token, "token_type": "bearer"}
