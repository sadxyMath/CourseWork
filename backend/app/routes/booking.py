from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app import models, schemes
from backend.app.database import get_db
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/bookings",
    tags=["Брони"],
)

# --------------------------
# GET /bookings — просмотр всех броней
# --------------------------
@router.get("/", response_model=List[schemes.BookingOut])
def get_all_bookings(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant", "staff"]))
):
    if current_user.role in ["admin", "staff"]:
        return db.query(models.Booking).all()
    elif current_user.role == "tenant":
        # арендатор видит только свои брони
        user_bookings = db.query(models.Booking).filter(
            models.Booking.id_арендатора == current_user.id
        ).all()
        if not user_bookings:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="У вас нет забронированных офисов. Чтобы это сделать перейдите по ссылке для просмотра всех офисов")
        return user_bookings


# --------------------------
# GET /bookings/{id} — просмотр конкретной брони
# --------------------------
@router.get("/{booking_id}", response_model=schemes.BookingOut)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant", "staff"]))
):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    # арендатор видит только свою бронь
    if current_user.role == "tenant" and booking.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой брони")

    # персонал только смотрит (доступ разрешён)
    return booking


# --------------------------
# POST /bookings — создание брони
# --------------------------
@router.post("/", response_model=schemes.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemes.BookingCreate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["tenant", "admin"]))
):
    # tenant может создавать только для себя, admin может для любого
    tenant_id = current_user.id

    # проверка существования офиса
    office = db.query(models.Office).filter(models.Office.id_офиса == booking.id_офиса).first()
    if not office:
        raise HTTPException(status_code=400, detail="Указанный офис не существует")

    # проверка — не забронировал ли этот арендатор уже этот офис
    existing = db.query(models.Booking).filter(
        models.Booking.id_офиса == booking.id_офиса,
        models.Booking.id_арендатора == tenant_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже забронировали этот офис")

    # проверка дат
    if booking.окончание_брони < booking.начало_брони:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    # проверка пересечения с другими бронями
    overlap = db.query(models.Booking).filter(
        models.Booking.id_офиса == booking.id_офиса,
        models.Booking.начало_брони < booking.окончание_брони,
        models.Booking.окончание_брони > booking.начало_брони
    ).first()
    if overlap:
        raise HTTPException(status_code=400, detail="Офис уже забронирован на этот период")

    # создаём бронь
    new_booking = models.Booking(
        id_арендатора=tenant_id,
        **booking.dict()
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


# --------------------------
# PUT /bookings/{id} — редактирование брони
# --------------------------
@router.put("/{booking_id}", response_model=schemes.BookingOut)
def update_booking(
    booking_id: int,
    updated: schemes.BookingUpdate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    # tenant может редактировать только свои брони
    if current_user.role == "tenant" and booking.id_арендатора != int(current_user.id):
        raise HTTPException(status_code=403, detail="Можно редактировать только свои брони")

    start_date = updated.начало_брони or booking.начало_брони
    end_date = updated.окончание_брони or booking.окончание_брони
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    # проверка пересечения
    conflict = db.query(models.Booking).filter(
        models.Booking.id_офиса == booking.id_офиса,
        models.Booking.id_брони != booking_id,
        models.Booking.начало_брони < end_date,
        models.Booking.окончание_брони > start_date
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Офис уже забронирован на этот период")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(booking, key, value)

    db.commit()
    db.refresh(booking)
    return booking


# --------------------------
# DELETE /bookings/{id} — удаление брони
# --------------------------
@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    if current_user.role == "tenant" and booking.id_арендатора != int(current_user.id):
        raise HTTPException(status_code=403, detail="Можно удалять только свои брони")

    db.delete(booking)
    db.commit()
    return None
