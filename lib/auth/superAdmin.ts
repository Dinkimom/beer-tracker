import { isStaffAdmin } from '@/lib/auth/adminsRepository';
import { findUserById } from '@/lib/auth/userRepository';

/**
 * Супер-админ продукта: строка в beer_tracker.admins (staff_uid = staff.id).
 */
export async function isProductSuperAdmin(userId: string): Promise<boolean> {
  const identity = await findUserById(userId);
  if (!identity) {
    return false;
  }
  return isStaffAdmin(identity.id);
}
