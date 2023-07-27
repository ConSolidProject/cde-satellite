import { Request, Response } from 'express';
import { findAllPendingNotifications, findPendingNotificationsByTopic, findSolidLDNInbox } from '../functions/notifications';
import { Catalog } from 'consolid-daapi';
import { v4 } from 'uuid';
import { validatorFunctions } from '../validators';

const InboxController = {
    async postMessage(req: Request, res: Response) {
        const inbox = await findSolidLDNInbox(session.info.webId)
        if (!inbox) {
            res.status(404).send("No inbox found")
        } else {
            const cat = new Catalog(session, inbox)
            const messageId = v4()
            const messageUrl = inbox + messageId
            const messageContent = req.body.message
            const messageType: string = req.body.type

            if (!messageType || !messageContent) {
                res.status(400).send("Message type and content are required")
            }

            if (!Object.keys(validatorFunctions).includes(messageType)) {
                res.status(400).send("Message type is not valid. The valid message types are: " + Object.keys(validatorFunctions).join(", "))
            }
            
            const validator = validatorFunctions![messageType].function
            const valid = await validator(messageContent)
            if (!valid) {
                res.status(400).send("Message is not valid. The valid message types and their related shapes are: " + Object.keys(validatorFunctions).map(k => k + ": " + validatorFunctions[k].shape).join(", "))
            }

            await cat.dataService.writeFileToPod(Buffer.from(messageContent), messageUrl, false, "text/turtle")
        }
    },

    async getMessages(req: Request, res: Response) {
        const inbox = await findSolidLDNInbox(session.info.webId)
        if (!inbox) {
            res.status(404).send("No inbox found")
        } else {
            let messages
            if (req.query.topic) {
                messages = await findPendingNotificationsByTopic(req.auth.webId, req.query['topic'] as string)
            } else {
                messages = await findAllPendingNotifications(req.auth.webId)
            }
            res.status(200).send(messages)
        }
    }
};





export default InboxController;