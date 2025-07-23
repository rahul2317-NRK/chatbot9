from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import os
from app.config import settings
from app.api.chat import router as chat_router
from app.api.properties import router as properties_router

# Create FastAPI application
app = FastAPI(
    title="Blue Pixel AI Chatbot",
    description="Real Estate Platform with Model Context Protocol (MCP)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat_router)
app.include_router(properties_router)

# Templates setup
templates = Jinja2Templates(directory="templates")

# Static files (if any)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main chat interface"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Blue Pixel AI Chatbot",
        "version": "1.0.0",
        "environment": settings.environment
    }

@app.get("/mcp/tools")
async def get_mcp_tools():
    """Get available MCP tools"""
    from app.mcp.tools import mcp_manager
    
    return {
        "available_tools": list(mcp_manager.tools.keys()),
        "tool_descriptions": {
            "validatePromptRelevance": "Validates property-related topics and redirects off-topic questions",
            "searchPropertyInfo": "Web search integration for property information",
            "getUserChatHistory": "Session-based conversation history",
            "getPropertyDetails": "Existing property controller integration",
            "getInterestRates": "API Ninjas integration for location-based rates",
            "calculateMortgage": "Enhanced financial calculations",
            "getUserSavedProperties": "User's saved and viewed properties",
            "getServicedProperties": "Properties serviced by the platform",
            "calculateMortgageAdvanced": "Advanced mortgage calculations with PMI, taxes, insurance",
            "getFinancialCalculator": "Financial calculator context integration"
        }
    }

@app.get("/mcp/resources")
async def get_mcp_resources():
    """Get MCP resource definitions"""
    return {
        "resources": {
            "property_data": "Real-time property information and market data",
            "user_sessions": "User conversation history and preferences",
            "financial_calculations": "Mortgage and investment calculations",
            "market_rates": "Current interest rates and market trends"
        }
    }

@app.get("/mcp/server")
async def get_mcp_server_status():
    """Get MCP server status"""
    return {
        "status": "running",
        "tools_available": len(mcp_manager.tools),
        "server_info": {
            "name": "Blue Pixel AI MCP Server",
            "version": "1.0.0",
            "protocol_version": "2024-11-05"
        }
    }

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Custom 404 handler"""
    return templates.TemplateResponse("404.html", {"request": request}, status_code=404)

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: HTTPException):
    """Custom 500 handler"""
    return templates.TemplateResponse("500.html", {"request": request}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )