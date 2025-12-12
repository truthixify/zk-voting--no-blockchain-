/**
 * Election class - Main orchestrator for election lifecycle
 * Handles setup, voter management, voting, and tallying
 */

import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { ElGamalKeyPair, ElGamalCiphertext } from "./ElGamal";
import { Voter } from "./Voter";
import { Vote } from "./Vote";
import { VoterMerkleTree, VoterEligibilityData } from "./VoterMerkleTree";

export interface ElectionConfig {
  id: string;
  title: string;
  description?: string;
  candidates: Candidate[];
  trusteePassword: string;
}

export interface Candidate {
  id: string;
  name: string;
  description?: string;
}

export interface ElectionState {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'ended';
  publicKey: string;
  groupRoot: string;
  groupMembers: string[];
  candidates: Candidate[];
  eligibilityRoot?: string;
  eligibilityDepth?: number;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface UploadVotersResult {
  totalVoters: number;
  merkleRoot: string;
  merkleDepth: number;
  voterData: VoterEligibilityData[];
  voters: Voter[];
}

export class Election {
  public readonly id: string;
  public readonly title: string;
  public readonly candidates: Candidate[];
  public readonly keyPair: ElGamalKeyPair;
  public readonly group: Group;
  
  private voters: Map<string, Voter> = new Map();
  private votes: Vote[] = []; // All votes stored as vectors
  private usedNullifiers: Set<string> = new Set();
  private eligibilityTree?: VoterMerkleTree;
  
  public status: 'draft' | 'active' | 'ended' = 'draft';
  public createdAt: Date = new Date();
  public startedAt?: Date;
  public endedAt?: Date;

  constructor(config: ElectionConfig) {
    this.id = config.id;
    this.title = config.title;
    this.candidates = config.candidates;
    this.keyPair = ElGamalKeyPair.fromPassword(config.trusteePassword);
    this.group = new Group();
    
    // Votes will be stored as vectors, no need to initialize per candidate
  }

  /**
   * Upload voters from CSV file
   * Creates eligibility Merkle tree and adds voters to Semaphore group
   */
  uploadVoters(csvContent: string): UploadVotersResult {
    // Build Merkle tree from CSV
    const tree = new VoterMerkleTree(csvContent);
    this.eligibilityTree = tree;

    // Create Voter objects and add to Semaphore group
    const voters: Voter[] = [];
    
    tree.voterData.forEach(data => {
      const voter = new Voter(data.email, this.id);
      this.voters.set(voter.id, voter);
      
      // Add voter's commitment to Semaphore group
      this.group.addMember(BigInt(voter.commitment));
      
      voters.push(voter);
    });

    return {
      totalVoters: tree.voterData.length,
      merkleRoot: tree.getRoot(),
      merkleDepth: tree.depth,
      voterData: tree.voterData,
      voters
    };
  }

  /**
   * Add eligible voters to election (legacy method)
   */
  addVoters(voterEmails: string[]): Voter[] {
    const newVoters: Voter[] = [];

    voterEmails.forEach(email => {
      const voter = new Voter(email, this.id);
      this.voters.set(voter.id, voter);
      
      // Add voter's commitment to Semaphore group
      this.group.addMember(BigInt(voter.commitment));
      
      newVoters.push(voter);
    });

    return newVoters;
  }

  /**
   * Check if voter is eligible (using Merkle tree)
   */
  isVoterEligible(email: string): boolean {
    if (!this.eligibilityTree) {
      // Fallback to checking voters map
      const normalized = email.toLowerCase().trim();
      return Array.from(this.voters.values()).some(
        v => v.email.toLowerCase() === normalized
      );
    }
    return this.eligibilityTree.isEligible(email);
  }

  /**
   * Generate eligibility proof for voter
   */
  generateEligibilityProof(email: string) {
    if (!this.eligibilityTree) {
      throw new Error('Eligibility tree not initialized. Use uploadVoters() first.');
    }
    return this.eligibilityTree.generateProof(email);
  }

  /**
   * Get eligibility Merkle root
   */
  getEligibilityRoot(): string | undefined {
    return this.eligibilityTree?.getRoot();
  }

  /**
   * Get voter by ID
   */
  getVoter(voterId: string): Voter | undefined {
    return this.voters.get(voterId);
  }

  /**
   * Get voter by email
   */
  getVoterByEmail(email: string): Voter | undefined {
    return Array.from(this.voters.values()).find(v => v.email === email);
  }

