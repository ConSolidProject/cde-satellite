import JWS from 'node-jws';
import jws from 'jws';
import FileProvider from 'node-jws-file-provider';
import fs from 'fs';
// function to cryptographically sign a list of urls.

export async function getAccessRights(allowed) {
    const allowedData = await session.fetch(allowed).then(i => i.json())
    return allowedData
}

export async function sign(data, publicKey, verifyUrl, actor) {
    // read private key from file
    const privateKey = process.env.PRIVATE_KEY_PATH!
    const key = await session.fetch(privateKey).then(i => i.text())
    const payload = {...data, publicKey, verifyUrl, issuer: process.env.WEBID, actor}
    const alg = 'RS256'
    const signature = jws.sign({
        header: { alg },
        payload,
        secret: key,
      });

    return signature
}

// read private key from file


// signUrls(urls, privateKeyLocation, publicKey, "http://localhost:3000/architect-duplex/profile/card#me").then(console.log)