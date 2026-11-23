import "server-only";

/** Instagram API with Unified Login uses the Facebook Graph API host. */
export const GRAPH_API_VERSION = "v27.0";
export const GRAPH_HOST = "https://graph.facebook.com";
export const GRAPH_BASE_URL = `${GRAPH_HOST}/${GRAPH_API_VERSION}`;

/** Facebook Login for Business dialog used by Instagram API with Unified Login. */
export const META_AUTHORIZE_URL = "https://www.facebook.com/dialog/oauth";
export const META_CODE_EXCHANGE_URL = `${GRAPH_BASE_URL}/oauth/access_token`;

/** Meta limit for Private Reply / DM text. */
export const DM_MAX_CHARS = 1000;
/** Button template `text` limit (Messenger Platform templates). */
export const BUTTON_TEMPLATE_TEXT_MAX = 640;
/** Button title limit. */
export const BUTTON_TITLE_MAX = 20;
/** Instagram caption/comment limit. */
export const COMMENT_MAX_CHARS = 2200;
