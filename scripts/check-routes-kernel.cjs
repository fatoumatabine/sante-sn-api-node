#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const modulesRoot = path.join(projectRoot, 'src', 'modules');

const violations = [];

const routeCallRegex = /router\.(get|post|put|delete|patch)\s*\(/g;
const legacyMiddlewareImportRegex = /shared\/middleware\/(auth|roles|validate)\.middleware/;

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractCallBlock(text, startIndex) {
  const openParenIndex = text.indexOf('(', startIndex);
  if (openParenIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let stringQuote = '';
  let escaping = false;

  for (let i = openParenIndex; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (ch === '\\') {
        escaping = true;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringQuote = ch;
      continue;
    }

    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;

    if (depth === 0) {
      return text.slice(startIndex, i + 1);
    }
  }

  return null;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function checkRouteFile(filePath, moduleName) {
  const text = fs.readFileSync(filePath, 'utf8');
  const relativeFilePath = path.relative(projectRoot, filePath);

  if (legacyMiddlewareImportRegex.test(text)) {
    violations.push(
      `${relativeFilePath}: import legacy middleware detected (use httpKernel only)`
    );
  }

  if (!text.includes('httpKernel')) {
    violations.push(
      `${relativeFilePath}: missing httpKernel usage/import`
    );
    return;
  }

  const hasKernelScope = /router\.use\((?:.|\n)*?httpKernel\./m.test(text);
  let match;

  while ((match = routeCallRegex.exec(text)) !== null) {
    const callStart = match.index;
    const callBlock = extractCallBlock(text, callStart);
    const lineNumber = getLineNumber(text, callStart);

    if (!callBlock) {
      violations.push(`${relativeFilePath}:${lineNumber} unable to parse route call`);
      continue;
    }

    const usesKernelInCall = callBlock.includes('httpKernel.');
    if (!usesKernelInCall && !hasKernelScope) {
      violations.push(
        `${relativeFilePath}:${lineNumber} route is not protected/validated through httpKernel`
      );
    }
  }

  const contractPath = path.join(
    modulesRoot,
    moduleName,
    'contracts',
    `${moduleName}.route.contract.ts`
  );

  if (!fs.existsSync(contractPath)) {
    violations.push(
      `${path.relative(projectRoot, contractPath)}: missing route contract file`
    );
  }
}

function main() {
  if (!fs.existsSync(modulesRoot)) {
    console.error('src/modules directory not found');
    process.exit(1);
  }

  const modules = fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const moduleName of modules) {
    const routesDir = path.join(modulesRoot, moduleName, 'routes');
    const routeFiles = listFilesRecursive(routesDir).filter((file) => file.endsWith('.ts'));
    for (const routeFile of routeFiles) {
      checkRouteFile(routeFile, moduleName);
    }
  }

  if (violations.length > 0) {
    console.error('\nRoute kernel checks failed:\n');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    console.error('\nFix the violations above before merging.');
    process.exit(1);
  }

  console.log('Route kernel checks passed.');
}

main();
