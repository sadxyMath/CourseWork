from fastapi import FastAPI
from backend.app.database import Base, engine
from backend.app import models
from backend.app.routes import tenant, office, contract, payment, booking, request, register


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(tenant.router)
app.include_router(office.router)
app.include_router(contract.router)
app.include_router(payment.router)
app.include_router(booking.router)
app.include_router(request.router)
app.include_router(register.router)






