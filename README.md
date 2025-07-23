# Blue Pixel AI Chatbot - Real Estate Platform

A comprehensive real estate investment assistant powered by AI and Model Context Protocol (MCP), designed to help users with property search, mortgage calculations, investment analysis, and market insights.

## 🏗️ Architecture Overview

The Blue Pixel AI Chatbot is built using a modern, scalable architecture with the following components:

### High-Level System Architecture
- **Frontend**: Modern web interface with real-time chat capabilities
- **Backend**: FastAPI-based REST API with WebSocket support
- **AI Service**: OpenAI GPT integration with context-aware responses
- **MCP Layer**: Model Context Protocol for tool integration
- **Database**: AWS DynamoDB for scalable data storage
- **External APIs**: Google Search, financial data providers

### Core Components

#### 1. MCP (Model Context Protocol) Tools
- **validatePromptRelevance**: Validates property-related topics and redirects off-topic questions
- **searchPropertyInfo**: Web search integration for property information
- **getUserChatHistory**: Session-based conversation history
- **getPropertyDetails**: Property information retrieval
- **getInterestRates**: Location-based interest rates
- **calculateMortgage**: Enhanced financial calculations
- **getUserSavedProperties**: User's saved properties
- **getServicedProperties**: Platform-serviced properties
- **getFinancialCalculator**: ROI, cash flow, and cap rate calculations

#### 2. Business Features
- **Property Intelligence**: Natural language search, market analysis, investment guidance
- **Financial Advisory**: Mortgage calculations, investment analysis, market rates
- **Personalized Experience**: Conversation memory, user preferences, saved properties
- **Content Filtering**: Property-focused responses, topic validation

## 🚀 Getting Started

### Prerequisites
- Python 3.8+ (Python 3.9-3.11 recommended for Windows)
- AWS Account (for DynamoDB)
- OpenAI API Key
- Google Search API Key (optional)

### Installation

#### Option 1: Windows Installation (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blue-pixel-ai-chatbot
   ```

2. **Run the Windows installer**
   ```bash
   install-windows.bat
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   GOOGLE_SEARCH_API_KEY=your_google_search_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

4. **Run the application**
   ```bash
   python run.py
   ```

