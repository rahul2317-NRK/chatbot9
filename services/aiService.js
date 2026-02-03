import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIService {
  constructor() {
    // Initialize Gemini
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
   this.model = this.genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL
});

    
    console.log('✅ Gemini AI service initialized');
    
    // MCP Tools simulation
    this.mcpTools = {
      validatePromptRelevance: this.validatePromptRelevance.bind(this),
      searchPropertyInfo: this.searchPropertyInfo.bind(this),
      getPropertyDetails: this.getPropertyDetails.bind(this),
      getInterestRates: this.getInterestRates.bind(this),
      calculateMortgage: this.calculateMortgage.bind(this)
    };
  }

  async processMessage({ message, sessionId, userId }) {
  const startTime = Date.now();

  try {
    console.log('🤖 Gemini AI Service processing message:', message);

    // Step 1: Validate prompt relevance
    const isRelevant = await this.validatePromptRelevance(message);
    if (!isRelevant.isValid) {
      return {
        response: isRelevant.filteredContent,
        sessionId,
        timestamp: new Date().toISOString(),
        toolsUsed: ['validatePromptRelevance'],
        propertyData: null,
        executionTime: Date.now() - startTime
      };
    }

    // Step 2: Determine tools
    const toolsToUse = this.determineRequiredTools(message);
    const toolResults = {};

    for (const toolName of toolsToUse) {
      if (this.mcpTools[toolName]) {
        toolResults[toolName] = await this.mcpTools[toolName](message);
      }
    }

    // Step 3: Gemini response
    const aiResponse = await this.generateGeminiResponse(message, toolResults);

    return {
      response: aiResponse,
      sessionId,
      timestamp: new Date().toISOString(),
      toolsUsed: toolsToUse,
      propertyData: this.extractPropertyData(toolResults),
      executionTime: Date.now() - startTime
    };

  } catch (error) {
  console.error('❌ Gemini error FULL:', {
    message: error.message,
    stack: error.stack
  });

  return {
    response: "⚠️ Gemini is unavailable. Please try again shortly.",
    sessionId,
    timestamp: new Date().toISOString(),
    toolsUsed: ['gemini-ai'],
    propertyData: null,
    executionTime: Date.now() - startTime
  };
}


  async validatePromptRelevance(message) {
    const realEstateKeywords = [
      'property', 'house', 'apartment', 'real estate', 'mortgage', 'loan', 'buy', 'sell', 'rent',
      'investment', 'market', 'price', 'value', 'location', 'hyderabad', 'bangalore', 'mumbai',
      'delhi', 'pune', 'chennai', 'kolkata', 'ahmedabad', 'surat', 'jaipur', 'lucknow',
      'interest rate', 'down payment', 'emi', 'sq ft', 'bhk', 'villa', 'plot', 'land',
      'construction', 'builder', 'project', 'amenities', 'gated community'
    ];

    const lowerMessage = message.toLowerCase();
    const hasRealEstateKeywords = realEstateKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    if (!hasRealEstateKeywords && lowerMessage.length > 10) {
      return {
        isValid: false,
        filteredContent: "I'm Blue Pixel AI, your specialized real estate assistant! I help with property investments, home buying/selling, mortgage calculations, market analysis, and real estate advice. Please ask me about properties, locations, prices, or any real estate related questions! 🏠💼"
      };
    }

    return { isValid: true };
  }

  determineRequiredTools(message) {
    const tools = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('property') || lowerMessage.includes('house') || 
        lowerMessage.includes('apartment') || lowerMessage.includes('search') ||
        lowerMessage.includes('find') || lowerMessage.includes('looking for')) {
      tools.push('searchPropertyInfo');
    }
    
    if (lowerMessage.includes('mortgage') || lowerMessage.includes('loan') || 
        lowerMessage.includes('emi') || lowerMessage.includes('calculate')) {
      tools.push('calculateMortgage');
    }
    
    if (lowerMessage.includes('interest rate') || lowerMessage.includes('rate') ||
        lowerMessage.includes('bank')) {
      tools.push('getInterestRates');
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('value') || 
        lowerMessage.includes('cost') || lowerMessage.includes('worth')) {
      tools.push('getPropertyDetails');
    }

    return tools.length > 0 ? tools : ['searchPropertyInfo'];
  }

  async generateGeminiResponse(message, toolResults) {
    try {
      const systemPrompt = `You are Blue Pixel AI, a knowledgeable and friendly real estate investment assistant. 
      
Your expertise includes:
- Property investment analysis and recommendations
- Real estate market trends and insights
- Mortgage and loan calculations
- Property valuation and pricing
- Location analysis and neighborhood insights
- Investment ROI calculations
- Home buying and selling guidance

Tool Results Available:
${JSON.stringify(toolResults, null, 2)}

Instructions:
- Provide practical, actionable real estate advice
- Use the tool results to give specific, data-driven responses
- Be conversational but professional
- Include relevant numbers, prices, and calculations when available
- Focus on Indian real estate market context
- Suggest next steps or follow-up questions when appropriate
- Use emojis sparingly but effectively

User Question: ${message}`;

      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Gemini response generated successfully');
      return text;

    } catch (error) {
  console.error('❌ Gemini API error:', error);
  throw error;
}
  }

  formatToolResult(toolName, result) {
    switch (toolName) {
      case 'searchPropertyInfo':
        return `Found ${result.count || 'several'} properties in ${result.location || 'your area'} (${result.priceRange})`;
      case 'calculateMortgage':
        return `Monthly EMI: ₹${result.emi}, Total Interest: ₹${result.totalInterest}`;
      case 'getInterestRates':
        return `Current ${result.bank} home loan rate: ${result.rate} (${result.tenure} tenure)`;
      case 'getPropertyDetails':
        return `Property value: ${result.price} (₹${result.pricePerSqFt}/sq ft) in ${result.location}`;
      default:
        return `${toolName} analysis completed`;
    }
  }

  // MCP Tool implementations (Enhanced for Indian market)
  async searchPropertyInfo(query) {
    const locations = ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi NCR', 'Pune', 'Chennai'];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    return {
      count: Math.floor(Math.random() * 50) + 15,
      location: randomLocation,
      averagePrice: "₹45-85 lakhs",
      propertyTypes: ["2BHK", "3BHK", "4BHK", "Villas", "Plots"],
      priceRange: "₹35L - ₹1.5Cr",
      popularAreas: ["Tech Hub", "Old City", "Suburb Areas"],
      appreciation: "8-12% annually"
    };
  }

  async getPropertyDetails(query) {
    const areas = [
      { name: "Gachibowli, Hyderabad", rate: 4500 },
      { name: "Whitefield, Bangalore", rate: 5200 },
      { name: "Bandra, Mumbai", rate: 15000 },
      { name: "Gurgaon, Delhi NCR", rate: 6800 },
      { name: "Hinjewadi, Pune", rate: 4800 }
    ];
    
    const randomArea = areas[Math.floor(Math.random() * areas.length)];
    const size = Math.floor(Math.random() * 800) + 1200; // 1200-2000 sq ft
    const price = Math.round((randomArea.rate * size) / 100000); // In lakhs
    
    return {
      price: `₹${price} lakhs`,
      pricePerSqFt: `₹${randomArea.rate.toLocaleString()}`,
      area: `${size} sq ft`,
      location: randomArea.name,
      amenities: ["Gym", "Swimming Pool", "Club House", "Parking", "Security", "Garden"],
      possession: "Ready to move / Under construction",
      ageOfProperty: "0-5 years"
    };
  }

  async getInterestRates(query) {
    const banks = [
      { name: "SBI", rate: "8.60%", processing: "0.35%" },
      { name: "HDFC", rate: "8.75%", processing: "0.50%" },
      { name: "ICICI", rate: "8.70%", processing: "0.50%" },
      { name: "Axis Bank", rate: "8.80%", processing: "1.00%" },
      { name: "Kotak", rate: "8.65%", processing: "0.50%" }
    ];
    
    const randomBank = banks[Math.floor(Math.random() * banks.length)];
    
    return {
      bank: randomBank.name,
      rate: randomBank.rate,
      type: "Home Loan",
      tenure: "Up to 30 years",
      processingFee: randomBank.processing,
      maxLoanAmount: "₹10 Crores",
      eligibility: "Based on income and credit score"
    };
  }

  async calculateMortgage(query) {
    // Extract numbers from query or use defaults
    const loanAmount = 5000000; // 50 lakhs default
    const annualRate = 8.75; // 8.75% annual rate
    const tenureYears = 20; // 20 years default
    
    const monthlyRate = annualRate / 100 / 12;
    const tenureMonths = tenureYears * 12;
    
    const emi = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
                          (Math.pow(1 + monthlyRate, tenureMonths) - 1));
    
    const totalAmount = emi * tenureMonths;
    const totalInterest = totalAmount - loanAmount;
    
    return {
      loanAmount: `₹${(loanAmount / 100000).toFixed(1)} lakhs`,
      emi: emi.toLocaleString('en-IN'),
      tenure: `${tenureYears} years`,
      interestRate: `${annualRate}%`,
      totalAmount: `₹${(totalAmount / 100000).toFixed(1)} lakhs`,
      totalInterest: `₹${(totalInterest / 100000).toFixed(1)} lakhs`,
      eligibleIncome: `₹${Math.round(emi * 3 / 1000)}K+ monthly`
    };
  }

  extractPropertyData(toolResults) {
    if (toolResults.searchPropertyInfo || toolResults.getPropertyDetails) {
      return {
        hasPropertyData: true,
        ...toolResults.searchPropertyInfo,
        ...toolResults.getPropertyDetails
      };
    }
    return null;
  }
}
