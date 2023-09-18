import JWS from 'node-jws';
import jws from 'jws';
import FileProvider from 'node-jws-file-provider';
import fs from 'fs';
// function to cryptographically sign a list of urls.

export async function getAccessRights(actor) {
    const me = await fetch(process.env.WEBID!, {headers: {"Accept": "application/ld+json"}}).then(res => res.json()).then(i => i.filter(i => i["@id"] === process.env.WEBID))
    const sparqlsat = me[0]["https://w3id.org/consolid#hasSparqlSatellite"][0]["@id"]
    const verifyUrl = me[0]["https://w3id.org/consolid#hasConSolidSatellite"][0]["@id"] + "verify"
    const publicKey = me[0]["https://w3id.org/consolid#hasPublicKey"][0]["@id"]
    const allowed = sparqlsat.replace("/sparql", `/allowed/read?actor=${encodeURIComponent(actor)}`)
    const allowedData = await session.fetch(allowed).then(i => i.json())
    return {allowedData, publicKey, verifyUrl}
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