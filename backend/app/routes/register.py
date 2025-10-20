from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database import get_db
from backend.app.models import User, Tenant
from backend.app.schemes import UserCreate, UserLogin, UserOut
from backend.app import utils, oauth2

router =APIRouter(
    tags=["Регистрация"]
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Проверка уникальности username/телефона
    existing_user = db.query(User).filter(User.phone == user_data.username).first()
    existing_tenant = db.query(Tenant).filter(
    or_(
        Tenant.контактное_лицо == user_data.contact_person,
        Tenant.название_компании == user_data.company_name
    )
).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким телефоном уже существует")
    if existing_tenant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким именем и названием компании уже существует")

    # Создаём арендатора
    tenant = Tenant(
        название_компании=user_data.company_name,
        контактное_лицо=user_data.contact_person,
        телефон=user_data.username
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Создаём пользователя
    user = User(
        phone=user_data.username,
        hashed_password=utils.hash(user_data.password),
        role="tenant",
        id_арендатора=tenant.id_арендатора
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = oauth2.create_access_token(data={"user_id":user.id, "user_role":user.role})
    return {
        "user": {
            "id": user.id,
            "username": user.phone,
            "role": user.role,
            "tenant_id": user.id_арендатора
        },
        "access_token": access_token,
        "token_type": "bearer"
    }