/**
 * Veravote Crypto Library
 * 
 * Object-oriented API for anonymous voting with Semaphore + ElGamal
 */

// Core classes
export { Election, ElectionConfig, ElectionState, Candidate, UploadVotersResult } from './core/Election';
export { Voter, VoterToken, VoterData } from './core/Voter';
export { Vote, VoteProofData, VoteReceipt } from './core/Vote';
export { 
  ElGamalKeyPair, 
  ElGamalCiphertext, 
  ElGamalPublicKey, 
  ElGamalPrivateKey 
} from './core/ElGamal';
export { VoterMerkleTree, VoterEligibilityData } from './core/VoterMerkleTree';

// Re-export Semaphore types for convenience
export { Identity } from '@semaphore-protocol/identity';
export { Group } from '@semaphore-protocol/group';
