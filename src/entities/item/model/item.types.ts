import { Ref } from '@shared/api';

export type Stage = 'orders' | 'cut' | 'cover' | 'work' | 'fg';
export type StageFilter = Stage | 'trash';
export type Warning = 'fabric' | 'cut' | 'output';
export type FabricSlot = 'main' | 'comp1' | 'comp2';

export interface ItemFabric {
  slot: FabricSlot;
  slot_label: string;
  fabric: Ref & { photo_thumb: string | null; photo: string | null };
  meters: string | null;
}

export interface Item {
  id: number;
  number: string;
  legacy_number: string;
  model: Ref | null;
  custom_name: string;
  title: string;
  extra: string;
  comment: string;
  reserve: string;
  reserved_at: string | null;
  is_free: boolean;
  stage: Stage;
  stage_label: string;
  stage_since: string;
  team: Ref | null;
  fabric_arrived_at: string | null;
  sew_at: string | null;
  cover_ready_at: string | null;
  work_at: string | null;
  indiv: boolean;
  indiv_note: string;
  due_at: string | null;
  warnings: Warning[];
  fabrics: ItemFabric[];
  manager: string;
  created_at: string;
  trashed_at: string | null;
  trash_reason: '' | 'shipped' | 'deleted' | 'cancelled';
  trash_reason_label: string;
  purge_at: string | null;
  passport_printed_at: string | null;
  changed_at: string | null;
}

export interface ItemEvent {
  id: number;
  at: string;
  user: Ref;
  item: { id: number; number: string };
  kind: string;
  kind_label: string;
  text: string;
}

export type ActionCode =
  | 'move'
  | 'fabric_arrived'
  | 'sew'
  | 'cover_ready'
  | 'ship'
  | 'return_to_work'
  | 'move_any'
  | 'reserve'
  | 'edit'
  | 'copy'
  | 'trash'
  | 'cancel'
  | 'restore';

export interface ItemAction {
  code: ActionCode;
  label: string;
  allowed: boolean;
  reason: string;
  to?: Stage;
  needs_team?: boolean;
}

export interface ItemDetail extends Item {
  events: ItemEvent[];
  actions: ItemAction[];
}

export interface StageCount {
  total: number;
  late: number;
}

export interface Counters {
  stages: Record<Stage, StageCount>;
  free: number;
  late: number;
  trash: number;
}

export interface FabricInput {
  slot: FabricSlot;
  fabric: number;
  meters: string | null;
}

export interface ItemCreate {
  model: number | null;
  custom_name: string;
  fabrics: FabricInput[];
  extra: string;
  reserve: string;
  indiv: boolean;
  indiv_note: string;
  comment: string;
  qty: number;
}

export type ItemUpdate = Partial<Omit<ItemCreate, 'reserve' | 'qty'>>;

export interface ItemListParams {
  stage?: StageFilter;
  q?: string;
  model?: string;
  free?: boolean;
  reserved?: boolean;
  indiv?: boolean;
  late?: boolean;
  limit?: number;
  offset?: number;
}
