-- Push now goes straight to APNs / FCM. Expo push tokens can no longer be
-- delivered to; the apps re-register their native device tokens on launch.
DELETE FROM push_tokens WHERE token LIKE 'ExponentPushToken[%' OR token LIKE 'ExpoPushToken[%';
