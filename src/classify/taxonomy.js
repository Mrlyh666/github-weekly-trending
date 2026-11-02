// Fixed 12-domain taxonomy. Order matters: classify() walks this array and
// stops at the first category whose keywords match, so more specific domains
// are listed first (ai, security, db, mobile) and broader ones later.
export const TAXONOMY = [
  {
    domain: 'ai',
    keywords: ['ai', 'llm', 'ml', 'gpt', 'openai', 'anthropic', 'machine-learning', 'deep-learning', 'neural-network', 'inference', 'diffusion', 'transformer', 'rag', 'embeddings', 'pytorch', 'tensorflow'],
  },
  {
    domain: 'security',
    keywords: ['security', 'ctf', 'penetration', 'encryption', 'cryptography', 'vulnerability', 'exploit', 'authentication', 'oauth', 'oidc', 'password', 'secrets', '2fa'],
  },
  {
    domain: 'db',
    keywords: ['database', 'postgres', 'postgresql', 'mysql', 'sqlite', 'redis', 'mongodb', 'vector-database', 'olap', 'duckdb', 'storage', 'in-memory'],
  },
  {
    domain: 'mobile',
    keywords: ['android', 'ios', 'flutter', 'react-native', 'swift', 'kotlin', 'mobile'],
  },
  {
    domain: 'frontend',
    keywords: ['react', 'vue', 'nextjs', 'svelte', 'css', 'tailwind', 'ui', 'component', 'frontend', 'browser', 'design-system', 'animation'],
  },
  {
    domain: 'backend',
    keywords: ['api', 'server', 'backend', 'graphql', 'http', 'framework', 'microservices', 'rpc', 'grpc', 'nestjs', 'express', 'fastapi', 'django', 'rails', 'spring'],
  },
  {
    domain: 'devops',
    keywords: ['docker', 'ci-cd', 'cicd', 'observability', 'monitoring', 'prometheus', 'grafana', 'terraform', 'iac', 'sre', 'deployment'],
  },
  {
    domain: 'data',
    keywords: ['data-visualization', 'visualization', 'dashboard', 'analytics', 'etl', 'big-data', 'spark', 'pandas', 'dataframe', 'data-science', 'notebook', 'chart'],
  },
  {
    domain: 'infra',
    keywords: ['cloud-native', 'kubernetes', 'container', 'orchestration', 'serverless', 'edge', 'distributed', 'proxy', 'gateway', 'mesh', 'scheduler', 'message-queue'],
  },
  {
    domain: 'devtools',
    keywords: ['cli', 'developer-tools', 'tooling', 'editor', 'vscode', 'ide', 'linter', 'formatter', 'debugger', 'build-tool', 'bundler', 'terminal', 'git', 'sdk'],
  },
  {
    domain: 'lang',
    keywords: ['compiler', 'interpreter', 'runtime', 'language', 'programming-language', 'parser', 'type-system', 'virtual-machine', 'jit', 'stdlib'],
  },
];