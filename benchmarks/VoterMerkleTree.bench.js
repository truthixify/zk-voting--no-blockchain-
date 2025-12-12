"use strict";
/**
 * VoterMerkleTree Performance Benchmarks
 * Run with: npm run benchmark
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const VoterMerkleTree_1 = require("../src/core/VoterMerkleTree");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const results = [];
function benchmark(name, fn) {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
}
async function benchmarkAsync(name, fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
}
function runBenchmark(voterCount) {
    console.log(`\n📊 Benchmarking ${voterCount} voters...`);
    // Generate CSV
    const emails = [];
    for (let i = 1; i <= voterCount; i++) {
        emails.push(`voter${i}@example.com`);
    }
    const csv = 'email\n' + emails.join('\n');
    // Benchmark tree construction
    let tree;
    const constructionTime = benchmark('Tree Construction', () => {
        tree = new VoterMerkleTree_1.VoterMerkleTree(csv);
    });
    console.log(`  ✓ Tree construction: ${constructionTime.toFixed(2)}ms`);
    // Benchmark proof generation
    const proofGenerationTime = benchmark('Proof Generation', () => {
        tree.generateProof(`voter${Math.floor(voterCount / 2)}@example.com`);
    });
    console.log(`  ✓ Proof generation: ${proofGenerationTime.toFixed(4)}ms`);
    // Benchmark eligibility checks (average of 100)
    const eligibilityStart = performance.now();
    for (let i = 1; i <= 100; i++) {
        tree.isEligible(`voter${i}@example.com`);
    }
    const eligibilityEnd = performance.now();
    const eligibilityCheckTime = (eligibilityEnd - eligibilityStart) / 100;
    console.log(`  ✓ Eligibility check (avg): ${eligibilityCheckTime.toFixed(6)}ms`);
    // Benchmark adding voter (rebuilds tree)
    const addVoterTime = benchmark('Add Voter', () => {
        tree.addVoter('newvoter@example.com');
    });
    console.log(`  ✓ Add voter (rebuilds tree): ${addVoterTime.toFixed(2)}ms`);
    // Store results
    results.push({
        name: `${voterCount} voters`,
        voterCount,
        treeDepth: tree.depth,
        constructionTime,
        proofGenerationTime,
        eligibilityCheckTime,
        addVoterTime,
        timestamp: new Date().toISOString()
    });
}
function runScalingBenchmark() {
    console.log('\n📈 Scaling Analysis...');
    const sizes = [100, 500, 1000, 5000, 10000];
    const scalingResults = [];
    sizes.forEach(size => {
        const emails = [];
        for (let i = 1; i <= size; i++) {
            emails.push(`voter${i}@example.com`);
        }
        const csv = emails.join('\n');
        const start = performance.now();
        const tree = new VoterMerkleTree_1.VoterMerkleTree(csv);
        tree.generateProof('voter1@example.com');
        const end = performance.now();
        const time = end - start;
        scalingResults.push({ size, time, depth: tree.depth });
        console.log(`  ${size.toString().padStart(6)} voters: ${time.toFixed(2).padStart(8)}ms (depth: ${tree.depth})`);
    });
    // Calculate scaling factor
    const firstResult = scalingResults[0];
    const lastResult = scalingResults[scalingResults.length - 1];
    const timeRatio = lastResult.time / firstResult.time;
    const sizeRatio = lastResult.size / firstResult.size;
    console.log(`\n  Scaling factor: ${timeRatio.toFixed(2)}x time for ${sizeRatio}x voters`);
    console.log(`  ${timeRatio < sizeRatio ? '✓' : '✗'} ${timeRatio < sizeRatio ? 'Sub-linear scaling confirmed!' : 'Linear or worse scaling'}`);
}
function runRealWorldBenchmark() {
    console.log('\n🌍 Real-world CSV Benchmark...');
    const csvPath = path.join(__dirname, '../tests/fixtures/voters-1000.csv');
    if (!fs.existsSync(csvPath)) {
        console.log('  ⚠ CSV file not found, skipping...');
        return;
    }
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const constructionTime = benchmark('CSV Parsing + Tree Construction', () => {
        const tree = new VoterMerkleTree_1.VoterMerkleTree(csv);
    });
    console.log(`  ✓ Loaded and built tree from CSV: ${constructionTime.toFixed(2)}ms`);
}
function saveResults() {
    const outputDir = path.join(__dirname, '../benchmark-results');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    const output = {
        timestamp: new Date().toISOString(),
        system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
        },
        results
    };
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    // Also save as latest
    const latestPath = path.join(outputDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
    console.log(`💾 Latest results: ${latestPath}`);
    // Generate markdown report
    generateMarkdownReport(output, outputDir);
}
function generateMarkdownReport(data, outputDir) {
    const lines = [
        '# VoterMerkleTree Benchmark Results',
        '',
        `**Date:** ${new Date(data.timestamp).toLocaleString()}`,
        `**Platform:** ${data.system.platform} ${data.system.arch}`,
        `**Node:** ${data.system.nodeVersion}`,
        '',
        '## Results',
        '',
        '| Voters | Depth | Construction (ms) | Proof Gen (ms) | Eligibility Check (ms) | Add Voter (ms) |',
        '|--------|-------|-------------------|----------------|------------------------|----------------|'
    ];
    data.results.forEach((r) => {
        lines.push(`| ${r.voterCount.toLocaleString()} | ${r.treeDepth} | ${r.constructionTime.toFixed(2)} | ${r.proofGenerationTime.toFixed(4)} | ${r.eligibilityCheckTime.toFixed(6)} | ${r.addVoterTime?.toFixed(2) || 'N/A'} |`);
    });
    lines.push('');
    lines.push('## Performance Characteristics');
    lines.push('');
    lines.push('- **Tree Construction**: O(n) - Linear with number of voters');
    lines.push('- **Proof Generation**: O(log n) - Logarithmic with tree depth');
    lines.push('- **Eligibility Check**: O(1) - Constant time hash map lookup');
    lines.push('- **Add Voter**: O(n) - Rebuilds entire tree');
    lines.push('');
    const reportPath = path.join(outputDir, 'BENCHMARK-REPORT.md');
    fs.writeFileSync(reportPath, lines.join('\n'));
    console.log(`📄 Markdown report: ${reportPath}`);
}
// Run all benchmarks
console.log('🚀 Starting VoterMerkleTree Benchmarks...');
console.log('='.repeat(50));
runBenchmark(100);
runBenchmark(500);
runBenchmark(1000);
runBenchmark(5000);
runBenchmark(10000);
runScalingBenchmark();
runRealWorldBenchmark();
saveResults();
console.log('\n' + '='.repeat(50));
console.log('✅ Benchmarks complete!');
