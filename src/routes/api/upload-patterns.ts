/**
 * API Routes for Upload Reminders
 * 
 * REST API endpoints for:
 * - Pattern management
 * - Missing document tracking
 * - Reminder settings
 * - Reminder generation and processing
 */

import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import {
  getAllPatterns,
  getPatternsByDocumentType,
  saveDocumentPattern,
  deletePattern,
  getPendingMissingDocuments,
  getMissingDocumentsByStatus,
  updateMissingDocumentStatus,
  getAllReminderSettings,
  updateReminderSettings,
  getLatestAnalysisRun,
} from '@/lib/db-upload-reminders';
import {
  detectPattern,
  detectMissingDocuments,
  getExpectedDocuments,
  analyzeUploadPatterns,
} from '@/lib/upload-patterns';
import { generateReminders, processDueReminders } from '@/lib/reminder-generator';
import type { DocumentType } from '@/lib/upload-patterns';

// ============================================================================
// PATTERNS API
// ============================================================================

/**
 * GET /api/upload-patterns
 * Get all upload patterns or filter by document type
 */
export const APIRoute = createAPIFileRoute('/api/upload-patterns')({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const documentType = url.searchParams.get('type') as DocumentType | null;

      let patterns;
      if (documentType) {
        patterns = await getPatternsByDocumentType(documentType);
      } else {
        patterns = await getAllPatterns();
      }

      return json({
        success: true,
        data: patterns,
        count: patterns.length,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch patterns',
      }, { status: 500 });
    }
  },

  /**
   * POST /api/upload-patterns
   * Analyze uploads and create/update patterns
   */
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { uploads } = body as {
        uploads: Array<{
          documentType: DocumentType;
          source: string;
          uploadDate: string;
        }>;
      };

      if (!Array.isArray(uploads)) {
        return json({
          success: false,
          error: 'Uploads must be an array',
        }, { status: 400 });
      }

      // Group uploads by source
      const grouped = uploads.reduce((acc, upload) => {
        const key = `${upload.documentType}:${upload.source}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...upload,
          id: `upload-${Date.now()}-${Math.random()}`,
        });
        return acc;
      }, {} as Record<string, typeof uploads>);

      // Analyze patterns
      const result = analyzeUploadPatterns(grouped);

      // Save patterns to database
      for (const pattern of result.patterns) {
        await saveDocumentPattern(pattern);
      }

      return json({
        success: true,
        data: result,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze patterns',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// SINGLE PATTERN API
// ============================================================================

export const PatternAPIRoute = createAPIFileRoute('/api/upload-patterns/$patternId')({
  /**
   * GET /api/upload-patterns/:patternId
   * Get a specific pattern by ID
   */
  GET: async ({ params }) => {
    try {
      const { patternId } = params;
      const { getPatternById } = await import('@/lib/db-upload-reminders');
      const pattern = await getPatternById(patternId);

      if (!pattern) {
        return json({
          success: false,
          error: 'Pattern not found',
        }, { status: 404 });
      }

      return json({
        success: true,
        data: pattern,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pattern',
      }, { status: 500 });
    }
  },

  /**
   * DELETE /api/upload-patterns/:patternId
   * Delete a pattern
   */
  DELETE: async ({ params }) => {
    try {
      const { patternId } = params;
      await deletePattern(patternId);

      return json({
        success: true,
        message: 'Pattern deleted successfully',
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete pattern',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// MISSING DOCUMENTS API
// ============================================================================

export const MissingDocumentsAPIRoute = createAPIFileRoute('/api/missing-documents')({
  /**
   * GET /api/missing-documents
   * Get missing documents, optionally filtered by status
   */
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') as 'pending' | 'reminded' | 'uploaded' | 'dismissed' | null;

      let documents;
      if (status) {
        documents = await getMissingDocumentsByStatus(status);
      } else {
        documents = await getPendingMissingDocuments();
      }

      return json({
        success: true,
        data: documents,
        count: documents.length,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch missing documents',
      }, { status: 500 });
    }
  },

  /**
   * POST /api/missing-documents/detect
   * Run missing document detection
   */
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { patterns, recentUploads } = body as {
        patterns: Parameters<typeof detectMissingDocuments>[0];
        recentUploads: Parameters<typeof detectMissingDocuments>[1];
      };

      const missing = detectMissingDocuments(patterns, recentUploads);

      // Save to database
      const { saveMissingDocument } = await import('@/lib/db-upload-reminders');
      for (const doc of missing) {
        await saveMissingDocument(doc);
      }

      return json({
        success: true,
        data: missing,
        count: missing.length,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect missing documents',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// SINGLE MISSING DOCUMENT API
// ============================================================================

export const MissingDocumentAPIRoute = createAPIFileRoute('/api/missing-documents/$missingId')({
  /**
   * PATCH /api/missing-documents/:missingId
   * Update missing document status
   */
  PATCH: async ({ request, params }) => {
    try {
      const { missingId } = params;
      const body = await request.json();
      const { status } = body as { status: 'pending' | 'reminded' | 'uploaded' | 'dismissed' };

      if (!status) {
        return json({
          success: false,
          error: 'Status is required',
        }, { status: 400 });
      }

      await updateMissingDocumentStatus(missingId, status);

      return json({
        success: true,
        message: `Missing document marked as ${status}`,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// REMINDER SETTINGS API
// ============================================================================

export const ReminderSettingsAPIRoute = createAPIFileRoute('/api/reminder-settings')({
  /**
   * GET /api/reminder-settings
   * Get all reminder settings
   */
  GET: async () => {
    try {
      const settings = await getAllReminderSettings();

      return json({
        success: true,
        data: settings,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      }, { status: 500 });
    }
  },
});

export const DocumentTypeSettingsAPIRoute = createAPIFileRoute('/api/reminder-settings/$documentType')({
  /**
   * GET /api/reminder-settings/:documentType
   * Get settings for a specific document type
   */
  GET: async ({ params }) => {
    try {
      const { documentType } = params;
      const settings = await getReminderSettings(documentType as DocumentType);

      return json({
        success: true,
        data: settings,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      }, { status: 500 });
    }
  },

  /**
   * PUT /api/reminder-settings/:documentType
   * Update settings for a document type
   */
  PUT: async ({ request, params }) => {
    try {
      const { documentType } = params;
      const body = await request.json();

      await updateReminderSettings(documentType as DocumentType, body);

      return json({
        success: true,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// REMINDERS API
// ============================================================================

export const RemindersAPIRoute = createAPIFileRoute('/api/reminders')({
  /**
   * GET /api/reminders
   * Get generated reminders
   */
  GET: async () => {
    try {
      // Get pending missing documents
      const missing = await getPendingMissingDocuments();
      
      // Generate reminders
      const result = await generateReminders(missing, { respectSettings: true });

      return json({
        success: true,
        data: result.reminders,
        stats: {
          total: result.totalReminders,
          byType: result.byType,
          byUrgency: result.byUrgency,
        },
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate reminders',
      }, { status: 500 });
    }
  },

  /**
   * POST /api/reminders/process
   * Process due reminders
   */
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { channels = ['app'] } = body as { channels?: ('app' | 'email' | 'push')[] };

      // Get pending missing documents and generate reminders
      const missing = await getPendingMissingDocuments();
      const { reminders } = await generateReminders(missing, { respectSettings: true });

      // Process due reminders
      const result = await processDueReminders(reminders, { channels });

      return json({
        success: true,
        data: result,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process reminders',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// EXPECTED DOCUMENTS API
// ============================================================================

export const ExpectedDocumentsAPIRoute = createAPIFileRoute('/api/expected-documents')({
  /**
   * GET /api/expected-documents
   * Get documents expected in the coming days
   */
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const daysAhead = parseInt(url.searchParams.get('days') || '30');

      const patterns = await getAllPatterns();
      const expected = getExpectedDocuments(patterns, daysAhead);

      return json({
        success: true,
        data: expected,
        count: expected.length,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expected documents',
      }, { status: 500 });
    }
  },
});

// ============================================================================
// ANALYSIS API
// ============================================================================

export const AnalysisAPIRoute = createAPIFileRoute('/api/upload-patterns/analysis')({
  /**
   * GET /api/upload-patterns/analysis
   * Get latest analysis run info
   */
  GET: async () => {
    try {
      const latestRun = await getLatestAnalysisRun();

      return json({
        success: true,
        data: latestRun,
      });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analysis info',
      }, { status: 500 });
    }
  },
});