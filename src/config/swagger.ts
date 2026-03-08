import { z } from 'zod';
import type { ModuleRouteContract, RouteContractEntry } from '../kernel/route-contract';
import * as validationRegistry from '../validations';
import { adminRouteContract } from '../modules/admin/contracts/admin.route.contract';
import { authRouteContract } from '../modules/auth/contracts/auth.route.contract';
import { chatRouteContract } from '../modules/chat/contracts/chat.route.contract';
import { consultationRouteContract } from '../modules/consultation/contracts/consultation.route.contract';
import { creneauRouteContract } from '../modules/creneau/contracts/creneau.route.contract';
import { medecinRouteContract } from '../modules/medecin/contracts/medecin.route.contract';
import { notificationRouteContract } from '../modules/notification/contracts/notification.route.contract';
import { ordonnanceRouteContract } from '../modules/ordonnance/contracts/ordonnance.route.contract';
import { paiementRouteContract } from '../modules/paiement/contracts/paiement.route.contract';
import { patientRouteContract } from '../modules/patient/contracts/patient.route.contract';
import { prestationRouteContract } from '../modules/prestation/contracts/prestation.route.contract';
import { rendezVousRouteContract } from '../modules/rendez-vous/contracts/rendez-vous.route.contract';
import { secretaireRouteContract } from '../modules/secretaire/contracts/secretaire.route.contract';
import { settingsRouteContract } from '../modules/settings/contracts/settings.route.contract';
import { statsRouteContract } from '../modules/stats/contracts/stats.route.contract';

interface BuildSwaggerSpecParams {
  title: string;
  version: string;
  description: string;
  serverUrl: string;
}

type OpenApiSchema = Record<string, unknown>;
type OpenApiResponse = {
  description: string;
  content?: {
    'application/json': {
      schema: OpenApiSchema;
    };
  };
};
type OpenApiOperation = {
  tags: string[];
  operationId: string;
  summary: string;
  description: string;
  security?: Array<Record<string, never[]>>;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, OpenApiResponse>;
  'x-required-roles'?: readonly string[];
};

const routeContracts: readonly ModuleRouteContract[] = [
  adminRouteContract,
  authRouteContract,
  chatRouteContract,
  consultationRouteContract,
  creneauRouteContract,
  medecinRouteContract,
  notificationRouteContract,
  ordonnanceRouteContract,
  paiementRouteContract,
  patientRouteContract,
  prestationRouteContract,
  rendezVousRouteContract,
  secretaireRouteContract,
  settingsRouteContract,
  statsRouteContract,
];

