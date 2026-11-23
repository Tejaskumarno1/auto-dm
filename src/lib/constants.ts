export const APP_NAME = "AutoDM";
export const REPO_URL = "https://github.com/ilramdhan/auto-dm";

/** Meta limits for Instagram comment and messaging APIs. */
export const DM_MAX_CHARS = 1000;
export const COMMENT_REPLY_MAX_CHARS = 2200;
export const DM_BUTTON_TITLE_MAX = 20;

export const PASSWORD_MIN_LENGTH = 12;

/** Follow gate (button template text limit is 640). */
export const FOLLOW_GATE_TEXT_MAX = 640;
export const DEFAULT_FOLLOW_GATE_MESSAGE =
  "Hey {username}! Follow this account first, then tap the button below to get your link.";
export const DEFAULT_FOLLOW_GATE_BUTTON_TITLE = "I've followed";
export const DEFAULT_FOLLOW_GATE_RETRY_MESSAGE =
  "You haven't followed yet. Please follow this account, then tap the button below again to get your link.";
/** Postback payload prefix for follow gate buttons: `fg:<deliveryId>`. */
export const FOLLOW_GATE_PAYLOAD_PREFIX = "fg:";
