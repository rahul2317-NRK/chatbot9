import boto3
from boto3.dynamodb.conditions import Key, Attr
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from app.config import settings
from app.models import UserSession, SavedProperty, ChatMessage

class DatabaseManager:
    def __init__(self):
        self.dynamodb = boto3.resource(
            'dynamodb',
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key
        )
        self.table_prefix = settings.dynamodb_table_prefix
        self._initialize_tables()

    def _initialize_tables(self):
        """Initialize DynamoDB tables if they don't exist"""
        try:
            # User Sessions table
            self.sessions_table = self.dynamodb.Table(f"{self.table_prefix}user_sessions")
            
            # Chat Messages table
            self.messages_table = self.dynamodb.Table(f"{self.table_prefix}chat_messages")
            
            # Saved Properties table
            self.saved_properties_table = self.dynamodb.Table(f"{self.table_prefix}saved_properties")
            
            # Property Details table
            self.property_details_table = self.dynamodb.Table(f"{self.table_prefix}property_details")
            
            # User Interactions table
            self.user_interactions_table = self.dynamodb.Table(f"{self.table_prefix}user_interactions")
            
        except Exception as e:
            print(f"Error initializing tables: {e}")
            # In production, you might want to create tables programmatically
            pass

    async def create_user_session(self, session_data: UserSession) -> bool:
        """Create a new user session"""
        try:
            self.sessions_table.put_item(
                Item={
                    'session_id': session_data.session_id,
                    'user_id': session_data.user_id,
                    'created_at': session_data.created_at.isoformat(),
                    'last_activity': session_data.last_activity.isoformat(),
                    'preferences': session_data.preferences
                }
            )
            return True
        except Exception as e:
            print(f"Error creating user session: {e}")
            return False

    async def get_user_session(self, session_id: str) -> Optional[UserSession]:
        """Get user session by session ID"""
        try:
            response = self.sessions_table.get_item(
                Key={'session_id': session_id}
            )
            if 'Item' in response:
                item = response['Item']
                return UserSession(
                    session_id=item['session_id'],
                    user_id=item['user_id'],
                    created_at=datetime.fromisoformat(item['created_at']),
                    last_activity=datetime.fromisoformat(item['last_activity']),
                    preferences=item.get('preferences', {})
                )
            return None
        except Exception as e:
            print(f"Error getting user session: {e}")
            return None

    async def update_session_activity(self, session_id: str) -> bool:
        """Update last activity timestamp for a session"""
        try:
            self.sessions_table.update_item(
                Key={'session_id': session_id},
                UpdateExpression='SET last_activity = :timestamp',
                ExpressionAttributeValues={
                    ':timestamp': datetime.now().isoformat()
                }
            )
            return True
        except Exception as e:
            print(f"Error updating session activity: {e}")
            return False

    async def save_chat_message(self, message: ChatMessage) -> bool:
        """Save a chat message to the database"""
        try:
            self.messages_table.put_item(
                Item={
                    'message_id': f"{message.session_id}#{message.timestamp.isoformat()}",
                    'session_id': message.session_id,
                    'user_id': message.user_id,
                    'message': message.message,
                    'message_type': message.message_type.value,
                    'timestamp': message.timestamp.isoformat()
                }
            )
            return True
        except Exception as e:
            print(f"Error saving chat message: {e}")
            return False

    async def get_chat_history(self, session_id: str, limit: int = 50) -> List[ChatMessage]:
        """Get chat history for a session"""
        try:
            response = self.messages_table.query(
                IndexName='session_id-timestamp-index',
                KeyConditionExpression=Key('session_id').eq(session_id),
                ScanIndexForward=False,
                Limit=limit
            )
            
            messages = []
            for item in response['Items']:
                messages.append(ChatMessage(
                    message=item['message'],
                    session_id=item['session_id'],
                    user_id=item['user_id'],
                    timestamp=datetime.fromisoformat(item['timestamp']),
                    message_type=item['message_type']
                ))
            
            return messages[::-1]  # Reverse to get chronological order
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return []

    async def save_property(self, user_id: str, property_id: str, notes: str = None) -> bool:
        """Save a property to user's saved list"""
        try:
            saved_property = SavedProperty(
                user_id=user_id,
                property_id=property_id,
                notes=notes
            )
            
            self.saved_properties_table.put_item(
                Item={
                    'user_property_id': f"{user_id}#{property_id}",
                    'user_id': user_id,
                    'property_id': property_id,
                    'saved_at': saved_property.saved_at.isoformat(),
                    'notes': notes or ''
                }
            )
            return True
        except Exception as e:
            print(f"Error saving property: {e}")
            return False

    async def get_saved_properties(self, user_id: str) -> List[SavedProperty]:
        """Get user's saved properties"""
        try:
            response = self.saved_properties_table.query(
                IndexName='user_id-saved_at-index',
                KeyConditionExpression=Key('user_id').eq(user_id),
                ScanIndexForward=False
            )
            
            properties = []
            for item in response['Items']:
                properties.append(SavedProperty(
                    user_id=item['user_id'],
                    property_id=item['property_id'],
                    saved_at=datetime.fromisoformat(item['saved_at']),
                    notes=item.get('notes', '')
                ))
            
            return properties
        except Exception as e:
            print(f"Error getting saved properties: {e}")
            return []

    async def store_property_details(self, property_data: Dict[str, Any]) -> bool:
        """Store property details in the database"""
        try:
            self.property_details_table.put_item(
                Item={
                    'property_id': property_data['property_id'],
                    'data': json.dumps(property_data),
                    'updated_at': datetime.now().isoformat()
                }
            )
            return True
        except Exception as e:
            print(f"Error storing property details: {e}")
            return False

    async def get_property_details(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get property details from the database"""
        try:
            response = self.property_details_table.get_item(
                Key={'property_id': property_id}
            )
            if 'Item' in response:
                return json.loads(response['Item']['data'])
            return None
        except Exception as e:
            print(f"Error getting property details: {e}")
            return None

    async def log_user_interaction(self, user_id: str, interaction_type: str, data: Dict[str, Any]) -> bool:
        """Log user interactions for analytics"""
        try:
            self.user_interactions_table.put_item(
                Item={
                    'interaction_id': f"{user_id}#{datetime.now().isoformat()}",
                    'user_id': user_id,
                    'interaction_type': interaction_type,
                    'data': json.dumps(data),
                    'timestamp': datetime.now().isoformat()
                }
            )
            return True
        except Exception as e:
            print(f"Error logging user interaction: {e}")
            return False

# Global database manager instance
db_manager = DatabaseManager()