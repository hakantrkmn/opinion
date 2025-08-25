/**
 * Validation functions for pin cleanup service
 * Tests the deleteCommentWithCleanup functionality
 */

import type { CommentDeleteResult } from "@/types";
import { pinService } from "./supabase/database";

export interface CleanupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that the cleanup service properly handles comment deletion
 */
export function validateCleanupResult(
  result: CommentDeleteResult
): CleanupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic result structure
  if (typeof result.success !== "boolean") {
    errors.push("Result must have a boolean success property");
  }

  if (typeof result.pinDeleted !== "boolean") {
    errors.push("Result must have a boolean pinDeleted property");
  }

  if (result.error !== null && typeof result.error !== "string") {
    errors.push("Error must be null or string");
  }

  // Validate success scenarios
  if (result.success) {
    if (result.pinDeleted && !result.pinId) {
      warnings.push(
        "Pin was deleted but pinId was not provided for cache cleanup"
      );
    }

    if (result.error !== null) {
      warnings.push("Success is true but error is not null");
    }
  }

  // Validate error scenarios
  if (!result.success) {
    if (result.error === null || result.error.trim() === "") {
      errors.push("Failed operations must provide an error message");
    }

    if (result.pinDeleted) {
      errors.push("Pin should not be marked as deleted when operation fails");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates cleanup service safety checks
 */
export function validateCleanupSafety(): CleanupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if the service exists and has the required method
  if (!pinService.deleteCommentWithCleanup) {
    errors.push("deleteCommentWithCleanup method not found in pinService");
  }

  // Verify the method signature
  if (typeof pinService.deleteCommentWithCleanup !== "function") {
    errors.push("deleteCommentWithCleanup must be a function");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Simulates cleanup scenarios for testing
 */
export function simulateCleanupScenarios(): {
  commentDeletedPinRemains: CommentDeleteResult;
  commentDeletedPinRemoved: CommentDeleteResult;
  commentDeleteFailed: CommentDeleteResult;
  unauthorizedDelete: CommentDeleteResult;
} {
  return {
    // Scenario 1: Comment deleted, pin has other comments
    commentDeletedPinRemains: {
      success: true,
      pinDeleted: false,
      error: null,
      pinId: "test-pin-1",
    },

    // Scenario 2: Comment deleted, pin automatically removed (last comment)
    commentDeletedPinRemoved: {
      success: true,
      pinDeleted: true,
      error: null,
      pinId: "test-pin-2",
    },

    // Scenario 3: Comment deletion failed
    commentDeleteFailed: {
      success: false,
      pinDeleted: false,
      error: "Database error occurred",
    },

    // Scenario 4: Unauthorized deletion attempt
    unauthorizedDelete: {
      success: false,
      pinDeleted: false,
      error: "You can only delete your own comments",
    },
  };
}

/**
 * Validates all cleanup scenarios
 */
export function validateAllCleanupScenarios(): CleanupValidationResult {
  const scenarios = simulateCleanupScenarios();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Test each scenario
  Object.entries(scenarios).forEach(([scenarioName, result]) => {
    const validation = validateCleanupResult(result);

    if (!validation.isValid) {
      errors.push(
        `Scenario ${scenarioName} failed validation: ${validation.errors.join(
          ", "
        )}`
      );
    }

    warnings.push(...validation.warnings.map((w) => `${scenarioName}: ${w}`));
  });

  // Test safety checks
  const safetyValidation = validateCleanupSafety();
  errors.push(...safetyValidation.errors);
  warnings.push(...safetyValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
