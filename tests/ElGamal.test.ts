/**
 * ElGamal encryption tests
 */

import { ElGamalKeyPair, ElGamalCiphertext } from '../src/core/ElGamal';

describe('ElGamalKeyPair', () => {
  describe('fromPassword', () => {
    it('should generate keypair from password', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.publicKey.h).toBeDefined();
      expect(typeof keyPair.publicKey.h).toBe('string');
      expect(keyPair.privateKey).toBeDefined();
      expect(typeof keyPair.privateKey.x).toBe('bigint');
    });

    it('should generate same keypair for same password', () => {
      const keyPair1 = ElGamalKeyPair.fromPassword('same-password');
      const keyPair2 = ElGamalKeyPair.fromPassword('same-password');
      
      expect(keyPair1.publicKey.h).toBe(keyPair2.publicKey.h);
      expect(keyPair1.privateKey.x).toBe(keyPair2.privateKey.x);
    });

    it('should generate different keypairs for different passwords', () => {
      const keyPair1 = ElGamalKeyPair.fromPassword('password1');
      const keyPair2 = ElGamalKeyPair.fromPassword('password2');
      
      expect(keyPair1.publicKey.h).not.toBe(keyPair2.publicKey.h);
      expect(keyPair1.privateKey.x).not.toBe(keyPair2.privateKey.x);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted message', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 42n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      const decrypted = keyPair.decrypt(ciphertext);
      
      expect(decrypted).toBe(message);
    });

    it('should decrypt zero', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 0n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      const decrypted = keyPair.decrypt(ciphertext);
      
      expect(decrypted).toBe(message);
    });

    it('should decrypt one', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 1n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      const decrypted = keyPair.decrypt(ciphertext);
      
      expect(decrypted).toBe(message);
    });

    it('should decrypt large values within range', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 1000n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      const decrypted = keyPair.decrypt(ciphertext);
      
      expect(decrypted).toBe(message);
    });

    it('should fail to decrypt with wrong private key', () => {
      const keyPair1 = ElGamalKeyPair.fromPassword('password1');
      const keyPair2 = ElGamalKeyPair.fromPassword('password2');
      const message = 42n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair1.publicKey);
      
      expect(() => keyPair2.decrypt(ciphertext)).toThrow();
    });
  });
});

describe('ElGamalCiphertext', () => {
  describe('encrypt', () => {
    it('should encrypt message', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 5n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      
      expect(ciphertext).toBeDefined();
      expect(ciphertext.c1).toBeDefined();
      expect(ciphertext.c2).toBeDefined();
      expect(typeof ciphertext.c1).toBe('string');
      expect(typeof ciphertext.c2).toBe('string');
    });

    it('should produce different ciphertexts for same message (randomized)', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 5n;
      
      const ciphertext1 = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      const ciphertext2 = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      
      // Should be different due to randomization
      expect(ciphertext1.c1).not.toBe(ciphertext2.c1);
      expect(ciphertext1.c2).not.toBe(ciphertext2.c2);
      
      // But should decrypt to same value
      expect(keyPair.decrypt(ciphertext1)).toBe(message);
      expect(keyPair.decrypt(ciphertext2)).toBe(message);
    });

    it('should throw error for negative values', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      
      expect(() => {
        ElGamalCiphertext.encrypt(-1n, keyPair.publicKey);
      }).toThrow();
    });

    it('should throw error for values exceeding MAX_VOTES', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      
      expect(() => {
        ElGamalCiphertext.encrypt(100001n, keyPair.publicKey);
      }).toThrow();
    });
  });

  describe('add (homomorphic addition)', () => {
    it('should add two ciphertexts homomorphically', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message1 = 3n;
      const message2 = 5n;
      
      const ciphertext1 = ElGamalCiphertext.encrypt(message1, keyPair.publicKey);
      const ciphertext2 = ElGamalCiphertext.encrypt(message2, keyPair.publicKey);
      
      const sum = ciphertext1.add(ciphertext2);
      const decryptedSum = keyPair.decrypt(sum);
      
      expect(decryptedSum).toBe(message1 + message2);
    });

    it('should add multiple ciphertexts', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      
      const ct1 = ElGamalCiphertext.encrypt(1n, keyPair.publicKey);
      const ct2 = ElGamalCiphertext.encrypt(2n, keyPair.publicKey);
      const ct3 = ElGamalCiphertext.encrypt(3n, keyPair.publicKey);
      
      const sum = ct1.add(ct2).add(ct3);
      const decryptedSum = keyPair.decrypt(sum);
      
      expect(decryptedSum).toBe(6n);
    });

    it('should handle adding zero', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 10n;
      
      const ciphertext = ElGamalCiphertext.encrypt(message, keyPair.publicKey);
      const zero = ElGamalCiphertext.encrypt(0n, keyPair.publicKey);
      
      const sum = ciphertext.add(zero);
      const decryptedSum = keyPair.decrypt(sum);
      
      expect(decryptedSum).toBe(message);
    });
  });

  describe('aggregate', () => {
    it('should aggregate multiple ciphertexts', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      
      const ciphertexts = [
        ElGamalCiphertext.encrypt(1n, keyPair.publicKey),
        ElGamalCiphertext.encrypt(2n, keyPair.publicKey),
        ElGamalCiphertext.encrypt(3n, keyPair.publicKey),
        ElGamalCiphertext.encrypt(4n, keyPair.publicKey),
        ElGamalCiphertext.encrypt(5n, keyPair.publicKey)
      ];
      
      const aggregated = ElGamalCiphertext.aggregate(ciphertexts);
      const decrypted = keyPair.decrypt(aggregated);
      
      expect(decrypted).toBe(15n);
    });

    it('should handle single ciphertext', () => {
      const keyPair = ElGamalKeyPair.fromPassword('test-password');
      const message = 42n;
      
      const ciphertexts = [ElGamalCiphertext.encrypt(message, keyPair.publicKey)];
      const aggregated = ElGamalCiphertext.aggregate(ciphertexts);
      const decrypted = keyPair.decrypt(aggregated);
      
      expect(decrypted).toBe(message);
    });

    it('should throw error for empty array', () => {
      expect(() => {
        ElGamalCiphertext.aggregate([]);
      }).toThrow('Cannot aggregate empty array');
    });

    it('should aggregate votes (realistic scenario)', () => {
      const keyPair = ElGamalKeyPair.fromPassword('trustee-password');
      
      // Simulate 100 voters, 60 vote yes (1), 40 vote no (0)
      const votes = [
        ...Array(60).fill(1n).map(v => ElGamalCiphertext.encrypt(v, keyPair.publicKey)),
        ...Array(40).fill(0n).map(v => ElGamalCiphertext.encrypt(v, keyPair.publicKey))
      ];
      
      const tally = ElGamalCiphertext.aggregate(votes);
      const result = keyPair.decrypt(tally);
      
      expect(result).toBe(60n);
    });
  });
});
