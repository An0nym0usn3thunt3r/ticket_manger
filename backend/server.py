from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timedelta
import jwt
import qrcode
import io
import base64
from passlib.context import CryptContext
import httpx
import json
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-this")
JWT_ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI(title="Ticket Manager API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

async def send_webhook_notification(webhook_url: str, data: dict):
    """Send data to n8n webhook"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=data)
            return response.status_code == 200
    except Exception as e:
        logging.error(f"Webhook notification failed: {e}")
        return False

def generate_random_code(length: int = 8) -> str:
    """Generate a random alphanumeric code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

# Models
class User(BaseModel):
    id: Optional[str] = None
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str = "user"
    phone: Optional[str] = None
    ieee_member: bool = False
    ieee_member_id: Optional[str] = None
    ieee_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    ieee_member: bool
    ieee_member_id: Optional[str] = None
    ieee_verified: bool
    created_at: datetime
    updated_at: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Event(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    location: str
    start_date: datetime
    end_date: datetime
    price_regular: float
    price_ieee_member: Optional[float] = None
    status: str = "upcoming"  # upcoming, ongoing, completed, canceled
    image_url: Optional[str] = None
    featured: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Coupon(BaseModel):
    id: Optional[str] = None
    code: str
    discount_percentage: float
    event_id: Optional[str] = None  # If None, applies to all events
    valid_from: datetime
    valid_until: Optional[datetime] = None  # If None, no expiry
    max_uses: Optional[int] = None  # If None, unlimited uses
    used_count: int = 0
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class CouponValidateRequest(BaseModel):
    coupon_code: str
    event_id: str

class Ticket(BaseModel):
    id: Optional[str] = None
    event_id: str
    user_id: str
    quantity: int
    ticket_type: str  # regular, ieee
    status: str = "active"  # active, used, expired, canceled
    payment_method: str
    payment_id: Optional[str] = None
    total_amount: float
    coupon_code: Optional[str] = None
    discount_amount: Optional[float] = None
    qr_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TicketPurchaseRequest(BaseModel):
    event_id: str
    quantity: int
    ticket_type: str  # regular, ieee
    payment_method: str
    total_amount: float
    coupon_code: Optional[str] = None

class IEEEVerificationRequest(BaseModel):
    member_id: str
    verification_file: str  # Base64 encoded file

# Auth Routes
@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: User):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Prepare user data
    now = datetime.utcnow()
    user_dict = user_data.dict(exclude={"password"})
    user_dict.update({
        "id": str(uuid.uuid4()),
        "password": hashed_password,
        "created_at": now,
        "updated_at": now
    })
    
    # Insert into database
    await db.users.insert_one(user_dict)
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": user_dict["id"]}
    )
    
    # Remove password from response
    user_dict.pop("password")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

@api_router.post("/auth/login", response_model=dict)
async def login_user(login_data: LoginRequest):
    # Find user by email
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": user["id"]}
    )
    
    # Remove password from response
    user.pop("password")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# User Routes
@api_router.get("/user/me", response_model=UserResponse)
async def get_user_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/user/update", response_model=UserResponse)
async def update_user(user_data: dict, current_user: dict = Depends(get_current_user)):
    # Don't allow changing email or role
    if "email" in user_data:
        del user_data["email"]
    if "role" in user_data:
        del user_data["role"]
    
    # Update password if provided
    if "password" in user_data and user_data["password"]:
        user_data["password"] = hash_password(user_data["password"])
    
    user_data["updated_at"] = datetime.utcnow()
    
    # Update user in database
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": user_data}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user["id"]})
    updated_user.pop("password")
    
    return updated_user

@api_router.post("/user/ieee-verify", response_model=dict)
async def verify_ieee_membership(data: IEEEVerificationRequest, current_user: dict = Depends(get_current_user)):
    if not current_user["ieee_member"]:
        raise HTTPException(status_code=400, detail="User is not marked as an IEEE member")
    
    # In a real application, this would verify the IEEE membership through an external service
    # For this example, we'll just mark the user as verified
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "ieee_verified": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user["id"]})
    updated_user.pop("password")
    
    return {
        "message": "IEEE membership verified successfully",
        "user": updated_user
    }

# Event Routes
@api_router.get("/events", response_model=List[Event])
async def get_events():
    # Get all events that are not canceled
    cursor = db.events.find({"status": {"$ne": "canceled"}})
    events = await cursor.to_list(length=100)
    return events

