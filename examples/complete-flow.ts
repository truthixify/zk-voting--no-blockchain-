/**
 * Complete election flow example
 * Shows how to use the Veravote crypto library from setup to results
 */

import { Election, Vote } from '../src';

async function runElection() {
  console.log('=== VERAVOTE ELECTION DEMO ===\n');

  // WEEK 1-2: Setup
  console.log('1. Creating election...');
  const election = new Election({
    id: 'demo-election-2024',
    title: 'Board Election 2024',
    description: 'Annual board member election',
    candidates: [
      { id: 'alice', name: 'Alice Johnson', description: 'Current VP' },
      { id: 'bob', name: 'Bob Smith', description: 'Finance Director' },
      { id: 'carol', name: 'Carol Williams', description: 'Tech Lead' }
    ],
    trusteePassword: 'super-secure-trustee-password'
  });

  console.log('2. Adding eligible voters...');
  const voters = election.addVoters([
    'alice@voters.com',
    'bob@voters.com',
    'carol@voters.com',
    'dave@voters.com',
    'eve@voters.com'
  ]);

  console.log(`   Added ${voters.length} voters`);
  console.log(`   Group root: ${election.group.root.toString().slice(0, 20)}...`);

  console.log('\n3. Generating invitation tokens...');
  voters.forEach(voter => {
    const token = voter.generateToken(72);
    console.log(`   ${voter.email}: ${voter.getInviteLink().slice(0, 50)}...`);
  });

  console.log('\n4. Starting election...');
  election.start();
  console.log(`   Status: ${election.status}`);

  // WEEK 3: Voting
  console.log('\n5. Voters casting votes...');
  
  // Voter 1 votes for Alice
  const voter1 = voters[0];
  const vote1 = await Vote.cast(
    voter1.identity,
    election.group,
    'alice',
    1n,
    election.keyPair.publicKey,
    election.id
  );
  await election.submitVote(vote1);
  console.log(`   ✓ ${voter1.email} voted (Receipt: ${vote1.receipt.receiptId.slice(0, 16)}...)`);

  // Voter 2 votes for Alice
  const voter2 = voters[1];
  const vote2 = await Vote.cast(
    voter2.identity,
    election.group,
    'alice',
    1n,
    election.keyPair.publicKey,
    election.id
  );
  await election.submitVote(vote2);
  console.log(`   ✓ ${voter2.email} voted (Receipt: ${vote2.receipt.receiptId.slice(0, 16)}...)`);

  // Voter 3 votes for Bob
  const voter3 = voters[2];
  const vote3 = await Vote.cast(
    voter3.identity,
    election.group,
    'bob',
    1n,
    election.keyPair.publicKey,
    election.id
  );
  await election.submitVote(vote3);
  console.log(`   ✓ ${voter3.email} voted (Receipt: ${vote3.receipt.receiptId.slice(0, 16)}...)`);

  // Voter 4 votes for Carol
  const voter4 = voters[3];
  const vote4 = await Vote.cast(
    voter4.identity,
    election.group,
    'carol',
    1n,
    election.keyPair.publicKey,
    election.id
  );
  await election.submitVote(vote4);
  console.log(`   ✓ ${voter4.email} voted (Receipt: ${vote4.receipt.receiptId.slice(0, 16)}...)`);

  // Test double voting prevention
  console.log('\n6. Testing double voting prevention...');
  const duplicateVote = await Vote.cast(
    voter1.identity,
    election.group,
    'bob',
    1n,
    election.keyPair.publicKey,
    election.id
  );
  const result = await election.submitVote(duplicateVote);
  console.log(`   ${result.success ? '✗ FAILED' : '✓ BLOCKED'}: ${result.error}`);

  // WEEK 4: Stats
  console.log('\n7. Election statistics:');
  const stats = election.getStats();
  console.log(`   Total voters: ${stats.totalVoters}`);
  console.log(`   Total votes: ${stats.totalVotes}`);
  console.log(`   Turnout: ${stats.turnout.toFixed(1)}%`);

  // WEEK 5: Tally
  console.log('\n8. Ending election...');
  election.end();
  console.log(`   Status: ${election.status}`);

  console.log('\n9. Tallying results...');
  const results = election.tallyResults('super-secure-trustee-password');

  console.log('\n=== FINAL RESULTS ===');
  election.candidates.forEach(candidate => {
    const votes = results.get(candidate.id) || 0;
    console.log(`   ${candidate.name}: ${votes} votes`);
  });

  console.log('\n=== ELECTION COMPLETE ===');
}

// Run the demo
runElection().catch(console.error);
