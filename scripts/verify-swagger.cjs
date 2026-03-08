#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const serverPath = path.join(projectRoot, 'src', 'server.ts');
const distSwaggerPath = path.join(projectRoot, 'dist', 'config', 'swagger.js');
const distModulesRoot = path.join(projectRoot, 'dist', 'modules');
const srcModulesRoot = path.join(projectRoot, 'src', 'modules');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertFileExists(filePath, hint) {
  if (!fs.existsSync(filePath)) {
    fail(`${filePath} not found. ${hint}`);
  }
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseMountedRouters(serverText) {
  const importRegex = /^import\s+(\w+)\s+from\s+'(\.\/modules\/.+\/routes\/.+\.routes)'/gm;
  const useRegex = /app\.use\(['"]([^'"]+)['"],\s*(\w+)\);/g;
  const importMap = new Map();
  const mounts = [];

  let match;
  while ((match = importRegex.exec(serverText)) !== null) {
    const variableName = match[1];
    const importPath = match[2];
    const sourceFile = path.join(projectRoot, 'src', importPath.replace(/^\.\//, '') + '.ts');
    importMap.set(variableName, sourceFile);
  }

  while ((match = useRegex.exec(serverText)) !== null) {
    mounts.push({
      basePath: match[1],
      variableName: match[2],
    });
  }

  return { importMap, mounts };
}

function normalizeSwaggerPath(pathValue) {
  return pathValue.replace(/\{([^}]+)\}/g, ':$1');
}

function parseActualEndpoints(serverText) {
  const { importMap, mounts } = parseMountedRouters(serverText);
  const routeRegex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  const appRouteRegex = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  const endpoints = new Set();

  for (const mount of mounts) {
    if (!mount.basePath.startsWith('/api/v1/')) continue;
    const routeFile = importMap.get(mount.variableName);
    if (!routeFile || !fs.existsSync(routeFile)) continue;

    const routeText = fs.readFileSync(routeFile, 'utf8');
    let routeMatch;
    while ((routeMatch = routeRegex.exec(routeText)) !== null) {
      const method = routeMatch[1].toUpperCase();
      const routePath = routeMatch[2];
      const fullPath = routePath === '/' ? mount.basePath : `${mount.basePath}${routePath}`;
      endpoints.add(`${method} ${fullPath}`);
    }
  }

  let appRouteMatch;
  while ((appRouteMatch = appRouteRegex.exec(serverText)) !== null) {
    const method = appRouteMatch[1].toUpperCase();
    const routePath = appRouteMatch[2];
    if (routePath === '/health') {
      endpoints.add(`${method} ${routePath}`);
    }
  }

  return endpoints;
}

function parseSwaggerEndpoints(spec) {
  const endpoints = new Set();
  const paths = spec.paths || {};

  for (const [routePath, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations || {})) {
      endpoints.add(`${method.toUpperCase()} ${normalizeSwaggerPath(routePath)}`);
    }
  }

  return endpoints;
}

function loadContractsFromDist() {
  if (!fs.existsSync(distModulesRoot)) return [];

  const contractFiles = listFilesRecursive(distModulesRoot).filter((filePath) =>
    filePath.endsWith('.route.contract.js')
  );
  const contracts = [];

  for (const contractFile of contractFiles) {
    const loaded = require(contractFile);
    const contract = Object.values(loaded).find(
      (value) =>
        value &&
        typeof value === 'object' &&
        typeof value.basePath === 'string' &&
        Array.isArray(value.routes) &&
        typeof value.module === 'string'
    );

    if (contract) {
      contracts.push(contract);
    }
  }

  return contracts;
}

function toOpenApiPath(basePath, routePath) {
  const fullPath = routePath === '/' ? basePath : `${basePath}${routePath}`;
  return fullPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function expectedPathParams(routePath) {
  return [...routePath.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]).sort();
}

function verifyContractConsistency(spec, contracts) {
  const errors = [];
  const paths = spec.paths || {};

  for (const contract of contracts) {
    for (const route of contract.routes) {
      const pathValue = toOpenApiPath(contract.basePath, route.path);
      const methodValue = route.method.toLowerCase();
      const operation = ((paths[pathValue] || {})[methodValue]) || null;

      if (!operation) {
        errors.push(`Missing operation for contract route: ${route.method} ${pathValue}`);
        continue;
      }

      const hasRequestBody = !!operation.requestBody;
      const expectsRequestBody = !!(route.validations && route.validations.body);
      if (hasRequestBody !== expectsRequestBody) {
        errors.push(
          `Body mismatch ${route.method} ${pathValue}: expected=${expectsRequestBody} got=${hasRequestBody}`
        );
      }

      const operationParameters = operation.parameters || [];
      const pathParams = operationParameters
        .filter((parameter) => parameter.in === 'path')
        .map((parameter) => parameter.name)
        .sort();
      const queryParams = operationParameters
        .filter((parameter) => parameter.in === 'query')
        .map((parameter) => parameter.name)
        .sort();
      const expectedParams = expectedPathParams(route.path);

      if (JSON.stringify(pathParams) !== JSON.stringify(expectedParams)) {
        errors.push(
          `Path params mismatch ${route.method} ${pathValue}: expected=[${expectedParams.join(',')}] got=[${pathParams.join(',')}]`
        );
      }

      if (route.validations && route.validations.query && queryParams.length === 0) {
        errors.push(
          `Missing query params in Swagger for ${route.method} ${pathValue} (${route.validations.query})`
        );
      }

      const shouldHaveSecurity = route.auth !== 'public';
      const hasSecurity = !!operation.security;
      if (shouldHaveSecurity !== hasSecurity) {
        errors.push(
          `Security mismatch ${route.method} ${pathValue}: expected=${shouldHaveSecurity} got=${hasSecurity}`
        );
      }
    }
  }

  return errors;
}

function verifySchemaRefs(spec) {
  const errors = [];
  const schemas = ((spec.components || {}).schemas || {});
  const schemaNames = new Set(Object.keys(schemas));

  function walk(node, context) {
    if (!node || typeof node !== 'object') return;

    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
        const schemaName = value.replace('#/components/schemas/', '');
        if (!schemaNames.has(schemaName)) {
          errors.push(`Missing schema reference "${schemaName}" at ${context}`);
        }
      } else {
        walk(value, context);
      }
    }
  }

  for (const [routePath, operations] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(operations || {})) {
      walk(operation, `${method.toUpperCase()} ${routePath}`);
    }
  }

  return errors;
}

