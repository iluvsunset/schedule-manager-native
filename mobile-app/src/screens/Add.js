import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { GlassEffectContainer } from '../context/GlassContext';
import LiquidElement from '../components/LiquidElement';

// iOS 26 Liquid Class Event Creation
const Add = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  
  const [place, setPlace] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!place || !date) {
      Alert.alert('Error', 'Place and Date are required');
      return;
    }

    setLoading(true);
    try {
      const dateTime = new Date(`${date}T${time || '00:00'}`);
      
      const scheduleData = {
        userId: user.uid,
        userEmail: user.email,
        date: Timestamp.fromDate(dateTime),
        place,
        location,
        notes,
        status: 'upcoming',
        createdAt: Timestamp.now(),
        participants: [], 
      };

      await addDoc(collection(db, 'schedules'), scheduleData);
      Alert.alert('Success', 'Event created!');
      navigation.navigate('Home');
      
      setPlace('');
      setTime('');
      setLocation('');
      setNotes('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassEffectContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>NEW EVENT</Text>
        
        <LiquidElement style={styles.formCard} intensity={25}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title / Place</Text>
              <TextInput
                style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                value={place}
                onChangeText={setPlace}
                placeholder="e.g. Science Class"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { width: 120 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Location / Link</Text>
              <TextInput
                style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Zoom or physical room"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.background }]}>CREATE EVENT</Text>
              )}
            </TouchableOpacity>
          </View>
        </LiquidElement>
      </ScrollView>
    </GlassEffectContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 32,
    textAlign: 'center',
  },
  formCard: {
    padding: 4,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 120,
    paddingTop: 18,
    textAlignVertical: 'top',
  },
  submitButton: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default Add;