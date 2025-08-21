export const environment = {
  production: false,
  api: {
    baseUrl: 'https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp',
    endpoints: {
      login: '/AuthenticateLogon',
      getTripData: '/GetTripData',
      sendTripData: '/InsertStagingTable',
      getPlantList: '/GetListPlant',
      processTripData: '/ProcessTripTimeEntry'
    },
    apiKey: 'IMjuJZsgH1Dlz781wJWSmmX4eXEg1KjhgaiE2eR1WCSwQ',
    basicAuth: {
      username: 'truckapp', // Ganti dengan username Epicor Anda
      password: 'keBuH{5577\cS%nH[uKT'  // Ganti dengan password Epicor Anda
    }
  }
};
