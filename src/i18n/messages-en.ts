// English messages: the source of truth for keys (and their types).
import common from "../../messages/en/common.json";
import header from "../../messages/en/header.json";
import map from "../../messages/en/map.json";
import pins from "../../messages/en/pins.json";
import comments from "../../messages/en/comments.json";
import media from "../../messages/en/media.json";
import moderation from "../../messages/en/moderation.json";
import notifications from "../../messages/en/notifications.json";
import profile from "../../messages/en/profile.json";
import users from "../../messages/en/users.json";
import auth from "../../messages/en/auth.json";
import admin from "../../messages/en/admin.json";
import pages from "../../messages/en/pages.json";

export const enMessages = { common, header, map, pins, comments, media, moderation, notifications, profile, users, auth, admin, pages };

export type Messages = typeof enMessages;
