export interface BackupCopy {
  stamp: string;
  at: string;
  db_size: number;
  media_size: number | null;
  note: string;
}

export interface BackupState {
  state: 'idle' | 'backup' | 'restore' | string;
  text: string;
  since: string;
}

export interface BackupHistoryRow {
  at: string;
  action: 'backup' | 'restore' | string;
  ok: boolean;
  stamp: string;
  by: string;
  text: string;
}

export interface BackupOverview {
  copies: BackupCopy[];
  state: BackupState;
  queued: string[];
  alive: boolean;
  alerts: string[];
  history: BackupHistoryRow[];
  at: string;
  keep_days: number;
}

export type BackupPart = 'db' | 'media';
