// app/login.tsx (with improved design - web and mobile layouts)
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential,
  AuthError,
  UserCredential 
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider } from 'firebase/auth';
import Icon from './components/Icon';

WebBrowser.maybeCompleteAuthSession();

const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isWideScreen = isWeb && screenWidth > 768;

interface LoginScreenProps {
  onLogin: () => void;
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState({ width: screenWidth });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setDimensions({ width: Dimensions.get('window').width });
      };
      const subscription = Dimensions.addEventListener('change', handleResize);
      return () => subscription?.remove();
    }
  }, []);

  const isWide = Platform.OS === 'web' && dimensions.width > 768;

  // Get redirect URI for the current environment
  const redirectUri = Platform.OS === 'web' 
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://app.gethumi.co')
    : AuthSession.makeRedirectUri({ scheme: 'humi' });
    
  console.log('OAuth redirect URI:', redirectUri);
  
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '733393371524-1el4upa8gmobmnjcdqj880os9gkc6uik.apps.googleusercontent.com',
    iosClientId: '733393371524-8s28dl6jc6vk133mr4lvhvhu7esj62eo.apps.googleusercontent.com',
    androidClientId: '733393371524-1el4upa8gmobmnjcdqj880os9gkc6uik.apps.googleusercontent.com',
    redirectUri: Platform.OS === 'web' ? redirectUri : undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      console.log("Google auth success, creating credential");
      
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(() => {
          console.log("Firebase credential sign-in successful");
          onLogin();
        })
        .catch((error) => {
          console.error('Google sign-in error:', error);
          setError('Google authentication failed. Please try again.');
          setLoading(false);
        });
    } else if (response?.type === 'error') {
      console.error('Google auth response error:', response.error);
      setError(response.error?.message || 'Google authentication failed');
      setLoading(false);
    }
  }, [response]);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let userCredential: UserCredential;
      
      if (isLogin) {
        console.log('Attempting to sign in with email/password');
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Authentication successful:', userCredential.user.uid);
        onLogin();
      } else {
        console.log('Attempting to create account with email/password');
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Account creation successful:', userCredential.user.uid);
        onLogin();
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      const authError = error as AuthError;
      
      if (authError.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (authError.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (authError.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!request) {
      console.error('Google auth request not ready');
      setError('Google sign-in is not available right now. Please try again later.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Initiating Google sign-in flow');
      await promptAsync();
    } catch (error) {
      console.error('Error starting Google auth flow:', error);
      setError('Failed to start Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: credential.identityToken ?? '',
      });

      await signInWithCredential(auth, authCredential);
      onLogin();
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      setError('Apple authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => (
    <View style={isWide ? webStyles.formContainer : styles.formContainer}>
      {error ? <Text style={isWide ? webStyles.errorText : styles.errorText}>{error}</Text> : null}

      <TextInput
        style={isWide ? webStyles.input : styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={isWide ? "#999" : "#e0e0e0"}
      />

      <TextInput
        style={isWide ? webStyles.input : styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={isWide ? "#999" : "#e0e0e0"}
      />

      <TouchableOpacity 
        style={[
          isWide ? webStyles.button : styles.button, 
          (!email || !password || loading) && styles.buttonDisabled
        ]} 
        onPress={handleEmailAuth} 
        disabled={loading || !email || !password}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={isWide ? webStyles.buttonText : styles.buttonText}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={isWide ? webStyles.divider : styles.divider}>
        <View style={isWide ? webStyles.dividerLine : styles.dividerLine} />
        <Text style={isWide ? webStyles.dividerText : styles.dividerText}>or</Text>
        <View style={isWide ? webStyles.dividerLine : styles.dividerLine} />
      </View>

      <TouchableOpacity 
        style={[isWide ? webStyles.googleButton : styles.googleButton, loading && styles.buttonDisabled]} 
        onPress={handleGoogleAuth} 
        disabled={loading || !request}
      >
        <Text style={isWide ? webStyles.googleButtonText : styles.googleButtonText}>
          {isLogin ? 'Sign In with Google' : 'Sign Up with Google'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: '100%', height: 44, marginTop: 12 }}
          onPress={handleAppleAuth}
        />
      )}

      <TouchableOpacity style={isWide ? webStyles.switchAuth : styles.switchAuth} onPress={() => setIsLogin(!isLogin)}>
        <Text style={isWide ? webStyles.switchAuthText : styles.switchAuthText}>
          {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isWide) {
    return (
      <View style={webStyles.container}>
        <View style={webStyles.leftPanel}>
          <View style={webStyles.brandingContent}>
            <Text style={webStyles.logoText}>HUMI</Text>
            <Text style={webStyles.tagline}>Your Digital Cigar Lounge</Text>
            <View style={webStyles.featureList}>
              <View style={webStyles.featureItem}>
                <Icon name="camera" size={24} color="white" />
                <Text style={webStyles.featureText}>Scan & identify cigars with AI</Text>
              </View>
              <View style={webStyles.featureItem}>
                <Icon name="create" size={24} color="white" />
                <Text style={webStyles.featureText}>Log your smoking experiences</Text>
              </View>
              <View style={webStyles.featureItem}>
                <Icon name="archive" size={24} color="white" />
                <Text style={webStyles.featureText}>Build your personal humidor</Text>
              </View>
              <View style={webStyles.featureItem}>
                <Icon name="people" size={24} color="white" />
                <Text style={webStyles.featureText}>Connect with fellow enthusiasts</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={webStyles.rightPanel}>
          <View style={webStyles.formWrapper}>
            <Text style={webStyles.formTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={webStyles.formSubtitle}>
              {isLogin ? 'Sign in to continue your cigar journey' : 'Join the community of cigar enthusiasts'}
            </Text>
            {renderForm()}
          </View>
        </View>
      </View>
    );
  }

  // For mobile web: Use View instead of SafeAreaView AND View instead of KeyboardAvoidingView
  // KeyboardAvoidingView collapses to content height on mobile Safari, breaking the layout
  const isWeb = Platform.OS === 'web';
  
  return (
    <View style={[
      styles.container,
      isWeb && {
        minHeight: '100%' as any,
        height: '100%',
      }
    ]}>
      {isWeb ? (
        // Web: Use simple View - KeyboardAvoidingView breaks on mobile Safari
        <View style={[styles.keyboardView, { flex: 1 }]}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>HUMI</Text>
            <Text style={styles.tagline}>Your cigars. Your moments. Your people.</Text>
          </View>
          {renderForm()}
        </View>
      ) : (
        // Native: Use SafeAreaView + KeyboardAvoidingView as intended
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>HUMI</Text>
              <Text style={styles.tagline}>Your cigars. Your moments. Your people.</Text>
            </View>
            {renderForm()}
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B4513',
  },
  keyboardView: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    paddingBottom: 50,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 17,
    color: '#f7f2e9',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  formContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  button: {
    backgroundColor: '#5D3511',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#f7f2e9',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 16,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchAuthText: {
    color: '#f7f2e9',
    fontSize: 15,
  },
  errorText: {
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
  },
});

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  brandingContent: {
    maxWidth: 400,
  },
  logoText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 24,
    color: '#f7f2e9',
    marginBottom: 48,
  },
  featureList: {
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureText: {
    fontSize: 18,
    color: '#fff',
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  formWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B4513',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  googleButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchAuthText: {
    color: '#8B4513',
    fontSize: 14,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
  },
});

export default LoginScreen;
