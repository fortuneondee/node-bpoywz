import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserBalance: (newBalance: number) => void;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  // Reset inactivity timer on user activity
  const resetInactivityTimer = () => {
    setLastActivity(Date.now());
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    const timer = setTimeout(async () => {
      if (user) {
        await signOut();
        toast.error('Session expired due to inactivity');
      }
    }, INACTIVITY_TIMEOUT);
    setInactivityTimer(timer);
  };

  // Monitor user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial timer
    if (user) {
      resetInactivityTimer();
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ 
              id: userDoc.id, 
              ...userDoc.data(),
              emailVerified: firebaseUser.emailVerified,
              createdAt: userDoc.data().createdAt.toDate()
            } as User);
            resetInactivityTimer();
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setUser(null);
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      await sendEmailVerification(firebaseUser);

      const userData = {
        email,
        username,
        balance: 0,
        role: 'user',
        status: 'active',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      toast.success('Account created! Please check your email to verify your account.');
      resetInactivityTimer();
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email already in use');
      } else {
        throw new Error('Failed to create account');
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      if (!firebaseUser.emailVerified) {
        toast.error('Please verify your email before signing in');
        await firebaseSignOut(auth);
        throw new Error('Email not verified');
      }
      
      toast.success('Welcome back!');
      resetInactivityTimer();
    } catch (error: any) {
      console.error('Signin error:', error);
      if (error.message === 'Email not verified') {
        throw error;
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password');
      } else {
        throw new Error('Failed to sign in');
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    } catch (error) {
      console.error('Signout error:', error);
      toast.error('Failed to sign out');
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No user logged in');
    }
    
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email');
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Failed to send reset email');
      throw error;
    }
  };

  const updateUserBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      updateUserBalance,
      sendVerificationEmail,
      resetPassword
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}