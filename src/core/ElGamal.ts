/**
 * ElGamal encryption on Baby Jubjub curve
 * Supports homomorphic addition for vote tallying
 */

import { jubjub } from '@noble/curves/jubjub';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

const curve = jubjub;
const G = curve.Point.BASE;

// Precompute lookup table for discrete log (vote decryption)
// Maps point hex -> value for fast decryption
const DLOG_CACHE = new Map<string, bigint>();
const MAX_VOTES = 10000; // Support up to 10k votes (reduced for faster init)

function initDLogCache() {
  if (DLOG_CACHE.size > 0) return; // Already initialized
  
  // Handle zero separately (identity point)
  const identity = curve.Point.ZERO;
  DLOG_CACHE.set(identity.toHex(), 0n);
  
  // Precompute for 1 to MAX_VOTES
  for (let i = 1n; i <= BigInt(MAX_VOTES); i++) {
    const point = G.multiply(i);
    DLOG_CACHE.set(point.toHex(), i);
  }
}

export interface ElGamalPublicKey {
  h: string; // hex encoded point
}

export interface ElGamalPrivateKey {
  x: bigint;
}

export class ElGamalKeyPair {
  public readonly publicKey: ElGamalPublicKey;
  public readonly privateKey: ElGamalPrivateKey;

  constructor(privateKey: ElGamalPrivateKey) {
    this.privateKey = privateKey;
    const h = G.multiply(privateKey.x);
    this.publicKey = { h: h.toHex() };
  }

  /**
   * Generate keypair from trustee password
   */
  static fromPassword(password: string): ElGamalKeyPair {
    const hash = sha256(new TextEncoder().encode(password));
    const x = BigInt('0x' + bytesToHex(hash)) % curve.CURVE.n;
    return new ElGamalKeyPair({ x });
  }

  /**
   * Decrypt ciphertext
   * Uses precomputed lookup table for discrete log (standard for small values)
   */
  decrypt(ciphertext: ElGamalCiphertext): bigint {
    // Initialize cache on first use
    initDLogCache();

    const c1 = curve.Point.fromHex(ciphertext.c1);
    const c2 = curve.Point.fromHex(ciphertext.c2);

    // Compute m = c2 - x*c1
    const s = c1.multiply(this.privateKey.x);
    const m = c2.subtract(s);

    // Lookup in precomputed table
    const value = DLOG_CACHE.get(m.toHex());
    if (value !== undefined) {
      return value;
    }

    throw new Error(
      `Decryption failed: value not in range [0, ${MAX_VOTES}]. ` +
      `This likely means the ciphertext is invalid or corrupted.`
    );
  }
}

export class ElGamalCiphertext {
  public readonly c1: string;
  public readonly c2: string;

  constructor(c1: string, c2: string) {
    this.c1 = c1;
    this.c2 = c2;
  }

  /**
   * Encrypt a vote value (0 or 1 for one-hot encoding)
   */
  static encrypt(
    message: bigint,
    publicKey: ElGamalPublicKey
  ): ElGamalCiphertext {
    if (message < 0n || message > BigInt(MAX_VOTES)) {
      throw new Error(`Message must be in range [0, ${MAX_VOTES}]`);
    }

    // Random ephemeral key
    const r = curve.utils.randomSecretKey();
    const rBigInt = BigInt('0x' + bytesToHex(r)) % curve.CURVE.n;

    const c1 = G.multiply(rBigInt);
    const h = curve.Point.fromHex(publicKey.h);
    const s = h.multiply(rBigInt);
    
    // Handle zero message (identity point)
    const m = message === 0n ? curve.Point.ZERO : G.multiply(message);
    const c2 = s.add(m);

    return new ElGamalCiphertext(c1.toHex(), c2.toHex());
  }

  /**
   * Homomorphic addition of two ciphertexts
   */
  add(other: ElGamalCiphertext): ElGamalCiphertext {
    const c1_1 = curve.Point.fromHex(this.c1);
    const c1_2 = curve.Point.fromHex(this.c2);
    const c2_1 = curve.Point.fromHex(other.c1);
    const c2_2 = curve.Point.fromHex(other.c2);

    return new ElGamalCiphertext(
      c1_1.add(c2_1).toHex(),
      c1_2.add(c2_2).toHex()
    );
  }

  /**
   * Aggregate multiple ciphertexts (for tallying)
   */
  static aggregate(ciphertexts: ElGamalCiphertext[]): ElGamalCiphertext {
    if (ciphertexts.length === 0) {
      throw new Error('Cannot aggregate empty array');
    }

    return ciphertexts.reduce((acc, ct) => acc.add(ct));
  }
}
