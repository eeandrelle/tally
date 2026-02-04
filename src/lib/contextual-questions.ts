/**
 * Contextual Question System (TAL-150)
 * 
 * Smart prompts based on document uploads:
 * - "Are you working from home?" on office purchase
 * - "Is this work-related?" on vehicle expense
 * - Context-aware follow-up questions
 * 
 * Features:
 * - Question templates for different scenarios
 * - Response tracking and state management
 * - Follow-up question chains
 * - Tax impact calculations based on responses
 */

import { Receipt } from "../components/ReceiptListView";

export type QuestionType = 
  | "wfh"
  | "work_related"
  | "vehicle_use"
  | "business_percentage"
  | "uniform_required"
  | "self_education_work"
  | "investment_loan"
  | "depreciation_eligible"
  | "charitable_deductible"
  | "medical_exceeds_threshold"
  | "custom";

export type ResponseType = "yes" | "no" | "maybe" | "not_sure" | "partial";

export interface ContextualQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  icon: string;
  category: string;
  priority: "high" | "medium" | "low";
  followUpQuestions?: string[];
  taxImpact?: {
    type: "increase_deduction" | "decrease_deduction" | "new_category";
    estimatedValue: number;
    description: string;
  };
  validFor: {
    keywords: string[];
    categories?: string[];
    amountRange?: { min?: number; max?: number };
    vendorPatterns?: string[];
  };
}

export interface QuestionResponse {
  questionId: string;
  response: ResponseType;
  details?: string;
  timestamp: Date;
  documentId?: number;
  followUpResponses?: Record<string, string>;
}

export interface QuestionContext {
  receipt: Receipt;
  documentType?: string;
  extractedText?: string;
  userProfile?: UserProfile;
  previousResponses?: QuestionResponse[];
}

export interface UserProfile {
  occupation?: string;
  industry?: string;
  workArrangement?: "office" | "hybrid" | "remote" | "self_employed";
  vehicleUsedForWork?: boolean;
  hasInvestmentProperty?: boolean;
  previousClaims?: string[];
}

