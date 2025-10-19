from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, Tenant
from backend.app.schemes import UserCreate, UserLogin, UserOut
from backend.app import utils

router =APIRouter(
    tags=["Регистрация"]
)

@router.post("/register", response_model=UserOut)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Проверка уникальности username/телефона
    existing_user = db.query(User).filter(User.username == user_data.phone).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь с таким телефоном уже существует")

    # Создаём арендатора
    tenant = Tenant(
        название_компании=user_data.company_name,
        контактное_лицо=user_data.contact_person,
        телефон=user_data.phone
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Создаём пользователя
    user = User(
        username=user_data.username,
        hashed_password=utils.hash(user_data.password),
        role="tenant",
        id_арендатора=tenant.id_арендатора
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user