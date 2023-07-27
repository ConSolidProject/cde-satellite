import { Request, Response, NextFunction } from 'express';

function checkOwnerShip(req: Request, res: Response, next: NextFunction) {
    if (req.auth.webId === process.env.WEBID) {
      next()
    } else {
      next("Not authorized")
    }
  }
  
  
export {checkOwnerShip};