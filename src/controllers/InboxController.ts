import { Request, Response } from 'express';
import { findAllPendingNotifications, findPendingNotificationsByTopic, findSolidLDNInbox } from '../functions/notifications';
import { Catalog } from 'consolid-daapi';
import { v4 } from 'uuid';
import { validatorFunctions } from '../validators';
import { messageFunctions } from '../messageTypes';

const InboxController = {
    async postMessage(req: Request, res: Response) {
        const inbox = await findSolidLDNInbox(session.info.webId)
        if (!inbox) {
            res.status(404).send("No inbox found")
        } else {
            const cat = new Catalog(session, inbox)
            const messageId = req.headers.slug ? req.headers.slug : v4()
            const messageUrl = inbox + messageId
            const messageContent = req.body.message
            const messageType: string = req.body.type


            console.log('req.body.type :>> ', req.body.type);
            if (!messageType || !messageContent) {
                return res.status(400).send("Message type and content are required")
            }

            if (!Object.keys(validatorFunctions).includes(messageType)) {
                return res.status(400).send("Message type is not valid. The valid message types are: " + Object.keys(validatorFunctions).join(", "))
            }
            
            const validator = validatorFunctions![messageType].function
            const valid = await validator(messageContent)
            console.log('valid :>> ', valid);
            if (!valid) {
                return res.status(400).send("Message is not valid. The valid message types and their related shapes are: " + Object.keys(validatorFunctions).map(k => k + ": " + validatorFunctions[k].shape).join(", "))
            }

            await cat.dataService.writeFileToPod(Buffer.from(messageContent), messageUrl, false, "text/turtle")
            return res.status(200).send("Message received")
        } 
    },
 
    async getMessages(req: Request, res: Response) {
        const inbox = await findSolidLDNInbox(session.info.webId)
        if (!inbox) {
            res.status(404).send("No inbox found")
        } else {
            let messages 
            if (req.query.unread) {
                if (req.query.topic) {
                    messages = await findPendingNotificationsByTopic(req.auth.webId, req.query['topic'] as string)
                    console.log('messages :>> ', messages);
                } else {
                    messages = await findAllPendingNotifications(req.auth.webId)
                }
            res.status(200).send(messages)
        }}
    }, 

    async sendMessage(req: Request, res: Response) {
        try {
            if (req.body.type && Object.keys(messageFunctions).includes(req.body.type)) {
                await messageFunctions[req.body.type].function(req.body)
                res.status(200).send("Message sent")
            } else {
                res.status(400).send("Message type is required. Default messages are not supported yet.")
            }
        } catch (error) {
            if (error instanceof Error) {
                res.status(500).send(error!.message)
            } else {
                res.status(500).send("Unknown error")
            }
        }

    }

};





export default InboxController;