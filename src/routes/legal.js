export default async function legalRoutes(app) {
  app.get('/privacy', (request, reply) => reply.sendFile('privacy.html'));
  app.get('/terms', (request, reply) => reply.sendFile('terms.html'));
}
