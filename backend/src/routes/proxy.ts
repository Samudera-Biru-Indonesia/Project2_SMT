import { FastifyInstance } from 'fastify';
import { LoginRequestDto } from '@shared/dto/login.dto';
import { GetTripDataDto, SendTripDataDto, ProcessTripDataDto } from '@shared/dto/trip.dto';
import { GetPlantListDto } from '@shared/dto/plant.dto';

// Helper: ambil Epicor URL berdasarkan environment
function getEpicorUrl(env: string): string {
  const urls: Record<string, string | undefined> = {
    test: process.env['EPICOR_URL_TEST'],
    pilot: process.env['EPICOR_URL_PILOT'],
    live: process.env['EPICOR_URL_LIVE'],
  };
  return urls[env] || process.env['EPICOR_URL_LIVE'] || '';
}

// Helper: bikin headers untuk Epicor (API key + Basic Auth dari .env)
function getEpicorHeaders(apiKey: string, basicAuth: string) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${basicAuth}`,
    'Company': 'SGI',
    'x-api-key': apiKey,
  };
}

export async function proxyRoutes(app: FastifyInstance) {
  const apiKey = process.env['EPICOR_API_KEY'] || '';
  const username = process.env['EPICOR_USERNAME'] || '';
  const password = process.env['EPICOR_PASSWORD'] || '';
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  // POST /api/login call Epicor /AuthenticateLogon
  app.post<{ Body: LoginRequestDto }>(
    '/login',
    async (request, reply) => {
      const { logonSite, logonEMP, curLatitude, curLongitude, env = 'live' } = request.body;
      const epicorUrl = getEpicorUrl(env) + '/AuthenticateLogon';

      const response = await fetch(epicorUrl, {
        method: 'POST',
        headers: getEpicorHeaders(apiKey, basicAuth),
        body: JSON.stringify({ logonSite, logonEMP, curLatitude, curLongitude }),
      });

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  // POST /api/get-trip-data call Epicor /GetTripData
  app.post<{ Body: GetTripDataDto }>(
    '/get-trip-data',
    async (request, reply) => {
      const { tripNum, env = 'live' } = request.body;
      const epicorUrl = getEpicorUrl(env) + '/GetTripData';

      const response = await fetch(epicorUrl, {
        method: 'POST',
        headers: getEpicorHeaders(apiKey, basicAuth),
        body: JSON.stringify({ tripNum }),
      });

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  // POST /api/send-trip-data call Epicor /InsertStagingTable
  app.post<{ Body: SendTripDataDto }>(
    '/send-trip-data',
    async (request, reply) => {
      const { env = 'live', ...tripData } = request.body;
      const epicorUrl = getEpicorUrl(env) + '/InsertStagingTable';

      const response = await fetch(epicorUrl, {
        method: 'POST',
        headers: getEpicorHeaders(apiKey, basicAuth),
        body: JSON.stringify(tripData),
      });

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  // POST /api/get-plant-list call Epicor /GetListPlant
  app.post<{ Body: GetPlantListDto }>(
    '/get-plant-list',
    async (request, reply) => {
      const { env = 'live' } = request.body || {};
      const epicorUrl = getEpicorUrl(env) + '/GetListPlant';

      const response = await fetch(epicorUrl, {
        method: 'POST',
        headers: getEpicorHeaders(apiKey, basicAuth),
        body: JSON.stringify({}),
      });

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  // POST /api/process-trip-data call Epicor /ProcessTripTimeEntry
  app.post<{ Body: ProcessTripDataDto }>(
    '/process-trip-data',
    async (request, reply) => {
      const { tripNum, env = 'live' } = request.body;
      const epicorUrl = getEpicorUrl(env) + '/ProcessTripTimeEntry';

      const response = await fetch(epicorUrl, {
        method: 'POST',
        headers: getEpicorHeaders(apiKey, basicAuth),
        body: JSON.stringify({ tripNum }),
      });

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );
}
