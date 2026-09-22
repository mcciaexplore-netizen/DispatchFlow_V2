from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base

class Role(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    dispatcher = "dispatcher"
    operator = "operator"
    viewer = "viewer"

class DispatchStatus(str, enum.Enum):
    created = "created"
    verified = "verified"
    loaded = "loaded"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="tenant")
    customers = relationship("Customer", back_populates="tenant")
    transporters = relationship("Transporter", back_populates="tenant")
    dispatches = relationship("Dispatch", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), default=Role.operator)
    is_active = Column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="users")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    gstin = Column(String, index=True)
    memory_json = Column(JSON, nullable=True)

    tenant = relationship("Tenant", back_populates="customers")

class Transporter(Base):
    __tablename__ = "transporters"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    vehicle_number = Column(String)

    tenant = relationship("Tenant", back_populates="transporters")
    dispatches = relationship("Dispatch", back_populates="transporter")

class Dispatch(Base):
    __tablename__ = "dispatches"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    transporter_id = Column(Integer, ForeignKey("transporters.id"), nullable=True)
    status = Column(Enum(DispatchStatus), default=DispatchStatus.created)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    raw_ocr_json = Column(JSON, nullable=True)
    
    tenant = relationship("Tenant", back_populates="dispatches")
    transporter = relationship("Transporter", back_populates="dispatches")