@api_router.get("/events/featured", response_model=List[Event])
async def get_featured_events():
    # Get featured events that are upcoming or ongoing
    cursor = db.events.find({
        "featured": True,
        "status": {"$in": ["upcoming", "ongoing"]}
    })
    events = await cursor.to_list(length=10)
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

# Coupon Routes
@api_router.post("/validate-coupon", response_model=dict)
async def validate_coupon(data: CouponValidateRequest, current_user: dict = Depends(get_current_user)):
    # Find the coupon
    coupon = await db.coupons.find_one({
        "code": data.coupon_code,
        "active": True
    })
    
    if not coupon:
        return {"valid": False, "message": "Invalid coupon code"}
    
    # Check if coupon is for specific event
    if coupon["event_id"] and coupon["event_id"] != data.event_id:
        return {"valid": False, "message": "Coupon not valid for this event"}
    
    # Check if coupon is expired
    now = datetime.utcnow()
    if now < coupon["valid_from"]:
        return {"valid": False, "message": "Coupon not yet valid"}
    
    if coupon["valid_until"] and now > coupon["valid_until"]:
        return {"valid": False, "message": "Coupon has expired"}
    
    # Check if maximum uses reached
    if coupon["max_uses"] and coupon["used_count"] >= coupon["max_uses"]:
        return {"valid": False, "message": "Coupon usage limit reached"}
    
    # Coupon is valid
    return {
        "valid": True,
        "discount_percentage": coupon["discount_percentage"],
        "message": f"Coupon applied with {coupon['discount_percentage']}% discount"
    }

