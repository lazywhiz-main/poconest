import React from 'react';
import { View, Text } from 'react-native';

const SummarySection = ({ summary }: { summary: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text>要約: {summary}</Text>
  </View>
);

export default SummarySection; 