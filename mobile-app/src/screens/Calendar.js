import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import ScheduleItem from '../components/ScheduleItem';
import { GlassEffectContainer } from '../context/GlassContext';
import LiquidElement from '../components/LiquidElement';

// iOS 26 Liquid Class Calendar Implementation
const Calendar = () => {
  const { user, role } = useAuth();
  const { colors, theme } = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'schedules'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(data);
      
      // Update marked dates
      const marked = {};
      data.forEach(s => {
        const d = s.date.toDate().toISOString().split('T')[0];
        if (!marked[d]) {
          marked[d] = { marked: true, dotColor: colors.success };
        }
      });
      
      // Add selection
      if (selectedDate) {
        marked[selectedDate] = { 
          ...marked[selectedDate], 
          selected: true, 
          selectedColor: colors.accent,
          selectedTextColor: colors.background
        };
      }
      
      setMarkedDates(marked);
    });

    return unsubscribe;
  }, [user, role, selectedDate, colors]);

  const filteredSchedules = schedules.filter(s => {
    const d = s.date.toDate().toISOString().split('T')[0];
    return d === selectedDate;
  });

  return (
    <GlassEffectContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <LiquidElement style={styles.calendarWrapper} intensity={20}>
        <RNCalendar
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.accent,
            selectedDayTextColor: colors.background,
            todayTextColor: colors.accent,
            dayTextColor: colors.text,
            textDisabledColor: 'rgba(255,255,255,0.1)',
            dotColor: colors.success,
            selectedDotColor: colors.background,
            arrowColor: colors.text,
            disabledArrowColor: '#333',
            monthTextColor: colors.text,
            indicatorColor: colors.text,
            textDayFontWeight: '700',
            textMonthFontWeight: '900',
            textDayHeaderFontWeight: '800',
            textDayFontSize: 16,
            textMonthFontSize: 20,
            textDayHeaderFontSize: 12
          }}
          onDayPress={day => setSelectedDate(day.dateString)}
          markedDates={markedDates}
        />
      </LiquidElement>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {selectedDate === new Date().toISOString().split('T')[0] ? 'Today\'s Events' : `Events on ${selectedDate}`}
        </Text>
        
        {filteredSchedules.map(item => (
          <ScheduleItem key={item.id} item={item} onPress={() => {}} />
        ))}
        
        {filteredSchedules.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events for this day</Text>
          </View>
        )}
      </ScrollView>
    </GlassEffectContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarWrapper: {
    margin: 16,
    marginBottom: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
    marginTop: 8,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

export default Calendar;