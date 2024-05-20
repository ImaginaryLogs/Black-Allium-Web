import dotenv from "dotenv";
import express, { Express, NextFunction, Request, Response } from "express";
import { access } from "fs";
import { google } from 'googleapis';
import { oauth2 } from "googleapis/build/src/apis/oauth2/index.js";
import * as def from '../etc/types.mjs';
import { error_handler, try_redirect } from "../middleware/midwares.mjs";

// OAuth Authentication Software
const scopes = ['https://www.googleapis.com/auth/calendar']
const cookie_names = [ 'access_token', 'refresh_token', 'id_token', 'scope', 'token_type']
const credit_router = express.Router();
export const OAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, 
    process.env.CLIENT_SECRET, 
    process.env.REDIRECT_URL
)


/**
 * 
 * @param req Request Incoming data
 * @param res Outgoing response
 * @param next Next part of the script
 */
export async function GetOAuthURL(request: Request, response: Response, next: NextFunction){
    

    const url = OAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent",
        response_type: "code",
    })
    
    response.redirect(url);
}

/**
 * Sets the cookies from the google redirect to localstorage cookies.
 * @param req Requested incoming data
 * @param res Outgoing response
 */
async function OAuthRedirect(req: Request, res: Response){
    const code = req.query.code as string;
    const tokens = (await OAuth2Client.getToken(code)).tokens;

    OAuth2Client.setCredentials(tokens)

	const token_settings: def.cookie_holder = { maxAge: tokens.expiry_date as number, httpOnly: true };

	res.cookie("access_token", tokens.access_token as string, token_settings);
	res.cookie("refresh_token", tokens.refresh_token as string, token_settings);
	res.cookie("scope", tokens.scope as string, token_settings);
	res.cookie("token_type", tokens.token_type as string, token_settings);
    res.cookie("id_token", tokens.id_token as string, token_settings);
    res.cookie("expiry_date", tokens.expiry_date, token_settings);

	//res.cookie('expiry_date', tokens.expiry_date, token_settings)
    res.writeHead(200);
    res.write(`[!] Logged In!\n - A: ${tokens.access_token as string}\n - R: ${tokens.refresh_token as string}\n - S: ${tokens.scope as string}\n - T: ${tokens.token_type as string}\n - I: ${tokens.id_token as string}`);
    res.end();
}

/**
 * 
 * @param req Incoming Request
 * @returns Cookies from the browswer
 */
export function GetOAuthCookies(req: Request): {[key: string]: any} {
    // Credentials to send
	var credentials: {[key: string]: any} = {}
	
	// Get the credits and and assign it 
	for (const cookieName of cookie_names)
		credentials[cookieName] = req.cookies[cookieName];
    
    console.log(credentials)

    return credentials;
}

/**
 * Reads any of local storage's cookies.
 * @param req Requested incoming data
 * @param res Outgoing response
 */
function ReadOAuthCookies(req: Request, res: Response){
	var credentials = GetOAuthCookies(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write("Sending " + JSON.stringify(credentials));
    res.end();
}

credit_router.use('/login', try_redirect(GetOAuthURL));

credit_router.use('/credit_read', try_redirect(ReadOAuthCookies));

credit_router.use('/redirect', try_redirect(OAuthRedirect));

export default credit_router;