import asyncio
import json
import httpx
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.config import settings
from app.models import (
    ValidationResult, PropertyDetails, MortgageCalculationRequest, 
    MortgageCalculationResponse, InterestRateRequest, InterestRateResponse,
    MCPToolResponse
)
from app.database import db_manager

class MCPToolManager:
    def __init__(self):
        self.tools = {
            'validatePromptRelevance': self.validate_prompt_relevance,
            'searchPropertyInfo': self.search_property_info,
            'getUserChatHistory': self.get_user_chat_history,
            'getPropertyDetails': self.get_property_details,
            'getInterestRates': self.get_interest_rates,
            'calculateMortgage': self.calculate_mortgage,
            'getUserSavedProperties': self.get_user_saved_properties,
            'getServicedProperties': self.get_serviced_properties,
            'calculateMortgageAdvanced': self.calculate_mortgage_advanced,
            'getFinancialCalculator': self.get_financial_calculator
        }

    async def execute_tool(self, tool_name: str, **kwargs) -> MCPToolResponse:
        """Execute a specific MCP tool"""
        start_time = time.time()
        
        if tool_name not in self.tools:
            return MCPToolResponse(
                tool_name=tool_name,
                result={"error": f"Tool '{tool_name}' not found"},
                execution_time=time.time() - start_time
            )
        
        try:
            result = await self.tools[tool_name](**kwargs)
            return MCPToolResponse(
                tool_name=tool_name,
                result=result,
                execution_time=time.time() - start_time
            )
        except Exception as e:
            return MCPToolResponse(
                tool_name=tool_name,
                result={"error": str(e)},
                execution_time=time.time() - start_time
            )

    async def validate_prompt_relevance(self, prompt: str) -> Dict[str, Any]:
        """Validate if prompt is property-related and relevant"""
        # Keywords that indicate property/real estate relevance
        property_keywords = [
            'property', 'house', 'home', 'apartment', 'condo', 'real estate',
            'buy', 'sell', 'rent', 'mortgage', 'loan', 'investment', 'roi',
            'bedroom', 'bathroom', 'square feet', 'price', 'location',
            'neighborhood', 'market', 'listing', 'agent', 'broker'
        ]
        
        # Non-property topics to redirect
        non_property_topics = [
            'weather', 'sports', 'politics', 'entertainment', 'cooking',
            'travel', 'health', 'technology', 'science', 'history'
        ]
        
        prompt_lower = prompt.lower()
        
        # Check for property relevance
        property_score = sum(1 for keyword in property_keywords if keyword in prompt_lower)
        non_property_score = sum(1 for keyword in non_property_topics if keyword in prompt_lower)
        
        # Calculate relevance score
        total_words = len(prompt.split())
        relevance_score = min(1.0, property_score / max(total_words * 0.1, 1))
        
        is_valid = property_score > 0 and relevance_score > 0.2
        
        # If not property-related, provide redirection
        if not is_valid:
            filtered_content = "I'm here to help with property investment and real estate questions. How can I assist you with property details, market analysis, or investment calculations?"
            reason = "Query not related to real estate or property investment"
        else:
            filtered_content = None
            reason = "Query is property-related and valid"
        
        return {
            "is_valid": is_valid,
            "relevance_score": relevance_score,
            "filtered_content": filtered_content,
            "reason": reason
        }

    async def search_property_info(self, query: str, location: str = None, search_type: str = "web") -> Dict[str, Any]:
        """Search for property information using web search APIs"""
        try:
            # Construct search query
            search_query = f"{query} real estate property"
            if location:
                search_query += f" {location}"
            
            # Use Google Custom Search API
            if settings.google_search_api_key and settings.google_search_engine_id:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://www.googleapis.com/customsearch/v1",
                        params={
                            'key': settings.google_search_api_key,
                            'cx': settings.google_search_engine_id,
                            'q': search_query,
                            'num': 10
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        results = []
                        
                        for item in data.get('items', []):
                            results.append({
                                'title': item.get('title', ''),
                                'snippet': item.get('snippet', ''),
                                'link': item.get('link', ''),
                                'source': 'Google Search'
                            })
                        
                        return {
                            "results": results,
                            "query": search_query,
                            "total_results": len(results)
                        }
            
            # Fallback to mock data for demonstration
            return {
                "results": [
                    {
                        "title": "Sample Property Listing",
                        "snippet": "3BR/2BA house in downtown area, $450,000",
                        "link": "https://example.com/property/123",
                        "source": "Mock Data"
                    }
                ],
                "query": search_query,
                "total_results": 1
            }
            
        except Exception as e:
            return {"error": f"Search failed: {str(e)}"}

    async def get_user_chat_history(self, user_id: str, session_id: str, limit: int = 20) -> Dict[str, Any]:
        """Get user's chat history for context"""
        try:
            messages = await db_manager.get_chat_history(session_id, limit)
            
            history = []
            for msg in messages:
                history.append({
                    "message": msg.message,
                    "type": msg.message_type.value,
                    "timestamp": msg.timestamp.isoformat()
                })
            
            return {
                "history": history,
                "session_id": session_id,
                "message_count": len(history)
            }
            
        except Exception as e:
            return {"error": f"Failed to get chat history: {str(e)}"}

    async def get_property_details(self, property_id: str) -> Dict[str, Any]:
        """Get detailed property information"""
        try:
            # Try to get from database first
            property_data = await db_manager.get_property_details(property_id)
            
            if property_data:
                return property_data
            
            # Mock property data for demonstration
            mock_property = {
                "property_id": property_id,
                "address": "123 Main St, Downtown",
                "price": 450000,
                "bedrooms": 3,
                "bathrooms": 2,
                "square_feet": 1800,
                "property_type": "Single Family Home",
                "description": "Beautiful home in prime location",
                "images": ["https://example.com/image1.jpg"],
                "roi_estimate": 8.5,
                "market_data": {
                    "price_per_sqft": 250,
                    "neighborhood_avg": 425000,
                    "appreciation_rate": 3.2
                }
            }
            
            # Store in database for future use
            await db_manager.store_property_details(mock_property)
            
            return mock_property
            
        except Exception as e:
            return {"error": f"Failed to get property details: {str(e)}"}

    async def get_interest_rates(self, location: str, loan_type: str = "conventional") -> Dict[str, Any]:
        """Get current interest rates for a location"""
        try:
            # In a real implementation, this would call a financial API
            # For now, return mock data based on current market conditions
            
            base_rate = 7.2  # Current approximate rate
            location_adjustment = 0.0
            
            # Simple location-based adjustments
            if "california" in location.lower() or "ca" in location.lower():
                location_adjustment = 0.1
            elif "texas" in location.lower() or "tx" in location.lower():
                location_adjustment = -0.1
            
            current_rate = base_rate + location_adjustment
            
            return {
                "location": location,
                "loan_type": loan_type,
                "current_rate": current_rate,
                "rate_trend": "stable",
                "last_updated": datetime.now().isoformat(),
                "rate_history": [
                    {"date": "2024-01-01", "rate": 6.8},
                    {"date": "2024-02-01", "rate": 7.0},
                    {"date": "2024-03-01", "rate": 7.2}
                ]
            }
            
        except Exception as e:
            return {"error": f"Failed to get interest rates: {str(e)}"}

    async def calculate_mortgage(self, property_price: float, down_payment: float, 
                               interest_rate: float, loan_term_years: int = 30) -> Dict[str, Any]:
        """Calculate mortgage payment and details"""
        try:
            loan_amount = property_price - down_payment
            monthly_rate = interest_rate / 100 / 12
            num_payments = loan_term_years * 12
            
            # Calculate monthly payment using standard mortgage formula
            if monthly_rate > 0:
                monthly_payment = loan_amount * (
                    monthly_rate * (1 + monthly_rate) ** num_payments
                ) / ((1 + monthly_rate) ** num_payments - 1)
            else:
                monthly_payment = loan_amount / num_payments
            
            total_cost = monthly_payment * num_payments
            total_interest = total_cost - loan_amount
            
            return {
                "property_price": property_price,
                "down_payment": down_payment,
                "loan_amount": loan_amount,
                "interest_rate": interest_rate,
                "loan_term_years": loan_term_years,
                "monthly_payment": round(monthly_payment, 2),
                "total_interest": round(total_interest, 2),
                "total_cost": round(total_cost, 2),
                "payment_breakdown": {
                    "principal_and_interest": round(monthly_payment, 2),
                    "estimated_taxes": round(property_price * 0.012 / 12, 2),
                    "estimated_insurance": round(property_price * 0.004 / 12, 2)
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to calculate mortgage: {str(e)}"}

    async def get_user_saved_properties(self, user_id: str) -> Dict[str, Any]:
        """Get user's saved properties"""
        try:
            saved_properties = await db_manager.get_saved_properties(user_id)
            
            properties_data = []
            for saved_prop in saved_properties:
                property_details = await db_manager.get_property_details(saved_prop.property_id)
                if property_details:
                    properties_data.append({
                        "property_id": saved_prop.property_id,
                        "saved_at": saved_prop.saved_at.isoformat(),
                        "notes": saved_prop.notes,
                        "details": property_details
                    })
            
            return {
                "user_id": user_id,
                "saved_properties": properties_data,
                "total_count": len(properties_data)
            }
            
        except Exception as e:
            return {"error": f"Failed to get saved properties: {str(e)}"}

    async def get_serviced_properties(self, location: str = None, property_type: str = None) -> Dict[str, Any]:
        """Get properties serviced by the platform"""
        try:
            # Mock data for demonstration
            properties = [
                {
                    "property_id": "prop_001",
                    "address": "123 Oak Street, Downtown",
                    "price": 450000,
                    "bedrooms": 3,
                    "bathrooms": 2,
                    "property_type": "Single Family Home",
                    "roi_estimate": 8.5
                },
                {
                    "property_id": "prop_002", 
                    "address": "456 Pine Avenue, Midtown",
                    "price": 320000,
                    "bedrooms": 2,
                    "bathrooms": 1,
                    "property_type": "Condo",
                    "roi_estimate": 7.2
                }
            ]
            
            # Filter by location if specified
            if location:
                properties = [p for p in properties if location.lower() in p["address"].lower()]
            
            # Filter by property type if specified
            if property_type:
                properties = [p for p in properties if property_type.lower() in p["property_type"].lower()]
            
            return {
                "properties": properties,
                "total_count": len(properties),
                "filters": {
                    "location": location,
                    "property_type": property_type
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to get serviced properties: {str(e)}"}

    async def calculate_mortgage_advanced(self, property_price: float, down_payment: float,
                                        interest_rate: float, loan_term_years: int = 30,
                                        pmi_rate: float = 0.5, property_tax_rate: float = 1.2,
                                        insurance_rate: float = 0.4) -> Dict[str, Any]:
        """Advanced mortgage calculation with PMI, taxes, and insurance"""
        try:
            # Basic mortgage calculation
            basic_calc = await self.calculate_mortgage(property_price, down_payment, interest_rate, loan_term_years)
            
            if "error" in basic_calc:
                return basic_calc
            
            # Additional calculations
            loan_amount = property_price - down_payment
            down_payment_percent = (down_payment / property_price) * 100
            
            # PMI calculation (if down payment < 20%)
            monthly_pmi = 0
            if down_payment_percent < 20:
                monthly_pmi = (loan_amount * pmi_rate / 100) / 12
            
            # Property tax and insurance
            monthly_property_tax = (property_price * property_tax_rate / 100) / 12
            monthly_insurance = (property_price * insurance_rate / 100) / 12
            
            # Total monthly payment
            total_monthly_payment = (basic_calc["monthly_payment"] + 
                                   monthly_pmi + 
                                   monthly_property_tax + 
                                   monthly_insurance)
            
            return {
                **basic_calc,
                "advanced_details": {
                    "down_payment_percent": round(down_payment_percent, 2),
                    "monthly_pmi": round(monthly_pmi, 2),
                    "monthly_property_tax": round(monthly_property_tax, 2),
                    "monthly_insurance": round(monthly_insurance, 2),
                    "total_monthly_payment": round(total_monthly_payment, 2),
                    "pmi_required": down_payment_percent < 20
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to calculate advanced mortgage: {str(e)}"}

    async def get_financial_calculator(self, calculation_type: str, **params) -> Dict[str, Any]:
        """Generic financial calculator for various calculations"""
        try:
            if calculation_type == "roi":
                return await self._calculate_roi(**params)
            elif calculation_type == "cash_flow":
                return await self._calculate_cash_flow(**params)
            elif calculation_type == "cap_rate":
                return await self._calculate_cap_rate(**params)
            elif calculation_type == "break_even":
                return await self._calculate_break_even(**params)
            else:
                return {"error": f"Unknown calculation type: {calculation_type}"}
                
        except Exception as e:
            return {"error": f"Financial calculation failed: {str(e)}"}

    async def _calculate_roi(self, initial_investment: float, annual_return: float, 
                           years: int = 1) -> Dict[str, Any]:
        """Calculate Return on Investment"""
        roi_percentage = (annual_return / initial_investment) * 100
        total_return = annual_return * years
        
        return {
            "calculation_type": "roi",
            "initial_investment": initial_investment,
            "annual_return": annual_return,
            "years": years,
            "roi_percentage": round(roi_percentage, 2),
            "total_return": round(total_return, 2)
        }

    async def _calculate_cash_flow(self, monthly_rent: float, monthly_expenses: float) -> Dict[str, Any]:
        """Calculate monthly cash flow"""
        monthly_cash_flow = monthly_rent - monthly_expenses
        annual_cash_flow = monthly_cash_flow * 12
        
        return {
            "calculation_type": "cash_flow",
            "monthly_rent": monthly_rent,
            "monthly_expenses": monthly_expenses,
            "monthly_cash_flow": round(monthly_cash_flow, 2),
            "annual_cash_flow": round(annual_cash_flow, 2)
        }

    async def _calculate_cap_rate(self, annual_income: float, property_value: float) -> Dict[str, Any]:
        """Calculate Capitalization Rate"""
        cap_rate = (annual_income / property_value) * 100
        
        return {
            "calculation_type": "cap_rate",
            "annual_income": annual_income,
            "property_value": property_value,
            "cap_rate_percentage": round(cap_rate, 2)
        }

    async def _calculate_break_even(self, fixed_costs: float, variable_cost_per_unit: float,
                                  price_per_unit: float) -> Dict[str, Any]:
        """Calculate break-even point"""
        if price_per_unit <= variable_cost_per_unit:
            return {"error": "Price per unit must be greater than variable cost per unit"}
        
        break_even_units = fixed_costs / (price_per_unit - variable_cost_per_unit)
        
        return {
            "calculation_type": "break_even",
            "fixed_costs": fixed_costs,
            "variable_cost_per_unit": variable_cost_per_unit,
            "price_per_unit": price_per_unit,
            "break_even_units": round(break_even_units, 2)
        }

# Global MCP tool manager instance
mcp_manager = MCPToolManager()