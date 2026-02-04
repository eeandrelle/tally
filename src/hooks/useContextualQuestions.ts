import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ContextualQuestion,
  QuestionResponse,
  UserProfile,
  findRelevantQuestions,
  calculateTaxImpact,
  QUESTION_TEMPLATES,
  exportResponses,
  importResponses,
} from "../lib/contextual-questions";
import { Receipt } from "../components/ReceiptListView";

interface UseContextualQuestionsOptions {
  receipts: Receipt[];
  userProfile?: UserProfile;
  storageKey?: string;
}

interface UseContextualQuestionsReturn {
  questions: ContextualQuestion[];
  responses: QuestionResponse[];
  taxImpact: {
    totalEstimatedSavings: number;
    confirmedSavings: number;
    potentialSavings: number;
    byCategory: Record<string, number>;
  };
  addResponse: (response: QuestionResponse) => void;
  updateResponse: (questionId: string, updates: Partial<QuestionResponse>) => void;
  deleteResponse: (questionId: string) => void;
  getResponseForQuestion: (questionId: string) => QuestionResponse | undefined;
  hasAnswered: (questionId: string) => boolean;
  exportToJson: () => string;
  importFromJson: (json: string) => void;
  resetResponses: () => void;
  refreshQuestions: () => void;
}

/**
 * Hook for managing contextual questions and responses
 */
export function useContextualQuestions({
  receipts,
  userProfile,
  storageKey = "tally-contextual-responses",
}: UseContextualQuestionsOptions): UseContextualQuestionsReturn {
  // Load responses from localStorage on mount
  const [responses, setResponses] = useState<QuestionResponse[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return importResponses(saved);
      }
    } catch (error) {
      console.error("Failed to load contextual responses:", error);
    }
    return [];
  });

  // Find relevant questions based on receipts and profile
  const [questions, setQuestions] = useState<ContextualQuestion[]>(() => {
    const allQuestions: ContextualQuestion[] = [];
    for (const receipt of receipts) {
      const relevant = findRelevantQuestions(receipt, userProfile, []);
      // Add only unique questions
      for (const q of relevant) {
        if (!allQuestions.find((existing) => existing.id === q.id)) {
          allQuestions.push(q);
        }
      }
    }
    return allQuestions;
  });

  // Save responses to localStorage when they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, exportResponses(responses));
    } catch (error) {
      console.error("Failed to save contextual responses:", error);
    }
  }, [responses, storageKey]);

  // Refresh questions when receipts or profile change
  const refreshQuestions = useCallback(() => {
    const allQuestions: ContextualQuestion[] = [];
    for (const receipt of receipts) {
      const relevant = findRelevantQuestions(receipt, userProfile, responses);
      for (const q of relevant) {
        if (!allQuestions.find((existing) => existing.id === q.id)) {
          allQuestions.push(q);
        }
      }
    }
    setQuestions(allQuestions);
  }, [receipts, userProfile, responses]);

  // Add a new response
  const addResponse = useCallback((response: QuestionResponse) => {
    setResponses((prev) => {
      // Replace if exists, otherwise add
      const filtered = prev.filter((r) => r.questionId !== response.questionId);
      return [...filtered, response];
    });
  }, []);

  // Update an existing response
  const updateResponse = useCallback(
    (questionId: string, updates: Partial<QuestionResponse>) => {
      setResponses((prev) =>
        prev.map((r) =>
          r.questionId === questionId ? { ...r, ...updates } : r
        )
      );
    },
    []
  );

  // Delete a response
  const deleteResponse = useCallback((questionId: string) => {
    setResponses((prev) => prev.filter((r) => r.questionId !== questionId));
  }, []);

  // Get response for a specific question
  const getResponseForQuestion = useCallback(
    (questionId: string) => {
      return responses.find((r) => r.questionId === questionId);
    },
    [responses]
  );

  // Check if a question has been answered
  const hasAnswered = useCallback(
    (questionId: string) => {
      return responses.some((r) => r.questionId === questionId);
    },
    [responses]
  );

  // Calculate tax impact
  const taxImpact = useMemo(() => {
    return calculateTaxImpact(responses, QUESTION_TEMPLATES);
  }, [responses]);

  // Export responses to JSON
  const exportToJson = useCallback(() => {
    return exportResponses(responses);
  }, [responses]);

  // Import responses from JSON
  const importFromJson = useCallback(
    (json: string) => {
      try {
        const imported = importResponses(json);
        setResponses(imported);
      } catch (error) {
        console.error("Failed to import responses:", error);
      }
    },
    []
  );

  // Reset all responses
  const resetResponses = useCallback(() => {
    setResponses([]);
  }, []);

  return {
    questions,
    responses,
    taxImpact,
    addResponse,
    updateResponse,
    deleteResponse,
    getResponseForQuestion,
    hasAnswered,
    exportToJson,
    importFromJson,
    resetResponses,
    refreshQuestions,
  };
}
