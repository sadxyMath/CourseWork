from sqlalchemy import Column, ForeignKey, Integer, String, text, func, CheckConstraint, Date
from .database import Base
from sqlalchemy.orm import relationship
import datetime

class Tenant(Base):
    __tablename__ = "арендатор"

    id_арендатора = Column(Integer, primary_key=True, index=True)
    название_компании = Column(String(100), nullable=False)
    контактное_лицо = Column(String(100), nullable=False)
    телефон = Column(String(20), nullable=False, unique=True)
    дата_регистрации = Column(Date, nullable=False, server_default=func.current_date())


class Office(Base):
    __tablename__ = "офис"

    id_офиса = Column(Integer, primary_key=True, index=True)
    номер_офиса = Column(String(10), nullable=False)
    этаж = Column(Integer, nullable=False)
    площадь = Column(Integer, nullable=False)
    стоимость = Column(Integer, nullable=False)
    статус = Column(String(20), nullable=False)

    __table_args__ = (
        CheckConstraint("этаж >= 1", name="check_этаж"),
        CheckConstraint("площадь > 0", name="check_площадь"),
        CheckConstraint("стоимость > 0", name="check_стоимость"),
        CheckConstraint("статус IN ('свободен', 'арендуется', 'в резерве', 'на обслуживании')", name="check_статус_офиса"),
    )

class Contract(Base):
    __tablename__ = "договор"

    id_договора = Column(Integer, primary_key=True, index=True)
    id_арендатора = Column(Integer, ForeignKey("арендатор.id_арендатора"), nullable=False)
    id_офиса = Column(Integer, ForeignKey("офис.id_офиса"), nullable=False)
    дата_начала = Column(Date, nullable=False)
    дата_окончания = Column(Date, nullable=False)
    стоимость = Column(Integer, nullable=False)
    дата_заключения = Column(Date, nullable=False, server_default=func.current_date())
    статус = Column(String(20), nullable=False)

    __table_args__ = (
        CheckConstraint("стоимость > 0", name="check_стоимость_договора"),
        CheckConstraint("дата_окончания >= дата_начала", name="check_даты_договора"),
        CheckConstraint("статус IN ('активен', 'завершён', 'расторгнут')", name="check_статус_договора"),
    )

    # связи
    арендатор = relationship("Tenant", backref="договора")
    офис = relationship("Office", backref="договора")

class Payment(Base):
    __tablename__ = "платеж"

    id_платежа = Column(Integer, primary_key=True, index=True)
    id_договора = Column(Integer, ForeignKey("договор.id_договора"), nullable=False)
    дата_формирования = Column(Date, nullable=False, server_default=func.current_date())
    срок_оплаты = Column(Date, nullable=False)
    сумма = Column(Integer, nullable=False)
    дата_платежа = Column(Date, nullable=True)
    статус = Column(String(20), nullable=False)

    __table_args__ = (
        CheckConstraint("сумма > 0", name="check_сумма_платежа"),
        CheckConstraint("статус IN ('не оплачен', 'оплачен', 'просрочен')", name="check_статус_платежа"),
    )

    договор = relationship("Contract", backref="платежи")


class Request(Base):
    __tablename__ = "заявка"

    id_заявки = Column(Integer, primary_key=True, index=True)
    id_договора = Column(Integer, ForeignKey("договор.id_договора"), nullable=False)
    дата_подачи = Column(Date, nullable=False, server_default=func.current_date())
    статус = Column(String(20), nullable=False)
    текст_заявки = Column(String(500), nullable=False)

    __table_args__ = (
        CheckConstraint("статус IN ('новая', 'в работе', 'выполнена', 'отклонена')", name="check_статус_заявки"),
    )

    договор = relationship("Contract", backref="заявки")\


class Booking(Base):
    __tablename__ = "бронь"

    id_брони = Column(Integer, primary_key=True, index=True)
    id_арендатора = Column(Integer, ForeignKey("арендатор.id_арендатора"), nullable=False)
    id_офиса = Column(Integer, ForeignKey("офис.id_офиса"), nullable=False)
    дата_бронирования = Column(Date, nullable=False, server_default=func.current_date())
    начало_брони = Column(Date, nullable=False)
    окончание_брони = Column(Date, nullable=False)
    статус = Column(String(20), nullable=False)

    __table_args__ = (
        CheckConstraint("окончание_брони >= начало_брони", name="check_даты_брони"),
        CheckConstraint("статус IN ('активна', 'аннулирована', 'истекла')", name="check_статус_брони"),
    )

    арендатор = relationship("Tenant", backref="брони")
    офис = relationship("Office", backref="брони")