function routeShadowRisk(routeA, routeB) {
  if (routeA.method !== routeB.method) return false;

  const aSegments = routeA.path.split('/').filter(Boolean);
  const bSegments = routeB.path.split('/').filter(Boolean);
  if (aSegments.length !== bSegments.length) return false;

  let patternCanMatch = true;
  for (let index = 0; index < aSegments.length; index += 1) {
    const left = aSegments[index];
    const right = bSegments[index];
    if (left === right) continue;
    if (left.startsWith(':')) continue;
    patternCanMatch = false;
    break;
  }

  const leftHasDynamicSegment = aSegments.some((segment) => segment.startsWith(':'));
  const rightHasStaticDifference = bSegments.some(
    (segment, index) => segment !== aSegments[index] && !segment.startsWith(':')
  );

  return patternCanMatch && leftHasDynamicSegment && rightHasStaticDifference;
}

function verifyRouteShadowing() {
  const errors = [];
  const routeFiles = listFilesRecursive(srcModulesRoot).filter(
    (filePath) => filePath.includes('/routes/') && filePath.endsWith('.ts')
  );
  const routeRegex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;

  for (const routeFile of routeFiles) {
    const text = fs.readFileSync(routeFile, 'utf8');
    const parsedRoutes = [];
    let match;
    while ((match = routeRegex.exec(text)) !== null) {
      parsedRoutes.push({
        method: match[1].toUpperCase(),
        path: match[2],
      });
    }

    for (let i = 0; i < parsedRoutes.length; i += 1) {
      for (let j = i + 1; j < parsedRoutes.length; j += 1) {
        if (routeShadowRisk(parsedRoutes[i], parsedRoutes[j])) {
          errors.push(
            `${path.relative(projectRoot, routeFile)}: ${parsedRoutes[i].method} ${parsedRoutes[i].path} declared before ${parsedRoutes[j].path}`
          );
        }
      }
    }
  }

  return errors;
}

function printIssues(title, issues) {
  if (issues.length === 0) return;
  console.error(`\n${title}`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
}

function main() {
  assertFileExists(serverPath, 'Run from project root.');
  assertFileExists(distSwaggerPath, 'Run "npm run build" first.');

  const serverText = fs.readFileSync(serverPath, 'utf8');
  const actualEndpoints = parseActualEndpoints(serverText);
  const { buildSwaggerSpec } = require(distSwaggerPath);
  const spec = buildSwaggerSpec({
    title: 'API Santé SN',
    version: '1.0.0',
    description: 'API REST pour application de gestion médicale - Node.js/Express/Prisma',
    serverUrl: 'http://localhost:3000',
  });
  const swaggerEndpoints = parseSwaggerEndpoints(spec);

  const missingInSwagger = [...actualEndpoints].filter((endpoint) => !swaggerEndpoints.has(endpoint)).sort();
  const extraInSwagger = [...swaggerEndpoints].filter((endpoint) => !actualEndpoints.has(endpoint)).sort();

  const contracts = loadContractsFromDist();
  const contractIssues = verifyContractConsistency(spec, contracts);
  const schemaRefIssues = verifySchemaRefs(spec);
  const routeShadowIssues = verifyRouteShadowing();

  const hasFailure =
    missingInSwagger.length > 0 ||
    extraInSwagger.length > 0 ||
    contractIssues.length > 0 ||
    schemaRefIssues.length > 0 ||
    routeShadowIssues.length > 0;

  console.log(`actual_endpoints=${actualEndpoints.size}`);
  console.log(`swagger_endpoints=${swaggerEndpoints.size}`);
  console.log(`contracts_loaded=${contracts.length}`);

  printIssues('Missing in Swagger', missingInSwagger);
  printIssues('Extra in Swagger', extraInSwagger);
  printIssues('Contract mismatches', contractIssues);
  printIssues('Schema reference issues', schemaRefIssues);
  printIssues('Route shadow risks', routeShadowIssues);

  if (hasFailure) {
    fail('\nSwagger verification failed.');
  }

  console.log('\nSwagger verification passed.');
}

main();
