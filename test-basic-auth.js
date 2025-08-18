// Test Basic Auth encoding untuk debugging
const username = 'truckapp';
const password = 'keBuH{5577\\cS%nH[uKT';

console.log('=== Basic Auth Test ===');
console.log('Username:', username);
console.log('Password:', password);
console.log('Password length:', password.length);

const credentialsString = `${username}:${password}`;
console.log('Credentials string:', credentialsString);

// Test different encoding methods
const basicAuth1 = btoa(credentialsString);
console.log('btoa() result:', basicAuth1);

// Test with Buffer (Node.js method)
const basicAuth2 = Buffer.from(credentialsString).toString('base64');
console.log('Buffer.from() result:', basicAuth2);

console.log('Are they equal?', basicAuth1 === basicAuth2);

// Test decoding
const decoded = atob(basicAuth1);
console.log('Decoded back:', decoded);
console.log('Matches original?', decoded === credentialsString);

// Test what you should get in Postman
console.log('\n=== For Postman ===');
console.log('Authorization Header: Basic ' + basicAuth1);
