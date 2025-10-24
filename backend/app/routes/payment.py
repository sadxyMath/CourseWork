from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from backend.app.database import get_db
from backend.app.models import Payment, Contract
from backend.app.schemes import PaymentOut, PaymentCreate, PaymentUpdate
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/payments",
    tags=["Платежи"]
)

# 🔹 Получить все платежи
@router.get("/", response_model=List[PaymentOut])
def get_payments(
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant", "staff"]))
):
    if current_user.role in ["admin", "staff"]:
        return db.query(Payment).all()

    # tenant видит только свои платежи
    return (
        db.query(Payment)
        .join(Contract)
        .filter(Contract.id_арендатора == current_user.tenant_id)
        .all()
    )


# 🔹 Получить один платеж
@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant", "staff"]))
):
    payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    # Проверяем доступ арендатора
    if current_user.role == "tenant":
        contract = db.query(Contract).filter(Contract.id_договора == payment.id_договора).first()
        if not contract or contract.id_арендатора != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этому платежу")

    return payment


# 🔹 Создать платеж
@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant"]))
):
    contract = db.query(Contract).filter(Contract.id_договора == payment.id_договора).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    if current_user.role == "tenant" and contract.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Можно создавать платеж только для своих договоров")

    if payment.дата_платежа < contract.дата_начала:
        raise HTTPException(status_code=400, detail="Дата платежа не может быть раньше даты начала договора")

    if contract.статус == "расторгнут":
        raise HTTPException(status_code=400, detail="Нельзя добавить платеж к расторгнутому договору")

    db_payment = Payment(**payment.dict())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


# 🔹 Обновить платеж — только admin
@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: int,
    payment: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    for key, value in payment.dict(exclude_unset=True).items():
        setattr(db_payment, key, value)

    db.commit()
    db.refresh(db_payment)
    return db_payment


# 🔹 Удалить платеж — только admin
@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    db.delete(db_payment)
    db.commit()
    return None


# 🔹 Проверить просроченные платежи — admin и staff
@router.post("/check-overdue", response_model=dict)
def check_overdue_payments(
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "staff"]))
):
    today = date.today()
    overdue = (
        db.query(Payment)
        .filter(Payment.дата_платежа < today, Payment.статус == "не оплачен")
        .all()
    )

    for pay in overdue:
        pay.статус = "просрочен"

    db.commit()
    return {"detail": f"Обновлено {len(overdue)} просроченных платежей"}
