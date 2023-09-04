import { Request, Response } from 'express';
import { inviteToProject, informOfAggregation } from '../functions/notifications';

interface IMessageType {
  [key: string]: {
      function: (body: any) => Promise<boolean>
  };
}

export const messageFunctions: IMessageType = {
  "projectInvite": {function: projectInvite},
  "projectAggregation": {function: projectAggregation} 
}

export async function projectAggregation(body: any) {
  if (!body.localUrl || !body.remoteUrl || !body.to ) {
    throw new Error('Missing parameters "projectId" or "to" or both.')
  }
  await informOfAggregation(session.info.webId, body.to, body.localUrl, body.remoteUrl)
  return true
}


export async function projectInvite(body: any) {
    if (!body.projectId || !body.to ) {
      throw new Error('Missing parameters "projectId" or "to" or both.')
    }
    await inviteToProject(session.info.webId, body.to, body.projectId)
    return true
  }