# Ticket Routes
@api_router.post("/purchase-tickets", response_model=dict)
async def purchase_tickets(data: TicketPurchaseRequest, current_user: dict = Depends(get_current_user)):
    # Verify event exists
    event = await db.events.find_one({"id": data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if IEEE ticket type is selected and user is verified
    if data.ticket_type == "ieee" and (not current_user["ieee_member"] or not current_user["ieee_verified"]):
        raise HTTPException(status_code=400, detail="IEEE member verification required for IEEE tickets")
    
    # Apply coupon if provided
    discount_amount = 0
    if data.coupon_code:
        coupon = await db.coupons.find_one({
            "code": data.coupon_code,
            "active": True
        })
        
        if coupon:
            # Validate coupon for event
            if not coupon["event_id"] or coupon["event_id"] == data.event_id:
                now = datetime.utcnow()
                if now >= coupon["valid_from"] and (not coupon["valid_until"] or now <= coupon["valid_until"]):
                    if not coupon["max_uses"] or coupon["used_count"] < coupon["max_uses"]:
                        # Apply discount
                        discount_percentage = coupon["discount_percentage"]
                        discount_amount = data.total_amount * (discount_percentage / 100)
                        
                        # Update coupon usage count
                        await db.coupons.update_one(
                            {"id": coupon["id"]},
                            {"$inc": {"used_count": 1}}
                        )
    
    # Generate unique ticket ID
    ticket_id = str(uuid.uuid4())
    
    # Generate QR code with ticket data
    qr_data = json.dumps({
        "ticket_id": ticket_id,
        "event_id": data.event_id,
        "user_id": current_user["id"],
        "quantity": data.quantity,
        "timestamp": datetime.utcnow().isoformat()
    })
    qr_code = generate_qr_code(qr_data)
    
    # Create ticket
    now = datetime.utcnow()
    ticket = {
        "id": ticket_id,
        "event_id": data.event_id,
        "user_id": current_user["id"],
        "quantity": data.quantity,
        "ticket_type": data.ticket_type,
        "status": "active",
        "payment_method": data.payment_method,
        "payment_id": f"PAY-{generate_random_code(12)}",  # In a real app, this would be from payment provider
        "total_amount": data.total_amount,
        "coupon_code": data.coupon_code,
        "discount_amount": discount_amount,
        "qr_code": qr_code,
        "created_at": now,
        "updated_at": now
    }
    
    # Save ticket to database
    await db.tickets.insert_one(ticket)
    
    # Send notification (optional)
    webhook_url = os.environ.get("TICKET_WEBHOOK_URL")
    if webhook_url:
        await send_webhook_notification(webhook_url, {
            "event": "ticket_purchased",
            "ticket_id": ticket_id,
            "user_id": current_user["id"],
            "event_id": data.event_id,
            "timestamp": now.isoformat()
        })
    
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": "Tickets purchased successfully"
    }

@api_router.get("/user/tickets", response_model=List[dict])
async def get_user_tickets(current_user: dict = Depends(get_current_user)):
    # Get all tickets for current user
    cursor = db.tickets.find({"user_id": current_user["id"]})
    tickets = await cursor.to_list(length=100)
    
    # Get event details for each ticket
    for ticket in tickets:
        event = await db.events.find_one({"id": ticket["event_id"]})
        ticket["event"] = event
    
    return tickets

@api_router.get("/ticket/{ticket_id}", response_model=dict)
async def get_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    # Get ticket
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check if ticket belongs to current user or user is admin
    if ticket["user_id"] != current_user["id"] and current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get event details
    event = await db.events.find_one({"id": ticket["event_id"]})
    ticket["event"] = event
    
    return ticket

# Admin Routes
@api_router.get("/admin/events", response_model=List[Event])
async def admin_get_events(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all events
    cursor = db.events.find()
    events = await cursor.to_list(length=100)
    return events

@api_router.post("/admin/events", response_model=Event)
async def admin_create_event(event_data: Event, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Prepare event data
    now = datetime.utcnow()
    event_dict = event_data.dict()
    event_dict.update({
        "id": str(uuid.uuid4()),
        "created_at": now,
        "updated_at": now
    })
    
    # Insert into database
    await db.events.insert_one(event_dict)
    
    return event_dict

@api_router.put("/admin/events/{event_id}", response_model=Event)
async def admin_update_event(event_id: str, event_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if event exists
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Update event data
    event_data["updated_at"] = datetime.utcnow()
    
    await db.events.update_one(
        {"id": event_id},
        {"$set": event_data}
    )
    
    # Get updated event
    updated_event = await db.events.find_one({"id": event_id})
    
    return updated_event

@api_router.delete("/admin/events/{event_id}", response_model=dict)
async def admin_delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if event exists
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete event
    await db.events.delete_one({"id": event_id})
    
    return {"success": True, "message": "Event deleted successfully"}

@api_router.get("/admin/coupons", response_model=List[Coupon])
async def admin_get_coupons(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all coupons
    cursor = db.coupons.find()
    coupons = await cursor.to_list(length=100)
    
    # Get event details for each coupon that has an event_id
    for coupon in coupons:
        if coupon["event_id"]:
            event = await db.events.find_one({"id": coupon["event_id"]})
            coupon["event"] = event
    
    return coupons

@api_router.post("/admin/coupons", response_model=Coupon)
async def admin_create_coupon(coupon_data: Coupon, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if coupon code already exists
    existing_coupon = await db.coupons.find_one({"code": coupon_data.code})
    if existing_coupon:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    # Prepare coupon data
    now = datetime.utcnow()
    coupon_dict = coupon_data.dict()
    coupon_dict.update({
        "id": str(uuid.uuid4()),
        "created_at": now,
        "updated_at": now
    })
    
    # Insert into database
    await db.coupons.insert_one(coupon_dict)
    
    return coupon_dict

@api_router.put("/admin/coupons/{coupon_id}", response_model=Coupon)
async def admin_update_coupon(coupon_id: str, coupon_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if coupon exists
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Check if updating code and if it already exists
    if "code" in coupon_data and coupon_data["code"] != coupon["code"]:
        existing_coupon = await db.coupons.find_one({"code": coupon_data["code"]})
        if existing_coupon:
            raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    # Update coupon data
    coupon_data["updated_at"] = datetime.utcnow()
    
    await db.coupons.update_one(
        {"id": coupon_id},
        {"$set": coupon_data}
    )
    
    # Get updated coupon
    updated_coupon = await db.coupons.find_one({"id": coupon_id})
    
    return updated_coupon

@api_router.delete("/admin/coupons/{coupon_id}", response_model=dict)
async def admin_delete_coupon(coupon_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if coupon exists
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Delete coupon
    await db.coupons.delete_one({"id": coupon_id})
    
    return {"success": True, "message": "Coupon deleted successfully"}

# Add API routes to the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Ticket Manager API"}

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
