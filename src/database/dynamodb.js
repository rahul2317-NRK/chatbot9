import AWS from 'aws-sdk';
import config from '../config/config.js';
import { ChatMessage, UserSession, MessageType } from '../models/index.js';
import logger from '../utils/logger.js';

class DatabaseManager {
  constructor() {
    AWS.config.update({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.region
    });

    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    this.tablePrefix = config.aws.dynamodb.tablePrefix;
  }

  // Helper method to get table name
  getTableName(tableName) {
    return `${this.tablePrefix}${tableName}`;
  }

  // User Sessions
  async createUserSession(sessionData) {
    try {
      const session = new UserSession(sessionData);
      
      const params = {
        TableName: this.getTableName('user_sessions'),
        Item: session.toJSON()
      };

      await this.dynamodb.put(params).promise();
      logger.info(`Created user session: ${session.sessionId}`);
      return session;
    } catch (error) {
      logger.error('Error creating user session:', error);
      throw error;
    }
  }

  async getUserSession(sessionId) {
    try {
      const params = {
        TableName: this.getTableName('user_sessions'),
        Key: { sessionId }
      };

      const result = await this.dynamodb.get(params).promise();
      
      if (result.Item) {
        return new UserSession(result.Item);
      }
      return null;
    } catch (error) {
      logger.error('Error getting user session:', error);
      throw error;
    }
  }

  async updateSessionActivity(sessionId) {
    try {
      const params = {
        TableName: this.getTableName('user_sessions'),
        Key: { sessionId },
        UpdateExpression: 'SET lastActivity = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString()
        }
      };

      await this.dynamodb.update(params).promise();
      logger.debug(`Updated session activity: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Error updating session activity:', error);
      return false;
    }
  }

  // Chat Messages
  async saveChatMessage(messageData) {
    try {
      const message = new ChatMessage(messageData);
      
      const params = {
        TableName: this.getTableName('chat_messages'),
        Item: {
          messageId: message.id,
          sessionId: message.sessionId,
          userId: message.userId,
          message: message.message,
          messageType: message.messageType,
          timestamp: message.timestamp
        }
      };

      await this.dynamodb.put(params).promise();
      logger.debug(`Saved chat message: ${message.id}`);
      return message;
    } catch (error) {
      logger.error('Error saving chat message:', error);
      throw error;
    }
  }

  async getChatHistory(sessionId, limit = 50) {
    try {
      const params = {
        TableName: this.getTableName('chat_messages'),
        IndexName: 'sessionId-timestamp-index',
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: {
          ':sessionId': sessionId
        },
        ScanIndexForward: false,
        Limit: limit
      };

      const result = await this.dynamodb.query(params).promise();
      
      const messages = result.Items.map(item => new ChatMessage({
        id: item.messageId,
        message: item.message,
        sessionId: item.sessionId,
        userId: item.userId,
        timestamp: item.timestamp,
        messageType: item.messageType
      }));

      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      logger.error('Error getting chat history:', error);
      return [];
    }
  }

  // Saved Properties
  async saveProperty(userId, propertyId, notes = null) {
    try {
      const params = {
        TableName: this.getTableName('saved_properties'),
        Item: {
          userPropertyId: `${userId}#${propertyId}`,
          userId,
          propertyId,
          savedAt: new Date().toISOString(),
          notes: notes || ''
        }
      };

