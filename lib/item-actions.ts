/**
 * Single source of truth for "what can this viewer do with this item right
 * now" — shared by ItemCard and the item detail screen so the two surfaces
 * can never disagree.
 */

import type { BorrowRequest, Item } from "./types";
import { calculateItemStatus } from "./utils";

export type ItemActionKind =
  | "borrow"
  | "requestNext"
  | "cancelRequest"
  | "leaveQueue"
  | "confirmPickup"
  | "confirmReturn"
  | "markReturned"
  | "none";

export interface ItemActionDescriptor {
  kind: ItemActionKind;
  label: string;
}

const ACTION_LABELS: Record<ItemActionKind, string> = {
  borrow: "Borrow",
  requestNext: "Request Next",
  cancelRequest: "Cancel Request",
  leaveQueue: "Leave Queue",
  confirmPickup: "Confirm Pickup",
  confirmReturn: "Confirm Return",
  markReturned: "Mark Returned",
  none: "",
};

function action(kind: ItemActionKind): ItemActionDescriptor {
  return { kind, label: ACTION_LABELS[kind] };
}

export function getItemAction(
  item: Item,
  viewerId: string | undefined,
  request: Pick<BorrowRequest, "id" | "status"> | null | undefined,
): ItemActionDescriptor {
  if (!viewerId) return action("none");

  // Viewer is the pending recipient of a handoff — either a fresh
  // pickup/hand-off (they're about to become the borrower) or the owner
  // reclaiming the item on a return.
  if (item.pendingRecipientId === viewerId) {
    return action(
      item.pendingRecipientId === item.userId ? "confirmReturn" : "confirmPickup",
    );
  }

  // Owner, not currently the pending recipient — management (Lend to/Edit/
  // Delete/Mark Unavailable) lives on the detail screen only.
  if (item.userId === viewerId) {
    return action("none");
  }

  // Confirmed current borrower.
  if (item.borrowedBy === viewerId) {
    // Already initiated a return/hand-off — waiting on the recipient.
    if (item.pendingRecipientId) return action("none");
    return action("markReturned");
  }

  // Prospective/queued borrower.
  if (item.pendingRecipientId) {
    // Someone else's pending pickup is in progress — nothing to do yet.
    return action("none");
  }
  if (request?.status === "pending") return action("cancelRequest");
  if (request?.status === "approved") return action("leaveQueue");

  const status = calculateItemStatus(item);
  // Owner marked it unavailable — handled separately via the notify-me
  // subscription flow (isSubscribed/onNotify), not a borrow action.
  if (status === "available" && !item.isUnavailable) return action("borrow");
  if (status === "borrowed" || status === "overdue") return action("requestNext");

  return action("none");
}
