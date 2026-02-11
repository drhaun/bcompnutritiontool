'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Shield, 
  Users, 
  UserPlus, 
  Settings, 
  Eye, 
  EyeOff,
  Check,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Mail,
  UserCog,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { 
  type StaffUser, 
  isAdmin, 
  getAllStaff, 
  updateStaffMember,
  createStaffForUser,
  createUserAndStaff,
} from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata?: {
    name?: string;
    role?: string;
  };
}

export default function AdminPage() {
  const { staff, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [staffMembers, setStaffMembers] = useState<StaffUser[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Edit dialog state
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'coach' as 'admin' | 'coach' | 'nutritionist',
    isActive: true,
    canViewAllClients: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Create staff dialog state (for existing auth users)
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAuthUser, setSelectedAuthUser] = useState<AuthUser | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    role: 'coach' as 'admin' | 'coach' | 'nutritionist',
    canViewAllClients: false,
  });

  // Create new user + staff dialog state
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'coach' as 'admin' | 'coach' | 'nutritionist',
    canViewAllClients: false,
  });

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!authLoading && staff && !isAdmin(staff)) {
      router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, staff, router]);

  // Load data
  useEffect(() => {
    if (staff && isAdmin(staff)) {
      loadData();
    }
  }, [staff]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load staff members
      const staffData = await getAllStaff();
      setStaffMembers(staffData);
      
      // Load auth users (to find users without staff records)
      if (supabase && isSupabaseConfigured) {
        // Note: This requires admin API access or a server function
        // For now, we'll use an API route
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setAuthUsers(data.users || []);
        }
      }
    } catch (err) {
      console.error('[Admin] Load error:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStaff = (member: StaffUser) => {
    setEditingStaff(member);
    setEditForm({
      name: member.name || '',
      role: member.role,
      isActive: member.isActive,
      canViewAllClients: member.canViewAllClients,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    
    setIsSaving(true);
    setError(null);
    
    const result = await updateStaffMember(editingStaff.id, editForm);
    
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage('User updated successfully');
      setEditingStaff(null);
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    
    setIsSaving(false);
  };

  const handleCreateStaff = async () => {
    if (!selectedAuthUser) return;
    
    setIsSaving(true);
    setError(null);
    
    const result = await createStaffForUser(
      selectedAuthUser.id,
      selectedAuthUser.email,
      createForm
    );
    
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage('Staff record created successfully');
      setShowCreateDialog(false);
      setSelectedAuthUser(null);
      setCreateForm({ name: '', role: 'coach', canViewAllClients: false });
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    
    setIsSaving(false);
  };

  const handleCreateNewUser = async () => {
    if (!createUserForm.email?.trim() || !createUserForm.password) {
      setError('Email and password are required');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    const result = await createUserAndStaff(
      createUserForm.email.trim(),
      createUserForm.password,
      {
        name: createUserForm.name.trim() || undefined,
        role: createUserForm.role,
        canViewAllClients: createUserForm.canViewAllClients,
      }
    );
    
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage('User created successfully. They can now log in.');
      setShowCreateUserDialog(false);
      setCreateUserForm({ email: '', password: '', name: '', role: 'coach', canViewAllClients: false });
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    
    setIsSaving(false);
  };

  // Get users without staff records
  const usersWithoutStaff = authUsers.filter(
    user => !staffMembers.some(s => s.authUserId === user.id)
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500 text-white border-0">Admin</Badge>;
      case 'coach':
        return <Badge className="bg-blue-500 text-white border-0">Coach</Badge>;
      case 'nutritionist':
        return <Badge className="bg-green-500 text-white border-0">Nutritionist</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] via-[#003a5c] to-[#00263d] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c19962] mx-auto mb-4" />
          <p className="text-white/60">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!staff || !isAdmin(staff)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] via-[#003a5c] to-[#00263d] flex items-center justify-center">
        <Card className="w-96 bg-white">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-600">You do not have permission to access the admin panel.</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00263d] via-[#003a5c] to-[#00263d] p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Admin Panel</h1>
              <p className="text-xs text-white/50">Manage users and permissions</p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
            <Check className="h-4 w-4" />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{staffMembers.length}</div>
                <div className="text-xs text-slate-500">Total Staff</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {staffMembers.filter(s => s.role === 'admin').length}
                </div>
                <div className="text-xs text-slate-500">Admins</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Eye className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {staffMembers.filter(s => s.canViewAllClients || s.role === 'admin').length}
                </div>
                <div className="text-xs text-slate-500">Full Visibility</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Management */}
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-[#00263d]">
                <UserCog className="h-5 w-5 text-[#c19962]" />
                Staff Members
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-[#c19962] hover:bg-[#a8844f]">
                      <UserPlus className="h-4 w-4" />
                      Create New Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User + Staff</DialogTitle>
                      <DialogDescription>
                        Create a new account with email and password. They can log in immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Email *</Label>
                        <Input 
                          type="email"
                          value={createUserForm.email} 
                          onChange={(e) => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <Label>Password *</Label>
                        <Input 
                          type="password"
                          value={createUserForm.password} 
                          onChange={(e) => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="Min 6 characters"
                        />
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input 
                          value={createUserForm.name} 
                          onChange={(e) => setCreateUserForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Display name"
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select 
                          value={createUserForm.role} 
                          onValueChange={(v: 'admin' | 'coach' | 'nutritionist') => setCreateUserForm(f => ({ ...f, role: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="nutritionist">Nutritionist</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Can View All Clients</Label>
                          <p className="text-xs text-slate-500">Allow viewing clients from all coaches</p>
                        </div>
                        <Switch 
                          checked={createUserForm.canViewAllClients}
                          onCheckedChange={(v) => setCreateUserForm(f => ({ ...f, canViewAllClients: v }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateNewUser} 
                        disabled={!createUserForm.email?.trim() || !createUserForm.password || createUserForm.password.length < 6 || isSaving}
                        className="bg-[#c19962] hover:bg-[#a8844f]"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {usersWithoutStaff.length > 0 && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Building2 className="h-4 w-4" />
                      Add Staff for Existing User ({usersWithoutStaff.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Staff Record</DialogTitle>
                      <DialogDescription>
                        Select an authenticated user to create a staff record for.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Select User</Label>
                        <Select 
                          value={selectedAuthUser?.id || ''} 
                          onValueChange={(id) => {
                            const user = usersWithoutStaff.find(u => u.id === id);
                            setSelectedAuthUser(user || null);
                            if (user?.user_metadata?.name) {
                              setCreateForm(f => ({ ...f, name: user.user_metadata?.name || '' }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user..." />
                          </SelectTrigger>
                          <SelectContent>
                            {usersWithoutStaff.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedAuthUser && (
                        <>
                          <div>
                            <Label>Name</Label>
                            <Input 
                              value={createForm.name} 
                              onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="Enter name..."
                            />
                          </div>
                          
                          <div>
                            <Label>Role</Label>
                            <Select 
                              value={createForm.role} 
                              onValueChange={(v: any) => setCreateForm(f => ({ ...f, role: v }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="nutritionist">Nutritionist</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Can View All Clients</Label>
                              <p className="text-xs text-slate-500">Allow viewing clients from all coaches</p>
                            </div>
                            <Switch 
                              checked={createForm.canViewAllClients}
                              onCheckedChange={(v) => setCreateForm(f => ({ ...f, canViewAllClients: v }))}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateStaff} 
                        disabled={!selectedAuthUser || isSaving}
                        className="bg-[#c19962] hover:bg-[#a8844f]"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Staff'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 p-3">User</th>
                    <th className="text-left text-xs font-semibold text-slate-600 p-3">Role</th>
                    <th className="text-center text-xs font-semibold text-slate-600 p-3">Status</th>
                    <th className="text-center text-xs font-semibold text-slate-600 p-3">Visibility</th>
                    <th className="text-right text-xs font-semibold text-slate-600 p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((member) => (
                    <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00263d] to-[#003a5c] flex items-center justify-center text-white font-semibold text-sm">
                            {(member.name || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{member.name || 'No name'}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{getRoleBadge(member.role)}</td>
                      <td className="p-3 text-center">
                        {member.isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-0">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {member.canViewAllClients || member.role === 'admin' ? (
                          <div className="flex items-center justify-center gap-1 text-amber-600">
                            <Eye className="h-4 w-4" />
                            <span className="text-xs font-medium">Full</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-slate-400">
                            <EyeOff className="h-4 w-4" />
                            <span className="text-xs">Own Only</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditStaff(member)}
                          disabled={member.id === staff.id} // Can't edit yourself
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {staffMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No staff members found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update permissions and settings for {editingStaff?.name || editingStaff?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Role</Label>
                <Select 
                  value={editForm.role} 
                  onValueChange={(v: any) => setEditForm(f => ({ ...f, role: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="nutritionist">Nutritionist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-slate-500">Allow user to access the system</p>
                </div>
                <Switch 
                  checked={editForm.isActive}
                  onCheckedChange={(v) => setEditForm(f => ({ ...f, isActive: v }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Can View All Clients</Label>
                  <p className="text-xs text-slate-500">See clients from all coaches (admins always have this)</p>
                </div>
                <Switch 
                  checked={editForm.canViewAllClients}
                  onCheckedChange={(v) => setEditForm(f => ({ ...f, canViewAllClients: v }))}
                  disabled={editForm.role === 'admin'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={isSaving}
                className="bg-[#c19962] hover:bg-[#a8844f]"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Users without Staff Records */}
        {usersWithoutStaff.length > 0 && (
          <Card className="bg-amber-50 border border-amber-200 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Authenticated Users Without Staff Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-700 mb-3">
                These users can log in but don&apos;t have staff profiles configured. Click &quot;Add Staff&quot; above to set them up.
              </p>
              <div className="flex flex-wrap gap-2">
                {usersWithoutStaff.map(user => (
                  <Badge key={user.id} variant="outline" className="text-amber-800 border-amber-300">
                    {user.email}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
