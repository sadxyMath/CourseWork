from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from backend.app import models, schemes, database
from backend.app.dependencies import require_role

router = APIRouter(
    prefix="/tenants",
    tags=["Арендаторы"]
)

# --------------------------
# GET /tenants — список арендаторов с фильтрами
# --------------------------
@router.get("/", response_model=List[schemes.TenantOut])
def get_all_tenants(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_role(["admin", "staff"]))
):
    query = db.query(models.Tenant)
    if name:
        query = query.filter(
            or_(
                models.Tenant.название_компании.ilike(f"%{name}%"),
                models.Tenant.контактное_лицо.ilike(f"%{name}%")
            )
        )
    if phone:
        query = query.filter(models.Tenant.телефон.ilike(f"%{phone}%"))
    return query.all()

# --------------------------
# GET /tenants/{id} — конкретный арендатор
# --------------------------
@router.get("/{tenant_id}", response_model=schemes.TenantOut)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_role(["admin", "staff"]))
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

# --------------------------
# POST /tenants — создать арендатора
# --------------------------
@router.post("/", response_model=schemes.TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant: schemes.TenantCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_role(["admin"]))
):
    # проверка уникальности телефона и названия компании
    existing = db.query(models.Tenant).filter(
        or_(
            models.Tenant.телефон == tenant.телефон,
            models.Tenant.название_компании == tenant.название_компании
        )
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Арендатор с таким телефоном или названием компании уже существует")

    db_tenant = models.Tenant(**tenant.dict())
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

# --------------------------
# PUT /tenants/{id} — обновить арендатора
# --------------------------
@router.put("/{tenant_id}", response_model=schemes.TenantOut)
def update_tenant(
    tenant_id: int,
    tenant: schemes.TenantUpdate,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # проверка уникальности телефона
    if tenant.телефон:
        existing_phone = db.query(models.Tenant).filter(
            models.Tenant.телефон == tenant.телефон,
            models.Tenant.id_арендатора != tenant_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Телефон уже используется")

    # проверка уникальности названия компании
    if tenant.название_компании:
        existing_name = db.query(models.Tenant).filter(
            models.Tenant.название_компании == tenant.название_компании,
            models.Tenant.id_арендатора != tenant_id
        ).first()
        if existing_name:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Название компании уже используется")

    for key, value in tenant.dict(exclude_unset=True).items():
        setattr(db_tenant, key, value)

    db.commit()
    db.refresh(db_tenant)
    return db_tenant


# --------------------------
# DELETE /tenants/{id} — удалить арендатора
# --------------------------
@router.delete("/{tenant_id}", response_model=dict)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_role(["admin"]))
):
    db_tenant = db.query(models.Tenant).filter(models.Tenant.id_арендатора == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    db.delete(db_tenant)
    db.commit()
    return {"detail": "Арендатор удалён"}
