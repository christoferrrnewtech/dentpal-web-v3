import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';

export default function AuthDebugger() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [firestoreUsers, setFirestoreUsers] = useState<any[]>([]);
  const [showFirestoreUsers, setShowFirestoreUsers] = useState(false);

  // Load Firestore users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersCollection = collection(db, 'web_users');
        const usersSnapshot = await getDocs(usersCollection);
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFirestoreUsers(users);
      } catch (error) {
        console.error('Failed to load Firestore users:', error);
        setResult(`Failed to load Firestore users: ${(error as Error).message}`);
      }
    };

    loadUsers();
  }, []);

  // Reset the Firebase Auth and Firestore data
  const resetAuthSystem = async () => {
    setLoading(true);
    setResult('Resetting auth system...');
    try {
      // 1. Sign out current user
      await auth.signOut();

      // 2. Create/ensure default admin exists in Firebase Auth
      try {
        const adminCredential = await createUserWithEmailAndPassword(auth, 'admin@gmail.com', 'admin123');
        const adminUser = adminCredential.user;

        // 3. Create admin profile in Firestore
        const adminProfile = {
          uid: adminUser.uid,
          email: 'admin@gmail.com',
          name: 'Admin User',
          role: 'admin',
          isActive: true,
          permissions: {
            dashboard: true,
            bookings: true,
            confirmation: true,
            withdrawal: true,
            access: true,
            images: true,
            users: true,
          },
          createdAt: Date.now(),
          lastLogin: Date.now()
        };

        await setDoc(doc(db, 'web_users', adminUser.uid), adminProfile);
        setResult(`Successfully created default admin user (${adminUser.uid})`);
      } catch (error: any) {
        // If admin already exists, try to fetch their profile
        if (error.code === 'auth/email-already-in-use') {
          setResult('Admin user already exists in Firebase Auth, attempting to login...');
          try {
            // Try to login as admin
            const adminCredential = await signInWithEmailAndPassword(auth, 'admin@gmail.com', 'admin123');
            const adminUser = adminCredential.user;
            
            // Check if profile exists, create if needed
            const profileDoc = await getDoc(doc(db, 'web_users', adminUser.uid));
            
            if (!profileDoc.exists()) {
              // Create the profile if it doesn't exist
              const adminProfile = {
                uid: adminUser.uid,
                email: 'admin@gmail.com',
                name: 'Admin User',
                role: 'admin',
                isActive: true,
                permissions: {
                  dashboard: true,
                  bookings: true,
                  confirmation: true,
                  withdrawal: true,
                  access: true,
                  images: true,
                  users: true,
                },
                createdAt: Date.now(),
                lastLogin: Date.now()
              };
              
              await setDoc(doc(db, 'web_users', adminUser.uid), adminProfile);
              setResult(`Created missing Firestore profile for existing admin (${adminUser.uid})`);
            } else {
              setResult(`Logged in as admin and verified profile exists (${adminUser.uid})`);
            }
          } catch (loginError: any) {
            setResult(`Failed to login as admin: ${loginError.message}`);
          }
        } else {
          setResult(`Error creating admin: ${error.message}`);
        }
      }
      
      // 4. Reload Firestore users to see changes
      const usersCollection = collection(db, 'web_users');
      const usersSnapshot = await getDocs(usersCollection);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFirestoreUsers(users);
      
      // 5. Sign out again so user can login fresh
      await auth.signOut();
      
      toast({
        title: "Auth System Reset",
        description: "The authentication system has been reset. You can now login with admin@gmail.com / admin123",
      });
      
    } catch (error) {
      setResult(`Reset failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

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
        setResult(`Login successful! User ID: ${user.uid}\nProfile exists in Firestore: ${JSON.stringify(profileDoc.data(), null, 2)}`);
      } else {
        setResult(`Login successful but no profile found in Firestore! User ID: ${user.uid}\nCreating default profile...`);
        
        // Create default profile
        const defaultProfile = {
          uid: user.uid,
          email: user.email,
          name: email === 'admin@gmail.com' ? 'Admin User' : 'User',
          role: email === 'admin@gmail.com' ? 'admin' : 'user',
          isActive: true,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          permissions: {
            dashboard: true,
            bookings: true,
            confirmation: email === 'admin@gmail.com',
            withdrawal: email === 'admin@gmail.com',
            access: email === 'admin@gmail.com',
            images: true,
            users: email === 'admin@gmail.com',
          }
        };
        
        await setDoc(doc(db, 'web_users', user.uid), defaultProfile);
        setResult(`Login successful! User ID: ${user.uid}\nCreated new profile in Firestore.`);
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
        createdAt: Date.now(),
        lastLogin: Date.now(),
        permissions: {
          dashboard: true,
          bookings: true,
          confirmation: email === 'admin@gmail.com',
          withdrawal: email === 'admin@gmail.com',
          access: email === 'admin@gmail.com',
          images: true,
          users: email === 'admin@gmail.com',
        }
      };
      
      await setDoc(doc(db, 'web_users', user.uid), userProfile);
      
      // Reload Firestore users
      const usersCollection = collection(db, 'web_users');
      const usersSnapshot = await getDocs(usersCollection);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFirestoreUsers(users);
      
      setResult(`User created successfully! User ID: ${user.uid}`);
      
      toast({
        title: "User Created",
        description: `User ${email} was created successfully.`,
      });
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
      
      toast({
        title: "Reset Email Sent",
        description: `Password reset email sent to ${email}. Check your inbox.`,
      });
    } catch (error: any) {
      setResult(`Failed to send reset email: ${error.message} (${error.code})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle>Authentication Debugger</CardTitle>
          <CardDescription>
            Fix authentication issues between Firebase Auth and Firestore
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">Firestore Users ({firestoreUsers.length})</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFirestoreUsers(!showFirestoreUsers)}
              >
                {showFirestoreUsers ? 'Hide' : 'Show'}
              </Button>
            </div>
            
            {showFirestoreUsers && (
              <div className="p-3 bg-slate-50 rounded-md text-sm overflow-auto max-h-60">
                <pre>{JSON.stringify(firestoreUsers, null, 2)}</pre>
              </div>
            )}
          </div>
          
          {result && (
            <div className="p-3 bg-slate-50 rounded-md text-sm overflow-auto max-h-60">
              <pre>{result}</pre>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-2">
          <Button 
            onClick={testLogin} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Test Login
          </Button>
          <Button 
            onClick={createUser} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create User
          </Button>
          <Button 
            onClick={sendReset} 
            disabled={loading}
            variant="outline"
          >
            Send Reset Email
          </Button>
          <Button 
            onClick={resetAuthSystem} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            Reset Auth System
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
