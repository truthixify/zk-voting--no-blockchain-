/**
 * Vote class - Represents an encrypted, anonymous vote with ZK proof
 */

import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof, verifyProof, SemaphoreProof } from "@semaphore-protocol/proof";
import { ElGamalCiphertext, ElGamalPublicKey } from "./ElGamal";
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

export type VoteProofData = SemaphoreProof;

// Vote vector - encrypted vote for each candidate
export interface VoteVector {
  encryptedVotes: ElGamalCiphertext[]; // One per candidate, in candidate order
  candidateOrder: string[]; // Maps position to candidate ID
}

export interface VoteReceipt {
  receiptId: string;
  electionId: string;
  voteVectorHash: string; // Hash of the vote vector for verification
  timestamp: Date;
  nullifier: string;
}

export class Vote {
  public readonly voteVector: VoteVector;
  public readonly proof: VoteProofData;
  public readonly nullifier: string;
  public readonly receipt: VoteReceipt;
  public readonly timestamp: Date;

  private constructor(
    voteVector: VoteVector,
    proof: VoteProofData,
    electionId: string
  ) {
    this.voteVector = voteVector;
    this.proof = proof;
    this.nullifier = proof.nullifier.toString();
    this.timestamp = new Date();

    // Generate receipt
    this.receipt = this.generateReceipt(electionId);
  }

  /**
   * Cast a vote (client-side) - Vote Vector Approach
   */
  static async cast(
    voterIdentity: Identity,
    electionGroup: Group,
    selectedCandidateId: string,
    candidateOrder: string[], // Ordered list of all candidate IDs
    publicKey: ElGamalPublicKey,
    electionId: string
  ): Promise<Vote> {
    // Create vote vector: 1 for selected candidate, 0 for others
    const encryptedVotes: ElGamalCiphertext[] = [];
    
    for (const candidateId of candidateOrder) {
      const voteValue = candidateId === selectedCandidateId ? 1n : 0n;
      const encryptedVote = ElGamalCiphertext.encrypt(voteValue, publicKey);
      encryptedVotes.push(encryptedVote);
    }

    const voteVector: VoteVector = {
      encryptedVotes,
      candidateOrder: [...candidateOrder] // Copy to prevent mutation
    };

    // Generate message from vote vector hash
    const message = Vote.hashVoteVector(voteVector);

    // Generate Semaphore proof
    const proof = await generateProof(
      voterIdentity,
      electionGroup,
      message,
      electionId // scope = election ID (prevents double voting)
    );

    return new Vote(voteVector, proof, electionId);
  }

  /**
   * Verify vote proof (server-side)
   */
  async verify(): Promise<boolean> {
    // Verify Semaphore proof - this checks everything:
    // - Voter is in the group (Merkle proof)
    // - Nullifier is correctly generated
    // - Message is signed correctly
    return await verifyProof(this.proof);
  }

  /**
   * Generate receipt for voter
   */
  private generateReceipt(electionId: string): VoteReceipt {
    const voteVectorHash = Vote.hashVoteVector(this.voteVector).toString();
    const receiptData = `${electionId}:${voteVectorHash}:${this.nullifier}:${this.timestamp.toISOString()}`;
    const receiptId = bytesToHex(sha256(new TextEncoder().encode(receiptData)));

    return {
      receiptId,
      electionId,
      voteVectorHash,
      timestamp: this.timestamp,
      nullifier: this.nullifier
    };
  }

  /**
   * Hash vote vector for proof message
   */
  private static hashVoteVector(voteVector: VoteVector): bigint {
    const data = JSON.stringify({
      encryptedVotes: voteVector.encryptedVotes.map(ev => ({
        c1: ev.c1,
        c2: ev.c2
      })),
      candidateOrder: voteVector.candidateOrder
    });
    
    const bytes = new TextEncoder().encode(data);
    let hash = 0n;
    
    for (let i = 0; i < bytes.length; i++) {
      hash = (hash * 256n + BigInt(bytes[i])) % (2n ** 253n);
    }
    
    return hash;
  }

  /**
   * Get the candidate order for this vote
   */
  getCandidateOrder(): string[] {
    return [...this.voteVector.candidateOrder];
  }

  /**
   * Get encrypted vote for a specific candidate position
   */
  getEncryptedVoteAt(position: number): ElGamalCiphertext {
    if (position < 0 || position >= this.voteVector.encryptedVotes.length) {
      throw new Error(`Invalid position: ${position}`);
    }
    return this.voteVector.encryptedVotes[position];
  }

  /**
   * Export vote for storage
   */
  export() {
    return {
      voteVector: {
        encryptedVotes: this.voteVector.encryptedVotes.map(ev => ({
          c1: ev.c1,
          c2: ev.c2
        })),
        candidateOrder: this.voteVector.candidateOrder
      },
      proof: this.proof,
      nullifier: this.nullifier,
      receipt: this.receipt,
      timestamp: this.timestamp
    };
  }
}
