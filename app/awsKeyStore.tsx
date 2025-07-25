let secretKeyId = '';
let secretKey = '';

export function setAwsKeys(id: string, key: string) {
  secretKeyId = id;
  secretKey = key;
}

export function getAwsKeys() {
  return { secretKeyId, secretKey };
}