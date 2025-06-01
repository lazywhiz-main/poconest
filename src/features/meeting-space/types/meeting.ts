export type UploadedFile = {
  id: string;
  type: 'txt' | 'video' | 'audio';
  url: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

export type Meeting = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  participants: { id: string; name: string }[];
  uploadedFiles: UploadedFile[];
  recordingUrl?: string;
  transcript?: string;
  aiSummary?: string;
  created_at: string;
  updated_at: string;
};

export type ActionItem = {
  id: string;
  content: string;
  assignee: string;
  deadline?: string;
  status: 'pending' | 'done';
  createdAt: string;
  updatedAt: string;
};

export type KeyPoint = {
  id: string;
  content: string;
  timestamp: number;
  importance: number;
};

export type MeetingTopic = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  keyPoints: KeyPoint[];
  sentiment: string;
}; 