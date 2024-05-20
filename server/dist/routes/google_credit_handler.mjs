var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { google } from 'googleapis';
import { try_redirect } from "../middleware/midwares.mjs";
// OAuth Authentication Software
const scopes = ['https://www.googleapis.com/auth/calendar'];
const cookie_names = ['access_token', 'refresh_token', 'id_token', 'scope', 'token_type'];
const credit_router = express.Router();
export const OAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URL);
/**
 *
 * @param req Request Incoming data
 * @param res Outgoing response
 * @param next Next part of the script
 */
export function GetOAuthURL(request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = OAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            prompt: "consent",
            response_type: "code",
        });
        response.redirect(url);
    });
}
/**
 * Sets the cookies from the google redirect to localstorage cookies.
 * @param req Requested incoming data
 * @param res Outgoing response
 */
function OAuthRedirect(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const code = req.query.code;
        const tokens = (yield OAuth2Client.getToken(code)).tokens;
        OAuth2Client.setCredentials(tokens);
        const token_settings = { maxAge: tokens.expiry_date, httpOnly: true };
        res.cookie("access_token", tokens.access_token, token_settings);
        res.cookie("refresh_token", tokens.refresh_token, token_settings);
        res.cookie("scope", tokens.scope, token_settings);
        res.cookie("token_type", tokens.token_type, token_settings);
        res.cookie("id_token", tokens.id_token, token_settings);
        res.cookie("expiry_date", tokens.expiry_date, token_settings);
        //res.cookie('expiry_date', tokens.expiry_date, token_settings)
        res.writeHead(200);
        res.write(`[!] Logged In!\n - A: ${tokens.access_token}\n - R: ${tokens.refresh_token}\n - S: ${tokens.scope}\n - T: ${tokens.token_type}\n - I: ${tokens.id_token}`);
        res.end();
    });
}
/**
 *
 * @param req Incoming Request
 * @returns Cookies from the browswer
 */
export function GetOAuthCookies(req) {
    // Credentials to send
    var credentials = {};
    // Get the credits and and assign it 
    for (const cookieName of cookie_names)
        credentials[cookieName] = req.cookies[cookieName];
    console.log(credentials);
    return credentials;
}
/**
 * Reads any of local storage's cookies.
 * @param req Requested incoming data
 * @param res Outgoing response
 */
function ReadOAuthCookies(req, res) {
    var credentials = GetOAuthCookies(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write("Sending " + JSON.stringify(credentials));
    res.end();
}
credit_router.use('/login', try_redirect(GetOAuthURL));
credit_router.use('/credit_read', try_redirect(ReadOAuthCookies));
credit_router.use('/redirect', try_redirect(OAuthRedirect));
export default credit_router;
//# sourceMappingURL=google_credit_handler.mjs.map