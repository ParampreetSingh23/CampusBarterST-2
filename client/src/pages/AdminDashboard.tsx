import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ShieldAlert } from 'lucide-react';
import { Item, User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
 const { user, loading } = useAuth();
 const [, setLocation] = useLocation();
 const { toast } = useToast();
 const queryClient = useQueryClient();

 useEffect(() => {
  if (!loading && user?.role !== 'admin') {
   setLocation('/');
  }
 }, [user, loading, setLocation]);

 const { data: users, isLoading: usersLoading } = useQuery<Omit<User, "password">[]>({
  queryKey: ['/api/admin/users'],
  enabled: user?.role === 'admin',
 });

 const { data: items, isLoading: itemsLoading } = useQuery<(Item & { user: User })[]>({
  queryKey: ['/api/items'],
  enabled: user?.role === 'admin',
 });

 const deleteItemMutation = useMutation({
  mutationFn: async (itemId: string) => {
   await apiRequest('DELETE', `/api/admin/items/${itemId}`);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['/api/items'] });
   toast({
    title: 'Item Deleted',
    description: 'The item has been successfully removed from the platform.',
   });
  },
  onError: (error) => {
   toast({
    title: 'Error',
    description: error.message || 'Failed to delete item.',
    variant: 'destructive',
   });
  },
 });

 if (loading || user?.role !== 'admin') {
  return (
   <div className="min-h-screen bg-background flex items-center justify-center">
    <Skeleton className="h-12 w-12 rounded-full" />
   </div>
  );
 }

 return (
  <div className="min-h-screen bg-background">
   <Navbar />

   <main className="container mx-auto px-6 py-8 max-w-7xl">
    <div className="mb-10">
     <h1 className="font-heading text-4xl font-bold flex items-center gap-3">
      <ShieldAlert className="h-8 w-8 text-primary" />
      Admin Dashboard
     </h1>
     <p className="text-muted-foreground mt-2">Manage users and moderate marketplace content.</p>
    </div>

    <section className="mb-14">
     <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Registered Users</h2>
     {usersLoading ? (
      <Skeleton className="h-[200px] w-full rounded-md" />
     ) : (
      <div className="rounded-md border bg-card">
       <Table>
        <TableHeader>
         <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>College ID</TableHead>
          <TableHead>Role</TableHead>
         </TableRow>
        </TableHeader>
        <TableBody>
         {users?.map((u) => (
          <TableRow key={u.id}>
           <TableCell className="font-mono text-xs">{u.id.substring(0, 8)}...</TableCell>
           <TableCell className="font-medium">{u.name}</TableCell>
           <TableCell>{u.email}</TableCell>
           <TableCell>{u.collegeId}</TableCell>
           <TableCell>
            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
             {u.role}
            </Badge>
           </TableCell>
          </TableRow>
         ))}
         {users?.length === 0 && (
          <TableRow>
           <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
            No users found.
           </TableCell>
          </TableRow>
         )}
        </TableBody>
       </Table>
      </div>
     )}
    </section>

    <section>
     <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Marketplace Items</h2>
     {itemsLoading ? (
      <Skeleton className="h-[200px] w-full rounded-md" />
     ) : (
      <div className="rounded-md border bg-card">
       <Table>
        <TableHeader>
         <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Actions</TableHead>
         </TableRow>
        </TableHeader>
        <TableBody>
         {items?.map((item) => (
          <TableRow key={item.id}>
           <TableCell className="font-medium">
            <div className="flex items-center gap-2">
             <img src={item.imageUrl} alt={item.title} className="w-8 h-8 rounded object-cover" />
             {item.title}
            </div>
           </TableCell>
           <TableCell>{item.category}</TableCell>
           <TableCell className="capitalize">{item.itemType}</TableCell>
           <TableCell>{item.user.name}</TableCell>
           <TableCell className="text-right">
            <Button
             variant="destructive"
             size="sm"
             onClick={() => {
              if (window.confirm('Are you sure you want to permanently delete this item?')) {
               deleteItemMutation.mutate(item.id);
              }
             }}
             disabled={deleteItemMutation.isPending}
            >
             <Trash2 className="h-4 w-4 mr-1" />
             Delete
            </Button>
           </TableCell>
          </TableRow>
         ))}
         {items?.length === 0 && (
          <TableRow>
           <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
            No items found.
           </TableCell>
          </TableRow>
         )}
        </TableBody>
       </Table>
      </div>
     )}
    </section>
   </main>
  </div>
 );
}
