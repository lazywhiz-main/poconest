import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
// import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import theme from '../../../../styles/theme';

interface MeetingFormProps {
  onSubmit: (meetingData: MeetingFormData) => void;
  onCancel: () => void;
}

export interface MeetingFormData {
  title: string;
  date: Date;
  participants: string[];
  notes: string;
}

const MeetingForm: React.FC<MeetingFormProps> = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [participants, setParticipants] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      title,
      date,
      participants,
      notes,
    });
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
        <Text style={styles.label}>日付</Text>
        <TextInput
          style={styles.input}
          value={date.toISOString().slice(0, 10)}
          onChangeText={text => setDate(new Date(text))}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>参加者</Text>
        <TextInput
          style={styles.input}
          placeholder="参加者のメールアドレスを入力（カンマ区切り）"
          onChangeText={(text) => setParticipants(text.split(',').map(p => p.trim()))}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>メモ</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="ミーティングに関するメモを入力"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>保存</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background.default,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.background.default,
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.spaces.meeting.primary,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MeetingForm; 