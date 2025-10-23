import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

export default function AuthDebugger() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // Test login with provided credentials
  const testLogin = async () => {
    setLoading(true);
    setResult(`Testing login with ${email}...`);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user profile exists in Firestore
      const profileDoc = await getDoc(doc(db, 'web_users', user.uid));
      
      if (profileDoc.exists()) {
        setResult(`Login successful! User ID: ${user.uid}\nProfile exists in Firestore.`);
      } else {
        setResult(`Login successful but no profile found in Firestore! User ID: ${user.uid}`);
      }
    } catch (error: any) {
      setResult(`Login failed: ${error.message} (${error.code})`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new user
  const createUser = async () => {
    setLoading(true);
    setResult(`Creating user ${email}...`);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        name: email.split('@')[0],
        role: email === 'admin@gmail.com' ? 'admin' : 'user',
        isActive: true,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'web_users', user.uid), userProfile);
      
      setResult(`User created successfully! User ID: ${user.uid}`);
      
    } catch (error: any) {
      setResult(`User creation failed: ${error.message} (${error.code})`);
    } finally {
      setLoading(false);
    }
  };

  // Send password reset email
  const sendReset = async () => {
    setLoading(true);
    setResult(`Sending password reset email to ${email}...`);
    try {
      await sendPasswordResetEmail(auth, email);
      setResult(`Password reset email sent to ${email}`);
    } catch (error: any) {
      setResult(`Failed to send reset email: ${error.message} (${error.code})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-4">Authentication Debugger</h1>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Email</label>
        <input 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Password</label>
        <input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
      
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={testLogin} 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
        >
          Test Login
        </button>
        <button 
          onClick={createUser} 
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-green-300"
        >
          Create User
        </button>
        <button 
          onClick={sendReset} 
          disabled={loading}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:bg-yellow-300"
        >
          Send Reset
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  );
}
