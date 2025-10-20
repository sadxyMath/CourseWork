from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import Contract, Office
from backend.app.schemes import ContractOut, ContractCreate, ContractUpdate

router = APIRouter(
    prefix="/contracts",
    tags=["Договоры"]
)

# GET /contracts
@router.get("/", response_model=List[ContractOut])
def get_contracts(db: Session = Depends(get_db)):
    return db.query(Contract).all()

# GET /contracts/{id}
@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id_договора == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

# POST /contracts
@router.post("/", response_model=ContractOut)
def create_contract(contract: ContractCreate, db: Session = Depends(get_db)):
    office = db.query(Office).filter(Office.id_офиса == contract.id_офиса).first()
    if not office:
        raise HTTPException(status_code=404, detail="Office not found")
    if office.статус != "свободен":
        raise HTTPException(status_code=400, detail="Office is not available")

    # создаём договор
    db_contract = Contract(**contract.dict())
    db.add(db_contract)

    # меняем статус офиса
    office.статус = "арендуется"
    db.commit()
    db.refresh(db_contract)
    return db_contract

# PUT /contracts/{id}
@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(contract_id: int, contract: ContractUpdate, db: Session = Depends(get_db)):
    db_contract = db.query(Contract).filter(Contract.id_договора == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    for key, value in contract.dict(exclude_unset=True).items():
        setattr(db_contract, key, value)
    db.commit()
    db.refresh(db_contract)
    return db_contract

# DELETE /contracts/{id}
@router.delete("/{contract_id}", response_model=dict)
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    db_contract = db.query(Contract).filter(Contract.id_договора == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    # вернуть офис в статус "свободен"
    db_contract.офис.статус = "свободен"
    db.delete(db_contract)
    db.commit()
    return 
