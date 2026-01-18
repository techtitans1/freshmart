"""
FreshMart - Complete FastAPI Server
Single file containing all models, schemas, routes, and services
Run with: python server.py
"""

import os
import re
import math
import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Union
from contextlib import asynccontextmanager
import enum

# FastAPI imports
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Pydantic imports
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings

# SQLAlchemy imports
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, select, func, or_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship, selectinload

# Security imports
from jose import JWTError, jwt
from passlib.context import CryptContext

# ==================== CONFIGURATION ====================

class Settings(BaseSettings):
    APP_NAME: str = "FreshMart"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "b424032ca81c79b7e0e5eb2e3536d39277f3590182bbbed600cad52f9d6f5856"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = "sqlite+aiosqlite:///./freshmart.db"
    FRONTEND_PATH: str = "../frontend/customer-app"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()

# ==================== DATABASE SETUP ====================

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ==================== DATABASE MODELS ====================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(128), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False, default="Guest User")
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(15), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    profile_photo = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    wallet_balance = Column(Float, default=0.0)
    total_savings = Column(Float, default=0.0)
    notifications_enabled = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    provider = Column(String(50), default="email")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    cart = relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")
    wishlist = relationship("Wishlist", back_populates="user", uselist=False, cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    image = Column(String(500), nullable=True)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory = Column(String(100), nullable=True)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    discount_percentage = Column(Integer, default=0)
    weight = Column(String(50), nullable=True)
    unit = Column(String(20), default="piece")
    image = Column(String(500), nullable=True)
    stock_quantity = Column(Integer, default=0)
    is_in_stock = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_organic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")


class Cart(Base):
    __tablename__ = "carts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"
    
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")


class Wishlist(Base):
    __tablename__ = "wishlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="wishlist")
    items = relationship("WishlistItem", back_populates="wishlist", cascade="all, delete-orphan")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    wishlist_id = Column(Integer, ForeignKey("wishlists.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(200), nullable=True)
    product_price = Column(Float, nullable=True)
    product_image = Column(String(500), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    wishlist = relationship("Wishlist", back_populates="items")
    product = relationship("Product")


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default=OrderStatus.PENDING.value)
    payment_status = Column(String(50), default="pending")
    payment_method = Column(String(50), nullable=True)
    subtotal = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_city = Column(String(100), nullable=True)
    delivery_state = Column(String(100), nullable=True)
    delivery_pincode = Column(String(10), nullable=True)
    delivery_phone = Column(String(15), nullable=True)
    customer_notes = Column(Text, nullable=True)
    coupon_code = Column(String(50), nullable=True)
    coupon_discount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String(200), nullable=False)
    product_image = Column(String(500), nullable=True)
    product_weight = Column(String(50), nullable=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")


# ==================== PYDANTIC SCHEMAS ====================

# User Schemas
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^\d{10}$', v):
            raise ValueError('Phone number must be 10 digits')
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    profile_photo: Optional[str] = None
    notifications_enabled: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    uid: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    profile_photo: Optional[str] = None
    wallet_balance: float = 0.0
    total_savings: float = 0.0
    is_verified: bool = False
    notifications_enabled: bool = True
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserStats(BaseModel):
    total_orders: int = 0
    wishlist_count: int = 0
    total_savings: float = 0.0
    wallet_balance: float = 0.0


class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None


class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r'^\d{10}$')


class OTPVerify(BaseModel):
    phone: str = Field(..., pattern=r'^\d{10}$')
    otp: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Product Schemas
class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    discount_percentage: int = 0
    weight: Optional[str] = None
    image: Optional[str] = None
    is_in_stock: bool
    is_featured: bool = False
    is_organic: bool = False
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    display_order: int
    
    class Config:
        from_attributes = True


# Cart Schemas
class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float
    original_price: Optional[float] = None
    product: Optional[dict] = None
    added_at: datetime
    
    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    id: int
    items: List[CartItemResponse] = []
    total_items: int = 0
    subtotal: float = 0.0
    total_savings: float = 0.0
    delivery_fee: float = 0.0
    total: float = 0.0
    
    class Config:
        from_attributes = True


class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(..., ge=0)


# Wishlist Schemas
class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_price: Optional[float] = None
    product_image: Optional[str] = None
    product: Optional[dict] = None
    added_at: datetime
    
    class Config:
        from_attributes = True


class WishlistResponse(BaseModel):
    id: int
    items: List[WishlistItemResponse] = []
    total_items: int = 0
    
    class Config:
        from_attributes = True


class ToggleWishlistRequest(BaseModel):
    product_id: int


class ToggleWishlistResponse(BaseModel):
    product_id: int
    is_in_wishlist: bool
    message: str


# Order Schemas
class OrderItemResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    product_image: Optional[str] = None
    product_weight: Optional[str] = None
    quantity: int
    price: float
    original_price: Optional[float] = None
    
    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    order_number: str
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    subtotal: float
    discount: float
    delivery_fee: float
    tax: float
    total: float
    delivery_address: str
    delivery_city: Optional[str] = None
    delivery_pincode: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    delivered_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CreateOrderRequest(BaseModel):
    delivery_address: str
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_pincode: Optional[str] = None
    delivery_phone: str
    payment_method: str = "cod"
    customer_notes: Optional[str] = None
    coupon_code: Optional[str] = None


# ==================== SECURITY ====================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# In-memory OTP storage (use Redis in production)
otp_storage = {}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# ==================== HELPER FUNCTIONS ====================

def generate_order_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"FM{timestamp}{random_part}"


def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def generate_uid() -> str:
    return str(uuid.uuid4())


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


# ==================== APP LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting FreshMart Server...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database initialized")
    
    # Seed sample data
    await seed_sample_data()
    
    yield
    
    # Shutdown
    print("👋 Shutting down FreshMart Server...")
    await engine.dispose()


# ==================== FASTAPI APP ====================

app = FastAPI(
    title="FreshMart API",
    description="Online Grocery Store Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== SEED DATA ====================

async def seed_sample_data():
    """Seed sample products and categories"""
    async with async_session_maker() as db:
        # Check if data exists
        result = await db.execute(select(func.count(Product.id)))
        count = result.scalar()
        
        if count > 0:
            print("📦 Sample data already exists")
            return
        
        print("🌱 Seeding sample data...")
        
        # Create categories
        categories_data = [
            {"name": "Vegetables & Fruits", "slug": "vegetables-fruits", "icon": "fa-carrot"},
            {"name": "Dairy & Eggs", "slug": "dairy-eggs", "icon": "fa-egg"},
            {"name": "Bakery", "slug": "bakery", "icon": "fa-bread-slice"},
            {"name": "Beverages", "slug": "beverages", "icon": "fa-glass-water"},
            {"name": "Snacks", "slug": "snacks", "icon": "fa-cookie"},
            {"name": "Dry Fruits", "slug": "dry-fruits", "icon": "fa-seedling"},
            {"name": "Masalas", "slug": "masalas", "icon": "fa-pepper-hot"},
            {"name": "Oils & Sauces", "slug": "oils-sauces", "icon": "fa-bottle-droplet"},
            {"name": "Cleaning", "slug": "cleaning", "icon": "fa-spray-can"},
            {"name": "Baby Care", "slug": "baby-care", "icon": "fa-baby"},
            {"name": "Chocolates", "slug": "chocolates", "icon": "fa-candy-cane"},
            {"name": "Ice Creams", "slug": "ice-creams", "icon": "fa-ice-cream"},
        ]
        
        category_map = {}
        for cat_data in categories_data:
            category = Category(**cat_data, display_order=len(category_map))
            db.add(category)
            await db.flush()
            category_map[cat_data["slug"]] = category.id
        
        # Create products
        products_data = [
            {"name": "Fresh Tomatoes", "slug": "fresh-tomatoes", "category_id": category_map.get("vegetables-fruits"), "subcategory": "fresh-vegetables", "price": 35, "original_price": 45, "weight": "500g", "discount_percentage": 22, "image": "assests/images/vegetables/tomato.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Taj Mahal Tea", "slug": "taj-mahal-tea", "category_id": category_map.get("beverages"), "subcategory": "tea", "price": 25, "original_price": 30, "weight": "250g", "discount_percentage": 17, "image": "assests/images/Home/tajmahal.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "White Eggs", "slug": "white-eggs", "category_id": category_map.get("dairy-eggs"), "subcategory": "eggs", "price": 40, "original_price": 50, "weight": "12pcs", "discount_percentage": 20, "image": "assests/images/dairy/whiteeggs.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "White Bread", "slug": "white-bread", "category_id": category_map.get("bakery"), "subcategory": "bread", "price": 40, "original_price": 50, "weight": "400g", "discount_percentage": 20, "image": "assests/images/bakery/whitebread.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Thumbs Up", "slug": "thumbs-up", "category_id": category_map.get("beverages"), "subcategory": "soft-drinks", "price": 40, "original_price": 50, "weight": "750ml", "discount_percentage": 20, "image": "assests/images/baverages/thumbsup.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Tender Coconut Water", "slug": "tender-coconut-water", "category_id": category_map.get("beverages"), "subcategory": "juices", "price": 40, "original_price": 50, "weight": "500ml", "discount_percentage": 20, "image": "assests/images/juice/coconutwater.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Organic Cashews", "slug": "organic-cashews", "category_id": category_map.get("dry-fruits"), "subcategory": "nuts", "price": 299, "original_price": 399, "weight": "250g", "discount_percentage": 25, "image": "assests/images/dryfruits/organiccashews.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Red Chili Powder", "slug": "red-chili-powder", "category_id": category_map.get("masalas"), "subcategory": "basic-masalas", "price": 45, "original_price": 55, "weight": "200g", "discount_percentage": 18, "image": "assests/images/masalas/mirchi.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Sunflower Oil", "slug": "sunflower-oil", "category_id": category_map.get("oils-sauces"), "subcategory": "cooking-oils", "price": 150, "original_price": 180, "weight": "1L", "discount_percentage": 17, "image": "assests/images/oils/sunflower.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Lizol Citrus", "slug": "lizol-citrus", "category_id": category_map.get("cleaning"), "subcategory": "floor-cleaners", "price": 120, "original_price": 150, "weight": "500ml", "discount_percentage": 20, "image": "assests/images/cleaning/lizolcitrus.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Feeding Bottle", "slug": "feeding-bottle", "category_id": category_map.get("baby-care"), "subcategory": "feeding", "price": 199, "original_price": 250, "weight": "250ml", "discount_percentage": 20, "image": "assests/images/babycare/feedingbottle.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Cadbury Silk", "slug": "cadbury-silk", "category_id": category_map.get("chocolates"), "subcategory": "milk-chocolates", "price": 85, "original_price": 100, "weight": "150g", "discount_percentage": 15, "image": "assests/images/chocolate/dairymilksilk.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "KitKat", "slug": "kitkat", "category_id": category_map.get("chocolates"), "subcategory": "wafer-chocolates", "price": 40, "original_price": 50, "weight": "50g", "discount_percentage": 20, "image": "assests/images/chocolate/nestlekitkat.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Kinder Joy", "slug": "kinder-joy", "category_id": category_map.get("chocolates"), "subcategory": "kids-chocolates", "price": 50, "original_price": 60, "weight": "20g", "discount_percentage": 17, "image": "assests/images/chocolate/kinderjoy.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Pistachio Ice Cream", "slug": "pistachio-ice-cream", "category_id": category_map.get("ice-creams"), "subcategory": "premium", "price": 150, "original_price": 180, "weight": "500ml", "discount_percentage": 17, "image": "assests/images/icecreams/pistachio.jpeg", "is_featured": True, "is_in_stock": True},
            {"name": "Fresh Potatoes", "slug": "fresh-potatoes", "category_id": category_map.get("vegetables-fruits"), "subcategory": "fresh-vegetables", "price": 30, "original_price": 40, "weight": "1kg", "discount_percentage": 25, "image": "assests/images/vegetables/potato.jpeg", "is_in_stock": True},
            {"name": "Green Spinach", "slug": "green-spinach", "category_id": category_map.get("vegetables-fruits"), "subcategory": "leafy-greens", "price": 25, "original_price": 30, "weight": "250g", "discount_percentage": 17, "image": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", "is_in_stock": True},
            {"name": "Red Apples", "slug": "red-apples", "category_id": category_map.get("vegetables-fruits"), "subcategory": "fresh-fruits", "price": 149, "original_price": 199, "weight": "1kg", "discount_percentage": 25, "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", "is_in_stock": True},
            {"name": "Bananas", "slug": "bananas", "category_id": category_map.get("vegetables-fruits"), "subcategory": "fresh-fruits", "price": 49, "original_price": 60, "weight": "1 dozen", "discount_percentage": 18, "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", "is_in_stock": True},
            {"name": "Carrots", "slug": "carrots", "category_id": category_map.get("vegetables-fruits"), "subcategory": "fresh-vegetables", "price": 45, "original_price": 55, "weight": "500g", "discount_percentage": 18, "image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400", "is_in_stock": True},
        ]
        
        for prod_data in products_data:
            product = Product(**prod_data, stock_quantity=100)
            db.add(product)
        
        await db.commit()
        print("✅ Sample data seeded successfully")


# ==================== API ROUTES ====================

# Health Check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


# ==================== AUTH ROUTES ====================

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    query = select(User).where(
        or_(
            User.email == user_data.email if user_data.email else False,
            User.phone == user_data.phone if user_data.phone else False
        )
    )
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if user_data.email and existing_user.email == user_data.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        if user_data.phone and existing_user.phone == user_data.phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create new user
    new_user = User(
        uid=generate_uid(),
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password) if user_data.password else None,
        provider="email" if user_data.email else "phone"
    )
    
    db.add(new_user)
    await db.flush()
    
    # Create cart and wishlist
    cart = Cart(user_id=new_user.id)
    wishlist = Wishlist(user_id=new_user.id)
    db.add(cart)
    db.add(wishlist)
    
    await db.commit()
    await db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(new_user)
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email/phone and password"""
    query = select(User)
    if login_data.email:
        query = query.where(User.email == login_data.email)
    elif login_data.phone:
        query = query.where(User.phone == login_data.phone)
    else:
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if login_data.password:
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.last_login = datetime.utcnow()
    await db.commit()
    
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@app.post("/api/auth/send-otp")
async def send_otp(otp_request: OTPRequest):
    """Send OTP to phone number"""
    phone = otp_request.phone
    otp = generate_otp()
    
    otp_storage[phone] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=5)
    }
    
    print(f"📱 OTP for {phone}: {otp}")  # In production, send via SMS
    
    return {
        "success": True,
        "message": f"OTP sent to +91 {phone}",
        "debug_otp": otp if settings.DEBUG else None
    }


@app.post("/api/auth/verify-otp", response_model=TokenResponse)
async def verify_otp(otp_data: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Verify OTP and login/register user"""
    phone = otp_data.phone
    otp = otp_data.otp
    
    stored_otp = otp_storage.get(phone)
    
    if not stored_otp:
        raise HTTPException(status_code=400, detail="OTP expired or not found")
    
    if datetime.utcnow() > stored_otp["expires_at"]:
        del otp_storage[phone]
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if stored_otp["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    del otp_storage[phone]
    
    # Find or create user
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            uid=generate_uid(),
            name="User",
            phone=phone,
            provider="phone",
            is_verified=True
        )
        db.add(user)
        await db.flush()
        
        cart = Cart(user_id=user.id)
        wishlist = Wishlist(user_id=user.id)
        db.add(cart)
        db.add(wishlist)
    else:
        user.is_verified = True
        user.last_login = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


# ==================== USER ROUTES ====================

@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return UserResponse.model_validate(current_user)


@app.get("/api/users/me/stats", response_model=UserStats)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's stats"""
    # Get order count
    order_result = await db.execute(
        select(func.count(Order.id)).where(Order.user_id == current_user.id)
    )
    total_orders = order_result.scalar() or 0
    
    # Get wishlist count
    wishlist_result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == current_user.id)
    )
    wishlist = wishlist_result.scalar_one_or_none()
    
    wishlist_count = 0
    if wishlist:
        items_result = await db.execute(
            select(func.count(WishlistItem.id)).where(WishlistItem.wishlist_id == wishlist.id)
        )
        wishlist_count = items_result.scalar() or 0
    
    # Get total savings
    savings_result = await db.execute(
        select(func.sum(Order.discount)).where(Order.user_id == current_user.id)
    )
    total_savings = savings_result.scalar() or 0.0
    
    return UserStats(
        total_orders=total_orders,
        wishlist_count=wishlist_count,
        total_savings=total_savings + current_user.total_savings,
        wallet_balance=current_user.wallet_balance
    )


@app.put("/api/users/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile"""
    # Check for duplicate phone
    if update_data.phone and update_data.phone != current_user.phone:
        result = await db.execute(
            select(User).where(User.phone == update_data.phone, User.id != current_user.id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check for duplicate email
    if update_data.email and update_data.email != current_user.email:
        result = await db.execute(
            select(User).where(User.email == update_data.email, User.id != current_user.id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


# ==================== PRODUCT ROUTES ====================

@app.get("/api/products", response_model=ProductListResponse)
async def get_products(
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    subcategory: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_discount: Optional[int] = None,
    in_stock_only: bool = True,
    is_featured: Optional[bool] = None,
    sort_by: str = "relevance",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get products with filters and pagination"""
    stmt = select(Product).where(Product.is_active == True)
    
    if query:
        search_term = f"%{query}%"
        stmt = stmt.where(
            or_(Product.name.ilike(search_term), Product.description.ilike(search_term))
        )
    
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if subcategory:
        stmt = stmt.where(Product.subcategory == subcategory)
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if min_discount is not None:
        stmt = stmt.where(Product.discount_percentage >= min_discount)
    if in_stock_only:
        stmt = stmt.where(Product.is_in_stock == True)
    if is_featured is not None:
        stmt = stmt.where(Product.is_featured == is_featured)
    
    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    # Sort
    if sort_by == "price-low":
        stmt = stmt.order_by(Product.price.asc())
    elif sort_by == "price-high":
        stmt = stmt.order_by(Product.price.desc())
    elif sort_by == "discount":
        stmt = stmt.order_by(Product.discount_percentage.desc())
    else:
        stmt = stmt.order_by(Product.is_featured.desc(), Product.id.desc())
    
    # Paginate
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    
    result = await db.execute(stmt)
    products = result.scalars().all()
    
    return ProductListResponse(
        products=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size)
    )


@app.get("/api/products/featured", response_model=List[ProductResponse])
async def get_featured_products(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get featured products"""
    stmt = select(Product).where(
        Product.is_active == True,
        Product.is_featured == True
    ).order_by(Product.discount_percentage.desc()).limit(limit)
    
    result = await db.execute(stmt)
    products = result.scalars().all()
    
    return [ProductResponse.model_validate(p) for p in products]


@app.get("/api/products/categories", response_model=List[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all categories"""
    stmt = select(Category).where(Category.is_active == True).order_by(Category.display_order.asc())
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]


@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Get single product"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductResponse.model_validate(product)


# ==================== CART ROUTES ====================

@app.get("/api/cart", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's cart"""
    result = await db.execute(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
        .where(Cart.user_id == current_user.id)
    )
    cart = result.scalar_one_or_none()
    
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
    
    items = []
    subtotal = 0
    total_savings = 0
    
    for item in cart.items:
        product = item.product
        item_data = {
            "id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "price": item.price,
            "original_price": item.original_price,
            "added_at": item.added_at,
            "product": {
                "id": product.id,
                "name": product.name,
                "image": product.image,
                "weight": product.weight,
                "is_in_stock": product.is_in_stock
            } if product else None
        }
        items.append(item_data)
        subtotal += item.quantity * item.price
        if item.original_price:
            total_savings += item.quantity * (item.original_price - item.price)
    
    delivery_fee = 0 if subtotal >= 500 else 40
    
    return CartResponse(
        id=cart.id,
        items=[CartItemResponse(**item) for item in items],
        total_items=sum(item["quantity"] for item in items),
        subtotal=subtotal,
        total_savings=total_savings,
        delivery_fee=delivery_fee,
        total=subtotal + delivery_fee
    )


@app.post("/api/cart/add", response_model=CartResponse)
async def add_to_cart(
    item_data: AddToCartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add item to cart"""
    result = await db.execute(select(Product).where(Product.id == item_data.product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.is_in_stock:
        raise HTTPException(status_code=400, detail="Product is out of stock")
    
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.flush()
    
    result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_id == item_data.product_id
        )
    )
    existing_item = result.scalar_one_or_none()
    
    if existing_item:
        existing_item.quantity += item_data.quantity
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            quantity=item_data.quantity,
            price=product.price,
            original_price=product.original_price
        )
        db.add(cart_item)
    
    await db.commit()
    return await get_cart(current_user, db)


@app.put("/api/cart/item/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: int,
    update_data: UpdateCartItemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update cart item quantity"""
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    cart_item = result.scalar_one_or_none()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    if update_data.quantity == 0:
        await db.delete(cart_item)
    else:
        cart_item.quantity = update_data.quantity
    
    await db.commit()
    return await get_cart(current_user, db)


@app.delete("/api/cart/item/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove item from cart"""
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    
    if cart:
        result = await db.execute(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        )
        cart_item = result.scalar_one_or_none()
        if cart_item:
            await db.delete(cart_item)
            await db.commit()
    
    return await get_cart(current_user, db)


@app.delete("/api/cart/clear", response_model=CartResponse)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all items from cart"""
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    
    if cart:
        result = await db.execute(select(CartItem).where(CartItem.cart_id == cart.id))
        items = result.scalars().all()
        for item in items:
            await db.delete(item)
        await db.commit()
    
    return await get_cart(current_user, db)


# ==================== WISHLIST ROUTES ====================

@app.get("/api/wishlist", response_model=WishlistResponse)
async def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's wishlist"""
    result = await db.execute(
        select(Wishlist)
        .options(selectinload(Wishlist.items).selectinload(WishlistItem.product))
        .where(Wishlist.user_id == current_user.id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
        await db.commit()
        await db.refresh(wishlist)
    
    items = []
    for item in wishlist.items:
        product = item.product
        item_data = {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name or (product.name if product else None),
            "product_price": item.product_price or (product.price if product else None),
            "product_image": item.product_image or (product.image if product else None),
            "added_at": item.added_at,
            "product": {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "original_price": product.original_price,
                "image": product.image,
                "weight": product.weight,
                "is_in_stock": product.is_in_stock,
                "discount_percentage": product.discount_percentage
            } if product else None
        }
        items.append(item_data)
    
    return WishlistResponse(
        id=wishlist.id,
        items=[WishlistItemResponse(**item) for item in items],
        total_items=len(items)
    )


@app.post("/api/wishlist/toggle", response_model=ToggleWishlistResponse)
async def toggle_wishlist(
    request: ToggleWishlistRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add or remove item from wishlist"""
    result = await db.execute(select(Product).where(Product.id == request.product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    result = await db.execute(select(Wishlist).where(Wishlist.user_id == current_user.id))
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
        await db.flush()
    
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wishlist.id,
            WishlistItem.product_id == request.product_id
        )
    )
    existing_item = result.scalar_one_or_none()
    
    if existing_item:
        await db.delete(existing_item)
        await db.commit()
        return ToggleWishlistResponse(
            product_id=request.product_id,
            is_in_wishlist=False,
            message=f"{product.name} removed from wishlist"
        )
    else:
        wishlist_item = WishlistItem(
            wishlist_id=wishlist.id,
            product_id=product.id,
            product_name=product.name,
            product_price=product.price,
            product_image=product.image
        )
        db.add(wishlist_item)
        await db.commit()
        return ToggleWishlistResponse(
            product_id=request.product_id,
            is_in_wishlist=True,
            message=f"{product.name} added to wishlist"
        )


@app.get("/api/wishlist/check/{product_id}")
async def check_in_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if product is in wishlist"""
    result = await db.execute(select(Wishlist).where(Wishlist.user_id == current_user.id))
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        return {"product_id": product_id, "is_in_wishlist": False}
    
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wishlist.id,
            WishlistItem.product_id == product_id
        )
    )
    item = result.scalar_one_or_none()
    
    return {"product_id": product_id, "is_in_wishlist": item is not None}


@app.delete("/api/wishlist/{item_id}")
async def remove_from_wishlist(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove item from wishlist"""
    result = await db.execute(select(Wishlist).where(Wishlist.user_id == current_user.id))
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.wishlist_id == wishlist.id
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.delete(item)
    await db.commit()
    
    return {"message": "Item removed from wishlist"}


@app.delete("/api/wishlist/clear")
async def clear_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear wishlist"""
    result = await db.execute(select(Wishlist).where(Wishlist.user_id == current_user.id))
    wishlist = result.scalar_one_or_none()
    
    if wishlist:
        result = await db.execute(
            select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id)
        )
        items = result.scalars().all()
        for item in items:
            await db.delete(item)
        await db.commit()
    
    return {"message": "Wishlist cleared"}


# ==================== ORDER ROUTES ====================

@app.get("/api/orders", response_model=List[OrderResponse])
async def get_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's orders"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    
    return [OrderResponse.model_validate(o) for o in orders]


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single order"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderResponse.model_validate(order)


@app.post("/api/orders", response_model=OrderResponse)
async def create_order(
    order_data: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create order from cart"""
    # Get cart
    result = await db.execute(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
        .where(Cart.user_id == current_user.id)
    )
    cart = result.scalar_one_or_none()
    
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate totals
    subtotal = sum(item.quantity * item.price for item in cart.items)
    discount = sum(
        item.quantity * (item.original_price - item.price)
        for item in cart.items if item.original_price
    )
    delivery_fee = 0 if subtotal >= 500 else 40
    total = subtotal + delivery_fee
    
    # Create order
    order = Order(
        order_number=generate_order_number(),
        user_id=current_user.id,
        subtotal=subtotal,
        discount=discount,
        delivery_fee=delivery_fee,
        total=total,
        delivery_address=order_data.delivery_address,
        delivery_city=order_data.delivery_city,
        delivery_state=order_data.delivery_state,
        delivery_pincode=order_data.delivery_pincode,
        delivery_phone=order_data.delivery_phone,
        payment_method=order_data.payment_method,
        customer_notes=order_data.customer_notes,
        coupon_code=order_data.coupon_code
    )
    
    db.add(order)
    await db.flush()
    
    # Create order items
    for cart_item in cart.items:
        product = cart_item.product
        order_item = OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            product_name=product.name if product else "Unknown",
            product_image=product.image if product else None,
            product_weight=product.weight if product else None,
            quantity=cart_item.quantity,
            price=cart_item.price,
            original_price=cart_item.original_price
        )
        db.add(order_item)
    
    # Clear cart
    for item in cart.items:
        await db.delete(item)
    
    # Update user savings
    current_user.total_savings += discount
    
    await db.commit()
    await db.refresh(order)
    
    return OrderResponse.model_validate(order)


# ==================== SERVE FRONTEND ====================

# Check if frontend folder exists
frontend_path = os.path.join(os.path.dirname(__file__), settings.FRONTEND_PATH)

if os.path.exists(frontend_path):
    # Serve static files (CSS, JS, images)
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")
    
    # Check for assets/images folders
    if os.path.exists(os.path.join(frontend_path, "assests")):
        app.mount("/assests", StaticFiles(directory=os.path.join(frontend_path, "assests")), name="assests")
    if os.path.exists(os.path.join(frontend_path, "assests")):
        app.mount("/assests", StaticFiles(directory=os.path.join(frontend_path, "assests")), name="assests")
    if os.path.exists(os.path.join(frontend_path, "images")):
        app.mount("/images", StaticFiles(directory=os.path.join(frontend_path, "images")), name="images")
    
    # Serve HTML pages
    @app.get("/")
    async def serve_home():
        return FileResponse(os.path.join(frontend_path, "index.html"))
    
    @app.get("/{page}.html")
    async def serve_page(page: str):
        file_path = os.path.join(frontend_path, f"{page}.html")
        if os.path.exists(file_path):
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="Page not found")
else:
    @app.get("/")
    async def home():
        return {
            "message": "Welcome to FreshMart API",
            "docs": "/docs",
            "health": "/api/health"
        }


# ==================== ERROR HANDLERS ====================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    if request.url.path.startswith("/api"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return JSONResponse(status_code=404, content={"detail": "Page not found"})


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     🥬 FreshMart - Online Grocery Store 🥬               ║
    ║                                                           ║
    ║     Server running at: http://localhost:8000              ║
    ║     API Docs:          http://localhost:8000/docs         ║
    ║     Health Check:      http://localhost:8000/api/health   ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )