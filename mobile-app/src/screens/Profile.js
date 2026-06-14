import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { GlassEffectContainer } from '../context/GlassContext';
import LiquidElement from '../components/LiquidElement';
import { LogOut, Moon, Sun, Shield } from 'lucide-react-native';

// iOS 26 Liquid Class Profile Implementation
const Profile = () => {
  const { user, role, logout } = useAuth();
  const { colors, theme, setTheme } = useTheme();

  return (
    <GlassEffectContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LiquidElement shape="circle" style={styles.avatarWrapper}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarText, { color: colors.background }]}>
                {user?.email ? user.email[0].toUpperCase() : 'U'}
              </Text>
            </View>
          </LiquidElement>
          <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={[styles.roleText, { color: colors.textSecondary }]}>{role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>
          
          <LiquidElement 
            style={styles.menuItemWrapper}
            onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                {theme === 'dark' ? <Moon size={20} color={colors.text} /> : <Sun size={20} color={colors.text} />}
                <Text style={[styles.menuItemText, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: theme === 'dark' ? colors.success : '#555' }]}>
                <View style={[styles.toggleCircle, { alignSelf: theme === 'dark' ? 'flex-end' : 'flex-start' }]} />
              </View>
            </View>
          </LiquidElement>

          <LiquidElement style={styles.menuItemWrapper}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Shield size={20} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy Policy</Text>
              </View>
            </View>
          </LiquidElement>
        </View>

        <LiquidElement 
          style={styles.logoutButtonWrapper} 
          onPress={logout}
        >
          <View style={styles.logoutButton}>
            <LogOut size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
  },
  email: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
    marginLeft: 8,
  },
  menuItemWrapper: {
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '700',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  logoutButtonWrapper: {
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '800',
  },
});

export default Profile;