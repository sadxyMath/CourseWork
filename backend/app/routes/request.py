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

@router.get("/", response_model=List[RequestOut])
def get_all_requests(
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    contract_id: Optional[int] = Query(None, description="Фильтр по ID договора"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant", "staff"]))
):
    # ИСПРАВЛЕН JOIN: id_договора == id_договора (было id_офиса)
    query = db.query(Request, Office.номер_офиса.label('номер_офиса'))\
              .join(Contract, Request.id_договора == Contract.id_договора)\
              .join(Office, Contract.id_офиса == Office.id_офиса)

    if current_user.role == "tenant":
        query = query.filter(Contract.id_арендатора == current_user.tenant_id)

    if status:
        query = query.filter(Request.статус == status)
    if contract_id:
        query = query.filter(Request.id_договора == contract_id)
    
    # Обрабатываем результаты
    results = query.all()
    
    # Преобразуем в список объектов RequestOut с номером офиса
    requests_with_office = []
    for request, office_number in results:
        request_dict = {
            "id_заявки": request.id_заявки,
            "id_договора": request.id_договора,
            "статус": request.статус,
            "текст_заявки": request.текст_заявки,
            "дата_подачи": request.дата_подачи,
            "номер_офиса": office_number  # Переименовал для consistency
        }
        requests_with_office.append(RequestOut(**request_dict))
    
    return requests_with_office

# GET single request с info о договоре и офисе
@router.get("/{request_id}", response_model=RequestOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant", "staff"]))
):
    req = db.query(Request).filter(Request.id_заявки == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.role == "tenant" and req.договор.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой заявке")

    # Подгружаем информацию о договоре и офисе
    req.офис = req.договор.офис if hasattr(req.договор, "офис") else None

    return req

# CREATE request
@router.post("/", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    request: RequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "tenant"]))
):
    contract = db.query(Contract).filter(Contract.id_договора == request.id_договора).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    if current_user.role == "tenant" and contract.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Можно создавать заявки только для своих договоров")

    new_request = Request(**request.dict())
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Дополнительный запрос чтобы получить данные с офисом
    request_with_office = db.query(
        Request, 
        Office.номер_офиса.label('номер_офиса')
    ).join(
        Contract, Request.id_договора == Contract.id_договора
    ).join(
        Office, Contract.id_офиса == Office.id_офиса
    ).filter(
        Request.id_заявки == new_request.id_заявки
    ).first()
    
    # Создаем словарь с всеми нужными полями
    result = {
        "id_заявки": request_with_office.Request.id_заявки,
        "id_договора": request_with_office.Request.id_договора,
        "статус": request_with_office.Request.статус,
        "текст_заявки": request_with_office.Request.текст_заявки,
        "дата_подачи": request_with_office.Request.дата_подачи,
        "номер_офиса": request_with_office.номер_офиса
    }
    
    return RequestOut(**result)


# UPDATE request
@router.put("/{request_id}", response_model=RequestOut)
def update_request(
    request_id: int,
    request_update: RequestUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "staff"]))
):
    # Находим заявку
    db_request = db.query(Request).filter(Request.id_заявки == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Обновляем только переданные поля
    update_data = request_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_request, field, value)
    
    db.commit()
    db.refresh(db_request)
    
    # ДОБАВЛЯЕМ: Получаем заявку с номером офиса для response
    result = db.query(Request, Office.номер_офиса)\
              .join(Contract, Request.id_договора == Contract.id_договора)\
              .join(Office, Contract.id_офиса == Office.id_офиса)\
              .filter(Request.id_заявки == request_id)\
              .first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    request_obj, office_number = result
    
    # Создаем response с номером офиса
    return RequestOut(
        id_заявки=request_obj.id_заявки,
        id_договора=request_obj.id_договора,
        статус=request_obj.статус,
        текст_заявки=request_obj.текст_заявки,
        дата_подачи=request_obj.дата_подачи,
        номер_офиса=office_number
    )

# DELETE request
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
