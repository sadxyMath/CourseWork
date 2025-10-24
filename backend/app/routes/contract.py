from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app import models, schemes
from backend.app.database import get_db
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/contracts",
    tags=["Договоры"],
)

# =======================
# GET /contracts — просмотр всех договоров
# =======================
@router.get("/", response_model=List[schemes.ContractOut])
def get_contracts(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    if current_user.role == "admin":
        return db.query(models.Contract).all()
    elif current_user.role == "tenant":
        return db.query(models.Contract).filter(
            models.Contract.id_арендатора == current_user.tenant_id
        ).all()


# =======================
# GET /contracts/{id} — просмотр конкретного договора
# =======================
@router.get("/{contract_id}", response_model=schemes.ContractOut)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    contract = db.query(models.Contract).filter(models.Contract.id_договора == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Проверка доступа
    if current_user.role == "tenant" and contract.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому договору")

    return contract


# =======================
# POST /contracts — создание договора
# (только admin)
# =======================
@router.post("/", response_model=schemes.ContractOut, status_code=status.HTTP_201_CREATED)
def create_contract(
    contract: schemes.ContractCreate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin"]))
):
    # Проверка офиса
    office = db.query(models.Office).filter(models.Office.id_офиса == contract.id_офиса).first()
    if not office:
        raise HTTPException(status_code=404, detail="Офис не найден")
    if office.статус != "свободен":
        raise HTTPException(status_code=400, detail="Офис уже недоступен для аренды")

    # Проверка арендатора
    tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == contract.id_арендатора).first()
    if not tenant:
        raise HTTPException(status_code=400, detail="Арендатор не найден")

    # Проверка логики дат
    if contract.дата_окончания < contract.дата_начала:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    db_contract = models.Contract(**contract.dict())
    db.add(db_contract)

    # Меняем статус офиса
    office.статус = "арендуется"

    db.commit()
    db.refresh(db_contract)
    return db_contract


# =======================
# PUT /contracts/{id} — редактирование договора
# (только admin)
# =======================
@router.put("/{contract_id}", response_model=schemes.ContractOut)
def update_contract(
    contract_id: int,
    updated: schemes.ContractUpdate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin"]))
):
    db_contract = db.query(models.Contract).filter(models.Contract.id_договора == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Проверка логики дат
    start = updated.дата_начала or db_contract.дата_начала
    end = updated.дата_окончания or db_contract.дата_окончания
    if end < start:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(db_contract, key, value)

    db.commit()
    db.refresh(db_contract)
    return db_contract


# =======================
# DELETE /contracts/{id} — удаление договора
# (только admin)
# =======================
@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin"]))
):
    db_contract = db.query(models.Contract).filter(models.Contract.id_договора == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Освобождаем офис, если связан
    if hasattr(db_contract, "офис") and db_contract.офис:
        db_contract.офис.статус = "свободен"

    db.delete(db_contract)
    db.commit()
    return None
