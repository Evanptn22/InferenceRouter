import { createOdpService } from '@offering-protocol/service';
import { odpDocument } from '../odp/document.js';
import { odpCatalog } from '../odp/catalog.js';

const odp = createOdpService({
  document: odpDocument,
  catalog: odpCatalog,
});

// createOdpService only exposes a Web-standard fetch(Request) interface, no
// Fastify/Node adapter ships with the package — bridge manually.
async function handleOdpRequest(request, reply) {
  const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  const webRequest = new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body && request.body.length ? request.body : undefined,
  });

  const response = await odp.fetch(webRequest);
  const body = Buffer.from(await response.arrayBuffer());

  reply.code(response.status);
  for (const [key, value] of response.headers) {
    reply.header(key, value);
  }
  reply.send(body);
}

export default async function odpRoutes(app) {
  // Capture the raw body as a Buffer instead of letting Fastify's default
  // JSON parser consume it — odp.fetch does its own content negotiation and
  // body parsing per the ODP spec.
  app.addContentTypeParser('*', { parseAs: 'buffer' }, (request, body, done) => done(null, body));

  app.all('/.well-known/odp', handleOdpRequest);
  app.all('/odp/*', handleOdpRequest);
}
