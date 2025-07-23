from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Optional
from datetime import datetime
import json
import asyncio
from app.models import ChatMessage, ChatResponse, UserSession, MessageType
from app.ai_service import ai_service
from app.auth import auth_manager, get_current_user_optional
from app.database import db_manager

router = APIRouter(prefix="/api/chat-bot", tags=["chat"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str):
        self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(message)

manager = ConnectionManager()

@router.post("/chat", response_model=ChatResponse)
async def send_chat_message(
    message: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Send a chat message and get AI response"""
    try:
        # Create anonymous session if no user authenticated
        if not user_id:
            user_id, session_id = auth_manager.create_anonymous_session()
        
        # Create session if not provided
        if not session_id:
            session_id = auth_manager.create_session_id()
        
        # Create or get user session
        existing_session = await db_manager.get_user_session(session_id)
        if not existing_session:
            user_session = UserSession(
                session_id=session_id,
                user_id=user_id
            )
            await db_manager.create_user_session(user_session)
        
        # Create chat message
        chat_message = ChatMessage(
            message=message,
            session_id=session_id,
            user_id=user_id,
            message_type=MessageType.USER
        )
        
        # Process message with AI service
        response = await ai_service.process_chat_message(chat_message)
        
        # Log user interaction
        await db_manager.log_user_interaction(
            user_id=user_id,
            interaction_type="chat_message",
            data={
                "message": message,
                "response": response.response,
                "tools_used": response.tools_used,
                "session_id": session_id
            }
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat message: {str(e)}")

@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: str,
    limit: int = 50,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Get chat history for a session"""
    try:
        # Verify session belongs to user (if authenticated)
        if user_id:
            session = await db_manager.get_user_session(session_id)
            if not session or session.user_id != user_id:
                raise HTTPException(status_code=403, detail="Access denied to this session")
        
        messages = await db_manager.get_chat_history(session_id, limit)
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "message": msg.message,
                    "type": msg.message_type.value,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ],
            "total_messages": len(messages)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session history: {str(e)}")

@router.post("/sessions")
async def create_session(user_id: Optional[str] = Depends(get_current_user_optional)):
    """Create a new chat session"""
    try:
        # Create anonymous session if no user authenticated
        if not user_id:
            user_id, session_id = auth_manager.create_anonymous_session()
        else:
            session_id = auth_manager.create_session_id()
        
        # Create user session
        user_session = UserSession(
            session_id=session_id,
            user_id=user_id
        )
        
        success = await db_manager.create_user_session(user_session)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        return {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": user_session.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating session: {str(e)}")

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time chat"""
    # For demo purposes, we'll create an anonymous user
    user_id, _ = auth_manager.create_anonymous_session()
    
    await manager.connect(websocket, user_id)
    
    try:
        # Create session if it doesn't exist
        existing_session = await db_manager.get_user_session(session_id)
        if not existing_session:
            user_session = UserSession(
                session_id=session_id,
                user_id=user_id
            )
            await db_manager.create_user_session(user_session)
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Create chat message
            chat_message = ChatMessage(
                message=message_data["message"],
                session_id=session_id,
                user_id=user_id,
                message_type=MessageType.USER
            )
            
            # Process with AI service
            response = await ai_service.process_chat_message(chat_message)
            
            # Send response back to client
            await websocket.send_text(json.dumps({
                "type": "ai_response",
                "response": response.response,
                "session_id": session_id,
                "timestamp": response.timestamp.isoformat(),
                "tools_used": response.tools_used,
                "property_data": response.property_data
            }))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Error: {str(e)}"
        }))
        manager.disconnect(websocket, user_id)

@router.get("/sessions/{session_id}")
async def get_session_info(
    session_id: str,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Get session information"""
    try:
        session = await db_manager.get_user_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Verify session belongs to user (if authenticated)
        if user_id and session.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        return {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "preferences": session.preferences
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session info: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """Delete a chat session"""
    try:
        session = await db_manager.get_user_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Verify session belongs to user (if authenticated)
        if user_id and session.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # In a real implementation, you would delete the session and its messages
        # For now, we'll just return success
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")