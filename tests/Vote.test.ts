/**
 * Vote class tests - Updated for Vote Vector approach
 */

import { Vote } from '../src/core/Vote';
import { Voter } from '../src/core/Voter';
import { ElGamalKeyPair } from '../src/core/ElGamal';
import { Group } from '@semaphore-protocol/group';

describe('Vote', () => {
  const electionId = 'test-election';
  const candidateId = 'candidate-alice';
  const candidateOrder = ['candidate-alice', 'candidate-bob', 'candidate-carol'];
  let keyPair: ElGamalKeyPair;
  let group: Group;
  let voter: Voter;

  beforeEach(() => {
    keyPair = ElGamalKeyPair.fromPassword('test-password');
    group = new Group();
    
    // Create voter and add to group
    voter = new Voter('voter@example.com', electionId);
    group.addMember(BigInt(voter.commitment));
  });

  describe('cast', () => {
    it('should cast a vote with vote vector', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      expect(vote).toBeDefined();
      expect(vote.voteVector).toBeDefined();
      expect(vote.voteVector.encryptedVotes).toHaveLength(3);
      expect(vote.voteVector.candidateOrder).toEqual(candidateOrder);
      expect(vote.proof).toBeDefined();
      expect(vote.nullifier).toBeDefined();
      expect(vote.receipt).toBeDefined();
      expect(vote.timestamp).toBeDefined();
    });

    it('should encrypt vote vector correctly', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId, // 'candidate-alice'
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      // Should have 1 for selected candidate, 0 for others
      const decrypted0 = keyPair.decrypt(vote.getEncryptedVoteAt(0)); // Alice
      const decrypted1 = keyPair.decrypt(vote.getEncryptedVoteAt(1)); // Bob
      const decrypted2 = keyPair.decrypt(vote.getEncryptedVoteAt(2)); // Carol
      
      expect(decrypted0).toBe(1n); // Alice selected
      expect(decrypted1).toBe(0n); // Bob not selected
      expect(decrypted2).toBe(0n); // Carol not selected
    });

    it('should generate valid Semaphore proof', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      expect(vote.proof.merkleTreeRoot).toBeDefined();
      expect(vote.proof.nullifier).toBeDefined();
      expect(vote.proof.message).toBeDefined();
      expect(vote.proof.scope).toBeDefined();
      expect(vote.proof.points).toBeDefined();
    });

    it('should generate unique nullifiers for different voters', async () => {
      const voter2 = new Voter('voter2@example.com', electionId);
      group.addMember(BigInt(voter2.commitment));

      const vote1 = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      const vote2 = await Vote.cast(
        voter2.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      expect(vote1.nullifier).not.toBe(vote2.nullifier);
    });

    it('should generate same nullifier for same voter in same election', async () => {
      const vote1 = await Vote.cast(
        voter.identity,
        group,
        'candidate-alice',
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      const vote2 = await Vote.cast(
        voter.identity,
        group,
        'candidate-bob',
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      // Same nullifier because same voter + same election (scope)
      expect(vote1.nullifier).toBe(vote2.nullifier);
    });

    it('should generate receipt with correct data', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      expect(vote.receipt.receiptId).toBeDefined();
      expect(vote.receipt.electionId).toBe(electionId);
      expect(vote.receipt.voteVectorHash).toBeDefined();
      expect(vote.receipt.nullifier).toBe(vote.nullifier);
      expect(vote.receipt.timestamp).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should verify valid vote', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      const isValid = await vote.verify();

      expect(isValid).toBe(true);
    });

    it('should verify vote from different voter', async () => {
      const voter2 = new Voter('voter2@example.com', electionId);
      group.addMember(BigInt(voter2.commitment));

      const vote = await Vote.cast(
        voter2.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      const isValid = await vote.verify();

      expect(isValid).toBe(true);
    });
  });

  describe('vote vector methods', () => {
    it('should return candidate order', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      expect(vote.getCandidateOrder()).toEqual(candidateOrder);
    });

    it('should get encrypted vote at position', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      const encryptedVote = vote.getEncryptedVoteAt(0);
      expect(encryptedVote).toBeDefined();
      expect(encryptedVote.c1).toBeDefined();
      expect(encryptedVote.c2).toBeDefined();
    });

    it('should throw error for invalid position', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      expect(() => vote.getEncryptedVoteAt(-1)).toThrow('Invalid position: -1');
      expect(() => vote.getEncryptedVoteAt(10)).toThrow('Invalid position: 10');
    });
  });

  describe('export', () => {
    it('should export vote data', async () => {
      const vote = await Vote.cast(
        voter.identity,
        group,
        candidateId,
        candidateOrder,
        keyPair.publicKey,
        electionId
      );

      const exported = vote.export();

      expect(exported.voteVector).toBeDefined();
      expect(exported.voteVector.encryptedVotes).toHaveLength(3);
      expect(exported.voteVector.candidateOrder).toEqual(candidateOrder);
      expect(exported.proof).toBeDefined();
      expect(exported.nullifier).toBe(vote.nullifier);
      expect(exported.receipt).toBeDefined();
      expect(exported.timestamp).toBeDefined();
    });
  });

  describe('integration: multiple votes', () => {
    it('should handle multiple voters voting', async () => {
      const voters = [
        new Voter('alice@example.com', electionId),
        new Voter('bob@example.com', electionId),
        new Voter('carol@example.com', electionId)
      ];

      // Add all voters to group
      voters.forEach(v => group.addMember(BigInt(v.commitment)));

      // Cast votes
      const votes = await Promise.all(
        voters.map(v => 
          Vote.cast(v.identity, group, candidateId, candidateOrder, keyPair.publicKey, electionId)
        )
      );

      // All votes should be valid
      for (const vote of votes) {
        const isValid = await vote.verify();
        expect(isValid).toBe(true);
      }

      // All nullifiers should be unique
      const nullifiers = votes.map(v => v.nullifier);
      const uniqueNullifiers = new Set(nullifiers);
      expect(uniqueNullifiers.size).toBe(votes.length);
    });
  });
});