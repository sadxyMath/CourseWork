from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from backend.app.database import get_db
from backend.app.models import Payment, Contract
from backend.app.schemes import PaymentOut, PaymentCreate, PaymentUpdate

router = APIRouter(
    prefix="/payments",
    tags=["Платежи"]
)

# 🔸 Получить все платежи
@router.get("/", response_model=List[PaymentOut])
def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).all()


# 🔸 Получить один платеж
@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")
    return payment


# 🔸 Создать платеж
@router.post("/", response_model=PaymentOut)
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id_договора == payment.id_договора).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Проверка даты — не раньше даты начала договора
    if payment.дата_платежа < contract.дата_начала:
        raise HTTPException(status_code=400, detail="Дата платежа не может быть раньше даты начала договора")

    # Проверка статуса
    if contract.статус == "расторгнут":
        raise HTTPException(status_code=400, detail="Нельзя добавить платеж к расторгнутому договору")

    db_payment = Payment(**payment.dict())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


# 🔸 Обновить платеж
@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(payment_id: int, payment: PaymentUpdate, db: Session = Depends(get_db)):
    db_payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    for key, value in payment.dict(exclude_unset=True).items():
        setattr(db_payment, key, value)

    db.commit()
    db.refresh(db_payment)
    return db_payment


# 🔸 Удалить платеж
@router.delete("/{payment_id}", response_model=dict)
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    db_payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    db.delete(db_payment)
    db.commit()
    return {"detail": "Платеж удалён"}


# 🔸 Проверить просроченные платежи (бизнес-логика)
@router.post("/check-overdue", response_model=dict)
def check_overdue_payments(db: Session = Depends(get_db)):
    today = date.today()
    overdue = (
        db.query(Payment)
        .filter(Payment.дата_платежа < today, Payment.статус == "ожидает")
        .all()
    )

    for pay in overdue:
        pay.статус = "просрочен"

    db.commit()
    return {"detail": f"Обновлено {len(overdue)} просроченных платежей"}
