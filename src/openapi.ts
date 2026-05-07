import type { OpenAPIV3_1 } from 'openapi-types';

export const openapiSpec: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: {
    title: 'DebtMate API',
    version: '1.0.0',
    description:
      'REST API for the DebtMate Telegram Mini App. All `/api/*` endpoints require Telegram Mini App authentication via the `Authorization` header.',
  },
  servers: [{ url: '', description: 'Current server' }],
  components: {
    securitySchemes: {
      TelegramMiniApp: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description:
          'Telegram Mini App initData. Format: `tma <initDataRaw>` where `initDataRaw` is the URL-encoded init data string provided by the Telegram Web App SDK.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Something went wrong.' },
        },
      },
      Currency: {
        type: 'string',
        enum: ['USD', 'EUR', 'GBP', 'IRR', 'TRY'],
        example: 'USD',
      },
      User: {
        type: 'object',
        required: ['id', 'telegramId', 'name', 'language', 'createdAt'],
        properties: {
          id: { type: 'string', example: 'clx000000000000000000000' },
          telegramId: { type: 'string', example: '123456789' },
          name: { type: 'string', example: 'Erfan' },
          language: { type: 'string', enum: ['EN', 'FA'], example: 'EN' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-05-01T00:00:00.000Z' },
        },
      },
      Contact: {
        type: 'object',
        required: ['contact', 'relationship', 'netBalance'],
        properties: {
          contact: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'string', example: 'clx000000000000000000001' },
              name: { type: 'string', example: 'Ali' },
            },
          },
          relationship: {
            type: 'object',
            required: ['id', 'currency'],
            properties: {
              id: { type: 'string', example: 'clx000000000000000000002' },
              currency: { $ref: '#/components/schemas/Currency' },
            },
          },
          netBalance: {
            type: 'number',
            description: 'Positive = contact owes you. Negative = you owe contact.',
            example: 50.0,
          },
        },
      },
      Balance: {
        type: 'object',
        required: ['amount', 'direction', 'contactName', 'currency'],
        properties: {
          amount: { type: 'number', example: 50.0 },
          direction: {
            type: 'string',
            enum: ['owed_to_you', 'you_owe'],
            example: 'owed_to_you',
          },
          contactName: { type: 'string', example: 'Ali' },
          currency: { $ref: '#/components/schemas/Currency' },
        },
      },
      Transaction: {
        type: 'object',
        required: ['id', 'amount', 'type', 'currency', 'createdAt'],
        properties: {
          id: { type: 'string', example: 'clx000000000000000000003' },
          amount: { type: 'number', example: 25.0 },
          type: { type: 'string', enum: ['LOAN', 'DEBT'], example: 'LOAN' },
          note: { type: ['string', 'null'], example: 'Dinner split' },
          currency: { $ref: '#/components/schemas/Currency' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-05-07T12:00:00.000Z' },
        },
      },
    },
  },
  security: [],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server status. No authentication required.',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'timestamp'],
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-05-07T12:00:00.000Z',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user',
        description:
          "Returns the authenticated user's profile. Creates the user record if this is their first request.",
        operationId: 'getMe',
        security: [{ TelegramMiniApp: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
          '401': {
            description: 'Missing or invalid Telegram initData',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/contacts': {
      get: {
        tags: ['Contacts'],
        summary: 'List contacts',
        description: 'Returns all contacts the authenticated user has a debt relationship with, along with their net balance.',
        operationId: 'listContacts',
        security: [{ TelegramMiniApp: [] }],
        responses: {
          '200': {
            description: 'List of contacts with balances',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Contact' },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid Telegram initData',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/contacts/{id}/balance': {
      get: {
        tags: ['Contacts'],
        summary: 'Get balance with a contact',
        description: 'Returns the net balance between the authenticated user and a specific contact.',
        operationId: 'getContactBalance',
        security: [{ TelegramMiniApp: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Contact user ID',
            schema: { type: 'string', example: 'clx000000000000000000001' },
          },
        ],
        responses: {
          '200': {
            description: 'Balance with the contact',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Balance' } },
            },
          },
          '401': {
            description: 'Missing or invalid Telegram initData',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '404': {
            description: 'No relationship found with this contact',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/contacts/{id}/logs': {
      get: {
        tags: ['Contacts'],
        summary: 'Get transaction logs with a contact',
        description: 'Returns recent transactions between the authenticated user and a specific contact.',
        operationId: 'getContactLogs',
        security: [{ TelegramMiniApp: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Contact user ID',
            schema: { type: 'string', example: 'clx000000000000000000001' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Max number of transactions to return (1–100, default 20)',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20, example: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Transaction logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currency', 'transactions'],
                  properties: {
                    currency: { $ref: '#/components/schemas/Currency' },
                    transactions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Transaction' },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid Telegram initData',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '404': {
            description: 'No relationship found with this contact',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/transactions': {
      post: {
        tags: ['Transactions'],
        summary: 'Create a transaction',
        description:
          'Records a new loan or debt transaction between the authenticated user and a contact. Also sends a Telegram notification to the contact.',
        operationId: 'createTransaction',
        security: [{ TelegramMiniApp: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contactId', 'amount', 'type'],
                properties: {
                  contactId: {
                    type: 'string',
                    description: "The contact's user ID",
                    example: 'clx000000000000000000001',
                  },
                  amount: {
                    type: 'number',
                    description: 'Positive amount',
                    minimum: 0,
                    exclusiveMinimum: true,
                    example: 25.0,
                  },
                  type: {
                    type: 'string',
                    enum: ['LOAN', 'DEBT'],
                    description: 'LOAN = you lent money to the contact. DEBT = you borrowed from the contact.',
                    example: 'LOAN',
                  },
                  note: {
                    type: 'string',
                    description: 'Optional note',
                    example: 'Dinner split',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transaction created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Transaction' } },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '401': {
            description: 'Missing or invalid Telegram initData',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '404': {
            description: 'No relationship found with this contact',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/relationships/{id}/currency': {
      patch: {
        tags: ['Relationships'],
        summary: 'Update relationship currency',
        description:
          'Changes the currency used for a debt relationship. Both parties must be in the relationship.',
        operationId: 'patchRelationshipCurrency',
        security: [{ TelegramMiniApp: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Relationship ID',
            schema: { type: 'string', example: 'clx000000000000000000002' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currency'],
                properties: {
                  currency: { $ref: '#/components/schemas/Currency' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Currency updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'currency'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    currency: { $ref: '#/components/schemas/Currency' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid currency value',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '401': {
            description: 'Missing or invalid Telegram initData',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '403': {
            description: 'Not a member of this relationship',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '404': {
            description: 'Relationship not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
  },
};
