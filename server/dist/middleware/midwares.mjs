var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import styles from 'ansi-styles';
import dotenv from 'dotenv';
import * as proc from 'process';
import { apiError } from '../middleware/apiError.mjs';
dotenv.config({});
var http_method_colors = {
    'GET': styles.green.open,
    'POST': styles.yellow.open,
    'DELETE': styles.red.open
};
/**
 * Get time at current process.
 * @returns retuns time stamp
 */
function get_time() {
    const date = new Date();
    const hour = date.getHours();
    const mins = date.getMinutes();
    const secs = date.getSeconds();
    const time_info = proc.env.LOG_TIME === 'y' ? `${("0" + hour).slice(-2)}:${("0" + mins).slice(-2)}:${("0" + secs).slice(-2)}` : ``;
    return time_info;
}
/**
 * Checks if .env variable exist
 * @param variable The variable in .env you want to confirm exist
 * @returns {string} String represent the state of the variable
 */
export const isEnvPropertyExist = (variable) => {
    let color = styles.magenta.open;
    switch (variable) {
        case undefined:
            color = styles.yellow.open;
            break;
        case '1':
        case 'Y':
        case 'y':
            color = styles.green.open;
            break;
        case '0':
        case 'N':
        case 'n':
            color = styles.red.open;
            break;
    }
    return `${color}${variable}${styles.color.close}`;
};
/**
 * Logs the actions of a function
 * @param {Request} req     the requested data
 * @param {Response} res    the response of the function
 * @param {string} mes  custom made message by the function
 * @param {number} tab  number of tabs
 */
export function log_actions(req, res, options) {
    var _a, _b;
    // if not logging gen
    switch (proc.env.LOG_GENERAL) {
        case '0':
        case 'N':
        case 'n':
            return;
    }
    const method = req.method;
    const color_code = http_method_colors;
    const logging_data = `${get_time()} | ${http_method_colors[`${method}`]}${method} ${styles.color.close}${req.originalUrl.toString()}`;
    // ### Tabs to separate chain of command
    var tab_chars = ' ';
    if (typeof options !== undefined) {
        const length = (_a = options === null || options === void 0 ? void 0 : options.tab) !== null && _a !== void 0 ? _a : 0;
        for (var steps = 0; steps < length + 1; steps++) {
            tab_chars = tab_chars + '  ';
        }
    }
    const head_style = `${http_method_colors[`${method}`]}${tab_chars}`;
    console.log(logging_data);
    switch (method) {
        case 'GET':
            console.log(`${get_time()} | ${head_style}└─╢ RES: ${styles.color.close}${(_b = options === null || options === void 0 ? void 0 : options.mes) !== null && _b !== void 0 ? _b : req.url}`);
            break;
        case 'POST':
            console.log(`${get_time()} | ${head_style}└─╢ REQ: ${styles.color.close}===============|`);
            console.table(req.body);
            break;
        case 'DELETE':
            console.log(`${get_time()} | ${head_style}└─╢ DEL: ${styles.white}---------------|`);
            console.log(req.body);
            break;
        default:
            console.log("ERROR");
            break;
    }
}
/**
 * Handles errors made by the server via return appropriate responses of 400s
 * @param {Error} error Error caused
 * @param {Request} req Request
 * @param {Response} res Response
 * @param {NextFunction} next Next function down the script
 * @returns {Response} Returns an error response
 */
export function error_handler(error, req, res, next) {
    const method = req.method;
    // Take note, 'y'es or 'n'o values only
    const head_style = `${http_method_colors[method]}`;
    var error_mes = `${get_time()} ${styles.redBright.open}[!]: SERVER ERROR${styles.color.close}`;
    console.log(`${get_time()} | ${styles.yellow.open}${req.baseUrl} ${head_style}`);
    if (process.env.LOG_ERR == 'y') {
        error_mes = `\t ${styles.red.open}└─╢ ERR (${error.name}): ${styles.color.close}${error.stack}\n`;
        console.log(error_mes);
        console.log(error.message);
    }
    res.status(400);
    if (error instanceof apiError) {
        return res.send(`${error.name} ${error.message}`);
    }
    //console.log(error_mes);
    switch (error.name) {
        case 'ERR_INVALID_ARG_TYPE':
            return res.send('No input');
        case 'ENOENT':
            return res.send('Bad input address');
    }
    return res.send('Unknown Server Error');
}
/**
 * Tries to redirect a function error a error handler.
 * @param controller
 * @returns
 */
export const try_redirect = (controller) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield controller(req, res);
    }
    catch (err) {
        console.log(typeof err);
        console.error(err);
        next(err);
    }
});
export const try_log = (req, res, next) => {
    log_actions(req, res);
    next();
};
/**
 * Wraps the result generic on the promise for better error handling.
 * @param awaiting_process
 * @returns The result generic of the promise.
 */
export function get_result(awaiting_process) {
    return __awaiter(this, void 0, void 0, function* () {
        // Reference: https://stackoverflow.com/questions/63783735/type-error-on-response-of-promise-allsettled
        try {
            const resulted_response = yield Promise.allSettled([awaiting_process]);
            const data = resulted_response
                .filter(({ status }) => status === "fulfilled")
                .map((x) => x.value);
            if (resulted_response.find((res) => res.status === 'fulfilled'))
                return { ok: true, value: data };
            const reasons = resulted_response
                .filter(({ status }) => status === "rejected")
                .map((x) => x.reason);
            if (proc.env.LOG_MID)
                console.log(resulted_response);
            return { ok: false, error: reasons };
        }
        catch (e) {
            if (proc.env.LOG_MID)
                console.log(e);
            if (typeof e === "string") {
                e.toUpperCase();
            }
            return { ok: false, error: e };
        }
    });
}
//# sourceMappingURL=midwares.mjs.map