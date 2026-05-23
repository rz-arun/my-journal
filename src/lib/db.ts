import Dexie, { type Table } from 'dexie';
import type { DateStr } from './date';

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  tagIds: string[];
  createdAt: number;
  archivedAt: number | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Completion {
  habitId: string;
  date: DateStr;
  completedAt: number;
}

export interface DayNote {
  date: DateStr;
  text: string;
  updatedAt: number;
}

export interface AdHocTodo {
  id: string;
  date: DateStr;
  text: string;
  done: boolean;
  doneAt: number | null;
}

class JournalDB extends Dexie {
  habits!: Table<Habit, string>;
  tags!: Table<Tag, string>;
  completions!: Table<Completion, [string, DateStr]>;
  dayNotes!: Table<DayNote, DateStr>;
  adHocTodos!: Table<AdHocTodo, string>;

  constructor() {
    super('myjournal');
    this.version(1).stores({
      habits: 'id, archivedAt, sortOrder',
      tags: 'id',
      completions: '[habitId+date], date, habitId',
      dayNotes: 'date',
      adHocTodos: 'id, date'
    });
  }
}

export const db = new JournalDB();
