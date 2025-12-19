
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { WishlistItem, Item } from '@shared/schema';
import { Trash2, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

export default function Wishlist() {
 const { toast } = useToast();
 const queryClient = useQueryClient();

 const { data: wishlistItems, isLoading } = useQuery<(WishlistItem & { item: Item })[]>({
  queryKey: ['/api/wishlist'],
 });

 const removeFromWishlistMutation = useMutation({
  mutationFn: async (itemId: string) => {
   await apiRequest('DELETE', `/api/wishlist/${itemId}`);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
   toast({
    title: "Item removed",
    description: "The item has been removed from your wishlist.",
   });
  },
  onError: () => {
   toast({
    title: "Error",
    description: "Failed to remove item from wishlist.",
    variant: "destructive",
   });
  }
 });

 const addToCartMutation = useMutation({
  mutationFn: async (itemId: string) => {
   await apiRequest('POST', '/api/cart', { itemId });
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
   toast({
    title: "Added to Cart",
    description: "Item has been added to your cart.",
   });
  },
  onError: () => {
   toast({
    title: "Error",
    description: "Failed to add item to cart. It might already be there.",
    variant: "destructive",
   });
  }
 });


 return (
  <div className="min-h-screen bg-background">
   <Navbar />

   <main className="container mx-auto px-6 py-8 max-w-7xl">
    <h1 className="font-heading text-4xl font-bold mb-6">Your Wishlist</h1>

    {isLoading ? (
     <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
     </div>
    ) : !wishlistItems || wishlistItems.length === 0 ? (
     <div className="text-center py-12">
      <p className="text-xl text-muted-foreground mb-6">Your wishlist is empty.</p>
      <Link href="/dashboard">
       <Button>Browse Items</Button>
      </Link>
     </div>
    ) : (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {wishlistItems.map((wishlistItem) => (
       <Card key={wishlistItem.id} className="overflow-hidden flex flex-col">
        <div className="relative aspect-video bg-muted overflow-hidden">
         <img
          src={wishlistItem.item.imageUrl}
          alt={wishlistItem.item.title}
          className="object-cover w-full h-full"
         />
        </div>
        <div className="p-4 flex-1 flex flex-col">
         <Link href={`/items/${wishlistItem.item.id}`} className="hover:underline">
          <h3 className="font-semibold text-lg line-clamp-1">{wishlistItem.item.title}</h3>
         </Link>
         <p className="text-sm text-muted-foreground mb-2">{wishlistItem.item.category}</p>

         <div className="mt-auto pt-4 flex gap-2">
          <Button
           className="flex-1 gap-2"
           onClick={() => addToCartMutation.mutate(wishlistItem.item.id)}
           disabled={addToCartMutation.isPending}
          >
           <ShoppingCart className="h-4 w-4" /> Add to Cart
          </Button>
          <Button
           variant="outline"
           size="icon"
           onClick={() => removeFromWishlistMutation.mutate(wishlistItem.item.id)}
           disabled={removeFromWishlistMutation.isPending}
          >
           <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
         </div>
        </div>
       </Card>
      ))}
     </div>
    )}
   </main>
  </div>
 );
}
