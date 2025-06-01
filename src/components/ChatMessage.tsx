import React from 'react';
import { View, Text, StyleSheet, Image, Platform, TouchableOpacity } from 'react-native';

interface ChatMessageProps {
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  isSelf: boolean;
}

const getInitial = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  sender,
  timestamp,
  isSelf,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Web用ホバーエフェクト
  const [hovered, setHovered] = React.useState(false);

  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          ...webStyles.message,
          ...(hovered ? webStyles.messageHover : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={webStyles.avatarContainer}>
          {sender.avatar ? (
            <img src={sender.avatar} style={webStyles.avatar as any} alt={getInitial(sender.name)} />
          ) : (
            <div style={webStyles.initialAvatar}>
              <span style={webStyles.initialText}>{getInitial(sender.name)}</span>
            </div>
          )}
        </div>
        <div style={webStyles.contentContainer}>
          <div style={webStyles.headerRow}>
            <span style={{
              ...webStyles.userName,
              ...(isSelf ? { color: '#00ff88', fontWeight: 700 } : {})
            }}>{sender.name}</span>
            <span style={webStyles.time}>{formatTime(timestamp)}</span>
          </div>
          <div style={webStyles.messageText}>{content}</div>
        </div>
      </div>
    );
  }

  // Native
  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.message}
      disabled
    >
      <View style={styles.avatarContainer}>
        {sender.avatar ? (
          <Image source={{ uri: sender.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.initialAvatar}>
            <Text style={styles.initialText}>{getInitial(sender.name)}</Text>
          </View>
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.userName, isSelf && { color: '#00ff88', fontWeight: '700' }]}>{sender.name}</Text>
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        </View>
        <Text style={styles.messageText}>{content}</Text>
      </View>
    </TouchableOpacity>
  );
};

const webStyles: { [key: string]: React.CSSProperties } = {
  message: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    padding: 8,
    borderRadius: 2,
    background: '#0f0f23',
    alignItems: 'flex-start',
    transition: 'background 0.2s',
    cursor: 'default',
  },
  messageHover: {
    background: '#1a1a2e',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    marginRight: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 2,
    background: '#333366',
    objectFit: 'cover',
  },
  initialAvatar: {
    width: 32,
    height: 32,
    borderRadius: 2,
    background: '#333366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#00ff88',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
    marginRight: 8,
  },
  time: {
    fontSize: 10,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
  },
  messageText: {
    fontSize: 13,
    color: '#a6adc8',
    lineHeight: 1.4,
  },
};

const styles = StyleSheet.create({
  message: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 8,
    borderRadius: 2,
    backgroundColor: '#0f0f23',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    marginRight: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#333366',
  },
  initialAvatar: {
    width: 32,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#333366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#00ff88',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e2e8f0',
    marginRight: 8,
  },
  time: {
    fontSize: 10,
    color: '#6c7086',
  },
  messageText: {
    fontSize: 13,
    color: '#a6adc8',
    lineHeight: 18,
  },
});

export default ChatMessage; 