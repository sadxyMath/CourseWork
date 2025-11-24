from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from backend.app import models, schemes
from backend.app.database import get_db
from backend.app.dependencies import require_role
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import joinedload

router = APIRouter(
    prefix="/contracts",
    tags=["Договоры"],
)



@router.get("/", response_model=List[schemes.ContractOut])
def get_contracts(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant", "staff"]))
):
    query = db.query(models.Contract).options(
        joinedload(models.Contract.офис)  # Жадная загрузка офиса
    )
    
    if current_user.role == "tenant":
        query = query.filter(models.Contract.id_арендатора == current_user.tenant_id)
    
    contracts = query.all()
    result = []
    for contract in contracts:
        result.append(schemes.ContractOut(
            id_договора=contract.id_договора,
            id_арендатора=contract.id_арендатора,
            id_офиса=contract.id_офиса,
            дата_начала=contract.дата_начала,
            дата_окончания=contract.дата_окончания,
            стоимость=float(contract.стоимость),  # Конвертируем в float если нужно
            дата_заключения=contract.дата_заключения,
            статус=contract.статус,
            номер_офиса=contract.офис.номер_офиса if contract.офис else None
        ))
    
    return result



# GET /contracts/{id} — просмотр конкретного договора
@router.get("/{contract_id}", response_model=schemes.ContractOut)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    contract = db.query(models.Contract).filter(models.Contract.id_договора == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Проверка доступа
    if current_user.role == "tenant" and contract.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому договору")

    return contract



# POST /contracts — создание договора
@router.post("/", response_model=schemes.ContractOut, status_code=status.HTTP_201_CREATED)
def create_contract(
    contract: schemes.ContractCreate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "tenant"]))
):
    #Проверка офиса
    office = db.query(models.Office).filter(models.Office.id_офиса == contract.id_офиса).first()
    if not office:
        raise HTTPException(status_code=404, detail="Офис не найден")

    if office.статус != "свободен":
        raise HTTPException(status_code=400, detail="Офис уже недоступен для аренды")

    #Проверка арендатора
    tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == current_user.tenant_id).first()
    if not tenant and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Арендатор не найден")

    #Проверка прав доступа
    # Арендатор может создавать договор только для себя
    if current_user.role == "tenant" and tenant.id_арендатора != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Вы можете создавать договоры только для себя")

    # Проверка дат
    if contract.дата_окончания < contract.дата_начала:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    #Создание договора
    if current_user.role == "tenant":
        data = contract.dict()
        data["id_арендатора"] = current_user.tenant_id
    else:
        data = contract.dict()

   # Расчёт стоимости 
    duration_days = (contract.дата_окончания - contract.дата_начала).days + 1
    monthly_price = office.стоимость
    total_price = round((monthly_price / 30) * duration_days, 2)  
    data["стоимость"] = total_price

    # Статус договора
    data["статус"] = "активен"

    db_contract = models.Contract(**data)
    db.add(db_contract)
    office.статус = "арендуется"

    db.commit()
    db.refresh(db_contract)

    #Создание помесячных платежей 
    months = max(1, (duration_days + 29) // 30)
    monthly_payment_amount = round(total_price / months, 2)

    for i in range(months):
        due_date = contract.дата_начала + relativedelta(months=i)
        db_payment = models.Payment(
            id_договора=db_contract.id_договора,
            дата_платежа=None,
            срок_оплаты=due_date,
            сумма=monthly_payment_amount,
            статус="не оплачен"
        )
        db.add(db_payment)

    db.commit()

    return db_contract


# PUT /contracts/{id} — редактирование договора
# (только admin)
@router.put("/{contract_id}", response_model=schemes.ContractOut)
def update_contract(
    contract_id: int,
    updated: schemes.ContractUpdate,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin"]))
):
    db_contract = db.query(models.Contract).filter(models.Contract.id_договора == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Проверка логики дат
    start = updated.дата_начала or db_contract.дата_начала
    end = updated.дата_окончания or db_contract.дата_окончания
    if end < start:
        raise HTTPException(status_code=400, detail="Дата окончания не может быть раньше даты начала")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(db_contract, key, value)

    db.commit()
    db.refresh(db_contract)
    return db_contract


# DELETE /contracts/{id} — удаление договора
# (только admin)
@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin"]))
):
    db_contract = db.query(models.Contract).filter(models.Contract.id_договора == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Договор не найден")

    # Меняем статус договора на "расторгнут"
    db_contract.статус = "расторгнут"

    # Освобождаем офис, если связан
    if hasattr(db_contract, "офис") and db_contract.офис:
        db_contract.офис.статус = "свободен"

    db.commit()
    return None


# POST /contracts/check-expired - проверка и завершение истекших договоров
@router.post("/check-expired", response_model=schemes.ContractExpirationCheckResponse)
def check_expired_contracts(
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "staff"]))
):
    """
    Проверяет договоры с истекшим сроком и меняет их статус на 'завершён'
    """
    try:
        # Находим активные договоры с истекшим сроком
        expired_contracts = db.query(models.Contract).filter(
            models.Contract.дата_окончания < date.today(),
            models.Contract.статус == 'активен'
        ).all()
        
        completed_count = 0
        freed_offices_count = 0
        updated_contracts = []
        
        for contract in expired_contracts:
            # Сохраняем информацию о договоре до изменения
            contract_info = {
                "id_договора": contract.id_договора,
                "id_офиса": contract.id_офиса,
                "старый_статус": contract.статус
            }
            
            # Меняем статус договора на 'завершён'
            contract.статус = 'завершён'
            completed_count += 1
            
            # Освобождаем офис
            office = db.query(models.Office).filter(models.Office.id_офиса == contract.id_офиса).first()
            if office and office.статус == 'арендуется':
                office.статус = 'свободен'
                freed_offices_count += 1
                contract_info["освобожден_офис"] = True
            else:
                contract_info["освобожден_офис"] = False
            
            updated_contracts.append(contract_info)
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"Проверка завершена. Завершено договоров: {completed_count}, освобождено офисов: {freed_offices_count}",
            "completed_contracts": completed_count,
            "freed_offices": freed_offices_count,
            "updated_contracts": updated_contracts
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при проверке истекших договоров: {str(e)}"
        )


# GET /contracts/expiring-soon - договоры, которые скоро истекут
@router.get("/expiring-soon", response_model=schemes.ExpiringContractsResponse)
def get_expiring_contracts(
    days: int = 7,  # за сколько дней предупреждать (по умолчанию 7 дней)
    db: Session = Depends(get_db),
    current_user: schemes.TokenData = Depends(require_role(["admin", "staff"]))
):
    """
    Получает договоры, которые истекут в течение указанного количества дней
    """
    target_date = date.today() + timedelta(days=days)
    
    expiring_contracts = db.query(models.Contract).filter(
        models.Contract.дата_окончания <= target_date,
        models.Contract.дата_окончания >= date.today(),
        models.Contract.статус == 'активен'
    ).all()
    
    contracts_list = []
    for contract in expiring_contracts:
        days_left = (contract.дата_окончания - date.today()).days
        contracts_list.append({
            "id_договора": contract.id_договора,
            "id_арендатора": contract.id_арендатора,
            "id_офиса": contract.id_офиса,
            "дата_окончания": contract.дата_окончания,
            "дней_осталось": days_left,
            "стоимость": contract.стоимость
        })
    
    return {
        "expiring_contracts": contracts_list,
        "check_date": date.today(),
        "days_threshold": days
    }