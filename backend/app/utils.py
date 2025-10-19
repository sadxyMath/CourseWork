from passlib.context import CryptContext

pwd_context = CryptContext(schemes="pbkdf2_sha256", deprecated = "auto")

def hash(password: str):
    return pwd_context.hash(password)

def verify(plain_password, hased_password):
    return pwd_context.verify(plain_password, hased_password)