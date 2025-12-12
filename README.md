# Veravote Crypto Library

Clean, object-oriented API for anonymous voting with Semaphore + ElGamal.

## Overview

Veravote combines **Semaphore** (anonymous identity) with **ElGamal encryption** (homomorphic tallying) to create a private, verifiable voting system.

### Why Semaphore + ElGamal?

**Semaphore Provides:**
- Anonymous identity - voters prove group membership without revealing who they are
- Double-vote prevention - nullifiers ensure one vote per voter per election
- Zero-knowledge proofs - cryptographic guarantee of eligibility
- Group management - Merkle tree of eligible voters

**ElGamal Provides:**
- Vote privacy - votes are encrypted, never revealed individually
- Homomorphic tallying - add encrypted votes without decryption
- Verifiable results - trustee decrypts only final aggregated totals

## Features

- **Semaphore Integration**: Anonymous voter identity and zero-knowledge group membership proofs
- **ElGamal Encryption**: Homomorphic encryption on Baby Jubjub curve for private vote tallying
- **One-Time Tokens**: Secure single-use voter access links
- **Vote Receipts**: Verifiable vote confirmation system
- **Double-Vote Prevention**: Nullifier-based protection against repeat voting

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Complete Election Flow

```typescript
import { Election, Vote } from '@veravote/crypto';

// WEEK 1-2: Admin creates election
const election = new Election({
  id: 'election-2024',
  title: 'Board Election 2024',
  candidates: [
    { id: 'alice', name: 'Alice Johnson' },
    { id: 'bob', name: 'Bob Smith' }
  ],
  trusteePassword: 'secure-trustee-password'
});

// Add eligible voters
const voters = election.addVoters([
  'voter1@example.com',
  'voter2@example.com',
  'voter3@example.com'
]);

// Generate invitation tokens
voters.forEach(voter => {
  const token = voter.generateToken(72); // 72 hour expiry
  const link = voter.getInviteLink();
  console.log(`Send to ${voter.email}: ${link}`);
  // Store token.hash in database
});

// Start election
election.start();

// WEEK 3: Voter casts vote (client-side)
const voter = election.getVoterByEmail('voter1@example.com');
if (voter) {
  const vote = await Vote.cast(
    voter.identity,
    election.group,
    'alice', // candidate ID
    1n, // vote value (1 = selected)
    election.keyPair.publicKey,
    election.id
  );

  // Submit to server
  const result = await election.submitVote(vote);
  if (result.success) {
    console.log('Vote recorded!');
    console.log('Receipt:', vote.receipt);
  }
}

// WEEK 5: End election and tally
election.end();
const results = election.tallyResults('secure-trustee-password');

console.log('Results:');
results.forEach((count, candidateId) => {
  console.log(`${candidateId}: ${count} votes`);
});
```

## API Reference

### Election Class

Main orchestrator for election lifecycle.

```typescript
// Create election
const election = new Election({
  id: string,
  title: string,
  candidates: Candidate[],
  trusteePassword: string
});

// Manage voters
election.addVoters(emails: string[]): Voter[]
election.getVoter(voterId: string): Voter | undefined
election.getVoterByEmail(email: string): Voter | undefined

// Control election
election.start(): void
election.end(): void

// Process votes
election.submitVote(vote: Vote): Promise<{ success: boolean; error?: string }>

// Tally results
election.tallyResults(trusteePassword: string): Map<string, number>

// Get stats
election.getStats(): {
  totalVoters: number,
  totalVotes: number,
  turnout: number,
  votesByCandidateCount: Map<string, number>
}

// Persistence
election.export(): ElectionState
Election.import(state: ElectionState, password: string): Election
```

### Voter Class

Represents an eligible voter with Semaphore identity.

```typescript
// Create voter (done automatically by Election.addVoters)
const voter = new Voter(email: string, electionId: string);

// Token management
voter.generateToken(expiryHours?: number): VoterToken
voter.verifyToken(token: string): boolean
voter.markTokenUsed(): void
voter.isTokenExpired(): boolean
voter.getInviteLink(baseUrl?: string): string

// Properties
voter.id: string
voter.email: string
voter.identity: Identity // Semaphore identity
voter.commitment: string

// Export
voter.export(): VoterData
```

### Vote Class

Represents an encrypted, anonymous vote with ZK proof.

```typescript
// Cast vote (client-side)
const vote = await Vote.cast(
  voterIdentity: Identity,
  electionGroup: Group,
  candidateId: string,
  voteValue: bigint, // 1 for selected, 0 for others
  publicKey: ElGamalPublicKey,
  electionId: string
): Promise<Vote>

// Verify vote (server-side)
vote.verify(expectedRoot: string, expectedScope: string): Promise<boolean>

// Properties
vote.candidateId: string
vote.encryptedVote: ElGamalCiphertext
vote.proof: VoteProofData
vote.nullifier: string // Prevents double voting
vote.receipt: VoteReceipt
vote.timestamp: Date

// Export
vote.export(): object
```

### ElGamal Classes

Homomorphic encryption for vote privacy.

