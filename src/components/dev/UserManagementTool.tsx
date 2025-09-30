import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function UserManagementTool() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createAdminUser = async () => {
    if (!email || !password || !name) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create admin profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        name: name,
        role: 'admin', // Set as admin
        permissions: {
          dashboard: true,
          bookings: true, 
          confirmation: true,
          withdrawal: true,
          access: true,
          images: true,
          users: true
        },
        isActive: true,
        createdAt: new Date()
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'web_users', user.uid), userProfile);
      
      toast({
        title: "Success!",
        description: `Admin user ${email} created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
      console.error("Error creating user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Management Tool</h1>
      
      <Tabs defaultValue="create">
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Admin User</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Admin User</CardTitle>
              <CardDescription>
                Create a new user with full admin permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Admin User"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={createAdminUser} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Admin User"}
              </Button>
            </CardFooter>
          </Card>
          
          <Separator className="my-6" />
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-medium text-amber-800 mb-2">Default Admin Login</h3>
            <p className="text-amber-700 text-sm mb-4">
              If you can't login with your account, use these default credentials:
            </p>
            <div className="bg-white rounded p-3 text-sm">
              <div><strong>Email:</strong> admin@gmail.com</div>
              <div><strong>Password:</strong> admin123</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
