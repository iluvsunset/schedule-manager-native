import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { auth } from '../services/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import LiquidCard from '../components/LiquidCard';
import { Chrome } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const Login = () => {
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Auth Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '429949738650-jbtu6rju8vlnilvc1fli35vg3lvf2ubj.apps.googleusercontent.com', // Replace with your iOS Client ID
    webClientId: '429949738650-3lc3hpv545736pija6g80pnik157278p.apps.googleusercontent.com', // Replace with your Web Client ID
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch(e => Alert.alert('Login Error', e.message))
        .finally(() => setLoading(false));
    }
  }, [response]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardWrapper}>
            <Text style={[styles.logo]}>⚙️</Text>
            <Text style={[styles.title, { color: colors.text }]}>SCHEDULER</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isSignUp ? 'Join the professional network' : 'Welcome back to your dashboard'}
            </Text>

            <LiquidCard style={styles.liquidContainer}>
              <View style={styles.form}>
                <TextInput
                  style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: colors.text, borderColor: colors.border }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: colors.accent }]} 
                  onPress={handleAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>
                      {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity 
                  style={[styles.googleButton, { borderColor: colors.border }]} 
                  onPress={() => promptAsync()}
                  disabled={!request || loading}
                >
                  <Chrome size={20} color={colors.text} />
                  <Text style={[styles.googleButtonText, { color: colors.text }]}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.toggleButton} 
                  onPress={() => setIsSignUp(!isSignUp)}
                >
                  <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>
              </View>
            </LiquidCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  liquidContainer: {
    width: '100%',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  button: {
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: 32,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Login;
