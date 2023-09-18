import { Request, Response, NextFunction } from 'express';

function checkOwnership(req: Request, res: Response, next: NextFunction) {
  console.log('req.auth.webId :>> ', req.auth.webId);
  console.log('process.env.WEBID :>> ', process.env.WEBID);
    if (req.auth.webId === process.env.WEBID) {

      next()
    } else {
      next("Not authorized")
    }
  } 
  
   
export {checkOwnership};