  /**
   * Start election (activate voting)
   */
  start(): void {
    if (this.status !== 'draft') {
      throw new Error('Election already started');
    }
    if (this.voters.size === 0) {
      throw new Error('Cannot start election with no voters');
    }
    
    this.status = 'active';
    this.startedAt = new Date();
  }

  /**
   * End election (stop accepting votes)
   */
  end(): void {
    if (this.status !== 'active') {
      throw new Error('Election is not active');
    }
    
    this.status = 'ended';
    this.endedAt = new Date();
  }

  /**
   * Submit a vote
   */
  async submitVote(vote: Vote): Promise<{ success: boolean; error?: string }> {
    // Check election is active
    if (this.status !== 'active') {
      return { success: false, error: 'Election is not active' };
    }

    // Check nullifier not used (prevent double voting)
    if (this.usedNullifiers.has(vote.nullifier)) {
      return { success: false, error: 'Voter has already voted' };
    }

    // Verify proof
    const isValid = await vote.verify();
    if (!isValid) {
      return { success: false, error: 'Invalid vote proof' };
    }

    // Validate vote vector has correct candidate order
    const expectedOrder = this.candidates.map(c => c.id);
    if (!this.arraysEqual(vote.getCandidateOrder(), expectedOrder)) {
      return { success: false, error: 'Invalid candidate order in vote vector' };
    }

    // Store vote
    this.votes.push(vote);
    this.usedNullifiers.add(vote.nullifier);

    return { success: true };
  }

  /**
   * Tally votes and decrypt results using vote vectors
   */
  tallyResults(trusteePassword: string): Map<string, number> {
    if (this.status !== 'ended') {
      throw new Error('Cannot tally votes until election ends');
    }

    // Verify password
    const testKeyPair = ElGamalKeyPair.fromPassword(trusteePassword);
    if (testKeyPair.publicKey.h !== this.keyPair.publicKey.h) {
      throw new Error('Invalid trustee password');
    }

    const results = new Map<string, number>();

    if (this.votes.length === 0) {
      // No votes cast, return zeros
      this.candidates.forEach(c => results.set(c.id, 0));
      return results;
    }

    // Homomorphic aggregation by position
    const candidateOrder = this.candidates.map(c => c.id);
    const aggregatedByPosition: ElGamalCiphertext[] = [];

    // Initialize aggregation for each position
    for (let pos = 0; pos < candidateOrder.length; pos++) {
      const votesAtPosition = this.votes.map(vote => vote.getEncryptedVoteAt(pos));
      const aggregated = ElGamalCiphertext.aggregate(votesAtPosition);
      aggregatedByPosition.push(aggregated);
    }

    // Decrypt aggregated totals
    candidateOrder.forEach((candidateId, position) => {
      const total = this.keyPair.decrypt(aggregatedByPosition[position]);
      results.set(candidateId, Number(total));
    });

    return results;
  }

  /**
   * Helper method to compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  /**
   * Get election statistics
   */
  getStats() {
    return {
      totalVoters: this.voters.size,
      totalVotes: this.usedNullifiers.size,
      turnout: this.voters.size > 0 
        ? (this.usedNullifiers.size / this.voters.size) * 100 
        : 0,
      votesByCandidateCount: new Map(
        this.candidates.map(c => [c.id, this.votes.length]) // All votes are vectors
      )
    };
  }

  /**
   * Export election state for storage
   */
  export(): ElectionState {
    return {
      id: this.id,
      title: this.title,
      status: this.status,
      publicKey: JSON.stringify(this.keyPair.publicKey),
      groupRoot: this.group.root.toString(),
      groupMembers: this.group.members.map((m: bigint) => m.toString()),
      candidates: this.candidates,
      eligibilityRoot: this.eligibilityTree?.getRoot(),
      eligibilityDepth: this.eligibilityTree?.depth,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt
    };
  }

  /**
   * Import election from stored state
   */
  static import(state: ElectionState, trusteePassword: string): Election {
    const election = new Election({
      id: state.id,
      title: state.title,
      candidates: state.candidates,
      trusteePassword
    });

    election.status = state.status;
    election.createdAt = state.createdAt;
    election.startedAt = state.startedAt;
    election.endedAt = state.endedAt;

    // Restore group
    const members = state.groupMembers.map(m => BigInt(m));
    election.group.addMembers(members);

    return election;
  }
}
