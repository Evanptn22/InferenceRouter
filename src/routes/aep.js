import { AEP_MEDIA_TYPE } from '@aep-foundation/core';
import { clientAssertionFromAepAuthorization } from '@aep-foundation/service';
import { aepService } from '../aep/service.js';

function readClientAssertion(request) {
  const dedicated = request.headers['aep-authorization'];
  const fromDedicated = clientAssertionFromAepAuthorization(dedicated);
  if (fromDedicated) return fromDedicated;
  return clientAssertionFromAepAuthorization(request.headers.authorization);
}

function sendServiceResponse(reply, { status, contentType, headers, body }) {
  reply.code(status);
  if (headers) reply.headers(headers);
  reply.type(contentType).send(body);
}

export default async function aepRoutes(app) {
  // AEP command bodies use the AEP media type, not plain application/json —
  // parse it the same way Fastify parses application/json by default.
  app.addContentTypeParser(AEP_MEDIA_TYPE, { parseAs: 'string' }, (request, body, done) => {
    try {
      done(null, body.length ? JSON.parse(body) : {});
    } catch (err) {
      done(err);
    }
  });

  app.get('/.well-known/aep', async (request, reply) => {
    reply.type(AEP_MEDIA_TYPE).send(aepService.inspectDocument());
  });

  app.post('/aep/enroll', async (request, reply) => {
    const response = await aepService.enroll(request.body, {
      clientAssertion: readClientAssertion(request),
      idempotencyKey: request.headers['idempotency-key'] ?? request.body?.idempotency_key,
    });
    sendServiceResponse(reply, response);
  });

  app.get('/aep/status', async (request, reply) => {
    const response = await aepService.status({
      clientAssertion: readClientAssertion(request),
    });
    sendServiceResponse(reply, response);
  });

  app.post('/aep/grant', async (request, reply) => {
    const response = await aepService.grant(request.body, {
      clientAssertion: readClientAssertion(request),
      idempotencyKey: request.headers['idempotency-key'] ?? request.body?.idempotency_key,
    });
    sendServiceResponse(reply, response);
  });

  app.post('/aep/revoke', async (request, reply) => {
    const response = await aepService.revoke(request.body, {
      clientAssertion: readClientAssertion(request),
      idempotencyKey: request.headers['idempotency-key'] ?? request.body?.idempotency_key,
    });
    sendServiceResponse(reply, response);
  });
}
