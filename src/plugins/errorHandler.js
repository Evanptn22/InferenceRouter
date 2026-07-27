// Registered once on the Fastify instance so any thrown/rejected error in a
// route becomes structured JSON instead of taking the process down.
export function registerErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');

    if (error.validation) {
      reply.code(400).send({ error: 'invalid request', details: error.message });
      return;
    }

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.code(statusCode).send({ error: error.message ?? 'internal error' });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: `no route for ${request.method} ${request.url}` });
  });
}
