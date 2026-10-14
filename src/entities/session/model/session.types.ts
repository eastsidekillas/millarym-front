export type RightCode =
  | 'move_orders_cut'
  | 'move_cut_cover'
  | 'move_cover_work'
  | 'move_work_fg'
  | 'ship'
  | 'trash'
  | 'restore'
  | 'return_to_work'
  | 'move_any'
  | 'marks'
  | 'edit'
  | 'reserve';

export interface Me {
  id: number;
  username: string;
  email: string;
  last_name: string;
  first_name: string;
  short_name: string;
  role: string;
  groups: string[];
  rights: RightCode[];
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}
