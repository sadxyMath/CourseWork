from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app import models, schemes
from backend.app.database import get_db
from typing import List

router = APIRouter(
    prefix="/bookings",
    tags=["Брони"],
)

@router.get("/", response_model=List[schemes.BookingOut])
def get_all_bookings(db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).all()
    return bookings

@router.get("/{booking_id}", response_model=schemes.BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    return booking


@router.post("/", response_model=schemes.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(booking: schemes.BookingCreate, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == booking.id_арендатора).first()
    if not tenant:
        raise HTTPException(status_code=400, detail="Указанный арендатор не существует")

    office = db.query(models.Office).filter(models.Office.id_офиса == booking.id_офиса).first()
    if not office:
        raise HTTPException(status_code=400, detail="Указанный офис не существует")

    if booking.окончание_брони < booking.начало_брони:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    new_booking = models.Booking(**booking.dict())
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.put("/{booking_id}", response_model=schemes.BookingOut)
def update_booking(booking_id: int, updated: schemes.BookingUpdate, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    # Проверяем логику обновления дат
    if updated.окончание_брони and updated.начало_брони and updated.окончание_брони < updated.начало_брони:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(booking, key, value)

    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    db.delete(booking)
    db.commit()
    return None
