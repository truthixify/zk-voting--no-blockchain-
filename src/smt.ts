import { MerkleTree, PartialMerkleTree } from 'fixed-merkle-tree'

const tree = new MerkleTree(10, [1, 2, 3, 4, 5])
tree.insert(6)
tree.update(3, 42)
const path = tree.proof(3)
console.log("path", path)

const treeEdge = tree.getTreeEdge(2)
const partialTree = new PartialMerkleTree(10, treeEdge, tree.elements.slice(treeEdge.edgeIndex))
console.log("elements", partialTree.elements)
//  [<2 empty items >, 3, 42, 5, 6]

const proofPath = partialTree.proof(3)
console.log("proof path", proofPath)