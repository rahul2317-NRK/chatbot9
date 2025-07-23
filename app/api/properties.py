from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models import PropertySearchRequest, PropertyDetails, SavedProperty
from app.mcp.tools import mcp_manager
from app.auth import get_current_user_optional
from app.database import db_manager

router = APIRouter(prefix="/api", tags=["properties"])

@router.get("/property-analysis")
async def get_property_analysis(
    query: str = Query(..., description="Property search query"),
    location: Optional[str] = Query(None, description="Location filter"),
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Get AI property insights and analysis"""
    try:
        # Search for property information
        search_result = await mcp_manager.execute_tool(
            "searchPropertyInfo",
            query=query,
            location=location
        )
        
        # Get interest rates for the location
        interest_rates = await mcp_manager.execute_tool(
            "getInterestRates",
            location=location or "United States"
        )
        
        # Log user interaction
        if user_id:
            await db_manager.log_user_interaction(
                user_id=user_id,
                interaction_type="property_analysis",
                data={
                    "query": query,
                    "location": location,
                    "search_results": search_result.result
                }
            )
        
        return {
            "query": query,
            "location": location,
            "search_results": search_result.result,
            "interest_rates": interest_rates.result,
            "analysis_timestamp": search_result.execution_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting property analysis: {str(e)}")

@router.post("/calculator")
async def calculate_mortgage(
    property_price: float,
    down_payment: float,
    interest_rate: Optional[float] = None,
    loan_term_years: int = 30,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Enhanced calculator with AI integration"""
    try:
        # Use provided interest rate or get current rates
        if interest_rate is None:
            rates_result = await mcp_manager.execute_tool(
                "getInterestRates",
                location="United States"
            )
            interest_rate = rates_result.result.get("current_rate", 7.2)
        
        # Calculate mortgage with advanced features
        mortgage_result = await mcp_manager.execute_tool(
            "calculateMortgageAdvanced",
            property_price=property_price,
            down_payment=down_payment,
            interest_rate=interest_rate,
            loan_term_years=loan_term_years
        )
        
        # Calculate ROI estimate
        roi_result = await mcp_manager.execute_tool(
            "getFinancialCalculator",
            calculation_type="roi",
            initial_investment=down_payment,
            annual_return=property_price * 0.08  # Assume 8% annual return
        )
        
        # Log user interaction
        if user_id:
            await db_manager.log_user_interaction(
                user_id=user_id,
                interaction_type="mortgage_calculation",
                data={
                    "property_price": property_price,
                    "down_payment": down_payment,
                    "interest_rate": interest_rate,
                    "loan_term_years": loan_term_years,
                    "calculation_result": mortgage_result.result
                }
            )
        
        return {
            "mortgage_calculation": mortgage_result.result,
            "roi_estimate": roi_result.result,
            "calculation_timestamp": mortgage_result.execution_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating mortgage: {str(e)}")

@router.get("/property-analysis/{property_id}")
async def get_property_details(
    property_id: str,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Get detailed property information and analysis"""
    try:
        # Get property details
        property_result = await mcp_manager.execute_tool(
            "getPropertyDetails",
            property_id=property_id
        )
        
        if "error" in property_result.result:
            raise HTTPException(status_code=404, detail="Property not found")
        
        property_data = property_result.result
        
        # Calculate mortgage for this property (assuming 20% down)
        if property_data.get("price"):
            mortgage_result = await mcp_manager.execute_tool(
                "calculateMortgage",
                property_price=property_data["price"],
                down_payment=property_data["price"] * 0.2,
                interest_rate=7.2,
                loan_term_years=30
            )
            property_data["mortgage_estimate"] = mortgage_result.result
        
        # Get interest rates for property location
        if property_data.get("address"):
            # Extract location from address (simplified)
            location = property_data["address"].split(",")[-1].strip()
            rates_result = await mcp_manager.execute_tool(
                "getInterestRates",
                location=location
            )
            property_data["local_interest_rates"] = rates_result.result
        
        # Log user interaction
        if user_id:
            await db_manager.log_user_interaction(
                user_id=user_id,
                interaction_type="property_details_view",
                data={
                    "property_id": property_id,
                    "property_data": property_data
                }
            )
        
        return {
            "property_id": property_id,
            "property_data": property_data,
            "analysis_timestamp": property_result.execution_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting property details: {str(e)}")

@router.post("/property-analysis/{property_id}/save")
async def save_property(
    property_id: str,
    notes: Optional[str] = None,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Save property to user's saved list"""
    try:
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required to save properties")
        
        # Save property to database
        success = await db_manager.save_property(user_id, property_id, notes)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save property")
        
        # Log user interaction
        await db_manager.log_user_interaction(
            user_id=user_id,
            interaction_type="property_saved",
            data={
                "property_id": property_id,
                "notes": notes
            }
        )
        
        return {
            "message": "Property saved successfully",
            "property_id": property_id,
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving property: {str(e)}")

@router.get("/saved-properties")
async def get_saved_properties(
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Get user's saved properties"""
    try:
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required to view saved properties")
        
        # Get saved properties using MCP tool
        saved_result = await mcp_manager.execute_tool(
            "getUserSavedProperties",
            user_id=user_id
        )
        
        return {
            "user_id": user_id,
            "saved_properties": saved_result.result,
            "retrieval_timestamp": saved_result.execution_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting saved properties: {str(e)}")

@router.get("/serviced-properties")
async def get_serviced_properties(
    location: Optional[str] = Query(None, description="Location filter"),
    property_type: Optional[str] = Query(None, description="Property type filter"),
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Get properties serviced by the platform"""
    try:
        # Get serviced properties using MCP tool
        properties_result = await mcp_manager.execute_tool(
            "getServicedProperties",
            location=location,
            property_type=property_type
        )
        
        # Log user interaction
        if user_id:
            await db_manager.log_user_interaction(
                user_id=user_id,
                interaction_type="serviced_properties_view",
                data={
                    "location": location,
                    "property_type": property_type,
                    "results_count": len(properties_result.result.get("properties", []))
                }
            )
        
        return {
            "properties": properties_result.result,
            "filters": {
                "location": location,
                "property_type": property_type
            },
            "retrieval_timestamp": properties_result.execution_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting serviced properties: {str(e)}")

@router.get("/financial-calculator/{calculation_type}")
async def financial_calculator(
    calculation_type: str,
    initial_investment: Optional[float] = Query(None),
    annual_return: Optional[float] = Query(None),
    monthly_rent: Optional[float] = Query(None),
    monthly_expenses: Optional[float] = Query(None),
    annual_income: Optional[float] = Query(None),
    property_value: Optional[float] = Query(None),
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Financial calculator for various investment calculations"""
    try:
        # Prepare parameters based on calculation type
        params = {}
        
        if calculation_type == "roi":
            if not initial_investment or not annual_return:
                raise HTTPException(status_code=400, detail="initial_investment and annual_return are required for ROI calculation")
            params = {"initial_investment": initial_investment, "annual_return": annual_return}
        
        elif calculation_type == "cash_flow":
            if not monthly_rent or not monthly_expenses:
                raise HTTPException(status_code=400, detail="monthly_rent and monthly_expenses are required for cash flow calculation")
            params = {"monthly_rent": monthly_rent, "monthly_expenses": monthly_expenses}
        
        elif calculation_type == "cap_rate":
            if not annual_income or not property_value:
                raise HTTPException(status_code=400, detail="annual_income and property_value are required for cap rate calculation")
            params = {"annual_income": annual_income, "property_value": property_value}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid calculation type")
        
        # Execute calculation using MCP tool
        calc_result = await mcp_manager.execute_tool(
            "getFinancialCalculator",
            calculation_type=calculation_type,
            **params
        )
        
        # Log user interaction
        if user_id:
            await db_manager.log_user_interaction(
                user_id=user_id,
                interaction_type="financial_calculation",
                data={
                    "calculation_type": calculation_type,
                    "parameters": params,
                    "result": calc_result.result
                }
            )
        
        return {
            "calculation_type": calculation_type,
            "parameters": params,
            "result": calc_result.result,
            "calculation_timestamp": calc_result.execution_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing financial calculation: {str(e)}")