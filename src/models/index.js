import Joi from 'joi';

// Message Types
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

// Validation Schemas
export const schemas = {
  chatMessage: Joi.object({
    message: Joi.string().required().min(1).max(1000),
    sessionId: Joi.string().uuid().optional(),
    userId: Joi.string().optional()
  }),

  propertySearch: Joi.object({
    query: Joi.string().required().min(1).max(500),
    location: Joi.string().optional().max(100),
    priceRange: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional()
    }).optional(),
    propertyType: Joi.string().optional().max(50)
  }),

  mortgageCalculation: Joi.object({
    propertyPrice: Joi.number().required().min(1),
    downPayment: Joi.number().required().min(0),
    interestRate: Joi.number().optional().min(0).max(100),
    loanTermYears: Joi.number().optional().min(1).max(50).default(30)
  }),

  interestRateRequest: Joi.object({
    location: Joi.string().required().max(100),
    loanType: Joi.string().optional().valid('conventional', 'fha', 'va', 'jumbo').default('conventional')
  }),

  financialCalculator: Joi.object({
    calculationType: Joi.string().required().valid('roi', 'cash_flow', 'cap_rate', 'break_even'),
    initialInvestment: Joi.number().optional().min(0),
    annualReturn: Joi.number().optional(),
    monthlyRent: Joi.number().optional().min(0),
    monthlyExpenses: Joi.number().optional().min(0),
    annualIncome: Joi.number().optional().min(0),
    propertyValue: Joi.number().optional().min(0),
    years: Joi.number().optional().min(1).default(1)
  })
};

// Data Models
export class ChatMessage {
  constructor(data) {
    this.message = data.message;
    this.sessionId = data.sessionId;
    this.userId = data.userId;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.messageType = data.messageType || MessageType.USER;
    this.id = data.id || this.generateId();
  }

  generateId() {
    return `${this.sessionId}-${Date.now()}`;
  }

  toJSON() {
    return {
      id: this.id,
      message: this.message,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: this.timestamp,
      messageType: this.messageType
    };
  }
}

export class ChatResponse {
  constructor(data) {
    this.response = data.response;
    this.sessionId = data.sessionId;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.toolsUsed = data.toolsUsed || [];
    this.propertyData = data.propertyData || null;
    this.executionTime = data.executionTime || 0;
  }

  toJSON() {
    return {
      response: this.response,
      sessionId: this.sessionId,
      timestamp: this.timestamp,
      toolsUsed: this.toolsUsed,
      propertyData: this.propertyData,
      executionTime: this.executionTime
    };
  }
}

export class UserSession {
  constructor(data) {
    this.sessionId = data.sessionId;
    this.userId = data.userId;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastActivity = data.lastActivity || new Date().toISOString();
    this.preferences = data.preferences || {};
  }

  updateActivity() {
    this.lastActivity = new Date().toISOString();
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      preferences: this.preferences
    };
  }
}

export class PropertyDetails {
  constructor(data) {
    this.propertyId = data.propertyId;
    this.address = data.address;
    this.price = data.price;
    this.bedrooms = data.bedrooms;
    this.bathrooms = data.bathrooms;
    this.squareFeet = data.squareFeet;
    this.propertyType = data.propertyType;
    this.description = data.description;
    this.images = data.images || [];
    this.roiEstimate = data.roiEstimate;
    this.marketData = data.marketData || {};
  }

  toJSON() {
    return {
      propertyId: this.propertyId,
      address: this.address,
      price: this.price,
      bedrooms: this.bedrooms,
      bathrooms: this.bathrooms,
      squareFeet: this.squareFeet,
      propertyType: this.propertyType,
      description: this.description,
      images: this.images,
      roiEstimate: this.roiEstimate,
      marketData: this.marketData
    };
  }
}

export class MortgageCalculation {
  constructor(data) {
    this.propertyPrice = data.propertyPrice;
    this.downPayment = data.downPayment;
    this.loanAmount = data.propertyPrice - data.downPayment;
    this.interestRate = data.interestRate;
    this.loanTermYears = data.loanTermYears || 30;
    this.monthlyPayment = 0;
    this.totalInterest = 0;
    this.totalCost = 0;
    this.paymentBreakdown = {};
    
    this.calculate();
  }

  calculate() {
    const monthlyRate = this.interestRate / 100 / 12;
    const numPayments = this.loanTermYears * 12;

    if (monthlyRate > 0) {
      this.monthlyPayment = this.loanAmount * (
        monthlyRate * Math.pow(1 + monthlyRate, numPayments)
      ) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else {
      this.monthlyPayment = this.loanAmount / numPayments;
    }

    this.totalCost = this.monthlyPayment * numPayments;
    this.totalInterest = this.totalCost - this.loanAmount;

    this.paymentBreakdown = {
      principalAndInterest: Math.round(this.monthlyPayment * 100) / 100,
      estimatedTaxes: Math.round((this.propertyPrice * 0.012 / 12) * 100) / 100,
      estimatedInsurance: Math.round((this.propertyPrice * 0.004 / 12) * 100) / 100
    };

    // Round values
    this.monthlyPayment = Math.round(this.monthlyPayment * 100) / 100;
    this.totalInterest = Math.round(this.totalInterest * 100) / 100;
    this.totalCost = Math.round(this.totalCost * 100) / 100;
  }

  toJSON() {
    return {
      propertyPrice: this.propertyPrice,
      downPayment: this.downPayment,
      loanAmount: this.loanAmount,
      interestRate: this.interestRate,
      loanTermYears: this.loanTermYears,
      monthlyPayment: this.monthlyPayment,
      totalInterest: this.totalInterest,
      totalCost: this.totalCost,
      paymentBreakdown: this.paymentBreakdown
    };
  }
}

export class MCPToolResponse {
  constructor(toolName, result, executionTime = 0) {
    this.toolName = toolName;
    this.result = result;
    this.executionTime = executionTime;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      toolName: this.toolName,
      result: this.result,
      executionTime: this.executionTime,
      timestamp: this.timestamp
    };
  }
}

// Validation helper
export const validateSchema = (schema, data) => {
  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};