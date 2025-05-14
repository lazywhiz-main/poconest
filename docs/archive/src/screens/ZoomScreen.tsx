import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { ZoomSession } from "../types/zoom";
import { mockZoomSessions } from "../mock/zoomData";
import { CustomHeader } from '../components/CustomHeader';
import { BrandColors } from '../constants/Colors';

const ZoomScreen = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ZoomSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ZoomSession | null>(null);

  useEffect(() => {
    // Simulate API fetch with mock data
    const fetchSessions = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.getZoomSessions();
        // setSessions(response.data);
        setSessions(mockZoomSessions);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching zoom sessions:", error);
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const renderSessionItem = ({ item }: { item: ZoomSession }) => {
    const formattedDate = dayjs(item.date).format("MMM D, YYYY · h:mm A");
    const isSelected = selectedSession?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.sessionCard, isSelected && styles.selectedCard]}
        onPress={() => setSelectedSession(isSelected ? null : item)}
      >
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionStatus}>{item.status}</Text>
        </View>
        <Text style={styles.sessionDate}>{formattedDate}</Text>
        <Text style={styles.sessionDuration}>{item.duration} minutes</Text>
        
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsLabel}>
            {item.participants.length} Participants
          </Text>
        </View>

        {isSelected && (
          <View style={styles.sessionDetails}>
            {item.recording && (
              <View style={styles.detailItem}>
                <Ionicons name="videocam-outline" size={18} color="#555" />
                <Text style={styles.detailText}>
                  Recording: {item.recording.url ? "Available" : "None"}
                </Text>
              </View>
            )}

            {item.googleDriveLink && (
              <View style={styles.detailItem}>
                <Ionicons name="document-outline" size={18} color="#555" />
                <Text style={styles.detailText}>
                  Google Drive: Available
                </Text>
              </View>
            )}

            {item.notes && (
              <View style={styles.detailItem}>
                <Ionicons name="create-outline" size={18} color="#555" />
                <Text style={styles.detailText}>
                  Notes: {item.notes.substring(0, 50)}
                  {item.notes.length > 50 ? "..." : ""}
                </Text>
              </View>
            )}

            {item.tags && item.tags.length > 0 && (
              <View style={styles.tags}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading Zoom sessions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="ミーティング"
        showEmoji={true}
        emoji="📹"
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Zoom Sessions</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No Zoom sessions found</Text>
            <Text style={styles.emptySubtext}>
              Your recorded Zoom sessions will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#0066cc",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#555",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderColor: "#0066cc",
    borderWidth: 2,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  sessionStatus: {
    fontSize: 13,
    color: "#0066cc",
    backgroundColor: "#e6f0ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  sessionDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  participantsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  participantsLabel: {
    fontSize: 14,
    color: "#555",
  },
  sessionDetails: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#eaeaea",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: "#555",
  },
});

export default ZoomScreen; 