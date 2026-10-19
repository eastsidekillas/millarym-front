import { Ref } from '@shared/api';

export interface Choice {
  id: string;
  name: string;
}

export interface ClaimChoices {
  claim_type: Choice[];
  defect_type: Choice[];
  sender: Choice[];
  state: Choice[];
}

export type ClaimState = 'open' | 'done' | 'withdrawn';

export interface ClaimPhoto {
  id: number;
  photo: string;
  photo_thumb: string | null;
  created_at: string;
}

export interface ClaimListItem {
  id: number;
  number: string;
  act_date: string | null;
  created_at: string;
  manager: Ref | null;
  counterparty: string;
  product: string;
  item_number: string;
  description: string;
  claim_type: string;
  claim_type_label: string;
  defect_type: string;
  defect_type_label: string;
  photos_count: number;
  state: ClaimState;
  state_label: string;
  closed_at: string | null;
}

export interface ClaimFields {
  act_date: string | null;
  manager: number | null;
  counterparty: string;
  item: number | null;
  product: string;
  item_number: string;
  color: string;
  part: string;
  description: string;
  package_data: string;
  waybill: string;
  sender: string;
  invoice_price: string | null;
  customer_shipped_at: string | null;
  demands: string;
  claim_type: string;
  arrived_at: string | null;
  kit: string;
  sent_back_at: string | null;
  appearance: string;
  research: string;
  defect_type: string;
  remedy: string;
  restore_cost: string | null;
  finance_note: string;
}

export interface Claim extends Omit<ClaimFields, 'manager' | 'item'> {
  id: number;
  number: string;
  manager: Ref | null;
  item: { id: number; number: string; available: boolean } | null;
  claim_type_label: string;
  defect_type_label: string;
  sender_label: string;
  state: ClaimState;
  state_label: string;
  closed_at: string | null;
  closed_by: Ref | null;
  close_note: string;
  photos: ClaimPhoto[];
  created_at: string;
  created_by: Ref;
  updated_at: string;
  updated_by: Ref;
}

export interface CountRow extends Choice {
  count: number;
}

export interface ClaimStats {
  total: number;
  defect_type: CountRow[];
  claim_type: CountRow[];
  state: CountRow[];
}

export interface ClaimQuery {
  q?: string;
  claim_type?: string;
  defect_type?: string;
  state?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
