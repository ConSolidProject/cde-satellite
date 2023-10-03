import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites } from '../functions/consolid';
import { getAccessRights, sign } from '../functions/signature';
import { loadTurtle, loadUrl, validate } from '../functions/validate';
import jws from 'jws';
import fs from "fs"

const dataset = "D:/Documents/Code/PhD/infrastructure/cde-satellite/demo/resources/duplex/duplex_hvac.ttl"
const shapeSet = "D:/Documents/Code/PhD/infrastructure/cde-satellite/demo/resources/shapes/icdd.ttl"
const {QueryEngine} = require('@comunica/query-sparql')

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
    let report
    let data, shapes
    if (req.body.shapeUrl && req.body.dataUrl) { 
      shapes = await loadUrl(req.body.shapeUrl)
      data = await loadUrl(req.body.dataUrl)
    } else if (req.body.shapeGraph && req.body.dataGraph) {
      shapes = await loadTurtle(req.body.shapeGraph)
      data = await loadTurtle(req.body.dataGraph)
    } else {
      res.send('not implemented')
    }

    report = await validate(data, shapes)

    res.status(200).send(report)
  }
}


export default VaultController; 