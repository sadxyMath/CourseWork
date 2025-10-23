from fastapi import FastAPI
from backend.app.database import Base, engine
from backend.app import models
from backend.app.routes import tenant, office, contract, payment, booking, request, register, auth
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI()
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(tenant.router)
app.include_router(office.router)
app.include_router(contract.router)
app.include_router(payment.router)
app.include_router(booking.router)
app.include_router(request.router)
app.include_router(register.router)
app.include_router(auth.router)