      await this.dynamodb.put(params).promise();
      logger.info(`Saved property ${propertyId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error saving property:', error);
      return false;
    }
  }

  async getSavedProperties(userId) {
    try {
      const params = {
        TableName: this.getTableName('saved_properties'),
        IndexName: 'userId-savedAt-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false
      };

      const result = await this.dynamodb.query(params).promise();
      return result.Items || [];
    } catch (error) {
      logger.error('Error getting saved properties:', error);
      return [];
    }
  }

  async removeSavedProperty(userId, propertyId) {
    try {
      const params = {
        TableName: this.getTableName('saved_properties'),
        Key: {
          userPropertyId: `${userId}#${propertyId}`
        }
      };

      await this.dynamodb.delete(params).promise();
      logger.info(`Removed saved property ${propertyId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error removing saved property:', error);
      return false;
    }
  }

  // Property Details
  async storePropertyDetails(propertyData) {
    try {
      const params = {
        TableName: this.getTableName('property_details'),
        Item: {
          propertyId: propertyData.propertyId,
          data: propertyData,
          updatedAt: new Date().toISOString()
        }
      };

      await this.dynamodb.put(params).promise();
      logger.debug(`Stored property details: ${propertyData.propertyId}`);
      return true;
    } catch (error) {
      logger.error('Error storing property details:', error);
      return false;
    }
  }

  async getPropertyDetails(propertyId) {
    try {
      const params = {
        TableName: this.getTableName('property_details'),
        Key: { propertyId }
      };

      const result = await this.dynamodb.get(params).promise();
      
      if (result.Item) {
        return result.Item.data;
      }
      return null;
    } catch (error) {
      logger.error('Error getting property details:', error);
      return null;
    }
  }

  // User Interactions (Analytics)
  async logUserInteraction(userId, interactionType, data) {
    try {
      const params = {
        TableName: this.getTableName('user_interactions'),
        Item: {
          interactionId: `${userId}#${Date.now()}`,
          userId,
          interactionType,
          data,
          timestamp: new Date().toISOString()
        }
      };

      await this.dynamodb.put(params).promise();
      logger.debug(`Logged user interaction: ${interactionType} for ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error logging user interaction:', error);
      return false;
    }
  }

  async getUserInteractions(userId, limit = 100) {
    try {
      const params = {
        TableName: this.getTableName('user_interactions'),
        IndexName: 'userId-timestamp-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false,
        Limit: limit
      };

      const result = await this.dynamodb.query(params).promise();
      return result.Items || [];
    } catch (error) {
      logger.error('Error getting user interactions:', error);
      return [];
    }
  }

  // Batch Operations
  async batchGetProperties(propertyIds) {
    try {
      const keys = propertyIds.map(id => ({ propertyId: id }));
      
      const params = {
        RequestItems: {
          [this.getTableName('property_details')]: {
            Keys: keys
          }
        }
      };

      const result = await this.dynamodb.batchGet(params).promise();
      const items = result.Responses[this.getTableName('property_details')] || [];
      
      return items.map(item => item.data);
    } catch (error) {
      logger.error('Error batch getting properties:', error);
      return [];
    }
  }

  // Health Check
  async healthCheck() {
    try {
      const params = {
        TableName: this.getTableName('user_sessions'),
        Limit: 1
      };

      await this.dynamodb.scan(params).promise();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  // Cleanup old data
  async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const params = {
        TableName: this.getTableName('user_sessions'),
        FilterExpression: 'lastActivity < :cutoff',
        ExpressionAttributeValues: {
          ':cutoff': cutoffDate.toISOString()
        }
      };

      const result = await this.dynamodb.scan(params).promise();
      
      if (result.Items.length > 0) {
        const deleteRequests = result.Items.map(item => ({
          DeleteRequest: {
            Key: { sessionId: item.sessionId }
          }
        }));

        // Process in batches of 25 (DynamoDB limit)
        for (let i = 0; i < deleteRequests.length; i += 25) {
          const batch = deleteRequests.slice(i, i + 25);
          const batchParams = {
            RequestItems: {
              [this.getTableName('user_sessions')]: batch
            }
          };

          await this.dynamodb.batchWrite(batchParams).promise();
        }

        logger.info(`Cleaned up ${result.Items.length} old sessions`);
      }

      return result.Items.length;
    } catch (error) {
      logger.error('Error cleaning up old sessions:', error);
      return 0;
    }
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
export default dbManager;