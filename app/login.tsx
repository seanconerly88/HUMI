// app/login.tsx (with improved design)
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
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider } from 'firebase/auth';


WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLogin: () => void;
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set up Google Auth Request
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '733393371524-1el4upa8gmobmnjcdqj880os9gkc6uik.apps.googleusercontent.com',
    iosClientId: '733393371524-8s28dl6jc6vk133mr4lvhvhu7esj62eo.apps.googleusercontent.com',
    androidClientId: '733393371524-1el4upa8gmobmnjcdqj880os9gkc6uik.apps.googleusercontent.com',
  });

  // Handle Google Auth Response
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


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>HUMI</Text>
          <Text style={styles.tagline}>Your cigars, your story, your Humi.</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#e0e0e0"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#e0e0e0"
          />

          <TouchableOpacity 
            style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]} 
            onPress={handleEmailAuth} 
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.googleButton, loading && styles.buttonDisabled]} 
            onPress={handleGoogleAuth} 
            disabled={loading || !request}
          >
            <Text style={styles.googleButtonText}>
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

        </View>

        <TouchableOpacity style={styles.switchAuth} onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchAuthText}>
            {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B4513', // Changed from black to the app's brown color
  },
  keyboardView: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  tagline: {
    fontSize: 14,
    color: '#f7f2e9', // Lighter color for better contrast
    marginTop: 4,
  },
  formContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent white
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    backgroundColor: '#5D3511', // Darker brown for the main button
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#5D3511',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#FFFFFF', // White background for Google button
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#8B4513', // Brown text for contrast
    fontWeight: 'bold',
  },
  switchAuth: {
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#f7f2e9', // Lighter color for better contrast
    fontSize: 14,
  },
  errorText: {
    color: '#FFD700', // Gold color for error text - more visible on brown
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default LoginScreen;