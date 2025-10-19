from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app import models, schemes
from backend.app.database import get_db

router = APIRouter(
    prefix="/requests",
    tags=["Заявки"],
)

@router.get("/", response_model=List[schemes.RequestOut])
def get_all_requests(db: Session = Depends(get_db)):
    requests = db.query(models.Request).all()
    return requests


@router.get("/{request_id}", response_model=schemes.RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(models.Request.id_заявки == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return request


@router.post("/", response_model=schemes.RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(request: schemes.RequestCreate, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == request.id_арендатора).first()
    if not tenant:
        raise HTTPException(status_code=400, detail="Арендатор не найден")

    if request.id_офиса:
        office = db.query(models.Office).filter(models.Office.id_офиса == request.id_офиса).first()
        if not office:
            raise HTTPException(status_code=400, detail="Указанный офис не существует")

    new_request = models.Request(**request.dict())
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


@router.put("/{request_id}", response_model=schemes.RequestOut)
def update_request(request_id: int, updated: schemes.RequestUpdate, db: Session = Depends(get_db)):
    req = db.query(models.Request).filter(models.Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(req, key, value)

    db.commit()
    db.refresh(req)
    return req


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Request).filter(models.Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    db.delete(req)
    db.commit()
    return None
