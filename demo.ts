/**
 * Veravote Demo - Complete Election Flow
 * Run with: npx ts-node demo.ts
 */

import { Election } from './src/core/Election';
import { Vote } from './src/core/Vote';

async function runElectionDemo() {
  console.log('🗳️  VERAVOTE ELECTION DEMO');
  console.log('=' .repeat(50));
  console.log();

  // WEEK 1-2: Setup
  console.log('📋 PHASE 1: Election Setup');
  console.log('-'.repeat(30));
  
  const election = new Election({
    id: 'demo-election-2024',
    title: 'Board Election 2024',
    description: 'Annual board member election',
    candidates: [
      { id: 'alice', name: 'Alice Johnson', description: 'Current VP of Engineering' },
      { id: 'bob', name: 'Bob Smith', description: 'Finance Director' },
      { id: 'carol', name: 'Carol Williams', description: 'Tech Lead' }
    ],
    trusteePassword: 'super-secure-trustee-password-2024'
  });

  console.log(`✅ Created election: "${election.title}"`);
  console.log(`   Election ID: ${election.id}`);
  console.log(`   Candidates: ${election.candidates.length}`);
  console.log(`   Status: ${election.status}`);
  console.log();

  // Add eligible voters
  console.log('👥 Adding eligible voters...');
  const voterEmails = [
    'alice.voter@company.com',
    'bob.voter@company.com', 
    'carol.voter@company.com',
    'dave.voter@company.com',
    'eve.voter@company.com',
    'frank.voter@company.com'
  ];

  const voters = election.addVoters(voterEmails);
  console.log(`✅ Added ${voters.length} eligible voters`);
  console.log(`   Group size: ${election.group.members.length}`);
  console.log(`   Group root: ${election.group.root.toString().slice(0, 20)}...`);
  console.log();

  // Generate invitation tokens
  console.log('🎫 Generating voter invitation tokens...');
  voters.forEach((voter, index) => {
    const token = voter.generateToken(72); // 72 hour expiry
    const link = voter.getInviteLink('https://veravote.com');
    console.log(`   ${index + 1}. ${voter.email}`);
    console.log(`      Token: ${token.token.slice(0, 30)}...`);
    console.log(`      Link: ${link.slice(0, 60)}...`);
    console.log(`      Expires: ${token.expiresAt.toLocaleString()}`);
  });
  console.log();

  // Start election
  console.log('🚀 Starting election...');
  election.start();
  console.log(`✅ Election status: ${election.status}`);
  console.log(`   Started at: ${election.startedAt?.toLocaleString()}`);
  console.log();

  // WEEK 3: Voting Phase
  console.log('📊 PHASE 2: Voting Phase');
  console.log('-'.repeat(30));

  // Simulate voters casting votes
  const votingResults = [];

  // Get candidate order for vote vectors
  const candidateOrder = election.candidates.map(c => c.id);
  console.log(`📋 Candidate order: ${candidateOrder.join(', ')}`);
  console.log();

  // Voter 1: Alice votes for Alice Johnson
  console.log('🗳️  Voter 1 casting vote...');
  const vote1 = await Vote.cast(
    voters[0].identity,
    election.group,
    'alice', // Selected candidate
    candidateOrder, // All candidates in order
    election.keyPair.publicKey,
    election.id
  );
  const result1 = await election.submitVote(vote1);
  console.log(`   ${voters[0].email} → Alice Johnson`);
  console.log(`   ✅ Vote accepted: ${result1.success}`);
  console.log(`   Receipt: ${vote1.receipt.receiptId.slice(0, 16)}...`);
  console.log(`   Nullifier: ${vote1.nullifier.slice(0, 16)}...`);
  votingResults.push({ voter: voters[0].email, candidate: 'Alice Johnson', success: result1.success });
  console.log();

  // Voter 2: Bob votes for Alice Johnson  
  console.log('🗳️  Voter 2 casting vote...');
  const vote2 = await Vote.cast(
    voters[1].identity,
    election.group,
    'alice',
    candidateOrder,
    election.keyPair.publicKey,
    election.id
  );
  const result2 = await election.submitVote(vote2);
  console.log(`   ${voters[1].email} → Alice Johnson`);
  console.log(`   ✅ Vote accepted: ${result2.success}`);
  console.log(`   Receipt: ${vote2.receipt.receiptId.slice(0, 16)}...`);
  votingResults.push({ voter: voters[1].email, candidate: 'Alice Johnson', success: result2.success });
  console.log();

  // Voter 3: Carol votes for Bob Smith
  console.log('🗳️  Voter 3 casting vote...');
  const vote3 = await Vote.cast(
    voters[2].identity,
    election.group,
    'bob',
    candidateOrder,
    election.keyPair.publicKey,
    election.id
  );
  const result3 = await election.submitVote(vote3);
  console.log(`   ${voters[2].email} → Bob Smith`);
  console.log(`   ✅ Vote accepted: ${result3.success}`);
  console.log(`   Receipt: ${vote3.receipt.receiptId.slice(0, 16)}...`);
  votingResults.push({ voter: voters[2].email, candidate: 'Bob Smith', success: result3.success });
  console.log();

  // Voter 4: Dave votes for Carol Williams
  console.log('🗳️  Voter 4 casting vote...');
  const vote4 = await Vote.cast(
    voters[3].identity,
    election.group,
    'carol',
    candidateOrder,
    election.keyPair.publicKey,
    election.id
  );
  const result4 = await election.submitVote(vote4);
  console.log(`   ${voters[3].email} → Carol Williams`);
  console.log(`   ✅ Vote accepted: ${result4.success}`);
  console.log(`   Receipt: ${vote4.receipt.receiptId.slice(0, 16)}...`);
  votingResults.push({ voter: voters[3].email, candidate: 'Carol Williams', success: result4.success });
  console.log();

  // Voter 5: Eve votes for Alice Johnson
  console.log('🗳️  Voter 5 casting vote...');
  const vote5 = await Vote.cast(
    voters[4].identity,
    election.group,
    'alice',
    candidateOrder,
    election.keyPair.publicKey,
    election.id
  );
  const result5 = await election.submitVote(vote5);
  console.log(`   ${voters[4].email} → Alice Johnson`);
  console.log(`   ✅ Vote accepted: ${result5.success}`);
  console.log(`   Receipt: ${vote5.receipt.receiptId.slice(0, 16)}...`);
  votingResults.push({ voter: voters[4].email, candidate: 'Alice Johnson', success: result5.success });
  console.log();

  // Voter 6: Frank doesn't vote (abstains)
  console.log('🗳️  Voter 6 abstains from voting');
  console.log(`   ${voters[5].email} → (no vote cast)`);
  votingResults.push({ voter: voters[5].email, candidate: 'Abstained', success: false });
  console.log();

  // Test double voting prevention
  console.log('🚫 Testing double voting prevention...');
  const duplicateVote = await Vote.cast(
    voters[0].identity,
    election.group,
    'bob',
    candidateOrder,
    election.keyPair.publicKey,
    election.id
  );
  const duplicateResult = await election.submitVote(duplicateVote);
  console.log(`   ${voters[0].email} attempts second vote → Bob Smith`);
  console.log(`   ❌ Vote rejected: ${!duplicateResult.success} (${duplicateResult.error})`);
  console.log();

  // WEEK 4: Statistics
  console.log('📈 PHASE 3: Election Statistics');
  console.log('-'.repeat(30));
  
  const stats = election.getStats();
  console.log(`📊 Election Statistics:`);
  console.log(`   Total eligible voters: ${stats.totalVoters}`);
  console.log(`   Total votes cast: ${stats.totalVotes}`);
  console.log(`   Voter turnout: ${stats.turnout.toFixed(1)}%`);
  console.log();

  console.log(`📋 Voting Summary:`);
  votingResults.forEach((result, index) => {
    const status = result.success ? '✅' : (result.candidate === 'Abstained' ? '⏭️' : '❌');
    console.log(`   ${index + 1}. ${result.voter} → ${result.candidate} ${status}`);
  });
  console.log();

  // WEEK 5: End Election and Tally
  console.log('🏁 PHASE 4: Election End & Tally');
  console.log('-'.repeat(30));

  console.log('⏹️  Ending election...');
  election.end();
  console.log(`✅ Election status: ${election.status}`);
  console.log(`   Ended at: ${election.endedAt?.toLocaleString()}`);
  console.log();

  console.log('🔐 Trustee decrypting votes...');
  console.log('   (Homomorphic tallying in progress...)');
  
  const results = election.tallyResults('super-secure-trustee-password-2024');
  console.log('✅ Tally complete!');
  console.log();

  // Final Results
  console.log('🏆 FINAL RESULTS');
  console.log('=' .repeat(50));
  
  let totalVotes = 0;
  const sortedResults = Array.from(results.entries()).sort((a, b) => Number(b[1]) - Number(a[1]));
  
  sortedResults.forEach(([candidateId, voteCount]) => {
    const candidate = election.candidates.find(c => c.id === candidateId);
    const percentage = stats.totalVotes > 0 ? (Number(voteCount) / stats.totalVotes * 100).toFixed(1) : '0.0';
    const bar = '█'.repeat(Math.floor(Number(voteCount) * 10 / Math.max(1, stats.totalVotes)));
    
    console.log(`🏅 ${candidate?.name || candidateId}`);
    console.log(`   Votes: ${voteCount} (${percentage}%)`);
    console.log(`   ${bar}`);
    console.log();
    
    totalVotes += Number(voteCount);
  });

  console.log(`📊 Summary:`);
  console.log(`   Winner: ${election.candidates.find(c => c.id === sortedResults[0][0])?.name}`);
  console.log(`   Total votes: ${totalVotes}`);
  console.log(`   Eligible voters: ${stats.totalVoters}`);
  console.log(`   Turnout: ${stats.turnout.toFixed(1)}%`);
  console.log();

  console.log('✨ ELECTION COMPLETE!');
  console.log('🔒 All votes were encrypted and anonymous');
  console.log('🛡️  Zero-knowledge proofs verified voter eligibility');
  console.log('🚫 Double voting was prevented');
  console.log('📝 All voters received verifiable receipts');
  console.log();
  console.log('Thank you for using Veravote! 🗳️');
}

// Run the demo
if (require.main === module) {
  runElectionDemo().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}