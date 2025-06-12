import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
// import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import theme from '../../../../styles/theme';
import MiniCalendar from '../../../../components/ui/MiniCalendar';
import CommonButton from '../../../../components/CommonButton';
import TimeSelect from '../../../../components/ui/TimeSelect';

interface MeetingFormProps {
  onSubmit: (meetingData: MeetingFormData) => void;
  onCancel: () => void;
  droppedFile?: File | null;
}

export interface MeetingFormData {
  title: string;
  date: Date;
  participants: string[];
  notes: string;
  transcript: string;
}

const MeetingForm: React.FC<MeetingFormProps> = ({ onSubmit, onCancel, droppedFile }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [participants, setParticipants] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [dateTimeInput, setDateTimeInput] = useState(formatDateTime(date));
  const [error, setError] = useState<string | null>(null);

  // ドロップされたファイルを処理
  React.useEffect(() => {
    if (droppedFile) {
      const processDroppedFile = async () => {
        try {
          if (droppedFile.type === 'text/plain') {
            const text = await droppedFile.text();
            setTranscript(text);
            setUploadFileName(droppedFile.name);
            if (!title) {
              // ファイル名からタイトルを生成（拡張子を除く）
              const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, '');
              setTitle(nameWithoutExt);
            }
          } else if (droppedFile.type.startsWith('video/') || droppedFile.type.startsWith('audio/')) {
            setUploadFileName(droppedFile.name);
            setTranscript('音声/動画ファイルから自動的に文字起こしが生成されます。');
            if (!title) {
              const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, '');
              setTitle(nameWithoutExt);
            }
          } else if (droppedFile.type === 'application/pdf') {
            setUploadFileName(droppedFile.name);
            setTranscript('PDFファイルからテキストが抽出されます。');
            if (!title) {
              const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, '');
              setTitle(nameWithoutExt);
            }
          }
        } catch (error) {
          console.error('ファイル処理エラー:', error);
          setError('ファイルの処理中にエラーが発生しました。');
        }
      };
      processDroppedFile();
    }
  }, [droppedFile, title]);

  // 日時のフォーマット・パース
  function pad(n: number) { return n.toString().padStart(2, '0'); }
  function formatDateTime(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function parseDateTime(str: string): Date | null {
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
    return isNaN(d.getTime()) ? null : d;
  }

  // 入力欄・カレンダー・タイムピッカーの双方向同期
  const handleDateTimeInputChange = (text: string) => {
    setDateTimeInput(text);
    const d = parseDateTime(text);
    if (d) setDate(d);
  };
  const handleCalendarChange = (d: Date) => {
    const newDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), date.getHours(), date.getMinutes());
    setDate(newDate);
    setDateTimeInput(formatDateTime(newDate));
  };
  const handleTimeChange = (t: { hour: number; minute: number }) => {
    const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), t.hour, t.minute);
    setDate(newDate);
    setDateTimeInput(formatDateTime(newDate));
  };

  const handleSubmit = () => {
    const d = parseDateTime(dateTimeInput);
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!d) {
      setError('日時を正しい形式で入力してください');
      return;
    }
    if (!transcript.trim()) {
      setError('文字起こしファイルをアップロードしてください');
      return;
    }
    setError(null);
    onSubmit({
      title,
      date: d,
      participants,
      notes,
      transcript,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.txt')) {
      alert('テキストファイル（.txt）のみアップロード可能です');
      return;
    }
    const text = await file.text();
    setTranscript(text);
    setUploadFileName(file.name);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>タイトル</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="ミーティングのタイトルを入力"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>日時</Text>
        <TextInput
          style={styles.input}
          value={dateTimeInput}
          onChangeText={handleDateTimeInputChange}
          placeholder="YYYY-MM-DD HH:mm"
        />
        <div style={{ display: 'flex', flexDirection: 'row', gap: 24, marginTop: 8 }}>
          <MiniCalendar value={date} onChange={handleCalendarChange} />
          <TimeSelect value={{ hour: date.getHours(), minute: date.getMinutes() }} onChange={handleTimeChange} />
        </div>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>文字起こしファイル（.txt）</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CommonButton variant="primary" type="button">
            <label style={{ cursor: 'pointer', margin: 0 }}>
              ファイルを選択
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </CommonButton>
          <span style={{ fontSize: 12, color: '#a6adc8' }}>
            {uploadFileName ? uploadFileName : '選択されていません'}
          </span>
        </div>
        {transcript && (
          <Text style={{ color: '#a6adc8', fontSize: 11, marginTop: 4 }}>（内容: {transcript.slice(0, 40)}...）</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <CommonButton variant="default" onPress={onCancel} type="button" style={{ height: 40, paddingTop: 0, paddingBottom: 0 }}>キャンセル</CommonButton>
        <CommonButton variant="primary" onPress={handleSubmit} type="button" style={{ height: 40, paddingTop: 0, paddingBottom: 0 }}>保存</CommonButton>
      </View>
      {error && (
        <Text style={{ color: '#ff6b6b', fontSize: 13, marginTop: 12, textAlign: 'right' }}>{error}</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#232345',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#a6adc8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 4,
    padding: 12,
    fontSize: 13,
    backgroundColor: '#18181c',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#39396a',
  },
  cancelButtonText: {
    color: '#a6adc8',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#00ff88',
  },
  submitButtonText: {
    color: '#0f0f23',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default MeetingForm; 