// Question templates database
export const QUESTION_TEMPLATES: ContextualQuestion[] = [
  {
    id: "wfh-office-equipment",
    type: "wfh",
    question: "Are you working from home?",
    description: "This office equipment purchase may qualify for WFH deductions",
    icon: "Home",
    category: "Work From Home",
    priority: "high",
    followUpQuestions: [
      "How many days per week do you work from home?",
      "Is this equipment used exclusively for work?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 300,
      description: "May qualify for home office equipment deduction"
    },
    validFor: {
      keywords: ["desk", "chair", "monitor", "keyboard", "mouse", "laptop", "computer", "office", "ergonomic", "webcam", "headset", "printer"],
      categories: ["D5 Other Work-Related"],
      amountRange: { min: 50 }
    }
  },
  {
    id: "wfh-internet",
    type: "wfh",
    question: "Do you use internet for work purposes?",
    description: "You may be able to claim a portion of your internet expenses",
    icon: "Wifi",
    category: "Work From Home",
    priority: "high",
    followUpQuestions: [
      "What percentage of your internet use is for work?",
      "Do you have a separate work internet connection?"
    ],
    taxImpact: {
      type: "increase_deduction",
      estimatedValue: 200,
      description: "Work-related internet expenses"
    },
    validFor: {
      keywords: ["internet", "broadband", "wifi", "telstra", "optus", "tpg", "iiNet", "vodafone"],
      vendorPatterns: ["telstra", "optus", "tpg", "iinet", "vodafone", "aussie broadband"]
    }
  },
  {
    id: "vehicle-work",
    type: "vehicle_use",
    question: "Is this vehicle expense work-related?",
    description: "Vehicle expenses can be claimed using logbook or cents-per-km method",
    icon: "Car",
    category: "Vehicle Expenses",
    priority: "high",
    followUpQuestions: [
      "Do you keep a logbook for work trips?",
      "What percentage of vehicle use is for work?",
      "Is this for client visits or commuting?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 1500,
      description: "Vehicle expenses may be deductible"
    },
    validFor: {
      keywords: ["fuel", "petrol", "diesel", "service", "repair", "tyre", "registration", "rego", "insurance", "mechanic"],
      vendorPatterns: ["bp", "shell", "caltex", "united", "7-eleven", "ultra tune", "kmart tyre"],
      categories: ["D1 Car Expenses"]
    }
  },
  {
    id: "uniform-required",
    type: "uniform_required",
    question: "Is this a required uniform or protective clothing?",
    description: "Compulsory work uniforms and protective clothing are deductible",
    icon: "Shirt",
    category: "Clothing",
    priority: "medium",
    followUpQuestions: [
      "Does your employer require this specific uniform?",
      "Does it have a company logo?",
      "Is this for safety/protection?"
    ],
    taxImpact: {
      type: "increase_deduction",
      estimatedValue: 150,
      description: "Uniform and laundry expenses"
    },
    validFor: {
      keywords: ["uniform", "scrubs", "hi-vis", "boots", "safety", "helmet", "gloves", "apron", "name badge"],
      categories: ["D3 Clothing"]
    }
  },
  {
    id: "self-education-work",
    type: "self_education_work",
    question: "Is this course related to your current work?",
    description: "Self-education expenses are deductible if they improve current job skills",
    icon: "GraduationCap",
    category: "Self Education",
    priority: "high",
    followUpQuestions: [
      "Does this course lead to a new qualification?",
      "Is this required by your employer?",
      "Will this increase your income in your current role?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 1000,
      description: "Self-education expenses may be deductible"
    },
    validFor: {
      keywords: ["course", "training", "certification", "diploma", "degree", "university", "tafe", "workshop", "conference", "seminar", "textbook"],
      categories: ["D4 Self-Education"]
    }
  },
  {
    id: "work-related-general",
    type: "work_related",
    question: "Is this expense work-related?",
    description: "Only work-related expenses can be claimed as deductions",
    icon: "Briefcase",
    category: "Work Related",
    priority: "high",
    followUpQuestions: [
      "Was this required for your job?",
      "Did you pay for this yourself?",
      "Do you have a receipt?"
    ],
    taxImpact: {
      type: "increase_deduction",
      estimatedValue: 0,
      description: "Confirming work-related status"
    },
    validFor: {
      keywords: ["tool", "equipment", "software", "license", "subscription", "membership", "union", "professional"],
      categories: ["D5 Other Work-Related"],
      amountRange: { min: 20 }
    }
  },
  {
    id: "depreciation-eligible",
    type: "depreciation_eligible",
    question: "Is this item over $300 and used for work?",
    description: "Items over $300 must be depreciated over their effective life",
    icon: "Calculator",
    category: "Depreciation",
    priority: "medium",
    followUpQuestions: [
      "What is the expected useful life of this item?",
      "Is this used 100% for work?",
      "When did you purchase this?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 200,
      description: "May qualify for D6 Low Value Pool or depreciation"
    },
    validFor: {
      keywords: ["laptop", "computer", "phone", "tablet", "camera", "printer", "furniture", "equipment"],
      amountRange: { min: 300 }
    }
  },
  {
    id: "charitable-deductible",
    type: "charitable_deductible",
    question: "Is this a deductible gift recipient (DGR)?",
    description: "Only donations to registered DGRs are tax deductible",
    icon: "Heart",
    category: "Donations",
    priority: "medium",
    followUpQuestions: [
      "Did you receive anything in return for this donation?",
      "Is this a registered charity?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 0,
      description: "Charitable donations are deductible"
    },
    validFor: {
      keywords: ["donation", "charity", "give", "fundraising", "appeal", "world vision", "red cross", "salvation army"],
      categories: ["D8 Gifts and Donations"]
    }
  },
  {
    id: "investment-loan",
    type: "investment_loan",
    question: "Is this loan for investment purposes?",
    description: "Investment loan interest may be deductible",
    icon: "TrendingUp",
    category: "Investments",
    priority: "high",
    followUpQuestions: [
      "What type of investment is this for?",
      "Is this a rental property?",
      "Do you have documentation of the loan purpose?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 2000,
      description: "Investment expenses may be deductible"
    },
    validFor: {
      keywords: ["interest", "loan", "mortgage", "investment", "property", "shares", "dividend"],
      categories: ["D7 Interest and Dividends"]
    }
  },
  {
    id: "phone-work",
    type: "work_related",
    question: "Do you use your phone for work?",
    description: "You can claim work-related phone expenses",
    icon: "Phone",
    category: "Work Related",
    priority: "medium",
    followUpQuestions: [
      "What percentage of calls are work-related?",
      "Do you have itemized bills?",
      "Is this a separate work phone?"
    ],
    taxImpact: {
      type: "increase_deduction",
      estimatedValue: 300,
      description: "Work-related phone expenses"
    },
    validFor: {
      keywords: ["mobile", "phone", "telstra", "optus", "vodafone"],
      vendorPatterns: ["telstra", "optus", "vodafone", "amaysim", "boost"]
    }
  },
  {
    id: "travel-work",
    type: "work_related",
    question: "Was this travel for work purposes?",
    description: "Work-related travel including accommodation and meals may be deductible",
    icon: "Plane",
    category: "Travel",
    priority: "high",
    followUpQuestions: [
      "Were you away from home overnight?",
      "Was this for a conference or client meeting?",
      "Did your employer reimburse any costs?"
    ],
    taxImpact: {
      type: "new_category",
      estimatedValue: 800,
      description: "Work-related travel expenses"
    },
    validFor: {
      keywords: ["flight", "hotel", "accommodation", "taxi", "uber", "travel", "booking.com", "expedia"],
      categories: ["D2 Travel Expenses"]
    }
  },
  {
    id: "tools-trade",
    type: "work_related",
    question: "Are these tools used for your trade or profession?",
    description: "Tools and equipment specific to your occupation are deductible",
    icon: "Wrench",
    category: "Tools & Equipment",
    priority: "high",
    followUpQuestions: [
      "Are these required for your job?",
      "Do you use these outside of work?",
      "What is your occupation?"
    ],
    taxImpact: {
      type: "increase_deduction",
      estimatedValue: 400,
      description: "Trade tools and equipment"
    },
    validFor: {
      keywords: ["tool", "bunnings", "hardware", "safety", "protective", "trade"],
      vendorPatterns: ["bunnings", "mitre 10", "total tools", "sydney tools"]
    }
  }
];

