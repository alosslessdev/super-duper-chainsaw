let secretKeyId = '';
let secretKey = '';
let sessionCookie = '';

export function setAwsKeys(id: string, key: string, cookie: string) {
  secretKeyId = id;
  secretKey = key;
  sessionCookie = cookie;
}

export function getAwsKeys() {
  return { secretKeyId, secretKey, sessionCookie };
}