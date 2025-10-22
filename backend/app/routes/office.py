from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import Office
from backend.app.schemes import OfficeOut, OfficeCreate, OfficeUpdate
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/offices",
    tags=["Офисы"]
)

# --------------------------
# GET all offices
# --------------------------
@router.get("/", response_model=List[OfficeOut])
def get_offices(
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "tenant", "staff"]))
):
    return db.query(Office).all()

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
        raise HTTPException(status_code=404, detail="Office not found")
    return office

# --------------------------
# CREATE office
# --------------------------
@router.post("/", response_model=OfficeOut, status_code=status.HTTP_201_CREATED)
def create_office(
    office: OfficeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_office = Office(**office.dict())
    db.add(db_office)
    db.commit()
    db.refresh(db_office)
    return db_office

# --------------------------
# UPDATE office
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
        raise HTTPException(status_code=404, detail="Office not found")
    for key, value in office.dict(exclude_unset=True).items():
        setattr(db_office, key, value)
    db.commit()
    db.refresh(db_office)
    return db_office

# --------------------------
# DELETE office
# --------------------------
@router.delete("/{office_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_office(
    office_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not db_office:
        raise HTTPException(status_code=404, detail="Office not found")
    db.delete(db_office)
    db.commit()
    return None
