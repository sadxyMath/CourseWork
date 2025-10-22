from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.database import get_db
from backend.app.models import Request, Contract
from backend.app.schemes import RequestOut, RequestCreate, RequestUpdate
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/requests",
    tags=["Заявки"]
)

# --------------------------
# GET all requests
# --------------------------
@router.get("/", response_model=List[RequestOut])
def get_all_requests(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant", "staff"]))
):
    if current_user.role in ["admin", "staff"]:
        return db.query(Request).all()
    elif current_user.role == "tenant":
        return db.query(Request).join(Contract).filter(Contract.id_арендатора == current_user.id_арендатора).all()

# --------------------------
# GET single request
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

    if current_user.role == "tenant":
        if req.договор.id_арендатора != current_user.id_арендатора:
            raise HTTPException(status_code=403, detail="Нет доступа к этой заявке")
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

    # Tenant может создавать заявки только для своего договора
    if current_user.role == "tenant" and contract.id_арендатора != current_user.id_арендатора:
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

    if current_user.role == "tenant" and req.договор.id_арендатора != current_user.id_арендатора:
        raise HTTPException(status_code=403, detail="Можно редактировать только свои заявки")

    if current_user.role == "staff":
        # Staff может изменять только статус
        if updated.статус is None:
            raise HTTPException(status_code=403, detail="Можно изменять только статус заявки")
        req.статус = updated.статус
    else:
        for key, value in updated.dict(exclude_unset=True).items():
            setattr(req, key, value)

    db.commit()
    db.refresh(req)
    return req

# --------------------------
# DELETE request
# --------------------------
@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant"]))
):
    req = db.query(Request).filter(Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.role == "tenant" and req.договор.id_арендатора != current_user.id_арендатора:
        raise HTTPException(status_code=403, detail="Можно удалять только свои заявки")

    db.delete(req)
    db.commit()
    return None
