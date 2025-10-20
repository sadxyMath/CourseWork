from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import Office
from backend.app.schemes import OfficeOut, OfficeCreate, OfficeUpdate

router = APIRouter(
    prefix="/offices",
    tags=["Офисы"]
)

# GET /offices
@router.get("/", response_model=List[OfficeOut])
def get_offices(db: Session = Depends(get_db)):
    get_all_offices = db.query(Office).all()
    return get_all_offices

# GET /offices/{id}
@router.get("/{office_id}", response_model=OfficeOut)
def get_office(office_id: int, db: Session = Depends(get_db)):
    office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Office not found")
    return office

# POST /offices
@router.post("/", response_model=OfficeOut)
def create_office(office: OfficeCreate, db: Session = Depends(get_db)):
    db_office = Office(**office.dict())
    db.add(db_office)
    db.commit()
    db.refresh(db_office)
    return db_office

# PUT /offices/{id}
@router.put("/{office_id}", response_model=OfficeOut)
def update_office(office_id: int, office: OfficeUpdate, db: Session = Depends(get_db)):
    db_office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not db_office:
        raise HTTPException(status_code=404, detail="Office not found")
    for key, value in office.dict(exclude_unset=True).items():
        setattr(db_office, key, value)
    db.commit()
    db.refresh(db_office)
    return db_office

# DELETE /offices/{id}
@router.delete("/{office_id}", response_model=dict)
def delete_office(office_id: int, db: Session = Depends(get_db)):
    db_office = db.query(Office).filter(Office.id_офиса == office_id).first()
    if not db_office:
        raise HTTPException(status_code=404, detail="Office not found")
    db.delete(db_office)
    db.commit()
    return {"detail": "Office deleted"}
