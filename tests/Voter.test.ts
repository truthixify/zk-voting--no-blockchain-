/**
 * Voter class tests
 */

import { Voter } from '../src/core/Voter';

describe('Voter', () => {
  const electionId = 'test-election-123';
  const email = 'voter@example.com';

  describe('constructor', () => {
    it('should create voter with email and election ID', () => {
      const voter = new Voter(email, electionId);
      
      expect(voter.email).toBe(email);
      expect(voter.id).toBe(`${electionId}-${email}`);
      expect(voter.identity).toBeDefined();
      expect(voter.commitment).toBeDefined();
      expect(typeof voter.commitment).toBe('string');
    });

    it('should generate deterministic identity from email and election', () => {
      const voter1 = new Voter(email, electionId);
      const voter2 = new Voter(email, electionId);
      
      expect(voter1.commitment).toBe(voter2.commitment);
    });

    it('should generate different identities for different emails', () => {
      const voter1 = new Voter('alice@example.com', electionId);
      const voter2 = new Voter('bob@example.com', electionId);
      
      expect(voter1.commitment).not.toBe(voter2.commitment);
    });

    it('should generate different identities for different elections', () => {
      const voter1 = new Voter(email, 'election-1');
      const voter2 = new Voter(email, 'election-2');
      
      expect(voter1.commitment).not.toBe(voter2.commitment);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default expiry', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken();
      
      expect(token).toBeDefined();
      expect(token.token).toBeDefined();
      expect(token.hash).toBeDefined();
      expect(token.expiresAt).toBeDefined();
      expect(token.used).toBe(false);
    });

    it('should generate token with custom expiry', () => {
      const voter = new Voter(email, electionId);
      const expiryHours = 48;
      const token = voter.generateToken(expiryHours);
      
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
      
      expect(token.expiresAt.getTime()).toBeGreaterThan(now.getTime());
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });

    it('should generate unique tokens each time', () => {
      const voter = new Voter(email, electionId);
      const token1 = voter.generateToken();
      const token2 = voter.generateToken();
      
      expect(token1.token).not.toBe(token2.token);
      expect(token1.hash).not.toBe(token2.hash);
    });

    it('should include voter ID in token', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken();
      
      expect(token.token).toContain(voter.id);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken();
      
      expect(voter.verifyToken(token.token)).toBe(true);
    });

    it('should reject invalid token', () => {
      const voter = new Voter(email, electionId);
      voter.generateToken();
      
      expect(voter.verifyToken('invalid-token')).toBe(false);
    });

    it('should reject token after being marked as used', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken();
      
      expect(voter.verifyToken(token.token)).toBe(true);
      
      voter.markTokenUsed();
      
      expect(voter.verifyToken(token.token)).toBe(false);
    });

    it('should return false if no token generated', () => {
      const voter = new Voter(email, electionId);
      
      expect(voter.verifyToken('any-token')).toBe(false);
    });
  });

  describe('markTokenUsed', () => {
    it('should mark token as used', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken();
      
      expect(token.used).toBe(false);
      
      voter.markTokenUsed();
      
      expect(voter.verifyToken(token.token)).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const voter = new Voter(email, electionId);
      voter.generateToken(72);
      
      expect(voter.isTokenExpired()).toBe(false);
    });

    it('should return true if no token generated', () => {
      const voter = new Voter(email, electionId);
      
      expect(voter.isTokenExpired()).toBe(true);
    });

    it('should detect expired token', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken(0);
      
      // Manually set expiry to past
      token.expiresAt = new Date(Date.now() - 1000);
      
      expect(voter.isTokenExpired()).toBe(true);
    });
  });

  describe('getInviteLink', () => {
    it('should generate invite link with default base URL', () => {
      const voter = new Voter(email, electionId);
      voter.generateToken();
      
      const link = voter.getInviteLink();
      
      expect(link).toContain('https://veravote.com/vote/');
      expect(link).toContain(voter.id);
    });

    it('should generate invite link with custom base URL', () => {
      const voter = new Voter(email, electionId);
      voter.generateToken();
      
      const link = voter.getInviteLink('https://custom.com');
      
      expect(link).toContain('https://custom.com/vote/');
    });

    it('should throw error if token not generated', () => {
      const voter = new Voter(email, electionId);
      
      expect(() => voter.getInviteLink()).toThrow('Token not generated');
    });
  });

  describe('export', () => {
    it('should export voter data', () => {
      const voter = new Voter(email, electionId);
      voter.generateToken();
      
      const data = voter.export();
      
      expect(data.id).toBe(voter.id);
      expect(data.email).toBe(email);
      expect(data.commitment).toBe(voter.commitment);
      expect(data.token).toBeDefined();
      expect(data.inviteLink).toBeDefined();
    });

    it('should throw error if token not generated', () => {
      const voter = new Voter(email, electionId);
      
      expect(() => voter.export()).toThrow('Token not generated');
    });
  });

  describe('parseToken', () => {
    it('should parse valid token', () => {
      const voter = new Voter(email, electionId);
      const token = voter.generateToken();
      
      const voterId = Voter.parseToken(token.token);
      
      expect(voterId).toBe(voter.id);
    });

    it('should return null for invalid token format', () => {
      expect(Voter.parseToken('invalid')).toBeNull();
      expect(Voter.parseToken('')).toBeNull();
      expect(Voter.parseToken('only-one-part')).toBeNull();
    });
  });
});
