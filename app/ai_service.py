import openai
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.config import settings
from app.models import ChatMessage, ChatResponse, MessageType
from app.mcp.tools import mcp_manager
from app.database import db_manager

class AIService:
    def __init__(self):
        openai.api_key = settings.openai_api_key
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        
    async def process_chat_message(self, message: ChatMessage) -> ChatResponse:
        """Process a chat message and generate AI response"""
        try:
            # Step 1: Validate prompt relevance
            validation_result = await mcp_manager.execute_tool(
                "validatePromptRelevance", 
                prompt=message.message
            )
            
            # If not property-related, return filtered response
            if not validation_result.result.get("is_valid", False):
                return ChatResponse(
                    response=validation_result.result.get("filtered_content", "I can only help with property-related questions."),
                    session_id=message.session_id,
                    tools_used=["validatePromptRelevance"]
                )
            
            # Step 2: Get chat history for context
            chat_history = await mcp_manager.execute_tool(
                "getUserChatHistory",
                user_id=message.user_id,
                session_id=message.session_id,
                limit=10
            )
            
            # Step 3: Analyze intent and determine required tools
            required_tools = await self._analyze_intent(message.message)
            
            # Step 4: Execute required MCP tools
            tool_results = {}
            tools_used = ["validatePromptRelevance", "getUserChatHistory"]
            
            for tool_name, tool_params in required_tools.items():
                result = await mcp_manager.execute_tool(tool_name, **tool_params)
                tool_results[tool_name] = result.result
                tools_used.append(tool_name)
            
            # Step 5: Generate AI response with context
            ai_response = await self._generate_ai_response(
                message.message,
                chat_history.result.get("history", []),
                tool_results
            )
            
            # Step 6: Save message and response to database
            await db_manager.save_chat_message(message)
            
            response_message = ChatMessage(
                message=ai_response,
                session_id=message.session_id,
                user_id=message.user_id,
                message_type=MessageType.ASSISTANT
            )
            await db_manager.save_chat_message(response_message)
            
            # Step 7: Update session activity
            await db_manager.update_session_activity(message.session_id)
            
            return ChatResponse(
                response=ai_response,
                session_id=message.session_id,
                tools_used=tools_used,
                property_data=self._extract_property_data(tool_results)
            )
            
        except Exception as e:
            return ChatResponse(
                response=f"I apologize, but I encountered an error processing your request: {str(e)}",
                session_id=message.session_id,
                tools_used=[]
            )

    async def _analyze_intent(self, message: str) -> Dict[str, Dict[str, Any]]:
        """Analyze user intent and determine required MCP tools"""
        message_lower = message.lower()
        required_tools = {}
        
        # Property search intent
        if any(word in message_lower for word in ['find', 'search', 'show', 'properties', 'houses', 'apartments']):
            required_tools['searchPropertyInfo'] = {
                'query': message,
                'location': self._extract_location(message)
            }
        
        # Mortgage calculation intent
        if any(word in message_lower for word in ['mortgage', 'payment', 'loan', 'calculate']):
            # Try to extract numbers from the message
            numbers = self._extract_numbers(message)
            if len(numbers) >= 2:  # At least price and down payment
                required_tools['calculateMortgage'] = {
                    'property_price': numbers[0],
                    'down_payment': numbers[1],
                    'interest_rate': numbers[2] if len(numbers) > 2 else 7.2,
                    'loan_term_years': 30
                }
        
        # Interest rates intent
        if any(word in message_lower for word in ['interest', 'rate', 'rates', 'current']):
            required_tools['getInterestRates'] = {
                'location': self._extract_location(message) or 'United States',
                'loan_type': 'conventional'
            }
        
        # Property details intent
        if any(word in message_lower for word in ['details', 'information', 'about property']):
            property_id = self._extract_property_id(message)
            if property_id:
                required_tools['getPropertyDetails'] = {
                    'property_id': property_id
                }
        
        # Saved properties intent
        if any(word in message_lower for word in ['saved', 'my properties', 'bookmarked']):
            required_tools['getUserSavedProperties'] = {}
        
        # ROI calculation intent
        if any(word in message_lower for word in ['roi', 'return', 'investment', 'profit']):
            numbers = self._extract_numbers(message)
            if len(numbers) >= 2:
                required_tools['getFinancialCalculator'] = {
                    'calculation_type': 'roi',
                    'initial_investment': numbers[0],
                    'annual_return': numbers[1]
                }
        
        return required_tools

    async def _generate_ai_response(self, user_message: str, chat_history: List[Dict], 
                                  tool_results: Dict[str, Any]) -> str:
        """Generate AI response using OpenAI with context and tool results"""
        try:
            # Build context from chat history
            context_messages = []
            
            # System message with role definition
            system_message = {
                "role": "system",
                "content": """You are a Blue Pixel AI real estate assistant specializing in property investment and analysis. 
                You help users with:
                - Property search and analysis
                - Mortgage calculations and financial planning
                - Investment ROI calculations
                - Market analysis and trends
                - Property details and comparisons
                
                Always provide accurate, helpful information based on the available data and tools.
                Be conversational but professional. Include specific numbers and calculations when available.
                If you don't have specific data, acknowledge it and provide general guidance."""
            }
            context_messages.append(system_message)
            
            # Add recent chat history
            for msg in chat_history[-5:]:  # Last 5 messages for context
                context_messages.append({
                    "role": "user" if msg["type"] == "user" else "assistant",
                    "content": msg["message"]
                })
            
            # Add current user message
            context_messages.append({
                "role": "user",
                "content": user_message
            })
            
            # Add tool results as context
            if tool_results:
                tool_context = "Available data from tools:\n"
                for tool_name, result in tool_results.items():
                    if "error" not in result:
                        tool_context += f"\n{tool_name}: {json.dumps(result, indent=2)}\n"
                
                context_messages.append({
                    "role": "system",
                    "content": tool_context
                })
            
            # Generate response using OpenAI
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=context_messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"I apologize, but I'm having trouble generating a response right now. Please try again later. Error: {str(e)}"

    def _extract_location(self, message: str) -> Optional[str]:
        """Extract location from message"""
        # Simple location extraction - in production, use NLP
        common_locations = [
            'downtown', 'midtown', 'uptown', 'suburbs', 'california', 'texas', 
            'florida', 'new york', 'chicago', 'los angeles', 'san francisco',
            'miami', 'dallas', 'houston', 'atlanta', 'seattle', 'denver'
        ]
        
        message_lower = message.lower()
        for location in common_locations:
            if location in message_lower:
                return location.title()
        
        return None

    def _extract_numbers(self, message: str) -> List[float]:
        """Extract numbers from message"""
        import re
        # Find all numbers in the message
        numbers = re.findall(r'\d+(?:\.\d+)?', message)
        return [float(num) for num in numbers]

    def _extract_property_id(self, message: str) -> Optional[str]:
        """Extract property ID from message"""
        import re
        # Look for property ID patterns
        property_id_match = re.search(r'prop_\w+|property[_\s](\w+)', message.lower())
        if property_id_match:
            return property_id_match.group(0)
        return None

    def _extract_property_data(self, tool_results: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract property-related data from tool results"""
        property_data = {}
        
        # Extract property search results
        if 'searchPropertyInfo' in tool_results:
            property_data['search_results'] = tool_results['searchPropertyInfo']
        
        # Extract property details
        if 'getPropertyDetails' in tool_results:
            property_data['property_details'] = tool_results['getPropertyDetails']
        
        # Extract mortgage calculations
        if 'calculateMortgage' in tool_results:
            property_data['mortgage_calculation'] = tool_results['calculateMortgage']
        
        # Extract interest rates
        if 'getInterestRates' in tool_results:
            property_data['interest_rates'] = tool_results['getInterestRates']
        
        # Extract financial calculations
        if 'getFinancialCalculator' in tool_results:
            property_data['financial_calculation'] = tool_results['getFinancialCalculator']
        
        return property_data if property_data else None

# Global AI service instance
ai_service = AIService()