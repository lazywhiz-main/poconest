export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface TodoFormData {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
} 