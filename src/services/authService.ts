import { ref, get, update } from "firebase/database";
import { db as firebaseDb } from "../lib/firebase";
import type { User } from "../types";

const USERS_PATH = "users";

async function getAllUsers(): Promise<Record<string, User & { password: string }>> {
  const usersRef = ref(firebaseDb, USERS_PATH);
  const snap = await get(usersRef);
  return snap.exists() ? snap.val() : {};
}

export async function login(
  username: string,
  password: string
): Promise<(User & { firebaseId: string }) | null> {
  const users = await getAllUsers();
  for (const [id, user] of Object.entries(users)) {
    if (user.username === username && user.password === password) {
      return { ...user, id, firebaseId: id };
    }
  }
  return null;
}

export async function changePassword(
  firebaseId: string,
  newPassword: string
): Promise<void> {
  const userRef = ref(firebaseDb, `${USERS_PATH}/${firebaseId}`);
  await update(userRef, { password: newPassword });
}
