from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import qrcode
import io
import base64
from passlib.context import CryptContext
import httpx
import json

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

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    first_name: str
    last_name: str
    role: str = "customer"  # customer, admin, super_admin
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_ieee_member: bool = False
    ieee_id: Optional[str] = None
    ieee_id_card_url: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "customer"
    is_ieee_member: bool = False
    ieee_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    date: datetime
    venue: str
    address: str
    price: float
    ieee_member_price: Optional[float] = None  # Discounted price for IEEE members
    total_tickets: int
    available_tickets: int
    image_url: Optional[str] = None
    category: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class EventCreate(BaseModel):
    name: str
    description: str
    date: datetime
    venue: str
    address: str
    price: float
    ieee_member_price: Optional[float] = None
    total_tickets: int
    image_url: Optional[str] = None
    category: str

class Ticket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    customer_id: str
    customer_email: str
    customer_name: str
    customer_phone: str
    ticket_number: str = Field(default_factory=lambda: f"TKT-{uuid.uuid4().hex[:8].upper()}")
    qr_code: str
    booking_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"  # active, used, cancelled
    price_paid: float
    payment_method: Optional[str] = None  # card, paypal, bank_transfer, cash
    is_ieee_discount_applied: bool = False

class TicketCreate(BaseModel):
    event_id: str
    customer_email: EmailStr
    customer_name: str
    customer_phone: str
    payment_method: str = "card"  # card, paypal, bank_transfer, cash
    n8n_webhook_url: Optional[str] = None

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class WebhookConfig(BaseModel):
    webhook_url: str

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        is_ieee_member=user_data.is_ieee_member,
        ieee_id=user_data.ieee_id
    )
    
    await db.users.insert_one(user.dict())
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": {
        "id": user.id, "email": user.email, "first_name": user.first_name, 
        "last_name": user.last_name, "role": user.role, "is_ieee_member": user.is_ieee_member
    }}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer", "user": {
        "id": user["id"], "email": user["email"], "first_name": user["first_name"], 
        "last_name": user["last_name"], "role": user["role"], 
        "is_ieee_member": user.get("is_ieee_member", False)
    }}

# File Upload for IEEE ID Card
@api_router.post("/auth/upload-ieee-id")
async def upload_ieee_id(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Save file (in a real app, you'd save to cloud storage like AWS S3)
    import os
    upload_dir = "uploads/ieee_ids"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{current_user['sub']}_ieee_id.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Update user record with file URL
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"ieee_id_card_url": f"/uploads/ieee_ids/{filename}"}}
    )
    
    return {"message": "IEEE ID card uploaded successfully", "file_url": f"/uploads/ieee_ids/{filename}"}

