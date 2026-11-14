import mongoose from 'mongoose';
import User from '../models/User.js';
import { text, HttpError } from './http.js';

export async function findPerson(value) {
  const id = text(value, 'Friend', 254);
  return User.findOne(mongoose.isObjectIdOrHexString(id) ? { _id: id } : { email: id.toLowerCase() }).select('_id email name friends friendRequestreceive friendRequestsend');
}

export const isFriend = (user, other) => user.friends.some((friend) =>
  friend.id === String(other._id) || friend.id === other.email || friend.email === other.email);

export async function requireFriend(user, value) {
  const friend = await findPerson(value);
  if (!friend || !isFriend(user, friend)) throw new HttpError(403, 'Add this person as a friend first');
  return friend;
}
