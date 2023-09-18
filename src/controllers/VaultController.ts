import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites } from '../functions/consolid';
import { getAccessRights, sign } from '../functions/signature';
import jws from 'jws';

const VaultController = {
  async getAccessCertificate(req: Request, res: Response) {
    const {allowedData, publicKey, verifyUrl} = await getAccessRights(req.auth.webId)
    const signature = await sign(allowedData, publicKey, verifyUrl, req.auth.webId)
    return res.status(200).send({token: signature})
  },
  async verify(req: Request, res: Response) {
    const token = req.body.token
    const decoded = jws.decode(token)
    const payload = JSON.parse(decoded.payload)
    const issuer = payload.issuer
    const publicKeyUrl = payload.publicKey
    if (publicKeyUrl.includes(issuer.replaceAll("/profile/card#me", ""))) {
        try {
            const publicKey = await fetch(payload.publicKey).then(i => i.text())
            const valid = jws.verify(token, decoded.header.alg, publicKey)
            return res.status(200).send({valid, payload })
        } catch (error) {
            return res.status(400).send(error)
        }
    } else {
        return res.status(400).send("could not verify token")
    } 
  },
  async validate(req: Request, res: Response) {
    res.send("not implemented")
  }
}

export default VaultController; 