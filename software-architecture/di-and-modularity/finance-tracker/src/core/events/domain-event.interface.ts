export interface DomainEvent {
  name: string;
  payload: { householdId: number } & Record<string, unknown>;
}
