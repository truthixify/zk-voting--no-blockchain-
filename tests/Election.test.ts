/**
 * Election class tests - Updated for Vote Vector approach
 */

import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { Election } from '../src/core/Election';
import { Vote } from '../src/core/Vote';

describe('Election', () => {
  const electionConfig = {
    id: 'test-election',
    title: 'Test Election 2024',
    candidates: [
      { id: 'alice', name: 'Alice Johnson' },
      { id: 'bob', name: 'Bob Smith' }
    ],
    trusteePassword: 'secure-password'
  };

  describe('constructor', () => {
    it('should create election with config', () => {
      const election = new Election(electionConfig);

      expect(election.id).toBe(electionConfig.id);
      expect(election.title).toBe(electionConfig.title);
      expect(election.candidates).toEqual(electionConfig.candidates);
      expect(election.keyPair).toBeDefined();
      expect(election.group).toBeDefined();
      expect(election.status).toBe('draft');
    });
  });

  describe('submitVote', () => {
    it('should accept valid vote', async () => {
      const election = new Election(electionConfig);
      const voters = election.addVoters(['voter@example.com']);
      election.start();

      const candidateOrder = election.candidates.map(c => c.id);
      const vote = await Vote.cast(
        voters[0].identity,
        election.group,
        'alice',
        candidateOrder,
        election.keyPair.publicKey,
        election.id
      );

      const result = await election.submitVote(vote);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('tallyResults', () => {
    it('should tally votes correctly using vote vectors', async () => {
      const election = new Election(electionConfig);
      const voters = election.addVoters([
        'voter1@example.com',
        'voter2@example.com',
        'voter3@example.com'
      ]);
      election.start();

      const candidateOrder = election.candidates.map(c => c.id);

      // 2 votes for Alice, 1 for Bob
      await election.submitVote(
        await Vote.cast(voters[0].identity, election.group, 'alice', candidateOrder, election.keyPair.publicKey, election.id)
      );
      await election.submitVote(
        await Vote.cast(voters[1].identity, election.group, 'alice', candidateOrder, election.keyPair.publicKey, election.id)
      );
      await election.submitVote(
        await Vote.cast(voters[2].identity, election.group, 'bob', candidateOrder, election.keyPair.publicKey, election.id)
      );

      election.end();
      const results = election.tallyResults('secure-password');

      expect(results.get('alice')).toBe(2);
      expect(results.get('bob')).toBe(1);
    });
  });
});