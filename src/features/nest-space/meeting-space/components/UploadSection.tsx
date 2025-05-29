import React from 'react';
import { View, Button, ActivityIndicator } from 'react-native';

const UploadSection = ({ onUpload, uploading }: { onUpload: (file: any) => void, uploading: boolean }) => (
  <View style={{ marginBottom: 16 }}>
    <Button title="ファイルをアップロード" onPress={() => onUpload('dummyFile')} disabled={uploading} />
    {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
  </View>
);

export default UploadSection; 