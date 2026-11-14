import User from '../models/User.js';
import { emailAddress, HttpError } from '../utils/http.js';

export async function googleProfileUser(profile) {
  const verified = profile.emails?.find((item) => item.verified === true);
  if (!verified) throw new HttpError(401, 'Google email is not verified');
  const email = emailAddress(verified.value);
  return User.findOneAndUpdate({ email }, { $setOnInsert: { email, name: profile.displayName } }, { upsert: true, new: true });
}
