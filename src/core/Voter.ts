/**
 * Voter class - Represents an eligible voter with Semaphore identity
 */

import { Identity } from "@semaphore-protocol/identity";
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { randomBytes } from 'crypto';

export interface VoterToken {
  token: string;
  hash: string;
  expiresAt: Date;
  used: boolean;
}

export interface VoterData {
  id: string;
  email: string;
  commitment: string;
  token: VoterToken;
  inviteLink: string;
}

export class Voter {
  public readonly id: string;
  public readonly email: string;
  public readonly identity: Identity;
  public readonly commitment: string;
  
  private _token?: VoterToken;

  constructor(email: string, electionId: string) {
    this.id = `${electionId}-${email}`;
    this.email = email;
    
    // Generate deterministic identity from email + election
    // This allows voter to regenerate their identity when they return
    const secret = `${email}:${electionId}`;
    this.identity = new Identity(secret);
    this.commitment = this.identity.commitment.toString();
  }

  /**
   * Generate one-time access token for voter
   */
  generateToken(expiryHours: number = 72): VoterToken {
    const randomPart = bytesToHex(randomBytes(32));
    const token = `${this.id}:${randomPart}`;
    const hash = bytesToHex(sha256(new TextEncoder().encode(token)));

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    this._token = {
      token,
      hash,
      expiresAt,
      used: false
    };

    return this._token;
  }

  /**
   * Verify token matches this voter
   */
  verifyToken(token: string): boolean {
    if (!this._token) return false;
    
    const hash = bytesToHex(sha256(new TextEncoder().encode(token)));
    return hash === this._token.hash && !this._token.used;
  }

  /**
   * Mark token as used
   */
  markTokenUsed(): void {
    if (this._token) {
      this._token.used = true;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (!this._token) return true;
    return new Date() > this._token.expiresAt;
  }

  /**
   * Get invite link
   */
  getInviteLink(baseUrl: string = 'https://veravote.com'): string {
    if (!this._token) {
      throw new Error('Token not generated');
    }
    return `${baseUrl}/vote/${this._token.token}`;
  }

  /**
   * Export voter data
   */
  export(): VoterData {
    if (!this._token) {
      throw new Error('Token not generated');
    }

    return {
      id: this.id,
      email: this.email,
      commitment: this.commitment,
      token: this._token,
      inviteLink: this.getInviteLink()
    };
  }

  /**
   * Parse token to extract voter ID
   */
  static parseToken(token: string): string | null {
    const parts = token.split(':');
    if (parts.length < 2) return null;
    return parts[0];
  }
}
