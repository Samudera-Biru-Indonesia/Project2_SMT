export const environment = {
  production: false,
  api: {
    baseUrl: 'https://epictestapp.samator.com/KineticTest2/api/v2/efx/SGI/SMTTruckCheckApp',
    endpoints: {
      login: '/AuthenticateLogon',
      getTripData: '/GetTripData' 
    },
    apiKey: 'XEbogZ3f0YDe5fLyzq8CXhMmuksP3TpJufSp80gfb3SyD',
    basicAuth: {
      username: 'christopher', // Ganti dengan username Epicor Anda
      password: 'Chr15topherb@'  // Ganti dengan password Epicor Anda
    }
  }
};