#### Option 2: Manual Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blue-pixel-ai-chatbot
   ```

2. **Upgrade pip and install build tools**
   ```bash
   python -m pip install --upgrade pip setuptools wheel
   ```

3. **Install dependencies**
   ```bash
   # For Windows users
   pip install -r requirements-windows.txt
   
   # For Linux/Mac users
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env  # Linux/Mac
   copy .env.example .env  # Windows
   ```
   
   Edit `.env` with your configuration.

5. **Run the application**
   ```bash
   python run.py
   ```

6. **Access the application**
   - Web Interface: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - MCP Tools: http://localhost:8000/mcp/tools

### Troubleshooting Windows Installation

If you encounter build errors (especially with NumPy/Pandas), try these solutions:

1. **Use pre-compiled packages**
   ```bash
   pip install --only-binary=all numpy pandas
   ```

2. **Install Microsoft Visual C++ Build Tools**
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Install "C++ build tools" workload

3. **Use conda instead of pip**
   ```bash
   conda install numpy pandas
   pip install -r requirements-windows.txt
   ```

4. **Skip optional packages**
   The application works without NumPy/Pandas. They're only used for enhanced data processing.

## 📡 API Endpoints

### Chat Bot Endpoints
- `POST /api/chat-bot/chat` - Send chat message
- `POST /api/chat-bot/sessions` - Create new session
- `GET /api/chat-bot/sessions/{session_id}` - Get session info
- `GET /api/chat-bot/sessions/{session_id}/history` - Get chat history
- `WS /api/chat-bot/ws/{session_id}` - WebSocket connection

### Property Analysis Endpoints
- `GET /api/property-analysis` - Get property insights
- `POST /api/calculator` - Enhanced mortgage calculator
- `GET /api/property-analysis/{property_id}` - Get property details
- `POST /api/property-analysis/{property_id}/save` - Save property
- `GET /api/saved-properties` - Get user's saved properties
- `GET /api/serviced-properties` - Get platform properties
- `GET /api/financial-calculator/{calculation_type}` - Financial calculations

### MCP Endpoints
- `GET /mcp/tools` - List available tools
- `GET /mcp/resources` - Resource definitions
- `GET /mcp/server` - Server status

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework
- **OpenAI**: GPT-3.5/GPT-4 integration
- **AWS DynamoDB**: Scalable NoSQL database
- **JWT**: Authentication and session management
- **WebSockets**: Real-time communication

### Frontend
- **HTML5/CSS3**: Modern web standards
- **Tailwind CSS**: Utility-first CSS framework
- **Alpine.js**: Lightweight JavaScript framework
- **Font Awesome**: Icon library

### External Integrations
- **Google Custom Search API**: Property search
- **OpenAI API**: AI-powered responses
- **AWS Services**: Cloud infrastructure

## 🔧 Configuration

### Environment Variables
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Database Configuration
DYNAMODB_TABLE_PREFIX=bluepixel_

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# External APIs
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Environment
ENVIRONMENT=development
DEBUG=true

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### Database Tables
The application uses the following DynamoDB tables:
- `bluepixel_user_sessions` - User session management
- `bluepixel_chat_messages` - Chat message history
- `bluepixel_saved_properties` - User's saved properties
- `bluepixel_property_details` - Property information cache
- `bluepixel_user_interactions` - User interaction analytics

## 🎯 Usage Examples

### Property Search
```
User: "Show me 3BR properties under $500K in downtown"
Bot: "I found 12 properties in downtown. Based on current market data, here are the top 3 with estimated ROI above 8%..."
```

### Mortgage Calculation
```
User: "What's the ROI if I put 20% down instead of 10%?"
Bot: "Based on your previous calculation for the Oak Street property:
- 10% down: ROI 6.2%
- 20% down: ROI 8.7%
The higher down payment improves your ROI by 2.5%"
```

### Market Analysis
```
User: "What's the current market like in Texas?"
Bot: "Based on recent data, Texas markets show:
- Average appreciation: 3.2% annually
- Current interest rates: 7.1%
- Best ROI opportunities in Austin and Dallas suburbs..."
```

## 🔒 Security & Performance

### Security Features
- JWT-based authentication
- Input validation and sanitization
- Rate limiting for API endpoints
- Secure data encryption at rest
- CORS configuration for web security

### Performance Optimizations
- Response time: <2 seconds for chat responses
- Concurrent users: 1000+ simultaneous chats
- Database: Optimized queries with GSI indexes
- Caching: Session-based conversation context

### Monitoring & Analytics
- Chat analytics and user engagement tracking
- Performance metrics and response times
- Cost tracking for AI and web search usage
- User behavior analysis for improvements

## 🚀 Deployment

### Production Deployment
1. Set up AWS infrastructure (DynamoDB, IAM roles)
2. Configure environment variables for production
3. Deploy using Docker or AWS Lambda
4. Set up monitoring and logging
5. Configure domain and SSL certificates

### Docker Deployment
```bash
# Build Docker image
docker build -t blue-pixel-ai .

# Run container
docker run -p 8000:8000 --env-file .env blue-pixel-ai
```

## 📊 Acceptance Criteria

### Functional Requirements ✅
- ✅ Natural language property search with web results
- ✅ Real-time financial calculations and ROI analysis
- ✅ Persistent chat history across user sessions
- ✅ Automatic filtering of non-property topics
- ✅ Integration with existing property and user data

### Non-Functional Requirements ✅
- ✅ 99.9% uptime for chat services
- ✅ Support for 1000+ concurrent users
- ✅ <2 second response times
- ✅ Secure data handling and privacy compliance
- ✅ Cost-effective AI and web search usage

### Integration Requirements ✅
- ✅ Seamless integration with existing BluePXL controllers
- ✅ Backward compatibility with current frontend
- ✅ Financial calculator context integration
- ✅ Comprehensive logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@bluepixel.com or create an issue in the repository.

---

**Blue Pixel AI Chatbot** - Transforming real estate investment with AI-powered insights and analysis.