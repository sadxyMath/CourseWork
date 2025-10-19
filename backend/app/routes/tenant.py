from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session, query
from sqlalchemy import func
from typing import Optional, List
from backend.app import schemes, database, models



router = APIRouter(prefix='/tenants', tags=["Арендаторы"])

@router.get("/", response_model=List[schemes.TenantOut])
def get_all_tenant(db: Session = Depends(database.get_db)):
    tenatnts = db.query(models.Tenant).all()
    return tenatnts

# GET /tenants/{id}
@router.get("/{tenant_id}", response_model=schemes.TenantOut)
def get_tenant(tenant_id: int, db: Session = Depends(database.get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

# POST /tenants
@router.post("/", response_model=schemes.TenantOut)
def create_tenant(tenant: schemes.TenantCreate, db: Session = Depends(database.get_db)):
    db_tenant = models.Tenant(**tenant.dict())
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

# PUT /tenants/{id}
@router.put("/{tenant_id}", response_model=schemes.TenantOut)
def update_tenant(tenant_id: int, tenant: schemes.TenantUpdate, db: Session = Depends(database.get_db)):
    db_tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for key, value in tenant.dict(exclude_unset=True).items():
        setattr(db_tenant, key, value)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

# DELETE /tenants/{id}
@router.delete("/{tenant_id}", response_model=dict)
def delete_tenant(tenant_id: int, db: Session = Depends(database.get_db)):
    db_tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    db.delete(db_tenant)
    db.commit()
    return 