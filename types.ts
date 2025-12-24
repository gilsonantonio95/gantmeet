
export interface Message {
  id: string;
  sender: 'professor' | 'aluno';
  text: string;
  timestamp: Date;
}

export enum CallState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE'
}