# Super Admin Routes
@api_router.post("/admin/create")
async def create_admin(admin_data: AdminCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create admins")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": admin_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create admin
    hashed_password = hash_password(admin_data.password)
    admin = User(
        email=admin_data.email,
        password_hash=hashed_password,
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        role="admin"
    )
    
    await db.users.insert_one(admin.dict())
    return {"message": "Admin created successfully", "admin_id": admin.id}

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view all users")
    
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return users

# Event Routes
@api_router.post("/events")
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create events")
    
    event = Event(**event_data.dict(), created_by=current_user["id"], available_tickets=event_data.total_tickets)
    await db.events.insert_one(event.dict())
    return event

@api_router.get("/events")
async def get_events():
    events = await db.events.find({"is_active": True}).to_list(1000)
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update events")
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Calculate available tickets if total tickets changed
    tickets_sold = event["total_tickets"] - event["available_tickets"]
    new_available = event_data.total_tickets - tickets_sold
    
    update_data = event_data.dict()
    update_data["available_tickets"] = max(0, new_available)
    
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    return {"message": "Event updated successfully"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete events")
    
    await db.events.update_one({"id": event_id}, {"$set": {"is_active": False}})
    return {"message": "Event deleted successfully"}

# Ticket Routes
@api_router.post("/tickets/book")
async def book_ticket(ticket_data: TicketCreate, current_user: dict = Depends(get_current_user)):
    # Check if event exists and has available tickets
    event = await db.events.find_one({"id": ticket_data.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["available_tickets"] <= 0:
        raise HTTPException(status_code=400, detail="No tickets available")
    
    # Get user details to check IEEE membership
    user = await db.users.find_one({"id": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Determine price based on IEEE membership
    is_ieee_member = user.get("is_ieee_member", False)
    ieee_member_price = event.get("ieee_member_price")
    
    if is_ieee_member and ieee_member_price is not None:
        final_price = ieee_member_price
        is_ieee_discount_applied = True
    else:
        final_price = event["price"]
        is_ieee_discount_applied = False
    
    # Generate QR code with ticket data
    qr_data = f"event:{ticket_data.event_id}|customer:{ticket_data.customer_email}|time:{datetime.utcnow().isoformat()}"
    qr_code_base64 = generate_qr_code(qr_data)
    
    # Create ticket
    ticket = Ticket(
        event_id=ticket_data.event_id,
        customer_id=user["id"],
        customer_email=ticket_data.customer_email,
        customer_name=ticket_data.customer_name,
        customer_phone=ticket_data.customer_phone,
        qr_code=qr_code_base64,
        price_paid=final_price,
        payment_method=ticket_data.payment_method,
        is_ieee_discount_applied=is_ieee_discount_applied
    )
    
    # Update available tickets
    await db.events.update_one(
        {"id": ticket_data.event_id}, 
        {"$inc": {"available_tickets": -1}}
    )
    
    # Save ticket
    await db.tickets.insert_one(ticket.dict())
    
    # Send webhook notification to n8n if provided
    if ticket_data.n8n_webhook_url:
        webhook_data = {
            "ticket": ticket.dict(),
            "event": event,
            "type": "ticket_booked"
        }
        await send_webhook_notification(ticket_data.n8n_webhook_url, webhook_data)
    
    return ticket

@api_router.get("/tickets")
async def get_user_tickets(current_user: dict = Depends(get_current_user)):
    tickets = await db.tickets.find({"customer_email": current_user["email"]}).to_list(1000)
    return tickets

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get event details
    event = await db.events.find_one({"id": ticket["event_id"]})
    return {"ticket": ticket, "event": event}

@api_router.post("/tickets/{ticket_id}/verify")
async def verify_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can verify tickets")
    
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["status"] == "used":
        return {"valid": False, "message": "Ticket already used"}
    
    if ticket["status"] == "cancelled":
        return {"valid": False, "message": "Ticket cancelled"}
    
    # Mark ticket as used
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"status": "used"}})
    
    # Get event details
    event = await db.events.find_one({"id": ticket["event_id"]})
    
    return {
        "valid": True, 
        "ticket": ticket, 
        "event": event,
        "message": "Ticket verified successfully"
    }

# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can view analytics")
    
    # Get counts
    total_events = await db.events.count_documents({"is_active": True})
    total_tickets = await db.tickets.count_documents({})
    total_revenue = await db.tickets.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$price_paid"}}}
    ]).to_list(1)
    
    # Get recent bookings
    recent_bookings = await db.tickets.find().sort("booking_date", -1).limit(10).to_list(10)
    
    return {
        "total_events": total_events,
        "total_tickets": total_tickets,
        "total_revenue": total_revenue[0]["total"] if total_revenue else 0,
        "recent_bookings": recent_bookings
    }

# Initialize super admin
@api_router.post("/init/super-admin")
async def init_super_admin():
    existing_super_admin = await db.users.find_one({"role": "super_admin"})
    if existing_super_admin:
        return {"message": "Super admin already exists"}
    
    super_admin = User(
        email="admin@ticketmanager.com",
        password_hash=hash_password("SuperAdmin123!"),
        first_name="Super",
        last_name="Admin",
        role="super_admin"
    )
    
    await db.users.insert_one(super_admin.dict())
    return {"message": "Super admin created", "email": "admin@ticketmanager.com", "password": "SuperAdmin123!"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()