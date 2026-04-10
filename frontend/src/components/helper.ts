import type { DocumentItem } from "../lib/types";
import {
  ACCEPTED_MIME,
  DOCUMENT_THUMB_LABEL,
  PDF_FILE_EXT,
  WORD_FILE_EXT,
} from "./constant";

/**
 * Check if a file is accepted by the system
 * @param file - The file to check
 * @returns True if the file is accepted, false otherwise
 */
export const isAcceptedFile = (file: File): boolean => {
  if (file.type && ACCEPTED_MIME.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(PDF_FILE_EXT) ||
    lower.endsWith(WORD_FILE_EXT.DOC) ||
    lower.endsWith(WORD_FILE_EXT.DOCX)
  );
};

/**
 * Check if a document is a PDF document
 * @param doc - The document to check
 * @returns True if the document is a PDF document, false otherwise
 */
export const isPdfDocument = (doc: DocumentItem): boolean => {
  return (
    doc.mimeType === 'application/pdf' ||
    doc.originalName.toLowerCase().endsWith(PDF_FILE_EXT)
  );
};

/**
 * Get focusable elements from a container
 * @param container - The container to get focusable elements from
 * @returns An array of focusable elements
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector =
    'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    if (el.tabIndex < 0) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return true;
  });
};

/**
 * Get a label for a word document
 * @param doc - The document to get a label for
 * @returns A label for the document
 */
export const wordLabel = (doc: DocumentItem): string => {
  const n = doc.originalName.toLowerCase();
  if (n.endsWith(WORD_FILE_EXT.DOCX)) return DOCUMENT_THUMB_LABEL.DOCX;
  if (n.endsWith(WORD_FILE_EXT.DOC)) return DOCUMENT_THUMB_LABEL.DOC;
  if (doc.mimeType.includes('word')) return DOCUMENT_THUMB_LABEL.DOC;
  return DOCUMENT_THUMB_LABEL.FILE;
};

/**
 * Get initials from a username
 * @param username - The username to get initials from
 * @returns Initials from the username
 */
export const initialsFromUsername = (username: string): string => { 
    const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    const compact = username.replace(/[^a-zA-Z0-9]/g, '');
    if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
    return (username.slice(0, 2) || '?').toUpperCase();
  };