```typescript
// Generate keypair
const keyPair = ElGamalKeyPair.fromPassword('trustee-password');

// Encrypt vote
const ciphertext = ElGamalCiphertext.encrypt(1n, keyPair.publicKey);

// Homomorphic addition
const sum = ciphertext1.add(ciphertext2);

// Aggregate multiple votes
const total = ElGamalCiphertext.aggregate([vote1, vote2, vote3]);

// Decrypt
const result = keyPair.decrypt(total);
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     VERAVOTE SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  SEMAPHORE   │         │   ELGAMAL    │                 │
│  │              │         │              │                 │
│  │ • Identity   │         │ • Encryption │                 │
│  │ • Groups     │         │ • Homomorphic│                 │
│  │ • ZK Proofs  │         │   Addition   │                 │
│  │ • Nullifiers │         │ • Tallying   │                 │
│  └──────────────┘         └──────────────┘                 │
│         │                         │                         │
│         └────────┬────────────────┘                         │
│                  │                                          │
│         ┌────────▼────────┐                                │
│         │  VOTING FLOW    │                                │
│         │                 │                                │
│         │ • Setup         │                                │
│         │ • Eligibility   │                                │
│         │ • Vote Casting  │                                │
│         │ • Validation    │                                │
│         │ • Tallying      │                                │
│         └─────────────────┘                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Class Structure

```
Election
  ├── ElGamalKeyPair (encryption)
  ├── Group (Semaphore eligibility)
  ├── Voters[]
  │   ├── Identity (Semaphore)
  │   └── Token (one-time access)
  └── Votes[]
      ├── ElGamalCiphertext (encrypted vote)
      ├── Proof (ZK membership)
      └── Receipt (verification)
```

## Data Flow

### Week 1-2: Election Setup

```
Admin creates election
    ↓
Generate ElGamal keypair (from trustee password)
    ↓
Upload voter list (CSV)
    ↓
Create Semaphore group
    ↓
Generate deterministic identity for each voter
    ↓
Add commitments to group → Merkle root
    ↓
Generate one-time tokens
    ↓
Send email invitations
```

### Week 3: Voting

```
Voter clicks email link
    ↓
Verify token (one-time use)
    ↓
Regenerate identity (deterministic from email)
    ↓
Display ballot
    ↓
Voter selects candidate
    ↓
CLIENT SIDE:
  • Encrypt vote with ElGamal (1 for selected, 0 for others)
  • Generate Semaphore proof (membership + nullifier)
  • Combine into vote submission
    ↓
Submit to server
```

### Week 4: Vote Validation

```
Server receives vote
    ↓
Verify Semaphore proof
    ↓
Check nullifier not used
    ↓
Verify Merkle root matches
    ↓
Store encrypted vote + nullifier
    ↓
Mark token as used
    ↓
Send receipt to voter
    ↓
Update live dashboard
```

### Week 5: Tallying

```
Election ends
    ↓
Group votes by candidate
    ↓
Homomorphically add encrypted votes per candidate
    ↓
Trustee enters password
    ↓
Decrypt aggregated totals
    ↓
Publish results + proofs
    ↓
Notify voters
```

## Security Properties

### Anonymity
- Semaphore proofs reveal nothing about voter identity
- Only proves: "I am in the eligible group"
- Nullifier is unlinkable to identity commitment

### Privacy
- Individual votes never decrypted
- Only aggregated totals revealed
- ElGamal encryption hides vote values

### Integrity
- ZK proofs ensure only eligible voters vote
- Nullifiers prevent double voting
- Homomorphic property ensures correct tallying
- Merkle root commits to eligible voter set

### Verifiability
- Voters get receipts proving vote was recorded
- Anyone can verify proofs are valid
- Trustee decryption is verifiable (with ZK proof in Phase 2)

## Database Schema

### Elections Table
```typescript
{
  id: string,
  title: string,
  publicKey: ElGamalPublicKey,
  groupRoot: string, // Semaphore Merkle root
  groupMembers: string[], // Commitments
  status: 'draft' | 'active' | 'ended',
  createdAt: Date
}
```

### Voters Table
```typescript
{
  id: string,
  electionId: string,
  email: string,
  commitment: string, // Semaphore commitment
  tokenHash: string,
  tokenUsed: boolean,
  invitedAt: Date
}
```

### Votes Table
```typescript
{
  id: string,
  electionId: string,
  candidateId: string,
  encryptedVote: ElGamalCiphertext,
  proof: VoteProof, // Semaphore proof
  nullifier: string, // Unique, prevents double voting
  receiptId: string,
  timestamp: Date
}
```

### Nullifiers Table (Index)
```typescript
{
  nullifier: string, // Primary key
  electionId: string,
  timestamp: Date
}
```

## Integration Timeline

- **Week 1**: Election setup, voter tokens, email invitations
- **Week 2**: Add voters, build eligibility group, Merkle root
- **Week 3**: Voting flow, encrypted votes, receipts
- **Week 4**: Vote validation, nullifier tracking, live dashboard
- **Week 5**: Homomorphic tallying, results publication

## Future Enhancements (Phase 2)

1. **Vote Merkle Tree**: Cryptographic commitment to all votes for receipt verification
2. **ZK Tally Proofs**: Prove correct decryption without revealing private key
3. **Multi-Trustee Decryption**: Threshold cryptography for distributed trust
4. **On-Chain Verification**: Deploy Semaphore contracts for public verification
5. **Ranked Choice Voting**: Extend to support multiple vote types

## Dependencies

- `@semaphore-protocol/identity`: Voter identity
- `@semaphore-protocol/group`: Eligibility groups
- `@semaphore-protocol/proof`: ZK proofs
- `@noble/curves`: Elliptic curve cryptography
- `@noble/hashes`: SHA-256 hashing

## Example

See `examples/complete-flow.ts` for a full working example.
