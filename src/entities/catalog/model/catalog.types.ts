import { Ref } from '@shared/api';

export interface ProductModel extends Ref {
  category: number;
  category_name: string;
  photo: string | null;
  photo_thumb: string | null;
  active: boolean;
}

export interface Fabric extends Ref {
  photo: string | null;
  photo_thumb: string | null;
  active: boolean;
  created_at: string;
  in_work: number;
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
}

export interface Team extends Ref {
  foreman: string;
  active: boolean;
}
