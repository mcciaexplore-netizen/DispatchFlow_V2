from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime
from models import Role, DispatchStatus

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[Role] = None
    tenant_id: Optional[int] = None

class UserBase(BaseModel):
    email: EmailStr
    role: Role = Role.operator

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    tenant_id: int
    is_active: bool

    class Config:
        from_attributes = True

class TenantBase(BaseModel):
    name: str

class TenantCreate(TenantBase):
    admin_email: EmailStr
    admin_password: str

class Tenant(TenantBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DispatchBase(BaseModel):
    transporter_id: Optional[int] = None
    status: DispatchStatus = DispatchStatus.created
    raw_ocr_json: Optional[Any] = None

class DispatchCreate(DispatchBase):
    pass

class Dispatch(DispatchBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True