function toOpenApiPath(basePath: string, routePath: string): string {
  const joined = routePath === '/' ? basePath : `${basePath}${routePath}`;
  return joined.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function toTagName(moduleName: string): string {
  return moduleName
    .split(/[-_]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function toOperationId(moduleName: string, route: RouteContractEntry): string {
  const cleanedPath = route.path
    .replace(/[:{}]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${moduleName.replace(/[^A-Za-z0-9]/g, '')}_${route.method.toLowerCase()}_${cleanedPath || 'root'}`;
}

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current: z.ZodTypeAny = schema;
  let changed = true;

  while (changed) {
    changed = false;

    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap();
      changed = true;
      continue;
    }

    if (current instanceof z.ZodDefault || current instanceof z.ZodCatch) {
      current = current._def.innerType;
      changed = true;
      continue;
    }

    if (current instanceof z.ZodEffects) {
      current = current._def.schema;
      changed = true;
      continue;
    }

    if (current instanceof z.ZodPipeline) {
      current = current._def.in;
      changed = true;
      continue;
    }

    if (current instanceof z.ZodBranded) {
      current = current._def.type;
      changed = true;
      continue;
    }

    if (current instanceof z.ZodReadonly) {
      current = current._def.innerType;
      changed = true;
      continue;
    }
  }

  return current;
}

function isOptionalSchema(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault || schema instanceof z.ZodCatch) {
    return true;
  }
  if (schema instanceof z.ZodEffects) return isOptionalSchema(schema._def.schema);
  if (schema instanceof z.ZodPipeline) return isOptionalSchema(schema._def.in);
  if (schema instanceof z.ZodBranded) return isOptionalSchema(schema._def.type);
  if (schema instanceof z.ZodReadonly) return isOptionalSchema(schema._def.innerType);
  return false;
}

function isNullableSchema(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodNullable) return true;
  if (schema instanceof z.ZodEffects) return isNullableSchema(schema._def.schema);
  if (schema instanceof z.ZodPipeline) return isNullableSchema(schema._def.in);
  if (schema instanceof z.ZodBranded) return isNullableSchema(schema._def.type);
  if (schema instanceof z.ZodReadonly) return isNullableSchema(schema._def.innerType);
  if (schema instanceof z.ZodUnion) {
    return schema._def.options.some((option: z.ZodTypeAny) => unwrapSchema(option) instanceof z.ZodNull);
  }
  return false;
}

function objectShape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> | null {
  const unwrapped = unwrapSchema(schema);
  if (!(unwrapped instanceof z.ZodObject)) return null;
  const rawShape = unwrapped._def.shape();
  return rawShape as Record<string, z.ZodTypeAny>;
}

function addStringChecks(target: OpenApiSchema, schema: z.ZodString): void {
  for (const check of schema._def.checks) {
    if (check.kind === 'min') target.minLength = check.value;
    if (check.kind === 'max') target.maxLength = check.value;
    if (check.kind === 'email') target.format = 'email';
    if (check.kind === 'url') target.format = 'uri';
    if (check.kind === 'uuid') target.format = 'uuid';
    if (check.kind === 'regex') target.pattern = check.regex.source;
    if (check.kind === 'datetime') target.format = 'date-time';
  }
}

function addNumberChecks(target: OpenApiSchema, schema: z.ZodNumber | z.ZodBigInt): void {
  for (const check of schema._def.checks) {
    if (check.kind === 'int') target.type = 'integer';
    if (check.kind === 'min') target.minimum = Number(check.value);
    if (check.kind === 'max') target.maximum = Number(check.value);
    if (check.kind === 'multipleOf') target.multipleOf = Number(check.value);
  }
}

function zodToOpenApiSchema(schema: z.ZodTypeAny): OpenApiSchema {
  const unwrapped = unwrapSchema(schema);
  let result: OpenApiSchema;

  if (unwrapped instanceof z.ZodString) {
    result = { type: 'string' };
    addStringChecks(result, unwrapped);
  } else if (unwrapped instanceof z.ZodNumber || unwrapped instanceof z.ZodBigInt) {
    result = { type: 'number' };
    addNumberChecks(result, unwrapped);
  } else if (unwrapped instanceof z.ZodBoolean) {
    result = { type: 'boolean' };
  } else if (unwrapped instanceof z.ZodDate) {
    result = { type: 'string', format: 'date-time' };
  } else if (unwrapped instanceof z.ZodLiteral) {
    const value = unwrapped._def.value;
    const valueType = typeof value;
    result = { enum: [value] };
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      result.type = valueType;
    }
  } else if (unwrapped instanceof z.ZodEnum) {
    result = { type: 'string', enum: unwrapped._def.values };
  } else if (unwrapped instanceof z.ZodNativeEnum) {
    const enumValues = Object.values(unwrapped._def.values).filter((value) => {
      const valueType = typeof value;
      return valueType === 'string' || valueType === 'number';
    });
    result = { enum: enumValues };
  } else if (unwrapped instanceof z.ZodArray) {
    result = {
      type: 'array',
      items: zodToOpenApiSchema(unwrapped._def.type),
    };
  } else if (unwrapped instanceof z.ZodTuple) {
    result = {
      type: 'array',
      minItems: unwrapped._def.items.length,
      maxItems: unwrapped._def.items.length,
      items: unwrapped._def.items.map((item: z.ZodTypeAny) => zodToOpenApiSchema(item)),
    };
  } else if (unwrapped instanceof z.ZodRecord) {
    result = {
      type: 'object',
      additionalProperties: zodToOpenApiSchema(unwrapped._def.valueType),
    };
  } else if (unwrapped instanceof z.ZodUnion) {
    const options = unwrapped._def.options as z.ZodTypeAny[];
    const nonNullOptions = options.filter((option) => !(unwrapSchema(option) instanceof z.ZodNull));

    if (nonNullOptions.length === 1 && options.length === 2) {
      result = {
        ...zodToOpenApiSchema(nonNullOptions[0]),
        nullable: true,
      };
    } else {
      result = {
        oneOf: options.map((option) => zodToOpenApiSchema(option)),
      };
    }
  } else if (unwrapped instanceof z.ZodIntersection) {
    result = {
      allOf: [zodToOpenApiSchema(unwrapped._def.left), zodToOpenApiSchema(unwrapped._def.right)],
    };
  } else if (unwrapped instanceof z.ZodObject) {
    const shape = unwrapped._def.shape() as Record<string, z.ZodTypeAny>;
    const properties: Record<string, OpenApiSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToOpenApiSchema(value);
      if (!isOptionalSchema(value)) required.push(key);
    }

    result = {
      type: 'object',
      properties,
    };

    if (required.length > 0) result.required = required;
    if (unwrapped._def.unknownKeys === 'passthrough') {
      result.additionalProperties = true;
    }
  } else if (
    unwrapped instanceof z.ZodAny ||
    unwrapped instanceof z.ZodUnknown ||
    unwrapped instanceof z.ZodNever ||
    unwrapped instanceof z.ZodNull ||
    unwrapped instanceof z.ZodVoid
  ) {
    result = {};
  } else {
    result = {};
  }

  if (isNullableSchema(schema) && result.nullable !== true) {
    result = { ...result, nullable: true };
  }

  return result;
}

function schemaByName(schemaName?: string): z.ZodTypeAny | null {
  if (!schemaName) return null;
  const registry = validationRegistry as Record<string, unknown>;
  const candidate = registry[schemaName];
  if (candidate instanceof z.ZodType) return candidate;
  return null;
}

function buildParameters(route: RouteContractEntry): Array<Record<string, unknown>> {
  const parameters: Array<Record<string, unknown>> = [];
  const pathParamNames = [...route.path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  const paramsSchema = schemaByName(route.validations?.params);
  const querySchema = schemaByName(route.validations?.query);
  const paramsShape = paramsSchema ? objectShape(paramsSchema) : null;
  const queryShape = querySchema ? objectShape(querySchema) : null;

  for (const paramName of pathParamNames) {
    const paramSchema = paramsShape?.[paramName];
    parameters.push({
      name: paramName,
      in: 'path',
      required: true,
      schema: paramSchema ? zodToOpenApiSchema(paramSchema) : { type: 'string' },
    });
  }

  if (queryShape) {
    for (const [name, schema] of Object.entries(queryShape)) {
      parameters.push({
        name,
        in: 'query',
        required: !isOptionalSchema(schema),
        schema: zodToOpenApiSchema(schema),
      });
    }
  }

  return parameters;
}

function buildResponses(route: RouteContractEntry): Record<string, OpenApiResponse> {
  const responses: Record<string, OpenApiResponse> = {
    '200': {
      description: 'Succès',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiSuccessResponse' },
        },
      },
    },
    '400': {
      description: 'Requête invalide (validation)',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        },
      },
    },
    '500': {
      description: 'Erreur interne serveur',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        },
      },
    },
  };

  if (route.method === 'POST') {
    responses['201'] = {
      description: 'Ressource créée',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiSuccessResponse' },
        },
      },
    };
  }

  if (route.auth !== 'public') {
    responses['401'] = {
      description: 'Non authentifié',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        },
      },
    };
  }

  if (route.auth === 'roles') {
    responses['403'] = {
      description: 'Accès refusé',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        },
      },
    };
  }

  return responses;
}

function buildRequestBody(route: RouteContractEntry): Record<string, unknown> | undefined {
  const bodySchemaName = route.validations?.body;
  if (!bodySchemaName) return undefined;

  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: `#/components/schemas/${bodySchemaName}`,
        },
      },
    },
  };
}

