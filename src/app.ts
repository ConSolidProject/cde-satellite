import express from 'express';
import routes from './routes';
import {extractWebId,setSatellite} from 'express-solid-auth-wrapper'
import './extensions'
import { generateFetch } from './auth';

const app = express();

app.use(express.json());
app.use(extractWebId)

for (const route of routes) {
  app.use(route);
}

app.listen(process.env.PORT, async () => {
  console.log('Server listening on port ' + process.env.PORT);

  if (process.env.EMAIL && process.env.PASSWORD && process.env.IDP) {
    const authFetch = await generateFetch(process.env.EMAIL, process.env.PASSWORD, process.env.IDP)
    globalThis.session = {info: {webId: process.env.WEBID!, isLoggedIn: true}, fetch: authFetch};
  }
});
