import axios from 'axios';
import config from '../config/config.js';
import dbManager from '../database/dynamodb.js';
import { MCPToolResponse, PropertyDetails, MortgageCalculation } from '../models/index.js';
import logger from '../utils/logger.js';

class MCPToolManager {
  constructor() {
    this.tools = {
      validatePromptRelevance: this.validatePromptRelevance.bind(this),
      searchPropertyInfo: this.searchPropertyInfo.bind(this),
      getUserChatHistory: this.getUserChatHistory.bind(this),
      getPropertyDetails: this.getPropertyDetails.bind(this),
      getInterestRates: this.getInterestRates.bind(this),
      calculateMortgage: this.calculateMortgage.bind(this),
      getUserSavedProperties: this.getUserSavedProperties.bind(this),
      getServicedProperties: this.getServicedProperties.bind(this),
      calculateMortgageAdvanced: this.calculateMortgageAdvanced.bind(this),
      getFinancialCalculator: this.getFinancialCalculator.bind(this)
    };
  }

  async executeTool(toolName, params = {}) {
    const startTime = Date.now();
    
    if (!this.tools[toolName]) {
      const result = { error: `Tool '${toolName}' not found` };
      return new MCPToolResponse(toolName, result, Date.now() - startTime);
    }

    try {
      const result = await this.tools[toolName](params);
      const executionTime = Date.now() - startTime;
      
      logger.logMCPTool(toolName, executionTime, result, params.userId);
      
      return new MCPToolResponse(toolName, result, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result = { error: error.message };
      
      logger.logError(error, { toolName, params });
      
      return new MCPToolResponse(toolName, result, executionTime);
    }
  }

  async validatePromptRelevance({ prompt }) {
    // Keywords that indicate property/real estate relevance
    const propertyKeywords = [
      'property', 'house', 'home', 'apartment', 'condo', 'real estate',
      'buy', 'sell', 'rent', 'mortgage', 'loan', 'investment', 'roi',
      'bedroom', 'bathroom', 'square feet', 'price', 'location',
      'neighborhood', 'market', 'listing', 'agent', 'broker'
    ];

    // Non-property topics to redirect
    const nonPropertyTopics = [
      'weather', 'sports', 'politics', 'entertainment', 'cooking',
      'travel', 'health', 'technology', 'science', 'history'
    ];

    const promptLower = prompt.toLowerCase();

    // Check for property relevance
    const propertyScore = propertyKeywords.filter(keyword => 
      promptLower.includes(keyword)
    ).length;
    
    const nonPropertyScore = nonPropertyTopics.filter(keyword => 
      promptLower.includes(keyword)
    ).length;

    // Calculate relevance score
    const totalWords = prompt.split(' ').length;
    const relevanceScore = Math.min(1.0, propertyScore / Math.max(totalWords * 0.1, 1));

    const isValid = propertyScore > 0 && relevanceScore > 0.2;

    let filteredContent = null;
    let reason = "Query is property-related and valid";

    if (!isValid) {
      filteredContent = "I'm here to help with property investment and real estate questions. How can I assist you with property details, market analysis, or investment calculations?";
      reason = "Query not related to real estate or property investment";
    }

    return {
      isValid,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      filteredContent,
      reason
    };
  }

  async searchPropertyInfo({ query, location = null, searchType = "web" }) {
    try {
      // Construct search query
      let searchQuery = `${query} real estate property`;
      if (location) {
        searchQuery += ` ${location}`;
      }

      // Use Google Custom Search API if configured
      if (config.externalApis.googleSearch.apiKey && config.externalApis.googleSearch.engineId) {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
          params: {
            key: config.externalApis.googleSearch.apiKey,
            cx: config.externalApis.googleSearch.engineId,
            q: searchQuery,
            num: 10
          }
        });

        if (response.data && response.data.items) {
          const results = response.data.items.map(item => ({
            title: item.title || '',
            snippet: item.snippet || '',
            link: item.link || '',
            source: 'Google Search'
          }));

          return {
            results,
            query: searchQuery,
            totalResults: results.length
          };
        }
      }

      // Fallback to mock data for demonstration
      return {
        results: [
          {
            title: "Sample Property Listing",
            snippet: "3BR/2BA house in downtown area, $450,000",
            link: "https://example.com/property/123",
            source: "Mock Data"
          },
          {
            title: "Investment Property Analysis",
            snippet: "High-yield rental property with 8.5% ROI potential",
            link: "https://example.com/property/124",
            source: "Mock Data"
          }
        ],
        query: searchQuery,
        totalResults: 2
      };
    } catch (error) {
      logger.logError(error, { query, location });
      return { error: `Search failed: ${error.message}` };
    }
  }

  async getUserChatHistory({ userId, sessionId, limit = 20 }) {
    try {
      const messages = await dbManager.getChatHistory(sessionId, limit);
      
      const history = messages.map(msg => ({
        message: msg.message,
        type: msg.messageType,
        timestamp: msg.timestamp
      }));

      return {
        history,
        sessionId,
        messageCount: history.length
      };
    } catch (error) {
      logger.logError(error, { userId, sessionId });
      return { error: `Failed to get chat history: ${error.message}` };
    }
  }

  async getPropertyDetails({ propertyId }) {
    try {
      // Try to get from database first
      let propertyData = await dbManager.getPropertyDetails(propertyId);

      if (propertyData) {
        return propertyData;
      }

      // Mock property data for demonstration
      const mockProperty = {
        propertyId,
        address: "123 Main St, Downtown",
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1800,
        propertyType: "Single Family Home",
        description: "Beautiful home in prime location",
        images: ["https://example.com/image1.jpg"],
        roiEstimate: 8.5,
        marketData: {
          pricePerSqft: 250,
          neighborhoodAvg: 425000,
          appreciationRate: 3.2,
          walkScore: 85,
          schoolRating: 8
        }
      };

      // Store in database for future use
      await dbManager.storePropertyDetails(mockProperty);

      return mockProperty;
    } catch (error) {
      logger.logError(error, { propertyId });
      return { error: `Failed to get property details: ${error.message}` };
    }
  }

  async getInterestRates({ location, loanType = "conventional" }) {
    try {
      // In a real implementation, this would call a financial API
      // For now, return mock data based on current market conditions

      const baseRate = 7.2; // Current approximate rate
      let locationAdjustment = 0.0;

      // Simple location-based adjustments
      const locationLower = location.toLowerCase();
      if (locationLower.includes('california') || locationLower.includes('ca')) {
        locationAdjustment = 0.1;
      } else if (locationLower.includes('texas') || locationLower.includes('tx')) {
        locationAdjustment = -0.1;
      } else if (locationLower.includes('florida') || locationLower.includes('fl')) {
        locationAdjustment = 0.05;
      }

      // Loan type adjustments
      const loanTypeAdjustments = {
        conventional: 0,
        fha: -0.25,
        va: -0.15,
        jumbo: 0.3
      };

      const loanAdjustment = loanTypeAdjustments[loanType] || 0;
      const currentRate = baseRate + locationAdjustment + loanAdjustment;

      return {
        location,
        loanType,
        currentRate: Math.round(currentRate * 100) / 100,
        rateTrend: "stable",
        lastUpdated: new Date().toISOString(),
        rateHistory: [
          { date: "2024-01-01", rate: 6.8 },
          { date: "2024-02-01", rate: 7.0 },
          { date: "2024-03-01", rate: 7.2 }
        ],
        factors: {
          locationAdjustment,
          loanTypeAdjustment: loanAdjustment,
          baseRate
        }
      };
    } catch (error) {
      logger.logError(error, { location, loanType });
      return { error: `Failed to get interest rates: ${error.message}` };
    }
  }

  async calculateMortgage({ propertyPrice, downPayment, interestRate, loanTermYears = 30 }) {
    try {
      const calculation = new MortgageCalculation({
        propertyPrice,
        downPayment,
        interestRate,
        loanTermYears
      });

      return calculation.toJSON();
    } catch (error) {
      logger.logError(error, { propertyPrice, downPayment, interestRate, loanTermYears });
      return { error: `Failed to calculate mortgage: ${error.message}` };
    }
  }

  async getUserSavedProperties({ userId }) {
    try {
      const savedProperties = await dbManager.getSavedProperties(userId);
      
      const propertiesData = [];
      for (const savedProp of savedProperties) {
        const propertyDetails = await dbManager.getPropertyDetails(savedProp.propertyId);
        if (propertyDetails) {
          propertiesData.push({
            propertyId: savedProp.propertyId,
            savedAt: savedProp.savedAt,
            notes: savedProp.notes,
            details: propertyDetails
          });
        }
      }

      return {
        userId,
        savedProperties: propertiesData,
        totalCount: propertiesData.length
      };
    } catch (error) {
      logger.logError(error, { userId });
      return { error: `Failed to get saved properties: ${error.message}` };
    }
  }

  async getServicedProperties({ location = null, propertyType = null }) {
    try {
      // Mock data for demonstration
      let properties = [
        {
          propertyId: "prop_001",
          address: "123 Oak Street, Downtown",
          price: 450000,
          bedrooms: 3,
          bathrooms: 2,
          propertyType: "Single Family Home",
          roiEstimate: 8.5
        },
        {
          propertyId: "prop_002",
          address: "456 Pine Avenue, Midtown",
          price: 320000,
          bedrooms: 2,
          bathrooms: 1,
          propertyType: "Condo",
          roiEstimate: 7.2
        },
        {
          propertyId: "prop_003",
          address: "789 Elm Street, Suburbs",
          price: 380000,
          bedrooms: 4,
          bathrooms: 2.5,
          propertyType: "Single Family Home",
          roiEstimate: 9.1
        }
      ];

      // Filter by location if specified
      if (location) {
        const locationLower = location.toLowerCase();
        properties = properties.filter(p => 
          p.address.toLowerCase().includes(locationLower)
        );
      }

      // Filter by property type if specified
      if (propertyType) {
        const typeLower = propertyType.toLowerCase();
        properties = properties.filter(p => 
          p.propertyType.toLowerCase().includes(typeLower)
        );
      }

      return {
        properties,
        totalCount: properties.length,
        filters: {
          location,
          propertyType
        }
      };
    } catch (error) {
      logger.logError(error, { location, propertyType });
      return { error: `Failed to get serviced properties: ${error.message}` };
    }
  }

  async calculateMortgageAdvanced({ 
    propertyPrice, 
    downPayment, 
    interestRate, 
    loanTermYears = 30,
    pmiRate = 0.5,
    propertyTaxRate = 1.2,
    insuranceRate = 0.4 
  }) {
    try {
      // Basic mortgage calculation
      const basicCalc = await this.calculateMortgage({
        propertyPrice,
        downPayment,
        interestRate,
        loanTermYears
      });

      if (basicCalc.error) {
        return basicCalc;
      }

      // Additional calculations
      const loanAmount = propertyPrice - downPayment;
      const downPaymentPercent = (downPayment / propertyPrice) * 100;

      // PMI calculation (if down payment < 20%)
      let monthlyPmi = 0;
      if (downPaymentPercent < 20) {
        monthlyPmi = (loanAmount * pmiRate / 100) / 12;
      }

      // Property tax and insurance
      const monthlyPropertyTax = (propertyPrice * propertyTaxRate / 100) / 12;
      const monthlyInsurance = (propertyPrice * insuranceRate / 100) / 12;

      // Total monthly payment
      const totalMonthlyPayment = basicCalc.monthlyPayment + 
                                 monthlyPmi + 
                                 monthlyPropertyTax + 
                                 monthlyInsurance;

      return {
        ...basicCalc,
        advancedDetails: {
          downPaymentPercent: Math.round(downPaymentPercent * 100) / 100,
          monthlyPmi: Math.round(monthlyPmi * 100) / 100,
          monthlyPropertyTax: Math.round(monthlyPropertyTax * 100) / 100,
          monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
          totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
          pmiRequired: downPaymentPercent < 20
        }
      };
    } catch (error) {
      logger.logError(error, { propertyPrice, downPayment, interestRate, loanTermYears });
      return { error: `Failed to calculate advanced mortgage: ${error.message}` };
    }
  }

  async getFinancialCalculator({ calculationType, ...params }) {
    try {
      switch (calculationType) {
        case 'roi':
          return await this.calculateROI(params);
        case 'cash_flow':
          return await this.calculateCashFlow(params);
        case 'cap_rate':
          return await this.calculateCapRate(params);
        case 'break_even':
          return await this.calculateBreakEven(params);
        default:
          return { error: `Unknown calculation type: ${calculationType}` };
      }
    } catch (error) {
      logger.logError(error, { calculationType, params });
      return { error: `Financial calculation failed: ${error.message}` };
    }
  }

  async calculateROI({ initialInvestment, annualReturn, years = 1 }) {
    const roiPercentage = (annualReturn / initialInvestment) * 100;
    const totalReturn = annualReturn * years;

    return {
      calculationType: 'roi',
      initialInvestment,
      annualReturn,
      years,
      roiPercentage: Math.round(roiPercentage * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100
    };
  }

  async calculateCashFlow({ monthlyRent, monthlyExpenses }) {
    const monthlyCashFlow = monthlyRent - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    return {
      calculationType: 'cash_flow',
      monthlyRent,
      monthlyExpenses,
      monthlyCashFlow: Math.round(monthlyCashFlow * 100) / 100,
      annualCashFlow: Math.round(annualCashFlow * 100) / 100
    };
  }

  async calculateCapRate({ annualIncome, propertyValue }) {
    const capRate = (annualIncome / propertyValue) * 100;

    return {
      calculationType: 'cap_rate',
      annualIncome,
      propertyValue,
      capRatePercentage: Math.round(capRate * 100) / 100
    };
  }

  async calculateBreakEven({ fixedCosts, variableCostPerUnit, pricePerUnit }) {
    if (pricePerUnit <= variableCostPerUnit) {
      return { error: "Price per unit must be greater than variable cost per unit" };
    }

    const breakEvenUnits = fixedCosts / (pricePerUnit - variableCostPerUnit);

    return {
      calculationType: 'break_even',
      fixedCosts,
      variableCostPerUnit,
      pricePerUnit,
      breakEvenUnits: Math.round(breakEvenUnits * 100) / 100
    };
  }

  // Get list of available tools
  getAvailableTools() {
    return Object.keys(this.tools);
  }

  // Get tool descriptions
  getToolDescriptions() {
    return {
      validatePromptRelevance: "Validates property-related topics and redirects off-topic questions",
      searchPropertyInfo: "Web search integration for property information",
      getUserChatHistory: "Session-based conversation history",
      getPropertyDetails: "Existing property controller integration",
      getInterestRates: "API integration for location-based rates",
      calculateMortgage: "Enhanced financial calculations",
      getUserSavedProperties: "User's saved and viewed properties",
      getServicedProperties: "Properties serviced by the platform",
      calculateMortgageAdvanced: "Advanced mortgage calculations with PMI, taxes, insurance",
      getFinancialCalculator: "Financial calculator context integration"
    };
  }
}

// Export singleton instance
const mcpManager = new MCPToolManager();
export default mcpManager;