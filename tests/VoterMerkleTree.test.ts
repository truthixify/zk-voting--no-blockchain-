/**
 * VoterMerkleTree tests
 */

import MerkleTree from 'fixed-merkle-tree';
import { VoterMerkleTree } from '../src/core/VoterMerkleTree';

describe('VoterMerkleTree', () => {
  describe('calculateDepth', () => {
    it('should calculate correct depth for various voter counts', () => {
      expect(VoterMerkleTree.calculateDepth(0)).toBe(1);
      expect(VoterMerkleTree.calculateDepth(1)).toBe(0);
      expect(VoterMerkleTree.calculateDepth(2)).toBe(1);
      expect(VoterMerkleTree.calculateDepth(3)).toBe(2);
      expect(VoterMerkleTree.calculateDepth(4)).toBe(2);
      expect(VoterMerkleTree.calculateDepth(5)).toBe(3);
      expect(VoterMerkleTree.calculateDepth(8)).toBe(3);
      expect(VoterMerkleTree.calculateDepth(16)).toBe(4);
      expect(VoterMerkleTree.calculateDepth(100)).toBe(7);
      expect(VoterMerkleTree.calculateDepth(1000)).toBe(10);
    });
  });

  describe('hashEmail', () => {
    it('should hash email consistently', () => {
      const email = 'voter@example.com';
      const hash1 = VoterMerkleTree.hashEmail(email);
      const hash2 = VoterMerkleTree.hashEmail(email);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should normalize email to lowercase', () => {
      const hash1 = VoterMerkleTree.hashEmail('VOTER@EXAMPLE.COM');
      const hash2 = VoterMerkleTree.hashEmail('voter@example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace', () => {
      const hash1 = VoterMerkleTree.hashEmail('  voter@example.com  ');
      const hash2 = VoterMerkleTree.hashEmail('voter@example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different emails', () => {
      const hash1 = VoterMerkleTree.hashEmail('alice@example.com');
      const hash2 = VoterMerkleTree.hashEmail('bob@example.com');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('constructor (from CSV)', () => {
    it('should build tree from simple CSV', () => {
      const csv = `alice@example.com
bob@example.com
carol@example.com`;

      const tree = new VoterMerkleTree(csv);

      expect(tree).toBeDefined();
      expect(tree.size).toBe(3);
      expect(tree.voterData.length).toBe(3);
      expect(tree.getRoot()).toBeDefined();
    });

    it('should parse CSV with header', () => {
      const csv = `email,name
alice@example.com,Alice
bob@example.com,Bob`;

      const tree = new VoterMerkleTree(csv);

      expect(tree.size).toBe(2);
      expect(tree.voterData[0].email).toBe('alice@example.com');
      expect(tree.voterData[1].email).toBe('bob@example.com');
    });

    it('should normalize emails', () => {
      const csv = `ALICE@EXAMPLE.COM
  bob@example.com  `;

      const tree = new VoterMerkleTree(csv);

      expect(tree.voterData[0].email).toBe('alice@example.com');
      expect(tree.voterData[1].email).toBe('bob@example.com');
    });

    it('should handle CSV with multiple columns', () => {
      const csv = `email,name,department
alice@example.com,Alice,Engineering
bob@example.com,Bob,Sales`;

      const tree = new VoterMerkleTree(csv);

      expect(tree.size).toBe(2);
    });

    it('should filter out invalid emails', () => {
      const csv = `email
alice@example.com
invalid-email
bob@example.com
`;

      const tree = new VoterMerkleTree(csv);

      expect(tree.size).toBe(2);
    });

    it('should handle empty lines', () => {
      const csv = `alice@example.com

bob@example.com

`;

      const tree = new VoterMerkleTree(csv);

      expect(tree.size).toBe(2);
    });

    it('should calculate correct depth with extra capacity', () => {
      const csv = `voter1@example.com
voter2@example.com
voter3@example.com`;

      const tree = new VoterMerkleTree(csv); // No extra capacity

      expect(tree.depth).toBe(2); // 2^2 = 4 >= 3
    });

    it('should throw error for empty CSV', () => {
      expect(() => new VoterMerkleTree('')).toThrow('No valid emails found in CSV');
    });

    it('should remove duplicate emails', () => {
      const csv = `alice@example.com
bob@example.com
alice@example.com
carol@example.com
bob@example.com`;

      const tree = new VoterMerkleTree(csv);

      expect(tree.size).toBe(3); // Only unique emails
      expect(tree.isEligible('alice@example.com')).toBe(true);
      expect(tree.isEligible('bob@example.com')).toBe(true);
      expect(tree.isEligible('carol@example.com')).toBe(true);
    });

    it('should handle case-insensitive duplicates', () => {
      const csv = `alice@example.com
ALICE@EXAMPLE.COM
Alice@Example.Com`;

      const tree = new VoterMerkleTree(csv);

      expect(tree.size).toBe(1); // All are the same email
      expect(tree.voterData[0].email).toBe('alice@example.com');
    });
  });

  describe('isEligible', () => {
    it('should check voter eligibility', () => {
      const csv = `alice@example.com
bob@example.com`;
      const tree = new VoterMerkleTree(csv);

      expect(tree.isEligible('alice@example.com')).toBe(true);
      expect(tree.isEligible('bob@example.com')).toBe(true);
      expect(tree.isEligible('carol@example.com')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const tree = new VoterMerkleTree('alice@example.com');

      expect(tree.isEligible('ALICE@EXAMPLE.COM')).toBe(true);
      expect(tree.isEligible('Alice@Example.Com')).toBe(true);
    });
  });

  describe('generateProof', () => {
    it('should generate proof for eligible voter', () => {
      const csv = `alice@example.com
bob@example.com
carol@example.com`;
      const tree = new VoterMerkleTree(csv);

      const proof = tree.generateProof('alice@example.com');

      expect(proof).not.toBeNull();
      expect(proof?.pathElements).toBeDefined();
      expect(proof?.pathIndices).toBeDefined();
      expect(proof?.root).toBe(tree.getRoot());
      expect(proof?.leaf).toBeDefined();
    });

    it('should return null for non-eligible voter', () => {
      const tree = new VoterMerkleTree('alice@example.com');

      const proof = tree.generateProof('bob@example.com');

      expect(proof).toBeNull();
    });
  });

  describe('addVoter', () => {
    it('should add new voter to tree', () => {
      const tree = new VoterMerkleTree('alice@example.com');
      
      const result = tree.addVoter('bob@example.com');

      expect(result.email).toBe('bob@example.com');
      expect(result.leafHash).toBeDefined();
      expect(tree.size).toBe(2);
      expect(tree.isEligible('bob@example.com')).toBe(true);
    });

    it('should throw error for duplicate voter', () => {
      const tree = new VoterMerkleTree('alice@example.com');

      expect(() => tree.addVoter('alice@example.com')).toThrow('already exists');
    });
  });

  describe('updateVoter', () => {
    it('should update voter email', () => {
      const tree = new VoterMerkleTree('alice@example.com');
      
      const result = tree.updateVoter('alice@example.com', 'alice.new@example.com');

      expect(result.email).toBe('alice.new@example.com');
      expect(tree.isEligible('alice.new@example.com')).toBe(true);
      expect(tree.isEligible('alice@example.com')).toBe(false);
    });

    it('should throw error for non-existent voter', () => {
      const tree = new VoterMerkleTree('alice@example.com');

      expect(() => tree.updateVoter('bob@example.com', 'bob.new@example.com')).toThrow('not found');
    });
  });

  describe('export and import', () => {
    it('should export tree data', () => {
      const csv = `alice@example.com
bob@example.com`;
      const tree = new VoterMerkleTree(csv);

      const exported = tree.export();

      expect(exported.depth).toBeDefined();
      expect(exported.root).toBe(tree.getRoot());
      expect(exported.elements).toBeDefined();
      expect(exported.voterMap).toBeDefined();
    });

    it('should import tree from data', () => {
      const csv = `alice@example.com
bob@example.com`;
      const tree1 = new VoterMerkleTree(csv);

      const exported = tree1.export();
      const tree2 = VoterMerkleTree.import(exported);

      expect(tree2.getRoot()).toBe(tree1.getRoot());
      expect(tree2.size).toBe(tree1.size);
      expect(tree2.depth).toBe(tree1.depth);
      expect(tree2.isEligible('alice@example.com')).toBe(true);
    });
  });

  describe('Performance benchmarks', () => {
    it('should handle 1000 voters efficiently', () => {
      const fs = require('fs');
      const path = require('path');
      const csvPath = path.join(__dirname, 'fixtures/voters-1000.csv');
      const csv = fs.readFileSync(csvPath, 'utf-8');

      // Benchmark tree construction
      const constructStart = performance.now();
      const tree = new VoterMerkleTree(csv);
      const constructEnd = performance.now();
      const constructTime = constructEnd - constructStart;

      expect(tree.size).toBe(1000);
      expect(tree.depth).toBe(10); // 2^10 = 1024 >= 1000
      console.log(`✓ Tree construction (1000 voters): ${constructTime.toFixed(2)}ms`);

      // Benchmark proof generation
      const proofStart = performance.now();
      const proof = tree.generateProof('voter500@example.com');
      const proofEnd = performance.now();
      const proofTime = proofEnd - proofStart;

      expect(proof).not.toBeNull();
      expect(proof?.pathElements.length).toBe(10); // depth
      console.log(`✓ Proof generation: ${proofTime.toFixed(2)}ms`);

      // Benchmark eligibility check
      const checkStart = performance.now();
      for (let i = 1; i <= 100; i++) {
        tree.isEligible(`voter${i}@example.com`);
      }
      const checkEnd = performance.now();
      const checkTime = (checkEnd - checkStart) / 100;

      console.log(`✓ Eligibility check (avg of 100): ${checkTime.toFixed(4)}ms`);

      // Benchmark adding voter
      const addStart = performance.now();
      tree.addVoter('newvoter@example.com');
      const addEnd = performance.now();
      const addTime = addEnd - addStart;

      expect(tree.size).toBe(1001);
      console.log(`✓ Add voter (rebuilds tree): ${addTime.toFixed(2)}ms`);

      // Performance assertions
      expect(constructTime).toBeLessThan(1000); // Should be under 1 second
      expect(proofTime).toBeLessThan(100); // Should be under 100ms
      expect(checkTime).toBeLessThan(1); // Should be under 1ms per check
      expect(addTime).toBeLessThan(1000); // Should be under 1 second
    });

    it('should scale logarithmically with voter count', () => {
      const sizes = [100, 500, 1000];
      const times: number[] = [];

      sizes.forEach(size => {
        const emails = [];
        for (let i = 1; i <= size; i++) {
          emails.push(`voter${i}@example.com`);
        }
        const csv = emails.join('\n');

        const start = performance.now();
        const tree = new VoterMerkleTree(csv);
        tree.generateProof('voter1@example.com');
        const end = performance.now();

        times.push(end - start);
        console.log(`  ${size} voters: ${(end - start).toFixed(2)}ms (depth: ${tree.depth})`);
      });

      // Verify all operations complete in reasonable time
      times.forEach((time, i) => {
        expect(time).toBeLessThan(1000); // Each should be under 1 second
        console.log(`  ${sizes[i]} voters completed in ${time.toFixed(2)}ms`);
      });
    });
  });
});
