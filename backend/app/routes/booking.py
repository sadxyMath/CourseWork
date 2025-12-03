from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, update
from typing import List
from backend.app import models, schemes
from backend.app.database import get_db
from datetime import datetime, date
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/bookings",
    tags=["Брони"],
)

@router.get("/", response_model=List[schemes.BookingOut])
def get_all_bookings(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant", "staff"]))
):
    if current_user.role in ["admin", "staff"]:
        return db.query(models.Booking).all()
    elif current_user.role == "tenant":
        tenant_id = current_user.tenant_id
        user_bookings = db.query(models.Booking).filter(
            models.Booking.id_арендатора == tenant_id
        ).all()

        return user_bookings


@router.post("/", response_model=schemes.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemes.BookingCreate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["tenant"]))
):
    tenant_id = current_user.tenant_id if current_user.role == "tenant" else booking.id_арендатора

    # Проверяем, что офис существует
    office = db.query(models.Office).filter(models.Office.id_офиса == booking.id_офиса).first()
    if not office:
        raise HTTPException(status_code=400, detail="Указанный офис не существует")

    # Проверка: можно бронировать только офисы со статусом "только для брони"
    if office.статус.lower() != "только для брони":
        raise HTTPException(status_code=400, detail="Этот офис недоступен для бронирования")

    # Проверяем, не бронировал ли этот арендатор уже этот офис
    existing = db.query(models.Booking).filter(
        models.Booking.id_офиса == booking.id_офиса,
        models.Booking.id_арендатора == tenant_id,
        models.Booking.статус == "активна"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже забронировали этот офис")

    # Проверяем корректность дат
    if booking.окончание_брони < booking.начало_брони:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    # Проверяем пересечение по времени с другими АКТИВНЫМИ бронями
    overlap = db.query(models.Booking).filter(
        models.Booking.id_офиса == booking.id_офиса,
        models.Booking.статус == "активна",  # Проверяем только активные брони
        models.Booking.начало_брони < booking.окончание_брони,
        models.Booking.окончание_брони > booking.начало_брони
    ).first()

    if overlap:
        raise HTTPException(
            status_code=400, 
            detail=f"Офис уже забронирован на этот период (бронь №{overlap.id_брони})"
        )

    # Создаем новую бронь
    new_booking = models.Booking(
        id_арендатора=tenant_id,
        **booking.dict()
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    return new_booking



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

    if current_user.role == "tenant" and booking.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Можно редактировать только свои брони")

    start_date = updated.начало_брони or booking.начало_брони
    end_date = updated.окончание_брони or booking.окончание_брони
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

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


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    booking = db.query(models.Booking).filter(models.Booking.id_брони == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    # Проверяем, что арендатор может отменить только свою бронь
    if current_user.role == "tenant" and booking.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Можно аннулировать только свои брони")

    # Меняем статус вместо удаления
    booking.статус = "аннулирована"
    db.commit()
    return None


@router.get("/check-expired")
def check_expired_bookings(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "staff"])),
    auto_update: bool = Query(True, description="Автоматически обновлять статус")
):
    """
    Проверяет истекшие бронирования.
    По умолчанию автоматически обновляет статус на 'истекла'.
    """
    try:
        # Находим активные брони, у которых истек срок
        expired_bookings = db.query(models.Booking).filter(
            and_(
                models.Booking.статус == "активна",
                models.Booking.окончание_брони < date.today()
            )
        ).all()
        
        expired_count = len(expired_bookings)
        updated_ids = []
        
        # Если нужно автоматически обновить статус
        if auto_update and expired_count > 0:
            for booking in expired_bookings:
                booking.статус = "истекла"
                updated_ids.append(booking.id_брони)
            
            db.commit()
            
            # Обновляем каждый объект по отдельности
            for booking in expired_bookings:
                db.refresh(booking)  # Теперь правильно - передаем объект
            
        return {
            "expired_count": expired_count,
            "auto_updated": auto_update and expired_count > 0,
            "updated_ids": updated_ids if auto_update else [],
            "bookings": expired_bookings if not auto_update else [],
            "message": f"Найдено {expired_count} истекших броней" + 
                      (f", обновлено {len(updated_ids)}" if auto_update and updated_ids else "")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при проверке истекших броней: {str(e)}"
        )