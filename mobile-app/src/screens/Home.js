import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import ScheduleItem from '../components/ScheduleItem';
import LiquidElement from '../components/LiquidElement';
import { GlassEffectContainer } from '../context/GlassContext';
import { Bell } from 'lucide-react-native';

// iOS 26 Liquid Class Dashboard Implementation
const Home = () => {
  const { user, role } = useAuth();
  const { colors } = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [nextUp, setNextUp] = useState(null);

  useEffect(() => {
    if (!user) return;

    let q;
    if (role === 'it' || role === 'teacher' || role === 'academic_coordinator') {
      q = query(collection(db, 'schedules'));
    } else {
      q = query(collection(db, 'schedules'), where('participants', 'array-contains', user.email));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      setSchedules(data);
      updateNextUp(data);
    });

    return unsubscribe;
  }, [user, role]);

  const updateNextUp = (data) => {
    const now = new Date();
    const upcoming = data.filter(s => {
      const d = s.date.toDate();
      return s.status === 'ongoing' || (d > now && s.status !== 'completed');
    }).sort((a, b) => a.date.toMillis() - b.date.toMillis());
    
    if (upcoming.length > 0) setNextUp(upcoming[0]);
    else setNextUp(null);
  };

  const filteredSchedules = schedules.filter(s => {
    const status = s.status || 'upcoming';
    const now = new Date();
    const sDate = s.date.toDate();
    const isToday = sDate.toDateString() === now.toDateString();

    if (filter === 'ongoing') return status === 'ongoing';
    if (filter === 'upcoming') return status !== 'completed' && status !== 'ongoing' && sDate >= now;
    if (filter === 'past') return status === 'completed' || (status !== 'ongoing' && sDate < now);
    return true;
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  return (
    <GlassEffectContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hello,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.email.split('@')[0]}</Text>
          </View>
          <LiquidElement shape="circle" style={styles.iconButton}>
            <Bell size={22} color={colors.text} />
          </LiquidElement>
        </View>

        {nextUp && (
          <LiquidElement style={styles.nextUpCard} intensity={50}>
            <View style={styles.nextUpHeader}>
              <Text style={[styles.nextUpLabel, { color: colors.textSecondary }]}>{nextUp.status === 'ongoing' ? 'LIVE NOW' : 'NEXT UP'}</Text>
              <View style={[styles.badge, { backgroundColor: nextUp.status === 'ongoing' ? colors.danger : colors.success }]}>
                <Text style={styles.badgeText}>{nextUp.status === 'ongoing' ? 'Live' : 'Upcoming'}</Text>
              </View>
            </View>
            <Text style={[styles.nextUpTitle, { color: colors.text }]}>{nextUp.place}</Text>
            <Text style={[styles.nextUpTime, { color: colors.textSecondary }]}>
              {nextUp.date.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
          </LiquidElement>
        )}

        <View style={styles.filterContainer}>
          {['all', 'ongoing', 'upcoming', 'past'].map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f)}
              style={[
                styles.filterTab, 
                filter === f && { backgroundColor: colors.accent, borderColor: colors.accent }
              ]}
            >
              <Text style={[
                styles.filterText, 
                { color: filter === f ? colors.background : colors.textSecondary }
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredSchedules.map(item => (
          <ScheduleItem key={item.id} item={item} onPress={() => {}} />
        ))}
        
        {filteredSchedules.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No schedules found</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextUpCard: {
    marginBottom: 24,
  },
  nextUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextUpLabel: {
    fontSize: 12,
    fontWeight: '800',
    letter-spacing: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nextUpTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  nextUpTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home;
