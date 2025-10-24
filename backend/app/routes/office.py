from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.database import get_db
from backend.app.models import Office
from backend.app.schemes import OfficeOut, OfficeCreate, OfficeUpdate
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/offices",
    tags=["Офисы"]
)

# --------------------------
# GET all offices (с фильтрами)
# --------------------------
@router.get("/", response_model=List[OfficeOut])
def get_offices(
    status: Optional[str] = Query(None, description="Фильтр по статусу офиса (свободен/арендуется)"),
    floor: Optional[int] = Query(None, description="Фильтр по этажу"),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant", "staff"]))
):
    query = db.query(Office)

    if status:
        query = query.filter(Office.статус == status)
    if floor:
        query = query.filter(Office.этаж == floor)

    offices = query.all()
    if not offices:
        raise HTTPException(status_code=404, detail="Офисы не найдены")
    return offices


# --------------------------
# GET single office
# --------------------------
@router.get("/{office_id}", response_model=OfficeOut)
def get_office(
    office_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant", "staff"]))
):
    office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Офис не найден")
    return office


# --------------------------
# CREATE office (только admin)
# --------------------------
@router.post("/", response_model=OfficeOut, status_code=status.HTTP_201_CREATED)
def create_office(
    office: OfficeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    existing_office = db.query(Office).filter(Office.номер_офиса == office.номер_офиса).first()
    if existing_office:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Такой офис уже существует")

    db_office = Office(**office.dict())
    db.add(db_office)
    db.commit()
    db.refresh(db_office)
    return db_office


# --------------------------
# UPDATE office (только admin)
# --------------------------
@router.put("/{office_id}", response_model=OfficeOut)
def update_office(
    office_id: int,
    office: OfficeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not db_office:
        raise HTTPException(status_code=404, detail="Офис не найден")

    for key, value in office.dict(exclude_unset=True).items():
        setattr(db_office, key, value)

    db.commit()
    db.refresh(db_office)
    return db_office


# --------------------------
# DELETE office (только admin)
# --------------------------
@router.delete("/{office_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_office(
    office_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not db_office:
        raise HTTPException(status_code=404, detail="Офис не найден")

    db.delete(db_office)
    db.commit()
    return None
    
