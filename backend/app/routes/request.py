from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from backend.app.database import get_db
from backend.app.models import Request, Contract, Office
from backend.app.schemes import RequestOut, RequestCreate, RequestUpdate
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/requests",
    tags=["Заявки"]
)

# --------------------------
# GET all requests с фильтрами
# --------------------------
@router.get("/", response_model=List[RequestOut])
def get_all_requests(
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    contract_id: Optional[int] = Query(None, description="Фильтр по ID договора"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant", "staff"]))
):
    query = db.query(Request)

    if current_user.role == "tenant":
        query = query.join(Contract).filter(Contract.id_арендатора == current_user.id)

    if status:
        query = query.filter(Request.статус == status)
    if contract_id:
        query = query.filter(Request.id_договора == contract_id)
    if date_from:
        query = query.filter(Request.дата_подачи >= date_from)
    if date_to:
        query = query.filter(Request.дата_подачи <= date_to)

    return query.all()

# --------------------------
# GET single request с info о договоре и офисе
# --------------------------
@router.get("/{request_id}", response_model=RequestOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant", "staff"]))
):
    req = db.query(Request).filter(Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.role == "tenant" and req.договор.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой заявке")

    # Подгружаем информацию о договоре и офисе
    req.офис = req.договор.офис if hasattr(req.договор, "офис") else None

    return req

# --------------------------
# CREATE request
# --------------------------
@router.post("/", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    request: RequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant"]))
):
    contract = db.query(Contract).filter(Contract.id_договора == request.id_договора).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    if current_user.role == "tenant" and contract.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Можно создавать заявки только для своих договоров")

    new_request = Request(**request.dict())
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

# --------------------------
# UPDATE request
# --------------------------
@router.put("/{request_id}", response_model=RequestOut)
def update_request(
    request_id: int,
    updated: RequestUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant", "staff"]))
):
    req = db.query(Request).filter(Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Tenant может менять только свои заявки, кроме статуса
    if current_user.role == "tenant":
        if req.договор.id_арендатора != current_user.id:
            raise HTTPException(status_code=403, detail="Можно редактировать только свои заявки")
        for key, value in updated.dict(exclude_unset=True).items():
            if key != "статус":
                setattr(req, key, value)
    # Staff может менять только статус
    elif current_user.role == "staff":
        if updated.статус is None:
            raise HTTPException(status_code=403, detail="Можно изменять только статус заявки")
        req.статус = updated.статус
    # Admin может менять всё
    else:
        for key, value in updated.dict(exclude_unset=True).items():
            setattr(req, key, value)

    db.commit()
    db.refresh(req)
    return req

# --------------------------
# DELETE request
# --------------------------
@router.delete("/{request_id}", status_code=status.HTTP_200_OK)
def delete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant"]))
):
    req = db.query(Request).filter(Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.role == "tenant" and req.договор.id_арендатора != current_user.id:
        raise HTTPException(status_code=403, detail="Можно удалять только свои заявки")

    db.delete(req)
    db.commit()
    return {"detail": "Заявка удалена"}
