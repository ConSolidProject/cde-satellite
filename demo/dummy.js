const fs = require('fs');
const crypto = require('crypto');

// Generate a new RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096, // Length of the key in bits
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Save the keys to files (optional)
console.log('privateKey :>> ', privateKey);
console.log('publicKey :>> ', publicKey);

console.log('Keys generated and saved successfully.');