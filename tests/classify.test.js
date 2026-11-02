import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/classify/index.js';

const cases = [
  [{ name: 'ollama/ollama', description: 'Get up and running with Llama', topics: ['llm', 'local-first'] }, 'ai'],
  [{ name: 'pytorch/pytorch', description: 'Tensors and neural networks', topics: ['deep-learning', 'ml'] }, 'ai'],
  [{ name: 'vercel/next.js', description: 'The React Framework', topics: ['react', 'framework'] }, 'frontend'],
  [{ name: 'tailwindlabs/tailwindcss', description: 'Utility-first CSS framework', topics: ['css', 'tailwind'] }, 'frontend'],
  [{ name: 'fastapi/fastapi', description: 'FastAPI framework', topics: ['python', 'api'] }, 'backend'],
  [{ name: 'grpc/grpc', description: 'A high performance RPC framework', topics: ['rpc', 'microservices'] }, 'backend'],
  [{ name: 'kubernetes/kubernetes', description: 'Production-Grade Container Orchestration', topics: ['kubernetes', 'container-orchestration'] }, 'infra'],
  [{ name: 'envoyproxy/envoy', description: 'Cloud-native proxy', topics: ['proxy', 'edge'] }, 'infra'],
  [{ name: 'postgres/postgres', description: 'PostgreSQL database', topics: ['database', 'sql'] }, 'db'],
  [{ name: 'redis/redis', description: 'In-memory data structure store', topics: ['database', 'in-memory'] }, 'db'],
  [{ name: 'cli/cli', description: "GitHub's official CLI", topics: ['github', 'cli'] }, 'devtools'],
  [{ name: 'microsoft/vscode', description: 'VS Code editor', topics: ['editor', 'vscode'] }, 'devtools'],
  [{ name: 'flutter/flutter', description: 'UI toolkit for mobile', topics: ['flutter', 'mobile'] }, 'mobile'],
  [{ name: 'keycloak/keycloak', description: 'Identity and access management', topics: ['security', 'authentication', 'oidc'] }, 'security'],
  [{ name: 'hashicorp/vault', description: 'Manage secrets and protect sensitive data', topics: ['security', 'secrets'] }, 'security'],
  [{ name: 'prometheus/prometheus', description: 'Monitoring system and time series database', topics: ['monitoring', 'observability'] }, 'devops'],
  [{ name: 'apache/spark', description: 'Unified engine for large-scale data', topics: ['big-data', 'analytics'] }, 'data'],
  [{ name: 'v8/v8', description: 'The JavaScript engine', topics: ['javascript', 'runtime', 'compiler'] }, 'lang'],
  [{ name: 'rust-lang/rust', description: 'The Rust language', topics: ['rust', 'language', 'compiler'] }, 'lang'],
  [{ name: 'example/mystery', description: 'nothing matches anything here', topics: ['foo'] }, 'other'],
];

for (const [input, expected] of cases) {
  test(`classifies ${input.name} as ${expected}`, () => {
    assert.equal(classify(input), expected);
  });
}