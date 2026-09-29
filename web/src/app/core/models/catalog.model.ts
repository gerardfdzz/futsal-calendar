export interface Discipline {
  readonly id: string;
  readonly name: string;
}

export interface Competition {
  readonly id: string;
  readonly name: string;
}

export interface Group {
  readonly id: string;
  readonly name: string;
}

export interface TeamOption {
  readonly id: string;
  readonly name: string;
  readonly crest?: string;
}

export interface GroupContext {
  readonly discipline: Discipline;
  readonly competition: Competition;
  readonly group: Group;
}
