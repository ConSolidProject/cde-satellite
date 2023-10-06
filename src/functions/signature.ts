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

export async function verify(token) {
    const decoded = jws.decode(token)
    const payload = JSON.parse(decoded.payload)
    const issuer = payload.issuer
    const publicKeyUrl = payload.publicKey
    if (publicKeyUrl.includes(issuer.replaceAll("/profile/card#me", ""))) {
        const publicKey = await fetch(payload.publicKey).then(i => i.text())
        const valid = jws.verify(token, decoded.header.alg, publicKey)
        return { valid, payload }
    } else {
      new Error("could not verify token")
    }
  }

// read private key from file


// signUrls(urls, privateKeyLocation, publicKey, "http://localhost:3000/architect-duplex/profile/card#me").then(console.log)