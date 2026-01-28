/**
 * Invite Code Generator & Utilities
 * Secure generation of unique, unexpired invite codes for the Safety Circle system
 */

import crypto from 'crypto';

const INVITE_CODE_LENGTH = 32;
const INVITE_EXPIRY_DAYS = 7;

/**
 * Generate a secure random invite code
 * @returns 32-character random string safe for URLs
 */
export function generateInviteCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create shareable invite URL
 * @param inviteCode - The generated invite code
 * @param baseUrl - Application base URL (e.g., https://micall.app)
 * @returns Full shareable URL
 */
export function createInviteLink(inviteCode: string, baseUrl: string = 'https://micall.app'): string {
  return `${baseUrl}/auth/join?invite_code=${inviteCode}`;
}

/**
 * Extract invite code from URL
 * @param url - Full invite URL or code
 * @returns Extracted invite code
 */
export function extractInviteCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('invite_code');
  } catch {
    // If not a valid URL, assume it's a raw code
    if (/^[a-f0-9]{32}$/.test(url)) {
      return url;
    }
    return null;
  }
}

/**
 * Validate invite code format
 * @param code - Code to validate
 * @returns true if valid format
 */
export function isValidInviteCodeFormat(code: string): boolean {
  return /^[a-f0-9]{32}$/.test(code);
}

/**
 * Calculate invite expiry timestamp
 * @param days - Number of days until expiry (default: 7)
 * @returns ISO string of expiry date
 */
export function calculateInviteExpiry(days: number = INVITE_EXPIRY_DAYS): string {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate.toISOString();
}

/**
 * Check if invite is expired
 * @param expiresAt - Expiry timestamp
 * @returns true if expired
 */
export function isInviteExpired(expiresAt: string | Date): boolean {
  const expiry = new Date(expiresAt);
  return new Date() > expiry;
}

/**
 * Rate limit check: Max 10 invites per day per user
 * @param invitesCount - Number of invites sent today
 * @returns true if user can send more invites
 */
export function canSendInvite(invitesCount: number): boolean {
  return invitesCount < 10;
}

/**
 * Get friendly invite message
 * @param inviterName - Name of person sending invite
 * @param inviteLink - The shareable link
 * @returns Share-friendly message
 */
export function getInviteShareMessage(inviterName: string, inviteLink: string): string {
  return `${inviterName} invited you to join MiCall - a safety app that helps you stay connected with people who care about you.\n\nJoin the safety circle: ${inviteLink}`;
}

/**
 * Parse invite metadata
 * @param metadata - JSON metadata from user_invites table
 * @returns Parsed metadata object
 */
export function parseInviteMetadata(metadata?: Record<string, any>) {
  return {
    sourceFlow: metadata?.sourceFlow || 'profile', // 'profile' | 'contacts' | 'onboarding'
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    ...metadata,
  };
}

/**
 * Validate rate limiting (check if user sent invites recently)
 * @param lastInviteSentAt - Timestamp of last invite
 * @param minIntervalMs - Minimum milliseconds between invites (default: 1 second)
 * @returns true if enough time has passed
 */
export function checkRateLimitInterval(lastInviteSentAt: Date | null, minIntervalMs: number = 1000): boolean {
  if (!lastInviteSentAt) return true;
  return new Date().getTime() - new Date(lastInviteSentAt).getTime() >= minIntervalMs;
}
