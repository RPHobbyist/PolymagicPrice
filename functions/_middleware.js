export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.toLowerCase();

  // 1. Block sensitive files/extensions specifically enumerated in dashboard logs
  const blockedExactPatterns = [
    '/.env',
    '/env',
    '/.git',
    '/.github',
    '/.gitlab',
    '/.vscode',
    '/package.json',
    '/package-lock.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/components.json',
    '/postcss.config.js',
    '/tailwind.config.ts',
    '/docker-compose',
    '/profiler',
    '/actuator',
    '/heapdump',
    '/configprops'
  ];

  // Check if path matches any sensitive pattern (covers both direct file access and directory children)
  if (blockedExactPatterns.some(p => path.startsWith(p))) {
    return new Response('Not Found', { status: 404 });
  }

  // 2. Block system file extensions explicitly
  if (
    path.endsWith('.swp') ||
    path.endsWith('.bak') ||
    path.endsWith('.save') ||
    path.endsWith('~') ||
    path.endsWith('.docker') ||
    path.endsWith('.example') ||
    path.endsWith('.test')
  ) {
    return new Response('Not Found', { status: 404 });
  }

  // 3. Block direct folder browsing within critical assets
  const assetDirectories = ['/assets/', '/src/', '/public/'];
  if (path.endsWith('/') && assetDirectories.some(dir => path.startsWith(dir))) {
    return new Response('Not Found', { status: 404 });
  }

  // Pass through to destination
  const response = await context.next();
  return response;
}
