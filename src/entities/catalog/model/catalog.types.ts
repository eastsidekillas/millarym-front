import { Ref } from '@shared/api';

export interface Category extends Ref {
  sort: number;
  active: boolean;
  models_count: number;
  used: number;
}

export interface ProductModel extends Ref {
  category: number;
  category_name: string;
  photo: string | null;
  photo_thumb: string | null;
  photo_jpeg: string | null;
  active: boolean;
  kit_options: string[];
  in_work: number;
  used: number;
}

export interface Fabric extends Ref {
  photo: string | null;
  photo_thumb: string | null;
  photo_jpeg: string | null;
  active: boolean;
  created_at: string;
  in_work: number;
  used: number;
}

export interface FabricQuery {
  search?: string;
  active?: boolean | null;
  ordering?: 'name' | '-in_work' | '-created_at';
  limit?: number;
  offset?: number;
}

export interface KitOption extends Ref {
  sort: number;
  active: boolean;
  used: number;
}

export interface Team extends Ref {
  foreman: string;
  sort: number;
  active: boolean;
  used: number;
}

export interface Deadlines {
  fabric_days: number;
  cut_days: number;
  output_days: number;
  trash_days: number;
}

export type SimpleRefKind = 'categories' | 'kit-options' | 'teams';
export type SimpleRef = Category | KitOption | Team;
export interface SimpleRefBody {
  name?: string;
  sort?: number;
  foreman?: string;
  active?: boolean;
}

export interface CatalogImportSheet {
  title: string;
  created: string[];
  updated: string[];
  unchanged: number;
  errors: string[];
  skipped: string;
}

export interface CatalogImport {
  applied: boolean;
  has_errors: boolean;
  foreign: boolean;
  sheets: CatalogImportSheet[];
}