function authDescription(route: RouteContractEntry): string {
  if (route.auth === 'public') return 'Endpoint public';
  if (route.auth === 'auth') return 'Endpoint protégé (utilisateur authentifié)';
  const roles = route.roles?.join(', ') || 'rôles non définis';
  return `Endpoint protégé avec rôles autorisés: ${roles}`;
}

function buildOperation(moduleName: string, route: RouteContractEntry): OpenApiOperation {
  const parameters = buildParameters(route);
  const operation: OpenApiOperation = {
    tags: [toTagName(moduleName)],
    operationId: toOperationId(moduleName, route),
    summary: `${route.method} ${route.path}`,
    description: authDescription(route),
    responses: buildResponses(route),
  };

  if (route.auth !== 'public') {
    operation.security = [{ bearerAuth: [] }];
  }

  if (route.auth === 'roles' && route.roles) {
    operation['x-required-roles'] = route.roles;
  }

  if (parameters.length > 0) {
    operation.parameters = parameters;
  }

  const requestBody = buildRequestBody(route);
  if (requestBody) operation.requestBody = requestBody;

  return operation;
}

function collectReferencedSchemas(): Record<string, OpenApiSchema> {
  const referencedNames = new Set<string>();

  for (const contract of routeContracts) {
    for (const route of contract.routes) {
      if (route.validations?.params) referencedNames.add(route.validations.params);
      if (route.validations?.query) referencedNames.add(route.validations.query);
      if (route.validations?.body) referencedNames.add(route.validations.body);
    }
  }

  const schemas: Record<string, OpenApiSchema> = {
    ApiSuccessResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Opération effectuée avec succès' },
        data: {},
      },
      required: ['success'],
    },
    ApiErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Erreur de validation' },
        error: {},
      },
      required: ['success', 'message'],
    },
    HealthResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        message: { type: 'string', example: 'API Santé SN est en ligne' },
      },
      required: ['status', 'message'],
    },
  };

  for (const schemaName of referencedNames) {
    const schema = schemaByName(schemaName);
    if (!schema) continue;
    schemas[schemaName] = zodToOpenApiSchema(schema);
  }

  return schemas;
}

export function buildSwaggerSpec(params: BuildSwaggerSpecParams): Record<string, unknown> {
  const paths: Record<string, Record<string, OpenApiOperation>> = {
    '/health': {
      get: {
        tags: ['System'],
        operationId: 'system_health_check',
        summary: 'GET /health',
        description: 'Vérifie la disponibilité de l’API',
        responses: {
          '200': {
            description: 'API disponible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
  };

  for (const contract of routeContracts) {
    for (const route of contract.routes) {
      const openApiPath = toOpenApiPath(contract.basePath, route.path);
      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }
      paths[openApiPath][route.method.toLowerCase()] = buildOperation(contract.module, route);
    }
  }

  const tags = [
    { name: 'System', description: 'Endpoints techniques de l’API' },
    ...routeContracts.map((contract) => ({
      name: toTagName(contract.module),
      description: `Endpoints du module ${contract.module}`,
    })),
  ];

  return {
    openapi: '3.0.0',
    info: {
      title: params.title,
      version: params.version,
      description: params.description,
      contact: {
        name: 'Support',
        email: 'support@santesn.com',
      },
    },
    servers: [
      {
        url: params.serverUrl,
        description: 'Serveur API',
      },
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: collectReferencedSchemas(),
    },
  };
}
