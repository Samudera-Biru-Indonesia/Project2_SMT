export const environment = {
  production: true,
  api: {
    baseUrl: 'https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp',
    endpoints: {
      login: '/AuthenticateLogon',
      getTripData: '/GetTripData',
      sendTripData: '/InsertStagingTable',
      getPlantList: '/GetListPlant',
      processTripData: '/ProcessTripTimeEntry'
    },
    apiKey: 'W5hczOaOGdc68PcfchvZSvhUmWOf9AX3P6Zhfm0cghdPu',
    basicAuth: {
      username: 'truckapp', 
      password: 'truckapp123.'
    }
  }
};
