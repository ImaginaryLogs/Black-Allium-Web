export interface cookie_holder {
    [updatedKey: string]: any;
}

export const default_setting = {
    markdown_path: '',
    web: { '--bg': '#080808', '--text': 'white' },
};

export const default_credits: cookie_holder = {
    'access_token': '',
    'refresh_token': '',
    'id_token': '',
    'scope': '',
    'token_type': '',
}