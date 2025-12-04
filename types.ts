export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  capabilities: string[];
  color: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVolumeState {
  input: number;
  output: number;
}
