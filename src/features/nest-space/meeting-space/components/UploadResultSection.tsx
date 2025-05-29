import React from 'react';
import { View, Text } from 'react-native';

const UploadResultSection = ({ result, transcript }: { result: any, transcript?: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text>アップロード結果: {JSON.stringify(result)}</Text>
    {transcript && <Text>文字起こし: {transcript}</Text>}
  </View>
);

export default UploadResultSection; 