/**
 * Find relevant questions for a given receipt
 */
export function findRelevantQuestions(
  receipt: Receipt,
  userProfile?: UserProfile,
  previousResponses?: QuestionResponse[]
): ContextualQuestion[] {
  const relevant: ContextualQuestion[] = [];
  const receiptText = `${receipt.vendor} ${receipt.description || ""} ${receipt.category}`.toLowerCase();
  
  for (const question of QUESTION_TEMPLATES) {
    // Check if already answered
    if (previousResponses?.some(r => r.questionId === question.id)) {
      continue;
    }
    
    // Check keyword matches
    const keywordMatch = question.validFor.keywords.some(
      keyword => receiptText.includes(keyword.toLowerCase())
    );
    
    // Check vendor pattern matches
    const vendorMatch = question.validFor.vendorPatterns?.some(
      pattern => receipt.vendor.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Check category match
    const categoryMatch = question.validFor.categories?.includes(receipt.category);
    
    // Check amount range
    const amountMatch = 
      (!question.validFor.amountRange?.min || receipt.amount >= question.validFor.amountRange.min) &&
      (!question.validFor.amountRange?.max || receipt.amount <= question.validFor.amountRange.max);
    
    // Check user profile context
    let profileMatch = true;
    if (userProfile) {
      if (question.type === "wfh" && userProfile.workArrangement === "office") {
        profileMatch = false;
      }
      if (question.type === "vehicle_use" && !userProfile.vehicleUsedForWork) {
        profileMatch = false;
      }
    }
    
    if ((keywordMatch || vendorMatch || categoryMatch) && amountMatch && profileMatch) {
      relevant.push(question);
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return relevant.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Get questions by category
 */
export function getQuestionsByCategory(category: string): ContextualQuestion[] {
  return QUESTION_TEMPLATES.filter(q => q.category === category);
}

/**
 * Get question by ID
 */
export function getQuestionById(id: string): ContextualQuestion | undefined {
  return QUESTION_TEMPLATES.find(q => q.id === id);
}

/**
 * Create a custom question
 */
export function createCustomQuestion(
  question: string,
  category: string,
  context: Partial<ContextualQuestion>
): ContextualQuestion {
  return {
    id: `custom-${Date.now()}`,
    type: "custom",
    question,
    category,
    icon: "HelpCircle",
    priority: "medium",
    validFor: {
      keywords: []
    },
    ...context
  };
}

/**
 * Calculate potential tax savings from responses
 */
export function calculateTaxImpact(
  responses: QuestionResponse[],
  questions: ContextualQuestion[]
): {
  totalEstimatedSavings: number;
  confirmedSavings: number;
  potentialSavings: number;
  byCategory: Record<string, number>;
} {
  let confirmedSavings = 0;
  let potentialSavings = 0;
  const byCategory: Record<string, number> = {};
  
  for (const response of responses) {
    const question = questions.find(q => q.id === response.questionId);
    if (!question?.taxImpact) continue;
    
    const category = question.category;
    if (!byCategory[category]) {
      byCategory[category] = 0;
    }
    
    if (response.response === "yes") {
      confirmedSavings += question.taxImpact.estimatedValue;
      byCategory[category] += question.taxImpact.estimatedValue;
    } else if (response.response === "maybe" || response.response === "partial") {
      potentialSavings += question.taxImpact.estimatedValue * 0.5;
      byCategory[category] += question.taxImpact.estimatedValue * 0.5;
    }
  }
  
  return {
    totalEstimatedSavings: confirmedSavings + potentialSavings,
    confirmedSavings,
    potentialSavings,
    byCategory
  };
}

/**
 * Get next follow-up question based on response
 */
export function getNextFollowUpQuestion(
  question: ContextualQuestion,
  response: ResponseType,
  index: number
): string | null {
  if (!question.followUpQuestions || index >= question.followUpQuestions.length) {
    return null;
  }
  
  // Only show follow-ups for positive or uncertain responses
  if (response === "no") {
    return null;
  }
  
  return question.followUpQuestions[index];
}

/**
 * Generate summary of responses for export
 */
export function generateResponseSummary(
  responses: QuestionResponse[],
  receipts: Receipt[]
): string {
  const sections: string[] = ["# Contextual Question Responses\n"];
  
  // Group by category
  const byCategory: Record<string, QuestionResponse[]> = {};
  for (const response of responses) {
    const question = getQuestionById(response.questionId);
    if (!question) continue;
    
    if (!byCategory[question.category]) {
      byCategory[question.category] = [];
    }
    byCategory[question.category].push(response);
  }
  
  for (const [category, categoryResponses] of Object.entries(byCategory)) {
    sections.push(`\n## ${category}\n`);
    
    for (const response of categoryResponses) {
      const question = getQuestionById(response.questionId);
      if (!question) continue;
      
      const receipt = receipts.find(r => r.id === response.documentId);
      
      sections.push(`**${question.question}**`);
      sections.push(`- Response: ${response.response}`);
      if (response.details) {
        sections.push(`- Details: ${response.details}`);
      }
      if (receipt) {
        sections.push(`- Related receipt: ${receipt.vendor} - $${receipt.amount.toFixed(2)}`);
      }
      sections.push("");
    }
  }
  
  // Add tax impact summary
  const taxImpact = calculateTaxImpact(responses, QUESTION_TEMPLATES);
  sections.push("\n## Tax Impact Summary\n");
  sections.push(`- Confirmed additional deductions: $${taxImpact.confirmedSavings.toFixed(2)}`);
  sections.push(`- Potential additional deductions: $${taxImpact.potentialSavings.toFixed(2)}`);
  sections.push(`- Total estimated value: $${taxImpact.totalEstimatedSavings.toFixed(2)}`);
  
  return sections.join("\n");
}

/**
 * Export responses to JSON for storage
 */
export function exportResponses(responses: QuestionResponse[]): string {
  return JSON.stringify(
    responses.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString()
    })),
    null,
    2
  );
}

/**
 * Import responses from JSON
 */
export function importResponses(json: string): QuestionResponse[] {
  const parsed = JSON.parse(json);
  return parsed.map((r: any) => ({
    ...r,
    timestamp: new Date(r.timestamp)
  }));
}
