from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app import models, schemes
from backend.app.database import get_db
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/bookings",
    tags=["Брони"],
)

# --------------------------
# GET all bookings
# --------------------------
@router.get("/", response_model=List[schemes.BookingOut])
def get_all_bookings(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant", "staff"]))
):
    if current_user.role in ["admin", "staff"]:
        bookings = db.query(models.Booking).all()
    elif current_user.role == "tenant":
        bookings = db.query(models.Booking).filter(
            models.Booking.id_арендатора == current_user.id
        ).all()
    return bookings

# --------------------------
# GET single booking
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

    if current_user.role == "admin":
        return booking
    elif current_user.role == "tenant":
        if booking.id_арендатора != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой брони")
        return booking
    elif current_user.role == "staff":
        raise HTTPException(status_code=403, detail="Персонал уборки не имеет доступа к бронированиям")

# --------------------------
# CREATE booking
# --------------------------
@router.post("/", response_model=schemes.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemes.BookingCreate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):  
    office_booked = db.query(models.Booking).filter(models.Booking.id_офиса == booking.id_офиса, models.Booking.id_арендатора == booking.id_арендатора).first()
    if office_booked:
        raise HTTPException(status_code=400, detail="Вы уже забронировали этот офис")
    # Tenant может создавать бронь только для себя
    if current_user.role == "tenant" and booking.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Можно создавать бронь только для себя")

    # Проверка существования арендатора (только для admin)
    if current_user.role == "admin":
        tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == booking.id_арендатора).first()
        if not tenant:
            raise HTTPException(status_code=400, detail="Указанный арендатор не существует")

    # Проверка существования офиса
    office = db.query(models.Office).filter(models.Office.id_офиса == booking.id_офиса).first()
    if not office:
        raise HTTPException(status_code=400, detail="Указанный офис не существует")

    # Логика дат
    if booking.окончание_брони < booking.начало_брони:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    # Проверка на пересечение бронирований
    conflict = db.query(models.Booking).filter(
        models.Booking.id_офиса == booking.id_офиса,
        models.Booking.начало_брони < booking.окончание_брони,
        models.Booking.окончание_брони > booking.начало_брони
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Офис уже забронирован на указанный период")
    
    
    new_booking = models.Booking(**booking.dict())
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

# --------------------------
# UPDATE booking
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

    if current_user.role == "tenant" and booking.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Можно редактировать только свои брони")

    # Логика дат
    start_date = updated.начало_брони or booking.начало_брони
    end_date = updated.окончание_брони or booking.окончание_брони
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    # Проверка существования офиса если изменяется
    if updated.id_офиса:
        office = db.query(models.Office).filter(models.Office.id_офиса == updated.id_офиса).first()
        if not office:
            raise HTTPException(status_code=400, detail="Указанный офис не существует")

    # Проверка на пересечение бронирований
    office_id = updated.id_офиса or booking.id_офиса
    conflict = db.query(models.Booking).filter(
        models.Booking.id_офиса == office_id,
        models.Booking.id_брони != booking_id,
        models.Booking.начало_брони < end_date,
        models.Booking.окончание_брони > start_date
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Офис уже забронирован на указанный период")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(booking, key, value)

    db.commit()
    db.refresh(booking)
    return booking

# --------------------------
# DELETE booking
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

    if current_user.role == "tenant" and booking.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Можно удалять только свои брони")

    db.delete(booking)
    db.commit()
    return None
