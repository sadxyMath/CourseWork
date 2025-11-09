from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from typing import Optional
from backend.app.database import get_db
from backend.app.models import Payment, Contract
from backend.app.schemes import PaymentOut, PaymentCreate, PaymentUpdate
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/payments",
    tags=["Платежи"]
)


# 🔹 Получить все платежи с фильтрацией
@router.get("/", response_model=List[PaymentOut])
def get_payments(
    status: Optional[str] = None,
    contract_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant", "staff"]))
):
    query = db.query(Payment).join(Contract)

    # tenant видит только свои платежи
    if current_user.role == "tenant":
        query = query.filter(Contract.id_арендатора == current_user.tenant_id)

    # фильтруем по статусу платежа
    if status:
        query = query.filter(Payment.статус == status)

    # фильтруем по номеру договора
    if contract_number:
        query = query.filter(Contract.номер_договора == contract_number)

    return query.all()


@router.put("/{payment_id}/pay", response_model=PaymentOut)
def pay_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["tenant"]))
):
    db_payment = db.query(Payment).filter(Payment.id_платежа == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    db_payment.статус = "оплачен"
    db_payment.дата_платежа = date.today()

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
