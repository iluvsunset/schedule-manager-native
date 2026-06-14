import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import LiquidElement from './LiquidElement';
import { Calendar } from 'lucide-react-native';

const ScheduleItem = ({ item, onPress }) => {
  const { colors } = useTheme();
  const date = item.date.toDate();
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const isOngoing = item.status === 'ongoing';

  return (
    <LiquidElement 
      style={styles.wrapper}
      onPress={onPress}
      intensity={isOngoing ? 60 : 30}
    >
      <View style={styles.container}>
        <View style={[styles.dateBox, { backgroundColor: isOngoing ? 'rgba(50, 215, 75, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
          <Text style={[styles.dateMonth, { color: isOngoing ? colors.success : colors.textSecondary }]}>{month}</Text>
          <Text style={[styles.dateDay, { color: colors.text }]}>{day}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.timeRow}>
            {isOngoing && <Text style={[styles.liveTag, { backgroundColor: colors.danger }]}>LIVE</Text>}
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>{time}</Text>
            {item.source === 'google_calendar' && (
              <View style={styles.gcalBadge}>
                <Calendar size={10} color="#4285f4" style={{ marginRight: 2 }} />
                <Text style={styles.gcalText}>GCal</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.place}</Text>
        </View>
      </View>
    </LiquidElement>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dateBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dateMonth: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 26,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveTag: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  gcalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderColor: 'rgba(66, 133, 244, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  gcalText: {
    color: '#4285f4',
    fontSize: 9,
    fontWeight: '800',
  },
});

export default ScheduleItem;