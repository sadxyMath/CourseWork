from pydantic import BaseModel, Field, constr, conint
from datetime import date
from typing import Optional, List


# Арендатор

class TenantBase(BaseModel):
    название_компании: constr(max_length=100)
    контактное_лицо: constr(max_length=100)
    телефон: constr(max_length=20)

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    название_компании: Optional[constr(max_length=100)]
    контактное_лицо: Optional[constr(max_length=100)]
    телефон: Optional[constr(max_length=20)]

class TenantOut(TenantBase):
    id_арендатора: int
    дата_регистрации: date

    class Config:
        from_attributes = True


# Офис

class OfficeBase(BaseModel):
    номер_офиса: constr(max_length=10)
    этаж: conint(ge=1)
    площадь: conint(gt=0)
    стоимость: conint(gt=0)
    статус: constr(max_length=20)

class OfficeCreate(OfficeBase):
    pass

class OfficeUpdate(BaseModel):
    номер_офиса: Optional[constr(max_length=10)]
    этаж: Optional[conint(ge=1)]
    площадь: Optional[conint(gt=0)]
    стоимость: Optional[conint(gt=0)]
    статус: Optional[constr(max_length=20)]

class OfficeOut(OfficeBase):
    id_офиса: int

    class Config:
        from_attributes = True


# Договор

class ContractBase(BaseModel):
    id_арендатора: int
    id_офиса: int
    дата_начала: date
    дата_окончания: date
    стоимость: conint(gt=0)
    статус: constr(max_length=20)

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    дата_начала: Optional[date]
    дата_окончания: Optional[date]
    стоимость: Optional[conint(gt=0)]
    статус: Optional[constr(max_length=20)]

class ContractOut(ContractBase):
    id_договора: int
    дата_заключения: date
    class Config:
        from_attributes = True


# Платёж

class PaymentBase(BaseModel):
    id_договора: int
    срок_оплаты: date
    сумма: conint(gt=0)
    статус: constr(max_length=20)
    дата_платежа: Optional[date]

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    срок_оплаты: Optional[date]
    сумма: Optional[conint(gt=0)]
    статус: Optional[constr(max_length=20)]
    дата_платежа: Optional[date]

class PaymentOut(PaymentBase):
    id_платежа: int
    дата_формирования: date

    class Config:
        from_attributes = True


# Заявка

class RequestBase(BaseModel):
    id_договора: int
    статус: constr(max_length=20)
    текст_заявки: constr(max_length=500)

class RequestCreate(RequestBase):
    pass

class RequestUpdate(BaseModel):
    статус: Optional[constr(max_length=20)]
    текст_заявки: Optional[constr(max_length=500)]

class RequestOut(RequestBase):
    id_заявки: int
    дата_подачи: date

    class Config:
        from_attributes = True


# Бронь

class BookingBase(BaseModel):
    id_арендатора: int
    id_офиса: int
    начало_брони: date
    окончание_брони: date
    статус: constr(max_length=20)

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    начало_брони: Optional[date]
    окончание_брони: Optional[date]
    статус: Optional[constr(max_length=20)]

class BookingOut(BookingBase):
    id_брони: int
    дата_бронирования: date

    class Config:
        from_attributes = True

#Пользователь

class UserCreate(BaseModel):
    username: constr(min_length=4)
    password: constr(min_length=6)
    company_name: str
    contact_person: str
    phone: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    id_арендатора: int | None

    class Config:
        from_attributes = True

