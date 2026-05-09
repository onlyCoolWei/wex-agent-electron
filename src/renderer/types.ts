export type ChatItem = {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
  tone?: 'error' | 'muted';
};

export type ProjectItem = {
  id: string;
  name: string;
  path: string;
};
