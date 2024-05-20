import dotenv from "dotenv";
import express from "express";
import * as path from 'path';
import * as proc from 'process';
import { error_handler, isEnvPropertyExist, log_actions, try_log } from './middleware/midwares.mjs';
import api_app from './routes/api.mjs';
import credit from './routes/google_credit_handler.mjs';
// ### Global Configs #####
dotenv.config({});
// ### Global Variables ####
const PATH_ROOT = proc.cwd();
const PATH_CLIENT = path.join(PATH_ROOT, '/client');
const PATH_CREDIT = path.join(PATH_CLIENT, 'client_secrets.json');
const port = Number(proc.env.PORT) || 8080;
const server = express();
server.use('/api', api_app);
server.use('/google', credit);
server.use('/public', express.static(path.join(PATH_ROOT, '/public')));
server.get('/', (request, response) => {
    response.sendFile('index.html', { root: path.join(PATH_ROOT, 'public//pages//') });
    log_actions(request, response, { mes: `${path.join(PATH_ROOT, 'public//pages//')}` });
});
server.listen(port, 'localhost', () => {
    // ### Check the .env set-up ####
    const stats = [
        `[!Settings]: `,
        `  1. LOG_GENERAL \t${isEnvPropertyExist(proc.env.LOG_GENERAL)}`,
        `  2. LOG_ERROR \t${isEnvPropertyExist(proc.env.LOG_ERROR)}`,
        `  3. CLIENT_ID \t${isEnvPropertyExist(proc.env.CLIENT_ID)}`,
        `  4. CLIENT_SECRET\t${isEnvPropertyExist(proc.env.CLIENT_SECRET)}`,
        `  5. API_KEY \t${isEnvPropertyExist(proc.env.API_KEY)}`,
    ];
    // ### Status Check ###
    console.log(`\nListening on Port ${port}!`);
    console.log(`Website: http://localhost:${port}/`);
    for (const stat_info of stats)
        console.log(stat_info);
});
server.use(try_log);
server.use(error_handler);
//# sourceMappingURL=index.mjs.map