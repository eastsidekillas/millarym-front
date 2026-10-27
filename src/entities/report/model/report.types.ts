export type ParamType = 'text' | 'bool' | 'date' | 'models';

export interface ReportParam {
  name: string;
  label: string;
  type: ParamType;
  required: boolean;
  placeholder: string;
}

export interface ReportInfo {
  kind: string;
  title: string;
  description: string;
  params: ReportParam[];
}

export interface ReportColumn {
  key: string;
  title: string;
  kind: 'text' | 'number' | 'photos';
}

export interface ReportRow {
  item_id: number;
  number: string;
  cells: Record<string, string>;
  photos: { name: string; url: string | null }[];
  mark: '' | 'warn' | 'crit';
  group: string;
  /** Фото модели — в заголовке группы, одно на всю группу (свободные остатки). */
  group_photo: { name: string; url: string | null } | null;
}

export interface ReportResult {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: { title: string; rows: [string, string][] }[];
  total: number;
  filename: string;
}

export interface ModelCount {
  id: number | 'custom';
  name: string;
  count: number;
}
