from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models
import schemas
import auth
import validators
from database import get_db

router = APIRouter(
    prefix="/dispatches",
    tags=["dispatches"],
)

@router.post("/", response_model=schemas.Dispatch)
def create_dispatch(
    dispatch_in: schemas.DispatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.Role.admin, models.Role.manager, models.Role.operator, models.Role.dispatcher]))
):
    if dispatch_in.raw_ocr_json:
        errors = validators.validate_dispatch_payload(dispatch_in.raw_ocr_json)
        if errors:
            raise HTTPException(status_code=422, detail={"errors": errors})

    db_dispatch = models.Dispatch(
        tenant_id=current_user.tenant_id,
        transporter_id=dispatch_in.transporter_id,
        status=dispatch_in.status,
        raw_ocr_json=dispatch_in.raw_ocr_json
    )
    db.add(db_dispatch)
    db.commit()
    db.refresh(db_dispatch)
    return db_dispatch

@router.get("/", response_model=List[schemas.Dispatch])
def read_dispatches(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.Role.admin, models.Role.manager, models.Role.viewer, models.Role.operator, models.Role.dispatcher]))
):
    dispatches = db.query(models.Dispatch).filter(models.Dispatch.tenant_id == current_user.tenant_id).offset(skip).limit(limit).all()
    return dispatches

@router.get("/{dispatch_id}", response_model=schemas.Dispatch)
def read_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.Role.admin, models.Role.manager, models.Role.viewer, models.Role.operator, models.Role.dispatcher]))
):
    dispatch = db.query(models.Dispatch).filter(
        models.Dispatch.id == dispatch_id, 
        models.Dispatch.tenant_id == current_user.tenant_id
    ).first()
    
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
        
    return dispatch

class StatusUpdate(BaseModel):
    status: models.DispatchStatus

@router.put("/{dispatch_id}/status", response_model=schemas.Dispatch)
def update_dispatch_status(
    dispatch_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.Role.admin, models.Role.manager, models.Role.operator, models.Role.dispatcher]))
):
    dispatch = db.query(models.Dispatch).filter(
        models.Dispatch.id == dispatch_id, 
        models.Dispatch.tenant_id == current_user.tenant_id
    ).first()
    
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
        
    dispatch.status = status_update.status
    db.commit()
    db.refresh(dispatch)
    return dispatch
