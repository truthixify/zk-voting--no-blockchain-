/**
 * Voter Merkle Tree for eligibility verification
 * Uses fixed-merkle-tree for efficient proof generation
 */

import { MerkleTree } from 'fixed-merkle-tree';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

export interface VoterEligibilityData {
  email: string;
  leafHash: string;
  index: number;
}

export interface VoterMerkleTreeData {
  depth: number;
  root: string;
  elements: (string | number)[];
  voterMap: Map<string, number>; // email -> leaf index
}

export class VoterMerkleTree {
  public tree: MerkleTree;
  private voterMap: Map<string, number>; // email -> leaf index
  public voterData: VoterEligibilityData[];

  constructor(csvContent: string) {
    // Parse CSV - assume first column is email
    const lines = csvContent.trim().split('\n');
    
    // Skip header if present (check if first line contains 'email')
    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;
    
    // Extract and normalize emails
    const rawEmails = lines
      .slice(startIndex)
      .map(line => line.split(',')[0].trim().toLowerCase())
      .filter(email => email.length > 0 && email.includes('@'));

    if (rawEmails.length === 0) {
      throw new Error('No valid emails found in CSV');
    }

    // Remove duplicates (keep first occurrence)
    const emails = Array.from(new Set(rawEmails));
    
    if (emails.length < rawEmails.length) {
      console.warn(`Removed ${rawEmails.length - emails.length} duplicate email(s)`);
    }

    // Calculate optimal depth
    const depth = VoterMerkleTree.calculateDepth(emails.length);

    // Hash all emails and create elements array
    const elements: (string | number)[] = emails.map(email => 
      VoterMerkleTree.hashEmail(email)
    );

    // Build tree
    this.tree = new MerkleTree(depth, elements);
    this.voterMap = new Map();

    // Build voter data and map
    this.voterData = emails.map((email, index) => {
      this.voterMap.set(email, index);
      return {
        email,
        leafHash: elements[index] as string,
        index
      };
    });
  }

  /**
   * Calculate optimal tree depth for number of voters
   * Depth must satisfy: 2^depth >= numberOfVoters
   */
  static calculateDepth(numberOfVoters: number): number {
    if (numberOfVoters === 0) return 1;
    return Math.ceil(Math.log2(numberOfVoters));
  }

  /**
   * Hash email to create leaf value
   */
  static hashEmail(email: string): string {
    const normalized = email.toLowerCase().trim();
    const hash = sha256(new TextEncoder().encode(normalized));
    return bytesToHex(hash);
  }

  /**
   * Add new voter to tree
   * Rebuilds the tree with the new voter
   */
  addVoter(email: string): VoterEligibilityData {
    const normalized = email.toLowerCase().trim();
    
    // Check if already exists
    if (this.voterMap.has(normalized)) {
      throw new Error(`Voter ${email} already exists in tree`);
    }

    // Add email to voter data
    const leafHash = VoterMerkleTree.hashEmail(normalized);
    const newIndex = this.voterData.length;
    
    const newVoterData: VoterEligibilityData = {
      email: normalized,
      leafHash,
      index: newIndex
    };
    
    this.voterData.push(newVoterData);

    // Rebuild tree with new voter
    this.rebuildTree();

    return newVoterData;
  }

  /**
   * Add multiple voters to tree
   */
  addVoters(emails: string[]): VoterEligibilityData[] {
    const newVoters: VoterEligibilityData[] = [];
    
    emails.forEach(email => {
      const normalized = email.toLowerCase().trim();
      
      if (this.voterMap.has(normalized)) {
        throw new Error(`Voter ${email} already exists in tree`);
      }

      const leafHash = VoterMerkleTree.hashEmail(normalized);
      const newIndex = this.voterData.length;
      
      const voterData: VoterEligibilityData = {
        email: normalized,
        leafHash,
        index: newIndex
      };
      
      this.voterData.push(voterData);
      newVoters.push(voterData);
    });

    // Rebuild tree once with all new voters
    this.rebuildTree();

    return newVoters;
  }

  /**
   * Rebuild tree with current voter data
   */
  private rebuildTree(): void {
    // Calculate new depth
    const depth = VoterMerkleTree.calculateDepth(this.voterData.length);

    // Create elements array
    const elements = this.voterData.map(v => v.leafHash);

    // Rebuild tree
    this.tree = new MerkleTree(depth, elements);

    // Rebuild voter map
    this.voterMap.clear();
    this.voterData.forEach((voter, index) => {
      voter.index = index; // Update index
      this.voterMap.set(voter.email, index);
    });
  }

  /**
   * Update voter email
   * Rebuilds the tree with updated email
   */
  updateVoter(oldEmail: string, newEmail: string): VoterEligibilityData {
    const normalizedOld = oldEmail.toLowerCase().trim();
    const normalizedNew = newEmail.toLowerCase().trim();
    
    const index = this.voterMap.get(normalizedOld);
    if (index === undefined) {
      throw new Error(`Voter ${oldEmail} not found in tree`);
    }

    // Update voter data
    const newLeafHash = VoterMerkleTree.hashEmail(normalizedNew);
    this.voterData[index] = {
      email: normalizedNew,
      leafHash: newLeafHash,
      index
    };

    // Rebuild tree
    this.rebuildTree();

    return this.voterData[index];
  }

  /**
   * Get Merkle root
   */
  getRoot(): string {
    return this.tree.root.toString();
  }

  /**
   * Generate proof for voter
   */
  generateProof(email: string): {
    pathElements: string[];
    pathIndices: number[];
    root: string;
    leaf: string;
  } | null {
    const normalized = email.toLowerCase().trim();
    const index = this.voterMap.get(normalized);

    if (index === undefined) {
      return null;
    }

    // Use path method instead of proof
    const path = this.tree.path(index);

    return {
      pathElements: path.pathElements.map(e => e.toString()),
      pathIndices: path.pathIndices,
      root: this.tree.root.toString(),
      leaf: this.tree.elements[index].toString()
    };
  }

  /**
   * Check if voter is eligible
   */
  isEligible(email: string): boolean {
    const normalized = email.toLowerCase().trim();
    return this.voterMap.has(normalized);
  }

  /**
   * Get total number of voters
   */
  get size(): number {
    return this.voterMap.size;
  }

  /**
   * Get tree depth
   */
  get depth(): number {
    return this.tree.levels;
  }

  /**
   * Export tree data
   */
  export(): VoterMerkleTreeData {
    return {
      depth: this.depth,
      root: this.getRoot(),
      elements: this.tree.elements,
      voterMap: this.voterMap
    };
  }

  /**
   * Import tree from data
   */
  static import(data: VoterMerkleTreeData): VoterMerkleTree {
    const tree = Object.create(VoterMerkleTree.prototype);
    
    tree.tree = new MerkleTree(data.depth, data.elements);
    tree.voterMap = data.voterMap;
    tree.voterData = Array.from(data.voterMap.entries()).map(([email, index]) => ({
      email,
      leafHash: data.elements[index].toString(),
      index
    }));
    
    return tree;
  }
}
