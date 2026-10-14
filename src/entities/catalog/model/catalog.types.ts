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
}

export interface KitOption extends Ref {
  sort: number;
  active: boolean;
}

export interface Team extends Ref {
  foreman: string;
  active: boolean;
}
