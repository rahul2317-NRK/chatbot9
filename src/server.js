import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

// Get current directory (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment check
console.log('🔍 Environment check:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Found' : 'NOT FOUND');
console.log('- PORT:', process.env.PORT);

// Simple logger
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

// Gemini AI Service
class GeminiAIService {
  constructor() {
    console.log('🚀 Initializing Gemini AI Service...');
    
    if (process.env.GEMINI_API_KEY) {
      try {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL
});
        this.isInitialized = true;
        console.log('✅ Gemini AI service initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing Gemini:', error);
        this.isInitialized = false;
      }
    } else {
      console.log('❌ No Gemini API key found');
      this.isInitialized = false;
    }
  }

  async processMessage({ message, sessionId, userId }) {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Processing message with Gemini:', message);
      
      if (!this.isInitialized || !this.model) {
        throw new Error('Gemini not initialized');
      }

      const prompt = `You are Blue Pixel AI, a professional real estate investment assistant in India.

User question: "${message}"

Provide helpful, specific advice about:
- Property investment opportunities
- Market analysis and trends  
- Mortgage and financing options
- Location insights and recommendations
- Price analysis and value assessments

Be conversational, practical, and focus on actionable insights for the Indian real estate market. Keep responses concise but informative.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();
      
      console.log('✅ Gemini response generated');
      
      return {
        response: aiResponse,
        sessionId,
        timestamp: new Date().toISOString(),
        toolsUsed: ['gemini-ai', 'real-estate-analysis'],
        propertyData: null,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Gemini error:', error);
      
      // Smart fallback based on message content
      let fallbackResponse = '';
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('market analysis') || lowerMessage.includes('market')) {
        fallbackResponse = `📈 **Real Estate Market Analysis:**

**Current Trends:**
• Property appreciation: 8-12% annually in major cities
• Best performing markets: Hyderabad, Pune, Bangalore
• Interest rates: 8.5-9.5% for home loans
• Rental yields: 2-4% in prime locations

**Investment Hotspots:**
• IT corridors and tech hubs
• Areas near metro stations
• Upcoming infrastructure projects
• Tier-2 cities with growth potential

**Key Factors to Consider:**
• Location connectivity
• Future development plans  
• Supply vs demand ratio
• Price trends over 2-3 years

Would you like specific analysis for any particular city or area?`;
      } else if (lowerMessage.includes('property') || lowerMessage.includes('house') || lowerMessage.includes('apartment')) {
        fallbackResponse = `🏠 **Property Investment Guide:**

**Popular Property Types:**
• 2-3 BHK apartments: ₹40-80 lakhs
• Villas: ₹80L-2Cr depending on location
• Plots: Good for long-term appreciation

**Top Cities for Investment:**
• Hyderabad: Affordable with good growth
• Pune: Strong IT sector presence  
• Bangalore: Premium market with high demand
• Chennai: Stable market with steady returns

**Investment Tips:**
• Research builder reputation
• Check legal clearances
• Consider resale value
• Factor in maintenance costs

What specific property information do you need?`;
      } else if (lowerMessage.includes('mortgage') || lowerMessage.includes('loan') || lowerMessage.includes('emi')) {
        fallbackResponse = `💰 **Mortgage & Loan Information:**

**Current Interest Rates:**
• SBI: 8.60% - 8.85%
• HDFC: 8.75% - 9.00%
• ICICI: 8.70% - 8.95%
• Axis Bank: 8.80% - 9.05%

**EMI Calculation Example:**
• Loan Amount: ₹50 lakhs
• Interest Rate: 8.75%
• Tenure: 20 years
• Monthly EMI: ~₹43,500

**Tips for Better Rates:**
• Maintain good credit score (750+)
• Higher down payment (20%+)
• Compare multiple banks
• Consider floating vs fixed rates

Need help calculating EMI for a specific amount?`;
      } else {
        fallbackResponse = `I'm Blue Pixel AI, your real estate investment assistant! 🏠

I can help you with:
• Property search and recommendations
• Market analysis and trends
• Mortgage calculations and EMI planning
• Investment advice and ROI analysis
• Location insights and price comparisons

Please ask me about specific properties, locations, or real estate investments you're interested in!

*Note: I'm currently running in fallback mode. For full AI responses, please ensure the Gemini API key is properly configured.*`;
      }
      
      return {
        response: fallbackResponse,
        sessionId,
        timestamp: new Date().toISOString(),
        toolsUsed: ['smart-fallback'],
        propertyData: null,
        executionTime: Date.now() - startTime
      };
    }
  }
}

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const aiService = new GeminiAIService();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'bluepixel-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Blue Pixel AI Chatbot (Node.js + Gemini)',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    aiService: aiService.isInitialized ? 'Gemini Active' : 'Fallback Mode'
  });
});

// MCP Tools endpoint
app.get('/api/mcp/tools', (req, res) => {
  res.json({
    availableTools: [
      'validatePromptRelevance',
      'searchPropertyInfo', 
      'getUserChatHistory',
      'getPropertyDetails',
      'getInterestRates',
      'calculateMortgage',
      'getUserSavedProperties',
      'getServicedProperties',
      'calculateMortgageAdvanced',
      'getFinancialCalculator'
    ],
    totalCount: 10,
    timestamp: new Date().toISOString(),
    aiProvider: 'Google Gemini'
  });
});

// Create chat session endpoint
app.post('/api/chat/sessions', (req, res) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('New chat session created', { sessionId, userId });
  
  res.json({
    sessionId,
    userId,
    createdAt: new Date().toISOString(),
    message: 'Session created successfully',
    aiProvider: 'Google Gemini'
  });
});

// Main chat interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New WebSocket connection', { socketId: socket.id });

  // Join a session room
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    logger.info('Socket joined session', { socketId: socket.id, sessionId });
  });

  // Handle chat messages
  socket.on('chat_message', async (data) => {
    try {
      const { message, sessionId, userId } = data;
      logger.info('Processing chat message', { sessionId, userId, messageLength: message.length });
      
      // Process the message through the AI service
      const response = await aiService.processMessage({
        message,
        sessionId,
        userId
      });

      // Send response back to the client
      const responseData = {
        response: response.response,
        sessionId: response.sessionId,
        timestamp: response.timestamp,
        toolsUsed: response.toolsUsed || [],
        propertyData: response.propertyData,
        executionTime: response.executionTime
      };

      // Send to all clients in the session
      io.to(sessionId).emit('ai_response', responseData);
      
      logger.info('AI response sent', { sessionId, toolsUsed: response.toolsUsed?.length || 0 });

    } catch (error) {
      logger.error('Error processing message:', error);
      socket.emit('error', {
        message: 'Failed to process message',
        error: error.message
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (sessionId) => {
    socket.to(sessionId).emit('user_typing', { socketId: socket.id });
  });

  socket.on('typing_stop', (sessionId) => {
    socket.to(sessionId).emit('user_stopped_typing', { socketId: socket.id });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info('WebSocket disconnected', { socketId: socket.id });
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Application error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Blue Pixel AI Chatbot server started on port ${PORT}`);
  logger.info(`📍 Access the application at: http://localhost:${PORT}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔧 MCP Tools: http://localhost:${PORT}/api/mcp/tools`);
  logger.info(`🤖 AI Provider: Google Gemini ${aiService.isInitialized ? '(Active)' : '(Fallback Mode)'}`);
});

export default server;
