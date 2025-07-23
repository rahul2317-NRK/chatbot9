# Blue Pixel AI Chatbot - Node.js Implementation

A comprehensive real estate investment assistant powered by AI and Model Context Protocol (MCP), built with Node.js, Express, and Socket.IO for real-time communication.

## 🚀 **Node.js Architecture Overview**

### **Technology Stack**
- **Backend**: Node.js with Express.js
- **Real-time Communication**: Socket.IO for WebSocket connections
- **AI Integration**: OpenAI GPT-3.5/GPT-4 API
- **Database**: AWS DynamoDB with AWS SDK
- **Authentication**: JWT tokens with bcryptjs
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston with structured logging
- **Validation**: Joi for input validation
- **Frontend**: Modern HTML5 with Alpine.js and Tailwind CSS

### **Key Features**
- **Real-time Chat**: WebSocket-based instant messaging
- **MCP Tools Integration**: 10+ specialized real estate tools
- **Advanced Security**: Helmet, CORS, rate limiting, input validation
- **Comprehensive Logging**: Winston with multiple transports
- **Session Management**: Persistent user sessions with DynamoDB
- **Property Intelligence**: AI-powered property analysis
- **Financial Calculations**: Advanced mortgage and ROI calculators

## 📦 **Installation & Setup**

### **Prerequisites**
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- AWS Account (for DynamoDB)
- OpenAI API Key

### **Quick Start**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blue-pixel-ai-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo
   
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   
   # Server Configuration
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=development
   
   # Security
   JWT_SECRET_KEY=your_jwt_secret_key_here
   SESSION_SECRET=your_session_secret_here
   
   # External APIs (Optional)
   GOOGLE_SEARCH_API_KEY=your_google_search_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Start the production server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Web Interface: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - MCP Tools: http://localhost:3000/api/mcp/tools

## 🛠️ **Available Scripts**

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run build      # Build frontend assets (if using webpack)
npm test           # Run tests with Jest
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## 📡 **API Endpoints**

### **Health & Status**
- `GET /health` - Server health check
- `GET /api/mcp/tools` - Available MCP tools
- `GET /api/mcp/server` - MCP server status

### **Chat & Sessions**
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions/:id` - Get session details
- `GET /api/chat/sessions/:id/history` - Get chat history
- `POST /api/chat/message` - Send chat message (REST)
- `WS /socket.io` - WebSocket connection for real-time chat

### **Property Analysis**
- `GET /api/properties/search` - Search properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties/:id/save` - Save property
- `GET /api/properties/saved` - Get saved properties
- `POST /api/properties/calculator` - Mortgage calculator

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

## 🔧 **MCP Tools Available**

1. **validatePromptRelevance** - Property topic validation
2. **searchPropertyInfo** - Web search integration
3. **getUserChatHistory** - Session history management
4. **getPropertyDetails** - Property information retrieval
5. **getInterestRates** - Location-based interest rates
6. **calculateMortgage** - Basic mortgage calculations
7. **calculateMortgageAdvanced** - Advanced mortgage with PMI, taxes
8. **getUserSavedProperties** - User's saved properties
9. **getServicedProperties** - Platform-serviced properties
10. **getFinancialCalculator** - ROI, cash flow, cap rate calculations

## 🌐 **WebSocket Events**

### **Client to Server**
```javascript
socket.emit('join_session', sessionId);
socket.emit('chat_message', { message, sessionId, userId });
socket.emit('typing_start', sessionId);
socket.emit('typing_stop', sessionId);
```

### **Server to Client**
```javascript
socket.on('ai_response', (data) => {
  // { response, sessionId, timestamp, toolsUsed, propertyData }
});
socket.on('user_typing', (data) => {
  // { socketId }
});
socket.on('error', (data) => {
  // { message, error }
});
```

## 🔒 **Security Features**

- **Helmet.js**: Security headers and CSP
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: API request throttling
- **Input Validation**: Joi schema validation
- **JWT Authentication**: Secure token-based auth
- **Session Security**: Secure cookie configuration
- **Error Handling**: Comprehensive error management

## 📊 **Logging & Monitoring**

### **Winston Logger Configuration**
- **Console Logging**: Development environment
- **File Logging**: Production with rotation
- **Error Logging**: Separate error log files
- **Structured Logging**: JSON format for analysis

### **Log Types**
- HTTP requests with response times
- MCP tool executions with performance metrics
- AI interactions with token usage
- Security events and authentication
- Database operations and errors

## 🏗️ **Project Structure**

```
src/
├── config/
│   └── config.js          # Environment configuration
├── database/
│   └── dynamodb.js        # DynamoDB operations
├── mcp/
│   └── tools.js           # MCP tools implementation
├── middleware/
│   ├── auth.js            # Authentication middleware
│   ├── errorHandler.js    # Error handling
│   └── logging.js         # Request logging
├── models/
│   └── index.js           # Data models and validation
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── chat.js            # Chat API routes
│   ├── mcp.js             # MCP tool routes
│   └── properties.js      # Property routes
├── services/
│   ├── aiService.js       # OpenAI integration
│   └── chatService.js     # Chat processing
├── utils/
│   └── logger.js          # Winston logger setup
└── server.js              # Main server file

public/
├── index.html             # Frontend interface
└── assets/                # Static assets

logs/                      # Log files
├── app.log               # Application logs
└── error.log             # Error logs
```

## 🚀 **Deployment**

### **Docker Deployment**
```bash
# Build Docker image
docker build -t blue-pixel-ai-nodejs .

# Run container
docker run -p 3000:3000 --env-file .env blue-pixel-ai-nodejs
```

### **AWS Deployment**
1. **EC2 Instance**: Deploy with PM2 process manager
2. **Lambda**: Serverless deployment with API Gateway
3. **ECS**: Container orchestration
4. **Elastic Beanstalk**: Platform-as-a-Service deployment

### **Environment Variables for Production**
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
RATE_LIMIT_MAX=1000
CORS_ORIGIN=https://yourdomain.com
```

## ⚡ **Performance Optimizations**

- **Compression**: Gzip compression for responses
- **Connection Pooling**: Efficient database connections
- **Caching**: Session and property data caching
- **Rate Limiting**: Prevent API abuse
- **WebSocket Optimization**: Efficient real-time communication

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="MCP Tools"
```

## 🔍 **Monitoring & Analytics**

### **Health Checks**
- Server health endpoint
- Database connectivity
- External API status
- WebSocket connection status

### **Metrics Tracked**
- Response times for API endpoints
- MCP tool execution times
- WebSocket connection counts
- Error rates and types
- User interaction patterns

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 **Support**

- **Email**: support@bluepixel.com
- **Documentation**: Check the `/docs` folder
- **Issues**: Create an issue in the repository
- **Discord**: Join our developer community

---

**Blue Pixel AI Chatbot (Node.js)** - Modern, scalable real estate AI assistant with real-time capabilities.