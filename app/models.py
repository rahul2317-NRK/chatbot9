from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatMessage(BaseModel):
    message: str = Field(..., description="The chat message content")
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="User identifier")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    message_type: MessageType = Field(default=MessageType.USER)

class ChatResponse(BaseModel):
    response: str = Field(..., description="Bot response")
    session_id: str = Field(..., description="Session identifier")
    timestamp: datetime = Field(default_factory=datetime.now)
    tools_used: Optional[List[str]] = Field(default=[], description="MCP tools used")
    property_data: Optional[Dict[str, Any]] = Field(default=None, description="Property-related data")

class PropertySearchRequest(BaseModel):
    query: str = Field(..., description="Natural language property search query")
    location: Optional[str] = Field(None, description="Location filter")
    price_range: Optional[Dict[str, float]] = Field(None, description="Price range filter")
    property_type: Optional[str] = Field(None, description="Property type filter")

class PropertyDetails(BaseModel):
    property_id: str = Field(..., description="Unique property identifier")
    address: str = Field(..., description="Property address")
    price: float = Field(..., description="Property price")
    bedrooms: int = Field(..., description="Number of bedrooms")
    bathrooms: float = Field(..., description="Number of bathrooms")
    square_feet: Optional[int] = Field(None, description="Square footage")
    property_type: str = Field(..., description="Type of property")
    description: Optional[str] = Field(None, description="Property description")
    images: Optional[List[str]] = Field(default=[], description="Property image URLs")
    roi_estimate: Optional[float] = Field(None, description="ROI estimate percentage")

class MortgageCalculationRequest(BaseModel):
    property_price: float = Field(..., description="Property purchase price")
    down_payment: float = Field(..., description="Down payment amount")
    interest_rate: float = Field(..., description="Interest rate percentage")
    loan_term_years: int = Field(default=30, description="Loan term in years")

class MortgageCalculationResponse(BaseModel):
    monthly_payment: float = Field(..., description="Monthly mortgage payment")
    total_interest: float = Field(..., description="Total interest over loan term")
    total_cost: float = Field(..., description="Total cost of the loan")
    loan_amount: float = Field(..., description="Loan amount after down payment")

class UserSession(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="User identifier")
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)
    preferences: Optional[Dict[str, Any]] = Field(default={}, description="User preferences")

class SavedProperty(BaseModel):
    user_id: str = Field(..., description="User identifier")
    property_id: str = Field(..., description="Property identifier")
    saved_at: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = Field(None, description="User notes about the property")

class InterestRateRequest(BaseModel):
    location: str = Field(..., description="Location for interest rate lookup")
    loan_type: Optional[str] = Field(default="conventional", description="Type of loan")

class InterestRateResponse(BaseModel):
    location: str = Field(..., description="Location")
    current_rate: float = Field(..., description="Current interest rate")
    rate_trend: str = Field(..., description="Rate trend (up/down/stable)")
    last_updated: datetime = Field(..., description="Last update timestamp")

class MCPToolResponse(BaseModel):
    tool_name: str = Field(..., description="Name of the MCP tool used")
    result: Dict[str, Any] = Field(..., description="Tool execution result")
    execution_time: float = Field(..., description="Execution time in seconds")

class ValidationResult(BaseModel):
    is_valid: bool = Field(..., description="Whether the prompt is valid")
    relevance_score: float = Field(..., description="Relevance score (0-1)")
    filtered_content: Optional[str] = Field(None, description="Filtered content if needed")
    reason: Optional[str] = Field(None, description="Reason for validation result")