/**
 * Integration tests - Full election flow
 */

import { Election } from '../src/core/Election';
import { Vote } from '../src/core/Vote';

describe('Integration: Complete Election Flow', () => {
  it('should run complete election from setup to results', async () => {
    // Week 1-2: Setup
    const election = new Election({
      id: 'integration-test-election',
      title: 'Board Election 2024',
      candidates: [
        { id: 'alice', name: 'Alice Johnson' },
        { id: 'bob', name: 'Bob Smith' },
        { id: 'carol', name: 'Carol Williams' }
      ],
      trusteePassword: 'trustee-secure-password'
    });

    // Add voters
    const voters = election.addVoters([
      'alice@voters.com',
      'bob@voters.com',
      'carol@voters.com',
      'dave@voters.com',
      'eve@voters.com'
    ]);

    expect(voters.length).toBe(5);
    expect(election.group.members.length).toBe(5);

    // Generate tokens
    voters.forEach(voter => {
      const token = voter.generateToken(72);
      expect(token.token).toBeDefined();
      expect(voter.getInviteLink()).toContain('veravote.com');
    });

    // Start election
    election.start();
    expect(election.status).toBe('active');

    // Week 3: Voting
    // Voter 1 votes for Alice
    const candidateOrder = election.candidates.map(c => c.id);
    const vote1 = await Vote.cast(
      voters[0].identity,
      election.group,
      'alice',
      candidateOrder,
      election.keyPair.publicKey,
      election.id
    );
    const result1 = await election.submitVote(vote1);
    expect(result1.success).toBe(true);

    // Voter 2 votes for Alice
    const vote2 = await Vote.cast(
      voters[1].identity,
      election.group,
      'alice',
      candidateOrder,
      election.keyPair.publicKey,
      election.id
    );
    const result2 = await election.submitVote(vote2);
    expect(result2.success).toBe(true);

    // Voter 3 votes for Bob
    const vote3 = await Vote.cast(
      voters[2].identity,
      election.group,
      'bob',
      candidateOrder,
      election.keyPair.publicKey,
      election.id
    );
    const result3 = await election.submitVote(vote3);
    expect(result3.success).toBe(true);

    // Voter 4 votes for Carol
    const vote4 = await Vote.cast(
      voters[3].identity,
      election.group,
      'carol',
      candidateOrder,
      election.keyPair.publicKey,
      election.id
    );
    const result4 = await election.submitVote(vote4);
    expect(result4.success).toBe(true);

    // Voter 5 doesn't vote (abstains)

    // Week 4: Check stats
    const stats = election.getStats();
    expect(stats.totalVoters).toBe(5);
    expect(stats.totalVotes).toBe(4);
    expect(stats.turnout).toBe(80);

    // Week 5: End and tally
    election.end();
    expect(election.status).toBe('ended');

    const results = election.tallyResults('trustee-secure-password');
    expect(results.get('alice')).toBe(2);
    expect(results.get('bob')).toBe(1);
    expect(results.get('carol')).toBe(1);
  });

  it('should prevent double voting', async () => {
    const election = new Election({
      id: 'double-vote-test',
      title: 'Test Election',
      candidates: [{ id: 'alice', name: 'Alice' }],
      trusteePassword: 'password'
    });

    const voters = election.addVoters(['voter@example.com']);
    election.start();

    // First vote
    const candidateOrder = election.candidates.map(c => c.id);
    const vote1 = await Vote.cast(
      voters[0].identity,
      election.group,
      'alice',
      candidateOrder,
      election.keyPair.publicKey,
      election.id
    );
    const result1 = await election.submitVote(vote1);
    expect(result1.success).toBe(true);

    // Attempt second vote
    const vote2 = await Vote.cast(
      voters[0].identity,
      election.group,
      'alice',
      candidateOrder,
      election.keyPair.publicKey,
      election.id
    );
    const result2 = await election.submitVote(vote2);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Voter has already voted');
  });

  it('should maintain vote privacy', async () => {
    const election = new Election({
      id: 'privacy-test',
      title: 'Privacy Test',
      candidates: [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' }
      ],
      trusteePassword: 'password'
    });

    const voters = election.addVoters([
      'voter1@example.com',
      'voter2@example.com'
    ]);
    election.start();

    // Both vote for Alice
    const candidateOrder = election.candidates.map(c => c.id);
    await election.submitVote(
      await Vote.cast(voters[0].identity, election.group, 'alice', candidateOrder, election.keyPair.publicKey, election.id)
    );
    await election.submitVote(
      await Vote.cast(voters[1].identity, election.group, 'alice', candidateOrder, election.keyPair.publicKey, election.id)
    );

    election.end();
    const results = election.tallyResults('password');

    // Can only see aggregated results, not individual votes
    expect(results.get('alice')).toBe(2);
    expect(results.get('bob')).toBe(0);
  });
});
