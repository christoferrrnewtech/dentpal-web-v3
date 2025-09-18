import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { WebUserPermissions, WebUserRole } from '@/types/webUser';

export type CreatePartnerInput = {
  email: string;
  name: string;
  role: WebUserRole; // typically 'seller'
  permissions: WebUserPermissions;
};

export type CreatePartnerResult = {
  uid: string;
  email: string;
  inviteLinkSent: boolean;
};

export async function createPartnerUser(data: CreatePartnerInput): Promise<CreatePartnerResult> {
  const callable = httpsCallable(functions, 'createPartnerUser');
  const res = await callable(data);
  return res.data as CreatePartnerResult;
}

export async function updatePartnerClaims(uid: string, role: WebUserRole, permissions: WebUserPermissions) {
  const callable = httpsCallable(functions, 'updatePartnerClaims');
  const res = await callable({ uid, role, permissions });
  return res.data as { success: boolean };
}

export async function disablePartnerUser(uid: string, disabled: boolean) {
  const callable = httpsCallable(functions, 'setUserDisabled');
  const res = await callable({ uid, disabled });
  return res.data as { success: boolean };
}

export async function resendInvite(email: string) {
  const callable = httpsCallable(functions, 'resendInvite');
  const res = await callable({ email });
  return res.data as { success: boolean };
}
