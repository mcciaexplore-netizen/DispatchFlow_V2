from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", response_model=schemas.Tenant)
def register_tenant(tenant_in: schemas.TenantCreate, db: Session = Depends(get_db)):
    # Check if user email already exists
    existing_user = db.query(models.User).filter(models.User.email == tenant_in.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create tenant
    db_tenant = models.Tenant(name=tenant_in.name)
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    
    # Create admin user
    hashed_password = auth.get_password_hash(tenant_in.admin_password)
    db_user = models.User(
        tenant_id=db_tenant.id,
        email=tenant_in.admin_email,
        hashed_password=hashed_password,
        role=models.Role.admin
    )
    db.add(db_user)
    db.commit()
    
    return db_tenant

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role, "tenant_id": user.tenant_id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
